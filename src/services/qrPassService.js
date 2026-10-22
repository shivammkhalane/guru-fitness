import QRCode from 'qrcode'
import { isSupabaseReady, supabase } from './supabaseService'
import { sendMemberWelcomeQrPass } from './whatsappNotificationService'

export const sendMemberQrPass = async (member) => {
  if (!member) throw new Error('No member data provided for QR pass.')
  if (!isSupabaseReady || !supabase) throw new Error('WhatsApp integration not configured.')
  if (!member.whatsappPassConsent) {
    throw new Error('WhatsApp QR pass consent has not been recorded for this member.')
  }
  if (!member.id || !member.qrToken) {
    throw new Error('The member QR pass is missing its saved member ID or QR token.')
  }

  const phone = member.phone || ''
  const memberName = member.name || member.fullName || member.full_name || 'Member'
  const expiryDate = member.expiryDate || member.expiry_date || ''
  if (!phone) throw new Error('Member does not have a phone number on record.')
  if (!expiryDate) throw new Error('Member does not have a membership expiry date on record.')

  const path = `${member.id}.png`
  const dataUrl = await QRCode.toDataURL(member.qrToken, {
    width: 350,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
  const image = await (await fetch(dataUrl)).blob()
  const { error: uploadError } = await supabase.storage
    .from('qr-passes')
    .upload(path, image, { contentType: 'image/png', upsert: true })
  if (uploadError) throw new Error(`Could not prepare the member QR pass: ${uploadError.message}`)

  const { data: signedImage, error: signedUrlError } = await supabase.storage
    .from('qr-passes')
    .createSignedUrl(path, 60 * 60)
  if (signedUrlError) throw new Error(`Could not create a secure QR pass link: ${signedUrlError.message}`)
  if (!signedImage?.signedUrl) throw new Error('Could not create a secure QR pass link.')

  const result = await sendMemberWelcomeQrPass({
    phone,
    memberName,
    qrCodeImageUrl: signedImage.signedUrl,
    expiryDate,
  })
  return { ...result, success: result.sent === true }
}
