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

/**
 * Tillbakalänk med vänsterpil. Dämpad — den ska inte konkurrera med rubriken.
 *
 * Tar `href` eller `onClick`, som `Knapp`: quizets "Föregående fråga" går inte
 * till en adress utan ett steg bakåt i en klientstat, och den ska ändå ha
 * exakt de här måtten. Markup:en stod handskriven i klientfilen innan.
 */
export function Tillbaka({
  children,
  ...mal
}: { children: React.ReactNode } & (
  | { href: string; onClick?: never }
  | { onClick: () => void; href?: never }
)) {
  const klass =
    'inline-flex items-center gap-2 text-[13.5px] font-semibold transition-opacity duration-150 hover:opacity-70'
  const stil = { color: 'var(--black-svag)' }
  const innehall = (
    <>
      <PilVanster storlek={15} />
      {children}
    </>
  )
  if (mal.href === undefined) {
    return (
      <button type="button" onClick={mal.onClick} className={klass} style={stil}>
        {innehall}
      </button>
    )
  }
  return (
    <Link href={mal.href} className={klass} style={stil}>
      {innehall}
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
  children,
  ton = 'primar',
  ...mal
}: { children: React.ReactNode; ton?: 'primar' | 'sekundar' } & (
  | { href: string; onClick?: never }
  | { onClick: () => void; href?: never }
)) {
  const primar = ton === 'primar'
  const klass =
    'inline-block rounded-full px-[26px] py-[15px] text-[15px] font-semibold transition-[filter,background] duration-150 hover:brightness-[0.94]'
  const stil = primar
    ? { background: 'var(--accent)', color: '#ffffff' }
    : { border: '1px solid var(--linje-stark)', color: 'var(--black)' }

  if (mal.href === undefined) {
    return (
      <button type="button" onClick={mal.onClick} className={klass} style={stil}>
        {children}
      </button>
    )
  }
  return (
    <Link href={mal.href} className={klass} style={stil}>
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
      className="traffyta shrink-0 whitespace-nowrap rounded-full px-[14px] py-2 text-[13.5px] font-medium transition-colors duration-150"
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

/**
 * Förbehållet som en utfällbar rad — den dämpade formen av `Forbehall`.
 *
 * Fyra stycken före en knapp läses som en ansvarsfriskrivning; fyra rader med
 * samma ord bakom "Läs varför" läses som ett verktyg som har ordning på sig.
 * Inget ord försvinner, bara doseringen ändras. Regeln bakom bytet: **högst en
 * stor `Forbehall` per skärm** — rutan är stark just för att den är sällsynt,
 * och två i samma flöde gör att läsaren slutar läsa båda.
 *
 * `<details>` och inte en `useState`-panel. Elementet är fokuserbart, säger
 * själv om det är öppet eller stängt, och fungerar innan React laddat — vilket
 * spelar roll här, eftersom raderna serverrenderas ur `app/rosta/page.tsx` och
 * bär sidans hela ram.
 */
export function Forbehallsrad({
  etikett,
  kort,
  children,
}: {
  /** Monoetiketten i vänsterkolumnen — radens namn, inte en rubrik. */
  etikett: string
  /** De tre raderna som alltid syns. */
  kort: React.ReactNode
  /** Hela stycket, bakom "Läs varför". */
  children: React.ReactNode
}) {
  return (
    <details className="utfall" style={{ borderBottom: '1px solid var(--linje)' }}>
      <summary className="py-[18px]">
        {/* Rutnätet ligger på en div INUTI <summary>, aldrig på elementet
            självt. Ett `display` som inte är `list-item` tar bort triangeln i
            Chrome och slår ut hela utfällningen i Safari — och tillgänglighets-
            trädet tappar rollen, så raden läses upp som text i stället för som
            en knapp man kan öppna. Uppmätt här 2026-08-18: med `grid` på
            <summary> var raden `generic`, utan den är den en knapp. */}
        <div className="grid items-baseline gap-x-6 gap-y-2 sm:grid-cols-[190px_1fr_auto]">
          <span className="etikett">{etikett}</span>
          <span className="text-[16px] leading-[1.5]">{kort}</span>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--accent)' }}>
            Läs varför <span aria-hidden className="utfall-tecken" />
          </span>
        </div>
      </summary>
      <div
        className="max-w-[64ch] pb-5 text-[15px] leading-[1.6] sm:pl-[214px]"
        style={{ color: 'var(--black-mjuk)' }}
      >
        {children}
      </div>
    </details>
  )
}

/**
 * Andelen som en stapel. Spår i `--spar`, fylld del i bläck.
 *
 * **Aldrig partifärg som fyllning.** Färgen kodar parti, och en stapel som
 * fylls med den kodar två saker med samma medel — se regel 1 i
 * docs/DESIGN_GUIDELINES.md. Partiet står namngivet med sin prick bredvid.
 *
 * Stapeln visar `del / av` och ingenting annat. Frågor där partiet inte tog
 * ställning ligger utanför både täljare och nämnare och ritas därför inte alls:
 * en streckad svans i samma spår hade blandat två skalor i ett mått — andelen
 * mäts mot de frågor partiet röstade i, svansen hade mätts mot alla nio.
 * Antalet står i klartext bredvid i stället.
 *
 * `aria-hidden`: talet står utskrivet intill, och stapeln upprepar det.
 */
export function Andelsstapel({ del, av }: { del: number; av: number }) {
  const andel = av > 0 ? del / av : 0
  return (
    <span
      aria-hidden
      className="block h-3.5 w-full overflow-hidden rounded-[2px]"
      style={{ background: 'var(--spar)' }}
    >
      <span
        className="block h-full rounded-[2px]"
        style={{ width: `${andel * 100}%`, background: 'var(--black)' }}
      />
    </span>
  )
}
