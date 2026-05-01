import { ImageResponse } from 'next/og';

export const runtime = 'edge';

function displayFromParam(raw, fallback) {
  let s = typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
  try {
    s = decodeURIComponent(s);
  } catch {
    /* searchParams may already be decoded */
  }
  s = s.replace(/\+/g, ' ').replace(/_/g, ' ').trim() || fallback;
  if (!/\s/.test(s)) {
    s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  }
  return s;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const MAX_NAME = 80;
    const cleanVoucher = displayFromParam(
      searchParams.get('voucherName'),
      'A Colleague'
    ).slice(0, MAX_NAME);
    const cleanVouchee = displayFromParam(
      searchParams.get('voucheeName'),
      'Professional'
    ).slice(0, MAX_NAME);

    const DISPLAY_MAX = 48;
    const voucherText =
      cleanVoucher.length > DISPLAY_MAX
        ? cleanVoucher.slice(0, DISPLAY_MAX - 1) + '...'
        : cleanVoucher;
    const voucheeText =
      cleanVouchee.length > DISPLAY_MAX
        ? cleanVouchee.slice(0, DISPLAY_MAX - 1) + '...'
        : cleanVouchee;

    const longest = Math.max(voucherText.length, voucheeText.length);
    const nameSize = longest > 36 ? 52 : longest > 24 ? 62 : 72;
    const connectorSize = Math.max(40, nameSize - 14);

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f0f4f8',
          }}
        >
          <div
            style={{
              width: '1120px',
              height: '570px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              border: '2px solid #e2e8f0',
              borderRadius: '24px',
              padding: '40px 50px',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '30px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '22px',
                  fontWeight: 700,
                  marginRight: '14px',
                }}
              >
                PHL
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.06em',
                }}
              >
                PROFESSIONAL HEALTH LEDGER
              </div>
            </div>

            {/* Names */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexGrow: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: nameSize,
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '8px',
                  textAlign: 'center',
                }}
              >
                {voucherText}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: connectorSize,
                  fontWeight: 600,
                  color: '#059669',
                  fontStyle: 'italic',
                  marginBottom: '8px',
                }}
              >
                vouched for
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: nameSize,
                  fontWeight: 700,
                  color: '#0f172a',
                  textAlign: 'center',
                }}
              >
                {voucheeText}
              </div>
            </div>

            {/* Tagline */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
                width: '100%',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '20px',
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                Know who you are working with before you commit.
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cross-Origin-Resource-Policy": "cross-origin",
        },
      }
    );
  } catch (e) {
    console.error('OG image generation error:', e);
    return new Response('OG generation failed', { status: 500 });
  }
}
