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

    const VOUCHER_MAX = 64;
    const VOUCHEE_MAX = 64;
    const voucherText =
      cleanVoucher.length > VOUCHER_MAX
        ? `${cleanVoucher.slice(0, VOUCHER_MAX - 1)}…`
        : cleanVoucher;
    const voucheeText =
      cleanVouchee.length > VOUCHEE_MAX
        ? `${cleanVouchee.slice(0, VOUCHEE_MAX - 1)}…`
        : cleanVouchee;

    const longest = Math.max(voucherText.length, voucheeText.length);
    const nameSize = longest > 42 ? 54 : longest > 30 ? 62 : 70;
    const connectorSize = Math.max(42, nameSize - 12);

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            padding: '34px 40px',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              width: '1120px',
              height: '562px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              border: '2px solid #e2e8f0',
              borderRadius: '24px',
              padding: '26px 36px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                alignSelf: 'stretch',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  marginRight: '12px',
                }}
              >
                ✓
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#94a3b8',
                  letterSpacing: '0.08em',
                }}
              >
                PRO-HEALTH LEDGER
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                maxWidth: '1000px',
                textAlign: 'center',
                lineHeight: 1.08,
              }}
            >
              <div
                style={{
                  fontSize: `${nameSize}px`,
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '10px',
                }}
              >
                {voucherText}
              </div>
              <div
                style={{
                  fontSize: `${connectorSize}px`,
                  fontWeight: '600',
                  color: '#059669',
                  fontStyle: 'italic',
                  marginBottom: '10px',
                }}
              >
                vouched for
              </div>
              <div
                style={{
                  fontSize: `${nameSize}px`,
                  fontWeight: '700',
                  color: '#0f172a',
                }}
              >
                {voucheeText}
              </div>
            </div>

            <div
              style={{
                alignSelf: 'stretch',
                textAlign: 'center',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '18px',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  color: '#64748b',
                  fontWeight: '500',
                }}
              >
                Know who you're working with before you commit.
              </div>
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
