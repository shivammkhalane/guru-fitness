import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { getCameraAvailabilityError, requestCameraAccess } from '../services/qrScannerService'

const stopMediaStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop())
}

const getCameraErrorMessage = (error) => {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError' || error?.name === 'SecurityError') {
    return 'Camera permission was denied or blocked. Allow camera access for this site in your browser settings, then retry.'
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'No camera was found on this device. Connect or enable a camera, then retry.'
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return 'The camera could not be opened. It may already be in use by another app; close that app and retry.'
  }
  if (error?.name === 'OverconstrainedError') {
    return 'The selected camera is unavailable. Choose another camera or retry.'
  }
  return `Camera startup failed: ${error?.message || 'the browser could not start the video stream'}. Retry or use manual member search.`
}

export default function CameraQRScanner({ onScan, isActive = true }) {
  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)
  const controlsRef = useRef(null)
  const streamRef = useRef(null)
  const onScanRef = useRef(onScan)
  const sessionRef = useRef(0)
  const scanInProgressRef = useRef(false)

  const [cameras, setCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const stopCurrentStream = useCallback(() => {
    const stream = streamRef.current
    streamRef.current = null

    stopMediaStream(stream)

    const video = videoRef.current
    if (video?.srcObject) {
      if (video.srcObject !== stream) {
        stopMediaStream(video.srcObject)
      }
      video.srcObject = null
    }

    setIsLive(false)
  }, [])

  const stopScanner = useCallback(() => {
    sessionRef.current += 1
    scanInProgressRef.current = false

    if (controlsRef.current) {
      try {
        const stopResult = controlsRef.current.stop()
        if (stopResult && typeof stopResult.catch === 'function') {
          stopResult.catch((error) => console.warn('Camera scanner stop warning:', error))
        }
      } catch (error) {
        console.warn('Camera scanner stop warning:', error)
      }
      controlsRef.current = null
    }

    stopCurrentStream()
    setIsScanning(false)
    setIsInitializing(false)
  }, [stopCurrentStream])

  const startScanner = useCallback(async (deviceId) => {
    const video = videoRef.current
    const codeReader = codeReaderRef.current
    if (!video || !codeReader) {
      setCameraError('The camera preview is not ready. Close the scanner and try again.')
      return
    }

    if (controlsRef.current) {
      try {
        const stopResult = controlsRef.current.stop()
        if (stopResult && typeof stopResult.catch === 'function') {
          stopResult.catch((error) => console.warn('Camera scanner stop warning:', error))
        }
      } catch (error) {
        console.warn('Camera scanner stop warning:', error)
      }
      controlsRef.current = null
    }
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (video.srcObject) {
      stopMediaStream(video.srcObject)
      video.srcObject = null
    }

    const currentSession = ++sessionRef.current
    scanInProgressRef.current = false
    setCameraError('')
    setIsInitializing(true)
    setIsScanning(false)

    let stream
    try {
      const availabilityError = getCameraAvailabilityError()
      if (availabilityError) {
        setCameraError(availabilityError)
        return
      }

      try {
        stream = await requestCameraAccess(deviceId)
      } catch (error) {
        if (!deviceId || !['NotFoundError', 'OverconstrainedError'].includes(error?.name)) {
          throw error
        }
        console.warn('Selected camera is unavailable; retrying with the default camera.', error)
        stream = await requestCameraAccess()
      }

      if (currentSession !== sessionRef.current) {
        stopMediaStream(stream)
        return
      }

      streamRef.current = stream
      const controls = await codeReader.decodeFromStream(stream, video, (result, decodeError) => {
        if (decodeError && decodeError.name !== 'NotFoundException') {
          console.warn('QR frame could not be decoded:', decodeError)
        }
        if (!result || scanInProgressRef.current) return

        const text = result.getText()
        const onScanCallback = onScanRef.current
        if (!onScanCallback) return

        scanInProgressRef.current = true
        Promise.resolve(onScanCallback(text))
          .catch((error) => {
            console.error('QR attendance handling failed:', error)
            if (currentSession === sessionRef.current) {
              setCameraError(`QR was read, but attendance could not be processed: ${error?.message || 'unknown error'}. Retry or use manual member search.`)
              setIsScanning(false)
            }
          })
          .finally(() => {
            if (currentSession === sessionRef.current) {
              scanInProgressRef.current = false
            }
          })
      })

      if (currentSession !== sessionRef.current) {
        try {
          const stopResult = controls.stop()
          if (stopResult && typeof stopResult.catch === 'function') {
            stopResult.catch((error) => console.warn('Camera scanner cleanup warning:', error))
          }
        } catch (error) {
          console.warn('Camera scanner cleanup warning:', error)
        }
        stopMediaStream(stream)
        return
      }

      controlsRef.current = controls
      setIsScanning(true)

      try {
        const devices = await BrowserQRCodeReader.listVideoInputDevices()
        if (currentSession === sessionRef.current) {
          setCameras(devices)
          const activeDeviceId = stream.getVideoTracks()[0]?.getSettings()?.deviceId
          setSelectedCameraId(activeDeviceId || devices[0]?.deviceId || '')
        }
      } catch (error) {
        console.warn('Could not enumerate cameras after camera access was granted:', error)
      }
    } catch (error) {
      if (currentSession !== sessionRef.current) {
        stopMediaStream(stream)
        return
      }

      console.error('Camera scanning failed:', error)
      stopMediaStream(stream)
      if (streamRef.current === stream) {
        streamRef.current = null
      }
      if (video.srcObject === stream) {
        video.srcObject = null
      }
      setCameraError(error?.message?.startsWith('Camera access')
        || error?.message?.startsWith('This browser does not')
        ? error.message
        : getCameraErrorMessage(error))
      setIsScanning(false)
      setIsLive(false)
    } finally {
      if (currentSession === sessionRef.current) {
        setIsInitializing(false)
      }
    }
  }, [])

  useEffect(() => {
    codeReaderRef.current = new BrowserQRCodeReader()
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  useEffect(() => {
    if (!isActive) return undefined

    startScanner(selectedCameraId || undefined)
    return () => {
      stopScanner()
    }
  }, [isActive, selectedCameraId, startScanner, stopScanner])

  const handleCameraChange = (event) => {
    setSelectedCameraId(event.target.value)
  }

  const retry = () => {
    setCameraError('')
    startScanner(selectedCameraId || undefined)
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
          aria-label="Live camera preview for member QR scanning"
          onLoadedMetadata={(event) => {
            const { videoWidth, videoHeight } = event.currentTarget
            if (videoWidth > 0 && videoHeight > 0) {
              setIsLive(true)
            } else {
              setCameraError('Camera opened, but the video preview has no usable dimensions. Retry or use manual member search.')
            }
          }}
          onError={() => setCameraError('The camera stream could not be displayed. Retry or use manual member search.')}
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
            <div className="camera-error-card" role="alert" aria-live="assertive">
              <span className="error-icon" aria-hidden="true">📷</span>
              <h3>Camera Access Issue</h3>
              <p>{cameraError}</p>
              <button type="button" className="secondary-button compact" onClick={retry} disabled={isInitializing}>
                {isInitializing ? 'Retrying…' : 'Retry Camera'}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="camera-control-bar">
        {cameras.length > 1 && (
          <div className="camera-select-row">
            <label htmlFor="camera-select">Camera:</label>
            <select id="camera-select" value={selectedCameraId || ''} onChange={handleCameraChange} className="camera-dropdown">
              {cameras.map((camera, idx) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="camera-status-indicator" aria-live="polite">
          <span className={`status-dot ${isLive ? 'active' : 'inactive'}`} />
          <span>{cameraError ? 'Scanner unavailable' : isLive ? 'Scanner Live' : isInitializing ? 'Initializing…' : 'Scanner Standby'}</span>
        </div>
      </div>
    </div>
  )
}
