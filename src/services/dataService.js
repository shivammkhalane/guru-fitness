import { gymSettings, initialMembers, initialPayments } from '../data/mockData'
import { getTodayIsoKolkata, parseReceptionMemberCode } from '../utils/gymLogic'
import { isSupabaseReady, supabase, ensureGymSetup, createAuditLog } from './supabaseService'
import { removeMemberPhoto, uploadMemberPhoto } from './memberPhotoService'

const STORAGE_KEYS = {
  members: 'guru-fitness-members',
  payments: 'guru-fitness-payments',
  settings: 'guru-fitness-settings',
}

const readStorage = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const formatDisplayTime = (timeValue) => {
  if (!timeValue) return '—'

  const value = typeof timeValue === 'string' ? timeValue : String(timeValue)
  const cleanValue = value.includes('T') ? value.split('T')[1] : value
  const [hours = '0', minutes = '0'] = cleanValue.split(':')
  const hourNumber = Number(hours)
  const suffix = hourNumber >= 12 ? 'PM' : 'AM'
  const displayHour = hourNumber % 12 || 12
  return `${displayHour}:${String(Number(minutes)).padStart(2, '0')} ${suffix}`
}

const normalizeLegacyDigits = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length >= 3) return digits.slice(-3).padStart(3, '0')
  return digits.padStart(3, '0')
}

const normalizePhoneNumber = (value) => String(value ?? '').replace(/\D/g, '')

const normalizePaymentMethod = (value, fallback = 'cash') => {
  const cleaned = String(value ?? fallback).trim().toLowerCase().replace(/\s+/g, '_')
  const validMethods = ['cash', 'upi', 'card', 'bank_transfer']
  return validMethods.includes(cleaned) ? cleaned : fallback
}

const addDaysToIso = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + Number(days || 0))
  return date.toISOString().slice(0, 10)
}

const resolveMemberCode = (value) => {
  return parseReceptionMemberCode(value) || parseReceptionMemberCode(normalizeLegacyDigits(value))
}

const normalizeSupabaseMember = (memberRow, membershipRow, planRow, attendanceRows = []) => {
  const memberCode = resolveMemberCode(memberRow.member_code) || normalizeLegacyDigits(memberRow.member_code)

  return {
    id: memberRow.id,
    memberId: memberCode,
    memberCode,
    qrToken: memberRow.qr_token || memberRow.id,
    name: memberRow.full_name,
    phone: memberRow.phone,
    plan: planRow?.name || membershipRow?.plan_name || 'Monthly',
    planId: planRow?.id || membershipRow?.plan_id || memberRow.plan_id || null,
    fee: Number(membershipRow?.amount || planRow?.price || 500),
    startDate: membershipRow?.start_date || memberRow.created_at?.slice(0, 10) || getTodayIsoKolkata(),
    expiryDate: membershipRow?.expiry_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    paymentMethod: membershipRow?.payment_method ? membershipRow.payment_method.toUpperCase() : 'Cash',
    photo: memberRow.photo_url || '',
    status: memberRow.status || 'active',
    attendanceHistory: (attendanceRows || []).map((entry) => ({
      date: entry.attendance_date,
      time: formatDisplayTime(entry.check_in_time),
      status: entry.status === 'manual_override' ? 'Present' : 'Present',
      rawStatus: entry.status,
    })),
  }
}

const getActiveGym = async () => {
  const { data: gymData } = await supabase
    .from('gyms')
    .select('id, slug, name, city, state, country, currency, timezone')
    .eq('slug', 'guru-fitness-health-club')
    .maybeSingle()

  if (gymData) return gymData
  return ensureGymSetup()
}

