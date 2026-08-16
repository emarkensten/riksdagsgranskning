import Link from 'next/link'
import {
  db, datum, heltal, lista, namn, rader, tal, utskott,
  PARTIER, REGERINGSPARTIERNA,
} from '@/lib/db'
import { allaRader } from '@/lib/block'
import { Gnista, Lutning, Tidslinje, manadsnummer } from '@/components/diagram'
import { Etikett, Forbehall, Knapp, Partiprick } from '@/components/system'
import { sidmetadata } from '@/lib/sajt'

export const revalidate = 3600

export const metadata = sidmetadata({
  titel: 'Blocken',
  beskrivning:
    'Under mandatperiodens sista riksmöte rör sig riksdagens partier åt var sitt håll. Tre mått som mäter olika saker visar samma sak — reservationer, röstlinjer och gemensamma reservationer 2022–2026.',
  sokvag: '/blocken',
})

type Linjerad = { parti: string; rm: string; voteringar: number; andel: number }
type Reservationsrad = {
  parti: string
  rm: string
  reservationer: number
  gemensamma: number
  andel_gemensamma: number | null
}
type Manadsrad = { parti: string; manad: string; reservationer: number; anforanden: number }
type Volymrad = {
  rm: string
  betankanden: number
  forslagspunkter: number
  voteringar: number
  reservationer: number
  utan_parti: number
  anforanden: number
}
type Utskottsrad = { organ: string; rm: string; parti: string; voteringar: number; andel: number }
type Yttranderad = { parti: string; rm: string; yttranden: number }
type Stickprovsrad = {
  bet_dok_id: string
  beteckning: string
  nummer: string
  rubrik: string
  partier: string[] | null
}
type Sjalvforklaring = {
  anforande_id: string
  talare: string
  parti: string
  datum: string
  avsnittsrubrik: string
  rel_dok_id: string | null
}

/**
 * Stickprovet mot källan.
 *
 * Att räkna om ett tal ur sajtens egen databas visar bara att aritmetiken
 * stämmer, inte att databasen stämmer. Den frågan går bara att svara på genom
 * att gå till riksdagens publicerade betänkande och räkna där. Det är gjort en
 * gång, för hand, på det här betänkandet — och därför står betäckningen som en
 * konstant och inte som en fråga: den är ett protokoll över en kontroll, inte
 * ett urval ur datan.
 *
 * `antal` är vad kontrollen såg i riksdagens publicerade betänkande. Det talet
 * jämförs med databasens, och går de isär säger kortet det. Utan den
 * jämförelsen hade sidan påstått att riksdagen listar samma antal som
 * databasen råkar ha efter nästa ETL-körning — ett påstående om källan som
 * ingen har kontrollerat, på just det kort som ska visa att den stämmer.
 */
const STICKPROV = {
  rm: '2025/26',
  beteckning: 'KU4',
  parti: 'SD',
  antal: 2,
  kontrollerat: '2026-08-16',
}

/**
 * Anföranden där partiets egna företrädare förklarar varför reservationerna
 * saknas.
 *
 * Framsökta 2026-08-16 med fritextsökning i `anforande.text` över
 * ärendedebatterna — "inte har några reservationer", "inga reservationer i
 * betänkandet", "samordnar vi inom Tidö". Sökningen gav tre träffar i
 * {senaste riksmötet}, alla från samma parti som resten av sidan handlar om.
 *
 * Id:na står här och inte som en fråga med sökmönstret inbakat, av samma skäl
 * som STICKPROV: ett mönster som körs vid varje rendering skulle tyst byta ut
 * exemplen när datan växer, och kortet påstår något om just de här tre.
 *
 * Tre anföranden funna med fritextsökning är vittnesmål, inte en mätning, och
 * kortet skriver ut det. Poängen är inte hur många de är utan vad de säger:
 * invändningen mot sidans tolkning kommer från partiet självt, i kammaren.
 */
const SJALVFORKLARINGAR = {
  sokt: '2026-08-16',
  ids: [
    '86560d3f-dd55-f111-8b6f-6805cafea079', // Aspling, arbetskraftsinvandring
    'b4c25ccd-5a5b-f111-8b6f-6805cafea079', // Andersson, energipolitik
    '7548eaf4-032e-f111-8812-6805cad9744d', // Fransson, elmarknadsfrågor
  ],
}

/** Två riksmöten i tidslinjen: året före brottet och året det inträffade. */
const FONSTER = 24

/** Under så många reservationer i ett riksmöte betyder en andel ingenting. */
const VOLYMGRANS = 100

/** Utskott med färre voteringar än så jämförs inte mellan år. */
const UTSKOTTSGRANS = 20

