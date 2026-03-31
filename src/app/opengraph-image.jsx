import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = "Professional Health Ledger — Know Who You're Working With"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const logoData = await fetch(
    new URL('../../public/prohl-logo.png', import.meta.url)
  ).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <div style={{ display: 'flex', marginBottom: '30px' }}>
          {/* Use the ArrayBuffer directly as the src */}
          <img src={logoData} width="160" height="160" />
        </div>
        
        <div style={{
          fontSize: 64,
          fontWeight: 800,
          color: '#0f172a',
          textAlign: 'center',
          lineHeight: 1.1,
          marginBottom: 20
        }}>
          Professional Health Ledger
        </div>
        
        <div style={{
          fontSize: 32,
          fontWeight: 500,
          color: '#475569',
          textAlign: 'center',
          maxWidth: '85%',
          marginBottom: 60
        }}>
          Know who you're working with. A transparent, public directory of honest professional experiences.
        </div>
        
        <div style={{
          display: 'flex',
          background: '#0ea5e9',
          color: 'white',
          padding: '20px 40px',
          borderRadius: 16,
          fontSize: 32,
          fontWeight: 'bold',
          boxShadow: '0 10px 25px rgba(14, 165, 233, 0.4)'
        }}>
          Search the Ledger &rarr;
        </div>
      </div>
    ),
    { ...size }
  )
}