const getPlanBySelection = async (gymId, payload = {}) => {
  const planId = payload.planId || payload.plan_id || payload.planID || null
  const planName = String(payload.plan || payload.planName || '').trim()

  if (planId) {
    const { data: planRow, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('id', planId)
      .maybeSingle()

    if (planError) throw planError
    if (!planRow) throw new Error('The selected membership plan no longer exists in the gym plan list.')
    return planRow
  }

  if (planName) {
    const { data: planRow, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('gym_id', gymId)
      .eq('name', planName)
      .maybeSingle()

    if (planError) throw planError
    if (!planRow) {
      throw new Error(`Membership plan "${planName}" does not exist for this gym. Please choose a valid plan.`)
    }
    return planRow
  }

  const { data: fallbackPlan, error: fallbackPlanError } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('gym_id', gymId)
    .order('price', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (fallbackPlanError && fallbackPlanError.code !== 'PGRST116') throw fallbackPlanError
  if (!fallbackPlan) throw new Error('No active membership plans are available for this gym.')
  return fallbackPlan
}

const ensureSafeMembershipStatus = (status) => {
  const value = String(status || 'active').trim()
  return ['active', 'expiring_soon', 'expired', 'frozen', 'cancelled', 'archived'].includes(value) ? value : 'active'
}

const collectUsedMemberCodes = (codeRows) => {
  const used = new Set()
  for (const entry of codeRows || []) {
    const resolved = resolveMemberCode(entry.member_code ?? entry.memberId ?? entry)
    if (resolved) used.add(resolved)
  }
  return used
}

const pickNextMemberCode = (usedCodes) => {
  for (let num = 101; num <= 999; num += 1) {
    const nextCode = String(num)
    if (!usedCodes.has(nextCode)) return nextCode
  }
  throw new Error('No available member code slots remain for this gym (101–999).')
}

const generateNextMemberCode = async (gymId) => {
  if (!isSupabaseReady || !supabase) return '101'

  const { data, error } = await supabase
    .from('members')
    .select('member_code')
    .eq('gym_id', gymId)

  if (error) throw error
  return pickNextMemberCode(collectUsedMemberCodes(data))
}

const fallbackMemberRepository = {
  getMembers: () => readStorage(STORAGE_KEYS.members, initialMembers),
  saveMembers: (members) => writeStorage(STORAGE_KEYS.members, members),
}

const fallbackPaymentRepository = {
  getPayments: () => readStorage(STORAGE_KEYS.payments, initialPayments),
  savePayments: (payments) => writeStorage(STORAGE_KEYS.payments, payments),
}

const fallbackSettingsRepository = {
  getSettings: () => readStorage(STORAGE_KEYS.settings, gymSettings),
  saveSettings: (settings) => writeStorage(STORAGE_KEYS.settings, settings),
}

export const memberRepository = {
  ...fallbackMemberRepository,
  async getMembershipPlans() {
    if (!isSupabaseReady || !supabase) return []

    const gymData = await getActiveGym()
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('gym_id', gymData.id)
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) throw error
    return data || []
  },
  async getMembersFromSupabase() {
    if (!isSupabaseReady || !supabase) return fallbackMemberRepository.getMembers()

    const [{ data: memberRows, error: memberError }, { data: membershipRows }, { data: planRows }, { data: attendanceRows }] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('memberships').select('*').order('created_at', { ascending: false }),
      supabase.from('membership_plans').select('*'),
      supabase.from('attendance').select('*').order('attendance_date', { ascending: false }),
    ])

    if (memberError) throw memberError

    const membershipByMember = new Map()
    for (const item of membershipRows || []) {
      if (!membershipByMember.has(item.member_id)) {
        membershipByMember.set(item.member_id, item)
      }
    }
    const planById = new Map((planRows || []).map((item) => [item.id, item]))
    const attendanceByMember = new Map()

    for (const attendance of attendanceRows || []) {
      const current = attendanceByMember.get(attendance.member_id) || []
      current.push(attendance)
      attendanceByMember.set(attendance.member_id, current)
    }

    return (memberRows || [])
      .filter((memberRow) => memberRow.status !== 'archived')
      .map((memberRow) => {
        const membership = membershipByMember.get(memberRow.id)
        const plan = membership ? planById.get(membership.plan_id) : (memberRow.plan_id ? planById.get(memberRow.plan_id) : null)
        return normalizeSupabaseMember(memberRow, membership, plan, attendanceByMember.get(memberRow.id) || [])
      })
  },
  async getMemberActivity(memberId) {
    if (!isSupabaseReady || !supabase || !memberId) return []
    const gymData = await getActiveGym()
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, created_at, metadata')
      .eq('gym_id', gymData.id)
      .eq('entity_name', 'members')
      .eq('entity_id', memberId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return data || []
  },
  async getMemberByCode(codeInput) {
    const code = parseReceptionMemberCode(codeInput)
    if (!code) return null

    if (!isSupabaseReady || !supabase) {
      const members = fallbackMemberRepository.getMembers()
      return (
        members.find((member) => resolveMemberCode(member.memberId) === code || resolveMemberCode(member.memberCode) === code) ||
        null
      )
    }

    const gymData = await getActiveGym()

    const { data: memberRow } = await supabase
      .from('members')
      .select('*')
      .eq('gym_id', gymData.id)
      .eq('member_code', code)
      .maybeSingle()

    if (!memberRow || memberRow.status === 'archived') return null

    const [{ data: memberships }, { data: plans }, { data: attendanceRows }] = await Promise.all([
      supabase.from('memberships').select('*').eq('gym_id', gymData.id).eq('member_id', memberRow.id).order('created_at', { ascending: false }),
      supabase.from('membership_plans').select('*').eq('gym_id', gymData.id),
      supabase.from('attendance').select('*').eq('gym_id', gymData.id).eq('member_id', memberRow.id).order('attendance_date', { ascending: false }),
    ])

    const planById = new Map((plans || []).map((p) => [p.id, p]))
    const latestMembership = memberships?.[0] || null
    const plan = latestMembership ? planById.get(latestMembership.plan_id) : (memberRow.plan_id ? planById.get(memberRow.plan_id) : null)

    return normalizeSupabaseMember(memberRow, latestMembership, plan, attendanceRows || [])
  },
  async getMemberByQrToken(qrToken) {
    if (!isSupabaseReady || !supabase || !qrToken) return null

    const cleanToken = typeof qrToken === 'string' && qrToken.includes(':')
      ? qrToken.split(':').pop().trim()
      : String(qrToken).trim()

    const gymData = await getActiveGym()

    let { data: memberRow, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('gym_id', gymData.id)
      .eq('qr_token', cleanToken)
      .maybeSingle()

    if (memberError || !memberRow) {
      const { data: fallbackRow } = await supabase
        .from('members')
        .select('*')
        .eq('gym_id', gymData.id)
        .eq('member_code', cleanToken)
        .maybeSingle()

      if (!fallbackRow) return null
      memberRow = fallbackRow
    }

    if (memberRow.status === 'archived') return null

    const [{ data: memberships }, { data: plans }, { data: attendanceRows }] = await Promise.all([
      supabase.from('memberships').select('*').eq('gym_id', gymData.id).eq('member_id', memberRow.id).order('created_at', { ascending: false }),
      supabase.from('membership_plans').select('*').eq('gym_id', gymData.id),
      supabase.from('attendance').select('*').eq('gym_id', gymData.id).eq('member_id', memberRow.id).order('attendance_date', { ascending: false }),
    ])

    const planById = new Map((plans || []).map((p) => [p.id, p]))
    const latestMembership = memberships?.[0] || null
    const plan = latestMembership ? planById.get(latestMembership.plan_id) : (memberRow.plan_id ? planById.get(memberRow.plan_id) : null)

    return normalizeSupabaseMember(memberRow, latestMembership, plan, attendanceRows || [])
  },
  async regenerateMemberQrToken(memberId) {
    if (!isSupabaseReady || !supabase) return null

    const gymData = await getActiveGym()
    const nextToken = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `qr-${Date.now()}`

    const { data, error } = await supabase
      .from('members')
      .update({ qr_token: nextToken })
      .eq('gym_id', gymData.id)
      .eq('member_code', memberId)
      .select('qr_token')
      .single()

    if (error) throw error
    return data?.qr_token || nextToken
  },
  async createMember(memberPayload = {}) {
    const payload = { ...memberPayload }
    const fullName = String(payload.fullName || payload.name || '').trim()
    if (!fullName) throw new Error('Full name is required.')
    if (!payload.photoFile) throw new Error('Please upload a profile photograph.')

    const normalizedPhone = normalizePhoneNumber(payload.phone)
    if (!normalizedPhone) throw new Error('Phone number is required.')

    if (!isSupabaseReady || !supabase) {
      throw new Error('Member registration with photographs requires a live Supabase Storage connection.')
    }

    const gymData = await getActiveGym()
    const selectedPlan = await getPlanBySelection(gymData.id, payload)

    const suppliedCode = resolveMemberCode(payload.memberCode || payload.memberId || payload.member_code)
    if (suppliedCode) {
      const numericCode = Number(suppliedCode)
      if (!Number.isInteger(numericCode) || numericCode < 101 || numericCode > 999) {
        throw new Error('Member code must be a numeric value between 101 and 999.')
      }
    }

    const { data: existingPhoneRows, error: phoneCheckError } = await supabase
      .from('members')
      .select('id, phone, member_code')
      .eq('gym_id', gymData.id)

    if (phoneCheckError) throw phoneCheckError

    const duplicatePhone = (existingPhoneRows || []).find((row) => normalizePhoneNumber(row.phone) === normalizedPhone)
    if (duplicatePhone) {
      throw new Error(`A member with phone number ${normalizedPhone} already exists in this gym.`)
    }

    const generatedMemberCode = suppliedCode || (await generateNextMemberCode(gymData.id))
    const startDate = payload.startDate || getTodayIsoKolkata()
    const expiryDate = payload.expiryDate && payload.expiryDate !== startDate
      ? payload.expiryDate
      : addDaysToIso(startDate, Number(selectedPlan.duration_days || 30))

    const { data: existingCodeRows, error: codeCheckError } = await supabase
      .from('members')
      .select('id, member_code')
      .eq('gym_id', gymData.id)

    if (codeCheckError) throw codeCheckError

    if ((existingCodeRows || []).some((row) => resolveMemberCode(row.member_code) === generatedMemberCode)) {
      throw new Error(`Member code ${generatedMemberCode} is already in use for this gym.`)
    }

    const memberInsert = {
      gym_id: gymData.id,
      member_code: generatedMemberCode,
      full_name: fullName,
      phone: normalizedPhone,
      photo_url: null,
      plan_id: selectedPlan.id,
      status: 'active',
    }

    let { data: memberData, error: memberError } = await supabase
      .from('members')
      .insert(memberInsert)
      .select('*')
      .single()

    if (memberError) throw memberError

    let photoPath
    try {
      photoPath = await uploadMemberPhoto(gymData.id, memberData.id, payload.photoFile)
      const { data: memberWithPhoto, error: photoUpdateError } = await supabase
        .from('members')
        .update({ photo_url: photoPath })
        .eq('id', memberData.id)
        .select('*')
        .single()
      if (photoUpdateError) throw photoUpdateError
      memberData = memberWithPhoto
    } catch (photoError) {
      if (photoPath) {
        try {
          await removeMemberPhoto(photoPath)
        } catch {
          // Preserve the upload error for the form.
        }
      }
      await supabase.from('members').delete().eq('id', memberData.id)
      throw new Error(`Profile photo upload failed: ${photoError.message || 'Unable to save the photograph.'}`)
    }

    const paymentMethod = normalizePaymentMethod(payload.paymentMethod || payload.payment_method || 'cash')
    const amount = Number(payload.fee ?? selectedPlan.price ?? 0)

    const { data: membershipData, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        gym_id: gymData.id,
        member_id: memberData.id,
        plan_id: selectedPlan.id,
        start_date: startDate,
        expiry_date: expiryDate,
        amount,
        payment_method: paymentMethod,
        status: 'active',
      })
      .select('*')
      .single()

    if (membershipError) throw new Error(`Membership creation failed: ${membershipError.message || 'Unknown error'}`)

    const shouldCreatePayment = payload.paymentMade !== false && amount > 0 && ['cash', 'upi', 'card', 'bank_transfer'].includes(paymentMethod)
    if (shouldCreatePayment) {
      const { error: paymentError } = await supabase.from('payments').insert({
        gym_id: gymData.id,
        member_id: memberData.id,
        receipt_number: `REC-${Date.now().toString().slice(-6)}`,
        amount,
        payment_date: startDate,
        payment_method: paymentMethod,
        status: 'paid',
        notes: `${selectedPlan.name} Plan Registration`,
      })

      if (paymentError) {
        throw new Error(`Payment creation failed: ${paymentError.message || 'Unable to record the initial payment.'}`)
      }
    }

    try {
      await createAuditLog('member_created', 'members', memberData.id, {
        memberCode: generatedMemberCode,
        full_name: fullName,
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        payment_method: paymentMethod,
      })
    } catch {
      // Non-blocking audit logging; the member creation remains successful.
    }

    return normalizeSupabaseMember(memberData, membershipData, selectedPlan, [])
  },
  async editMember(memberId, payload = {}) {
    if (!isSupabaseReady || !supabase) return null

    const gymData = await getActiveGym()
    const memberRecord = await supabase
      .from('members')
      .select('*')
      .eq('gym_id', gymData.id)
      .or(`id.eq.${memberId},member_code.eq.${memberId}`)
      .maybeSingle()

    if (!memberRecord.data) throw new Error('Member not found.')

    const nextFullName = String(payload.full_name || payload.fullName || memberRecord.data.full_name || '').trim()
    const nextPhone = normalizePhoneNumber(payload.phone || payload.phoneNumber)
    if (!nextFullName) throw new Error('Full name is required.')
    if (!nextPhone) throw new Error('Phone number is required.')

    const { data: duplicateRows } = await supabase
      .from('members')
      .select('id, phone')
      .eq('gym_id', gymData.id)

    const duplicatePhoneRow = (duplicateRows || []).find((row) => {
      if (row.id === memberRecord.data.id) return false
      return normalizePhoneNumber(row.phone) === nextPhone
    })

    if (duplicatePhoneRow) {
      throw new Error(`Another member already has phone number ${nextPhone}.`)
    }

    const updatePayload = {
      full_name: nextFullName,
      phone: nextPhone,
      updated_at: new Date().toISOString(),
    }

    if (payload.photoFile) {
      updatePayload.photo_url = await uploadMemberPhoto(gymData.id, memberRecord.data.id, payload.photoFile)
    }

    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update(updatePayload)
      .eq('id', memberRecord.data.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    try {
      await createAuditLog('member_updated', 'members', updatedMember.id, {
        full_name: nextFullName,
        phone: nextPhone,
      })
    } catch {
      // Non-blocking audit logging; member update already succeeded.
    }

    const [{ data: memberships }, { data: plans }, { data: attendanceRows }] = await Promise.all([
      supabase.from('memberships').select('*').eq('gym_id', gymData.id).eq('member_id', updatedMember.id).order('created_at', { ascending: false }),
      supabase.from('membership_plans').select('*').eq('gym_id', gymData.id),
      supabase.from('attendance').select('*').eq('gym_id', gymData.id).eq('member_id', updatedMember.id).order('attendance_date', { ascending: false }),
    ])

    const planById = new Map((plans || []).map((p) => [p.id, p]))
    const latestMembership = memberships?.[0] || null
    const plan = latestMembership ? planById.get(latestMembership.plan_id) : (updatedMember.plan_id ? planById.get(updatedMember.plan_id) : null)

    return normalizeSupabaseMember(updatedMember, latestMembership, plan, attendanceRows || [])
  },
  async archiveMember(memberId) {
    if (!isSupabaseReady || !supabase) return null

    const gymData = await getActiveGym()
    const { data: memberRow, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('gym_id', gymData.id)
      .or(`id.eq.${memberId},member_code.eq.${memberId}`)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!memberRow) throw new Error('Member not found.')
    if (memberRow.status === 'archived') return normalizeSupabaseMember(memberRow, null, null, [])

    const { data: updatedMember, error: archiveError } = await supabase
      .from('members')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', memberRow.id)
      .select('*')
      .single()

    if (archiveError) {
      const message = String(archiveError.message || '')
      if (message.includes('members_status_check') || message.includes('archived')) {
        throw new Error('Archive is blocked until the live Supabase schema allows the archived status. Apply the migration in supabase/migrations/004_allow_archived_member_status.sql to the project database.')
      }
      throw archiveError
    }

    try {
      await createAuditLog('member_archived', 'members', updatedMember.id, {
        memberCode: updatedMember.member_code,
      })
    } catch {
      // Non-blocking audit logging; archive already succeeded.
    }

    return normalizeSupabaseMember(updatedMember, null, null, [])
  },
  async recordAttendance(memberId, status = 'present') {
    const code = resolveMemberCode(memberId)
    if (!code) throw new Error('Invalid member code')

    if (!isSupabaseReady || !supabase) {
      const members = fallbackMemberRepository.getMembers()
      const todayIso = getTodayIsoKolkata()
      const memberIndex = members.findIndex(
        (member) => resolveMemberCode(member.memberId) === code || resolveMemberCode(member.memberCode) === code,
      )
      if (memberIndex === -1) throw new Error('Member not found')

      const member = members[memberIndex]
      const alreadyMarked = (member.attendanceHistory || []).some((entry) => entry.date === todayIso)
      if (alreadyMarked) {
        return { memberId: code, alreadyMarked: true }
      }

      const now = new Date()
      const checkInTime = now.toISOString().slice(11, 19)
      const timeLabel = formatDisplayTime(checkInTime)
      const rawStatus = status === 'manual_override' ? 'manual_override' : 'present'
      const updatedMember = {
        ...member,
        attendanceHistory: [
          { date: todayIso, time: timeLabel, status: 'Present', rawStatus },
          ...(member.attendanceHistory || []),
        ],
      }
      const nextMembers = [...members]
      nextMembers[memberIndex] = updatedMember
      fallbackMemberRepository.saveMembers(nextMembers)

      return {
        memberId: code,
        name: member.name,
        date: todayIso,
        time: timeLabel,
        status: 'Present',
      }
    }

    const { data: gymData } = await supabase
      .from('gyms')
      .select('id')
      .eq('slug', 'guru-fitness-health-club')
      .maybeSingle()

    if (!gymData) throw new Error('Gym record not found')

    const { data: memberRow, error: memberErr } = await supabase
      .from('members')
      .select('id, member_code, full_name')
      .eq('gym_id', gymData.id)
      .eq('member_code', code)
      .maybeSingle()

    if (memberErr || !memberRow) throw new Error('Member not found')

    const todayIso = getTodayIsoKolkata()
    const checkInTime = new Date().toISOString().slice(11, 19) + '+00:00'

    const { data: authUser } = await supabase.auth.getUser()
    const recordedBy = authUser?.user?.id || null

    const payload = {
      gym_id: gymData.id,
      member_id: memberRow.id,
      attendance_date: todayIso,
      check_in_time: checkInTime,
      status: status === 'present' ? 'present' : status,
      recorded_by: recordedBy,
    }

    const { data: attData, error } = await supabase
      .from('attendance')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: existingRow, error: fetchError } = await supabase
          .from('attendance')
          .select('*')
          .eq('gym_id', gymData.id)
          .eq('member_id', memberRow.id)
          .eq('attendance_date', todayIso)
          .maybeSingle()

        if (fetchError) throw fetchError

        return {
          memberId: memberRow.member_code,
          name: memberRow.full_name,
          date: todayIso,
          time: formatDisplayTime(existingRow?.check_in_time || checkInTime),
          status: 'Present',
          alreadyMarked: true,
          originalTime: existingRow ? formatDisplayTime(existingRow.check_in_time) : formatDisplayTime(checkInTime),
        }
      }
      throw error
    }

    return {
      memberId: memberRow.member_code,
      name: memberRow.full_name,
      date: todayIso,
      time: formatDisplayTime(attData?.check_in_time || checkInTime),
      status: 'Present',
      alreadyMarked: false,
    }
  },
  async renewMembership(memberId, { amount, expiryDate, paymentMethod = 'Cash' }) {
    if (!isSupabaseReady || !supabase) return

    const { data: gymData, error: gymError } = await supabase
      .from('gyms')
      .select('id')
      .eq('slug', 'guru-fitness-health-club')
      .maybeSingle()

    if (gymError) throw gymError
    if (!gymData) throw new Error('Gym not found for membership renewal.')

    const { data: memberRow, error: memberError } = await supabase
      .from('members')
      .select('id, plan_id')
      .eq('gym_id', gymData.id)
      .eq('member_code', memberId)
      .maybeSingle()

    if (memberError) throw memberError
    if (!memberRow) throw new Error('Member not found for membership renewal.')

    const todayIso = getTodayIsoKolkata()
    const paymentMethodClean = (paymentMethod || 'cash').toLowerCase().replace(/\s+/g, '_')
    const validPaymentMethods = ['cash', 'upi', 'card', 'bank_transfer']
    const safePaymentMethod = validPaymentMethods.includes(paymentMethodClean) ? paymentMethodClean : 'cash'

    const { error: membershipError } = await supabase.from('memberships').insert({
      gym_id: gymData.id,
      member_id: memberRow.id,
      plan_id: memberRow.plan_id,
      start_date: todayIso,
      expiry_date: expiryDate,
      amount: Number(amount || 500),
      payment_method: safePaymentMethod,
      status: 'active',
    })
    if (membershipError) throw new Error(`Membership renewal failed: ${membershipError.message || 'Unknown error'}`)

    const { error: paymentError } = await supabase.from('payments').insert({
      gym_id: gymData.id,
      member_id: memberRow.id,
      receipt_number: `REC-${Date.now().toString().slice(-6)}`,
      amount: Number(amount || 500),
      payment_date: todayIso,
      payment_method: safePaymentMethod,
      status: 'paid',
      notes: 'Membership Renewal',
    })
    if (paymentError) throw new Error(`Renewal payment failed: ${paymentError.message || 'Unknown error'}`)

    try {
      await createAuditLog('membership_renewed', 'memberships', memberRow.id, { expiryDate, amount })
    } catch {
      // Non-critical background audit entry
    }
  }
}

