import Link from 'next/link'
import { notFound } from 'next/navigation'
import { antal, db, datum, heltal, rader, rakna } from '@/lib/db'
import AMNEN from '@/lib/amnen.json'
import { Rostrad, Rostnyckel, type PartiRad } from '@/components/rostrad'
import { Chip } from '@/components/system'
import { Forstoringsglas } from '@/components/ikoner'

// Ingen revalidate: sidan läser searchParams och renderas därför alltid
// dynamiskt. En deklaration här hade sett ut som en cache som inte finns.

export const metadata = {
  title: 'Voteringarna — Riksdagsgranskning',
  description:
    'Varje votering med namnupprop i mandatperioden 2022–2026, förklarad på vanlig svenska: vad frågan gällde, vad ett ja innebar och vad ett nej innebar.',
}

const PER_SIDA = 40

type Sok = { amne?: string; q?: string; rm?: string; sida?: string }
type Valt = { amne?: string; rm?: string; q?: string }

type Rad = {
  forslagspunkt_id: number
  rm: string
  beteckning: string
  punkt: string
  votering_id: string | null
  datum: string
  sakfraga: string
  amne: string
  sakerhet: string
}

async function hamta({ amne, q, rm, sida }: Sok) {
  const klient = db()

  const [riksmoten, totalt, medRoster] = await Promise.all([
    rader<{ rm: string }>(
      klient.from('riksmote_summering').select('rm').order('rm', { ascending: false })),
    // Hela listans storlek, oberoende av filtren. Heron påstår hur många
    // beslut sajten förklarar, och det talet får inte stå hårdkodat.
    rakna(antal(klient, 'votering_lista'), 'voteringar'),
    // votering_lista är varje förslagspunkt med klarspråk — den filtrerar inte
    // på röstdata. jamn_votering har en rad per votering_id i parti_rost, alltså
    // de punkter som faktiskt fick protokollförda röster. Skillnaden är liten
    // (18 av 2 587) men den förklarar varför startsidan säger ett annat tal än
    // den här sidan, och då ska den stå utskriven i stället för att förvirra.
    rakna(antal(klient, 'jamn_votering'), 'voteringar med röstdata'),
  ])

  // Filtren valideras mot kända värden. Ett okänt ämne eller riksmöte ska ge
  // hela listan, inte noll träffar utan förklaring.
  const valtAmne = amne && AMNEN.includes(amne) ? amne : undefined
  const valtRm = rm && riksmoten.some((r) => r.rm === rm) ? rm : undefined
  const sok = q?.trim() || undefined
  // Golvas, inte bara klampas nedåt. Ett decimaltal skulle ge ett radfönster
  // som inte börjar på en sidgräns, och föras vidare in i sidlänkarna som
  // sida=3.7 → sida=4.7 — rader hoppas då över mellan sidor.
  const nr = Math.max(1, Math.floor(Number(sida)) || 1)

  /** Samma filter på både räkningen och sidhämtningen. */
  const filtrera = <T extends { eq: any; ilike: any }>(f: T): T => {
    let x: any = f
    if (valtAmne) x = x.eq('amne', valtAmne)
    if (valtRm) x = x.eq('rm', valtRm)
    if (sok) x = x.ilike('sakfraga', `%${sok}%`)
    return x
  }

  // Räknas före hämtningen. PostgREST svarar 416 när range() börjar bortom
  // sista raden, så sidnumret måste vara känt giltigt innan frågan ställs —
  // annars blir /voteringar?sida=999 ett 500-fel i stället för ett 404.
  const traffar = await rakna(filtrera(antal(klient, 'votering_lista')), 'voteringar')
  const sidor = Math.max(1, Math.ceil(traffar / PER_SIDA))
  if (nr > sidor) return null

  const punkter = await rader<Rad>(
    filtrera(
      klient.from('votering_lista')
        .select('forslagspunkt_id, rm, beteckning, punkt, votering_id, datum, sakfraga, amne, sakerhet'))
      // Datum, inte forslagspunkt_id: id-ordningen är importordning, och 2024/25
      // ligger på de lägsta id:na trots att det är periodens tredje riksmöte.
      .order('datum', { ascending: false })
      .order('forslagspunkt_id', { ascending: false })
      .range((nr - 1) * PER_SIDA, nr * PER_SIDA - 1))

  // Partiernas röster för de voteringar som faktiskt visas — som mest 40 rader
  // gånger åtta partier.
  const roster = await rader<PartiRad & { votering_id: string }>(
    klient.from('parti_rost').select('votering_id, parti, ja, nej, avstar, franvarande')
      .in('votering_id', punkter.map((p) => p.votering_id).filter(Boolean) as string[]))

  const perVotering = new Map<string, PartiRad[]>()
  for (const r of roster) {
    if (!perVotering.has(r.votering_id)) perVotering.set(r.votering_id, [])
    perVotering.get(r.votering_id)!.push(r)
  }

  return {
    punkter,
    perVotering,
    traffar,
    totalt,
    medRoster,
    sidor,
    nr,
    riksmoten: riksmoten.map((r) => r.rm),
    valt: { amne: valtAmne, rm: valtRm, q: sok } as Valt,
  }
}

