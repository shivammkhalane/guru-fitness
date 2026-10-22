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
  member_pass: { templateKey: 'member_welcome_qr', approvedTemplateEnv: 'WHATSAPP_TEMPLATE_MEMBER_WELCOME_QR' },
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

const formatPassExpiryDate = (dateValue: string) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${dateValue}T00:00:00Z`))

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

const canonicalPhone = (phoneValue: string, country: string) => {
  const digits = phoneValue.replace(/\D/g, '')
  if (country.toLowerCase() === 'india') {
    if (digits.length === 10) return `91${digits}`
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
    if (digits.length === 12 && digits.startsWith('91')) return digits
  }
  return digits
}

const normalizeLoginPhone = (phoneValue: unknown) => {
  const digits = typeof phoneValue === 'string' ? phoneValue.replace(/\D/g, '') : ''
  const nationalNumber = digits.length === 10
    ? digits
    : digits.length === 11 && digits.startsWith('0')
      ? digits.slice(1)
      : digits.length === 12 && digits.startsWith('91')
        ? digits.slice(2)
        : ''
  return /^[6-9]\d{9}$/.test(nationalNumber) ? `91${nationalNumber}` : ''
}

const hashLoginOtp = async (salt: string, otp: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${salt}:${otp}`),
  )
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const matchesLoginOtpHash = (expected: string, actual: string) => {
  if (expected.length !== actual.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ actual.charCodeAt(index)
  }
  return difference === 0
}

const createRandomHex = (byteLength: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const createLoginOtp = () => {
  const random = crypto.getRandomValues(new Uint32Array(1))[0]
  return String(100000 + (random % 900000))
}

type LoginMember = {
  id: string
  gym_id: string
  member_code: string
  full_name: string
  phone: string
  status: string
}

type MemberLoginLookup = { member: LoginMember; response?: never }
  | { member?: never; response: Response }

const findMemberForLogin = async (
  admin: ReturnType<typeof createClient>,
  phoneValue: unknown,
): Promise<MemberLoginLookup> => {
  const normalizedPhone = normalizeLoginPhone(phoneValue)
  if (!normalizedPhone) {
    return { response: jsonResponse({ message: 'Enter a valid Indian mobile number.' }, 400) }
  }

  const { data: candidates, error } = await admin
    .from('members')
    .select('id, gym_id, member_code, full_name, phone, status')
    .ilike('phone', `%${normalizedPhone.slice(-10)}%`)
    .limit(25)
  if (error) throw error

  const matches = (candidates || []).filter((candidate) => (
    canonicalPhone(candidate.phone || '', 'India') === normalizedPhone
  ))
  if (!matches.length) {
    return { response: jsonResponse({ message: 'This phone number is not registered as a member.' }, 404) }
  }
  if (matches.length > 1) {
    return { response: jsonResponse({ message: 'This phone number matches multiple member records. Contact gym staff.' }, 409) }
  }
  return { member: matches[0] }
}

const requestMemberLoginOtp = async (
  admin: ReturnType<typeof createClient>,
  requestBody: Record<string, unknown>,
) => {
  const lookup = await findMemberForLogin(admin, requestBody.phone)
  if (!lookup.member) return lookup.response
  const member = lookup.member

  const providerToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || Deno.env.get('WHATSAPP_TOKEN') || ''
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || Deno.env.get('WHATSAPP_PHONE_ID') || ''
  const graphVersion = Deno.env.get('WHATSAPP_GRAPH_API_VERSION') || 'v18.0'
  const templateName = Deno.env.get('WHATSAPP_TEMPLATE_MEMBER_LOGIN_OTP') || 'member_login_otp'
  const languageCode = Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') || 'en'
  if (!providerToken || !phoneNumberId || !templateName) {
    return jsonResponse({ message: 'WhatsApp member login is not configured on the server.' }, 503)
  }

  const { data: existingOtp, error: lookupError } = await admin
    .from('member_login_otps')
    .select('last_sent_at')
    .eq('member_id', member.id)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existingOtp && Date.now() - new Date(existingOtp.last_sent_at).getTime() < 60_000) {
    return jsonResponse({ message: 'Please wait a minute before requesting another login code.' }, 429)
  }

  const otp = createLoginOtp()
  const salt = createRandomHex(16)
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()
  const { error: saveError } = await admin.from('member_login_otps').upsert({
    member_id: member.id,
    otp_hash: await hashLoginOtp(salt, otp),
    otp_salt: salt,
    expires_at: expiresAt,
    attempts: 0,
    last_sent_at: new Date().toISOString(),
  }, { onConflict: 'member_id' })
  if (saveError) throw saveError

  const recipient = toWhatsAppPhone(member.phone, 'India')
  let response: Response
  try {
    response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [{
            type: 'body',
            parameters: [{ type: 'text', text: otp }],
          }],
        },
      }),
    })
  } catch (error) {
    const { error: cleanupError } = await admin.from('member_login_otps')
      .delete()
      .eq('member_id', member.id)
      .eq('otp_salt', salt)
    if (cleanupError) {
      throw new Error(`WhatsApp OTP request failed and its pending code could not be cleared: ${cleanupError.message}`)
    }
    throw error
  }

  const providerResponse = await response.json().catch(() => ({}))
  if (!response.ok) {
    const providerMessage = (providerResponse as { error?: { message?: string } })?.error?.message
      || 'WhatsApp could not accept the login code.'
    const { error: cleanupError } = await admin.from('member_login_otps')
      .delete()
      .eq('member_id', member.id)
      .eq('otp_salt', salt)
    if (cleanupError) {
      throw new Error(`${providerMessage} The pending login code could not be cleared: ${cleanupError.message}`)
    }
    return jsonResponse({ message: providerMessage }, 502)
  }

  return jsonResponse({ sent: true })
}

