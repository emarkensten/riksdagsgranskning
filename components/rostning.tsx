'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Rostrad, Rostnyckel } from '@/components/rostrad'
import { Etikett, Knapp, Partiprick } from '@/components/system'
import { Bock, Kryss, PilHoger, PilVanster } from '@/components/ikoner'
import { rakneord } from '@/lib/text'
import {
  summera,
  utanStallningText,
  type Rostningsfraga,
  type Svar,
} from '@/lib/rostning'

/**
 * Quizet. Sajtens enda klientkomponent.
 *
 * **Svaren lämnar aldrig webbläsaren.** De ligger i `useState` och ingenting
 * annat: ingen `localStorage`, ingen `sessionStorage`, ingen cookie, ingen
 * fetch, och ingen `track()` mot Vercel Web Analytics. Svaren står inte heller
 * i adressfältet — en `?svar=JNJ…` hade följt med i varje sidvisning som
 * analysen mäter, i `Referer` till varje utgående länk och i vad besökaren
 * råkar klistra in någonstans. Sidan renderas därför på samma adress hela
 * vägen, och det enda quizet efterlämnar är en `history`-post per klick som
 * webbläsaren aldrig får se innehållet i. Hur någon skulle rösta är en politisk
 * åsikt, alltså en känslig personuppgift.
 *
 * Därav också formen: partilinjerna kommer färdiga som props, jämförelsen görs
 * av `summera()` i `lib/rostning.ts`, och ingen av dem behöver veta något om
 * databasen.
 *
 * **Ingen `.panel`.** Formspråket ger det mörka fältet åt sidans tyngsta tal,
 * och det tyngsta talet här är besökarens eget resultat. Satt i 148 px hade det
 * blivit precis den dom planens villkor förbjuder — se `app/fragor/page.tsx`
 * för samma avvägning gjord åt samma håll.
 */
