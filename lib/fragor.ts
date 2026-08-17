import { db, rader } from '@/lib/db'
import type { PartiRad } from '@/components/rostrad'

/**
 * De nio valfrågor där en enda votering ordagrant matchar frågan.
 *
 * **Urvalet är SVT:s valkompass 2026, formuleringarna är sajtens egna.** Vi
 * lånar vilka frågor som ligger på bordet inför valet, aldrig hur de är
 * ställda — dels därför att kompassens texter är SVT:s, dels därför att en
 * kompassfråga är formulerad för att kunna besvaras på en skala medan en
 * votering är formulerad för att kunna vinnas. De två går inte att sätta
 * likhetstecken mellan, och sidorna försöker inte.
 *
 * **Varför nio och inte tjugofyra.** En första mätning sa att 24 av kompassens
 * 35 frågor hade en matchande votering. Ett pass med uppgift att motbevisa den
 * mätningen fällde 15 av 19 prövade påståenden. Grunderna var att en
 * utvärdering av X inte är X, att reduktionsplikt inte är bensinskatt, att en
 * anslagsnivå inte är ett uppdrag — och framför allt riktningen: av 30
 * granskade voteringar klarade ett tiotal ämnesprövningen men bara fem hade
 * entydig riktning.
 *
 * De 26 frågor som blev över är därför **oavgjorda, inte tomma**, och får
 * ingen sida. Att publicera "riksdagen har aldrig tagit ställning till detta"
 * vore en negation ingen har verifierat, och den är lättare att fälla än
 * någon av de nio påståenden som står kvar. En enda fälld sida smittar de
 * andra åtta.
 *
 * Rubrikerna är frågor därför att läsaren kommer med en fråga. Var och en är
 * skriven för att hålla mot voteringen den bygger på, inte för att låta
 * störst — se `statlig-sjukvard`, som handlar om att stoppa en utredning och
 * säger det i rubriken i stället för att lova ett avgjort huvudmannaskap.
 */
export type Fraga = {
  slug: string
  /** Sajtens egen formulering. Aldrig SVT:s text. */
  rubrik: string
  /**
   * Ett till tre ord, för chipset på startsidan.
   *
   * Egen sträng och inte en kapning av `rubrik`: chipset sätter
   * `whitespace-nowrap`, så nio hela frågor hade blivit en remsa flera
   * skärmbredder lång. De två fälten gör olika jobb — rubriken ska hålla ensam
   * i ett delningskort, chippet ska gå att skanna på en rad.
   */
  kort: string
  /** En mening om vad voteringen gällde. Ska gå att kontrollera mot ja/nej nedan. */
  ingress: string
  forslagspunkt: number
  /**
   * Den andra voteringen i samma sakfråga, när det finns en.
   *
   * Bara skogen har det: samma krav restes 2023 och igen 2026, av samma parti,
   * och föll båda gångerna. Sidorna länkar därför varandra i stället för att
   * låtsas vara oberoende — två träffar på samma ställningstagande är
   * svårare att vifta bort än en, och att dölja släktskapet vore det enda
   * sättet att göra dem angripbara.
   */
  syskon?: string
}

