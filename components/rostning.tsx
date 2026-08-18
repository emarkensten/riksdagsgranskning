'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Rostrad, Rostnyckel } from '@/components/rostrad'
import {
  Andelsstapel,
  Etikett,
  Knapp,
  Partiprick,
  Textlank,
  Tillbaka,
} from '@/components/system'
import { Bock, Kryss } from '@/components/ikoner'
import { ROSTFARG, namn } from '@/lib/parti'
import { rakneord } from '@/lib/text'
import {
  sammanfattning,
  summera,
  utanStallningText,
  type Rostningsfraga,
  type Svar,
} from '@/lib/rostning'

/** Ordet som förklarar ringen kring en etikett. Står här, inte i Linjeetikett. */
const MARKERING = 'röstade som du'

/**
 * Var sakfrågan bryts efter två rader på telefon.
 *
 * Mätt i databasen 2026-08-18: de nio sakfrågorna är 83–160 tecken. Vid 375 px
 * och 17 px text ryms omkring 55 tecken per rad, alltså ~110 på två rader —
 * fyra av nio är längre än så och bara de får en utfällning. En gräns i tecken
 * och inte en mätning i webbläsaren: kapningen finns för att lyfta det andra
 * alternativet över vikningen, och en `useLayoutEffect` som mäter varje fråga
 * hade kostat en extra layoutpassning per steg för att spara samma pixlar.
 */
const LANG_SAKFRAGA = 110

