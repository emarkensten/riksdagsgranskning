import Link from 'next/link'
import { db } from '@/lib/db'
import { Rostrad, Rostnyckel, type PartiRad } from '@/components/rostrad'

export const revalidate = 3600

type Sok = { amne?: string; q?: string }

async function hamta({ amne, q }: Sok) {
  const klient = db()

  let fraga = klient
    .from('punkt_klartext')
    .select(
      'forslagspunkt_id, sakfraga, amne, sakerhet, forslagspunkt!inner(id, beteckning, punkt, rubrik, votering_id, motforslag_partier, betankande!inner(titel, organ, datum))',
    )
    .order('forslagspunkt_id')
    .limit(120)

  if (amne) fraga = fraga.eq('amne', amne)
  if (q) fraga = fraga.ilike('sakfraga', `%${q}%`)

  const { data, error } = await fraga
  if (error) throw new Error(error.message)

  const punkter = (data ?? []) as any[]

  // Partiernas röster hämtas i en enda fråga mot vyn.
  const voteringsIder = punkter
    .map((p) => p.forslagspunkt?.votering_id)
    .filter(Boolean) as string[]
  const { data: roster } = await klient
    .from('parti_rost')
    .select('votering_id, parti, ja, nej, avstar, franvarande')
    .in('votering_id', voteringsIder.slice(0, 200))

  const perVotering = new Map<string, PartiRad[]>()
  for (const r of roster ?? []) {
    if (!perVotering.has(r.votering_id)) perVotering.set(r.votering_id, [])
    perVotering.get(r.votering_id)!.push(r as PartiRad)
  }

  const { data: amnen } = await klient.from('punkt_klartext').select('amne')
  const amnesLista = [...new Set((amnen ?? []).map((a) => a.amne).filter(Boolean))].sort()

  return { punkter, perVotering, amnesLista }
}

export default async function Voteringar({
  searchParams,
}: {
  searchParams: Promise<Sok>
}) {
  const sok = await searchParams
  const { punkter, perVotering, amnesLista } = await hamta(sok)

  return (
    <main className="pb-10">
      <div className="regel-tjock pt-8">
        <h1 className="display text-[clamp(2rem,5vw,3.2rem)]">Voteringar</h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Riksmötet 2024/25. Varje rad är en fråga kammaren röstade om.
        </p>
      </div>

      <form className="mt-7 flex flex-wrap items-end gap-x-6 gap-y-4">
        <label className="flex-1 basis-56">
          <span className="block text-[12px] uppercase tracking-[0.12em]" style={{ color: 'var(--black-svag)' }}>
            Sök i sakfrågan
          </span>
          <input
            name="q"
            defaultValue={sok.q ?? ''}
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
            defaultValue={sok.amne ?? ''}
            className="mt-1.5 bg-transparent pb-1.5 text-[15px] outline-none"
            style={{ borderBottom: '1px solid var(--linje)' }}
          >
            <option value="">alla</option>
            {amnesLista.map((a) => (
              <option key={a} value={a}>{a}</option>
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
      </form>

      <div className="mt-6">
        <Rostnyckel />
      </div>

      <ol className="mt-2">
        {punkter.map((p, i) => {
          const f = p.forslagspunkt
          const rader = perVotering.get(f?.votering_id ?? '') ?? []
          return (
            <li key={p.forslagspunkt_id} className="regel py-5">
              <Link href={`/voteringar/${p.forslagspunkt_id}`} className="group block">
                <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] uppercase tracking-[0.1em]"
                     style={{ color: 'var(--black-svag)' }}>
                  <span>{f?.beteckning} · punkt {f?.punkt}</span>
                  <span style={{ color: 'var(--accent)' }}>{p.amne}</span>
                  {p.sakerhet !== 'hög' && <span>osäker tolkning</span>}
                </div>
                <p className="mt-1.5 max-w-[68ch] text-[16px] leading-snug transition-opacity group-hover:opacity-60">
                  {p.sakfraga}
                </p>
              </Link>
              {rader.length > 0 && (
                <div className="mt-3">
                  <Rostrad rader={rader} />
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {punkter.length === 0 && (
        <p className="regel py-10 text-[15px]" style={{ color: 'var(--black-svag)' }}>
          Inga voteringar matchade sökningen.
        </p>
      )}
    </main>
  )
}
