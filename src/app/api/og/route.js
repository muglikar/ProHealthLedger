import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * GET /api/og
 * 
 * Generates the professional share card.
 * - Preloads Inter font for guaranteed Bold/Italic rendering.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawVoucher = searchParams.get('voucherName') || 'A Colleague';
    const rawVouchee = searchParams.get('voucheeName') || 'Professional';

    const cleanVoucher = decodeURIComponent(rawVoucher).split('_').join(' ');
    const cleanVouchee = decodeURIComponent(rawVouchee).split('_').join(' ');

    // Fetch Fonts with absolute URLs for Edge stability
    const fontPrimary = await fetch(
      'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf'
    ).then((res) => res.arrayBuffer());

    const fontItalic = await fetch(
      'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5Z-o.ttf'
    ).then((res) => res.arrayBuffer());

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 40%, #f1f5f9 100%)',
            padding: '40px',
            fontFamily: '"Inter", sans-serif',
          }}
        >
          {/* Brand Shell */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            position: 'absolute',
            top: '40px',
            left: '40px',
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '15px',
              backgroundColor: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '15px',
            }}>
              <div style={{ color: 'white', fontSize: '36px', fontWeight: 'bold' }}>✓</div>
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#64748b',
              letterSpacing: '0.05em',
            }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Central Vouch Logic */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            marginTop: '40px',
          }}>
            <div style={{
              fontSize: '84px',
              fontWeight: '900',
              color: '#0f172a',
              marginBottom: '15px',
              textAlign: 'center',
              maxWidth: '1000px',
            }}>
              {cleanVoucher}
            </div>
            
            <div style={{
              fontSize: '84px',
              fontWeight: '700',
              fontStyle: 'italic',
              color: '#059669',
              marginBottom: '15px',
              textAlign: 'center',
            }}>
              vouched for
            </div>

            <div style={{
              fontSize: '84px',
              fontWeight: '900',
              color: '#0f172a',
              textAlign: 'center',
              maxWidth: '1000px',
            }}>
              {cleanVouchee}
            </div>
          </div>

          {/* Footer Branding */}
          <div style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'center',
            paddingTop: '30px',
            borderTop: '2px solid #e2e8f0',
          }}>
            <div style={{
              fontSize: '30px',
              color: '#1e293b',
              fontWeight: '600',
              display: 'flex',
            }}>
              {"Know who you're working with "}
              <span style={{ fontWeight: '900', fontStyle: 'italic', marginLeft: '10px' }}>
                before you commit.
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: fontPrimary,
            weight: 900,
            style: 'normal',
          },
          {
            name: 'Inter',
            data: fontItalic,
            weight: 700,
            style: 'italic',
          },
        ],
      }
    );
  } catch (e) {
    console.error("OG Generation Error:", e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
