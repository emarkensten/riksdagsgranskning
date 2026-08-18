import Link from 'next/link'
import { PARTIFARG } from '@/lib/parti'
import { Info, PilHoger, PilVanster } from '@/components/ikoner'

/**
 * De sju byggstenar som återkommer på varje sida i Riktning 1a.
 *
 * De ligger här och inte i sidorna därför att designen är specificerad i
 * exakta mått: en pill är 7×14 px i navigeringen och 15×26 px som knapp, och
 * de måtten ska stå på ett ställe. Allt som färgsätts läser rollvariablerna,
 * så komponenterna byter palett av sig själva inne i ett `.panel`.
 */

/** Monoetikett. Den enda plats i systemet där mono förekommer. */
export function Etikett({
  children,
  className = '',
  ton = 'dampad',
}: {
  children: React.ReactNode
  className?: string
  ton?: 'dampad' | 'signal'
}) {
  return (
    <div
      className={`etikett ${className}`}
      style={ton === 'signal' ? { color: 'var(--accent)' } : undefined}
    >
      {children}
    </div>
  )
}

/**
 * Nyckeltalet — periodens tal, satt så stort att det bär avsnittet.
 *
 * Över 24 px räcker 3:1, och därför får den ljusare signalen användas här.
 * Under 24 px gäller alltid --accent.
 */
export function Nyckeltal({
  children,
  klass = 'text-[clamp(3.4rem,10vw,92px)]',
  ton = 'black',
}: {
  children: React.ReactNode
  klass?: string
  ton?: 'black' | 'signal'
}) {
  return (
    <div
      className={`siffra ${klass}`}
      style={{ color: ton === 'signal' ? 'var(--accent-display)' : 'var(--black)' }}
    >
      {children}
    </div>
  )
}

/**
 * Textlänk med pil. Signalfärgad, 14,5 px, halvfet.
 *
 * `extern` öppnar i ny flik med `rel="noreferrer"`. Prop och inte en egen
 * komponent därför att pilen, färgen och hovringen ska vara desamma — en
 * handskriven `<a>` bredvid den här driver isär vid första ändringen.
 */
export function Textlank({
  href,
  children,
  className = '',
  extern = false,
}: {
  href: string
  children: React.ReactNode
  className?: string
  extern?: boolean
}) {
  return (
    <Link
      href={href}
      {...(extern ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={`inline-flex items-center gap-2 text-[14.5px] font-semibold transition-opacity duration-150 hover:opacity-70 ${className}`}
      style={{ color: 'var(--accent)' }}
    >
      {children}
      <PilHoger storlek={16} />
    </Link>
  )
}

/** Tillbakalänk med vänsterpil. Dämpad — den ska inte konkurrera med rubriken. */
export function Tillbaka({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-[13.5px] font-semibold transition-opacity duration-150 hover:opacity-70"
      style={{ color: 'var(--black-svag)' }}
    >
      <PilVanster storlek={15} />
      {children}
    </Link>
  )
}

/**
 * Pillerknapp. Primär = fylld signal, sekundär = hårlinjekant.
 *
 * Tar antingen `href` eller `onClick`. Quizet på `/rosta` är sajtens första
 * yta med knappar som inte går någonstans — "Börja", "Börja om" — och de ska
 * ha exakt pillrets 15×26 px och inte en egen uppsättning mått. Alternativet
 * var en andra komponent i klientfilen med samma siffror inskrivna igen, och
 * måtten står på ett ställe just för att det inte ska hända.
 */
export function Knapp({
  href,
  onClick,
  children,
  ton = 'primar',
}: {
  href?: string
  onClick?: () => void
  children: React.ReactNode
  ton?: 'primar' | 'sekundar'
}) {
  const primar = ton === 'primar'
  const klass =
    'inline-block rounded-full px-[26px] py-[15px] text-[15px] font-semibold transition-[filter,background] duration-150 hover:brightness-[0.94]'
  const stil = primar
    ? { background: 'var(--accent)', color: '#ffffff' }
    : { border: '1px solid var(--linje-stark)', color: 'var(--black)' }

  if (href === undefined) {
    return (
      <button type="button" onClick={onClick} className={klass} style={stil}>
        {children}
      </button>
    )
  }
  return (
    <Link href={href} className={klass} style={stil}>
      {children}
    </Link>
  )
}

/** Filterchip. Aktiv = fylld bläck, i övrigt kant. */
export function Chip({
  href,
  children,
  aktiv,
}: {
  href: string
  children: React.ReactNode
  aktiv: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={aktiv ? 'true' : undefined}
      // shrink-0 och nowrap: chipsen ligger i en vågrät scrollremsa på små
      // skärmar, och utan dem pressas de ihop till oläsliga stumpar i stället
      // för att skjutas utanför kanten.
      className="shrink-0 whitespace-nowrap rounded-full px-[14px] py-2 text-[13.5px] font-medium transition-colors duration-150"
      style={
        aktiv
          ? { background: 'var(--black)', color: 'var(--papper)', border: '1px solid var(--black)' }
          : { border: '1px solid var(--linje-stark)', color: 'var(--black-mjuk)' }
      }
    >
      {children}
    </Link>
  )
}

/**
 * Förbehållet. Står alltid intill sin siffra, aldrig i en fotnot.
 *
 * Formuleringen ska stärka trovärdigheten, inte be om ursäkt: "aritmetik,
 * inte en anklagelse". Se docs/DESIGN_GUIDELINES.md.
 */
export function Forbehall({
  rubrik,
  children,
  className = '',
  litet = false,
}: {
  rubrik?: string
  children: React.ReactNode
  className?: string
  litet?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-4 ${litet ? 'px-5 py-4' : 'px-6 py-5'} ${className}`}
      style={{ background: 'var(--papper-djup)', borderLeft: '3px solid var(--accent)' }}
    >
      <span className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }}>
        <Info storlek={litet ? 18 : 20} />
      </span>
      <p
        className={`max-w-[76ch] ${litet ? 'text-[13.5px]' : 'text-[15px]'} leading-relaxed`}
        style={{ color: 'var(--black-mjuk)' }}
      >
        {rubrik && <strong style={{ color: 'var(--black)' }}>{rubrik}</strong>}{' '}
        {children}
      </p>
    </div>
  )
}

/**
 * Partifärgen som en fyrkant framför namnet.
 *
 * Färgen är data — den kodar vilket parti raden gäller. Den får aldrig
 * användas som yta eller rubrikfärg.
 */
export function Partiprick({ parti, storlek = 12 }: { parti: string; storlek?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-[3px]"
      style={{
        width: storlek,
        height: storlek,
        background: PARTIFARG[parti] ?? 'var(--linje-stark)',
      }}
    />
  )
}
