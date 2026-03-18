export function WeddaLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Wedda"
      className={className}
    >
      {/* Interlocking rings symbol */}
      <circle cx="14" cy="18" r="10" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.7" />
      <circle cx="24" cy="18" r="10" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.7" />
      {/* Small diamond accent */}
      <rect x="17" y="8" width="4" height="4" transform="rotate(45 19 10)" fill="hsl(var(--primary))" opacity="0.9" />
      {/* Wordmark */}
      <text
        x="42"
        y="25"
        fontFamily="'Roboto', sans-serif"
        fontSize="24"
        fontWeight="600"
        letterSpacing="3"
        fill="currentColor"
      >
        WEDDA
      </text>
    </svg>
  );
}