const verifyMemberLoginOtp = async (
  admin: ReturnType<typeof createClient>,
  requestBody: Record<string, unknown>,
) => {
  const otp = typeof requestBody.otp === 'string' ? requestBody.otp.trim() : ''
  if (!/^\d{6}$/.test(otp)) {
    return jsonResponse({ message: 'Please enter a valid 6-digit OTP code.' }, 400)
  }

  const lookup = await findMemberForLogin(admin, requestBody.phone)
  if (!lookup.member) return lookup.response
  const member = lookup.member
  const { data: challenge, error: challengeError } = await admin
    .from('member_login_otps')
    .select('otp_hash, otp_salt, expires_at, attempts')
    .eq('member_id', member.id)
    .maybeSingle()
  if (challengeError) throw challengeError
  if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now() || challenge.attempts >= 5) {
    if (challenge) {
      const { error: deleteError } = await admin.from('member_login_otps').delete().eq('member_id', member.id)
      if (deleteError) throw deleteError
    }
    return jsonResponse({ message: 'Invalid or expired OTP code. Request a new code and try again.' }, 401)
  }

  const { data: attempt, error: attemptError } = await admin
    .from('member_login_otps')
    .update({ attempts: challenge.attempts + 1 })
    .eq('member_id', member.id)
    .eq('attempts', challenge.attempts)
    .gt('expires_at', new Date().toISOString())
    .select('member_id')
    .maybeSingle()
  if (attemptError) throw attemptError
  if (!attempt) {
    return jsonResponse({ message: 'Invalid or expired OTP code. Request a new code and try again.' }, 401)
  }

  const submittedHash = await hashLoginOtp(challenge.otp_salt, otp)
  if (!matchesLoginOtpHash(challenge.otp_hash, submittedHash)) {
    return jsonResponse({ message: 'Invalid or expired OTP code. Please try again.' }, 401)
  }

  const { error: deleteError } = await admin.from('member_login_otps').delete().eq('member_id', member.id)
  if (deleteError) throw deleteError
  return jsonResponse({
    verified: true,
    member: {
      id: member.id,
      member_code: member.member_code,
      full_name: member.full_name,
      phone: member.phone,
      status: member.status,
    },
  })
}

