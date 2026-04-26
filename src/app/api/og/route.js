import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * GET /api/og
 *
 * Generates a 1200x630 Hero Card image — light theme, MEGA text,
 * PHL brand logo, and the official homepage tagline.
 * ZERO external fetches — resolves in <50ms.
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
            backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 40%, #eff6ff 100%)',
            padding: '40px 60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top: PHL Branding Block */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '40px',
              fontWeight: 'bold',
              marginRight: '24px',
              boxShadow: '0 8px 16px rgba(5, 150, 105, 0.25)',
            }}>
              ✓
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '900',
              color: '#1e293b',
              letterSpacing: '0.15em',
            }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Center: MEGA TEXT VOUCH */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '1100px',
            textAlign: 'center',
            flex: 1,
            justifyContent: 'center',
          }}>
            <div style={{
              fontSize: '84px',
              fontWeight: '900',
              color: '#0f172a',
              lineHeight: 1.1,
              marginBottom: '20px',
            }}>
              {cleanVoucher}
            </div>
            <div style={{
              fontSize: '84px',
              fontWeight: '700',
              fontStyle: 'italic',
              color: '#059669',
              marginBottom: '20px',
              display: 'flex',
            }}>
              vouched for
            </div>
            <div style={{
              fontSize: '84px',
              fontWeight: '900',
              color: '#0f172a',
              lineHeight: 1.1,
            }}>
              {cleanVouchee}
            </div>
          </div>

          {/* Bottom: Official Homepage Tagline */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderTop: '3px solid #f1f5f9',
            paddingTop: '32px',
            width: '950px',
            marginTop: '30px',
          }}>
            <div style={{
              fontSize: '34px',
              color: '#1e293b',
              fontWeight: '800',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}>
              Know who you’re working with before you commit.
            </div>
            <div style={{
              fontSize: '24px',
              color: '#64748b',
              fontWeight: '600',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Verified Professional History
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
