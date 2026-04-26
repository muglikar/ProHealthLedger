import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Params: ?voucherName=...&voucherPic=...&voucheeName=...&voucheePic=...
    const voucherName = searchParams.get('voucherName') || 'A Colleague';
    const voucherPic = searchParams.get('voucherPic');
    const voucheeName = searchParams.get('voucheeName') || 'Professional';
    const voucheePic = searchParams.get('voucheePic');

    const siteUrl = process.env.NEXTAUTH_URL || 'https://prohealthledger.org';
    const logoUrl = `${siteUrl}/logo.png`;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            backgroundImage: 'radial-gradient(circle at 25% 25%, #f1f5f9 0%, transparent 100%), radial-gradient(circle at 75% 75%, #e2e8f0 0%, transparent 100%)',
            padding: '60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header with Logo */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
            <img
              src={logoUrl}
              width="60"
              height="60"
              style={{ borderRadius: '12px', marginRight: '20px' }}
            />
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '-0.02em' }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Person to Person Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>
            {/* Voucher */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px' }}>
              <div style={{ position: 'relative', display: 'flex' }}>
                {voucherPic ? (
                  <img
                    src={voucherPic}
                    width="140"
                    height="140"
                    style={{ borderRadius: '70px', border: '4px solid white', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  />
                ) : (
                  <div style={{ width: '140', height: '140', borderRadius: '70px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px' }}>
                    👤
                  </div>
                )}
              </div>
              <div style={{ marginTop: '20px', fontSize: '24px', fontWeight: 'bold', color: '#334155', textAlign: 'center' }}>
                {voucherName}
              </div>
            </div>

            {/* Connection Arrow/Text */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 40px' }}>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                Vouched For
              </div>
              <div style={{ fontSize: '40px' }}>→</div>
            </div>

            {/* Vouchee */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px' }}>
              <div style={{ position: 'relative', display: 'flex' }}>
                {voucheePic ? (
                  <img
                    src={voucheePic}
                    width="140"
                    height="140"
                    style={{ borderRadius: '70px', border: '4px solid white', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  />
                ) : (
                  <div style={{ width: '140', height: '140', borderRadius: '70px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px' }}>
                    👤
                  </div>
                )}
              </div>
              <div style={{ marginTop: '20px', fontSize: '24px', fontWeight: 'bold', color: '#334155', textAlign: 'center' }}>
                {voucheeName}
              </div>
            </div>
          </div>

          {/* Footer Tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '30px', width: '90%' }}>
            <div style={{ fontSize: '22px', color: '#1e293b', fontWeight: '500', marginBottom: '8px' }}>
              Know who you're working with before you commit.
            </div>
            <div style={{ fontSize: '20px', color: '#475569', fontStyle: 'italic' }}>
              One question: “Would you work with them again?”
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
    console.error(e);
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