const fetchWithMemberPassConsentLock = async (
  admin: ReturnType<typeof createClient>,
  memberId: string,
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> => {
  const { data: dispatchId, error: beginError } = await admin.rpc(
    'begin_member_pass_dispatch',
    { p_member_id: memberId },
  )
  if (beginError) throw beginError
  if (typeof dispatchId !== 'string') {
    throw new Error('Could not acquire the member-pass dispatch lock.')
  }

  try {
    return await fetch(input, init)
  } finally {
    try {
      const { data: released, error: finishError } = await admin.rpc(
        'finish_member_pass_dispatch',
        { p_member_id: memberId, p_dispatch_id: dispatchId },
      )
      if (finishError || released !== true) {
        console.error('Could not release member-pass dispatch lock', finishError)
      }
    } catch (error) {
      console.error('Could not release member-pass dispatch lock', error)
    }
  }
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

    const requestBody = await request.json().catch(() => null)
    if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
      return jsonResponse({ message: 'Request body must be a valid JSON object.' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const publicActions = requestBody as Record<string, unknown>
    if (publicActions.action === 'request_member_login_otp') {
      return await requestMemberLoginOtp(admin, publicActions)
    }
    if (publicActions.action === 'verify_member_login_otp') {
      return await verifyMemberLoginOtp(admin, publicActions)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userResult, error: authError } = await userClient.auth.getUser()
    if (authError || !userResult.user) return jsonResponse({ message: 'The session is not valid.' }, 401)

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('gym_id, role')
      .eq('id', userResult.user.id)
      .maybeSingle()
    if (profileError || !profile || !['owner', 'admin', 'staff'].includes(profile.role)) {
      return jsonResponse({ message: 'Authenticated gym staff access is required.' }, 403)
    }

    const providerToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') || Deno.env.get('WHATSAPP_TOKEN') || ''
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || Deno.env.get('WHATSAPP_PHONE_ID') || ''
    const graphVersion = Deno.env.get('WHATSAPP_GRAPH_API_VERSION') || 'v18.0'
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
    const allTemplatesConfigured = Object.entries(events).every(([eventName, config]) => (
      activeKeys.has(config.templateKey)
      && (eventName === 'member_pass' || Boolean(Deno.env.get(config.approvedTemplateEnv)))
    ))
    const baseConfigured = Boolean(providerToken && phoneNumberId && graphVersion)
    const configured = Boolean(baseConfigured && allTemplatesConfigured)

    const { action, memberCode, eventType, streak, qrUrl, expiryDate } = requestBody
    if (action === 'status') return jsonResponse({ configured })

    const memberPassFields = ['phone', 'memberName', 'qrCodeImageUrl', 'expiryDate']
    if (memberPassFields.some((key) => key in requestBody)) {
      const attemptResult = await admin.from('notification_log').insert({
        gym_id: profile.gym_id,
        event_type: 'member_pass',
        status: 'pending',
        requested_by: userResult.user.id,
      }).select('id').single()
      if (attemptResult.error) throw attemptResult.error

      const recordPassFailure = async (message: string, status = 400) => {
        const { error: logError } = await admin.from('notification_log')
          .update({ status: 'failed', error: message })
          .eq('id', attemptResult.data.id)
        return jsonResponse({
          sent: false,
          message: logError ? `${message} Notification log update failed: ${logError.message}` : message,
        }, logError ? 500 : status)
      }

      try {
        const { phone, memberName, qrCodeImageUrl, expiryDate: passExpiryDate } = requestBody
        if ([phone, memberName, qrCodeImageUrl, passExpiryDate].some((value) => typeof value !== 'string' || !value.trim())) {
          throw Object.assign(new Error('Phone, memberName, qrCodeImageUrl, and expiryDate are required.'), { status: 400 })
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(passExpiryDate)
          || Number.isNaN(Date.parse(`${passExpiryDate}T00:00:00Z`))) {
          throw Object.assign(new Error('Expiry date must be a valid YYYY-MM-DD date.'), { status: 400 })
        }
        if (!baseConfigured || !activeKeys.has('member_welcome_qr')) {
          throw Object.assign(new Error('WhatsApp member QR pass integration is not configured.'), { status: 503 })
        }

        const { data: gymMembers, error: phoneLookupError } = await admin
          .from('members')
          .select('id, member_code, full_name, phone, gym_id, whatsapp_pass_consent')
          .eq('gym_id', profile.gym_id)
        if (phoneLookupError) throw phoneLookupError
        const suppliedPhone = canonicalPhone(phone, gym.country || 'India')
        const matchingMembers = (gymMembers || []).filter((candidate) => (
          canonicalPhone(candidate.phone || '', gym.country || 'India') === suppliedPhone
        ))
        if (matchingMembers.length > 1) {
          throw Object.assign(new Error('Phone number matches multiple members. Contact gym staff to resolve the duplicate before sending.'), { status: 409 })
        }
        const member = matchingMembers[0]
        if (!member) throw Object.assign(new Error('Member phone number was not found in this gym.'), { status: 404 })
        if (member.full_name.trim() !== memberName.trim()) {
          throw Object.assign(new Error('Member name does not match the saved member record.'), { status: 400 })
        }
        if (member.whatsapp_pass_consent !== true) {
          throw Object.assign(new Error('WhatsApp QR pass consent is not currently enabled for this member.'), { status: 403 })
        }
        const { error: memberLogUpdateError } = await admin.from('notification_log')
          .update({ member_id: member.id, member_code: member.member_code })
          .eq('id', attemptResult.data.id)
        if (memberLogUpdateError) throw memberLogUpdateError

        const { data: membership, error: membershipError } = await admin
          .from('memberships')
          .select('expiry_date')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (membershipError) throw membershipError
        if (!membership || membership.expiry_date !== passExpiryDate) {
          throw Object.assign(new Error('Expiry date does not match the member’s current membership.'), { status: 400 })
        }

        const parsedQrUrl = new URL(qrCodeImageUrl)
        const expectedUrl = new URL(supabaseUrl)
        const expectedQrPath = `/storage/v1/object/sign/qr-passes/${member.id}.png`
        if (parsedQrUrl.protocol !== 'https:' || parsedQrUrl.origin !== expectedUrl.origin
          || parsedQrUrl.pathname !== expectedQrPath || !parsedQrUrl.searchParams.has('token')) {
          throw Object.assign(new Error('QR image URL must be a signed HTTPS URL for this member’s pass.'), { status: 400 })
        }

        const recipient = toWhatsAppPhone(member.phone, gym.country || 'India')
        const formattedExpiry = formatPassExpiryDate(passExpiryDate)
        const response = await fetchWithMemberPassConsentLock(admin, member.id, `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipient,
            type: 'template',
            template: {
              name: 'member_welcome_qr',
              language: { code: languageCode },
              components: [
                { type: 'header', parameters: [{ type: 'image', image: { link: qrCodeImageUrl } }] },
                { type: 'body', parameters: [
                  { type: 'text', text: member.full_name },
                  { type: 'text', text: formattedExpiry },
                ] },
              ],
            },
          }),
        })
        const providerResponse = await response.json().catch(() => ({}))
        if (!response.ok) {
          const providerMessage = (providerResponse as { error?: { message?: string } })?.error?.message
            || 'Meta WhatsApp Cloud API rejected the member QR pass.'
          throw Object.assign(new Error(providerMessage), { status: 502 })
        }
        const { error: sentLogError } = await admin.from('notification_log')
          .update({ status: 'sent', error: null })
          .eq('id', attemptResult.data.id)
        if (sentLogError) throw sentLogError
        return jsonResponse({ sent: true, logged: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Member QR pass delivery failed.'
        const status = typeof error === 'object' && error !== null && 'status' in error
          ? Number((error as { status: number }).status)
          : 500
        return await recordPassFailure(message, status)
      }
    }

    if (action !== 'send' || typeof memberCode !== 'string' || typeof eventType !== 'string' || !Object.hasOwn(events, eventType)) {
      return jsonResponse({ message: 'A valid member code and notification event are required.' }, 400)
    }

    const spec = events[eventType as EventType]
    const approvedTemplateName = eventType === 'member_pass'
      ? 'member_welcome_qr'
      : Deno.env.get(spec.approvedTemplateEnv) || ''
    const memberFields = eventType === 'member_pass'
      ? 'id, member_code, full_name, phone, plan_id, gym_id, whatsapp_pass_consent'
      : 'id, member_code, full_name, phone, plan_id, gym_id'
    const { data: member, error: memberError } = await admin
      .from('members')
      .select(memberFields)
      .eq('gym_id', profile.gym_id)
      .eq('member_code', memberCode)
      .maybeSingle()
    if (memberError) throw memberError
    if (!member) {
      if (eventType === 'member_pass') {
        const { error: attemptError } = await admin.from('notification_log').insert({
          gym_id: profile.gym_id,
          member_code: memberCode,
          event_type: 'member_pass',
          status: 'failed',
          error: 'Member not found.',
          requested_by: userResult.user.id,
        })
        if (attemptError) throw attemptError
      }
      return jsonResponse({ message: 'Member not found.' }, 404)
    }

    if (eventType === 'member_pass') {
      const attemptResult = await admin.from('notification_log').insert({
        gym_id: profile.gym_id,
        member_id: member.id,
        member_code: member.member_code,
        event_type: 'member_pass',
        status: 'pending',
        requested_by: userResult.user.id,
      }).select('id').single()
      if (attemptResult.error) throw attemptResult.error

      const recordFailure = async (message: string, status = 400) => {
        const { error: logError } = await admin.from('notification_log')
          .update({ status: 'failed', error: message })
          .eq('id', attemptResult.data.id)
        return jsonResponse({
          sent: false,
          message: logError ? `${message} Notification log update failed: ${logError.message}` : message,
        }, logError ? 500 : status)
      }

      try {
        if (!baseConfigured || !activeKeys.has(spec.templateKey) || !approvedTemplateName) {
          throw Object.assign(new Error('WhatsApp member-pass integration is not configured.'), { status: 503 })
        }
        if (member.whatsapp_pass_consent !== true) {
          throw Object.assign(new Error('WhatsApp QR pass consent is not currently enabled for this member.'), { status: 403 })
        }
        if (typeof qrUrl !== 'string' || typeof expiryDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
          throw Object.assign(new Error('A valid QR image URL and expiry date are required.'), { status: 400 })
        }

        const [{ data: membership, error: membershipError }, { data: template, error: templateError }] = await Promise.all([
          admin.from('memberships').select('expiry_date').eq('member_id', member.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          admin.from('message_templates').select('id, body').eq('gym_id', profile.gym_id).eq('template_key', spec.templateKey).eq('channel', 'whatsapp').eq('is_active', true).maybeSingle(),
        ])
        if (membershipError) throw membershipError
        if (templateError) throw templateError
        if (!membership || membership.expiry_date !== expiryDate) {
          throw Object.assign(new Error('The supplied expiry date does not match the member’s current membership.'), { status: 400 })
        }
        if (!template) {
          throw Object.assign(new Error('The member pass WhatsApp template is not configured.'), { status: 409 })
        }

        const parsedQrUrl = new URL(qrUrl)
        const expectedUrl = new URL(supabaseUrl)
        const expectedQrPath = `/storage/v1/object/sign/qr-passes/${member.id}.png`
        if (parsedQrUrl.protocol !== 'https:' || parsedQrUrl.origin !== expectedUrl.origin
          || parsedQrUrl.pathname !== expectedQrPath || !parsedQrUrl.searchParams.has('token')) {
          throw Object.assign(new Error('The QR pass URL is not a valid signed image URL for this member.'), { status: 400 })
        }

        const variables = [...template.body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map(([, key]) => key)
        if (variables.length !== 2 || variables[0] !== 'member_name' || variables[1] !== 'expiry_date') {
          throw Object.assign(new Error('The member pass template must contain member_name followed by expiry_date.'), { status: 409 })
        }
        const formattedExpiry = formatPassExpiryDate(expiryDate)
        const recipient = toWhatsAppPhone(member.phone, gym.country || 'India')
        const response = await fetchWithMemberPassConsentLock(admin, member.id, `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipient,
            type: 'template',
            template: {
              name: approvedTemplateName,
              language: { code: languageCode },
              components: [
                { type: 'header', parameters: [{ type: 'image', image: { link: qrUrl } }] },
                { type: 'body', parameters: [
                  { type: 'text', text: member.full_name },
                  { type: 'text', text: formattedExpiry },
                ] },
              ],
            },
          }),
        })
        const providerResponse = await response.json().catch(() => ({}))
        if (!response.ok) {
          const providerMessage = (providerResponse as { error?: { message?: string } })?.error?.message
            || 'Meta WhatsApp Cloud API rejected the member pass.'
          throw Object.assign(new Error(providerMessage), { status: 502 })
        }

        const { error: sentLogError } = await admin.from('notification_log')
          .update({ status: 'sent', error: null })
          .eq('id', attemptResult.data.id)
        if (sentLogError) throw sentLogError
        return jsonResponse({ sent: true, logged: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Member pass delivery failed.'
        const status = typeof error === 'object' && error !== null && 'status' in error
          ? Number((error as { status: number }).status)
          : 500
        return await recordFailure(message, status)
      }
    }

    if (!configured) return jsonResponse({ configured: false, message: 'WhatsApp integration not configured.' }, 503)

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

    const attemptResult = await admin.from('notification_log').insert({
      gym_id: profile.gym_id,
      member_id: member.id,
      member_code: member.member_code,
      event_type: eventType,
      status: 'pending',
      requested_by: userResult.user.id,
    }).select('id').single()
    if (attemptResult.error) throw attemptResult.error

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
    if (notificationInsert.error) {
      await admin.from('notification_log')
        .update({ status: 'failed', error: notificationInsert.error.message })
        .eq('id', attemptResult.data.id)
      throw notificationInsert.error
    }

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
        admin.from('notification_log').update({ status: 'failed', error: String(providerError) }).eq('id', attemptResult.data.id),
      ])
      return jsonResponse({ sent: false, message: String(providerError) }, 502)
    }

    const sentPayload = { event_type: eventType, recipient, rendered_body: renderedBody, provider_response: providerResponse }
    const [notificationUpdate, logUpdate, attemptUpdate] = await Promise.all([
      admin.from('notifications').update({ status: 'sent', payload: sentPayload }).eq('id', notificationInsert.data.id),
      admin.from('message_logs').update({ status: 'sent', payload: sentPayload }).eq('id', logInsert.data.id),
      admin.from('notification_log').update({ status: 'sent', error: null }).eq('id', attemptResult.data.id),
    ])
    return jsonResponse({ sent: true, logged: !notificationUpdate.error && !logUpdate.error && !attemptUpdate.error })
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : 'Notification request failed.' }, 500)
  }
})