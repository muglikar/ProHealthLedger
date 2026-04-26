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
    const rawVoucherName = searchParams.get('voucherName') || 'A Colleague';
    const voucherPicUrl = searchParams.get('voucherPic');
    const rawVoucheeName = searchParams.get('voucheeName') || 'Professional';
    const voucheePicUrl = searchParams.get('voucheePic');

    const voucherName = decodeURIComponent(rawVoucherName).split('_').join(' ');
    const voucheeName = decodeURIComponent(rawVoucheeName).split('_').join(' ');

    const siteUrl = 'https://prohealthledger.org';
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
            height: '630px',
            width: '1200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            backgroundImage: 'radial-gradient(circle at 10% 10%, #f8fafc 0%, transparent 100%), radial-gradient(circle at 90% 90%, #f1f5f9 0%, transparent 100%)',
            padding: '60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header with Logo */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '50px' }}>
            {logoBuffer && (
              <img
                src={logoBuffer}
                width="100"
                height="100"
                style={{ borderRadius: '20px', marginRight: '30px' }}
              />
            )}
            <div style={{ fontSize: '50px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '-0.04em' }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Avatar Row - Constrained Width to prevent clipping */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '900px', marginBottom: '40px' }}>
            {/* Voucher */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px' }}>
              {voucherBuffer ? (
                <img
                  src={voucherBuffer}
                  width="220"
                  height="220"
                  style={{ borderRadius: '110px', border: '8px solid white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                />
              ) : (
                <div style={{ width: '220px', height: '220px', borderRadius: '110px', backgroundColor: '#f1f5f9', border: '8px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                  👤
                </div>
              )}
              <div style={{ marginTop: '25px', fontSize: '40px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center', maxWidth: '350px' }}>
                {voucherName}
              </div>
            </div>

            {/* Connection Arrow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px' }}>
                VOUCHED FOR
              </div>
              <div style={{ fontSize: '80px', color: '#cbd5e1' }}>→</div>
            </div>

            {/* Vouchee */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px' }}>
              {voucheeBuffer ? (
                <img
                  src={voucheeBuffer}
                  width="220"
                  height="220"
                  style={{ borderRadius: '110px', border: '8px solid white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                />
              ) : (
                <div style={{ width: '220px', height: '220px', borderRadius: '110px', backgroundColor: '#f1f5f9', border: '8px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                  👤
                </div>
              )}
              <div style={{ marginTop: '25px', fontSize: '40px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center', maxWidth: '350px' }}>
                {voucheeName}
              </div>
            </div>
          </div>

          {/* Footer Tagline - Constrained and Centered */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '30px', borderTop: '2px solid #f1f5f9', paddingTop: '40px', width: '800px' }}>
            <div style={{ fontSize: '30px', color: '#0f172a', fontWeight: '600', marginBottom: '10px', textAlign: 'center' }}>
              Know who you're working with before you commit.
            </div>
            <div style={{ fontSize: '26px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
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
