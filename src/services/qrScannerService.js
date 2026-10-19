export const demoMemberIds = ['GF102', 'GF108']

export const supportsCamera = () => {
  return getCameraAvailabilityError() === ''
}

export const getCameraAvailabilityError = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'Camera access is unavailable in this environment.'
  }
  if (!window.isSecureContext) {
    return 'Camera access requires a secure context. Open this app over HTTPS or use localhost.'
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'This browser does not provide camera access. Use a supported browser over HTTPS or localhost.'
  }
  return ''
}

export const scanMemberQR = (memberId) => ({
  memberId,
  source: 'Demo QR scanner',
  mode: 'demo',
  ts: Date.now(),
})

export const requestCameraAccess = async (deviceId) => {
  const availabilityError = getCameraAvailabilityError()
  if (availabilityError) {
    throw new Error(availabilityError)
  }

  const video = deviceId
    ? { deviceId: { exact: deviceId } }
    : { facingMode: { ideal: 'environment' } }
  return navigator.mediaDevices.getUserMedia({ video, audio: false })
}
