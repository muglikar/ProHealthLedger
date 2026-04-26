import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * GET /api/og
 *
 * Generates a 1200x630 Hero Card image.
 * Uses robust CSS-only patterns for maximum reliability in Edge runtimes.
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
            padding: '60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header Branding - CSS Logo for 100% Reliability */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '20px',
              backgroundColor: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '20px',
              boxShadow: '0 4px 10px rgba(5, 150, 105, 0.2)',
            }}>
              <div style={{ 
                color: 'white', 
                fontSize: '40px', 
                fontWeight: '900',
              }}>
                ✓
              </div>
            </div>
            <div style={{
              fontSize: '40px',
              fontWeight: '900',
              color: '#475569',
              letterSpacing: '0.1em',
            }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Core Content - Names + Vouch Statement */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: 1,
            justifyContent: 'center',
            width: '1000px',
          }}>
            <div style={{
              fontSize: '85px',
              fontWeight: '900',
              color: '#0f172a',
              lineHeight: 1.1,
              marginBottom: '20px',
            }}>
              {cleanVoucher}
            </div>
            
            <div style={{
              fontSize: '80px',
              fontWeight: '800',
              fontStyle: 'italic',
              color: '#059669',
              marginBottom: '20px',
              display: 'flex',
            }}>
              vouched for
            </div>

            <div style={{
              fontSize: '85px',
              fontWeight: '900',
              color: '#0f172a',
              lineHeight: 1.1,
            }}>
              {cleanVouchee}
            </div>
          </div>

          {/* Footer Tagline - Cleaned Spacing */}
          <div style={{
            display: 'flex',
            borderTop: '2px solid #f1f5f9',
            paddingTop: '30px',
            marginTop: '30px',
            width: '900px',
            justifyContent: 'center',
          }}>
            <div style={{
              fontSize: '32px',
              color: '#1e293b',
              fontWeight: '600',
              display: 'flex',
            }}>
              {"Know who you're working with "}
              <span style={{ 
                fontWeight: '900', 
                fontStyle: 'italic', 
                marginLeft: '10px',
                color: '#0f172a' 
              }}>
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
