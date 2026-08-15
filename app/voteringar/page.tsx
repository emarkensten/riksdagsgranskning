import Link from 'next/link'
import { notFound } from 'next/navigation'
import { antal, db, datum, heltal, rader, rakna } from '@/lib/db'
import AMNEN from '@/lib/amnen.json'
import { Rostrad, Rostnyckel, type PartiRad } from '@/components/rostrad'

// Ingen revalidate: sidan läser searchParams och renderas därför alltid
// dynamiskt. En deklaration här hade sett ut som en cache som inte finns.

export const metadata = {
  title: 'Voteringarna — Riksdagsgranskning',
  description:
    'Varje votering med namnupprop i mandatperioden 2022–2026, förklarad på vanlig svenska: vad frågan gällde, vad ett ja innebar och vad ett nej innebar.',
}

const PER_SIDA = 40

type Sok = { amne?: string; q?: string; rm?: string; sida?: string }

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

  const [riksmoten, totalt] = await Promise.all([
    rader<{ rm: string }>(
      klient.from('riksmote_summering').select('rm').order('rm', { ascending: false })),
    // Hela listans storlek, oberoende av filtren. Heron påstår hur många
    // beslut sajten förklarar, och det talet får inte stå hårdkodat.
    rakna(antal(klient, 'votering_lista'), 'voteringar'),
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
    sidor,
    nr,
    riksmoten: riksmoten.map((r) => r.rm),
    valt: { amne: valtAmne, rm: valtRm, q: sok },
  }
}

