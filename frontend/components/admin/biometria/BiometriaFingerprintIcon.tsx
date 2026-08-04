export default function BiometriaFingerprintIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none">
      <circle
        cx="60"
        cy="60"
        r="56"
        fill="#EEF7FF"
        stroke="#C9E1FF"
        strokeWidth="2"
      />
      <path
        d="M35 63C35 47.5 45.8 36 60 36C74.2 36 85 47.5 85 63"
        stroke="#2563EB"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M45 78C41.5 72.5 40 67.5 40 62"
        stroke="#2563EB"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M75 82C78.5 74.8 80 68.4 80 62"
        stroke="#2563EB"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M50 61C50 51 54 45 60 45C66 45 70 51 70 61C70 74 65.8 84.4 60 94"
        stroke="#2563EB"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M60 27C80 27 96 43 96 63"
        stroke="#2563EB"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M24 63C24 43 40 27 60 27"
        stroke="#2563EB"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}