/**
 * Quizet.
 *
 * **Svaren lämnar aldrig webbläsaren.** De ligger i `useState` och ingenting
 * annat: ingen `localStorage`, ingen `sessionStorage`, ingen cookie, ingen
 * fetch, och ingen `track()` mot Vercel Web Analytics. Svaren står inte heller
 * i adressfältet — en `?svar=JNJ…` hade följt med i varje sidvisning som
 * analysen mäter, i `Referer` till varje utgående länk och i vad besökaren
 * råkar klistra in någonstans. Hur någon skulle rösta är en politisk åsikt,
 * alltså en känslig personuppgift.
 *
 * Uppmätt i webbläsaren efter nio svar, 2026-08-18: adressen står kvar på
 * `/rosta` utan frågesträng, `localStorage` och `sessionStorage` är tomma,
 * inga kakor är satta, `history.length` är oförändrad — stegen är React-tillstånd
 * och inte navigeringar — och den enda händelse analysen skickat är sidvisningen
 * av `/rosta` själv.
 *
 * Kopieringsknappen på resultatskärmen är det enda som lämnar komponenten, och
 * den lämnar den till urklipp: en textsammanfattning som besökaren själv bad
 * om, utan länk och utan frågesträng att dela vidare av misstag.
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
  adress,
  ingress,
  children,
  likhetsnotKort,
}: {
  fragor: Rostningsfraga[]
  /**
   * Quizets egen absoluta adress, för raden sist i den kopierade texten.
   *
   * Inskickad från servern och inte hämtad ur `SAJT_URL` här: se
   * `sammanfattning()` i lib/rostning.ts för varför den konstanten ljuger i
   * webbläsaren.
   */
  adress: string
  /**
   * Startskärmens ingress — de två meningar som säger vad quizet är.
   *
   * Egen prop och inte en del av `children` därför att knappen ligger emellan:
   * ingressen, knappen, sedan förbehållsraderna. Att komma i gång ska inte
   * kräva att man rullat förbi ramen, men ramen ska stå på skärmen.
   */
  ingress: React.ReactNode
  /**
   * Startskärmens förbehåll — fyra `Forbehallsrad` under knappen.
   *
   * Serverrenderade och inskickade. Regeln är inte att servern äger varje ord
   * (rubriker, nyckel och nämnarförklaringen nedan står i klartext här), utan
   * att **allt som påstår något om riksdagen räknas fram ur databasen** och
   * därför måste renderas där frågorna ställs.
   */
  children: React.ReactNode
  /**
   * M/KD/L-likheten igen, kort, direkt under resultatets rubrik.
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
  const [helaBeslutet, setHelaBeslutet] = useState(false)
  const [kopierat, setKopierat] = useState<'nej' | 'ja' | 'fel'>('nej')

  const rubrikRef = useRef<HTMLHeadingElement>(null)
  const sektionRef = useRef<HTMLElement>(null)

  /**
   * Varje steg börjar överst, med fokus på den nya rubriken.
   *
   * Tre fällor, alla uppmätta i webbläsaren:
   *
   * `focus()` på ett element som **redan** har fokus gör ingenting alls — och
   * React återanvänder samma `<h2>`-nod mellan frågorna, eftersom den står på
   * samma plats i trädet. Efter fråga ett flyttades fokus alltså aldrig, och
   * en skärmläsare läste inte upp den nya frågan. `nyckel` tvingar fram en ny
   * nod per steg, så fokusbytet blir verkligt.
   *
   * Rullningen sköts uttryckligen i stället för att överlåtas åt `focus()`.
   * Den rullar bara så långt att elementet nätt och jämnt syns, och den som
   * backade till föregående fråga hamnade därför med rubriken 386 px ovanför
   * fönsterkanten — mitt i svarsalternativen, utan att se vilken fråga de
   * gällde. `preventScroll` lämnar över den uppgiften helt.
   *
   * Och ingenting händer förrän besökaren gjort något. Utan jämförelsen mot
   * `forra` hade första renderingen ryckt fokus från sidans början till
   * quizet, och en tangentbordsanvändare som just landat hade tappat både
   * hoppa-länken och navigeringen. Jämförelsen och inte en "har renderats"-
   * flagga: den senare överlever inte StrictModes dubbla montering.
   *
   * Utfällningen av sakfrågan nollställs här och inte i varje anropsställe.
   * Fyra vägar leder till en ny fråga — svara, backa, hoppa i remsan, ändra
   * svar från resultatet — och den femte som skrivs skulle glömma raden.
   */
  const nyckel = `${steg}-${nr}`
  const forra = useRef(nyckel)
  useEffect(() => {
    if (forra.current === nyckel) return
    forra.current = nyckel
    setHelaBeslutet(false)
    sektionRef.current?.scrollIntoView({ block: 'start' })
    rubrikRef.current?.focus({ preventScroll: true })
  }, [nyckel])

  // Inget setNr här: `start` nås bara från fråga ett, som redan står på noll.
  const borja = () => setSteg('fragor')

  /**
   * Nästa steg är den första obesvarade frågan — inte nästa i ordningen.
   *
   * Med `nr + 1` hamnade den som backat för att rätta ett svar mitt i kön
   * igen: "Ändra svar" på fråga tre kastade tillbaka besökaren till fråga
   * fyra, och eftersom resultatskärmen bara nås genom att svara på den sista
   * frågan krävdes sex klick till för att komma tillbaka dit hen kom ifrån.
   * Är allt besvarat är quizet klart, oavsett vilken fråga som just ändrades.
   */
  function svara(v: Svar) {
    const nya = svar.map((x, i) => (i === nr ? v : x))
    setSvar(nya)
    const kvar = nya.findIndex((x) => x === null)
    if (kvar === -1) setSteg('resultat')
    else setNr(kvar)
  }

  function tillbaka() {
    if (nr === 0) setSteg('start')
    else setNr(nr - 1)
  }

  /**
   * Hoppa till en redan besvarad fråga — ur progressremsan eller ur kvittot.
   *
   * Kvittensen om urklipp nollställs på vägen. Den som ändrar ett svar och
   * kommer tillbaka till resultatet har en sammanfattning i urklipp som inte
   * längre stämmer med skärmen, och raden "Sammanfattningen ligger i ditt
   * urklipp" hade då påstått motsatsen.
   */
  function gaTill(i: number) {
    setNr(i)
    setKopierat('nej')
    setSteg('fragor')
  }

  function borjaOm() {
    setSvar(fragor.map(() => null))
    setNr(0)
    setKopierat('nej')
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
        <p
          className="stig mt-7 max-w-[54ch] text-[clamp(17px,2.2vw,21px)] leading-[1.45]"
          style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}
        >
          {ingress}
        </p>

        {/* Knappen före förbehållen, inte efter. Den ligger då över vikningen
            även på 1280×720, och raden bredvid svarar på den enda fråga
            besökaren har innan hen börjar: hur lång tid det tar. */}
        <div className="stig mt-9 flex flex-wrap items-center gap-x-5 gap-y-3" style={{ animationDelay: '240ms' }}>
          <Knapp onClick={borja}>Börja med första frågan</Knapp>
          <span className="etikett">
            {rakneord(fragor.length)} frågor · ungefär {rakneord(minuter(fragor.length))} minuter
          </span>
        </div>

        {/* Ramen. Fyra rader i stället för fyra stycken — samma ord, en
            utfällning bort. Se `Forbehallsrad` och F1 i designfeedbacken. */}
        <div className="stig mt-11" style={{ borderTop: '1px solid var(--linje)', animationDelay: '320ms' }}>
          {children}
        </div>

        <p className="mt-7 max-w-[62ch] text-[14.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
          Vill du hellre läsa besluten i sin helhet —{' '}
          <Link href="/fragor" className="underline hover:opacity-70" style={{ color: 'var(--black)' }}>
            alla {rakneord(fragor.length)} frågorna
          </Link>
          .
        </p>
      </section>
    )
  }

  if (steg === 'resultat') {
    // Varje fråga är besvarad här: `resultat` nås bara från `svara()` på sista
    // frågan, och `svara()` är det enda som flyttar `nr` framåt. Utan den här
    // raden hade resten av skärmen burit tre null-vakter som aldrig kan falla
    // ut — och en vakt som inte kan falla ut läses som att den kan.
    const klara = svar as Svar[]
    const summor = summera(fragor, klara)

    async function kopiera() {
      try {
        await navigator.clipboard.writeText(sammanfattning(fragor, klara, summor, adress))
        setKopierat('ja')
      } catch {
        // Urklipp kräver säker kontext och kan nekas av användaren. Då står
        // det ut i stället för att knappen ser ut att ha gjort något.
        setKopierat('fel')
      }
    }

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

        {/*
          Facit först, kvitto sedan.

          Ordningen stod tvärtom fram till 2026-08-18: nio frågerader innan det
          besökaren gick in för. "Parti för parti" är svaret på rubrikfrågan och
          ska stå där svaret hör hemma — överst. Kvittot nedanför är för den som
          vill kontrollera talet, inte för den som vill läsa det.
        */}
        <section className="regel mt-12 pt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
            <h3 className="text-[26px] font-extrabold tracking-[-0.025em]">Parti för parti</h3>
            <span className="max-w-[46ch] text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
              Sajtens vanliga ordning — ingen rangordning.
            </span>
          </div>
          {/* Nämnaren förklaras före talen, inte i en fotnot under dem. Ett
              "3 av 5" bredvid ett "6 av 9" ser ut som ett fel tills läsaren vet
              varför nämnarna skiljer sig åt — och den som inte får veta det
              räknar om avståendena till missar på egen hand. */}
          <p className="mt-4 max-w-[66ch] text-[15.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
            Stapeln visar andelen av de frågor där partiet faktiskt röstade ja
            eller nej. Ett avstående räknas varken som träff eller miss —
            partiet tog inte ställning, och då finns ingen linje att jämföra
            med. Därför är nämnaren olika för olika partier, och den står
            utskriven vid varje stapel.
          </p>
          <ol className="mt-8">
            {summor.map((s) => (
              <li
                key={s.parti}
                className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 py-4 sm:grid-cols-[210px_1fr_132px]"
                style={{ borderTop: '1px solid var(--linje)' }}
              >
                <span className="order-1 flex items-center gap-2.5">
                  <Partiprick parti={s.parti} />
                  <span className="text-[16.5px] font-semibold">{namn(s.parti)}</span>
                </span>
                <span className="order-3 col-span-2 sm:order-2 sm:col-span-1">
                  <Andelsstapel del={s.lika} av={s.stallning} />
                </span>
                <span className="order-2 flex flex-col items-end gap-1 sm:order-3">
                  {s.stallning > 0 ? (
                    <span className="tabular text-[15.5px] leading-none">
                      <strong className="text-[22px] font-extrabold">{s.lika}</strong> av{' '}
                      {s.stallning}
                    </span>
                  ) : (
                    <span className="text-[15.5px]" style={{ color: 'var(--black-svag)' }}>
                      ingen jämförelse
                    </span>
                  )}
                  {s.utanStallning > 0 && (
                    <span className="text-[12.5px] leading-tight" style={{ color: 'var(--black-svag)' }}>
                      {utanStallningText(s.utanStallning, s.avstod)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="regel mt-14 pt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 pb-3">
            <h3 className="text-[26px] font-extrabold tracking-[-0.025em]">Fråga för fråga</h3>
            <div className="flex flex-col gap-1.5">
              <Rostnyckel />
              <span className="text-[12.5px]" style={{ color: 'var(--black-svag)' }}>
                Ram i signalfärg = partiet {MARKERING}
              </span>
            </div>
          </div>
          <ol>
            {fragor.map((f, i) => {
              const mitt = klara[i]
              return (
                <li key={f.slug}>
                  {/* 376 px, inte 356 som på /fragor och startsidan.
                      Mönstret av åtta etiketter ska rymmas på en rad — bryter
                      de 7 + 2 går det förlorat — och här är mellanrummet 8 px
                      i stället för 4, eftersom markeringsringen ligger 2 px
                      utanför etiketten och två ringar annars nuddar varandra.
                      8 × 40 + 7 × 8 = 376. Uppmätt, inte uppskattat. */}
                  <div
                    className="grid items-start gap-x-8 gap-y-4 py-7 md:grid-cols-[1fr_376px]"
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
                      <p className="mt-3 text-[15px]" style={{ color: 'var(--black-mjuk)' }}>
                        Du svarade{' '}
                        <strong style={{ color: ROSTFARG[mitt] }}>{mitt.toLowerCase()}</strong>.{' '}
                        {/* Kvittot är också vägen tillbaka. Utan den är enda
                            sättet att ändra ett svar att börja om från fråga
                            ett — nio val för att rätta ett. */}
                        <button
                          type="button"
                          onClick={() => gaTill(i)}
                          className="font-semibold underline underline-offset-[3px] transition-opacity duration-150 hover:opacity-70"
                          style={{ color: 'var(--black)' }}
                        >
                          Ändra svar
                        </button>
                      </p>
                    </div>
                    <div className="flex flex-col gap-2.5 md:items-end">
                      <Rostrad
                        rader={f.roster}
                        kompakt
                        markera={{ linje: mitt, text: MARKERING }}
                      />
                      <span
                        className="text-[13.5px] leading-[1.5] md:text-right"
                        style={{ color: 'var(--black-svag)' }}
                      >
                        {f.mening[mitt]}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        <div className="regel mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 pt-10">
          <Knapp onClick={borjaOm} ton="sekundar">
            Börja om
          </Knapp>
          <Knapp onClick={kopiera} ton="sekundar">
            Kopiera din sammanfattning
          </Knapp>
          <Textlank href="/fragor">
            Läs alla {rakneord(fragor.length)} frågorna i sin helhet
          </Textlank>
        </div>
        {/* aria-live, inte bara text: knappen ser likadan ut efter klicket, och
            den som inte ser skärmen får annars ingen kvittens alls. */}
        <p aria-live="polite" className="mt-4 text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
          {kopierat === 'ja' && 'Sammanfattningen ligger i ditt urklipp.'}
          {kopierat === 'fel' &&
            'Webbläsaren släppte inte fram urklipp. Markera texten på sidan och kopiera i stället.'}
        </p>

        {/* Sista ordet på skärmen där besökaren just gjort alla sina val. Kort,
            och en annan mening än den på startskärmen. */}
        <p className="mt-8 max-w-[64ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
          Dina svar finns bara i den här fliken. De har inte sparats, inte
          skickats någonstans och inte mätts — lämnar du sidan är de borta.
          Kopieringsknappen lägger en textsammanfattning i ditt urklipp; ingen
          länk, ingen frågesträng.
        </p>
      </section>
    )
  }

  const f = fragor[nr]
  const langSakfraga = f.sakfraga.length > LANG_SAKFRAGA
  const besvarade = svar.filter((v, i) => v !== null && i !== nr).length
  return (
    <section
      ref={sektionRef}
      className="pb-10 pt-12"
      /*
        Tangenterna J, N och ← ligger på sektionen och inte på `window`.

        WCAG 2.1.4 tillåter enteckensgenvägar bara om de går att stänga av,
        att lägga om — eller om de gäller enbart medan komponenten har fokus.
        Det sista är billigast och sannast här: varje steg flyttar fokus till
        rubriken inuti sektionen, alltså är genvägarna aktiva precis när
        besökaren är i quizet och döda i resten av sidan.
      */
      onKeyDown={(e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return
        const t = e.key.toLowerCase()
        if (t === 'j') svara('Ja')
        else if (t === 'n') svara('Nej')
        else if (e.key === 'ArrowLeft') tillbaka()
        else return
        e.preventDefault()
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h1 className="etikett" style={{ color: 'var(--black-svag)' }}>
          Hur hade du röstat?
        </h1>
        <span className="etikett tabular" style={{ color: 'var(--black-svag)' }}>
          Fråga {nr + 1} av {fragor.length}
        </span>
      </div>

      {/*
        Remsan är en karta, alltså ska den gå att peka på.

        Nio segment som redan kodar besvarad/aktuell/kvar bar fram till nu
        `aria-hidden` och ingen träffyta — enda vägen bakåt var "Föregående
        fråga", ett steg i taget. Nu är varje besvarad fråga en knapp med
        utskriven etikett; den aktuella och de kvarvarande är kvar som
        dekor och göms för skärmläsaren, eftersom "Fråga 4 av 9" ovanför
        redan säger det de säger.

        Knappens träffyta är 44 px hög medan strecket är 10 px: paddingen
        dras tillbaka med lika stor negativ marginal, så raden tar samma
        plats som förut men går att träffa med en tumme. Bredden går inte
        att göra lika stor — nio mål à 44 px är 396 px och kolumnen är 335 —
        och 32×44 klarar WCAG 2.5.8 med marginal. Genvägen är dessutom aldrig
        enda vägen: "Föregående fråga" står kvar under alternativen.
      */}
      <nav aria-label="Besvarade frågor" className="mt-4 flex gap-1.5">
        {fragor.map((x, i) => {
          const remsa = 'block h-2.5 w-full rounded-[2px]'
          if (svar[i] !== null && i !== nr) {
            return (
              <button
                key={x.slug}
                type="button"
                onClick={() => gaTill(i)}
                aria-label={`Gå till fråga ${i + 1}, besvarad ${svar[i]?.toLowerCase()}`}
                className="-my-[17px] flex-1 py-[17px]"
              >
                {/* Hovringen byter färg och tonar inte. Remsan kodar tillstånd
                    med färg — bläck/signal/hårlinje — och en opacitet på 70 %
                    hade lagt ett fjärde värde mellan två av dem. Samma skäl
                    som gör att listraderna inte får tona. */}
                <span className={`${remsa} bg-[var(--black)] transition-colors duration-150 hover:bg-[var(--black-mjuk)]`} />
              </button>
            )
          }
          return (
            <span
              key={x.slug}
              aria-hidden
              className={`${remsa} flex-1`}
              style={{
                background:
                  i === nr ? 'var(--accent)' : svar[i] ? 'var(--black)' : 'var(--linje)',
              }}
            />
          )
        })}
      </nav>
      {/* Först när det finns något att gå tillbaka till. På fråga ett är
          nyckeln en förklaring av en karta som ännu inte har någon väg. */}
      {besvarade > 0 && (
        <p className="mt-2.5 text-[13px]" style={{ color: 'var(--black-svag)' }}>
          Bläck = besvarad och klickbar. Signal = här är du. Hårlinje = kvar.
        </p>
      )}

      <div className="mt-8">
        <Etikett ton="signal">{f.amne}</Etikett>
        {/* 1.9rem i golvet gav 30 px på 375 px och tryckte det andra
            alternativet under vikningen. 1.7rem = 27 px; taket står kvar. */}
        <h2
          key={nyckel}
          ref={rubrikRef}
          tabIndex={-1}
          className="mt-4 max-w-[20ch] text-[clamp(1.7rem,5vw,48px)] font-extrabold leading-[1.02] tracking-[-0.035em]"
        >
          {f.rubrik}
        </h2>
        {/* Kammarens egen formulering under väljarens. Ramen är "samma val som
            kammaren stod inför", och då måste det stå vad kammaren röstade om
            — inte bara vad frågan handlar om. Kapas efter två rader på telefon
            när den är lång, aldrig på en skärm där de två alternativen ändå
            ryms bredvid varandra. */}
        <p
          className={`mt-5 max-w-[62ch] text-[17px] leading-[1.6] ${
            langSakfraga && !helaBeslutet ? 'line-clamp-2 sm:line-clamp-none' : ''
          }`}
          style={{ color: 'var(--black-mjuk)' }}
        >
          {f.sakfraga}
        </p>
        {langSakfraga && (
          <button
            type="button"
            onClick={() => setHelaBeslutet((v) => !v)}
            aria-expanded={helaBeslutet}
            className="mt-2 text-[15px] font-semibold underline underline-offset-[3px] sm:hidden"
            style={{ color: 'var(--black)' }}
          >
            {helaBeslutet ? 'Visa mindre' : 'Visa hela beslutet'}
          </button>
        )}
      </div>

      {/* Förslag mot motförslag, båda utskrivna, i den ordning kammaren ställde
          dem: utskottets förslag som ja, motförslaget som nej. Alternativen är
          voteringens egna och inte en åsiktsskala. */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(['Ja', 'Nej'] as const).map((v) => (
          <Alternativ
            key={v}
            svar={v}
            text={v === 'Ja' ? f.ja_kort : f.nej_kort}
            valt={svar[nr] === v}
            onClick={() => svara(v)}
          />
        ))}
      </div>

      {/*
        Ingen länk till frågesidan härifrån.

        Den stod här som "Hela frågan med rösterna — lämnar quizet", och båda
        halvorna av den meningen var problem. Den lämnade quizet på riktigt:
        svaren ligger i `useState`, så ett klick och en bakåtknapp kastade allt
        och började om från fråga ett. Och den ledde till rösterna — alltså
        till facit, mitt i ett prov. En läsare som slår upp svaret innan hen
        svarar mäter inte längre sig själv.

        Villkoret att varje fråga ska länka till sin frågesida uppfylls av
        resultatskärmen, där varje rad i kvittot är en länk. Där är facit
        redan givet.
      */}
      <div className="mt-8">
        <Tillbaka onClick={tillbaka}>
          {nr === 0 ? 'Tillbaka till början' : 'Föregående fråga'}
        </Tillbaka>
      </div>
    </section>
  )
}

/**
 * Ungefärlig tid för hela quizet, i minuter.
 *
 * Femton sekunder per fråga: läsa rubriken, sakfrågan och två alternativ, och
 * välja. Ett påstående om besökaren och inte om riksdagen — alltså skrivet
 * här och inte hämtat ur databasen — men härlett ur antalet frågor, så att
 * raden inte fortsätter lova två minuter om quizet blir dubbelt så långt.
 */
function minuter(antal: number) {
  return Math.max(1, Math.round((antal * 15) / 60))
}

/** Ikon, etikett och färg är en ren uppslagning på svaret. */
const ALTERNATIV = {
  Ja: { etikett: 'Rösta ja', ikon: <Bock storlek={18} />, tangent: 'J' },
  Nej: { etikett: 'Rösta nej', ikon: <Kryss storlek={18} />, tangent: 'N' },
} as const

/**
 * Ett av kammarens två alternativ, som knapp.
 *
 * Samma form som `Innebord` på frågesidan — ikon, etikett i röstfärgen, texten
 * under — men klickbar. Att de ser lika ut är avsikten: den som gått quizet ska
 * känna igen frågesidan, och tvärtom.
 *
 * Röstfärgen sitter på ikon och etikett men aldrig på hela ytan. Den kodar en
 * röst; en fylld grön knapp hade gjort ja till det inbjudande valet och nej
 * till varningen, och då tar gränssnittet ställning.
 *
 * `sm:min-h-[168px]` och inte `min-h`: i ett rutnät med två spalter är korten
 * redan lika höga, eftersom rutnätsceller sträcker sig. Måttet finns för
 * rytmen — ett kort med en kort mening ska inte krympa till en rad bredvid ett
 * med fyra — och den rytmen finns bara när de står bredvid varandra. Staplade
 * på telefon vore 168 px per kort bortkastad höjd.
 */
function Alternativ({
  svar,
  text,
  valt,
  onClick,
}: {
  svar: Svar
  text: string
  valt: boolean
  onClick: () => void
}) {
  const { etikett, ikon, tangent } = ALTERNATIV[svar]
  const farg = ROSTFARG[svar]
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-[8px] px-6 py-6 text-left transition-colors duration-150 hover:bg-[var(--papper-djup)] sm:min-h-[168px]"
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
      {/* Genvägen står utskriven, annars finns den inte. Sist i kortet och i
          etikettgrått: den ska hittas av den som letar, inte konkurrera med
          alternativet. Visas bara där det finns ett tangentbord att trycka på. */}
      <span aria-hidden className="etikett mt-auto hidden pt-5 sm:block">
        Tangent {tangent}
      </span>
    </button>
  )
}