export const paymentRepository = {
  ...fallbackPaymentRepository,
  async recordPayment(payload = {}) {
    if (!isSupabaseReady || !supabase) throw new Error('Recording a payment requires a live Supabase connection.')

    const amount = Number(payload.amount)
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a payment amount greater than zero.')

    const gymData = await getActiveGym()
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, member_code, full_name')
      .eq('gym_id', gymData.id)
      .eq('member_code', String(payload.memberCode || ''))
      .maybeSingle()
    if (memberError) throw memberError
    if (!member) throw new Error('Member not found for this payment.')

    const paymentMethod = normalizePaymentMethod(payload.paymentMethod)
    const receiptNumber = `REC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const paymentDate = payload.paymentDate || getTodayIsoKolkata()
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        gym_id: gymData.id,
        member_id: member.id,
        receipt_number: receiptNumber,
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        status: 'paid',
        notes: String(payload.notes || 'Member payment').trim(),
      })
      .select('*')
      .single()
    if (paymentError) throw paymentError

    try {
      await createAuditLog('payment_received', 'payments', payment.id, {
        memberCode: member.member_code,
        receiptNumber,
        amount,
      })
    } catch {
      // Audit logging is non-blocking after the payment is confirmed.
    }

    return {
      id: payment.id,
      member: member.full_name,
      memberCode: member.member_code,
      receiptNumber: payment.receipt_number,
      amount: Number(payment.amount),
      date: payment.payment_date,
      method: payment.payment_method.toUpperCase(),
      period: payment.notes || 'Member payment',
      status: payment.status === 'paid' ? 'Paid' : 'Pending',
    }
  },
  async getPaymentsFromSupabase() {
    if (!isSupabaseReady || !supabase) return fallbackPaymentRepository.getPayments()

    const [{ data: paymentRows, error: payErr }, { data: memberRows }] = await Promise.all([
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('id, full_name, member_code'),
    ])

    if (payErr) throw payErr
    if (!paymentRows || paymentRows.length === 0) return []

    const memberMap = new Map((memberRows || []).map((m) => [m.id, m]))

    return paymentRows.map((p) => {
      const mem = memberMap.get(p.member_id)
      return {
        id: p.id,
        member: mem ? mem.full_name : 'Member',
        memberCode: mem ? mem.member_code : '',
        receiptNumber: p.receipt_number,
        amount: Number(p.amount || 0),
        date: p.payment_date,
        method: (p.payment_method || 'cash').toUpperCase(),
        period: p.notes || 'Monthly Membership',
        status: p.status === 'paid' ? 'Paid' : 'Pending',
      }
    })
  },
}

export const settingsRepository = {
  ...fallbackSettingsRepository,
  async getSettingsFromSupabase() {
    if (!isSupabaseReady || !supabase) return fallbackSettingsRepository.getSettings()

    const { data, error } = await supabase.from('gyms').select('*').eq('slug', 'guru-fitness-health-club').maybeSingle()
    if (error && error.code !== 'PGRST116') throw error
    if (!data) return fallbackSettingsRepository.getSettings()

    return {
      gymName: data.name || 'Guru Fitness Health Club',
      monthlyMembership: 500,
      phone: '+91 98765 43210',
      city: data.city || 'Dhule',
      address: `${data.city || 'Dhule'}, ${data.state || 'Maharashtra'}, India`,
    }
  },
  async saveSettingsToSupabase(settingsPayload) {
    if (!isSupabaseReady || !supabase) {
      fallbackSettingsRepository.saveSettings(settingsPayload)
      return settingsPayload
    }

    const { data, error } = await supabase
      .from('gyms')
      .update({
        name: settingsPayload.gymName,
        city: settingsPayload.city,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', 'guru-fitness-health-club')
      .select('*')
      .maybeSingle()

    if (error) throw error
    fallbackSettingsRepository.saveSettings(settingsPayload)
    return data || settingsPayload
  },
}

export const gymRepository = {
  getMembers: fallbackMemberRepository.getMembers,
  saveMembers: fallbackMemberRepository.saveMembers,
  getPayments: fallbackPaymentRepository.getPayments,
  savePayments: fallbackPaymentRepository.savePayments,
  getSettings: fallbackSettingsRepository.getSettings,
  saveSettings: fallbackSettingsRepository.saveSettings,
  getMembershipPlans: memberRepository.getMembershipPlans,
  getMembersFromSupabase: memberRepository.getMembersFromSupabase,
  getMemberActivity: memberRepository.getMemberActivity,
  getMemberByCode: memberRepository.getMemberByCode,
  getMemberByQrToken: memberRepository.getMemberByQrToken,
  regenerateMemberQrToken: memberRepository.regenerateMemberQrToken,
  createMember: memberRepository.createMember,
  editMember: memberRepository.editMember,
  archiveMember: memberRepository.archiveMember,
  recordAttendance: memberRepository.recordAttendance,
  renewMembership: memberRepository.renewMembership,
  recordPayment: paymentRepository.recordPayment,
  getPaymentsFromSupabase: paymentRepository.getPaymentsFromSupabase,
  getSettingsFromSupabase: settingsRepository.getSettingsFromSupabase,
  saveSettingsToSupabase: settingsRepository.saveSettingsToSupabase,
}

export const dataService = gymRepository


