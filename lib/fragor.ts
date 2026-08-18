import { datum, db, lista, rader } from '@/lib/db'
import { PARTIER, linje, namn } from '@/lib/parti'
import { rakneord, storBokstav } from '@/lib/text'
import { utanStallningVerb, type Rostningsfraga } from '@/lib/rostning'
import type { PartiRad } from '@/components/rostrad'

/**
 * De nio valfrågor där en enda votering svarar mot frågan med entydig riktning.
 *
 * Inte "ordagrant matchar" — det ordet stod här och på indexsidan, och det är
 * ett falsifierbart överpåstående: sjukvårdsvoteringen gällde att stoppa en
 * utredning, DCA-voteringen en reservation om baser. På en sajt vars vallgrav
 * är att inget påstående faller ska inte urvalsbeskrivningen vara det första
 * som faller.
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

/**
 * PostgREST skriver en inbäddad relation som lista utan genererade typer,
 * men som objekt när `!inner` sitter på en till-en-relation. De tre
 * hämtningarna nedan packade upp den var för sig, med samma fem tecken.
 */
function forst<T>(v: T | T[]): T {
  return Array.isArray(v) ? v[0] : v
}

/** Rösterna grupperade per votering. Samma loop i alla hämtningar som läser flera. */
export function gruppera<T extends { votering_id: string }>(roster: T[]) {
  const karta = new Map<string, T[]>()
  for (const r of roster) {
    if (!karta.has(r.votering_id)) karta.set(r.votering_id, [])
    karta.get(r.votering_id)!.push(r)
  }
  return karta
}

export function fraga(slug: string) {
  return FRAGOR.find((f) => f.slug === slug)
}

/**
 * Kompassen urvalet lånar sina frågor av.
 *
 * `ord` är den enda uppgiften på sajten som inte går att härleda ur databasen
 * — den är SVT:s, inte riksdagens, och kan bara kontrolleras mot källan. Just
 * därför står den här och inte inskriven i en mening: "nio av de trettiofem"
 * är sajtens känsligaste påstående om sig själv, och ett tal som bara finns i
 * löptext blir tyst osant den dagen kompassen ändras.
 *
 * Ordet och inte siffran, eftersom sidorna aldrig skriver den som siffra och
 * `rakneord()` stannar med flit vid tolv. Ett `antal: 35` bredvid hade varit
 * en andra stavning av samma faktum som ingen renderar — alltså exakt den
 * glidning konstanten finns för att stoppa.
 *
 * Talen från urvalsgranskningen (24 → 15 av 19 fällda → nio) står kvar i sin
 * mening i "Om urvalet". De hör ihop och betyder ingenting var för sig; att
 * lyfta ut ett av dem hit hade gett sken av en källa de tre inte delar.
 */
export const KOMPASS = {
  namn: 'SVT:s valkompass 2026',
  url: 'https://valkompass.svt.se',
  ord: 'trettiofem',
} as const

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
  const f = forst(t.forslagspunkt)
  const b = forst(f.betankande)

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
      .select(
        'forslagspunkt_id, amne, forslagspunkt!inner(votering_id, motforslag_partier, betankande!inner(datum))',
      )
      .in('forslagspunkt_id', FRAGOR.map((f) => f.forslagspunkt)),
  )

  const platt = punkter.map((p) => {
    const f = forst(p.forslagspunkt)
    const b = forst(f.betankande)
    return {
      id: p.forslagspunkt_id,
      amne: p.amne,
      votering_id: f.votering_id as string | null,
      datum: b?.datum ?? '',
      motforslag_partier: (f.motforslag_partier ?? null) as string[] | null,
    }
  })

  const roster = await rader<PartiRad & { votering_id: string }>(
    klient
      .from('parti_rost')
      .select('votering_id, parti, ja, nej, avstar, franvarande')
      .in('votering_id', platt.map((p) => p.votering_id).filter(Boolean) as string[]),
  )

  const perVotering = gruppera(roster)

  const karta = new Map<string, AllaRad>()
  for (const f of FRAGOR) {
    const p = platt.find((x) => x.id === f.forslagspunkt)
    if (!p) continue
    karta.set(f.slug, {
      amne: p.amne,
      datum: p.datum,
      motforslag_partier: p.motforslag_partier,
      roster: (p.votering_id && perVotering.get(p.votering_id)) || [],
    })
  }
  return karta
}

export type AllaRad = {
  amne: string
  datum: string
  motforslag_partier: string[] | null
  roster: PartiRad[]
}

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

