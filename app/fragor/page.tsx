import Link from 'next/link'
import { datum, heltal, lista } from '@/lib/db'
import { PARTIER, namn } from '@/lib/parti'
import { FRAGOR, KOMPASS, hamtaAllaFragor, utfall } from '@/lib/fragor'
import { rakneord, storBokstav } from '@/lib/text'
import { Rostrad, Rostnyckel } from '@/components/rostrad'
import { Kompasslank } from '@/components/kompasslank'
import { Etikett, Textlank } from '@/components/system'
import { sidmetadata } from '@/lib/sajt'

export const revalidate = 3600

// Antalet härleds även här. Titeln och beskrivningen är det som syns i ett
// sökresultat, alltså det sista stället någon skulle märka att talet blivit
// osant.
export const metadata = sidmetadata({
  titel: `${storBokstav(rakneord(FRAGOR.length))} valfrågor, och hur riksdagen faktiskt röstade`,
  beskrivning:
    `${storBokstav(rakneord(FRAGOR.length))} av valets frågor där en votering i riksdagen svarar mot frågan. ` +
    'Vad ett ja innebar, vad ett nej innebar och hur de åtta partierna röstade. ' +
    `Urvalet följer ${KOMPASS.namn}, formuleringarna är våra egna.`,
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
 *
 * Av samma skäl har sidan inget `Forbehall` heller. Det stod över listan och
 * bar begränsningen i grå ruta med orange kantlinje, alltså i den tyngsta
 * form sidan har näst efter panelen. Se ingressen för vad som blev kvar och
 * "Om urvalet" för resten.
 */
export default async function Fragor() {
  const karta = await hamtaAllaFragor()

  // Urvalets egen form, räknad ur data. Sajten skriver ut M/KD/L-förbehållet
  // bredvid varje siffra som namnger ett av dem — då ska den också skriva ut
  // sitt eget urvals slagsida i stället för att låta en statsvetare räkna
  // fram den på fem minuter. Våg 1 i distributionen ber uttryckligen
  // statsvetare göra sönder metoden; den billigaste fällningen ska inte ligga
  // outtalad.
  const rader = FRAGOR.map((f) => karta.get(f.slug)).filter(
    (d): d is NonNullable<typeof d> => Boolean(d),
  )
  const vanns = rader.filter((d) => utfall(d.roster).utskottetVann).length
  const reservantAntal = new Map<string, number>()
  for (const d of rader)
    for (const p of d.motforslag_partier ?? [])
      reservantAntal.set(p, (reservantAntal.get(p) ?? 0) + 1)
  const flest = [...reservantAntal.entries()].sort((a, b) => b[1] - a[1])[0]
  const aldrig = PARTIER.filter((p) => !reservantAntal.has(p))

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
        {/* Nämnaren står i ingressen, inte i ett förbehåll under den.

            Den stod i en grå ruta med orange kantlinje och ikon fram till nu —
            fem rader förbehåll mellan rubriken och listan, alltså mer visuell
            tyngd än de nio frågorna rutan handlar om. Ett förbehåll som tar
            fokus från det som förbehålls är inte längre ärlighet utan ett
            hinder, och läsaren möttes av sajtens begränsning innan hen fått se
            vad den kan.

            Kvar ovanför listan står det som faktiskt måste läsas före den: att
            nio inte är allt, varifrån trettiofem kommer, och att en fråga som
            saknas är oavgjord snarare än obehandlad. Hur urvalet gick till —
            de 24, motbevisningspasset, de nio som blev kvar — hör hemma i "Om
            urvalet" under listan. Det är svaret på en fråga läsaren ställer
            efter att ha sett listan, inte före. */}
        <p
          className="stig mt-7 max-w-[56ch] text-[clamp(17px,2.2vw,21px)] leading-[1.45]"
          style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}
        >
          Valkompasserna frågar vad partierna vill göra. Här är {rakneord(FRAGOR.length)} av
          samma frågor, med riksdagens egen omröstning bredvid — vad frågan gällde,
          vad ett ja innebar, vad ett nej innebar och hur varje parti röstade.
        </p>
        <p
          className="stig mt-5 max-w-[62ch] text-[14.5px] leading-[1.6]"
          style={{ color: 'var(--black-svag)', animationDelay: '240ms' }}
        >
          {storBokstav(rakneord(FRAGOR.length))} av de {KOMPASS.ord} frågorna
          i <Kompasslank />: de där en enskild votering svarar mot frågan och
          har en entydig riktning. Att en fråga saknas betyder att den är
          oavgjord, inte att riksdagen aldrig tagit ställning —{' '}
          <a href="#om-urvalet" className="underline hover:opacity-70">
            så gjordes urvalet
          </a>
          .
        </p>
      </section>

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
                className="grid items-start gap-x-8 gap-y-4 py-7 transition-colors duration-150 hover:bg-[var(--papper-djup)] md:grid-cols-[1fr_356px]"
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

      <section id="om-urvalet" className="regel scroll-mt-6 py-14">
        <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">Om urvalet</h2>
        <div className="mt-5 grid max-w-[64ch] gap-4 text-[16px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            Vilka frågor som står här följer <Kompasslank />, som ställer{' '}
            {KOMPASS.ord} frågor. Formuleringarna är våra egna — vi lånar vilka
            frågor som ligger på bordet inför valet, aldrig hur de är ställda.
          </p>
          {/* Kriteriet och oavgjord-satsen står i ingressen och upprepas inte
              här. Ankarlänken därifrån landar läsaren på det här stycket
              sekunder efter att hen läst dem — en ordagrann upprepning så nära
              läses inte som en sammanfattning utan som att texten tappat
              tråden, och två kopior är dessutom två meningar att hålla i takt.
              Det här stycket svarar bara på vad som hände med de övriga. */}
          <p>
            För de övriga har vi inte kunnat fastställa någon sådan votering.
            Riksdagen kan mycket väl ha behandlat dem ändå — i propositioner
            utan namnupprop, eller i punkter som buntar ihop flera frågor — men
            då finns inget namnupprop att visa, och sidan påstår ingenting om
            dem.
          </p>
          {/* De tre talen står i samma mening därför att de kommer ur samma
              granskning och inte betyder något var för sig. Att 24 blev nio är
              sajtens enda belägg för att urvalet faktiskt prövats, och det är
              det första en granskare frågar efter. */}
          <p>
            Ett första urval gav 24 av frågorna. Ett pass med uppgift att
            motbevisa det urvalet fällde 15 av de 19 påståenden som hann
            prövas, och {rakneord(FRAGOR.length)} blev kvar. Grunderna var att
            en utvärdering av något inte är samma sak som saken själv, och
            framför allt riktningen: en votering som rör rätt ämne men inte går
            att läsa som ett ja eller ett nej i frågan duger inte.
          </p>
          <p>
            Sidorna översätter ingen votering till kompassens svarsskala. En
            kompassfråga är formulerad för att kunna besvaras på en skala, en
            votering för att kunna vinnas, och att sätta likhetstecken mellan
            dem är just det som gör den här sortens jämförelse osann. Här står i
            stället vad ett ja innebar och vad ett nej innebar, med
            originaltexterna en klick bort. Vad det säger om ett partis hållning
            avgör läsaren.
          </p>
          <p>
            Ett parti som röstade nej hade nästan alltid ett eget förslag, och
            röstade för det. Det är därför nej-sidan inte är samma sak som
            motstånd mot sakfrågan.
          </p>
          <p>
            Urvalets egen form ska också stå utskriven: utskottets förslag vann{' '}
            {vanns === rader.length ? `samtliga ${rakneord(vanns)}` : `${rakneord(vanns)} av ${rakneord(rader.length)}`}{' '}
            voteringar{flest ? `, och motförslaget kom från ${namn(flest[0])} i ${rakneord(flest[1])} av dem` : ''}
            {aldrig.length > 0 ? ` — från ${lista(aldrig.map(namn))} aldrig` : ''}. Det
            är inte en hållning utan metodens avtryck. Bara voteringar med
            entydig riktning har tagits med; entydig riktning kräver ett rent
            motförslag, och rena motförslag skrivs oftast av ett parti som står
            ensamt. Regeringssidans egen politik gick genom propositioner utan
            namnupprop och kan därför inte synas här alls — det är samma
            asymmetri som varje frågesida öppnar med.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          <Textlank href="/rosta">Rösta själv i de {rakneord(FRAGOR.length)} frågorna</Textlank>
          <Textlank href="/">Sök bland alla riksdagens beslut</Textlank>
          <Textlank href="/metod">Så är det räknat</Textlank>
        </div>
      </section>
    </main>
  )
}
