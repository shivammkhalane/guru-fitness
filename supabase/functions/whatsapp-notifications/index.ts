import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const events = {
  membership_expiring_soon: { templateKey: 'membership_expiring_soon', approvedTemplateEnv: 'WHATSAPP_TEMPLATE_MEMBERSHIP_EXPIRING_SOON' },
  membership_expired: { templateKey: 'membership_expired', approvedTemplateEnv: 'WHATSAPP_TEMPLATE_MEMBERSHIP_EXPIRED' },
  membership_renewed: { templateKey: 'membership_renewed', approvedTemplateEnv: 'WHATSAPP_TEMPLATE_MEMBERSHIP_RENEWED' },
  payment_received: { templateKey: 'payment_received', approvedTemplateEnv: 'WHATSAPP_TEMPLATE_PAYMENT_RECEIVED' },
  payment_reminder: { templateKey: 'payment_reminder', approvedTemplateEnv: 'WHATSAPP_TEMPLATE_PAYMENT_REMINDER' },
  attendance_logged: { templateKey: 'attendance_logged', approvedTemplateEnv: 'WHATSAPP_TEMPLATE_ATTENDANCE_LOGGED' },
} as const

type EventType = keyof typeof events

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const formatDate = (dateValue: string | null, timezone: string) => {
  if (!dateValue) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(`${dateValue}T00:00:00Z`))
}

const renderTemplate = (body: string, values: Record<string, string>) => body.replace(
  /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
  (_, key: string) => values[key] ?? '',
)

