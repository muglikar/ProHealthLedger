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

    const MAX_NAME = 120;
    const cleanVoucher = decodeURIComponent(rawVoucher).split('_').join(' ').slice(0, MAX_NAME);
    const cleanVouchee = decodeURIComponent(rawVouchee).split('_').join(' ').slice(0, MAX_NAME);

    const VOUCHER_MAX = 56;
    const VOUCHEE_MAX = 56;
    const voucherText =
      cleanVoucher.length > VOUCHER_MAX
        ? `${cleanVoucher.slice(0, VOUCHER_MAX - 1)}…`
        : cleanVoucher;
    const voucheeText =
      cleanVouchee.length > VOUCHEE_MAX
        ? `${cleanVouchee.slice(0, VOUCHEE_MAX - 1)}…`
        : cleanVouchee;

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
            padding: '48px 56px',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '44px',
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
              fontSize: '34px',
              fontWeight: 'bold',
              color: '#64748b',
              letterSpacing: '0.1em',
            }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '1060px',
            textAlign: 'center',
            flex: 1,
            justifyContent: 'center',
          }}>
            <div style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#0f172a',
              lineHeight: 1.15,
              marginBottom: '18px',
            }}>
              {voucherText}
            </div>
            <div style={{
              fontSize: '56px',
              fontWeight: '700',
              color: '#059669',
              fontStyle: 'italic',
              marginBottom: '18px',
            }}>
              vouched for
            </div>
            <div style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#0f172a',
              lineHeight: 1.15,
            }}>
              {voucheeText}
            </div>
          </div>

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
            fontSize: '24px',
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
