import Link from 'next/link'
import { db, heltal, lista, namn, rader, tal, REGERINGSPARTIERNA } from '@/lib/db'
import { Linjeetikett } from '@/components/rostrad'
import { regeringsspann } from '@/lib/partier'

export const revalidate = 3600

export const metadata = {
  title: 'Var är riksdagen oenig? — Riksdagsgranskning',
  description:
    'Enigheten i riksdagen, ämne för ämne. Alla 28 partipar mätta likadant över varje votering med namnupprop 2022–2026.',
}

/**
 * Under så här många procentenheter räknas en avvikelse inte som ett fynd.
 *
 * Fördelningen faller jämnt från 23,0 ned till 9,5 och bryter sedan tvärt:
 * 3,0 och 1,1. De två sista får kompakta rader — en display-siffra på "1,1"
 * vore motsatsen till trovärdighet.
 */
const SVAG = 5

/** Antal ämnen vars exempel ligger öppna. Resten fälls ihop; sidan var 15 000 px. */
const OPPNA = 3

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
  const [amnen, exempel, likhetsspann] = await Promise.all([
    rader<Amne>(klient.from('amne_oversikt').select('*').order('kammarens_enighet')),
    rader<Exempel>(klient.from('amne_exempel').select('*').order('datum', { ascending: false })),
    regeringsspann(),
  ])

  const talfalt = [
    'kammarens_enighet', 'avvikande_har', 'avvikande_normalt', 'avvikande_delta', 'lagsta',
  ] as const
  const rows: Amne[] = amnen.map((a) => ({
    ...a,
    ...Object.fromEntries(talfalt.map((f) => [f, Number(a[f])])),
  })) as Amne[]

  const perAmne = new Map<string, Exempel[]>()
  for (const e of exempel) {
    perAmne.set(e.amne, [...(perAmne.get(e.amne) ?? []), e])
  }

  return {
    rader: rows,
    perAmne,
    likhetsspann,
  }
}

