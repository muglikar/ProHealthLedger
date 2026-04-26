import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Instant Initials helper for zero-latency rendering
const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Params: ?voucherName=...&voucheeName=...
    const rawVoucherName = searchParams.get('voucherName') || 'A Colleague';
    const rawVoucheeName = searchParams.get('voucheeName') || 'Professional';

    const voucherName = decodeURIComponent(rawVoucherName).split('_').join(' ');
    const voucheeName = decodeURIComponent(rawVoucheeName).split('_').join(' ');

    const voucherInitials = getInitials(voucherName);
    const voucheeInitials = getInitials(voucheeName);

    // ZERO ASYNC CALLS HERE - Route resolves in milliseconds
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
          {/* Header Branding */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '50px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '15px', backgroundColor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '50px', fontWeight: 'bold', marginRight: '30px' }}>
              ✓
            </div>
            <div style={{ fontSize: '50px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '-0.04em' }}>
              PRO-HEALTH LEDGER
            </div>
          </div>

          {/* Initials Row - Guaranteed to fit and render instantly */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '900px', marginBottom: '40px' }}>
            {/* Voucher Pin */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px' }}>
              <div style={{ 
                width: '220px', 
                height: '220px', 
                borderRadius: '110px', 
                backgroundColor: '#0f172a', 
                color: '#ffffff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '90px', 
                fontWeight: 'bold',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                border: '8px solid white'
              }}>
                {voucherInitials}
              </div>
              <div style={{ marginTop: '25px', fontSize: '40px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center', maxWidth: '350px' }}>
                {voucherName}
              </div>
            </div>

            {/* Connection Arrow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px' }}>
                VOUCHED FOR
              </div>
              <div style={{ fontSize: '100px', color: '#cbd5e1', lineHeight: '1' }}>→</div>
            </div>

            {/* Vouchee Pin */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px' }}>
              <div style={{ 
                width: '220px', 
                height: '220px', 
                borderRadius: '110px', 
                backgroundColor: '#1d4ed8', 
                color: '#ffffff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '90px', 
                fontWeight: 'bold',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                border: '8px solid white'
              }}>
                {voucheeInitials}
              </div>
              <div style={{ marginTop: '25px', fontSize: '40px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center', maxWidth: '350px' }}>
                {voucheeName}
              </div>
            </div>
          </div>

          {/* Footer Tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '30px', borderTop: '2px solid #f1f5f9', paddingTop: '40px', width: '800px' }}>
            <div style={{ fontSize: '32px', color: '#0f172a', fontWeight: '600', marginBottom: '10px', textAlign: 'center' }}>
              Know who you're working with before you commit.
            </div>
            <div style={{ fontSize: '28px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
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
    console.error("OG Generation Error:", e);
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
