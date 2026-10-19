import { useEffect, useState } from 'react'
import { getMemberPhotoUrl } from '../services/memberPhotoService'

export default function MemberPhoto({ path, name, size = 'compact' }) {
  const [photoResolution, setPhotoResolution] = useState({ path: '', url: '', error: '', status: 'idle' })
  const [retryToken, setRetryToken] = useState(0)
  const hasResolution = photoResolution.path === path && photoResolution.status !== 'idle'
  const photoUrl = hasResolution ? photoResolution.url : ''
  const isMissing = !path
  const isLoading = Boolean(path) && (!hasResolution || photoResolution.status === 'loading')
  const hasError = hasResolution && photoResolution.status === 'error'

  useEffect(() => {
    let cancelled = false
    if (!path) return () => { cancelled = true }

    getMemberPhotoUrl(path)
      .then((url) => {
        if (!cancelled) setPhotoResolution({ path, url, error: '', status: 'ready' })
      }).catch((error) => {
        if (!cancelled) {
          setPhotoResolution({
            path,
            url: '',
            error: error.message || 'Could not create a secure photo URL.',
            status: 'error',
          })
        }
      })

    return () => { cancelled = true }
  }, [path, retryToken])

  return (
    <div
      className={`member-photo member-photo-${size}${isMissing || hasError ? ' is-missing' : ''}`}
      title={hasError ? photoResolution.error : isMissing ? 'Profile photo missing' : name}
    >
      {photoUrl && !hasError ? (
        <img
          src={photoUrl}
          alt={`${name || 'Member'} profile`}
          onError={() => setPhotoResolution({
            path,
            url: '',
            error: 'The saved photo could not be loaded. Check the Storage bucket and object access.',
            status: 'error',
          })}
        />
      ) : isLoading ? (
        <span role="status">Loading photo…</span>
      ) : hasError ? (
        <span className="member-photo-error">
          <span title={photoResolution.error}>Photo unavailable</span>
          <button
            type="button"
            className="member-photo-retry"
            aria-label={`Retry loading ${name || 'member'} photo`}
            onClick={() => {
              setPhotoResolution({ path, url: '', error: '', status: 'loading' })
              setRetryToken((previous) => previous + 1)
            }}
          >
            Retry
          </button>
        </span>
      ) : (
        <span>{size === 'compact' ? 'No photo' : 'Profile photo missing'}</span>
      )}
    </div>
  )
}