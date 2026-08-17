import Link from 'next/link'
import { datum, heltal } from '@/lib/db'
import { FRAGOR, hamtaAllaFragor, rakneord, utfall } from '@/lib/fragor'
import { Rostrad, Rostnyckel } from '@/components/rostrad'
import { Etikett, Forbehall, Textlank } from '@/components/system'
import { sidmetadata } from '@/lib/sajt'

export const revalidate = 3600

// Antalet härleds även här. Titeln och beskrivningen är det som syns i ett
// sökresultat, alltså det sista stället någon skulle märka att talet blivit
// osant.
export const metadata = sidmetadata({
  titel: `${storBokstav(rakneord(FRAGOR.length))} valfrågor, och hur riksdagen faktiskt röstade`,
  beskrivning:
    `${storBokstav(rakneord(FRAGOR.length))} av valets frågor där en votering i riksdagen ordagrant matchar frågan. ` +
    'Vad ett ja innebar, vad ett nej innebar och hur de åtta partierna röstade. ' +
    'Urvalet följer SVT:s valkompass 2026, formuleringarna är våra egna.',
  sokvag: '/fragor',
  egenBild: true,
})

/**
 * Indexet över de nio frågesidorna.
 *
 * Sidan har ingen `.panel`. Formspråket ger det mörka fältet till sidans
 * tyngsta tal, och det tal som skulle bära ett fält här — nio av trettiofem —
 * är ett tal om sajtens begränsning och inte om riksdagen. Ett förbehåll satt
 * i 148 px hade läst som skryt.
 */
export default async function Fragor() {
  const karta = await hamtaAllaFragor()

  return (
    <main>
      <section className="pb-9 pt-14">
        <Etikett className="stig" ton="signal">Valet 2026</Etikett>
        <h1
          className="display stig mt-5 max-w-[16ch] text-[clamp(2.4rem,7vw,76px)]"
          style={{ animationDelay: '80ms' }}
        >
          Vad gjorde de i frågan?
        </h1>
        <p
          className="stig mt-7 max-w-[56ch] text-[clamp(17px,2.2vw,21px)] leading-[1.45]"
          style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}
        >
          Valkompasserna frågar vad partierna vill göra. Här är {rakneord(FRAGOR.length)} av
          samma frågor, med riksdagens egen omröstning bredvid — vad frågan gällde,
          vad ett ja innebar, vad ett nej innebar och hur varje parti röstade.
        </p>
      </section>

      {/* Den ärliga raden. Att sajten stannar vid nio är dess starkaste
          egenskap och ska stå före listan, inte gömmas efter den. */}
      <Forbehall rubrik={`${storBokstav(rakneord(FRAGOR.length))} frågor, inte trettiofem.`}>
        De {rakneord(FRAGOR.length)} nedan är de frågor där en enskild votering matchar frågan
        ordagrant och har en entydig riktning. För de övriga har vi inte kunnat
        fastställa någon sådan votering — riksdagen kan mycket väl ha behandlat
        dem ändå, i propositioner utan namnupprop eller i punkter som buntar
        ihop flera frågor. <strong style={{ color: 'var(--black)' }}>Att en
        fråga saknas här betyder alltså att den är oavgjord, inte att riksdagen
        aldrig tagit ställning.</strong> Ett första urval gav 24 frågor. Ett
        pass med uppgift att motbevisa det urvalet fällde 15 av de 19
        påståenden som hann prövas, och {rakneord(FRAGOR.length)} blev kvar.
      </Forbehall>

      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pb-3 pt-14">
        <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">
          Så röstade de, fråga för fråga
        </h2>
        <Rostnyckel />
      </div>

      <ol>
        {FRAGOR.map((f) => {
          const d = karta.get(f.slug)
          const u = d ? utfall(d.roster) : undefined
          return (
            <li key={f.slug}>
              <Link
                href={`/fragor/${f.slug}`}
                // 356 px, som på startsidan: alla åtta partier ska rymmas på en
                // rad. Med 300 bryter etiketterna 6 + 2 och mönstret går förlorat.
                className="grid items-start gap-x-8 gap-y-4 py-7 transition-opacity duration-150 hover:opacity-70 md:grid-cols-[1fr_356px]"
                style={{ borderTop: '1px solid var(--linje)' }}
              >
                <div>
                  <div className="mono flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
                       style={{ color: 'var(--etikett)' }}>
                    <span style={{ color: 'var(--accent)' }}>{d?.amne}</span>
                    <span>{datum(d?.datum)}</span>
                  </div>
                  <p className="mt-2.5 max-w-[34ch] text-[21px] font-semibold leading-[1.3] tracking-[-0.015em]">
                    {f.rubrik}
                  </p>
                </div>
                {d && u && d.roster.length > 0 && (
                  <div className="flex flex-col gap-2.5 md:items-end">
                    <Rostrad rader={d.roster} kompakt />
                    <span className="tabular text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
                      {heltal(u.ja)} ja · {heltal(u.nej)} nej
                      {u.avstar > 0 && ` · ${heltal(u.avstar)} avstår`}
                    </span>
                  </div>
                )}
              </Link>
            </li>
          )
        })}
      </ol>

      <section className="regel py-14">
        <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">Om urvalet</h2>
        <div className="mt-5 grid max-w-[64ch] gap-4 text-[16px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Vilka frågor som står här följer{' '}
            <a
              href="https://valkompass.svt.se"
              target="_blank"
              rel="noreferrer"
              className="underline hover:opacity-70"
              style={{ color: 'var(--black)' }}
            >
              SVT:s valkompass 2026
            </a>
            . Formuleringarna är våra egna — vi lånar vilka frågor som ligger på
            bordet inför valet, aldrig hur de är ställda.
          </p>
          <p>
            Sidorna översätter ingen votering till kompassens svarsskala. En
            kompassfråga är formulerad för att kunna besvaras på en skala, en
            votering för att kunna vinnas, och att sätta likhetstecken mellan
            dem är just det som gör den här sortens jämförelse osann. Här står i
            stället vad ett ja innebar och vad ett nej innebar, ordagrant. Vad
            det säger om ett partis hållning avgör läsaren.
          </p>
          <p>
            Ett parti som röstade nej hade nästan alltid ett eget förslag, och
            röstade för det. Det är därför nej-sidan inte är samma sak som
            motstånd mot sakfrågan.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          <Textlank href="/">Sök bland alla riksdagens beslut</Textlank>
          <Textlank href="/metod">Så är det räknat</Textlank>
        </div>
      </section>
    </main>
  )
}

/** "nio" → "Nio". Rubriken i förbehållet börjar en mening. */
function storBokstav(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