export const FRAGOR: Fraga[] = [
  {
    slug: 'nato',
    kort: 'Nato',
    rubrik: 'Skulle Sverige gå med i Nato?',
    ingress:
      'Anslutningen till Nato, Natos statusavtal och de lagändringar som följde av medlemskapet — allt avgjordes i en och samma punkt.',
    forslagspunkt: 4022,
  },
  {
    slug: 'permanent-uppehallstillstand',
    kort: 'Uppehållstillstånd',
    rubrik: 'Vilka regler ska gälla för permanent uppehållstillstånd?',
    ingress:
      'Vad som ska krävas för permanent uppehållstillstånd, och vad som ska räcka för att neka uppehållstillstånd eller utvisa någon.',
    forslagspunkt: 3557,
  },
  {
    slug: 'statlig-sjukvard',
    kort: 'Statlig sjukvård',
    rubrik: 'Skulle utredningen om statlig sjukvård stoppas?',
    ingress:
      'Om riksdagen skulle uppmana regeringen att avstå från att utreda ett statligt övertagande av sjukvården från regionerna.',
    forslagspunkt: 3107,
  },
  {
    slug: 'kommunalt-veto-vindkraft',
    kort: 'Vindkraft',
    rubrik: 'Ska kommunerna kunna stoppa vindkraft?',
    ingress:
      'Om kommunerna ska få behålla möjligheten att stoppa en vindkraftsetablering på sin mark.',
    forslagspunkt: 2932,
  },
  {
    slug: 'skydd-av-skog',
    kort: 'Skydd av skog',
    rubrik: 'Skulle avverkning i värdefull skog stoppas i lag?',
    ingress:
      'Om avverkning i skogar med höga naturvärden ska stoppas genom lagstiftning, och hur fjällnära skog ska få långsiktigt skydd.',
    forslagspunkt: 2716,
    syskon: 'friluftsskog',
  },
  {
    slug: 'reserverade-foraldradagar',
    kort: 'Föräldradagar',
    rubrik: 'Ska de reserverade föräldradagarna vara kvar?',
    ingress:
      'Om de dagar i föräldraförsäkringen som är reserverade för vardera föräldern ska behållas, avskaffas eller fördelas om.',
    forslagspunkt: 5463,
  },
  {
    slug: 'dca-avtalet',
    kort: 'DCA-avtalet',
    rubrik: 'Skulle permanenta utländska baser uteslutas?',
    ingress:
      'Om riksdagen skulle slå fast att DCA-avtalet med USA inte får leda till permanenta utländska baser eller stadigvarande allierad trupp i Sverige i fredstid.',
    forslagspunkt: 4674,
  },
  {
    slug: 'avgiftsfri-tandvard',
    kort: 'Tandvård',
    rubrik: 'Skulle åldersgränsen för avgiftsfri tandvård sänkas?',
    ingress:
      'Om regeringens förslag att sänka åldersgränserna för avgiftsfri tandvård och för statligt tandvårdsstöd skulle antas.',
    forslagspunkt: 2254,
  },
  {
    slug: 'friluftsskog',
    kort: 'Friluftsskog',
    rubrik: 'Ska friluftsskog prövas innan den avverkas?',
    ingress:
      'Om skog som är särskilt viktig för friluftsliv och rekreation ska prövas inför avverkning — och om avverkning i höga naturvärden ska stoppas i lag.',
    forslagspunkt: 8659,
    syskon: 'skydd-av-skog',
  },
]

export function fraga(slug: string) {
  return FRAGOR.find((f) => f.slug === slug)
}

const RAKNEORD = [
  'noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex',
  'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv',
]

/**
 * Små tal som ord: 9 → "nio".
 *
 * Finns därför att sidorna säger "nio frågor" i löpande text, och ordet skulle
 * annars stå skrivet för hand på fyra ställen. Faller en fråga vid en
 * granskning ska sidan sluta lova nio av sig själv — en hårdkodad mening blir
 * tyst osann, och just den här är sajtens känsligaste: hela dess trovärdighet
 * ligger i att den stannar vid det den kan belägga.
 *
 * Över tolv faller den tillbaka på siffran. Svenska räkneord blir
 * sammansättningar däröver, och en lista som växer förbi tolv är en annan
 * produkt än den här.
 */
export function rakneord(n: number) {
  return RAKNEORD[n] ?? String(n)
}

export type FragaData = {
  sakfraga: string
  ja_innebar: string
  nej_innebar: string
  amne: string
  sakerhet: string
  modell: string
  rm: string
  beteckning: string
  punkt: string
  datum: string
  betankande: string
  organ: string
  motforslag_nummer: string | null
  motforslag_partier: string[] | null
  roster: PartiRad[]
}

type Traff = {
  sakfraga: string
  ja_innebar: string
  nej_innebar: string
  amne: string
  sakerhet: string
  modell: string
  forslagspunkt: any
}

/**
 * Allt en frågesida behöver, i två frågor.
 *
 * Samma form som `hamta()` på voteringssidan, minus reservationstexterna och
 * debatten: frågesidan sammanfattar och länkar vidare, den upprepar inte
 * voteringssidan. Båda frågorna slår på indexerade nycklar och ligger långt
 * under anons tak på tre sekunder.
 */
