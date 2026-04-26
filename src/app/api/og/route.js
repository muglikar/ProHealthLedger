import { ImageResponse } from 'next/og';

export const runtime = 'edge';

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch (e) {
    console.error("Failed to fetch image buffer:", url, e);
    return null;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Params: ?voucherName=...&voucherPic=...&voucheeName=...&voucheePic=...
    const rawVoucherName = searchParams.get('voucherName') || 'A_Colleague';
    const voucherPicUrl = searchParams.get('voucherPic');
    const rawVoucheeName = searchParams.get('voucheeName') || 'Professional';
    const voucheePicUrl = searchParams.get('voucheePic');

    const voucherName = decodeURIComponent(rawVoucherName).replace(/_/g, ' ');
    const voucheeName = decodeURIComponent(rawVoucheeName).replace(/_/g, ' ');

    const siteUrl = process.env.NEXTAUTH_URL || 'https://prohealthledger.org';
    const logoUrl = `${siteUrl}/logo.png`;

    // Pre-fetch images to ArrayBuffers for Edge rendering
    const [voucherBuffer, voucheeBuffer, logoBuffer] = await Promise.all([
      fetchImageBuffer(voucherPicUrl),
      fetchImageBuffer(voucheePicUrl),
      fetchImageBuffer(logoUrl),
    ]);

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
            backgroundColor: '#ffffff',
            backgroundImage: 'radial-gradient(circle at 10% 10%, #f8fafc 0%, transparent 100%), radial-gradient(circle at 90% 90%, #f1f5f9 0%, transparent 100%)',
            padding: '80px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header with Logo - Scaled Up */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '80px' }}>
            {logoBuffer && (
              <img
                src={logoBuffer}
                width="140"
                height="140"
                style={{ borderRadius: '25px', marginRight: '40px' }}
              />
            )}
            <div style={{ fontSize: '70px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '-0.04em' }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Person to Person Section - Scaled Up */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>
            {/* Voucher */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '450px' }}>
              <div style={{ position: 'relative', display: 'flex' }}>
                {voucherBuffer ? (
                  <img
                    src={voucherBuffer}
                    width="350"
                    height="350"
                    style={{ borderRadius: '175px', border: '12px solid white', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}
                  />
                ) : (
                  <div style={{ width: '350px', height: '350px', borderRadius: '175px', backgroundColor: '#f1f5f9', border: '12px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '150px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}>
                    👤
                  </div>
                )}
              </div>
              <div style={{ marginTop: '40px', fontSize: '56px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center', lineHeight: '1.1' }}>
                {voucherName}
              </div>
            </div>

            {/* Connection Arrow - Scaled Up */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 60px' }}>
              <div style={{ fontSize: '40px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '20px' }}>
                VOUCHED FOR
              </div>
              <div style={{ fontSize: '120px', color: '#cbd5e1' }}>→</div>
            </div>

            {/* Vouchee */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '450px' }}>
              <div style={{ position: 'relative', display: 'flex' }}>
                {voucheeBuffer ? (
                  <img
                    src={voucheeBuffer}
                    width="350"
                    height="350"
                    style={{ borderRadius: '175px', border: '12px solid white', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}
                  />
                ) : (
                  <div style={{ width: '350px', height: '350px', borderRadius: '175px', backgroundColor: '#f1f5f9', border: '12px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '150px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}>
                    👤
                  </div>
                )}
              </div>
              <div style={{ marginTop: '40px', fontSize: '56px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center', lineHeight: '1.1' }}>
                {voucheeName}
              </div>
            </div>
          </div>

          {/* Footer Tagline - Scaled Up */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px', borderTop: '4px solid #f1f5f9', paddingTop: '60px', width: '85%' }}>
            <div style={{ fontSize: '42px', color: '#0f172a', fontWeight: '600', marginBottom: '20px' }}>
              Know who you're working with before you commit.
            </div>
            <div style={{ fontSize: '38px', color: '#64748b', fontStyle: 'italic' }}>
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