/** Länk till en annan sida i samma sökning. Filtren måste följa med. */
function sidlank(valt: { amne?: string; rm?: string; q?: string }, sida: number) {
  const p = new URLSearchParams()
  if (valt.q) p.set('q', valt.q)
  if (valt.amne) p.set('amne', valt.amne)
  if (valt.rm) p.set('rm', valt.rm)
  if (sida > 1) p.set('sida', String(sida))
  const s = p.toString()
  return s ? `/voteringar?${s}` : '/voteringar'
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
  const filtrerat = Boolean(d.valt.amne || d.valt.rm || d.valt.q)
  const forsta = d.traffar === 0 ? 0 : (d.nr - 1) * PER_SIDA + 1
  const sista = Math.min(d.nr * PER_SIDA, d.traffar)

  return (
    <main className="pb-10">
      <section className="regel-tjock pt-8">
        <p className="stig text-[13px] uppercase tracking-[0.18em]"
           style={{ color: 'var(--accent)', animationDelay: '0ms' }}>
          Mandatperioden 2022–2026
        </p>
        <h1 className="display stig mt-5 text-[clamp(2.6rem,8vw,5.5rem)]"
            style={{ animationDelay: '80ms' }}>
          Varje beslut<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <p className="stig mt-7 max-w-[50ch] text-[17px] leading-relaxed"
           style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}>
          Riksdagen röstade om {heltal(d.totalt)} frågor med namnupprop. Var och
          en står här förklarad på vanlig svenska: vad frågan gällde, vad ett ja
          innebar och vad ett nej innebar.
        </p>
      </section>

      <form className="regel mt-12 flex flex-wrap items-end gap-x-6 gap-y-5 pt-7">
        <label className="flex-1 basis-56">
          <span className="block text-[12px] uppercase tracking-[0.12em]" style={{ color: 'var(--black-svag)' }}>
            Sök i sakfrågan
          </span>
          <input
            name="q"
            defaultValue={d.valt.q ?? ''}
            placeholder="t.ex. strandskydd"
            className="mt-1.5 w-full bg-transparent pb-1.5 text-[15px] outline-none"
            style={{ borderBottom: '1px solid var(--linje)' }}
          />
        </label>
        <label>
          <span className="block text-[12px] uppercase tracking-[0.12em]" style={{ color: 'var(--black-svag)' }}>
            Ämne
          </span>
          <select
            name="amne"
            defaultValue={d.valt.amne ?? ''}
            className="mt-1.5 bg-transparent pb-1.5 text-[15px] outline-none"
            style={{ borderBottom: '1px solid var(--linje)' }}
          >
            <option value="">alla ämnen</option>
            {[...AMNEN].sort((a, b) => a.localeCompare(b, 'sv')).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-[12px] uppercase tracking-[0.12em]" style={{ color: 'var(--black-svag)' }}>
            Riksmöte
          </span>
          <select
            name="rm"
            defaultValue={d.valt.rm ?? ''}
            className="mt-1.5 bg-transparent pb-1.5 text-[15px] outline-none"
            style={{ borderBottom: '1px solid var(--linje)' }}
          >
            <option value="">alla riksmöten</option>
            {d.riksmoten.map((rm) => (
              <option key={rm} value={rm}>{rm}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="border-b-2 pb-1 text-[14px] font-medium transition-opacity hover:opacity-60"
          style={{ borderColor: 'var(--accent)' }}
        >
          Visa
        </button>
        {filtrerat && (
          <Link href="/voteringar" className="pb-1 text-[14px] transition-opacity hover:opacity-60"
                style={{ color: 'var(--black-svag)' }}>
            Rensa
          </Link>
        )}
      </form>

      <div className="mt-7 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <Rostnyckel />
        {d.traffar > 0 && (
          <p className="tabular text-[13px]" style={{ color: 'var(--black-svag)' }}>
            Visar {heltal(forsta)}–{heltal(sista)} av {heltal(d.traffar)}
          </p>
        )}
      </div>

      <ol className="mt-3">
        {d.punkter.map((p) => {
          const roster = (p.votering_id && d.perVotering.get(p.votering_id)) || []
          return (
          <li key={p.forslagspunkt_id} className="regel py-5">
            <Link href={`/voteringar/${p.forslagspunkt_id}`} className="group block">
              <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] uppercase tracking-[0.1em]"
                   style={{ color: 'var(--black-svag)' }}>
                <span>{p.beteckning} · punkt {p.punkt}</span>
                <span>{datum(p.datum)}</span>
                <span style={{ color: 'var(--accent)' }}>{p.amne}</span>
                {p.sakerhet !== 'hög' && <span>osäker tolkning</span>}
              </div>
              <p className="mt-1.5 max-w-[68ch] text-[16px] leading-snug transition-opacity group-hover:opacity-60">
                {p.sakfraga}
              </p>
            </Link>
            {roster.length > 0 && (
              <div className="mt-3">
                <Rostrad rader={roster} />
              </div>
            )}
          </li>
          )
        })}
      </ol>

      {d.punkter.length === 0 && (
        <p className="regel py-12 text-[16px]" style={{ color: 'var(--black-svag)' }}>
          Inga voteringar matchade sökningen.{' '}
          <Link href="/voteringar" className="underline hover:opacity-60">Visa alla</Link>
        </p>
      )}

      {d.sidor > 1 && (
        <nav className="regel mt-2 flex items-center justify-between gap-4 pt-6 text-[14px]"
             aria-label="Sidnavigering">
          {d.nr > 1 ? (
            <Link href={sidlank(d.valt, d.nr - 1)} className="border-b pb-1 transition-opacity hover:opacity-60"
                  style={{ borderColor: 'var(--accent)' }}>
              ← Föregående
            </Link>
          ) : <span />}
          <span className="tabular" style={{ color: 'var(--black-svag)' }}>
            Sida {heltal(d.nr)} av {heltal(d.sidor)}
          </span>
          {d.nr < d.sidor ? (
            <Link href={sidlank(d.valt, d.nr + 1)} className="border-b pb-1 transition-opacity hover:opacity-60"
                  style={{ borderColor: 'var(--accent)' }}>
              Nästa →
            </Link>
          ) : <span />}
        </nav>
      )}
    </main>
  )
}
