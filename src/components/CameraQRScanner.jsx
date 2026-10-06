import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'

export default function CameraQRScanner({ onScan, isActive = true }) {
  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)
  const controlsRef = useRef(null)
  const [cameras, setCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [lastScannedTime, setLastScannedTime] = useState(0)

  useEffect(() => {
    const codeReader = new BrowserQRCodeReader()
    codeReaderRef.current = codeReader

    // List video devices
    BrowserQRCodeReader.listVideoInputDevices()
      .then((devices) => {
        setCameras(devices)
        if (devices.length > 0) {
          // Prefer back/environment camera on mobile
          const backCamera = devices.find(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment')
          )
          setSelectedCameraId(backCamera ? backCamera.deviceId : devices[0].deviceId)
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate cameras:', err)
      })

    return () => {
      stopScanner()
    }
  }, [])

  useEffect(() => {
    if (isActive && selectedCameraId) {
      startScanner(selectedCameraId)
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isActive, selectedCameraId])

  const startScanner = async (deviceId) => {
    stopScanner()
    setCameraError('')

    if (!videoRef.current || !codeReaderRef.current) return

    try {
      setIsScanning(true)
      const controls = await codeReaderRef.current.decodeFromVideoDevice(
        deviceId || undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText()
            const now = Date.now()
            // Throttle duplicate reads within 1.5s
            if (now - lastScannedTime > 1500) {
              setLastScannedTime(now)
              onScan(text)
            }
          }
        }
      )
      controlsRef.current = controls
    } catch (err) {
      console.error('Camera scanning failed:', err)
      setIsScanning(false)
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings or use manual member search.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Please use manual member search.')
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to start camera stream'}. Use manual member search below.`)
      }
    }
  }

  const stopScanner = () => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop()
      } catch {
        // ignore
      }
      controlsRef.current = null
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject
      const tracks = stream.getTracks ? stream.getTracks() : []
      tracks.forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
  }

  const handleCameraChange = (event) => {
    const newId = event.target.value
    setSelectedCameraId(newId)
  }

  return (
    <div className="camera-scanner-container">
      <div className="camera-viewfinder-frame">
        <video
          ref={videoRef}
          className="camera-video-element"
          muted
          playsInline
          autoPlay
        />

        {isScanning && !cameraError && (
          <div className="viewfinder-overlay">
            <div className="target-corners">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
            </div>
            <div className="laser-scanner-line" />
            <div className="viewfinder-badge">Align Member QR</div>
          </div>
        )}

        {cameraError && (
          <div className="camera-error-backdrop">
            <div className="camera-error-card">
              <span className="error-icon">📷</span>
              <h3>Camera Access Issue</h3>
              <p>{cameraError}</p>
              <button
                type="button"
                className="secondary-button compact"
                onClick={() => startScanner(selectedCameraId)}
              >
                Retry Camera
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="camera-control-bar">
        {cameras.length > 1 && (
          <div className="camera-select-row">
            <label htmlFor="camera-select">Camera:</label>
            <select
              id="camera-select"
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="camera-dropdown"
            >
              {cameras.map((c, idx) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="camera-status-indicator">
          <span className={`status-dot ${isScanning ? 'active' : 'inactive'}`} />
          <span>{isScanning ? 'Scanner Live' : 'Scanner Standby'}</span>
        </div>
      </div>
    </div>
  )
}
