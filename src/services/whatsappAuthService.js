import { isSupabaseReady, supabase } from './supabaseService'
import { readWhatsAppFunctionError, sendWhatsAppNotification } from './whatsappNotificationService'

const invokeMemberAuth = async (body) => {
  if (!isSupabaseReady || !supabase) {
    throw new Error('Member sign-in is not configured. Contact gym staff for assistance.')
  }

  const { data, error } = await supabase.functions.invoke('whatsapp-notifications', { body })
  if (error) {
    const message = await readWhatsAppFunctionError(error)
    throw new Error(message || 'WhatsApp verification could not be completed. Please try again.')
  }
  return data
}

export async function checkMemberAndSendOTP(phoneNumber) {
  try {
    const result = await invokeMemberAuth({
      action: 'request_member_login_otp',
      phone: phoneNumber,
    })
    if (!result?.sent) {
      return { success: false, message: result?.message || 'WhatsApp could not accept the login code.' }
    }
    return {
      success: true,
      apiDelivered: true,
      memberName: 'Member',
      message: 'Login code sent to your WhatsApp.',
    }
  } catch (error) {
    console.error('OTP Dispatch Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Could not send a login code. Please try again.',
    }
  }
}

export async function verifyWhatsAppOTP(phoneNumber, enteredOtp) {
  const code = String(enteredOtp || '').trim()
  if (!/^\d{6}$/.test(code)) {
    return { success: false, message: 'Please enter a valid 6-digit OTP code.' }
  }

  try {
    const result = await invokeMemberAuth({
      action: 'verify_member_login_otp',
      phone: phoneNumber,
      otp: code,
    })
    if (!result?.verified || !result.member) {
      return { success: false, message: result?.message || 'Invalid or expired OTP code. Please try again.' }
    }
    return { success: true, member: result.member }
  } catch (error) {
    console.error('Verification Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Verification error. Please try again.',
    }
  }
}

export async function dispatchExpiryReminders(members, windowDays = 7) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const summary = { total: members.length, sent: 0, failed: 0, skipped: 0, details: [] }

  for (const member of members) {
    const memberCode = member.memberCode || member.memberId
    if (!memberCode || !member.expiryDate) {
      summary.skipped += 1
      continue
    }

    const expiry = new Date(member.expiryDate)
    expiry.setHours(0, 0, 0, 0)
    const daysLeft = Math.round((expiry - today) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0 || daysLeft > windowDays) {
      summary.skipped += 1
      continue
    }

    try {
      await sendWhatsAppNotification(memberCode, 'membership_expiring_soon')
      summary.sent += 1
      summary.details.push({ member: member.name, status: 'sent', daysLeft })
    } catch (error) {
      summary.failed += 1
      summary.details.push({
        member: member.name,
        status: 'failed',
        error: error instanceof Error ? error.message : 'WhatsApp reminder was not sent.',
        daysLeft,
      })
    }
  }

  return summary
}