async function hamta() {
  const klient = db()

  const [
    linjer, reservationer, manader, volym, utskottsrader, stickprov, sjalvforklaringar, yttranden,
  ] = await Promise.all([
    rader<Linjerad>(klient.from('parti_linje').select('parti, rm, voteringar, andel')),
    rader<Reservationsrad>(
      klient.from('parti_reservation_rm')
        .select('parti, rm, reservationer, gemensamma, andel_gemensamma')),
    // De två breda vyerna läses i block. parti_manad är åtta partier gånger
    // varje månad kammaren arbetat, utskott_linje sexton utskott gånger åtta
    // partier gånger varje riksmöte — 352 och 504 rader i dag, alltså halvvägs
    // till PostgREST:s takgräns, som kapar tyst. Ett riksmöte till och de
    // närmar sig den utan att något går sönder.
    allaRader<Manadsrad>((fran, till) =>
      klient.from('parti_manad')
        .select('parti, manad, reservationer, anforanden')
        .order('manad')
        .range(fran, till)),
    rader<Volymrad>(klient.from('riksmote_volym').select('*').order('rm')),
    allaRader<Utskottsrad>((fran, till) =>
      klient.from('utskott_linje')
        .select('organ, rm, parti, voteringar, andel')
        .order('organ')
        .order('rm')
        .order('parti')
        .range(fran, till)),
    rader<Stickprovsrad>(
      klient.from('reservation')
        .select('bet_dok_id, beteckning, nummer, rubrik, partier')
        .eq('rm', STICKPROV.rm)
        .eq('beteckning', STICKPROV.beteckning)),
    // Texten hämtas inte. Kortet namnger debatten och länkar till riksdagens
    // protokoll — 43 MB anförandetext ligger i databasen som verifierings-
    // underlag, och ska inte gå genom en sidrendering för tre citat.
    rader<Sjalvforklaring>(
      klient.from('anforande')
        .select('anforande_id, talare, parti, datum, avsnittsrubrik, rel_dok_id')
        .in('anforande_id', SJALVFORKLARINGAR.ids)),
    // Det svagare instrumentet, för invändningskortet. 32 rader: åtta partier
    // gånger fyra riksmöten, nollrader bevarade.
    rader<Yttranderad>(klient.from('parti_yttrande_rm').select('parti, rm, yttranden')),
  ])

  // PostgREST skickar numeric som sträng och bigint som tal. Att blanda dem i
  // en sortering ger en tyst felaktig ordning, så allt görs om här.
  return {
    linjer: linjer.map((l) => ({ ...l, andel: Number(l.andel), voteringar: Number(l.voteringar) })),
    reservationer: reservationer.map((r) => ({
      ...r,
      reservationer: Number(r.reservationer),
      gemensamma: Number(r.gemensamma),
      andel_gemensamma: r.andel_gemensamma === null ? null : Number(r.andel_gemensamma),
    })),
    manader: manader.map((m) => ({
      ...m,
      reservationer: Number(m.reservationer),
      anforanden: Number(m.anforanden),
    })),
    volym: volym.map((v) => ({
      ...v,
      betankanden: Number(v.betankanden),
      forslagspunkter: Number(v.forslagspunkter),
      voteringar: Number(v.voteringar),
      reservationer: Number(v.reservationer),
      utan_parti: Number(v.utan_parti),
      anforanden: Number(v.anforanden),
    })),
    utskottsrader: utskottsrader.map((u) => ({
      ...u,
      andel: Number(u.andel),
      voteringar: Number(u.voteringar),
    })),
    // Sorteras i JS: `nummer` är text i databasen, och PostgREST sorterar den
    // som text. Reservation 10 hade hamnat före reservation 2.
    stickprov: stickprov
      .filter((s) => s.partier?.includes(STICKPROV.parti))
      .sort((a, b) => Number(a.nummer) - Number(b.nummer)),
    // Kronologiskt, inte i den ordning id:na råkar stå i konstanten.
    sjalvforklaringar: [...sjalvforklaringar].sort((a, b) => a.datum.localeCompare(b.datum)),
    yttranden: yttranden.map((y) => ({ ...y, yttranden: Number(y.yttranden) })),
  }
}