/** Adress till samma sökning med ett filter eller sidnummer utbytt. */
function lank(valt: Valt, andring: Partial<Valt & { sida: number }>) {
  const slut = { ...valt, sida: 1, ...andring }
  const p = new URLSearchParams()
  if (slut.q) p.set('q', slut.q)
  if (slut.amne) p.set('amne', slut.amne)
  if (slut.rm) p.set('rm', slut.rm)
  if (slut.sida && slut.sida > 1) p.set('sida', String(slut.sida))
  const s = p.toString()
  return s ? `/voteringar?${s}` : '/voteringar'
}

/**
 * Sidnumren som ska synas: alltid första och sista, plus ett fönster runt den
 * aktuella. `null` är ett hopp och renderas som ett ellipstecken.
 */
function sidnummer(nr: number, sidor: number): (number | null)[] {
  const visa = new Set([1, sidor, nr - 1, nr, nr + 1])
  const lista = [...visa].filter((n) => n >= 1 && n <= sidor).sort((a, b) => a - b)
  return lista.flatMap((n, i) => (i > 0 && n - lista[i - 1] > 1 ? [null, n] : [n]))
}

export default async function Voteringar({
  searchParams,
}: {
  searchParams: Promise<Sok>
}) {
  const d = await hamta(await searchParams)
  // Ett sidnummer bortom sista sidan är inte en tom lista, det är en adress
  // som inte finns.
  if (!d) notFound()
  const forsta = d.traffar === 0 ? 0 : (d.nr - 1) * PER_SIDA + 1
  const sista = Math.min(d.nr * PER_SIDA, d.traffar)
  const amnen = [...AMNEN].sort((a, b) => a.localeCompare(b, 'sv'))

  return (
    <main>
      <section className="pb-8 pt-16">
        <h1 className="display stig text-[clamp(2.6rem,7.5vw,80px)]">
          {heltal(d.totalt)} beslut.
        </h1>
        <p
          className="stig mt-6 max-w-[50ch] text-[19px] leading-[1.5]"
          style={{ color: 'var(--black-mjuk)', animationDelay: '80ms' }}
        >
          Varje förslagspunkt riksdagen avgjorde, förklarad på vanlig svenska:
          vad frågan gällde, vad ett ja innebar och vad ett nej innebar.
        </p>
        {/* Startsidan säger 2 569 och den här sidan 2 587. Skillnaden är verklig
            och ska stå här, inte lämnas åt läsaren att upptäcka.

            Rösterna för de 18 ÄR hämtade — 349 rader var. De är bara av en annan
            sort: riksdagens fält `avser` säger 'motivfrågan', och parti_rost
            räknar bara 'sakfrågan'. Att kalla dem saknade vore fel. */}
        <p className="stig mt-4 max-w-[62ch] text-[13.5px] leading-[1.6]"
           style={{ color: 'var(--black-svag)', animationDelay: '80ms' }}>
          {heltal(d.medRoster)} av dem avgjordes med namnupprop om sakfrågan. För
          de {heltal(d.totalt - d.medRoster)} övriga gällde namnuppropet
          motiveringen — hur beslutet skulle motiveras, inte vad som beslutades.
          De rösterna säger inget om partiernas hållning i sakfrågan och räknas
          därför inte, så raderna visas utan partiernas linjer.
        </p>
      </section>

      {/* Sökfältet är ett vanligt GET-formulär. Filtren följer med som dolda
          fält, annars nollställs de av en sökning. */}
      <form className="flex flex-col gap-4 pb-7">
        {d.valt.amne && <input type="hidden" name="amne" value={d.valt.amne} />}
        {d.valt.rm && <input type="hidden" name="rm" value={d.valt.rm} />}
        <label
          className="flex max-w-[520px] items-center gap-3 rounded-full px-[22px] py-3.5"
          style={{ border: '1px solid var(--linje-stark)' }}
        >
          <span className="shrink-0" style={{ color: 'var(--black-svag)' }}>
            <Forstoringsglas storlek={18} />
          </span>
          <input
            name="q"
            defaultValue={d.valt.q ?? ''}
            placeholder="Sök på sakfråga, beteckning eller utskott"
            aria-label="Sök i sakfrågan"
            className="w-full bg-transparent text-[15.5px] outline-none placeholder:text-[var(--black-svag)]"
          />
          <button type="submit" className="sr-only">Sök</button>
        </label>

        <div className="flex flex-wrap items-stretch gap-2">
          <Chip href={lank(d.valt, { amne: undefined })} aktiv={!d.valt.amne}>Alla ämnen</Chip>
          {amnen.map((a) => (
            <Chip
              key={a}
              href={lank(d.valt, { amne: d.valt.amne === a ? undefined : a })}
              aktiv={d.valt.amne === a}
            >
              {a}
            </Chip>
          ))}
          <span aria-hidden className="mx-2 my-1 w-px shrink-0" style={{ background: 'var(--linje-stark)' }} />
          {d.riksmoten.map((rm) => (
            <Chip
              key={rm}
              href={lank(d.valt, { rm: d.valt.rm === rm ? undefined : rm })}
              aktiv={d.valt.rm === rm}
            >
              {rm}
            </Chip>
          ))}
        </div>
      </form>

      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pb-4">
        <Rostnyckel />
        {d.traffar > 0 && (
          <p className="tabular text-[14px]" style={{ color: 'var(--black-svag)' }}>
            Visar {heltal(forsta)}–{heltal(sista)} av {heltal(d.traffar)}
          </p>
        )}
      </div>

      <ol>
        {d.punkter.map((p) => {
          const roster = (p.votering_id && d.perVotering.get(p.votering_id)) || []
          const ja = roster.reduce((n, r) => n + Number(r.ja), 0)
          const nej = roster.reduce((n, r) => n + Number(r.nej), 0)
          const avstar = roster.reduce((n, r) => n + Number(r.avstar), 0)
          return (
            <li key={p.forslagspunkt_id}>
              <Link
                href={`/voteringar/${p.forslagspunkt_id}`}
                // 356 px, inte designens 300: alla åtta partier ska rymmas på en
                // rad. Med 300 bryter etiketterna 6 + 2 och mönstret går förlorat.
                className="grid items-start gap-x-8 gap-y-4 py-6 transition-opacity duration-150 hover:opacity-70 md:grid-cols-[1fr_356px]"
                style={{ borderTop: '1px solid var(--linje)' }}
              >
                <div>
                  <div className="mono flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
                       style={{ color: 'var(--etikett)' }}>
                    <span>{p.beteckning} · punkt {p.punkt}</span>
                    <span>{datum(p.datum)}</span>
                    <span style={{ color: 'var(--accent)' }}>{p.amne}</span>
                    {p.sakerhet !== 'hög' && <span>osäker tolkning</span>}
                  </div>
                  <p className="mt-2.5 max-w-[56ch] text-[19px] font-semibold leading-[1.35] tracking-[-0.01em]">
                    {p.sakfraga}
                  </p>
                </div>
                {roster.length > 0 && (
                  <div className="flex flex-col gap-2.5 md:items-end">
                    <Rostrad rader={roster} kompakt />
                    <span className="tabular text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
                      {heltal(ja)} ja · {heltal(nej)} nej
                      {avstar > 0 && ` · ${heltal(avstar)} avstår`}
                    </span>
                  </div>
                )}
              </Link>
            </li>
          )
        })}
      </ol>

      {d.punkter.length === 0 && (
        <p className="regel py-14 text-[16.5px]" style={{ color: 'var(--black-svag)' }}>
          Inga voteringar matchade sökningen.{' '}
          <Link href="/voteringar" className="underline hover:opacity-70">Visa alla</Link>
        </p>
      )}

      {d.sidor > 1 && (
        <nav
          className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-7"
          style={{ borderTop: '1px solid var(--linje)' }}
          aria-label="Sidnavigering"
        >
          <span className="tabular text-[14px]" style={{ color: 'var(--black-svag)' }}>
            Visar {heltal(forsta)}–{heltal(sista)} av {heltal(d.traffar)}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {sidnummer(d.nr, d.sidor).map((n, i) =>
              n === null ? (
                <span key={`hopp-${i}`} className="px-1.5" style={{ color: 'var(--etikett)' }}>…</span>
              ) : n === d.nr ? (
                <span
                  key={n}
                  aria-current="page"
                  className="tabular rounded-full px-3.5 py-2.5 text-[14px] font-semibold"
                  style={{ background: 'var(--black)', color: 'var(--papper)' }}
                >
                  {n}
                </span>
              ) : (
                <Link
                  key={n}
                  href={lank(d.valt, { sida: n })}
                  className="tabular rounded-full px-3.5 py-2.5 text-[14px] transition-colors duration-150 hover:bg-[var(--papper-djup)]"
                  style={{ color: 'var(--black-mjuk)' }}
                >
                  {n}
                </Link>
              ),
            )}
            {d.nr < d.sidor && (
              <Link
                href={lank(d.valt, { sida: d.nr + 1 })}
                className="ml-2 rounded-full px-[18px] py-2.5 text-[14px] font-semibold transition-colors duration-150 hover:bg-[var(--papper-djup)]"
                style={{ border: '1px solid var(--linje-stark)' }}
              >
                Nästa
              </Link>
            )}
          </div>
        </nav>
      )}
    </main>
  )
}
