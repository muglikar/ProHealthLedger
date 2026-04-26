import { formatProfessionalDisplayName } from "@/lib/profiles";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  try {
    const cleanVoucher = decodeURIComponent(resolvedParams?.voucher || '').split('_').join(' ');
    const cleanVouchee = decodeURIComponent(resolvedParams?.vouchee || '').split('_').join(' ');
    
    const voucherSlug = cleanVoucher.split(' ').join('_');
    const voucheeSlug = cleanVouchee.split(' ').join('_');

    // Restore dynamic OG route for personalized large previews
    const ogUrl = `https://prohealthledger.org/api/og?voucherName=${encodeURIComponent(voucherSlug)}&voucheeName=${encodeURIComponent(voucheeSlug)}`;
    const title = `${cleanVoucher} vouched for ${cleanVouchee} on Professional Health Ledger`;
    
    return {
      title,
      description: "Know who you're working with before you commit. View this verified professional vouch on Pro-Health Ledger.",
      openGraph: {
        title,
        description: "Know who you're working with before you commit. View this verified professional vouch on Pro-Health Ledger.",
        type: 'website',
        url: `https://prohealthledger.org/p/${resolvedParams.voucher}/${resolvedParams.vouchee}/${resolvedParams.slug}`,
        images: [{ url: ogUrl, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: "Know who you're working with before you commit.",
        images: [ogUrl],
      }
    };
  } catch (error) {
    return { title: "Professional Health Ledger" };
  }
}

export default function VouchPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px', textAlign: 'center' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>Verified Professional Vouch</h1>
        <p style={{ color: '#64748b', fontSize: '1.2rem' }}>Redirecting to Pro-Health Ledger profiles...</p>
      </div>
    </div>
  );
}