export default async function Blocken() {
  const d = await hamta()

  const riksmoten = [...new Set(d.linjer.map((l) => l.rm))].sort()
  const senaste = riksmoten[riksmoten.length - 1]
  const foregaende = riksmoten[riksmoten.length - 2]
  const period = `${riksmoten[0]?.slice(0, 4)}–20${senaste?.slice(5)}`

  const res = (parti: string, rm: string) =>
    d.reservationer.find((r) => r.parti === parti && r.rm === rm)
  const linje = (parti: string, rm: string) =>
    d.linjer.find((l) => l.parti === parti && l.rm === rm)

  /**
   * Vilket parti sidan handlar om räknas fram, det står inte i koden.
   *
   * Brottet är det största relativa fallet i antal reservationer mellan de två
   * sista riksmötena, bland de partier som faktiskt reserverade sig året före.
   * Skrivs partiet in i stället blir sidan osann den dag datan säger något
   * annat — och en sajt som pekar ut ett parti i sin källkod tar ställning i
   * gränssnittet, vilket är precis vad den här sidan inte får göra.
   */
  const brottet = PARTIER
    .map((parti) => {
      const nu = res(parti, senaste)?.reservationer ?? 0
      const forr = res(parti, foregaende)?.reservationer ?? 0
      return { parti, nu, forr, kvot: forr > 0 ? nu / forr : 1 }
    })
    .filter((f) => f.forr >= VOLYMGRANS)
    .sort((a, b) => a.kvot - b.kvot)[0]

  if (!brottet || !senaste || !foregaende) {
    throw new Error('Underlaget saknar de riksmöten sidan jämför')
  }

  /**
   * Bytte partiet bara instrument?
   *
   * Ett särskilt yttrande markerar avvikande uppfattning utan att opponera mot
   * beslutet. Ett regeringsunderlag som fortfarande har invändningar men inte
   * vill fälla sin egen regering skulle rimligen ta det steget, och då vore
   * reservationsfallet ett byte av kanal och inte en tystnad.
   *
   * Det går att pröva, och slutsatsen räknas fram här i stället för att skrivas
   * in: `bytteKanal` är sant bara om partiets yttranden faktiskt ökade. Vänder
   * datan vänder kortet.
   */
  const ytt = (parti: string, rm: string) =>
    d.yttranden.find((y) => y.parti === parti && y.rm === rm)?.yttranden ?? 0

  const yttrandeTabell = PARTIER
    .map((parti) => ({ parti, forr: ytt(parti, foregaende), nu: ytt(parti, senaste) }))
    .sort((a, b) => b.nu - a.nu)

  const bytteKanal = ytt(brottet.parti, senaste) > ytt(brottet.parti, foregaende)

  // Höll instrumentet ställningen hos de andra? Utan den jämförelsen säger
  // partiets eget fall ingenting — yttranden kunde ha gått ur bruk i kammaren.
  const andraSomOkade = yttrandeTabell
    .filter((p) => p.parti !== brottet.parti && p.forr >= 20 && p.nu >= p.forr)

  const andraMedVolym = yttrandeTabell.filter((p) => p.parti !== brottet.parti && p.forr >= 20)

  // Tidslinjen: partiets månader, beskurna till de två sista riksmötena.
  const serie = d.manader.filter((m) => m.parti === brottet.parti)
  const sistaManaden = manadsnummer(serie[serie.length - 1]?.manad ?? '1970-01-01')
  const fonstret = serie.filter((m) => manadsnummer(m.manad) > sistaManaden - FONSTER)

  // Regeringspartiernas spann över hela perioden. Det är den nivån som gör
  // talet i det mörka fältet läsbart.
  const styrande = d.reservationer.filter((r) =>
    REGERINGSPARTIERNA.some((p) => p === r.parti)).map((r) => r.reservationer)

  const reservationstak = Math.max(...d.reservationer.map((r) => r.reservationer))

  // Partier med tillräcklig volym för att en andel ska betyda något — i varje
  // riksmöte, inte i genomsnitt. Ett parti som skrev fyra reservationer under
  // ett år hamnar annars på 100 % gemensamma och ser ut att vara mest av alla.
  const skrivarna = PARTIER.filter((p) =>
    riksmoten.every((rm) => (res(p, rm)?.reservationer ?? 0) >= VOLYMGRANS))
    .sort((a, b) =>
      (res(b, senaste)?.andel_gemensamma ?? 0) - (res(a, senaste)?.andel_gemensamma ?? 0))

  // Lutningsdiagrammets partier, sorterade på det sista riksmötets värde.
  const lutning = [...PARTIER]
    .map((parti) => ({
      parti,
      namn: namn(parti),
      varden: riksmoten.map((rm) => linje(parti, rm)?.andel ?? 0),
    }))
    .sort((a, b) => b.varden[b.varden.length - 1] - a.varden[a.varden.length - 1])

  // Hur tätt de tre styrande partierna ligger, som mest, i ett enskilt
  // riksmöte. Meningen om att de är utbytbara ska bära ett mätt tal.
  const spridning = Math.max(...riksmoten.map((rm) => {
    const v = REGERINGSPARTIERNA.map((p) => linje(p, rm)?.andel ?? 0)
    return Math.max(...v) - Math.min(...v)
  }))

  // Utskotten, för frågan om förändringen ligger på ett visst sakområde.
  const utskotten = [...new Set(d.utskottsrader.map((u) => u.organ))]
    .map((organ) => {
      const rad = (rm: string) =>
        d.utskottsrader.find((u) => u.organ === organ && u.rm === rm && u.parti === brottet.parti)
      return { organ, forr: rad(foregaende), nu: rad(senaste) }
    })
    .filter((u) =>
      (u.forr?.voteringar ?? 0) >= UTSKOTTSGRANS && (u.nu?.voteringar ?? 0) >= UTSKOTTSGRANS)
    .map((u) => ({ organ: u.organ, forr: u.forr!.andel, nu: u.nu!.andel }))
    .sort((a, b) => a.forr - b.forr)

  // Två påståenden som annars hade stått som meningar i koden och blivit tyst
  // osanna vid nästa ETL-körning: att rörelsen är gemensam, och att den ligger
  // över alla utskott och inte på ett sakområde.
  const allaHogst = skrivarna.length > 0 && skrivarna.every((p) => {
    const varden = riksmoten.map((rm) => res(p, rm)?.andel_gemensamma ?? 0)
    return varden[varden.length - 1] === Math.max(...varden)
  })
  const allaUtskottUpp = utskotten.length > 0 && utskotten.every((u) => u.nu > u.forr)

  // Nämnaren skrivs bara ut som gemensam om den faktiskt är det. Att läsa den
  // ur ett partis rad och påstå den om de sju andra är ett påstående, inte ett
  // tal — och just den sortens mening blir tyst osann vid nästa körning.
  const namnare = [...new Set(PARTIER.map((p) => linje(p, senaste)?.voteringar ?? 0))]

  const senasteVolym = d.volym.find((v) => v.rm === senaste)
  const tidigare = d.volym.filter((v) => v.rm !== senaste)
  // Invändningen "är sista riksmötet ofullständigt?" besvarades med en skriven
  // mening om att det är periodens största. Den prövas nu mot volymtabellen
  // som står tio rader längre ned — annars är det enda stället på sidan där ett
  // påstående inte följer datat det illustreras med.
  const storst = (falt: 'betankanden' | 'voteringar') =>
    !!senasteVolym && tidigare.every((v) => senasteVolym[falt] > v[falt])
  const senasteArStorst = storst('betankanden') && storst('voteringar')

  const manadsnamn = (iso: string) =>
    new Date(iso).toLocaleDateString('sv-SE', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <main>
      <section className="pb-12 pt-16">
        <Etikett className="stig" ton="signal">Analys · mandatperioden {period}</Etikett>
        <h1 className="display stig mt-6 text-[clamp(2.6rem,8vw,88px)]"
            style={{ animationDelay: '80ms' }}>
          Riksdagen delade sig i två block.
        </h1>
        <p className="stig mt-8 max-w-[58ch] text-[20px] leading-[1.5] sm:text-[22px]"
           style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}>
          Under mandatperiodens sista riksmöte rör sig partierna åt var sitt håll.
          Det syns i tre mått som mäter olika saker: hur ofta ett parti
          reserverar sig mot utskottets förslag, hur ofta det ändå röstar med
          förslaget, och hur ofta det skriver reservationer tillsammans med
          andra.
        </p>
        <p className="mt-4 max-w-[58ch] text-[16.5px] leading-[1.6]"
           style={{ color: 'var(--black-svag)' }}>
          {/* Stod tidigare som "mått … som inte påverkar varandra". De två
              första gör det: den som skrivit motförslaget röstar nej på det.
              Att skriva ut kopplingen är starkare än att förneka den. */}
          De två första hänger ihop mekaniskt i den enskilda voteringen — den
          som skrivit motförslaget röstar nej på det — så de är inte oberoende
          belägg för varandra.
        </p>
        <p className="mt-5 max-w-[58ch] text-[16.5px] leading-[1.6]"
           style={{ color: 'var(--black-svag)' }}>
          Sidan visar vad som hände. Den säger ingenting om varför. Varje tal är
          räknat ur riksdagens öppna data och går att räkna om ur samma underlag.
        </p>
      </section>

      <section className="regel py-16">
        <Etikett>Tidslinje</Etikett>
        <h2 className="rubrik mt-5 max-w-[20ch] text-[clamp(1.9rem,4.6vw,44px)]">
          Två kurvor som byter riktning samtidigt
        </h2>
        <p className="mt-5 max-w-[62ch] text-[16.5px] leading-[1.6]"
           style={{ color: 'var(--black-mjuk)' }}>
          {namn(brottet.parti)}s reservationer per månad, mot samma partis
          anföranden i kammaren, under riksmötena {foregaende} och {senaste}.
          De tomma fälten är månader då kammaren inte sammanträdde. En månad med
          en nolla är däremot en månad då den gjorde det, utan att partiet
          reserverade sig en enda gång.
        </p>

        <Tidslinje punkter={fonstret} uppat="Reservationer" nedat="Anföranden" />

        <Forbehall rubrik="Två mått ur två register." className="mt-10">
          En reservation är ett skriftligt motförslag i utskottet. Ett anförande
          är taltid i kammaren. Att det ena minskar samtidigt som det andra ökar
          är två observationer bredvid varandra, inte ett samband — datan kan
          inte visa att det ena orsakade det andra.
        </Forbehall>

        {/*
          Tabellrubriken står utanför den scrollande behållaren, inte i
          <caption>: en caption följer med tabellen i sidled och kapas då mitt i
          en mening på en smal skärm. Skärmläsaren får den ändå, som sr-only.
        */}
        <p className="mt-12 text-[14px]" style={{ color: 'var(--black-svag)' }}>
          {namn(brottet.parti)} per månad. Månader som saknas i tabellen saknas
          också i riksdagens data — kammaren sammanträdde inte.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[15px]">
            <caption className="sr-only">
              {namn(brottet.parti)}s reservationer och anföranden per månad.
            </caption>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--black)' }}>
                <th scope="col" className="etikett py-2.5 text-left">Månad</th>
                <th scope="col" className="etikett py-2.5 text-right">Reservationer</th>
                <th scope="col" className="etikett py-2.5 text-right">Anföranden</th>
              </tr>
            </thead>
            <tbody>
              {fonstret.map((m) => (
                <tr key={m.manad} style={{ borderBottom: '1px solid var(--linje)' }}>
                  <th scope="row" className="py-2.5 text-left font-medium">{manadsnamn(m.manad)}</th>
                  <td className="tabular py-2.5 text-right">{heltal(m.reservationer)}</td>
                  <td className="tabular py-2.5 text-right" style={{ color: 'var(--black-mjuk)' }}>
                    {heltal(m.anforanden)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sidans enda mörka fält. Lime får bara förekomma här. */}
      <section className="panel helbredd py-16 sm:py-20">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start gap-x-14 gap-y-8 px-5 sm:px-8">
          <div className="siffra text-[clamp(4.5rem,15vw,148px)]" style={{ color: 'var(--lime)' }}>
            {heltal(brottet.nu)}
          </div>
          <div className="min-w-[300px] flex-1">
            <p className="max-w-[30ch] text-[22px] font-medium leading-[1.35] sm:text-[26px]">
              Så många reservationer stod {namn(brottet.parti)} bakom under hela
              riksmötet {senaste}.
            </p>
            <p className="mt-6 max-w-[54ch] text-[16.5px] leading-[1.6]"
               style={{ color: 'var(--black-mjuk)' }}>
              Riksmötet dessförinnan blev det {heltal(brottet.forr)}.{' '}
              {lista(REGERINGSPARTIERNA.map(namn))}, som styr, skrev mellan{' '}
              {heltal(Math.min(...styrande))} och {heltal(Math.max(...styrande))} per
              riksmöte under hela perioden — de behöver inga, eftersom utskottets
              förslag redan är deras position. Det är mot de två nivåerna talet
              ska läsas. Summorna kommer ur samma register och är räknade på
              samma sätt: det här är aritmetik, inte en anklagelse.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <Etikett>Reservationer</Etikett>
        <h2 className="rubrik mt-5 max-w-[20ch] text-[clamp(1.9rem,4.6vw,44px)]">
          Reservationerna, parti för parti
        </h2>
        <p className="mt-5 max-w-[62ch] text-[16.5px] leading-[1.6]"
           style={{ color: 'var(--black-mjuk)' }}>
          En reservation är utskottsminoritetens eget förslag — det formella
          sättet att lägga ett alternativ på riksdagens bord. Tabellen visar hur
          många varje parti stod bakom, per riksmöte.
        </p>

        <p className="mt-10 text-[14px]" style={{ color: 'var(--black-svag)' }}>
          Antal reservationer partiet stod bakom, ensamt eller tillsammans med
          andra.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-[15px]">
            <caption className="sr-only">
              Antal reservationer per parti och riksmöte.
            </caption>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--black)' }}>
                <th scope="col" className="etikett py-2.5 text-left">Parti</th>
                {riksmoten.map((rm) => (
                  <th key={rm} scope="col" className="etikett py-2.5 text-right">{rm}</th>
                ))}
                <th scope="col" className="etikett py-2.5 pl-7 text-left">Förlopp</th>
              </tr>
            </thead>
            <tbody>
              {[...PARTIER]
                .sort((a, b) =>
                  (res(b, senaste)?.reservationer ?? 0) - (res(a, senaste)?.reservationer ?? 0))
                .map((parti) => (
                  <tr key={parti} style={{ borderBottom: '1px solid var(--linje)' }}>
                    <th scope="row" className="py-3 text-left font-medium">
                      <Link href={`/partier/${parti.toLowerCase()}`}
                            className="inline-flex items-center gap-2.5 hover:opacity-70">
                        <Partiprick parti={parti} storlek={10} />
                        {namn(parti)}
                      </Link>
                    </th>
                    {riksmoten.map((rm) => (
                      <td key={rm}
                          className={`tabular py-3 text-right ${rm === senaste ? 'font-semibold' : ''}`}
                          style={{ color: rm === senaste ? 'var(--black)' : 'var(--black-mjuk)' }}>
                        {heltal(res(parti, rm)?.reservationer ?? 0)}
                      </td>
                    ))}
                    <td className="py-3 pl-7">
                      <Gnista
                        varden={riksmoten.map((rm) => res(parti, rm)?.reservationer ?? 0)}
                        golv={0}
                        tak={reservationstak}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 max-w-[68ch] text-[13.5px] leading-[1.6]"
           style={{ color: 'var(--black-svag)' }}>
          Kurvorna delar skala, så att raderna går att jämföra med varandra.
          {' '}{lista(REGERINGSPARTIERNA.map(namn))} ligger nära noll hela
          perioden. Det är den nivån {namn(brottet.parti)} ligger på under{' '}
          {senaste}.
        </p>
      </section>

      <section className="regel py-16">
        <Etikett>Rörelsen</Etikett>
        <h2 className="rubrik mt-5 max-w-[20ch] text-[clamp(1.9rem,4.6vw,44px)]">
          Åt två håll samtidigt
        </h2>
        <p className="mt-5 max-w-[62ch] text-[16.5px] leading-[1.6]"
           style={{ color: 'var(--black-mjuk)' }}>
          Andel voteringar där partiets linje sammanföll med utskottets förslag,
          per riksmöte. Utskottets förslag ställs alltid som ja och reservationen
          som nej, så andelen är ett mått på hur ofta partiet hamnade på
          utskottets sida — inte på hur mycket partierna tycker lika.
        </p>

        <div className="mt-10">
          <Lutning rader={lutning} kolumner={riksmoten} />
        </div>

        <p className="mt-5 max-w-[74ch] text-[14.5px] leading-[1.55]"
           style={{ color: 'var(--black-svag)' }}>
          Linjerna som rört sig mer än tio procentenheter över perioden är
          kraftigare ritade. {lista(REGERINGSPARTIERNA.map(namn))} ligger inom{' '}
          {tal(spridning)} procentenheter från varandra i samtliga riksmöten, så
          ett fynd som namnger ett av dem gäller i praktiken alla tre.
        </p>

        <p className="mt-12 text-[14px]" style={{ color: 'var(--black-svag)' }}>
          Andel voteringar med utskottets förslag, per parti och riksmöte.
          {namnare.length === 1
            ? ` Nämnaren är densamma för alla åtta partier: ${heltal(namnare[0])} voteringar ${senaste}.`
            : ` Nämnaren ${senaste} varierar mellan partierna, från ${heltal(Math.min(...namnare))} till ${heltal(Math.max(...namnare))} voteringar.`}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-[15px]">
            <caption className="sr-only">
              Andel voteringar med utskottets förslag, per parti och riksmöte.
            </caption>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--black)' }}>
                <th scope="col" className="etikett py-2.5 text-left">Parti</th>
                {riksmoten.map((rm) => (
                  <th key={rm} scope="col" className="etikett py-2.5 text-right">{rm}</th>
                ))}
                <th scope="col" className="etikett py-2.5 text-right">Skillnad</th>
              </tr>
            </thead>
            <tbody>
              {lutning.map((l) => {
                const skillnad = l.varden[l.varden.length - 1] - l.varden[0]
                return (
                  <tr key={l.parti} style={{ borderBottom: '1px solid var(--linje)' }}>
                    <th scope="row" className="py-3 text-left font-medium">
                      <Link href={`/partier/${l.parti.toLowerCase()}`}
                            className="inline-flex items-center gap-2.5 hover:opacity-70">
                        <Partiprick parti={l.parti} storlek={10} />
                        {l.namn}
                      </Link>
                    </th>
                    {l.varden.map((v, i) => (
                      <td key={riksmoten[i]}
                          className={`tabular py-3 text-right ${i === l.varden.length - 1 ? 'font-semibold' : ''}`}
                          style={{ color: i === l.varden.length - 1 ? 'var(--black)' : 'var(--black-mjuk)' }}>
                        {tal(v)} %
                      </td>
                    ))}
                    <td className="tabular py-3 text-right" style={{ color: 'var(--black-mjuk)' }}>
                      {skillnad >= 0 ? '+' : '−'}{tal(Math.abs(skillnad))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Forbehall rubrik="Procedur, inte enighet." className="mt-8">
          Måttet räknar hur ofta partiets linje sammanföll med utskottets
          förslag i en votering. Partiets linje är det alternativ flest av dess
          närvarande ledamöter valde. Två partier kan rösta lika av rakt motsatta
          skäl, och ett parti kan rösta ja på ett förslag det helst hade sett
          annorlunda.{' '}
          <Link href="/metod#definitioner" className="underline hover:opacity-70">
            Så räknas linjen
          </Link>
        </Forbehall>
      </section>

      <section className="regel py-16">
        <Etikett>Motsatt riktning</Etikett>
        <h2 className="rubrik mt-5 max-w-[20ch] text-[clamp(1.9rem,4.6vw,44px)]">
          Oppositionen skrev ihop sig
        </h2>
        <p className="mt-5 max-w-[62ch] text-[16.5px] leading-[1.6]"
           style={{ color: 'var(--black-mjuk)' }}>
          Andel av partiets reservationer som det skrev tillsammans med minst ett
          annat parti. Tabellen visar partierna med minst {heltal(VOLYMGRANS)}{' '}
          reservationer i varje riksmöte — under den volymen svänger andelen på
          enstaka dokument och betyder ingenting.
        </p>

        <p className="mt-10 text-[14px]" style={{ color: 'var(--black-svag)' }}>
          Andel gemensamma reservationer, per parti och riksmöte.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-[15px]">
            <caption className="sr-only">
              Andel gemensamma reservationer, per parti och riksmöte.
            </caption>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--black)' }}>
                <th scope="col" className="etikett py-2.5 text-left">Parti</th>
                {riksmoten.map((rm) => (
                  <th key={rm} scope="col" className="etikett py-2.5 text-right">{rm}</th>
                ))}
                <th scope="col" className="etikett py-2.5 pl-7 text-left">Förlopp</th>
              </tr>
            </thead>
            <tbody>
              {skrivarna.map((parti) => (
                <tr key={parti} style={{ borderBottom: '1px solid var(--linje)' }}>
                  <th scope="row" className="py-3.5 text-left font-medium">
                    <Link href={`/partier/${parti.toLowerCase()}`}
                          className="inline-flex items-center gap-2.5 hover:opacity-70">
                      <Partiprick parti={parti} storlek={10} />
                      {namn(parti)}
                    </Link>
                  </th>
                  {riksmoten.map((rm) => (
                    <td key={rm}
                        className={`tabular py-3.5 text-right ${rm === senaste ? 'font-semibold' : ''}`}
                        style={{ color: rm === senaste ? 'var(--black)' : 'var(--black-mjuk)' }}>
                      {tal(res(parti, rm)?.andel_gemensamma ?? 0)} %
                    </td>
                  ))}
                  <td className="py-3.5 pl-7">
                    <Gnista
                      varden={riksmoten.map((rm) => res(parti, rm)?.andel_gemensamma ?? 0)}
                      golv={0}
                      tak={60}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {allaHogst && (
          <p className="mt-6 max-w-[68ch] text-[13.5px] leading-[1.6]"
             style={{ color: 'var(--black-svag)' }}>
            Varje parti i tabellen ligger högre {senaste} än i något tidigare
            riksmöte i perioden. Rörelsen är alltså gemensam, och inte ett
            enskilt partis.
          </p>
        )}
      </section>

      <section className="regel py-16">
        <Etikett>Prövning</Etikett>
        <h2 className="rubrik mt-5 max-w-[22ch] text-[clamp(1.9rem,4.6vw,44px)]">
          Invändningarna, prövade
        </h2>
        <p className="mt-5 max-w-[62ch] text-[16.5px] leading-[1.6]"
           style={{ color: 'var(--black-mjuk)' }}>
          Det här är sajtens mest laddade sida. Varje invändning som ligger nära
          till hands är därför räknad på, och svaren står här och inte i en
          kommentar någon annanstans.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/*
            Först, och över båda spalterna: det här är den invändning som ligger
            närmast till hands, och till skillnad från de tre andra kan sidan
            inte avfärda den. De övriga prövar om talen håller. Den här prövar
            om tolkningen gör det, och svaret är att materialet inte räcker.

            Att lägga den sist hade sett ut som en fotnot. Den ska stå först.
          */}
          <div className="p-8 md:col-span-2"
               style={{ border: '1px solid var(--linje-stark)', borderRadius: 8 }}>
            <h3 className="text-[21px] font-bold leading-[1.25] tracking-[-0.02em]">
              Är färre reservationer framgång i stället för tystnad?
            </h3>
            <div className="mt-4 grid max-w-[74ch] gap-4 text-[16px] leading-[1.6]"
                 style={{ color: 'var(--black-mjuk)' }}>
              <p>
                En reservation är per definition ett tecken på att partiet
                förlorade en förhandling i utskottet. Ett parti som går från
                opposition till regeringsunderlag får sina krav prövade tidigare
                — i regeringens proposition, innan betänkandet ens skrivs — och
                behöver då inte reservera sig. Under den läsningen är nedgången
                inflytande, inte tystnad, och ett regeringsunderlag som ständigt
                reserverade sig mot sin egen regering vore det udda.
              </p>
              <p>
                <strong style={{ color: 'var(--black)' }}>
                  Halva invändningen går att pröva.
                </strong>{' '}
                Ett parti som fortfarande har invändningar men inte vill fälla
                sin egen regering har ett svagare instrument till hands: det
                särskilda yttrandet, som markerar avvikande uppfattning utan
                att opponera mot beslutet. Hade {namn(brottet.parti)} bytt kanal
                skulle yttrandena ha ökat när reservationerna föll.{' '}
                {bytteKanal
                  ? `De ökade också, från ${heltal(ytt(brottet.parti, foregaende))} till ${heltal(ytt(brottet.parti, senaste))}, och kanalbytet är därmed den bättre förklaringen.`
                  : `Det gjorde de inte. De föll med, från ${heltal(ytt(brottet.parti, foregaende))} till ${heltal(ytt(brottet.parti, senaste))} — samtidigt som instrumentet var i fullt bruk hos ${lista(andraSomOkade.map((p) => namn(p.parti)))}, som alla skrev minst lika många ${senaste} som ${foregaende}. Båda kanalerna tystnade alltså samtidigt.`}
              </p>
              <p>
                <strong style={{ color: 'var(--black)' }}>
                  Den andra halvan går inte.
                </strong>{' '}
                Att kraven i stället fick sitt svar redan i regeringens
                proposition är fullt förenligt med tystnad i båda kanalerna —
                den som får sin vilja igenom i förväg behöver varken reservera
                sig eller yttra sig särskilt. Vad som står i propositionerna,
                och vilka krav som kom dit på vägen, finns inte i öppna data.
                Sidan påstår därför ingen orsak.
              </p>
            </div>

            {andraMedVolym.length > 0 && (
              <>
                <p className="mt-8 text-[14px]" style={{ color: 'var(--black-svag)' }}>
                  Särskilda yttranden per parti. Partier som skrev färre än
                  tjugo {foregaende} är utelämnade — under den volymen betyder
                  en förändring ingenting.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[380px] max-w-[480px] text-[15px]">
                    <caption className="sr-only">
                      Antal särskilda yttranden per parti, {foregaende} mot {senaste}.
                    </caption>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--linje-stark)' }}>
                        <th scope="col" className="etikett py-2 text-left">Parti</th>
                        <th scope="col" className="etikett py-2 text-right">{foregaende}</th>
                        <th scope="col" className="etikett py-2 text-right">{senaste}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...andraMedVolym, yttrandeTabell.find((p) => p.parti === brottet.parti)!]
                        .filter(Boolean)
                        .sort((a, b) => b.forr - a.forr)
                        .map((p) => {
                          const ifraga = p.parti === brottet.parti
                          return (
                            <tr key={p.parti} style={{ borderBottom: '1px solid var(--linje)' }}>
                              <th scope="row" className="py-2.5 text-left font-medium">
                                <span className="inline-flex items-center gap-2.5">
                                  <Partiprick parti={p.parti} storlek={10} />
                                  {namn(p.parti)}
                                </span>
                              </th>
                              <td className="tabular py-2.5 text-right"
                                  style={{ color: 'var(--black-mjuk)' }}>
                                {heltal(p.forr)}
                              </td>
                              <td className={`tabular py-2.5 text-right ${ifraga ? 'font-semibold' : ''}`}
                                  style={{ color: ifraga ? 'var(--black)' : 'var(--black-mjuk)' }}>
                                {heltal(p.nu)}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Anförandena står sist och tillsammans med sin egen mening.
                Tabellen ovan är mätningen; de här är vittnesmålen, och de två
                sorterna underlag ska inte flätas in i varandra. */}
            {d.sjalvforklaringar.length > 0 && (
              <p className="mt-9 max-w-[74ch] text-[16px] leading-[1.6]"
                 style={{ color: 'var(--black-mjuk)' }}>
                Att invändningen är värd att pröva syns också i att den kommer
                från partiet självt. I {d.sjalvforklaringar.length} debatter
                under {senaste} förklarar {namn(brottet.parti)}s företrädare i
                talarstolen varför partiet saknar reservationer i just det
                betänkandet — att förslagen de talar om ligger i regeringens
                proposition, eller att frågorna samordnas inom
                regeringsunderlaget.
              </p>
            )}

            {d.sjalvforklaringar.length > 0 && (
              <ul className="mt-6 flex flex-col gap-3">
                {d.sjalvforklaringar.map((a) => (
                  <li key={a.anforande_id}
                      className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pb-3 text-[15px]"
                      style={{ borderBottom: '1px solid var(--linje)' }}>
                    <span className="etikett">{datum(a.datum)}</span>
                    <span className="font-medium">{a.avsnittsrubrik}</span>
                    <span style={{ color: 'var(--black-svag)' }}>{a.talare}</span>
                    {a.rel_dok_id && (
                      <a
                        href={`https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/_${a.rel_dok_id}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[14px] font-semibold underline hover:opacity-70"
                        style={{ color: 'var(--accent)' }}
                      >
                        Betänkandet
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Måttet på vad de tre anförandena är värda står bredvid dem, inte
                i en fotnot längst ned. Tre träffar ur en fritextsökning är
                vittnesmål och ingen mätning, och läsaren ska veta det innan
                hen väger dem. */}
            <p className="mt-5 max-w-[74ch] text-[13.5px] leading-[1.55]"
               style={{ color: 'var(--black-svag)' }}>
              De tre anförandena är framsökta {datum(SJALVFORKLARINGAR.sokt)} med
              fritextsökning i ärendedebatterna, inte räknade fram. De visar att
              förklaringen ges, inte hur ofta den gäller — och de är alltså inte
              ett mått vid sidan av de andra på sidan.
            </p>
          </div>

          <div className="p-8" style={{ background: 'var(--papper-djup)', borderRadius: 8 }}>
            <h3 className="text-[21px] font-bold leading-[1.25] tracking-[-0.02em]">
              Är det sista riksmötet ofullständigt?
            </h3>
            <p className="mt-4 text-[16px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
              {senasteArStorst ? (
                <>
                  Nej — det är periodens största. Fler betänkanden och fler
                  voteringar än något tidigare riksmöte i perioden. Nedgången
                  ligger alltså i ett år med mer att reservera sig mot, inte i
                  ett hål i datan.
                </>
              ) : (
                <>
                  Volymen står i tabellen nedan, så jämför själv. Nedgången ska
                  läsas mot hur mycket riksmötet hade att reservera sig mot.
                </>
              )}{' '}
              {senasteVolym && (
                <>
                  {heltal(senasteVolym.utan_parti)} av{' '}
                  {heltal(senasteVolym.reservationer)} reservationer {senaste}{' '}
                  saknar partiuppgift.
                </>
              )}
            </p>
            <table className="mt-7 w-full text-[15px]">
              <caption className="sr-only">
                Antal betänkanden, voteringar och reservationer per riksmöte.
              </caption>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--linje-stark)' }}>
                  <th scope="col" className="etikett py-2 text-left">Riksmöte</th>
                  <th scope="col" className="etikett py-2 text-right">Betänk.</th>
                  <th scope="col" className="etikett py-2 text-right">Voteringar</th>
                  <th scope="col" className="etikett py-2 text-right">Reserv.</th>
                </tr>
              </thead>
              <tbody>
                {d.volym.map((v) => (
                  <tr key={v.rm} style={{ borderBottom: '1px solid var(--linje)' }}>
                    <th scope="row"
                        className={`py-2.5 text-left ${v.rm === senaste ? 'font-semibold' : 'font-medium'}`}>
                      {v.rm}
                    </th>
                    <td className="tabular py-2.5 text-right"
                        style={{ color: v.rm === senaste ? 'var(--black)' : 'var(--black-mjuk)' }}>
                      {heltal(v.betankanden)}
                    </td>
                    <td className="tabular py-2.5 text-right"
                        style={{ color: v.rm === senaste ? 'var(--black)' : 'var(--black-mjuk)' }}>
                      {heltal(v.voteringar)}
                    </td>
                    <td className="tabular py-2.5 text-right"
                        style={{ color: v.rm === senaste ? 'var(--black)' : 'var(--black-mjuk)' }}>
                      {heltal(v.reservationer)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {senasteVolym && tidigare.length > 0 && (
              <p className="mt-4 text-[13.5px] leading-[1.55]" style={{ color: 'var(--black-svag)' }}>
                {heltal(senasteVolym.betankanden)} betänkanden {senaste} mot{' '}
                {heltal(Math.min(...tidigare.map((v) => v.betankanden)))}–
                {heltal(Math.max(...tidigare.map((v) => v.betankanden)))} tidigare år.
              </p>
            )}
          </div>

          <div className="p-8" style={{ border: '1px solid var(--linje)', borderRadius: 8 }}>
            <h3 className="text-[21px] font-bold leading-[1.25] tracking-[-0.02em]">
              Ligger förändringen på ett visst sakområde?
            </h3>
            <p className="mt-4 text-[16px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
              Om förklaringen vore att ett enskilt område redan var
              färdigbehandlat borde rörelsen vara samlad där.{' '}
              {allaUtskottUpp
                ? `Den ligger i stället över samtliga ${utskotten.length} utskott som avgjorde minst ${UTSKOTTSGRANS} voteringar båda åren: alla ligger högre ${senaste} än ${foregaende}.`
                : `Utskotten som avgjorde minst ${UTSKOTTSGRANS} voteringar båda åren står i tabellen, sorterade på det lägsta värdet först.`}{' '}
              Talen gäller {namn(brottet.parti)}, och tabellen är sorterad på det
              tidigare årets värde.
            </p>
            <div className="mt-7 overflow-x-auto">
              <table className="w-full text-[15px]">
                <caption className="sr-only">
                  Andel voteringar med utskottets förslag, per utskott, för{' '}
                  {namn(brottet.parti)}.
                </caption>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--linje-stark)' }}>
                    <th scope="col" className="etikett py-2 text-left">Utskott</th>
                    <th scope="col" className="etikett py-2 text-right">{foregaende}</th>
                    <th scope="col" className="etikett py-2 text-right">{senaste}</th>
                  </tr>
                </thead>
                <tbody>
                  {utskotten.map((u) => (
                    <tr key={u.organ} style={{ borderBottom: '1px solid var(--linje)' }}>
                      <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                        {utskott(u.organ)}
                      </th>
                      <td className="tabular py-2.5 text-right" style={{ color: 'var(--black-mjuk)' }}>
                        {tal(u.forr)} %
                      </td>
                      <td className="tabular py-2.5 text-right font-semibold">{tal(u.nu)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-8 md:col-span-2" style={{ border: '1px solid var(--linje)', borderRadius: 8 }}>
            <h3 className="text-[21px] font-bold leading-[1.25] tracking-[-0.02em]">
              Stämmer talen mot riksdagens egna dokument?
            </h3>
            <p className="mt-4 max-w-[74ch] text-[16px] leading-[1.6]"
               style={{ color: 'var(--black-mjuk)' }}>
              Att räkna om ett tal ur den här databasen visar bara att
              aritmetiken stämmer. Ett stickprov är därför taget mot källan:
              betänkande {STICKPROV.rm}:{STICKPROV.beteckning}. Kontrollen{' '}
              {datum(STICKPROV.kontrollerat)} läste{' '}
              {heltal(STICKPROV.antal)} reservationer från{' '}
              {namn(STICKPROV.parti)} i riksdagens publicerade betänkande.{' '}
              {d.stickprov.length === STICKPROV.antal
                ? 'Databasen har exakt de reservationerna, och inga fler.'
                : `Databasen har nu ${heltal(d.stickprov.length)}. Talen går isär, och kontrollen behöver göras om innan kortet säger något.`}
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {d.stickprov.map((s) => (
                <li key={s.nummer}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pb-3 text-[15px]"
                    style={{ borderBottom: '1px solid var(--linje)' }}>
                  <span className="etikett">Reservation {s.nummer}</span>
                  <span className="font-medium">{s.rubrik}</span>
                </li>
              ))}
            </ul>
            {d.stickprov[0] && (
              <p className="mt-5 text-[14px]">
                <a
                  href={`https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/_${d.stickprov[0].bet_dok_id}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  Betänkandet hos riksdagen
                </a>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="regel py-16">
        <p className="max-w-[62ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          Alla tal på sidan är räknade ur riksdagens öppna data om betänkanden,
          reservationer, voteringar och anföranden. Måtten mäter beteende i
          kammaren och i utskotten, inte åsikter. Sidan påstår ingenting om
          orsaker.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Knapp href="/underlag" ton="sekundar">Ladda ned röstdatan</Knapp>
          <Knapp href="/metod#definitioner" ton="sekundar">Så räknas talen</Knapp>
        </div>
      </section>
    </main>
  )
}
