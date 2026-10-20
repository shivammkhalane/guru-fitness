import QRCode from 'qrcode'
import { isSupabaseReady, supabase } from './supabaseService'
import { sendMemberWelcomeQrPass } from './whatsappNotificationService'

const QR_PASS_BUCKET = 'qr-passes'
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365

export const sendMemberQrPass = async (member) => {
  if (!isSupabaseReady || !supabase) throw new Error('QR pass delivery requires a Supabase connection.')
  if (!member?.id || !member?.qrToken || !member?.memberId || !member?.expiryDate) {
    throw new Error('Member pass is missing the member ID, QR token, member code, or expiry date.')
  }

  const dataUrl = await QRCode.toDataURL(member.qrToken, {
    width: 512,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
  const image = await fetch(dataUrl).then((response) => response.blob())
  const path = `${member.id}.png`
  const { error: uploadError } = await supabase.storage
    .from(QR_PASS_BUCKET)
    .upload(path, image, { upsert: true, contentType: 'image/png', cacheControl: '3600' })
  if (uploadError) throw uploadError

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(QR_PASS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (signedUrlError) throw signedUrlError
  if (!signedUrlData?.signedUrl || !signedUrlData.signedUrl.startsWith('https://')) {
    throw new Error('Supabase did not return an HTTPS QR pass URL.')
  }

  return sendMemberWelcomeQrPass({
    phone: member.phone,
    memberName: member.name,
    qrCodeImageUrl: signedUrlData.signedUrl,
    expiryDate: member.expiryDate,
  })
}
