const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)

  // 1. GET Request Handling: Meta Webhook URL Verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    const verifyToken = Deno.env.get('WEBHOOK_VERIFY_TOKEN')
      || Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')
      || ''

    if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
      console.log('[WhatsApp Webhook] Verification successful. Challenge confirmed.')
      return new Response(challenge ?? '', {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
        },
      })
    }

    console.warn('[WhatsApp Webhook] Verification failed. Mode or token mismatch.')
    return new Response('Forbidden', {
      status: 403,
      headers: corsHeaders,
    })
  }

  // 2. POST Request Handling: Incoming Messages & Delivery Status Updates
  if (req.method === 'POST') {
    try {
      const body = await req.json().catch(() => null)

      if (!body) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Meta payload structure: entry[0].changes[0].value
      const entries = Array.isArray(body?.entry) ? body.entry : []
      for (const entry of entries) {
        const changes = Array.isArray(entry?.changes) ? entry.changes : []
        for (const change of changes) {
          const value = change?.value
          if (!value) continue

          const metadata = value?.metadata
          if (metadata) {
            console.log(`[WhatsApp Webhook] Account: ${metadata?.display_phone_number || 'N/A'} (ID: ${metadata?.phone_number_id || 'N/A'})`)
          }

          // A. Inbound messages from members/users
          if (Array.isArray(value?.messages) && value.messages.length > 0) {
            for (const msg of value.messages) {
              const from = msg?.from
              const msgType = msg?.type
              const text = msg?.text?.body
              console.log(`[WhatsApp Message Received] From: ${from} | Type: ${msgType} | Content: ${text ? JSON.stringify(text) : '(interactive/media)'}`)
            }
          }

          // B. Delivery status updates (sent, delivered, read, failed)
          if (Array.isArray(value?.statuses) && value.statuses.length > 0) {
            for (const status of value.statuses) {
              const statusType = status?.status
              const recipient = status?.recipient_id
              const messageId = status?.id
              console.log(`[WhatsApp Status Update] Message ID: ${messageId} | Recipient: ${recipient} | Status: ${statusType}`)
              if (status?.errors) {
                console.error(`[WhatsApp Status Error] Details:`, JSON.stringify(status.errors))
              }
            }
          }
        }
      }

      // Return 200 OK immediately so Meta registers successful delivery and avoids retries
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('[WhatsApp Webhook] Exception while processing payload:', error)
      return new Response(JSON.stringify({ error: 'Internal processing error' }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      })
    }
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: corsHeaders,
  })
})
