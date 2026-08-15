import { Etikett, Forbehall, Textlank } from '@/components/system'
import { AVSANDARE, NYTT_ARENDE, REPO, SAJT, sidmetadata } from '@/lib/sajt'

export const metadata = sidmetadata({
  titel: 'Vem ligger bakom sajten?',
  beskrivning:
    `${SAJT} är byggd av ${AVSANDARE}, privat och utan koppling till Sveriges ` +
    'riksdag. Ingen finansiering, inget partiuppdrag, ingen annonsering — och ' +
    'källkoden ligger öppen.',
  sokvag: '/om',
})

/**
 * Avsändaren.
 *
 * Sidan har inget mörkt fält. Formspråket ger det till sidans tyngsta tal, och
 * här finns inget tal — ett fält utan siffra hade varit dekor. Displayrubriken
 * bär sidan i stället.
 */
export default function Om() {
  return (
    <main>
      <section className="pb-10 pt-16">
        <Etikett className="stig" ton="signal">Om sajten</Etikett>
        <h1
          className="display stig mt-6 text-[clamp(2.8rem,8.5vw,96px)]"
          style={{ animationDelay: '80ms' }}
        >
          En privatperson, inte riksdagen.
        </h1>
        <p
          className="stig mt-7 max-w-[54ch] text-[clamp(17px,2.2vw,20px)] leading-[1.45]"
          style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}
        >
          {SAJT} är byggd och drivs av {AVSANDARE}. Sajten namnger partier och
          publicerar maskinskrivna sammanfattningar av politiska beslut. Då ska
          det synas vem som svarar för dem.
        </p>
      </section>

      {/* Friskrivningen står högst upp och inte i en fotnot: namnet är
          riksdagens eget ord, och den som läser det som en avsändare har läst
          fel innan hen hunnit till någon brödtext. */}
      <Forbehall rubrik="Sajten har ingen koppling till Sveriges riksdag.">
        <em>Namnupprop</em> är riksdagens ord för när rösterna räknas ledamot för
        ledamot, och sajten heter så därför att det avgränsar exakt vad den
        täcker. Men den är privat. Riksdagen har varken beställt, granskat eller
        godkänt något av innehållet, och är inte ansvarig för det. Riksdagens
        egna uppgifter ligger på{' '}
        <a
          href="https://data.riksdagen.se"
          target="_blank"
          rel="noreferrer"
          className="underline hover:opacity-70"
        >
          data.riksdagen.se
        </a>
        .
      </Forbehall>

      <section id="varfor" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik text-[clamp(1.8rem,4.4vw,44px)]">Varför sajten finns</h2>
        <div
          className="mt-7 grid max-w-[66ch] gap-4 text-[16.5px] leading-[1.6]"
          style={{ color: 'var(--black-mjuk)' }}
        >
          <p>
            Riksdagens öppna data är fritt tillgängligt och nästan oläsbart.
            Voteringarna heter saker som <em>SfU16 punkt 3</em>, och utfallet är
            ett ja eller nej mot ett procedurförslag — inte mot sakfrågan. Ett
            parti som röstar nej till mer pengar till skolan har oftast röstat
            för sitt eget förslag om mer pengar till skolan. Den som läser rakt
            av får alltså fel svar, och sajten finns för att översätta
            förfarandet till vanlig svenska med originaltexten öppen bredvid.
          </p>
          <p>
            Den började som något annat. Idén var att leta efter hyckleri:
            politiker som säger en sak i talarstolen och röstar tvärtom. Måttet
            höll inte. Enskilda ledamöter avviker nästan aldrig från sitt parti,
            samma modell på samma underlag gav helt olika svar när instruktionen
            formulerades om, och inget av de starkaste fallen överlevde en
            granskning satt att motbevisa dem.
          </p>
          <p>
            Verktyget byggdes därför aldrig. Det negativa resultatet publicerades
            i stället, med räkningen öppen. Att lägga ned en idé som hade
            fungerat bättre som rubrik än som mätning är ett omdöme och inte en
            beräkning — och ett omdöme behöver någon som står för det. Det är
            skälet till att den här sidan finns.
          </p>
        </div>
        <Textlank href="/metod#hyckleri" className="mt-8">
          Läs de tre stegen där idén föll
        </Textlank>
      </section>

      <section id="oberoende" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik max-w-[22ch] text-[clamp(1.8rem,4.4vw,44px)]">
          Vad som inte påverkar innehållet
        </h2>
        <p
          className="mt-5 max-w-[58ch] text-[16.5px] leading-[1.6]"
          style={{ color: 'var(--black-mjuk)' }}
        >
          Ingenting av det här går att kontrollera i källkoden. Det står här
          ändå, därför att en sajt som namnger partier bör säga det rakt ut.
        </p>

        <div className="mt-12 grid gap-10">
          <Punkt rubrik="Ingen finansiering">
            Sajten är inte finansierad av någon. Drift, databas och de körningar
            som skrev klarspråket är betalda privat.
          </Punkt>
          <Punkt rubrik="Inget partiuppdrag">
            Jag har inget uppdrag, medlemskap eller förtroendeuppdrag hos något
            parti eller någon intresseorganisation. Inget parti har fått läsa
            eller påverka något innan det publicerats.
          </Punkt>
          <Punkt rubrik="Ingen annonsering">
            Ingen reklam, inga sponsrade inslag, inga affiliatelänkar. Sajten
            säljer ingenting och tar inte betalt för något.
          </Punkt>
        </div>
      </section>

      <section id="kallkod" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik max-w-[20ch] text-[clamp(1.8rem,4.4vw,44px)]">
          Hela bygget går att läsa
        </h2>
        <div
          className="mt-7 grid max-w-[66ch] gap-4 text-[16.5px] leading-[1.6]"
          style={{ color: 'var(--black-mjuk)' }}
        >
          <p>
            Källkoden är öppen: sidorna, frågorna mot databasen, skripten som
            hämtar från riksdagen och instruktionen som klarspråket skrevs med.
            Den som vill kontrollera ett tal behöver alltså inte tro på sajten —
            definitionen står i koden bredvid den text som förklarar den, och
            underlaget ligger kvar hos riksdagen.
          </p>
          <p>
            Samma ställe är kontaktvägen. Det finns ingen e-postadress, med
            avsikt: ett ärende på GitHub är öppet, så både frågan och svaret går
            att läsa av någon annan än den som skrev dem.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          <Textlank href={REPO} extern>
            Läs källkoden på GitHub
          </Textlank>
          <Textlank href={NYTT_ARENDE} extern>
            Anmäl ett fel
          </Textlank>
        </div>
      </section>

      <section className="regel scroll-mt-6 py-16">
        <h2 className="rubrik max-w-[20ch] text-[clamp(1.8rem,4.4vw,44px)]">
          Vad sajten inte kan svara på
        </h2>
        <p
          className="mt-5 max-w-[58ch] text-[16.5px] leading-[1.6]"
          style={{ color: 'var(--black-mjuk)' }}
        >
          Kvittningen syns inte, de flesta besluten togs helt utan omröstning,
          och skälet till en ledamots frånvaro finns inte i materialet.
          Begränsningarna står utskrivna på metodsidan, tillsammans med
          definitionen bakom varje tal.
        </p>
        <Textlank href="/metod#begransningar" className="mt-8">
          Se begränsningarna i sin helhet
        </Textlank>
      </section>
    </main>
  )
}

/** Samma tvåkolumnsform som begränsningarna på metodsidan. */
function Punkt({ rubrik, children }: { rubrik: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-10 gap-y-2 sm:grid-cols-[minmax(0,15rem)_1fr]">
      <h3 className="text-[16px] font-bold leading-snug">{rubrik}</h3>
      <p
        className="max-w-[58ch] text-[15.5px] leading-[1.6]"
        style={{ color: 'var(--black-mjuk)' }}
      >
        {children}
      </p>
    </div>
  )
}
