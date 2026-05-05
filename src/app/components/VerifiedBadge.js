export default function VerifiedBadge({ size = 16, className = "" }) {
  return (
    <span className={`verified-badge-wrap ${className}`} title="LinkedIn Verified Profile">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="verified-badge-svg"
      >
        <path
          d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          className="badge-shadow"
        />
        <path
          d="M22.5 12.5C22.5 18.0228 18.0228 22.5 12.5 22.5C6.97715 22.5 2.5 18.0228 2.5 12.5C2.5 6.97715 6.97715 2.5 12.5 2.5C18.0228 2.5 22.5 6.97715 22.5 12.5Z"
          fill="url(#blueGradient)"
        />
        <path
          d="M12 1L14.47 3.53L18 3.08L18.92 6.53L22.21 7.84L21.29 11.29L23 14.5L20 17.5L20.47 21L17 21.47L14.47 24L12 22.5L9.53 24L7 21.47L3.53 21L4 17.5L1 14.5L2.71 11.29L1.79 7.84L5.08 6.53L6 3.08L9.53 3.53L12 1Z"
          fill="url(#blueGradient)"
        />
        <path
          d="M8.5 12.5L11 15L16 10"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="blueGradient" x1="2.5" y1="2.5" x2="22.5" y2="22.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00A0DC" />
            <stop offset="1" stopColor="#0077B5" />
          </linearGradient>
        </defs>
      </svg>
      <style jsx>{`
        .verified-badge-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 1px 2px rgba(0, 119, 181, 0.2));
        }
        .verified-badge-svg {
          vertical-align: middle;
        }
      `}</style>
    </span>
  );
}
