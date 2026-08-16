import { PARTIFARG } from '@/lib/db'

/**
 * De tre diagrammen på /blocken.
 *
 * Alla tre är `aria-hidden` och upprepar tal som står i en tabell intill —
 * samma regel som `Stapel`. Ingen av dem bär alltså information som bara finns
 * i formen, och ingen av dem behöver därför färg för att gå att läsa.
 *
 * Partifärgerna förekommer bara i etiketternas fyrkanter, aldrig i kurvorna
 * själva. En kurva i partifärg hade dels fallit under 3:1 mot pappret för
 * flera av partierna, dels gjort diagrammet till en yta där sajten färglägger
 * partier — och det är precis vad formspråket förbjuder.
 */

export type Manadspunkt = {
  /** Alltid den första i månaden: '2025-09-01'. */
  manad: string
  reservationer: number
  anforanden: number
}

/** Löpande månadsnummer, så att ett obrutet spann går att räkna fram. */
export function manadsnummer(iso: string) {
  const [ar, manad] = iso.split('-').map(Number)
  return ar * 12 + (manad - 1)
}

/**
 * Två serier kring en gemensam axel, en månad per stapel.
 *
 * Månader som saknas i underlaget ritas som ett tomt fält och inte som en
 * nolla. Skillnaden är hela poängen: i juli sammanträder inte kammaren, och en
 * nolla där hade påstått att partiet lät bli att reservera sig.
 *
 * Spannet räknas fram ur första och sista månaden i stället för ur radernas
 * ordning, så att glappen får plats. Utan det hade juli och augusti klämts
 * ihop till ingenting och kurvan sett obruten ut.
 */
