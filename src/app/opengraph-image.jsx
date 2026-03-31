import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = "Professional Health Ledger — Know Who You're Working With"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), 'public', 'favicon.png'))
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          background: 'linear-gradient(135deg, #0f4c3a 0%, #1a6b50 40%, #0d3d2e 100%)',
          padding: 0,
        }}
      >
        {/* Left side: Logo on a bright contrasting circle */}
        <div
          style={{
            width: '45%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <img src={logoBase64} width="240" height="240" />
          </div>
        </div>

        {/* Right side: Text content */}
        <div
          style={{
            width: '55%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingRight: 60,
            paddingLeft: 20,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              marginBottom: 20,
            }}
          >
            Professional Health Ledger
          </div>

          <div
            style={{
              fontSize: 26,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.5,
              marginBottom: 36,
            }}
          >
            Know who you're working with. A transparent, public directory of honest professional experiences.
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                background: '#0ea5e9',
                color: 'white',
                padding: '16px 36px',
                borderRadius: 12,
                fontSize: 26,
                fontWeight: 'bold',
              }}
            >
              Search the Ledger →
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 24,
              fontSize: 18,
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 500,
            }}
          >
            Open Source · Zero Cost · Fully Transparent
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
