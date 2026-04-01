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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #f0fdf4 0%, #e0f2fe 100%)',
          padding: '40px',
        }}
      >
        {/* Logo — large, centered, no circle */}
        <img
          src={logoBase64}
          width="200"
          height="200"
          style={{ marginBottom: 20 }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#0f172a',
            textAlign: 'center',
            lineHeight: 1.15,
            marginBottom: 12,
          }}
        >
          Professional Health Ledger
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: '#334155',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Know who you're working with — before you commit.
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: '#64748b',
            textAlign: 'center',
            maxWidth: '85%',
            lineHeight: 1.5,
          }}
        >
          A free, public, and transparent directory of professional experiences. Look up anyone, read honest reviews, and share your own truth to build accountability.
        </div>
      </div>
    ),
    { ...size }
  )
}
