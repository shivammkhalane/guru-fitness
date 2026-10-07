const dayMs = 24 * 60 * 60 * 1000

export const EXPIRING_WINDOW_DAYS = 7

/** Today's calendar date in Asia/Kolkata as YYYY-MM-DD */
export const getTodayIsoKolkata = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`

export const formatDate = (dateValue) => {
  const date = new Date(`${dateValue}T00:00:00`)
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export const formatTime = (time) => time || '—'

/** Normalize user input to a 3-digit reception code string, or null if invalid (101–999). */
export const parseReceptionMemberCode = (input) => {
  const raw = String(input ?? '').trim()
  if (!raw) return null

  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  let code = digits
  if (code.length > 3) code = code.slice(-3)
  code = code.padStart(3, '0')

  const num = Number(code)
  if (!Number.isInteger(num) || num < 101 || num > 999) return null
  return code
}

export const isValidStoredMemberCode = (code) => parseReceptionMemberCode(code) !== null

export const displayMemberCode = (member) => {
  const fromMember = member?.memberCode || member?.memberId
  return parseReceptionMemberCode(fromMember) || String(fromMember ?? '').replace(/\D/g, '').slice(-3).padStart(3, '0')
}

export const getMembershipStatus = (member) => {
  const expiry = new Date(`${member.expiryDate}T00:00:00`)
  const today = new Date(`${getTodayIsoKolkata()}T00:00:00`)
  const difference = expiry.getTime() - today.getTime()

  if (difference < 0) return 'Expired'
  if (difference <= EXPIRING_WINDOW_DAYS * dayMs) return 'Expiring Soon'
  return 'Active'
}

export const getDaysUntilExpiry = (member) => {
  const expiry = new Date(`${member.expiryDate}T00:00:00`)
  const today = new Date(`${getTodayIsoKolkata()}T00:00:00`)
  return Math.ceil((expiry.getTime() - today.getTime()) / dayMs)
}

export const getMemberTodayAttendance = (member) => {
  const today = getTodayIsoKolkata()
  return (member.attendanceHistory || []).find((entry) => entry.date === today) || null
}

export const isPresentToday = (member) => {
  const entry = getMemberTodayAttendance(member)
  if (!entry) return false
  const status = String(entry.status || '').toLowerCase()
  return status === 'present' || status === 'manual_override' || entry.status === 'Present'
}

export const getTodayAttendance = (members) => {
  const today = getTodayIsoKolkata()

  return members
    .filter((member) => isPresentToday(member))
    .map((member) => {
      const todayEntry = getMemberTodayAttendance(member)
      return {
        memberId: displayMemberCode(member),
        name: member.name,
        photo: member.photo || '',
        time: todayEntry?.time || '—',
        status: todayEntry?.status === 'manual_override' || todayEntry?.rawStatus === 'manual_override'
          ? 'Override'
          : 'Present',
      }
    })
    .sort((a, b) => convertToMinutes(b.time) - convertToMinutes(a.time))
}

export const getExpiringSoonMembers = (members) => {
  return members
    .filter((member) => getMembershipStatus(member) === 'Expiring Soon')
    .map((member) => ({
      ...member,
      memberId: displayMemberCode(member),
      daysLeft: getDaysUntilExpiry(member),
    }))
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
    .slice(0, 6)
}

export const toDateInputValue = (value) => {
  const isoDate = String(value || '').slice(0, 10)
  const date = new Date(`${isoDate}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : ''
}

export const getInitials = (name) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

const convertToMinutes = (timeString) => {
  if (!timeString || timeString === '—') return -1
  const [rawTime, period] = timeString.split(' ')
  const [hours, minutes] = rawTime.split(':').map(Number)
  let total = hours * 60 + minutes
  if (period === 'PM' && hours !== 12) total += 12 * 60
  if (period === 'AM' && hours === 12) total -= 12 * 60
  return total
}

export const computeSummary = (members) => {
  const totalMembers = members.length
  const activeMembers = members.filter((member) => getMembershipStatus(member) === 'Active').length
  const todayAttendanceCount = getTodayAttendance(members).length
  const expiringSoonCount = members.filter((member) => getMembershipStatus(member) === 'Expiring Soon').length

  return {
    totalMembers,
    activeMembers,
    todayAttendanceCount,
    expiringSoonCount,
  }
}

/** Default start/expiry for new member forms (roughly monthly from today). */
export const getDefaultMemberFormDates = () => {
  const start = getTodayIsoKolkata()
  const startDate = new Date(`${start}T00:00:00`)
  startDate.setMonth(startDate.getMonth() + 1)
  return {
    startDate: start,
    expiryDate: startDate.toISOString().slice(0, 10),
  }
}
