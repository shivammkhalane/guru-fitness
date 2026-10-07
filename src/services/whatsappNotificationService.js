import { isSupabaseReady, supabase } from './supabaseService'

const readFunctionError = async (error) => {
  try {
    const response = error?.context
    if (response && typeof response.json === 'function') {
      const body = await response.clone().json()
      return body?.message || body?.error || ''
    }
  } catch {
    return ''
  }
  return ''
}

export const getWhatsAppIntegrationStatus = async () => {
  if (!isSupabaseReady || !supabase) return { configured: false }

  const { data, error } = await supabase.functions.invoke('whatsapp-notifications', {
    body: { action: 'status' },
  })
  if (error) return { configured: false }
  return { configured: data?.configured === true }
}

export const sendWhatsAppNotification = async (memberCode, eventType) => {
  if (!isSupabaseReady || !supabase) throw new Error('WhatsApp integration not configured.')

  const { data, error } = await supabase.functions.invoke('whatsapp-notifications', {
    body: { action: 'send', memberCode, eventType },
  })
  if (error) {
    const message = await readFunctionError(error)
    if (message.toLowerCase().includes('not configured')) {
      throw new Error('WhatsApp integration not configured.')
    }
    throw new Error(message || 'WhatsApp message was not sent. Check the server-side integration status.')
  }
  if (!data?.sent) throw new Error(data?.message || 'WhatsApp message was not sent.')
  return data
}