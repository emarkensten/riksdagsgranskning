import Link from 'next/link'
import { datumtid, db, heltal, rader } from '@/lib/db'
import { Nedladdning } from '@/components/ikoner'
import { AVSANDARE, NYTT_ARENDE, REPO, SAJT } from '@/lib/sajt'

/**
 * Sidfoten, på varje sida.
 *
 * Ingen signalfärg och ingen fylld knapp: foten ska inte konkurrera med sidans
 * innehåll. Ytan är papper med en hårlinje uppåt, aldrig en egen bakgrundsfärg
 * — det är det som gör att den läser som slutet på sidan och inte som ett till
 * avsnitt.
 *
 * Designen har också ett läge för sidor som slutar i ett mörkt fält, där foten
 * körs i bläck utan hårlinje emellan. Ingen sida gör det i dag — alla fyra
 * mörka fält ligger mitt på sin sida — och ett läge utan brukare är ett läge
 * som hinner ruttna innan det används. Det ligger därför inte här.
 */

type Lank = { href: string; text: string; extern?: boolean }

/**
 * Grupperna speglar sajtens faktiska sidor.
 *
 * Designens förslag innehöll Ledamöter, Årets voteringar, Alla analyser,
 * Integritet, Tillgänglighet och en CC BY 4.0-licens. Inget av det finns:
 * ledamotssidor är medvetet bortvalda (se docs/LAGE_2026-08.md), och en licens
 * som inte ligger i repot får inte påstås i sidfoten.
 */
const GRUPPER: { rubrik: string; lankar: Lank[] }[] = [
  {
    rubrik: 'Utforska',
    lankar: [
      { href: '/', text: 'Besluten' },
      { href: '/fynd', text: 'Fem fynd' },
      { href: '/partier', text: 'Partier' },
    ],
  },
  {
    rubrik: 'Analyser',
    lankar: [
      { href: '/amnen', text: 'Ämnen' },
      { href: '/blocken', text: 'Blocken' },
      { href: '/samstammighet', text: 'Vem röstar med vem' },
      { href: '/franvaro', text: 'Frånvaro' },
    ],
  },
  {
    rubrik: 'Om',
    lankar: [
      { href: '/metod', text: 'Så räknar vi' },
      { href: '/metod#begransningar', text: 'Begränsningar' },
      { href: '/om', text: 'Om sajten' },
      { href: NYTT_ARENDE, text: 'Rätta ett fel', extern: true },
      { href: REPO, text: 'Källkod', extern: true },
    ],
  },
]

type Omfattning = { voteringar: number; ledamoter: number; hamtat: string | null }

/**
 * Ett fel här får inte fälla sidan.
 *
 * `rader()` kastar med flit — en avbruten fråga ska aldrig bli en tyst nolla i
 * ett tal sajten påstår något med. Men det här är sidfoten på *varje* sida, och
 * en databashicka skulle annars ta ned hela sajten i stället för tre rader. Att
 * utelämna dem är inte ett felaktigt tal; det är att låta bli att påstå något,
 * vilket är samma hållning som resten av sajten.
 */
async function omfattning(): Promise<Omfattning | null> {
  try {
    const svar = await rader<Omfattning>(
      db().from('sajtens_omfattning').select('voteringar, ledamoter, hamtat').limit(1),
    )
    const rad = svar[0]
    return rad
      ? { ...rad, voteringar: Number(rad.voteringar), ledamoter: Number(rad.ledamoter) }
      : null
  } catch (fel) {
    // Loggas, även om läsaren inte får se något. Utan spåret kan raderna
    // försvinna från varje sida permanent utan att någon vet varför.
    console.error('Sidfotens tal kunde inte läsas:', fel)
    return null
  }
}

