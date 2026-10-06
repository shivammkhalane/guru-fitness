import { getInitials } from '../utils/gymLogic'

export default function Avatar({ name, size = 'normal', small = false }) {
  const initials = getInitials(name || 'GF')
  const sizeClass = small ? 'avatar-small' : size === 'large' ? 'avatar-large' : 'avatar-default'

  return <div className={`avatar ${sizeClass}`}>{initials}</div>
}