export function Rostning({
  fragor,
  intro,
  likhetsnot,
  likhetsnotKort,
}: {
  fragor: Rostningsfraga[]
  /** Startskärmens text. Serverrenderad och inskickad — servern äger orden. */
  intro: React.ReactNode
  /** M/KD/L-noten i sin fulla form, på startskärmen. */
  likhetsnot: React.ReactNode
  /**
   * Samma faktum, kort, direkt under resultatets rubrik.
   *
   * Villkoret säger att likheten ska skrivas ut **innan** resultatet visas.
   * Startskärmen är innan, men den lästes för nio frågor sedan; den korta
   * noten står därför ovanför det första talet på resultatskärmen också. Två
   * formuleringar och inte samma text två gånger — en ordagrann upprepning så
   * nära läses som att texten tappat tråden.
   */
  likhetsnotKort: React.ReactNode
}) {
  const [steg, setSteg] = useState<'start' | 'fragor' | 'resultat'>('start')
  const [nr, setNr] = useState(0)
  const [svar, setSvar] = useState<(Svar | null)[]>(() => fragor.map(() => null))

  const rubrikRef = useRef<HTMLHeadingElement>(null)
  const sektionRef = useRef<HTMLElement>(null)
  // Fokus flyttas bara efter att besökaren gjort något. Utan spärren hade
  // första renderingen ryckt fokus från sidans början till quizet, och en
  // tangentbordsanvändare som just landat hade tappat både hoppa-länken och
  // navigeringen.
  const rort = useRef(false)

  /**
   * Varje steg börjar överst, med fokus på den nya rubriken.
   *
   * Två fällor, båda uppmätta i webbläsaren:
   *
   * `focus()` på ett element som **redan** har fokus gör ingenting alls — och
   * React återanvänder samma `<h2>`-nod mellan frågorna, eftersom den står på
   * samma plats i trädet. Efter fråga ett flyttades fokus alltså aldrig, och
   * en skärmläsare läste inte upp den nya frågan. `nyckel` tvingar fram en ny
   * nod per steg, så fokusbytet blir verkligt.
   *
   * Och rullningen sköts uttryckligen i stället för att överlåtas åt
   * `focus()`. Den rullar bara så långt att elementet nätt och jämnt syns, och
   * den som backade till föregående fråga hamnade därför med rubriken 386 px
   * ovanför fönsterkanten — mitt i svarsalternativen, utan att se vilken fråga
   * de gällde. `preventScroll` lämnar över den uppgiften helt.
   */
  const nyckel = `${steg}-${nr}`
  useEffect(() => {
    if (!rort.current) return
    sektionRef.current?.scrollIntoView({ block: 'start' })
    rubrikRef.current?.focus({ preventScroll: true })
  }, [nyckel])

  function borja() {
    rort.current = true
    setSteg('fragor')
    setNr(0)
  }

  function svara(v: Svar) {
    rort.current = true
    setSvar((f) => f.map((x, i) => (i === nr ? v : x)))
    if (nr + 1 < fragor.length) setNr(nr + 1)
    else setSteg('resultat')
  }

  function tillbaka() {
    rort.current = true
    if (nr === 0) setSteg('start')
    else setNr(nr - 1)
  }

  function borjaOm() {
    rort.current = true
    setSvar(fragor.map(() => null))
    setNr(0)
    setSteg('fragor')
  }

  if (steg === 'start') {
    return (
      <section ref={sektionRef} className="pb-14 pt-14">
        <Etikett className="stig" ton="signal">Valet 2026</Etikett>
        <h1
          key={nyckel}
          ref={rubrikRef}
          tabIndex={-1}
          className="display stig mt-5 max-w-[13ch] text-[clamp(2.4rem,7vw,76px)]"
          style={{ animationDelay: '80ms' }}
        >
          Hur hade du röstat?
        </h1>
        <div className="stig" style={{ animationDelay: '160ms' }}>
          {intro}
        </div>
        <div className="stig mt-10" style={{ animationDelay: '240ms' }}>
          {likhetsnot}
        </div>
        <div className="stig mt-10" style={{ animationDelay: '320ms' }}>
          <Knapp onClick={borja}>Börja med första frågan</Knapp>
        </div>
      </section>
    )
  }

  if (steg === 'resultat') {
    const summor = summera(fragor, svar)
    return (
      <section ref={sektionRef} className="pb-6 pt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h1 className="etikett" style={{ color: 'var(--black-svag)' }}>
            Hur hade du röstat?
          </h1>
          <Etikett ton="signal">Ditt resultat</Etikett>
        </div>
        <h2
          key={nyckel}
          ref={rubrikRef}
          tabIndex={-1}
          className="mt-5 max-w-[18ch] text-[clamp(2rem,5.8vw,56px)] font-extrabold leading-[0.98] tracking-[-0.04em]"
        >
          Så röstade de, jämfört med dig.
        </h2>

        {/* Före varje tal på sidan. Se propens kommentar. */}
        <div className="mt-8">{likhetsnotKort}</div>

        <section className="regel mt-12 pt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 pb-3">
            <h3 className="text-[26px] font-extrabold tracking-[-0.025em]">Fråga för fråga</h3>
            <div className="flex flex-col gap-1.5">
              <Rostnyckel />
              <span className="text-[12.5px]" style={{ color: 'var(--black-svag)' }}>
                Ram i signalfärg = partiet röstade som du
              </span>
            </div>
          </div>
          <ol>
            {fragor.map((f, i) => {
              const mitt = svar[i]
              return (
                <li key={f.slug}>
                  <div
                    className="grid items-start gap-x-8 gap-y-4 py-7 md:grid-cols-[1fr_356px]"
                    style={{ borderTop: '1px solid var(--linje)' }}
                  >
                    <div>
                      <div
                        className="mono flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
                        style={{ color: 'var(--etikett)' }}
                      >
                        <span style={{ color: 'var(--accent)' }}>{f.amne}</span>
                        <span>{f.datumtext}</span>
                      </div>
                      {/* Villkoret: varje fråga länkar till sin frågesida.
                          Rubriken och inte en "läs mer" — länktexten ska namnge
                          sitt mål. */}
                      <Link
                        href={`/fragor/${f.slug}`}
                        className="mt-2.5 block max-w-[34ch] text-[21px] font-semibold leading-[1.3] tracking-[-0.015em] transition-opacity duration-150 hover:opacity-70"
                      >
                        {f.rubrik}
                      </Link>
                      {mitt && (
                        <p className="mt-3 text-[15px]" style={{ color: 'var(--black-mjuk)' }}>
                          Du svarade{' '}
                          <strong style={{ color: mitt === 'Ja' ? 'var(--ja)' : 'var(--nej)' }}>
                            {mitt.toLowerCase()}
                          </strong>
                          .
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2.5 md:items-end">
                      <Rostrad rader={f.roster} kompakt likaSom={mitt ?? undefined} />
                      {mitt && (
                        <span
                          className="text-[13.5px] leading-[1.5] md:text-right"
                          style={{ color: 'var(--black-svag)' }}
                        >
                          {f.mening[mitt]}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="regel mt-14 pt-12">
          <h3 className="text-[26px] font-extrabold tracking-[-0.025em]">Parti för parti</h3>
          {/* Nämnaren förklaras före talen, inte i en fotnot under dem. Ett
              "3 av 5" bredvid ett "6 av 9" ser ut som ett fel tills läsaren vet
              varför nämnarna skiljer sig åt — och den som inte får veta det
              räknar om avståendena till missar på egen hand. */}
          <p className="mt-4 max-w-[64ch] text-[15.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
            Nämnaren är antalet frågor där partiet faktiskt röstade ja eller
            nej. Ett avstående räknas varken som träff eller miss — partiet tog
            inte ställning, och då finns ingen linje att jämföra med. Ordningen
            nedan är sajtens vanliga och inte en rangordning.
          </p>
          <ol className="mt-8">
            {summor.map((s) => (
              <li
                key={s.parti}
                className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 py-5"
                style={{ borderTop: '1px solid var(--linje)' }}
              >
                <span className="flex items-baseline gap-2.5">
                  <Partiprick parti={s.parti} />
                  <span className="text-[17px] font-semibold">{s.namn}</span>
                </span>
                <span className="flex items-baseline gap-3">
                  {s.utanStallning > 0 && (
                    <span className="text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
                      {utanStallningText(s)}
                    </span>
                  )}
                  <span className="tabular text-[clamp(1.6rem,4vw,34px)] font-extrabold leading-none">
                    {s.lika}{' '}
                    <span className="text-[17px] font-semibold" style={{ color: 'var(--black-svag)' }}>
                      av {s.stallning}
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="regel mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 pt-10">
          <Knapp onClick={borjaOm} ton="sekundar">
            Börja om
          </Knapp>
          <Link
            href="/fragor"
            className="inline-flex items-center gap-2 text-[14.5px] font-semibold transition-opacity duration-150 hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            Läs alla {rakneord(fragor.length)} frågorna i sin helhet
            <PilHoger storlek={16} />
          </Link>
        </div>

        {/* Sista ordet på skärmen där besökaren just gjort alla sina val. Kort,
            och en annan mening än den på startskärmen. */}
        <p className="mt-10 max-w-[64ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
          Dina svar finns bara i den här fliken. De har inte sparats, inte
          skickats någonstans och inte mätts — lämnar du sidan är de borta.
        </p>
      </section>
    )
  }

  const f = fragor[nr]
  return (
    <section ref={sektionRef} className="pb-10 pt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h1 className="etikett" style={{ color: 'var(--black-svag)' }}>
          Hur hade du röstat?
        </h1>
        <span className="etikett tabular" style={{ color: 'var(--black-svag)' }}>
          Fråga {nr + 1} av {fragor.length}
        </span>
      </div>

      {/* Upprepar talet till höger ovanför och är därför aria-hidden. */}
      <div aria-hidden className="mt-4 flex gap-1.5">
        {fragor.map((x, i) => (
          <span
            key={x.slug}
            className="h-1.5 flex-1 rounded-[2px]"
            style={{
              background:
                i === nr
                  ? 'var(--accent)'
                  : svar[i]
                    ? 'var(--black)'
                    : 'var(--linje)',
            }}
          />
        ))}
      </div>

      <div className="mt-9">
        <Etikett ton="signal">{f.amne}</Etikett>
        <h2
          key={nyckel}
          ref={rubrikRef}
          tabIndex={-1}
          className="mt-4 max-w-[20ch] text-[clamp(1.9rem,5vw,48px)] font-extrabold leading-[1.02] tracking-[-0.035em]"
        >
          {f.rubrik}
        </h2>
        {/* Kammarens egen formulering under väljarens. Ramen är "samma val som
            kammaren stod inför", och då måste det stå vad kammaren röstade om
            — inte bara vad frågan handlar om. */}
        <p className="mt-5 max-w-[62ch] text-[17px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          {f.sakfraga}
        </p>
      </div>

      {/* Förslag mot motförslag, båda utskrivna, i den ordning kammaren ställde
          dem: utskottets förslag som ja, motförslaget som nej. Alternativen är
          voteringens egna och inte en åsiktsskala. */}
      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <Alternativ
          etikett="Rösta ja"
          text={f.ja_innebar}
          farg="var(--ja)"
          ikon={<Bock storlek={18} />}
          valt={svar[nr] === 'Ja'}
          onClick={() => svara('Ja')}
        />
        <Alternativ
          etikett="Rösta nej"
          text={f.nej_innebar}
          farg="var(--nej)"
          ikon={<Kryss storlek={18} />}
          valt={svar[nr] === 'Nej'}
          onClick={() => svara('Nej')}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
        <button
          type="button"
          onClick={tillbaka}
          className="inline-flex items-center gap-2 text-[13.5px] font-semibold transition-opacity duration-150 hover:opacity-70"
          style={{ color: 'var(--black-svag)' }}
        >
          <PilVanster storlek={15} />
          {nr === 0 ? 'Tillbaka till början' : 'Föregående fråga'}
        </button>
        {/* Villkoret: varje fråga länkar till sin frågesida. Öppnas i samma
            flik — quizet är inte värt att fälla en läsare för, och svaren
            hittills går ändå förlorade vid en omladdning. Det står i länken. */}
        <Link
          href={`/fragor/${f.slug}`}
          className="inline-flex items-center gap-2 text-[13.5px] font-semibold transition-opacity duration-150 hover:opacity-70"
          style={{ color: 'var(--black-svag)' }}
        >
          Hela frågan med rösterna — lämnar quizet
          <PilHoger storlek={15} />
        </Link>
      </div>
    </section>
  )
}

/**
 * Ett av kammarens två alternativ, som knapp.
 *
 * Samma form som `Innebord` på frågesidan — ikon, etikett i röstfärgen, texten
 * under — men klickbar. Att de ser lika ut är avsikten: den som gått quizet ska
 * känna igen frågesidan, och tvärtom.
 *
 * `--ja` och `--nej` sitter på ikon och etikett men aldrig på hela ytan.
 * Röstfärgen kodar en röst; en fylld grön knapp hade gjort ja till det
 * inbjudande valet och nej till varningen, och då tar gränssnittet ställning.
 */
function Alternativ({
  etikett,
  text,
  farg,
  ikon,
  valt,
  onClick,
}: {
  etikett: string
  text: string
  farg: string
  ikon: React.ReactNode
  valt: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[8px] px-6 py-7 text-left transition-colors duration-150 hover:bg-[var(--papper-djup)]"
      style={{ border: `1px solid ${valt ? 'var(--accent)' : 'var(--linje-stark)'}` }}
    >
      <span className="flex items-center gap-2.5" style={{ color: farg }}>
        {ikon}
        <span className="etikett" style={{ color: farg }}>{etikett}</span>
        {/* Markeringen när besökaren backat till en redan besvarad fråga.
            Utskriven text och inte bara kantfärgen — färg får aldrig vara enda
            bäraren. */}
        {valt && (
          <span className="etikett" style={{ color: 'var(--accent)' }}>
            · ditt svar
          </span>
        )}
      </span>
      <span className="mt-3.5 block max-w-[46ch] text-[16.5px] leading-[1.55]" style={{ color: 'var(--black-mjuk)' }}>
        {text}
      </span>
    </button>
  )
}