const toWhatsAppPhone = (phoneValue: string, country: string) => {
  const digits = phoneValue.replace(/\D/g, '')
  if (digits.length === 10 && country.toLowerCase() === 'india') return `91${digits}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  throw new Error('Member phone number is not in a supported international format.')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ message: 'Method not allowed.' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return jsonResponse({ message: 'Authentication is required.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ configured: false, message: 'WhatsApp integration not configured.' }, 503)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userResult, error: authError } = await userClient.auth.getUser()
    if (authError || !userResult.user) return jsonResponse({ message: 'The session is not valid.' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('gym_id, role')
      .eq('id', userResult.user.id)
      .maybeSingle()
    if (profileError || !profile || !['owner', 'admin'].includes(profile.role)) {
      return jsonResponse({ message: 'Owner or admin access is required.' }, 403)
    }

    const providerToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || ''
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || ''
    const graphVersion = Deno.env.get('WHATSAPP_GRAPH_API_VERSION') || ''
    const languageCode = Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') || 'en'
    const { data: gym, error: gymError } = await admin
      .from('gyms')
      .select('name, country, timezone')
      .eq('id', profile.gym_id)
      .single()
    if (gymError) throw gymError

    const { data: templates, error: templatesError } = await admin
      .from('message_templates')
      .select('template_key')
      .eq('gym_id', profile.gym_id)
      .eq('channel', 'whatsapp')
      .eq('is_active', true)
    if (templatesError) throw templatesError

    const activeKeys = new Set((templates || []).map((item) => item.template_key))
    const allTemplatesConfigured = Object.entries(events).every(([, config]) => (
      activeKeys.has(config.templateKey) && Boolean(Deno.env.get(config.approvedTemplateEnv))
    ))
    const configured = Boolean(providerToken && phoneNumberId && graphVersion && allTemplatesConfigured)

    const { action, memberCode, eventType, streak } = await request.json()
    if (action === 'status') return jsonResponse({ configured })
    if (action !== 'send' || typeof memberCode !== 'string' || !(eventType in events)) {
      return jsonResponse({ message: 'A valid member code and notification event are required.' }, 400)
    }
    if (!configured) return jsonResponse({ configured: false, message: 'WhatsApp integration not configured.' }, 503)

    const spec = events[eventType as EventType]
    const approvedTemplateName = Deno.env.get(spec.approvedTemplateEnv) || ''
    const { data: member, error: memberError } = await admin
      .from('members')
      .select('id, member_code, full_name, phone, plan_id, gym_id')
      .eq('gym_id', profile.gym_id)
      .eq('member_code', memberCode)
      .maybeSingle()
    if (memberError) throw memberError
    if (!member) return jsonResponse({ message: 'Member not found.' }, 404)

    const [{ data: membership, error: membershipError }, { data: payment, error: paymentError }, { data: template, error: templateError }] = await Promise.all([
      admin.from('memberships').select('plan_id, start_date, expiry_date, amount, payment_method').eq('member_id', member.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('payments').select('amount, payment_date, payment_method, receipt_number').eq('member_id', member.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('message_templates').select('id, body').eq('gym_id', profile.gym_id).eq('template_key', spec.templateKey).eq('channel', 'whatsapp').eq('is_active', true).maybeSingle(),
    ])
    if (membershipError) throw membershipError
    if (paymentError) throw paymentError
    if (templateError) throw templateError
    if (!template) return jsonResponse({ message: `WhatsApp template ${spec.templateKey} is not configured.` }, 409)
    if (eventType === 'payment_received' && !payment) return jsonResponse({ message: 'No payment record exists for this member.' }, 409)

    const { data: plan, error: planError } = await admin
      .from('membership_plans')
      .select('name')
      .eq('id', membership?.plan_id || member.plan_id)
      .maybeSingle()
    if (planError) throw planError

    const timezone = gym.timezone || 'Asia/Kolkata'
    const values: Record<string, string> = {
      member_name: member.full_name,
      member_code: member.member_code,
      member_phone: member.phone,
      plan_name: plan?.name || '',
      expiry_date: formatDate(membership?.expiry_date || null, timezone),
      amount: String(payment?.amount ?? membership?.amount ?? ''),
      payment_method: payment?.payment_method || membership?.payment_method || '',
      payment_date: formatDate(payment?.payment_date || null, timezone),
      receipt_number: payment?.receipt_number || '',
      gym_name: gym.name,
      attendance_streak: streak == null ? '' : String(streak),
    }
    const renderedBody = renderTemplate(template.body, values)
    const parameters = [...template.body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map(([, key]) => ({
      type: 'text',
      text: values[key] || '',
    }))
    const recipient = toWhatsAppPhone(member.phone, gym.country || 'India')

    const notificationInsert = await admin.from('notifications').insert({
      gym_id: profile.gym_id,
      member_id: member.id,
      channel: 'whatsapp',
      template: spec.templateKey,
      status: 'queued',
      payload: {
        event_type: eventType,
        member_code: member.member_code,
        ...(eventType === 'attendance_logged' ? { streak: streak ?? null } : {}),
      },
    }).select('id').single()
    if (notificationInsert.error) throw notificationInsert.error

    const logInsert = await admin.from('message_logs').insert({
      gym_id: profile.gym_id,
      member_id: member.id,
      template_id: template.id,
      provider: 'meta_whatsapp_cloud_api',
      status: 'queued',
      payload: { event_type: eventType, recipient, rendered_body: renderedBody },
    }).select('id').single()
    if (logInsert.error) throw logInsert.error

    let providerResponse: Record<string, unknown>
    try {
      const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'template',
          template: {
            name: approvedTemplateName,
            language: { code: languageCode },
            ...(parameters.length ? { components: [{ type: 'body', parameters }] } : {}),
          },
        }),
      })
      providerResponse = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error('Meta WhatsApp Cloud API rejected the message.')
    } catch (providerError) {
      const payload = { event_type: eventType, recipient, rendered_body: renderedBody, provider_error: String(providerError) }
      await Promise.all([
        admin.from('notifications').update({ status: 'failed', payload }).eq('id', notificationInsert.data.id),
        admin.from('message_logs').update({ status: 'failed', payload }).eq('id', logInsert.data.id),
      ])
      return jsonResponse({ sent: false, message: String(providerError) }, 502)
    }

    const sentPayload = { event_type: eventType, recipient, rendered_body: renderedBody, provider_response: providerResponse }
    const [notificationUpdate, logUpdate] = await Promise.all([
      admin.from('notifications').update({ status: 'sent', payload: sentPayload }).eq('id', notificationInsert.data.id),
      admin.from('message_logs').update({ status: 'sent', payload: sentPayload }).eq('id', logInsert.data.id),
    ])
    return jsonResponse({ sent: true, logged: !notificationUpdate.error && !logUpdate.error })
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : 'Notification request failed.' }, 500)
  }
})