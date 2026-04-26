import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * GET /api/og
 *
 * Generates a 1200x630 Hero Card image — light theme, massive readable text,
 * PHL logo for brand recognition, homepage-matching tagline.
 *
 * Only fetches our own logo.png (same domain, <20ms).
 *
 * Params: ?voucherName=...&voucheeName=...
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const rawVoucher = searchParams.get('voucherName') || 'A Colleague';
    const rawVouchee = searchParams.get('voucheeName') || 'Professional';

    const cleanVoucher = decodeURIComponent(rawVoucher).split('_').join(' ');
    const cleanVouchee = decodeURIComponent(rawVouchee).split('_').join(' ');

    // Fetch our own logo (same domain, fast & reliable)
    let logoBuffer = null;
    try {
      const logoRes = await fetch('https://prohealthledger.org/logo.png', {
        signal: AbortSignal.timeout(3000),
      });
      if (logoRes.ok) {
        logoBuffer = await logoRes.arrayBuffer();
      }
    } catch (e) {
      // Logo fetch failed; will render without it
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 40%, #f1f5f9 100%)',
            padding: '40px 50px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top: PHL Logo + Brand Name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '35px',
          }}>
            {logoBuffer ? (
              <img
                src={logoBuffer}
                width="64"
                height="64"
                style={{ borderRadius: '50%', marginRight: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
              />
            ) : (
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '36px',
                fontWeight: 'bold',
                marginRight: '20px',
              }}>
                ✓
              </div>
            )}
            <div style={{
              fontSize: '38px',
              fontWeight: 'bold',
              color: '#64748b',
              letterSpacing: '0.08em',
            }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Center: [Voucher] vouched for [Vouchee] — MASSIVE text */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '1080px',
            textAlign: 'center',
            flex: 1,
            justifyContent: 'center',
          }}>
            <div style={{
              fontSize: '80px',
              fontWeight: 'bold',
              color: '#0f172a',
              lineHeight: 1.1,
              marginBottom: '16px',
            }}>
              {cleanVoucher}
            </div>
            <div style={{
              fontSize: '80px',
              fontWeight: '700',
              fontStyle: 'italic',
              color: '#059669',
              marginBottom: '16px',
              lineHeight: 1.1,
            }}>
              vouched for
            </div>
            <div style={{
              fontSize: '80px',
              fontWeight: 'bold',
              color: '#0f172a',
              lineHeight: 1.1,
            }}>
              {cleanVouchee}
            </div>
          </div>

          {/* Bottom: Homepage-matching tagline */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            borderTop: '2px solid #e2e8f0',
            paddingTop: '24px',
            marginTop: '30px',
          }}>
            <div style={{
              fontSize: '30px',
              color: '#1a1a1a',
              fontWeight: '600',
              textAlign: 'center',
            }}>
              Know who you&apos;re working with{' '}
              <span style={{ fontWeight: '800', fontStyle: 'italic' }}>
                before you commit.
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error("OG Generation Error:", e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
