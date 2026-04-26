import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * GET /api/og
 *
 * Generates a 1200x630 Hero Card image — light theme, massive text,
 * PHL logo, homepage-matching tagline.
 *
 * Only fetches our own logo.png (same domain, <20ms).
 * NO HTML entities, NO nested spans — Satori-safe.
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
    let logoSrc = null;
    try {
      const logoRes = await fetch('https://prohealthledger.org/logo.png', {
        signal: AbortSignal.timeout(3000),
      });
      if (logoRes.ok) {
        const buf = await logoRes.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        logoSrc = `data:image/png;base64,${base64}`;
      }
    } catch (e) {
      // Logo fetch failed; will use fallback
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
            marginBottom: '30px',
          }}>
            {logoSrc ? (
              <img
                src={logoSrc}
                width={60}
                height={60}
                style={{ borderRadius: '50%', marginRight: '18px' }}
              />
            ) : (
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '34px',
                fontWeight: 'bold',
                marginRight: '18px',
              }}>
                P
              </div>
            )}
            <div style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#64748b',
              letterSpacing: '0.06em',
            }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Center: Voucher / vouched for / Vouchee */}
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
              fontSize: '82px',
              fontWeight: 'bold',
              color: '#0f172a',
              lineHeight: 1.1,
              marginBottom: '14px',
            }}>
              {cleanVoucher}
            </div>
            <div style={{
              fontSize: '82px',
              fontWeight: '700',
              fontStyle: 'italic',
              color: '#059669',
              marginBottom: '14px',
              lineHeight: 1.1,
            }}>
              vouched for
            </div>
            <div style={{
              fontSize: '82px',
              fontWeight: 'bold',
              color: '#0f172a',
              lineHeight: 1.1,
            }}>
              {cleanVouchee}
            </div>
          </div>

          {/* Bottom: Tagline matching homepage */}
          <div style={{
            display: 'flex',
            borderTop: '2px solid #e2e8f0',
            paddingTop: '22px',
            marginTop: '25px',
          }}>
            <div style={{
              fontSize: '28px',
              color: '#1a1a1a',
              fontWeight: '500',
            }}>
              {"Know who you're working with "}
            </div>
            <div style={{
              fontSize: '28px',
              color: '#1a1a1a',
              fontWeight: '800',
              fontStyle: 'italic',
              marginLeft: '0px',
            }}>
              before you commit.
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
