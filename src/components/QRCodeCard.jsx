import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import Avatar from './Avatar'

export default function QRCodeCard({ member, onRegenerateToken }) {
  const canvasRef = useRef(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Use the opaque attendance token or fallback to memberId
  const qrPayload = member?.qrToken || member?.memberId || 'UNKNOWN'

  useEffect(() => {
    if (!qrPayload) return

    QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrDataUrl(url)
      })
      .catch((err) => {
        console.error('QR code generation error:', err)
      })

    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrPayload, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      }).catch((err) => {
        console.error('QR canvas rendering error:', err)
      })
    }
  }, [qrPayload])

  const handleDownload = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.download = `GuruFitness_QR_${member?.memberId || 'card'}.png`
    link.href = qrDataUrl
    link.click()
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=700')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Guru Fitness Member Pass - ${member?.name}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f8fafc;
            }
            .card {
              width: 320px;
              background: #ffffff;
              border: 2px solid #e2e8f0;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            }
            .brand {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.5px;
              margin-bottom: 2px;
            }
            .sub {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #64748b;
              margin-bottom: 16px;
            }
            .qr-wrap {
              background: #ffffff;
              padding: 12px;
              border-radius: 12px;
              border: 1px solid #cbd5e1;
              display: inline-block;
              margin-bottom: 16px;
            }
            .qr-wrap img {
              display: block;
              width: 220px;
              height: 220px;
            }
            .name {
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              margin: 0 0 4px;
            }
            .id-pill {
              display: inline-block;
              background: #f1f5f9;
              color: #475569;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 12px;
            }
            .meta {
              font-size: 12px;
              color: #64748b;
              border-top: 1px dashed #e2e8f0;
              padding-top: 12px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">GURU FITNESS</div>
            <div class="sub">Health Club • Member Pass</div>
            <div class="qr-wrap">
              <img src="${qrDataUrl}" alt="Member QR Code" />
            </div>
            <h1 class="name">${member?.name || 'Gym Member'}</h1>
            <div class="id-pill">${member?.memberId || ''}</div>
            <div class="meta">
              Scan at reception desk for instant check-in
            </div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleRegenerate = async () => {
    if (!onRegenerateToken) return
    setIsRegenerating(true)
    try {
      await onRegenerateToken(member.memberId)
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="qr-box-premium">
      <div className="qr-badge-header">
        <span className="brand-dot" />
        <div>
          <span className="qr-brand-title">Guru Fitness Health Club</span>
          <span className="qr-brand-sub">Official Member Attendance QR</span>
        </div>
      </div>

      <div className="qr-display-center">
        <div className="qr-frame-wrapper" onClick={() => setShowModal(true)} title="Click to enlarge">
          <canvas ref={canvasRef} className="qr-canvas-element" />
          <div className="qr-scan-hint">🔍 Click to zoom</div>
        </div>

        <div className="qr-member-label">
          <div className="qr-member-name-row">
            <Avatar name={member?.name || 'Member'} size="small" />
            <div>
              <strong>{member?.name}</strong>
              <span className="member-code-tag">{member?.memberId}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="qr-actions-toolbar">
        <button
          type="button"
          className="secondary-button compact"
          onClick={() => setShowModal(true)}
        >
          View Full QR
        </button>
        <button
          type="button"
          className="secondary-button compact"
          onClick={handleDownload}
        >
          Download Card
        </button>
        <button
          type="button"
          className="secondary-button compact"
          onClick={handlePrint}
        >
          Print Pass
        </button>
        {onRegenerateToken && (
          <button
            type="button"
            className="ghost-button compact"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            title="Generate a new secure QR token"
          >
            {isRegenerating ? 'Generating...' : 'Regenerate'}
          </button>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Guru Fitness Member Pass</h2>
                <p className="modal-subtitle">Official Attendance QR</p>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-qr-body">
              <div className="modal-qr-frame">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Enlarged Member QR" className="modal-qr-img" />
                ) : (
                  <div className="qr-loading">Generating QR...</div>
                )}
              </div>

              <div className="modal-member-info">
                <h3>{member?.name}</h3>
                <span className="member-code-pill">{member?.memberId}</span>
                <p>Present this QR to the reception scanner for check-in.</p>
              </div>

              <div className="modal-qr-buttons">
                <button type="button" className="primary-button" onClick={handleDownload}>
                  Download PNG
                </button>
                <button type="button" className="secondary-button" onClick={handlePrint}>
                  Print Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
