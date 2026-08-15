import Link from 'next/link'
import { db, heltal, lista, namn, rader, tal, REGERINGSPARTIERNA } from '@/lib/db'
import { Linjeetikett } from '@/components/rostrad'
import { Etikett, Forbehall, Textlank } from '@/components/system'
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

  return { rader: rows, perAmne, likhetsspann }
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
    <main>
      <section className="pb-8 pt-16">
        <Etikett className="stig" ton="signal">Mandatperioden 2022–2026</Etikett>
        <h1 className="display stig mt-6 max-w-[15ch] text-[clamp(2.6rem,7.5vw,80px)]"
            style={{ animationDelay: '80ms' }}>
          Var är riksdagen oenig?
        </h1>
        <p className="stig mt-6 max-w-[54ch] text-[19px] leading-[1.5]"
           style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}>
          För varje ämne mäts alla 28 partipar likadant: hur ofta de hamnade på
          samma linje. Talet nedan är genomsnittet — sannolikheten att två
          slumpvis valda partier röstade lika.
        </p>
      </section>

      <section className="pb-12">
        <div className="regel">
          {rows.map((r, i) => (
            <Link
              key={r.amne}
              href={`#${ankare(r.amne)}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-5 transition-opacity duration-150 hover:opacity-70 sm:grid-cols-[110px_1fr_auto_240px]"
              style={{ borderBottom: '1px solid var(--linje)' }}
            >
              <span
                className="tabular order-2 text-right text-[clamp(1.8rem,5vw,44px)] font-extrabold tracking-[-0.04em] sm:order-none sm:text-left"
                style={{ color: i < 3 ? 'var(--accent-display)' : 'var(--black)' }}
              >
                {tal(r.kammarens_enighet)}
              </span>
              <span className="text-[clamp(1.05rem,2.4vw,26px)] font-extrabold tracking-[-0.03em]">
                {r.amne}
              </span>
              <span className="etikett order-3 sm:order-none">
                {heltal(r.voteringar)} voteringar
              </span>
              <span className="order-4 col-span-2 sm:order-none sm:col-span-1">
                <Spann lagsta={r.lagsta} medel={r.kammarens_enighet} />
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-5 max-w-[62ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
          Stapeln visar spannet i ämnet: från det mest oeniga partiparet till det
          mest eniga, som alltid ligger på 100 %. Strecket är genomsnittet för
          alla 28 par. En lång stapel betyder att kammaren spänner brett.
        </p>
      </section>

      <section className="regel py-16">
        <p className="rubrik max-w-[20ch] text-[clamp(1.9rem,5.5vw,46px)] leading-[1.05]">
          Riksdagen är minst enig om{' '}
          <span style={{ color: 'var(--accent)' }}>{mestOeniga?.amne}</span>.
        </p>
        <p className="mt-6 max-w-[56ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
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
        <section className="regel py-16">
          <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">
            {svaga.length === 1 ? 'Ett ämne saknar' : `${storBokstav(raknord(svaga.length))} ämnen saknar`} tydlig avvikelse
          </h2>
          <p className="mt-5 max-w-[62ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
            Här ligger det mest avvikande paret mindre än {SVAG} procentenheter
            från sin egen normalnivå. Det är för lite för att kalla ett mönster,
            och de får därför inga egna avsnitt — en jättesiffra på{' '}
            {tal(Math.min(...svaga.map((r) => Math.abs(r.avvikande_delta))))} vore
            motsatsen till trovärdighet.
          </p>
          <div className="mt-8 max-w-2xl">
            {svaga.map((r) => (
              <div
                key={r.amne}
                id={ankare(r.amne)}
                className="grid scroll-mt-6 grid-cols-[1fr_auto] items-center gap-x-5 gap-y-1 py-3.5 sm:grid-cols-[1fr_auto_120px]"
                style={{ borderBottom: '1px solid var(--linje)' }}
              >
                <span className="text-[17px] font-bold">{r.amne}</span>
                <span className="tabular text-[14px]" style={{ color: 'var(--black-svag)' }}>
                  {heltal(r.voteringar)} voteringar
                </span>
                <span className="tabular col-span-2 text-[16px] font-bold sm:col-span-1 sm:text-right">
                  {tal(Math.abs(r.avvikande_delta))} p.e.
                </span>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-[62ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
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

      <section className="regel py-16">
        <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Om måttet</h2>
        <div className="mt-6 grid max-w-[68ch] gap-4 text-[16.5px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Ett partis linje i en votering är det alternativ flest av dess
            närvarande ledamöter valde. Underlaget är {heltal(voteringar)}{' '}
            voteringar med namnupprop, alla från mandatperioden 2022–2026.
          </p>
          <p>
            Ämnesindelningen är gjord automatiskt utifrån utskottens förslag och
            reservationer. Ett ämne som <em>övrigt</em> samlar det som inte föll
            inom någon av de femton övriga.
          </p>
        </div>
        <Forbehall
          rubrik={`${lista(REGERINGSPARTIERNA.map(namn))} röstar lika i ${likhetsspann} av alla voteringar.`}
          className="mt-8"
        >
          När ett av dem namnges ovan gäller fyndet i praktiken alla tre — vilket
          av de tre som står där avgörs av tiondelar. Av samma skäl redovisas
          inte det mest eniga paret i varje ämne: det är alltid två av dessa tre,
          och alltid 100 %.
        </Forbehall>
        <Textlank href="/metod#klarsprak" className="mt-8">
          Så gjordes ämnesindelningen
        </Textlank>
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
      aria-hidden
      className="relative block h-2.5 w-full rounded-[2px]"
      style={{ background: 'var(--spar)' }}
    >
      <span
        className="absolute inset-y-0 block rounded-[2px]"
        style={{ left: `${lagsta}%`, right: 0, background: 'var(--black-svag)' }}
      />
      <span
        className="absolute inset-y-[-4px] block w-[3px] rounded-[1px]"
        style={{ left: `${medel}%`, background: 'var(--accent)' }}
      />
    </span>
  )
}

function Amnesavsnitt({ rad, exempel, oppen }: { rad: Amne; exempel: Exempel[]; oppen: boolean }) {
  const { avvikande_1: a, avvikande_2: b } = rad

  return (
    <section id={ankare(rad.amne)} className="regel scroll-mt-6 py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h3 className="rubrik text-[clamp(1.5rem,3.4vw,32px)]">{rad.amne}</h3>
        <Etikett>
          {heltal(rad.voteringar)} voteringar · {tal(rad.kammarens_enighet)} % enighet
        </Etikett>
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-5">
        <div>
          {/* Beloppet utan tecken. "−19,9" läses som ett räknefel; etiketten
              bär riktningen i stället. */}
          <div className="siffra text-[clamp(3.4rem,10vw,92px)]"
               style={{ color: 'var(--accent-display)' }}>
            {tal(Math.abs(rad.avvikande_delta))}
          </div>
          <Etikett className="mt-4 max-w-[16ch]">procentenheter lägre än normalt</Etikett>
        </div>
        <p className="mb-1 max-w-[28ch] flex-1 text-[clamp(1.2rem,2.8vw,26px)] font-extrabold leading-[1.15] tracking-[-0.03em]">
          {namn(a)} och {namn(b)} röstade lika i {tal(rad.avvikande_har)} % av
          voteringarna om {rad.amne} — mot {tal(rad.avvikande_normalt)} % i alla
          frågor.
        </p>
      </div>

      <p className="mt-6 max-w-[62ch] text-[13.5px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
        Största avvikelsen bland ämnets 28 partipar. Mest oeniga i absoluta tal:{' '}
        {namn(rad.lagsta_1)} och {namn(rad.lagsta_2)}, {tal(rad.lagsta)} %.
      </p>

      {exempel.length > 0 ? (
        <details className="mt-7" open={oppen}>
          <summary className="cursor-pointer text-[14.5px] font-semibold transition-opacity duration-150 hover:opacity-70">
            {exempel.length === 1
              ? 'Voteringen där de gick isär'
              : `De ${raknord(exempel.length)} senaste voteringarna där de gick isär`}
          </summary>
          <ol className="mt-4">
            {exempel.map((e) => (
              <li key={e.forslagspunkt_id} className="regel py-5">
                <Link href={`/voteringar/${e.forslagspunkt_id}`} className="group block">
                  <div className="mono flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
                       style={{ color: 'var(--etikett)' }}>
                    <span>{e.beteckning} · punkt {e.punkt}</span>
                    <span>{e.datum}</span>
                  </div>
                  <p className="mt-2.5 max-w-[56ch] text-[19px] font-semibold leading-[1.35] tracking-[-0.01em] transition-opacity duration-150 group-hover:opacity-70">
                    {e.sakfraga}
                  </p>
                </Link>
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <Linjeetikett parti={e.parti_1} linje={e.linje_1} />
                  <Linjeetikett parti={e.parti_2} linje={e.linje_2} />
                  <span className="text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
                    {e.linje_1} mot {e.linje_2}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </details>
      ) : (
        <p className="regel mt-7 py-5 text-[15px]" style={{ color: 'var(--black-svag)' }}>
          {namn(a)} och {namn(b)} hamnade aldrig på olika linje i det här ämnet.
        </p>
      )}
    </section>
  )
}
