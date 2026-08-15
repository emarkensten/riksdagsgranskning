import Link from 'next/link'
import { db, namn, tal } from '@/lib/db'
import { Linjeetikett } from '@/components/rostrad'

export const revalidate = 3600

export const metadata = {
  title: 'Var är riksdagen oenig? — Riksdagsgranskning',
  description:
    'Enigheten i riksdagen, ämne för ämne. Alla 28 partipar mätta likadant över 2 569 voteringar.',
}

type Amne = {
  amne: string
  voteringar: number
  kammarens_enighet: number
  avvikande_1: string
  avvikande_2: string
  avvikande_har: number
  avvikande_normalt: number
  avvikande_delta: number
  lagsta_1: string
  lagsta_2: string
  lagsta: number
}

type Exempel = {
  amne: string
  forslagspunkt_id: number
  parti_1: string
  parti_2: string
  linje_1: string
  linje_2: string
  beteckning: string
  punkt: string
  datum: string
  sakfraga: string
}

/** Ankare i URL:en. Ämnesnamnen innehåller å, ä, ö och mellanslag. */
function ankare(amne: string) {
  return amne
    .toLowerCase()
    .replace(/å|ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function hamta() {
  const klient = db()
  // 16 respektive 48 rader — vyerna är dimensionerade för att rymmas i ett svar.
  const [{ data: amnen, error }, { data: exempel }] = await Promise.all([
    klient.from('amne_oversikt').select('*').order('kammarens_enighet'),
    klient.from('amne_exempel').select('*').order('datum', { ascending: false }),
  ])
  if (error) throw new Error(error.message)

  const talfalt = [
    'kammarens_enighet', 'avvikande_har', 'avvikande_normalt', 'avvikande_delta', 'lagsta',
  ] as const
  const rader: Amne[] = (amnen ?? []).map((a: any) => ({
    ...a,
    ...Object.fromEntries(talfalt.map((f) => [f, Number(a[f])])),
  }))

  const perAmne = new Map<string, Exempel[]>()
  for (const e of (exempel ?? []) as Exempel[]) {
    perAmne.set(e.amne, [...(perAmne.get(e.amne) ?? []), e])
  }

  return { rader, perAmne }
}

export default async function Amnen() {
  const { rader, perAmne } = await hamta()
  const mestOeniga = rader[0]
  // Summan, inte det största ämnet. Varje votering hör till exakt ett ämne, så
  // de 16 talen adderar till hela underlaget.
  const voteringar = rader.reduce((n, r) => n + r.voteringar, 0)

  return (
    <main className="pb-10">
      <section className="regel-tjock pt-8">
        <p className="text-[13px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Mandatperioden 2022–2026
        </p>

        <h1 className="display mt-5 max-w-[15ch] text-[clamp(2.6rem,8vw,5.5rem)]">
          Var är riksdagen oenig<span style={{ color: 'var(--accent)' }}>?</span>
        </h1>

        <p className="mt-7 max-w-[54ch] text-[17px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          För varje ämne mäts alla 28 partipar likadant: hur ofta de hamnade på
          samma linje. Talet nedan är genomsnittet — sannolikheten att två
          slumpvis valda partier röstade lika. Ingen höger–vänsteraxel, ingen
          viktning, inget parti utpekat i förväg.
        </p>
      </section>

      <section className="mt-14">
        <ol>
          {rader.map((r, i) => (
            <li key={r.amne} className={i === 0 ? 'regel-tjock' : 'regel'}>
              <Link
                href={`#${ankare(r.amne)}`}
                className="group flex flex-wrap items-baseline gap-x-5 gap-y-2 py-5 transition-opacity hover:opacity-60"
              >
                <span
                  className="display tabular w-[4.5ch] shrink-0 text-[clamp(2rem,5vw,3.2rem)] leading-none"
                  style={{ color: i < 3 ? 'var(--accent)' : 'var(--black)' }}
                >
                  {tal(r.kammarens_enighet)}
                </span>
                <span className="display min-w-[9ch] flex-1 text-[clamp(1.15rem,2.6vw,1.6rem)] leading-tight">
                  {r.amne}
                </span>
                <span
                  className="tabular basis-full text-[12px] uppercase tracking-[0.1em] sm:basis-auto"
                  style={{ color: 'var(--black-svag)' }}
                >
                  {r.voteringar.toLocaleString('sv-SE')} voteringar
                </span>
                <Spann lagsta={r.lagsta} medel={r.kammarens_enighet} />
              </Link>
            </li>
          ))}
        </ol>
        <p className="regel mt-1 max-w-[62ch] pt-4 text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Stapeln visar spannet i ämnet: från det mest oeniga partiparet till det
          mest eniga, som alltid ligger på 100 %. Strecket är genomsnittet för
          alla 28 par. En lång stapel betyder att kammaren spänner brett.
        </p>
      </section>

      <section className="regel-tjock mt-20 pt-8">
        <h2 className="display max-w-[20ch] text-[clamp(1.7rem,4.5vw,2.8rem)] leading-[1.05]">
          Riksdagen är minst enig om {mestOeniga?.amne}
          <span style={{ color: 'var(--accent)' }}>.</span>
        </h2>
        <p className="mt-5 max-w-[54ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Nedan bryts varje ämne ned till den skillnad som är störst i just det
          ämnet: paret som röstar mest olikt jämfört med hur de brukar rösta i
          alla frågor. Under varje ämne ligger de tre senaste voteringarna där
          paret faktiskt gick isär.
        </p>
      </section>

      {rader.map((r) => (
        <Amnesavsnitt key={r.amne} rad={r} exempel={perAmne.get(r.amne) ?? []} />
      ))}

      <section className="regel mt-20 pt-8">
        <h2 className="display text-2xl">Om måttet</h2>
        <div className="mt-4 grid max-w-[68ch] gap-4 text-[15px] leading-relaxed"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Ett partis linje i en votering är det alternativ flest av dess
            närvarande ledamöter valde. Underlaget är {voteringar.toLocaleString('sv-SE')} voteringar
            med namnupprop, alla från mandatperioden 2022–2026.
          </p>
          <p>
            <strong style={{ color: 'var(--black)' }}>
              Moderaterna, Kristdemokraterna och Liberalerna röstar lika i
              99,9–100 % av alla voteringar.
            </strong>{' '}
            När ett av dem namnges ovan gäller fyndet i praktiken alla tre —
            vilket av dem som hamnar i rubriken avgörs av tiondelar. Av samma
            skäl redovisas inte det mest eniga paret i varje ämne: det är alltid
            två av dessa tre, och alltid 100 %.
          </p>
          <p>
            Ämnesindelningen är gjord automatiskt utifrån utskottens förslag och
            reservationer. Ett ämne som <em>övrigt</em> samlar det som inte föll
            inom någon av de femton övriga.
          </p>
        </div>
      </section>
    </main>
  )
}

/** Spannet från det mest oeniga paret till 100 %, med genomsnittet som streck. */
function Spann({ lagsta, medel }: { lagsta: number; medel: number }) {
  return (
    <span
      className="relative block h-2 w-full shrink-0 sm:w-44 md:w-60"
      style={{ background: 'var(--papper-djup)' }}
      aria-hidden
    >
      <span
        className="absolute inset-y-0 block"
        style={{ left: `${lagsta}%`, right: 0, background: 'var(--black-svag)' }}
      />
      <span
        className="absolute inset-y-[-4px] block w-[3px]"
        style={{ left: `${medel}%`, background: 'var(--accent)' }}
      />
    </span>
  )
}

function Amnesavsnitt({ rad, exempel }: { rad: Amne; exempel: Exempel[] }) {
  const { avvikande_1: a, avvikande_2: b } = rad
  return (
    <section id={ankare(rad.amne)} className="regel mt-16 scroll-mt-6 pt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="display text-[clamp(1.5rem,3.4vw,2.2rem)]">{rad.amne}</h3>
        <span className="tabular text-[13px] uppercase tracking-[0.1em]"
              style={{ color: 'var(--black-svag)' }}>
          {rad.voteringar.toLocaleString('sv-SE')} voteringar · {tal(rad.kammarens_enighet)} % enighet
        </span>
      </div>

      <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <div className="display tabular text-[clamp(3rem,11vw,6.5rem)] leading-[0.85]"
               style={{ color: 'var(--accent)' }}>
            {tal(rad.avvikande_delta)}
          </div>
          <div className="mt-3 text-[12px] uppercase tracking-[0.12em]"
               style={{ color: 'var(--black-svag)' }}>
            procentenheter
          </div>
        </div>
        <p className="display max-w-[28ch] flex-1 text-[clamp(1.2rem,2.8vw,1.75rem)] leading-[1.12]">
          {namn(a)} och {namn(b)} röstade lika i {tal(rad.avvikande_har)} % av
          voteringarna om {rad.amne} — mot {tal(rad.avvikande_normalt)} % i
          alla frågor.
        </p>
      </div>

      <p className="mt-6 max-w-[62ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
        Största avvikelsen bland ämnets 28 partipar. Mest oeniga i absoluta tal:{' '}
        {namn(rad.lagsta_1)} och {namn(rad.lagsta_2)}, {tal(rad.lagsta)} %.
      </p>

      <ol className="mt-6">
        {exempel.map((e) => (
          <li key={e.forslagspunkt_id} className="regel py-4">
            <Link href={`/voteringar/${e.forslagspunkt_id}`} className="group block">
              <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] uppercase tracking-[0.1em]"
                   style={{ color: 'var(--black-svag)' }}>
                <span>{e.beteckning} · punkt {e.punkt}</span>
                <span>{e.datum}</span>
              </div>
              <p className="mt-1.5 max-w-[68ch] text-[16px] leading-snug transition-opacity group-hover:opacity-60">
                {e.sakfraga}
              </p>
            </Link>
            <div className="mt-3 flex items-center gap-1.5">
              <Linjeetikett parti={e.parti_1} linje={e.linje_1} />
              <Linjeetikett parti={e.parti_2} linje={e.linje_2} />
              <span className="ml-1 text-[12px]" style={{ color: 'var(--black-svag)' }}>
                {e.linje_1} mot {e.linje_2}
              </span>
            </div>
          </li>
        ))}
        {exempel.length === 0 && (
          <li className="regel py-4 text-[14px]" style={{ color: 'var(--black-svag)' }}>
            {a} och {b} hamnade aldrig på olika linje i det här ämnet.
          </li>
        )}
      </ol>
    </section>
  )
}