export default async function Amnen() {
  const { rader: rows, perAmne, likhetsspann } = await hamta()
  const mestOeniga = rows[0]
  // Summan, inte det största ämnet. Varje votering hör till exakt ett ämne, så
  // de 16 talen adderar till hela underlaget.
  const voteringar = rows.reduce((n, r) => n + r.voteringar, 0)

  // Avvikelsen mäts som avstånd från parets egen normalnivå, så tecknet är
  // alltid negativt. Storleken är det som betyder något.
  const starka = rows.filter((r) => Math.abs(r.avvikande_delta) >= SVAG)
  const svaga = rows.filter((r) => Math.abs(r.avvikande_delta) < SVAG)

  return (
    <main className="pb-10">
      <section className="regel-tjock pt-8">
        <p className="stig text-[13px] uppercase tracking-[0.18em]"
           style={{ color: 'var(--accent)', animationDelay: '0ms' }}>
          Mandatperioden 2022–2026
        </p>

        <h1 className="display stig mt-5 max-w-[15ch] text-[clamp(2.6rem,8vw,5.5rem)]"
            style={{ animationDelay: '80ms' }}>
          Var är riksdagen oenig<span style={{ color: 'var(--accent)' }}>?</span>
        </h1>

        <p className="stig mt-7 max-w-[54ch] text-[17px] leading-relaxed"
           style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}>
          För varje ämne mäts alla 28 partipar likadant: hur ofta de hamnade på
          samma linje. Talet nedan är genomsnittet — sannolikheten att två
          slumpvis valda partier röstade lika. Ingen höger–vänsteraxel, ingen
          viktning, inget parti utpekat i förväg.
        </p>
      </section>

      <section className="mt-14">
        <ol>
          {rows.map((r, i) => (
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
                  {heltal(r.voteringar)} voteringar
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
        <p className="mt-5 max-w-[56ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Nedan bryts varje ämne ned till den skillnad som är störst i just det
          ämnet: paret som röstar mest olikt jämfört med hur de brukar rösta i
          alla frågor. Underlaget är {heltal(voteringar)} voteringar, och varje
          votering hör till exakt ett ämne.
        </p>
      </section>

      {starka.map((r, i) => (
        <Amnesavsnitt
          key={r.amne}
          rad={r}
          exempel={perAmne.get(r.amne) ?? []}
          oppen={i < OPPNA}
        />
      ))}

      {svaga.length > 0 && (
        <section className="regel mt-20 pt-8">
          <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">
            {svaga.length === 1 ? 'Ett ämne saknar' : `${storBokstav(raknord(svaga.length))} ämnen saknar`} tydlig avvikelse
          </h2>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
            Här ligger det mest avvikande paret mindre än {SVAG} procentenheter
            från sin egen normalnivå. Det är för lite för att kalla ett mönster,
            och de får därför inga egna avsnitt — en jättesiffra på{' '}
            {tal(Math.min(...svaga.map((r) => Math.abs(r.avvikande_delta))))} vore
            motsatsen till trovärdighet.
          </p>
          <table className="mt-7 w-full max-w-2xl text-[15px]">
            <tbody>
              {svaga.map((r) => (
                <tr key={r.amne} id={ankare(r.amne)} className="regel scroll-mt-6">
                  <td className="py-3 font-medium">{r.amne}</td>
                  <td className="tabular py-3 pl-4 text-right" style={{ color: 'var(--black-svag)' }}>
                    {heltal(r.voteringar)} voteringar
                  </td>
                  <td className="tabular whitespace-nowrap py-3 pl-5 text-right font-semibold">
                    {tal(Math.abs(r.avvikande_delta))} p.e.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 max-w-[62ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
            {/* Meningen får inte räkna med att de svaga alltid är exakt två.
                Enighetstalen listas i samma ordning som tabellen ovan. */}
            Procentenheter under parets normalnivå. Att avvikelsen är liten
            betyder inte att kammaren är enig i sak —{' '}
            {svaga.length === 1 ? 'ämnet har' : 'ämnena har'} tvärtom riksdagens{' '}
            <em>högsta</em> enighetstal:{' '}
            {lista(svaga.map((r) => `${tal(r.kammarens_enighet)} %`))}.
          </p>
        </section>
      )}

      <section className="regel mt-20 pt-8">
        <h2 className="display text-2xl">Om måttet</h2>
        <div className="mt-4 grid max-w-[68ch] gap-4 text-[15px] leading-relaxed"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Ett partis linje i en votering är det alternativ flest av dess
            närvarande ledamöter valde. Underlaget är {heltal(voteringar)} voteringar
            med namnupprop, alla från mandatperioden 2022–2026.
          </p>
          <p>
            <strong style={{ color: 'var(--black)' }}>
              {lista(REGERINGSPARTIERNA.map(namn))} röstar lika i {likhetsspann} av
              alla voteringar.
            </strong>{' '}
            När ett av dem namnges ovan gäller fyndet i praktiken alla tre —
            vilket av de tre som står där avgörs av tiondelar. Av samma skäl
            redovisas inte det mest eniga paret i varje ämne: det är alltid
            två av dessa tre, och alltid 100 %.
          </p>
          <p>
            Ämnesindelningen är gjord automatiskt utifrån utskottens förslag och
            reservationer. Ett ämne som <em>övrigt</em> samlar det som inte föll
            inom någon av de femton övriga.
          </p>
        </div>
        <Link href="/metod#klarsprak"
              className="mt-6 inline-block border-b pb-1 text-[14px] transition-opacity hover:opacity-60"
              style={{ borderColor: 'var(--accent)' }}>
          Så gjordes ämnesindelningen →
        </Link>
      </section>
    </main>
  )
}

/** "två", "tre" … Räkneord upp till tio, därefter siffran. */
function raknord(n: number) {
  return ['noll', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio'][n] ?? String(n)
}

function storBokstav(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
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

function Amnesavsnitt({ rad, exempel, oppen }: { rad: Amne; exempel: Exempel[]; oppen: boolean }) {
  const { avvikande_1: a, avvikande_2: b } = rad

  return (
    <section id={ankare(rad.amne)} className="regel mt-16 scroll-mt-6 pt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="display text-[clamp(1.5rem,3.4vw,2.2rem)]">{rad.amne}</h3>
        <span className="tabular text-[13px] uppercase tracking-[0.1em]"
              style={{ color: 'var(--black-svag)' }}>
          {heltal(rad.voteringar)} voteringar · {tal(rad.kammarens_enighet)} % enighet
        </span>
      </div>

      <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          {/* Beloppet utan tecken. "−19,9" läses som ett räknefel; etiketten
              bär riktningen i stället. */}
          <div className="display tabular text-[clamp(3rem,11vw,6.5rem)] leading-[0.85]"
               style={{ color: 'var(--accent)' }}>
            {tal(Math.abs(rad.avvikande_delta))}
          </div>
          <div className="mt-3 max-w-[16ch] text-[12px] uppercase tracking-[0.12em]"
               style={{ color: 'var(--black-svag)' }}>
            procentenheter lägre än normalt
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

      {exempel.length > 0 ? (
        <details className="mt-6" open={oppen}>
          <summary className="cursor-pointer text-[14px] font-medium transition-opacity hover:opacity-60">
            {exempel.length === 1
              ? 'Voteringen där de gick isär'
              : `De ${raknord(exempel.length)} senaste voteringarna där de gick isär`}
          </summary>
          <ol className="mt-3">
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
          </ol>
        </details>
      ) : (
        <p className="regel mt-6 py-4 text-[14px]" style={{ color: 'var(--black-svag)' }}>
          {namn(a)} och {namn(b)} hamnade aldrig på olika linje i det här ämnet.
        </p>
      )}
    </section>
  )
}
