// Ikon garis kecil untuk tombol & lencana (24×24, stroke currentColor).
export function IkonPanah({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5" />
    </svg>
  );
}

export function IkonCari({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function IkonBuku({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 6.5C10.5 5.4 8.6 5 6 5H3v13h3c2.6 0 4.5.4 6 1.5 1.5-1.1 3.4-1.5 6-1.5h3V5h-3c-2.6 0-4.5.4-6 1.5Z" />
      <path d="M12 6.5V19" />
    </svg>
  );
}

export function IkonHati({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 20s-7.2-4.4-7.2-9.3A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.2 2.7C19.2 15.6 12 20 12 20Z" />
    </svg>
  );
}
