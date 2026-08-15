import Link from 'next/link'
import { db } from '@/lib/db'

export const revalidate = 3600

/**
 * "Sagt mot röstat" redovisas som ett negativt resultat.
 *
 * Vi letade efter partier som argumenterar för en sak och röstar för en annan,
 * med tre metoder. Ingen träff överlevde granskning. Att redovisa det är mer
 * värt än att publicera fynd som inte håller — och det förklarar för läsaren
 * varför sajten inte har den funktion man kanske väntar sig.
 */
export default async function Spanningar() {
  const klient = db()

  // Räkna i databasen i stället för att läsa raderna. En select() kapas tyst
  // vid 1000 rader, vilket skulle ge tystnadsfel så fort korpusen växer.
  const kategorier = ['stämmer', 'spänning', 'motsäger', 'oklart'] as const
  const antal = await Promise.all(
    kategorier.map((k) =>
      klient.from('retorik_rost')
        .select('*', { count: 'exact', head: true })
        .eq('overensstammelse', k)
        .then((r) => [k, r.count ?? 0] as const)),
  )

  const fordelning = Object.fromEntries(antal.filter(([, n]) => n > 0))
  const totalt = antal.reduce((s, [, n]) => s + n, 0)

  return (
    <main className="pb-10">
      <div className="regel-tjock pt-8">
        <p className="text-[13px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Ett negativt resultat
        </p>
        <h1 className="display mt-4 text-[clamp(2.2rem,6vw,4rem)]">
          Vi letade efter hyckleri<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Den vanligaste idén om riksdagsgranskning är att hitta politiker som
          säger en sak i talarstolen och röstar tvärtom. Vi prövade den. Den
          håller inte — och här är varför.
        </p>
      </div>

      <section className="regel mt-14 pt-7">
        <h2 className="display text-2xl">Tre försök, tre svar</h2>

        <ol className="mt-6 grid gap-8">
          <Steg
            nummer="1"
            rubrik="Enskilda ledamöter avviker inte"
            tal="0,14 %"
            text="Av 23 900 röster avvek 24 från det egna partiets majoritet. Det finns
                  ingen population av ledamöter som röstar mot sitt parti — därmed
                  ingen berättelse på individnivå."
          />
          <Steg
            nummer="2"
            rubrik="På partinivå avgörs svaret av frågans formulering"
            tal="0,3 % — 12,7 %"
            text="Samma modell och samma underlag gav fyrtio gånger fler träffar när
                  instruktionen bad om vaksamhet i stället för försiktighet. Ett mått
                  som svänger så kraftigt med formuleringen mäter formuleringen, inte
                  riksdagen."
          />
          <Steg
            nummer="3"
            rubrik="Ingen träff överlevde granskning"
            tal="0 av 9"
            text="De starkaste fallen granskades av en oberoende bedömare med uppgift
                  att motbevisa dem. Sju föll, två blev osäkra, inget höll. Oftast för
                  att talaren formellt yrkat bifall till en annan reservation — det
                  påstådda kravet var en bisats i förbifarten."
          />
        </ol>
      </section>

      <section className="regel mt-14 pt-7">
        <h2 className="display text-2xl">Varför det ser ut som hyckleri</h2>
        <div className="mt-4 grid max-w-[68ch] gap-4 text-[15px] leading-relaxed"
             style={{ color: 'var(--black-mjuk)' }}>
          <p>
            I riksdagen ställs utskottets förslag mot en reservation. Ett parti
            som talar varmt för mer resurser till skolan och sedan röstar nej har
            nästan alltid röstat för sitt eget förslag om mer resurser till skolan.
          </p>
          <p>
            Ett verktyg som räknar det som en motsägelse producerar hundratals
            falska anklagelser. Vi valde att inte bygga det.{' '}
            <Link href="/samstammighet" className="underline hover:opacity-60">
              Vem som röstar med vem
            </Link>{' '}
            säger betydligt mer om svensk politik — och kan inte ifrågasättas.
          </p>
        </div>
      </section>

      {totalt > 0 && (
        <section className="regel mt-14 pt-7">
          <h2 className="display text-2xl">Underlaget, öppet</h2>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--black-svag)' }}>
            {totalt.toLocaleString('sv-SE')} bedömningar av anföranden mot
            partiets röst i samma ärende.
          </p>
          <table className="mt-5 w-full max-w-md text-[14px]">
            <tbody>
              {Object.entries(fordelning)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <tr key={k} className="regel">
                    <td className="py-2">{k}</td>
                    <td className="tabular py-2 text-right font-semibold">{v}</td>
                    <td className="tabular py-2 pl-6 text-right" style={{ color: 'var(--black-svag)' }}>
                      {((100 * v) / totalt).toFixed(1)} %
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="mt-4 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
            Siffrorna blandar två promptformuleringar och ska inte läsas som ett
            mått på riksdagen. De redovisas för att visa hur känsligt måttet är.
          </p>
        </section>
      )}
    </main>
  )
}

function Steg({ nummer, rubrik, tal, text }: {
  nummer: string; rubrik: string; tal: string; text: string
}) {
  return (
    <li className="grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
      <div className="display tabular text-[clamp(2rem,5vw,3rem)] leading-none"
           style={{ color: 'var(--accent)' }}>
        {tal}
      </div>
      <div>
        <h3 className="text-[16px] font-semibold">
          <span style={{ color: 'var(--black-svag)' }}>{nummer}. </span>
          {rubrik}
        </h3>
        <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed"
           style={{ color: 'var(--black-mjuk)' }}>
          {text}
        </p>
      </div>
    </li>
  )
}
