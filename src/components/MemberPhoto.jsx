import { useEffect, useState } from 'react'
import { getMemberPhotoUrl } from '../services/memberPhotoService'

export default function MemberPhoto({ path, name, size = 'compact' }) {
  const [photoResolution, setPhotoResolution] = useState({ path: '', url: '', unavailable: false })
  const hasResolution = photoResolution.path === path
  const photoUrl = hasResolution ? photoResolution.url : ''
  const unavailable = !path || (hasResolution && photoResolution.unavailable)

  useEffect(() => {
    let cancelled = false
    if (!path) return () => { cancelled = true }

    getMemberPhotoUrl(path)
      .then((url) => {
        if (!cancelled) setPhotoResolution({ path, url, unavailable: false })
      })
      .catch(() => {
        if (!cancelled) setPhotoResolution({ path, url: '', unavailable: true })
      })

    return () => { cancelled = true }
  }, [path])

  return (
    <div className={`member-photo member-photo-${size}${unavailable ? ' is-missing' : ''}`} title={unavailable ? 'Profile photo missing' : name}>
      {photoUrl && !unavailable ? (
        <img src={photoUrl} alt={`${name || 'Member'} profile`} onError={() => setPhotoResolution({ path, url: '', unavailable: true })} />
      ) : (
        <span>{unavailable ? (size === 'compact' ? 'No photo' : 'Profile photo missing') : 'Loading photo…'}</span>
      )}
    </div>
  )
}