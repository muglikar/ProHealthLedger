import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * GET /api/og
 *
 * Generates a 1200x630 Hero Card image with pure text overlay.
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
            backgroundColor: '#0f172a',
            padding: '60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '60px',
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              backgroundColor: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '36px',
              fontWeight: 'bold',
              marginRight: '24px',
            }}>
              ✓
            </div>
            <div style={{
              fontSize: '42px',
              fontWeight: 'bold',
              color: '#94a3b8',
              letterSpacing: '0.08em',
            }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Main Vouch Statement */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '1000px',
            textAlign: 'center',
            marginBottom: '60px',
          }}>
            <div style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#ffffff',
              lineHeight: 1.2,
              marginBottom: '20px',
            }}>
              {cleanVoucher}
            </div>
            <div style={{
              fontSize: '48px',
              color: '#059669',
              fontWeight: 'bold',
              marginBottom: '20px',
            }}>
              ➔ vouched for ➔
            </div>
            <div style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#ffffff',
              lineHeight: 1.2,
            }}>
              {cleanVouchee}
            </div>
          </div>

          {/* Tagline */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderTop: '2px solid #1e293b',
            paddingTop: '30px',
            maxWidth: '800px',
          }}>
            <div style={{
              fontSize: '28px',
              color: '#cbd5e1',
              fontWeight: '600',
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              Know who you're working with before you commit.
            </div>
            <div style={{
              fontSize: '24px',
              color: '#64748b',
              fontStyle: 'italic',
              textAlign: 'center',
            }}>
              "Would you work with them again?"
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
