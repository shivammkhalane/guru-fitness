export const demoMemberIds = ['GF102', 'GF108']

export const supportsCamera = () => {
  if (typeof navigator === 'undefined') return false
  return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

export const scanMemberQR = (memberId) => ({
  memberId,
  source: 'Demo QR scanner',
  mode: 'demo',
  ts: Date.now(),
})

export const requestCameraAccess = async () => {
  if (!supportsCamera()) {
    throw new Error('Camera is unavailable on this device.')
  }

  await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  return true
}
