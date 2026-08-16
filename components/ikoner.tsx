/**
 * Ikonerna i Riktning 1a.
 *
 * Geometriska, byggda av linjer, cirklar och rektanglar i 20×20, streck 1,6
 * (1,8 för bock och kryss). Aldrig illustrativa — en ikon här förstärker en
 * etikett, den ersätter den aldrig.
 *
 * `currentColor` genomgående, så de ärver färgen från länken eller etiketten
 * de sitter i. Det är också varför lucide-react inte används: dess streck är
 * 2 px och skulle synas som en tyngre linje bredvid de här.
 */

type IkonProps = { storlek?: number; className?: string }

function Svg({
  storlek = 20,
  className,
  strek = 1.6,
  children,
}: IkonProps & { strek?: number; children: React.ReactNode }) {
  return (
    <svg
      width={storlek}
      height={storlek}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={className}
      style={{ flexShrink: 0 }}
      strokeWidth={strek}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function PilHoger(p: IkonProps) {
  return (
    <Svg {...p}>
      <path d="M3 10h12M11 5l5 5-5 5" />
    </Svg>
  )
}

export function PilVanster(p: IkonProps) {
  return (
    <Svg {...p}>
      <path d="M17 10H5M9 5L4 10l5 5" />
    </Svg>
  )
}

export function Info(p: IkonProps) {
  return (
    <Svg {...p}>
      <circle cx="10" cy="10" r="8.5" />
      <path d="M10 9v5M10 6.2v.1" strokeWidth={1.8} />
    </Svg>
  )
}

export function Forstoringsglas(p: IkonProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M14 14l3.5 3.5" />
    </Svg>
  )
}

export function Stapeldiagram(p: IkonProps) {
  return (
    <Svg {...p}>
      <rect x="2.5" y="11" width="4" height="6.5" />
      <rect x="8" y="7" width="4" height="10.5" />
      <rect x="13.5" y="2.5" width="4" height="15" />
    </Svg>
  )
}

export function Bock(p: IkonProps) {
  return (
    <Svg {...p} strek={1.8}>
      <path d="M4 10.5l4 4 8-9" />
    </Svg>
  )
}

export function Kryss(p: IkonProps) {
  return (
    <Svg {...p} strek={1.8}>
      <path d="M5 5l10 10M15 5L5 15" />
    </Svg>
  )
}

export function Kalender(p: IkonProps) {
  return (
    <Svg {...p}>
      <rect x="2.5" y="3.5" width="15" height="13" />
      <path d="M2.5 7.5h15M6.5 3.5v-2M13.5 3.5v-2" />
    </Svg>
  )
}

/** Nedladdning: pil ned mot en linje. Sitter i sidfotens knapp till CSV:n. */
export function Nedladdning(p: IkonProps) {
  return (
    <Svg {...p}>
      <path d="M10 2.5v9M6 8l4 4 4-4M3 16.5h14" />
    </Svg>
  )
}
