interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={`brand-logo ${className}`.trim()}
      fill="none"
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="44" height="44" rx="12" fill="#155EEF" />
      <path
        d="M13 13.5h15.5a4.5 4.5 0 0 1 4.5 4.5v6a4.5 4.5 0 0 1-4.5 4.5H21l-7 4v-4h-1a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4Z"
        stroke="white"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path d="m17 21 3.2 3.2L27.5 17" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
  );
}
