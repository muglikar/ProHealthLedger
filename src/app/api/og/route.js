import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * GET /api/og
 *
 * Generates a 1200x630 Hero Card image — light theme, large readable text,
 * with PHL logo. ZERO external fetches — resolves in <50ms.
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
            backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 40%, #f1f5f9 100%)',
            padding: '50px 60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top: PHL Logo + Branding */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '50px',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '32px',
              fontWeight: 'bold',
              marginRight: '20px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            }}>
              ✓
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#64748b',
              letterSpacing: '0.1em',
            }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Center: [Voucher] vouched for [Vouchee] */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '1050px',
            textAlign: 'center',
            flex: 1,
            justifyContent: 'center',
          }}>
            <div style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#0f172a',
              lineHeight: 1.15,
              marginBottom: '24px',
            }}>
              {cleanVoucher}
            </div>
            <div style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#059669',
              fontStyle: 'italic',
              marginBottom: '24px',
            }}>
              vouched for
            </div>
            <div style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#0f172a',
              lineHeight: 1.15,
            }}>
              {cleanVouchee}
            </div>
          </div>

          {/* Bottom: Tagline */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderTop: '2px solid #e2e8f0',
            paddingTop: '28px',
            maxWidth: '900px',
            marginTop: '40px',
          }}>
            <div style={{
              fontSize: '26px',
              color: '#475569',
              fontWeight: '500',
              textAlign: 'center',
            }}>
              Know who you're working with before you commit.
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
