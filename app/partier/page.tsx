import Link from 'next/link'
import { PARTIER, PARTIFARG, lista, namn, slug, tal, REGERINGSPARTIERNA } from '@/lib/db'
import { hamtaAlla, motparter, snitt } from '@/lib/partier'

export const revalidate = 3600

export const metadata = {
  title: 'Partierna — Riksdagsgranskning',
  description:
    'Åtta partier, åtta sidor. Vem varje parti röstar med, var det skiljer sig från sin egen normalnivå, och hur ofta det stod ensamt.',
}

export default async function Partier() {
  const par = await hamtaAlla()

  const rader = PARTIER.map((parti) => {
    const mot = motparter(par, parti, 'alla')
    return {
      parti,
      narmast: mot[0],
      langst: mot[mot.length - 1],
      snitt: snitt(mot),
      voteringar: mot[0]?.gemensamma ?? 0,
    }
  })
  // Sorteras på avstånd till kammaren, inte på något som liknar en rankning av
  // hur bra partierna är. Talet säger var i kammaren partiet står, inget annat.
  const sorterade = [...rader].sort((a, b) => b.snitt - a.snitt)
  const voteringar = rader[0]?.voteringar ?? 0

  return (
    <main className="pb-10">
      <section className="regel-tjock pt-8">
        <p className="stig text-[13px] uppercase tracking-[0.18em]"
           style={{ color: 'var(--accent)', animationDelay: '0ms' }}>
          Mandatperioden 2022–2026
        </p>
        <h1 className="display stig mt-5 text-[clamp(2.6rem,8vw,5.5rem)]"
            style={{ animationDelay: '80ms' }}>
          Åtta partier<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <p className="stig mt-7 max-w-[50ch] text-[17px] leading-relaxed"
           style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}>
          Varje parti mätt på samma sätt över {voteringar.toLocaleString('sv-SE')} voteringar:
          vem det röstar med, i vilka frågor det avviker från sin egen
          normalnivå, hur ofta det stod ensamt, och hur ofta det inte var på
          plats.
        </p>
      </section>

      <ol className="mt-10">
        {sorterade.map((r) => (
          <li key={r.parti} className="regel">
            <Link href={`/partier/${slug(r.parti)}`}
                  className="group grid gap-x-8 gap-y-3 py-7 sm:grid-cols-[1fr_auto]">
              <div>
                <h2 className="display flex items-baseline gap-3 text-[clamp(1.5rem,4vw,2.3rem)] leading-tight transition-opacity group-hover:opacity-60">
                  <span className="inline-block h-5 w-1 shrink-0 translate-y-0.5 rounded-sm"
                        style={{ background: PARTIFARG[r.parti] }} aria-hidden />
                  {namn(r.parti)}
                </h2>
                <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed"
                   style={{ color: 'var(--black-mjuk)' }}>
                  Röstar oftast med {namn(r.narmast?.parti)}
                  <span className="tabular"> ({tal(r.narmast?.samstammighet ?? 0)} %)</span>, minst
                  med {namn(r.langst?.parti)}
                  <span className="tabular"> ({tal(r.langst?.samstammighet ?? 0)} %)</span>.
                </p>
              </div>
              <div className="sm:text-right">
                <div className="display tabular text-[clamp(1.8rem,5vw,2.6rem)] leading-none"
                     style={{ color: 'var(--accent)' }}>
                  {tal(r.snitt)} %
                </div>
                <div className="mt-2 max-w-[18ch] text-[12px] uppercase tracking-[0.1em] sm:ml-auto"
                     style={{ color: 'var(--black-svag)' }}>
                  snitt mot de sju andra
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <p className="regel mt-1 max-w-[64ch] pt-5 text-[13px] leading-relaxed"
         style={{ color: 'var(--black-svag)' }}>
        Snittet är partiets genomsnittliga samstämmighet med de sju andra. Ett
        högt tal betyder att partiet står nära kammarens mitt, inte att det har
        rätt eller får igenom mest — {namn('S')} har inget parti det röstar lika
        med ens hälften av gångerna.
      </p>

      <section className="regel-tjock mt-20 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">
          Tre av sidorna är nästan identiska
        </h2>
        <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed"
           style={{ color: 'var(--black-mjuk)' }}>
          {lista(REGERINGSPARTIERNA.map(namn))} röstar lika i{' '}
          {tal(minstaLikhet(par))}–{tal(hogstaLikhet(par))} % av alla voteringar.
          Deras sidor kommer därför att säga nästan samma sak, och det är ett
          resultat i sig snarare än ett fel. Läs dem som tre vyer av samma block.
        </p>
        <Link href="/metod#begransningar"
              className="mt-6 inline-block border-b pb-1 text-[14px] transition-opacity hover:opacity-60"
              style={{ borderColor: 'var(--accent)' }}>
          Så räknas talen →
        </Link>
      </section>
    </main>
  )
}

/** Spannet inom regeringsblocket, räknat ur data i stället för skrivet i text. */
function likheter(par: Awaited<ReturnType<typeof hamtaAlla>>) {
  return par
    .filter((p) => REGERINGSPARTIERNA.some((r) => r === p.parti_1)
      && REGERINGSPARTIERNA.some((r) => r === p.parti_2))
    .map((p) => Number(p.samstammighet))
}

function minstaLikhet(par: Awaited<ReturnType<typeof hamtaAlla>>) {
  const v = likheter(par)
  return v.length ? Math.min(...v) : 0
}

function hogstaLikhet(par: Awaited<ReturnType<typeof hamtaAlla>>) {
  const v = likheter(par)
  return v.length ? Math.max(...v) : 0
}