/**
 * Allt quizet på `/rosta` behöver, i två frågor.
 *
 * Partilinjerna hämtas här och skickas som props — aldrig hårdkodade i
 * klienten. Uppmätt med `explain analyze` 2026-08-18: 15 ms för den första
 * frågan, rena index scans, alltså långt under anons tak på tre sekunder.
 *
 * Samma tvåfrågemönster som `hamtaAllaFragor()`, men en annan avkastning:
 * indexsidan vill ha råa röster och reservanter, quizet vill ha klarspråket
 * och de förräknade meningarna. Att slå ihop dem hade gett indexsidan tre
 * textstycken per fråga som den inte renderar, och quizet ett fält om
 * motförslagets undertecknare som det inte visar.
 *
 * **Kastar hellre än tappar en fråga.** De nio id:na är hårdkodade och ska
 * finnas; ett bortfall skulle annars ge ett quiz med åtta frågor där varje
 * "av nio" tyst blev osant.
 */
export async function hamtaRostning(): Promise<Rostningsfraga[]> {
  const klient = db()
  const punkter = await rader<{
    forslagspunkt_id: number
    sakfraga: string
    ja_innebar: string
    nej_innebar: string
    amne: string
    forslagspunkt: any
  }>(
    klient
      .from('punkt_klartext')
      .select(
        'forslagspunkt_id, sakfraga, ja_innebar, nej_innebar, amne, forslagspunkt!inner(votering_id, betankande!inner(datum))',
      )
      .in('forslagspunkt_id', FRAGOR.map((f) => f.forslagspunkt)),
  )

  const platt = punkter.map((p) => {
    const f = forst(p.forslagspunkt)
    const b = forst(f.betankande)
    return {
      id: p.forslagspunkt_id,
      sakfraga: p.sakfraga,
      ja_innebar: p.ja_innebar,
      nej_innebar: p.nej_innebar,
      amne: p.amne,
      votering_id: f.votering_id as string | null,
      datum: (b?.datum ?? '') as string,
    }
  })

  // Gruppen `-`, de partilösa, filtreras bort redan i frågan. Quizet jämför
  // besökaren med de åtta partierna, och en nionde etikett i röstraden hade
  // varit en jämförelse ingen bett om.
  const roster = await rader<PartiRad & { votering_id: string }>(
    klient
      .from('parti_rost')
      .select('votering_id, parti, ja, nej, avstar, franvarande')
      .in('votering_id', platt.map((p) => p.votering_id).filter(Boolean) as string[])
      .in('parti', [...PARTIER]),
  )

  const perVotering = gruppera(roster)

  return FRAGOR.map((f) => {
    const p = platt.find((x) => x.id === f.forslagspunkt)
    const rad = p?.votering_id ? perVotering.get(p.votering_id) : undefined
    if (!p || !rad?.length) {
      throw new Error(`Röstningen saknar underlag för ${f.slug} (${f.forslagspunkt})`)
    }
    return {
      slug: f.slug,
      rubrik: f.rubrik,
      amne: p.amne,
      datumtext: datum(p.datum),
      sakfraga: p.sakfraga,
      ja_innebar: p.ja_innebar,
      nej_innebar: p.nej_innebar,
      roster: rad,
      mening: { Ja: mening(rad, 'Ja'), Nej: mening(rad, 'Nej') },
    }
  })
}

/**
 * Meningen under röstraden, härledd ur rösterna.
 *
 * Räknas på servern därför att det bara finns två möjliga svar per fråga —
 * arton meningar totalt. Alternativet hade varit att sätta ihop dem i
 * webbläsaren, och då hade `lista()`, `namn()` och `rakneord()` behövt följa
 * med dit; de två första bor i `lib/db`, som drar in hela supabase-js.
 *
 * Partiord och inte `rakneord()` rakt av: *ett* parti, inte *en*. Räkneordet
 * finns för antal i allmänhet och känner inte till genus.
 */
function mening(roster: PartiRad[], svar: 'Ja' | 'Nej') {
  const linjer = PARTIER.map((parti) => ({ parti, linje: linje(roster, parti) }))
  const lika = linjer.filter((l) => l.linje === svar).length
  const utan = linjer.filter((l) => l.linje && l.linje !== 'Ja' && l.linje !== 'Nej')

  // "Ett parti", inte "en". rakneord() räknar och känner inte till genus.
  const inledning =
    lika === 0
      ? `Inget av de ${rakneord(PARTIER.length)} partierna röstade som du.`
      : `${lika === 1 ? 'Ett' : storBokstav(rakneord(lika))} av ${rakneord(PARTIER.length)} partier röstade som du.`

  if (!utan.length) return inledning
  const avstod = utan.filter((l) => l.linje === 'Avstår').length
  // Samma skillnad mellan avstående och frånvaro som resultatskärmen gör, och
  // därför samma funktion — den beskriver antalet, här beskrivs vilka.
  const verb = utanStallningVerb(utan.length, avstod)
  return `${inledning} ${lista(utan.map((l) => namn(l.parti)))} ${verb}.`
}
