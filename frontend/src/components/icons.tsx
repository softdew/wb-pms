/**
 * Drawn for this system rather than pulled from an icon set.
 *
 * Everything is a 1.6px stroke on a 24 grid, built from the vocabulary the
 * product already uses: sounding contours, a hull, a running-hour gauge, a
 * ghat. A generic pack would make this look like every other admin tool.
 */

type IconProps = { className?: string };

const base = 'shrink-0';

function Svg({ children, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className ?? 'h-[17px] w-[17px]'}`}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Depth contours: the sounding strip in miniature. */
export const IconSounding = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8c2.2-2 4-.4 6-.4s3.8-1.6 6-1.6 3.6 1.2 6 1.2" />
    <path d="M3 13c2.2-2 4-.4 6-.4s3.8-1.6 6-1.6 3.6 1.2 6 1.2" />
    <path d="M3 18c2.2-2 4-.4 6-.4s3.8-1.6 6-1.6 3.6 1.2 6 1.2" />
  </Svg>
);

/** A hull on the water. */
export const IconVessel = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 13.5h17l-2.2 5.2a1 1 0 0 1-.92.6H6.62a1 1 0 0 1-.92-.6z" />
    <path d="M6.5 13.5V9h11v4.5" />
    <path d="M12 9V5.5" />
  </Svg>
);

/** A running-hour meter. */
export const IconGauge = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 17a8 8 0 1 1 16 0" />
    <path d="M12 17l4.2-4.6" />
    <circle cx="12" cy="17" r="1.1" />
  </Svg>
);

/** Scheduled work. */
export const IconSchedule = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="15" rx="1.6" />
    <path d="M3.5 10h17M8.5 3.5v4M15.5 3.5v4" />
    <path d="M8 14.5h3M8 17.5h8" />
  </Svg>
);

/** A raised job. */
export const IconWorkOrder = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 4.5h11a1.5 1.5 0 0 1 1.5 1.5v13.5a1 1 0 0 1-1.5.87L12 17.4l-5.5 3a1 1 0 0 1-1.5-.87V6a1.5 1.5 0 0 1 1.5-1.5z" />
    <path d="M9 9h6M9 12.2h4" />
  </Svg>
);

/** Overdue. */
export const IconOverdue = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.8 21 20H3z" />
    <path d="M12 10.5v4M12 17.4h.01" />
  </Svg>
);

/** The task library. */
export const IconLibrary = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 5.2A1.7 1.7 0 0 1 6.2 3.5H19v17H6.2a1.7 1.7 0 0 0-1.7 1.7z" />
    <path d="M4.5 18.3h14.5" />
    <path d="M8.5 7.5h6.5M8.5 11h4.5" />
  </Svg>
);

/** A spare on the shelf. */
export const IconPart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2 20.2 7.6v8.8L12 20.8 3.8 16.4V7.6z" />
    <path d="M3.8 7.6 12 12l8.2-4.4M12 12v8.8" />
  </Svg>
);

/** Stock held, in layers. */
export const IconStock = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 21 8l-9 4.5L3 8z" />
    <path d="M3 12.4 12 17l9-4.6M3 16.4 12 21l9-4.6" />
  </Svg>
);

/** An operating company: a ghat shed on the bank. */
export const IconOperator = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V9.6L12 4l8 5.6V20" />
    <path d="M2.5 20h19" />
    <path d="M9.5 20v-5.2h5V20" />
    <path d="M9.5 10.5h5" />
  </Svg>
);

/** The person in charge, with a certificate. */
export const IconIncharge = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8.2" r="3.2" />
    <path d="M3.6 19.5a6 6 0 0 1 11.8 0" />
    <rect x="15.5" y="12.5" width="6" height="7" rx="1" />
    <path d="M17.4 15.4h2.2M17.4 17.4h2.2" />
  </Svg>
);

/** Criticality: a scale being set. */
export const IconScale = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 5.5v13M12 5.5v13M19 5.5v13" />
    <circle cx="5" cy="15" r="1.9" />
    <circle cx="12" cy="9" r="1.9" />
    <circle cx="19" cy="13" r="1.9" />
  </Svg>
);

/** Coded close-out. */
export const IconCode = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11.4 3.9 4 11.3v4.4a3 3 0 0 0 .88 2.12l1.3 1.3A3 3 0 0 0 8.3 20h4.4l7.4-7.4a2 2 0 0 0 0-2.83l-5.87-5.87a2 2 0 0 0-2.83 0z" />
    <path d="M8.6 15.4h.01" />
  </Svg>
);

/** Users and roles. */
export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.1" />
    <path d="M3.2 19.4a5.9 5.9 0 0 1 11.6 0" />
    <path d="M16.2 5.3a3.1 3.1 0 0 1 0 5.7M17.6 19.4a5.9 5.9 0 0 0-1.6-4" />
  </Svg>
);

/** Equipment on the vessel. */
export const IconEquipment = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="8" width="13" height="9" rx="1.5" />
    <path d="M16.5 11h2.2l1.8 2.2V17h-4z" />
    <path d="M6.6 8V5.6h4.4V8" />
    <path d="M6.8 20v-3M13.2 20v-3" />
  </Svg>
);

/** Ready to work: nothing in the way but hands. */
export const IconSpanner = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15.2 4.4a4.6 4.6 0 0 0-5.9 5.9L4 15.6a2 2 0 0 0 0 2.83l1.57 1.57a2 2 0 0 0 2.83 0l5.3-5.3a4.6 4.6 0 0 0 5.9-5.9l-2.9 2.9-2.5-.5-.5-2.5z" />
  </Svg>
);

/** The brand mark: a sounding taken. */
export const Mark = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    className={className ?? 'h-8 w-8'}
    aria-hidden
  >
    <rect x="0.9" y="0.9" width="30.2" height="30.2" rx="7" stroke="rgba(207,226,228,.42)" strokeWidth="1.4" />
    <g stroke="#CFE2E4" strokeWidth="1.5" strokeLinecap="round" fill="none">
      <path d="M6 11.5c2-1.6 3.4-.3 5 -.3s3-1.3 5-1.3 3 1 5 1" opacity=".55" />
      <path d="M6 17c2-1.6 3.4-.3 5-.3s3-1.3 5-1.3 3 1 5 1" opacity=".8" />
    </g>
    <path d="M16 20.5v4.2" stroke="#C2005A" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="25.4" r="1.5" fill="#C2005A" />
  </svg>
);