export async function Sidfot() {
  const tal = await omfattning()

  return (
    <div className="mt-24" style={{ borderTop: '1px solid var(--linje)' }}>
      <footer className="mx-auto max-w-5xl px-5 pb-10 pt-14 sm:px-8">
        <div className="grid gap-x-10 gap-y-11 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div className="flex flex-col items-start gap-4">
            <span className="text-[21px] font-extrabold tracking-[-0.035em]">{SAJT}</span>
            <p className="max-w-[34ch] text-[16.5px] leading-[1.55]"
               style={{ color: 'var(--black-mjuk)' }}>
              Varje votering i riksdagen 2022–2026, förklarad på vanlig svenska.
              Räknat ur öppna data, inte ur åsikter.
            </p>
            {/*
              Bläckram, inte fylld signal. Se kommentaren överst.

              `prefetch={false}` är inte kosmetik: /underlag är ingen sida utan
              en route handler som skriver ut hela underlaget, 22 786 rader. Med
              förladdning hade varje läsare som scrollar till botten av vilken
              sida som helst hämtat hela CSV:n i bakgrunden utan att be om den.
            */}
            <Link
              href="/underlag"
              prefetch={false}
              className="mt-1 inline-flex items-center gap-2.5 rounded-full px-5 py-[11px] text-[15px] font-semibold transition-opacity duration-150 hover:opacity-70"
              style={{ border: '1px solid var(--black)', color: 'var(--black)' }}
            >
              Ladda ned datan
              <Nedladdning storlek={15} />
            </Link>
          </div>

          {/*
            `lg:contents` löser upp den här behållaren i den yttre rutnätet, så
            att de tre navigationerna blir kolumner två till fyra bredvid
            ordmärket. Under 1024 px är de i stället ett eget rutnät under det:
            två spalter på en telefon, tre på en surfplatta. Inga dragspel —
            femton länkar behöver inte gömmas.
          */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:contents">
            {GRUPPER.map((grupp) => (
              <nav key={grupp.rubrik} aria-labelledby={`sidfot-${grupp.rubrik}`}
                   className="flex flex-col gap-3.5">
                <span id={`sidfot-${grupp.rubrik}`} className="etikett">{grupp.rubrik}</span>
                {grupp.lankar.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    {...(l.extern ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className="text-[15.5px] transition-opacity duration-150 hover:opacity-70"
                  >
                    {l.text}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>

        {/*
          Stämpelraden är sidfotens enda dynamiska innehåll och dess viktigaste:
          ett material vars ålder inte syns läses som färskt. Talen kommer ur
          databasen, aldrig ur en sträng här.
        */}
        {tal && (
          <dl className="mt-11 grid gap-6 pt-7 sm:grid-cols-3"
              style={{ borderTop: '1px solid var(--linje)' }}>
            <div className="flex flex-col gap-1.5">
              <dt className="etikett">Datakälla</dt>
              <dd className="text-[15px]" style={{ color: 'var(--black-mjuk)' }}>
                <a href="https://data.riksdagen.se" target="_blank" rel="noreferrer"
                   className="transition-opacity duration-150 hover:opacity-70">
                  Riksdagens öppna data
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="etikett">Senast hämtad</dt>
              <dd className="tabular text-[15px]" style={{ color: 'var(--black-mjuk)' }}>
                {datumtid(tal.hamtat ?? undefined)}
              </dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="etikett">Omfattar</dt>
              <dd className="tabular text-[15px]" style={{ color: 'var(--black-mjuk)' }}>
                {heltal(tal.voteringar)} voteringar · {heltal(tal.ledamoter)} ledamöter
              </dd>
            </div>
          </dl>
        )}

        <div className="mt-9 flex flex-wrap justify-between gap-x-10 gap-y-6 pt-7"
             style={{ borderTop: '1px solid var(--linje)' }}>
          <div className="flex max-w-[66ch] flex-col gap-3">
          <p className="max-w-[66ch] text-[14.5px] leading-[1.6]"
             style={{ color: 'var(--black-svag)' }}>
            {SAJT} redovisar hur riksdagen röstat. Sajten är partipolitiskt
            obunden, tar inte ställning i sakfrågor och drar inga slutsatser om
            varför någon röstat som den gjort. Voteringarnas innebörd är
            sammanfattad automatiskt från utskottens förslag och reservationer —
            varje sammanfattning kan granskas mot originaltexten. Hittar du ett
            fel i räkningen vill vi veta det.
          </p>
          {/* Avsändaren står i sidfoten och inte bara på /om: frågan "vem ligger
              bakom det här?" ställs på den sida läsaren råkar stå på, och ska ha
              ett svar där. */}
          <p className="max-w-[66ch] text-[14.5px] leading-[1.6]"
             style={{ color: 'var(--black-svag)' }}>
            {SAJT} är en privat sajt av {AVSANDARE}, utan koppling till Sveriges
            riksdag och utan finansiering, partiuppdrag eller annonser.
            {/* Meningen hänger på stämpelraden ovanför och skrivs därför bara
                ut när den finns. Utan villkoret pekar "tidpunkten ovan" på
                ingenting den gång databasfrågan inte gick igenom. */}
            {tal && ' Datan uppdateras inte automatiskt — den är hämtad vid tidpunkten ovan och sedan dess oförändrad.'}
          </p>
          </div>

          {/*
            Två licenser, inte en, och de namnger vad de täcker. Designen hade
            en rad som bara sa "Licens CC BY 4.0" — den hade varit osann om
            koden, som ligger under MIT, och missvisande om källdatan, som är
            riksdagens och inte min att licensiera. Se LICENSE-DATA.
          */}
          <div className="flex shrink-0 flex-col gap-2.5 text-[14.5px]"
               style={{ color: 'var(--black-svag)' }}>
            {[
              { href: `${REPO}/blob/master/LICENSE`, text: 'Koden: MIT' },
              { href: `${REPO}/blob/master/LICENSE-DATA`, text: 'Texter och tal: CC BY 4.0' },
            ].map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer"
                 className="transition-opacity duration-150 hover:opacity-70">
                {l.text}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
