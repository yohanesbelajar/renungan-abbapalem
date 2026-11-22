// Ikon garis untuk panel admin (24×24, stroke currentColor). Terpisah dari
// Ikon.tsx supaya ikon situs publik tidak ikut membesar.

type Props = { className?: string };

function dasar(children: React.ReactNode, className = "h-[18px] w-[18px]") {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IkonDasbor({ className }: Props) {
  return dasar(
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>,
    className
  );
}

export function IkonDaftar({ className }: Props) {
  return dasar(
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>,
    className
  );
}

export function IkonTulis({ className }: Props) {
  return dasar(
    <>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M14.5 5.5 18.5 9.5" />
    </>,
    className
  );
}

export function IkonGrafik({ className }: Props) {
  return dasar(
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-4M12.5 16V8M17 16v-6" />
    </>,
    className
  );
}

export function IkonOrang({ className }: Props) {
  return dasar(
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.7-3.3 3.5-5.2 7-5.2s6.3 1.9 7 5.2" />
    </>,
    className
  );
}

export function IkonGrup({ className }: Props) {
  return dasar(
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19c.6-3 3.1-4.7 6.2-4.7s5.6 1.7 6.2 4.7" />
      <path d="M16.2 5.2a3 3 0 0 1 0 5.6M17.5 14.6c2 .5 3.4 1.9 3.8 4.1" />
    </>,
    className
  );
}

export function IkonLuar({ className }: Props) {
  return dasar(
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h4.5" />
    </>,
    className
  );
}

export function IkonKeluar({ className }: Props) {
  return dasar(
    <>
      <path d="M14.5 4.5H19A1.5 1.5 0 0 1 20.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-4.5" />
      <path d="M10 8.5 6.5 12 10 15.5" />
      <path d="M6.5 12H15" />
    </>,
    className
  );
}

export function IkonPlus({ className }: Props) {
  return dasar(<path d="M12 5v14M5 12h14" />, className);
}

export function IkonJam({ className }: Props) {
  return dasar(
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.8V12l3 2" />
    </>,
    className
  );
}

export function IkonCentang({ className }: Props) {
  return dasar(<path d="m5 12.5 4.5 4.5L19 7" />, className);
}