export async function hamtaFraga(id: number): Promise<FragaData | null> {
  const klient = db()
  // maybeSingle() svarar med data: null både när raden saknas och när frågan
  // fallerar. Felet läses därför uttryckligen — de nio id:na är hårdkodade och
  // ska finnas, så ett bortfall är ett fel och inte en 404.
  const { data, error } = await klient
    .from('punkt_klartext')
    .select(
      'sakfraga, ja_innebar, nej_innebar, amne, sakerhet, modell, forslagspunkt!inner(rm, beteckning, punkt, votering_id, motforslag_nummer, motforslag_partier, betankande!inner(titel, organ, datum))',
    )
    .eq('forslagspunkt_id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  const t = data as unknown as Traff
  const f = Array.isArray(t.forslagspunkt) ? t.forslagspunkt[0] : t.forslagspunkt
  const b = Array.isArray(f.betankande) ? f.betankande[0] : f.betankande

  const roster = await rader<PartiRad>(
    klient
      .from('parti_rost')
      .select('parti, ja, nej, avstar, franvarande')
      .eq('votering_id', f.votering_id ?? ''),
  )

  return {
    sakfraga: t.sakfraga,
    ja_innebar: t.ja_innebar,
    nej_innebar: t.nej_innebar,
    amne: t.amne,
    sakerhet: t.sakerhet,
    modell: t.modell,
    rm: f.rm,
    beteckning: f.beteckning,
    punkt: f.punkt,
    datum: b?.datum ?? '',
    betankande: b?.titel ?? '',
    organ: b?.organ ?? '',
    motforslag_nummer: f.motforslag_nummer ?? null,
    motforslag_partier: f.motforslag_partier ?? null,
    roster,
  }
}

/**
 * Rösterna för alla nio frågor, i två frågor totalt.
 *
 * Indexsidan visar en röstrad per fråga, och nio separata anrop till
 * `hamtaFraga()` hade blivit arton rundresor för en sida som får plats i två.
 * Nyckeln i kartan är `slug`, så anroparen aldrig behöver para ihop
 * forslagspunkt-id med fråga för hand.
 */
export async function hamtaAllaFragor(): Promise<Map<string, AllaRad>> {
  const klient = db()
  const punkter = await rader<{ forslagspunkt_id: number; amne: string; forslagspunkt: any }>(
    klient
      .from('punkt_klartext')
      .select('forslagspunkt_id, amne, forslagspunkt!inner(votering_id, betankande!inner(datum))')
      .in('forslagspunkt_id', FRAGOR.map((f) => f.forslagspunkt)),
  )

  const platt = punkter.map((p) => {
    const f = Array.isArray(p.forslagspunkt) ? p.forslagspunkt[0] : p.forslagspunkt
    const b = Array.isArray(f.betankande) ? f.betankande[0] : f.betankande
    return { id: p.forslagspunkt_id, amne: p.amne, votering_id: f.votering_id as string | null, datum: b?.datum ?? '' }
  })

  const roster = await rader<PartiRad & { votering_id: string }>(
    klient
      .from('parti_rost')
      .select('votering_id, parti, ja, nej, avstar, franvarande')
      .in('votering_id', platt.map((p) => p.votering_id).filter(Boolean) as string[]),
  )

  const perVotering = new Map<string, PartiRad[]>()
  for (const r of roster) {
    if (!perVotering.has(r.votering_id)) perVotering.set(r.votering_id, [])
    perVotering.get(r.votering_id)!.push(r)
  }

  const karta = new Map<string, AllaRad>()
  for (const f of FRAGOR) {
    const p = platt.find((x) => x.id === f.forslagspunkt)
    if (!p) continue
    karta.set(f.slug, {
      amne: p.amne,
      datum: p.datum,
      roster: (p.votering_id && perVotering.get(p.votering_id)) || [],
    })
  }
  return karta
}

export type AllaRad = { amne: string; datum: string; roster: PartiRad[] }

/**
 * Utfallet, räknat ur rösterna.
 *
 * Utskottets förslag ställs alltid som ja och motförslaget som nej, så
 * `nej > ja` är utfallet. Fältet `forslagspunkt.vinnare` läses aldrig: det
 * innehåller även etiketterna 'bifall', 'Avslagen' och null för punkter som
 * utskottet faktiskt vann, och ger fem förluster där rätt svar är två.
 */
export function utfall(roster: PartiRad[]) {
  const summa = (v: keyof PartiRad) =>
    roster.reduce((n, r) => n + Number(r[v] as number), 0)
  const ja = summa('ja')
  const nej = summa('nej')
  const rostades = ja + nej > 0
  return {
    ja,
    nej,
    avstar: summa('avstar'),
    franvarande: summa('franvarande'),
    rostades,
    // Lika röstetal avgörs genom lottning. Det har inte inträffat i
    // underlaget, men får inte tyst hamna på motförslagets sida om det gör det.
    oavgjort: rostades && ja === nej,
    utskottetVann: rostades && ja > nej,
  }
}
