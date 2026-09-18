import type { SVGProps } from 'react';

const paths = {
  // The day itself, not a dashboard.
  plan: (
    <>
      <circle cx="12" cy="12" r="4.1" />
      <path d="M12 3.2v2.3M12 18.5v2.3M3.2 12h2.3M18.5 12h2.3M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.75" y="5" width="16.5" height="15" rx="2.5" />
      <path d="M3.75 9.5h16.5M8 3v3.5M16 3v3.5" />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" strokeWidth="2" />
    </>
  ),
  manage: (
    <>
      <path d="M10 7.5h10M4 16.5h10" />
      <circle cx="6.5" cy="7.5" r="2.5" />
      <circle cx="17.5" cy="16.5" r="2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.8-1.4-1.8-3.1-2.2.8a7.4 7.4 0 0 0-2.6-1.5L14.2 3h-3.6l-.4 2.3a7.4 7.4 0 0 0-2.6 1.5l-2.2-.8-1.8 3.1 1.8 1.4a7.6 7.6 0 0 0 0 3l-1.8 1.4 1.8 3.1 2.2-.8a7.4 7.4 0 0 0 2.6 1.5l.4 2.3h3.6l.4-2.3a7.4 7.4 0 0 0 2.6-1.5l2.2.8 1.8-3.1z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  more: (
    <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="2.4" />
  ),
  check: <path d="m5.5 12.5 4.2 4 8.8-9" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.8c0-.4.4-.8.8-.8h3.4c.4 0 .8.4.8.8V7" />
      <path d="M6.5 7l.9 12.2c.1.9.8 1.8 1.8 1.8h5.6c1 0 1.7-.9 1.8-1.8L17.5 7M10 11v6M14 11v6" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l1-4.2L15.8 5a1.9 1.9 0 0 1 2.7 0l.5.5a1.9 1.9 0 0 1 0 2.7L8.2 19z" />
      <path d="M13.5 7.3l3.2 3.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  flag: <path d="M5.5 21V4.5M5.5 4.5h11l-2 4 2 4h-11" />,
  // A quiet ring rather than a target: a goal is a direction, not a bullseye.
  heart: <path d="M12 20.25S3.75 15.5 3.75 9.6A4.35 4.35 0 0 1 12 7.4a4.35 4.35 0 0 1 8.25 2.2c0 5.9-8.25 10.65-8.25 10.65z" />,
  goal: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <circle cx="12" cy="12" r="3.25" />
    </>
  ),
  // An open loop: a rhythm returns without closing into a chain.
  rhythm: (
    <>
      <path d="M4.75 12a7.25 7.25 0 0 1 12.4-5.1" />
      <path d="M19.25 12a7.25 7.25 0 0 1-12.4 5.1" />
      <path d="M14.5 3.75l2.9 3-3 2.9" />
      <path d="M9.5 20.25l-2.9-3 3-2.9" />
    </>
  ),
  note: (
    <>
      <path d="M6 3.75h8.5l3.5 3.5V19a1.25 1.25 0 0 1-1.25 1.25H6A1.25 1.25 0 0 1 4.75 19V5A1.25 1.25 0 0 1 6 3.75z" />
      <path d="M14 3.75V7.5h4" />
    </>
  ),
  folder: <path d="M3.75 7A1.75 1.75 0 0 1 5.5 5.25h4l2 2.25h7A1.75 1.75 0 0 1 20.25 9.25v8.25a1.75 1.75 0 0 1-1.75 1.75h-13a1.75 1.75 0 0 1-1.75-1.75z" />,
  sparkle: (
    <path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5zM18.5 15.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3z" />
  ),
  menu: <path d="M4 7.5h16M4 12h16M4 16.5h16" />,
  sidebar: (
    <>
      <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2.5" />
      <path d="M9.5 4.75v14.5" />
    </>
  ),
  chevronUpDown: <path d="m8.5 9.5 3.5-3.5 3.5 3.5M8.5 14.5l3.5 3.5 3.5-3.5" />,
  grip: (
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="2.6" />
  ),
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  signOut: <path d="M14 4.75h3.25a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H14M10 8l-4 4 4 4M6 12h9.5" />,
  unschedule: (
    <>
      <rect x="3.75" y="5" width="16.5" height="15" rx="2.5" />
      <path d="M3.75 9.5h16.5M8 3v3.5M16 3v3.5M9.5 13l5 5M14.5 13l-5 5" />
    </>
  ),
  schedule: (
    <>
      <rect x="3.75" y="5" width="16.5" height="15" rx="2.5" />
      <path d="M3.75 9.5h16.5M8 3v3.5M16 3v3.5M12 12.5v5M9.5 15h5" />
    </>
  ),
  move: <path d="M4.5 12h15M14 6.5l5.5 5.5-5.5 5.5" />,
  palette: (
    <>
      <path d="M12 3.75a8.25 8.25 0 1 0 0 16.5c1 0 1.6-.8 1.6-1.6 0-1.1-.9-1.4-.9-2.4 0-.9.7-1.5 1.6-1.5h2c2.2 0 3.9-1.7 3.9-3.9 0-4-3.7-7.1-8.2-7.1z" />
      <path d="M8 11h.01M10.5 7.5h.01M15 7.8h.01" strokeWidth="2.4" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, strokeWidth = 1.5, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
