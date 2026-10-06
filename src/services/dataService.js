import { gymSettings, initialMembers, initialPayments } from '../data/mockData'
import { getTodayIsoKolkata, parseReceptionMemberCode } from '../utils/gymLogic'
import { isSupabaseReady, supabase, ensureGymSetup, createAuditLog } from './supabaseService'

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
    fee: Number(membershipRow?.amount || planRow?.price || 500),
    startDate: membershipRow?.start_date || memberRow.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    expiryDate: membershipRow?.expiry_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    paymentMethod: membershipRow?.payment_method ? membershipRow.payment_method.toUpperCase() : 'Cash',
    photo: memberRow.photo_url || '',
    attendanceHistory: (attendanceRows || []).map((entry) => ({
      date: entry.attendance_date,
      time: formatDisplayTime(entry.check_in_time),
      status: entry.status === 'manual_override' ? 'Present' : 'Present',
      rawStatus: entry.status,
    })),
  }
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

const generateNextMemberCodeLocal = (members) => pickNextMemberCode(collectUsedMemberCodes(members))

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

    return (memberRows || []).map((memberRow) => {
      const membership = membershipByMember.get(memberRow.id)
      const plan = membership ? planById.get(membership.plan_id) : (memberRow.plan_id ? planById.get(memberRow.plan_id) : null)
      return normalizeSupabaseMember(memberRow, membership, plan, attendanceByMember.get(memberRow.id) || [])
    })
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

    const { data: gymData } = await supabase
      .from('gyms')
      .select('id')
      .eq('slug', 'guru-fitness-health-club')
      .maybeSingle()

    if (!gymData) return null

    const { data: memberRow } = await supabase
      .from('members')
      .select('*')
      .eq('gym_id', gymData.id)
      .eq('member_code', code)
      .maybeSingle()

    if (!memberRow) return null

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

    const { data: gymData } = await supabase
      .from('gyms')
      .select('id')
      .eq('slug', 'guru-fitness-health-club')
      .maybeSingle()

    if (!gymData) return null

    // Look up by qr_token scoped to current gym (cross-gym protection)
    let { data: memberRow, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('gym_id', gymData.id)
      .eq('qr_token', cleanToken)
      .maybeSingle()

    // Also support scanning member_code fallback
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

    const { data: gymData } = await supabase
      .from('gyms')
      .select('id')
      .eq('slug', 'guru-fitness-health-club')
      .maybeSingle()

    if (!gymData) return null

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
  async createMember(memberPayload) {
    if (!isSupabaseReady || !supabase) {
      const members = fallbackMemberRepository.getMembers()
      const manualCode = resolveMemberCode(memberPayload.memberCode || memberPayload.memberId)
      const memberCode = manualCode || generateNextMemberCodeLocal(members)
      const nextMember = {
        name: memberPayload.fullName || memberPayload.name,
        memberId: memberCode,
        memberCode,
        phone: memberPayload.phone,
        plan: memberPayload.plan || 'Monthly',
        fee: Number(memberPayload.fee || 500),
        startDate: memberPayload.startDate,
        expiryDate: memberPayload.expiryDate,
        paymentMethod: memberPayload.paymentMethod || 'Cash',
        photo: memberPayload.photo || '',
        qrToken: `qr-${Date.now()}`,
        attendanceHistory: [],
      }
      const nextMembers = [nextMember, ...members]
      fallbackMemberRepository.saveMembers(nextMembers)
      return nextMember
    }

    let { data: gymData } = await supabase
      .from('gyms')
      .select('id')
      .eq('slug', 'guru-fitness-health-club')
      .maybeSingle()

    if (!gymData) {
      gymData = await ensureGymSetup()
    }

    const planName = memberPayload.plan || 'Monthly'
    const planDuration = planName.toLowerCase().includes('year') ? 365 : planName.toLowerCase().includes('quarter') ? 90 : 30

    const { data: planData, error: planError } = await supabase
      .from('membership_plans')
      .upsert(
        {
          gym_id: gymData.id,
          name: planName,
          duration_days: planDuration,
          price: Number(memberPayload.fee || 500),
          is_active: true,
        },
        { onConflict: 'gym_id,name' },
      )
      .select('id, name, price')
      .single()

    if (planError) throw planError

    const manualCode = resolveMemberCode(memberPayload.memberCode || memberPayload.memberId)
    const generatedMemberCode = manualCode || (await generateNextMemberCode(gymData.id))

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .insert({
        gym_id: gymData.id,
        member_code: generatedMemberCode,
        full_name: memberPayload.name || memberPayload.fullName,
        phone: memberPayload.phone,
        photo_url: memberPayload.photo || null,
        plan_id: planData.id,
        status: 'active',
      })
      .select('*')
      .single()

    if (memberError) throw memberError

    const paymentMethodClean = (memberPayload.paymentMethod || 'cash').toLowerCase().replace(/\s+/g, '_')
    const validPaymentMethods = ['cash', 'upi', 'card', 'bank_transfer']
    const safePaymentMethod = validPaymentMethods.includes(paymentMethodClean) ? paymentMethodClean : 'cash'

    const { data: membershipData, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        gym_id: gymData.id,
        member_id: memberData.id,
        plan_id: planData.id,
        start_date: memberPayload.startDate,
        expiry_date: memberPayload.expiryDate,
        amount: Number(memberPayload.fee || 500),
        payment_method: safePaymentMethod,
        status: 'active',
      })
      .select('*')
      .single()

    if (membershipError) throw membershipError

    // Also record initial payment in payments table
    try {
      await supabase.from('payments').insert({
        gym_id: gymData.id,
        member_id: memberData.id,
        receipt_number: `REC-${Date.now().toString().slice(-6)}`,
        amount: Number(memberPayload.fee || 500),
        payment_date: memberPayload.startDate || new Date().toISOString().slice(0, 10),
        payment_method: safePaymentMethod,
        status: 'paid',
        notes: `${planName} Plan Registration`,
      })
      await createAuditLog('member_created', 'members', memberData.id, { memberCode, name: memberPayload.fullName || memberPayload.name })
    } catch {
      // Non-critical background log
    }

    return normalizeSupabaseMember(memberData, membershipData, planData, [])
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

    const { data: attData, error } = await supabase.from('attendance').upsert({
      gym_id: gymData.id,
      member_id: memberRow.id,
      attendance_date: todayIso,
      check_in_time: checkInTime,
      status: status === 'present' ? 'present' : status,
      recorded_by: recordedBy,
    }, { onConflict: 'gym_id,member_id,attendance_date' }).select('*').single()

    if (error) throw error

    return {
      memberId: memberRow.member_code,
      name: memberRow.full_name,
      date: todayIso,
      time: formatDisplayTime(checkInTime),
      status: 'Present',
    }
  },
  async renewMembership(memberId, { amount, expiryDate, paymentMethod = 'Cash' }) {
    if (!isSupabaseReady || !supabase) return

    const { data: gymData } = await supabase
      .from('gyms')
      .select('id')
      .eq('slug', 'guru-fitness-health-club')
      .maybeSingle()

    if (!gymData) return

    const { data: memberRow } = await supabase
      .from('members')
      .select('id, plan_id')
      .eq('gym_id', gymData.id)
      .eq('member_code', memberId)
      .maybeSingle()

    if (!memberRow) return

    const todayIso = new Date().toISOString().slice(0, 10)
    const paymentMethodClean = (paymentMethod || 'cash').toLowerCase().replace(/\s+/g, '_')
    const validPaymentMethods = ['cash', 'upi', 'card', 'bank_transfer']
    const safePaymentMethod = validPaymentMethods.includes(paymentMethodClean) ? paymentMethodClean : 'cash'

    await supabase.from('memberships').insert({
      gym_id: gymData.id,
      member_id: memberRow.id,
      plan_id: memberRow.plan_id,
      start_date: todayIso,
      expiry_date: expiryDate,
      amount: Number(amount || 500),
      payment_method: safePaymentMethod,
      status: 'active',
    })

    await supabase.from('payments').insert({
      gym_id: gymData.id,
      member_id: memberRow.id,
      receipt_number: `REC-${Date.now().toString().slice(-6)}`,
      amount: Number(amount || 500),
      payment_date: todayIso,
      payment_method: safePaymentMethod,
      status: 'paid',
      notes: 'Membership Renewal',
    })

    await createAuditLog('membership_renewed', 'memberships', memberRow.id, { expiryDate, amount })
  }
}

export const paymentRepository = {
  ...fallbackPaymentRepository,
  async getPaymentsFromSupabase() {
    if (!isSupabaseReady || !supabase) return fallbackPaymentRepository.getPayments()

    const [{ data: paymentRows, error: payErr }, { data: memberRows }] = await Promise.all([
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
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
  getMembersFromSupabase: memberRepository.getMembersFromSupabase,
  getMemberByCode: memberRepository.getMemberByCode,
  getMemberByQrToken: memberRepository.getMemberByQrToken,
  regenerateMemberQrToken: memberRepository.regenerateMemberQrToken,
  createMember: memberRepository.createMember,
  recordAttendance: memberRepository.recordAttendance,
  renewMembership: memberRepository.renewMembership,
  getPaymentsFromSupabase: paymentRepository.getPaymentsFromSupabase,
  getSettingsFromSupabase: settingsRepository.getSettingsFromSupabase,
  saveSettingsToSupabase: settingsRepository.saveSettingsToSupabase,
}

export const dataService = gymRepository