export function Tidslinje({
  punkter,
  uppat,
  nedat,
}: {
  punkter: Manadspunkt[]
  uppat: string
  nedat: string
}) {
  if (punkter.length === 0) return null

  const forsta = manadsnummer(punkter[0].manad)
  const sista = manadsnummer(punkter[punkter.length - 1].manad)
  const karta = new Map(punkter.map((p) => [manadsnummer(p.manad), p]))
  const platser = Array.from({ length: sista - forsta + 1 }, (_, i) => ({
    n: forsta + i,
    punkt: karta.get(forsta + i),
  }))

  const maxRes = Math.max(...punkter.map((p) => p.reservationer))
  const maxAnf = Math.max(...punkter.map((p) => p.anforanden))

  // Staplarna får bara 86 % av halvans höjd. Resten är plats åt talet ovanför
  // den högsta stapeln, som annars hade klippts av behållarens kant.
  const hojd = (varde: number, tak: number) => (tak > 0 ? (varde / tak) * 86 : 0)

  // Halvans höjd står på ett ställe och sätts som inline-stil, inte som
  // utility: staplarnas behållare och glappets fyllning måste vara exakt lika
  // höga, annars hoppar axeln upp och ned vid varje uppehåll.
  const HALVA = 'clamp(76px, 15vw, 124px)'
  /** 3 px luft, 1 px axel, 3 px luft. */
  const AXEL = 7

  return (
    <div className="mt-9">
      <div className="mb-7 flex flex-wrap gap-x-7 gap-y-2.5 text-[13.5px]"
           style={{ color: 'var(--black-mjuk)' }}>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3.5 w-3.5 rounded-[2px]"
                style={{ background: 'var(--accent)' }} />
          {uppat}, uppåt
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3.5 w-3.5 rounded-[2px]"
                style={{ background: 'var(--black-mjuk)' }} />
          {nedat}, nedåt
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-3.5 w-3.5 rounded-[2px]"
                style={{ background: 'var(--papper-djup)', border: '1px solid var(--linje)' }} />
          Uppehåll, ingen data
        </span>
      </div>

      <div aria-hidden className="flex items-stretch gap-[2px]">
        {platser.map(({ n, punkt }) => (
          <div key={n} className="flex flex-1 flex-col">
            <div className="relative flex flex-col justify-end" style={{ height: HALVA }}>
              {punkt ? (
                <>
                  {punkt.reservationer === maxRes && (
                    <span className="mono absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium"
                          style={{ bottom: `calc(${hojd(punkt.reservationer, maxRes)}% + 5px)` }}>
                      {punkt.reservationer}
                    </span>
                  )}
                  <div
                    className="w-full rounded-t-[2px]"
                    style={{
                      height: `${hojd(punkt.reservationer, maxRes)}%`,
                      minHeight: punkt.reservationer > 0 ? 2 : 0,
                      background: 'var(--accent)',
                    }}
                  />
                </>
              ) : (
                <div className="h-full w-full" style={{ background: 'var(--papper-djup)', borderInline: '1px solid var(--linje)' }} />
              )}
            </div>

            {/* Axeln går även genom uppehållen. Den mäter tid, och tiden går
                också i juli — det är serierna som saknas där, inte månaden.
                Luften omkring är vad som skiljer de två serierna åt; utan den
                lägger sig staplarna mot varandra och läses som en enda. */}
            <div className="flex items-center" style={{ height: AXEL }}>
              <div className="w-full" style={{ height: 1, background: 'var(--black)' }} />
            </div>

            <div className="relative" style={{ height: HALVA }}>
              {punkt ? (
                <>
                  <div
                    className="w-full rounded-b-[2px]"
                    style={{
                      height: `${hojd(punkt.anforanden, maxAnf)}%`,
                      minHeight: punkt.anforanden > 0 ? 2 : 0,
                      background: 'var(--black-mjuk)',
                    }}
                  />
                  {punkt.anforanden === maxAnf && (
                    <span className="mono absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium"
                          style={{ top: `calc(${hojd(punkt.anforanden, maxAnf)}% + 5px)` }}>
                      {punkt.anforanden}
                    </span>
                  )}
                </>
              ) : (
                <div className="h-full w-full" style={{ background: 'var(--papper-djup)', borderInline: '1px solid var(--linje)' }} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Årtalen sätts ut vid januari och centreras över sin plats. De är
          bredare än platsen och tillåts svämma över — i ett spann på ett par år
          finns det ändå bara ett par av dem. */}
      <div aria-hidden className="mt-2.5 flex h-4 gap-[2px]">
        {platser.map(({ n }) => (
          <div key={n} className="relative flex-1">
            {n % 12 === 0 && (
              <span className="etikett absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                {Math.floor(n / 12)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export type Lutningsrad = { parti: string; namn: string; varden: number[] }

/**
 * Tio procentenheter skiljer partier som rörde sig från partier som stod
 * still. Gränsen ligger i ett tomt band: närmast under den ligger 4,2
 * procentenheter, närmast över 16,6. Den avgör bara linjetjocklek — inget tal
 * och ingen rad faller bort — och vilka partier den träffar räknas ur datan,
 * inte ur en lista i koden.
 */
const RORELSE = 10

/**
 * Lutningsdiagram: ett värde per riksmöte, en linje per parti.
 *
 * Etiketterna placeras på sitt eget värdes höjd och skjuts sedan isär till
 * minst 19 enheters mellanrum, med en tunn förbindelselinje tillbaka till
 * kurvan. Utan det lägger sig Moderaterna, Liberalerna och Kristdemokraterna
 * ovanpå varandra — de skiljer sig åt med några tiondelar och skulle skriva
 * över varandras namn.
 *
 * Diagrammet ligger i en behållare som får scrolla i sidled. En viewBox som
 * krymper med fönstret hade tagit texten med sig ned till fyra pixlar.
 */
export function Lutning({
  rader,
  kolumner,
}: {
  rader: Lutningsrad[]
  kolumner: string[]
}) {
  const BREDD = 980
  const HOJD = 366
  const VANSTER = 92
  const HOGER = 636
  const TOPP = 26
  const BOTTEN = 316
  const RADAVSTAND = 19

  const y = (v: number) => BOTTEN - (v / 100) * (BOTTEN - TOPP)
  const x = (i: number) =>
    kolumner.length < 2 ? VANSTER : VANSTER + (i * (HOGER - VANSTER)) / (kolumner.length - 1)

  const linjer = rader.map((r) => {
    const forst = r.varden[0]
    const sist = r.varden[r.varden.length - 1]
    return { ...r, sist, rorde: Math.abs(sist - forst) >= RORELSE }
  })

  let forra = -Infinity
  const etiketter = [...linjer]
    .sort((a, b) => y(a.sist) - y(b.sist))
    .map((l) => {
      const plats = Math.max(y(l.sist), forra + RADAVSTAND)
      forra = plats
      return { ...l, y: y(l.sist), plats }
    })

  return (
    <div className="overflow-x-auto">
      <svg
        aria-hidden
        viewBox={`0 0 ${BREDD} ${HOJD}`}
        className="block w-full min-w-[720px]"
      >
        <g stroke="var(--linje)" strokeWidth={1}>
          {[0, 50, 100].map((v) => (
            <line key={v} x1={VANSTER} y1={y(v)} x2={HOGER} y2={y(v)} />
          ))}
          {kolumner.map((k, i) => (
            <line key={k} x1={x(i)} y1={TOPP} x2={x(i)} y2={BOTTEN} />
          ))}
        </g>

        <g className="mono" fontSize={11.5} fill="var(--etikett)">
          {[0, 50, 100].map((v) => (
            <text key={v} x={8} y={y(v) + 4}>
              {v} %
            </text>
          ))}
          {kolumner.map((k, i) => (
            <text key={k} x={x(i)} y={BOTTEN + 26} textAnchor="middle" letterSpacing="1">
              {k}
            </text>
          ))}
        </g>

        {linjer.map((l) => (
          <polyline
            key={l.parti}
            points={l.varden.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            fill="none"
            stroke={l.rorde ? 'var(--black)' : 'var(--black-svag)'}
            strokeWidth={l.rorde ? 2.6 : 1.4}
            strokeLinejoin="round"
          />
        ))}

        {linjer
          .filter((l) => l.rorde)
          .map((l) =>
            l.varden.map((v, i) => (
              <circle key={`${l.parti}${i}`} cx={x(i)} cy={y(v)} r={3.6} fill="var(--black)" />
            )),
          )}

        {etiketter.map((e) => (
          <g key={e.parti}>
            <line
              x1={HOGER + 3}
              y1={e.y}
              x2={HOGER + 17}
              y2={e.plats}
              stroke="var(--linje-stark)"
              strokeWidth={1}
            />
            <rect
              x={HOGER + 21}
              y={e.plats - 5}
              width={10}
              height={10}
              rx={2}
              fill={PARTIFARG[e.parti] ?? 'var(--linje-stark)'}
            />
            <text
              x={HOGER + 37}
              y={e.plats + 4}
              fontSize={14}
              fontWeight={e.rorde ? 700 : 400}
              fill={e.rorde ? 'var(--black)' : 'var(--black-mjuk)'}
            >
              {e.namn}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/**
 * Fyra värden som en liten kurva i en tabellrad.
 *
 * Skalan kommer utifrån och är gemensam för alla rader — en kurva som
 * normaliseras mot sitt eget spann får varje rad att se ut som samma
 * dramatiska rörelse.
 */
export function Gnista({
  varden,
  golv,
  tak,
}: {
  varden: number[]
  golv: number
  tak: number
}) {
  const BREDD = 168
  const HOJD = 32
  const steg = varden.length > 1 ? BREDD / (varden.length - 1) : 0
  const y = (v: number) =>
    HOJD - 3 - ((v - golv) / Math.max(1, tak - golv)) * (HOJD - 8)

  return (
    <svg aria-hidden viewBox={`0 0 ${BREDD} ${HOJD}`} width={BREDD} height={HOJD} className="block">
      <line x1={0} y1={HOJD - 1} x2={BREDD} y2={HOJD - 1} stroke="var(--spar)" strokeWidth={1} />
      <polyline
        points={varden.map((v, i) => `${i * steg},${y(v)}`).join(' ')}
        fill="none"
        stroke="var(--black)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx={(varden.length - 1) * steg} cy={y(varden[varden.length - 1])} r={3} fill="var(--black)" />
    </svg>
  )
}
