import Link from 'next/link'
import { PARTIER, lista, namn, slug, tal, REGERINGSPARTIERNA } from '@/lib/db'
import { hamtaAlla, motparter, snitt } from '@/lib/partier'
import { Etikett, Forbehall, Partiprick, Textlank } from '@/components/system'

export const revalidate = 3600

export const metadata = {
  title: 'Partierna — Namnupprop',
  description:
    'Åtta partier, åtta sidor. Vem varje parti röstar med, var det skiljer sig från sin egen normalnivå, och hur ofta det stod ensamt.',
}

/** Så många partier ligger överst som kort. Resten blir listrader. */
const KORT = 4

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
    <main>
      <section className="pb-12 pt-[72px]">
        <Etikett className="stig" ton="signal">Mandatperioden 2022–2026</Etikett>
        <h1 className="display stig mt-6 text-[clamp(2.8rem,8.5vw,96px)]" style={{ animationDelay: '80ms' }}>
          Åtta partier.
        </h1>
        <p
          className="stig mt-7 max-w-[52ch] text-[clamp(17px,2.2vw,20px)] leading-[1.45]"
          style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}
        >
          Varje parti mätt på samma sätt över {voteringar.toLocaleString('sv-SE')} voteringar:
          vem det röstar med, var det avviker från sin egen normalnivå, hur ofta
          det stod ensamt, och hur ofta det inte var på plats.
        </p>
      </section>

      {/* De fyra som står närmast kammarens mitt får kort. Mellanrummen ÄR
          hårlinjerna — därav gap-px mot en linjefärgad bakgrund. */}
      <section
        className="grid gap-px sm:grid-cols-2"
        style={{ background: 'var(--linje)', border: '1px solid var(--linje)' }}
      >
        {sorterade.slice(0, KORT).map((r) => (
          <Link
            key={r.parti}
            href={`/partier/${slug(r.parti)}`}
            className="group flex flex-col gap-4 p-8 transition-opacity duration-150 hover:opacity-70"
            style={{ background: 'var(--papper)' }}
          >
            <div className="flex items-center gap-3">
              <Partiprick parti={r.parti} storlek={14} />
              <span className="text-[clamp(20px,3vw,26px)] font-extrabold tracking-[-0.03em]">
                {namn(r.parti)}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className="tabular text-[clamp(2.4rem,6vw,52px)] font-extrabold tracking-[-0.045em]"
                style={{ color: 'var(--accent-display)' }}
              >
                {tal(r.snitt)} %
              </span>
              <Etikett>snitt mot de sju andra</Etikett>
            </div>
            <p className="text-[15.5px] leading-[1.55]" style={{ color: 'var(--black-mjuk)' }}>
              Röstar oftast med {namn(r.narmast?.parti)}
              <span className="tabular"> ({tal(r.narmast?.samstammighet ?? 0)} %)</span>, minst
              med {namn(r.langst?.parti)}
              <span className="tabular"> ({tal(r.langst?.samstammighet ?? 0)} %)</span>.
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        {sorterade.slice(KORT).map((r) => (
          <Link
            key={r.parti}
            href={`/partier/${slug(r.parti)}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 py-[18px] transition-opacity duration-150 hover:opacity-70 sm:grid-cols-[minmax(180px,240px)_1fr_120px]"
            style={{ borderBottom: '1px solid var(--linje)' }}
          >
            <span className="flex items-center gap-3 text-[17px] font-bold sm:text-[18px]">
              <Partiprick parti={r.parti} />
              {namn(r.parti)}
            </span>
            <span
              className="order-3 col-span-2 text-[14px] sm:order-none sm:col-span-1 sm:text-[15px]"
              style={{ color: 'var(--black-mjuk)' }}
            >
              Oftast med {namn(r.narmast?.parti)} ({tal(r.narmast?.samstammighet ?? 0)} %),
              minst med {namn(r.langst?.parti)} ({tal(r.langst?.samstammighet ?? 0)} %)
            </span>
            <span className="tabular text-right text-[20px] font-extrabold sm:text-[22px]">
              {tal(r.snitt)} %
            </span>
          </Link>
        ))}

        <p className="mt-6 max-w-[68ch] text-[14px] leading-[1.6]" style={{ color: 'var(--black-svag)' }}>
          Snittet är partiets genomsnittliga samstämmighet med de sju andra. Ett
          högt tal betyder att partiet står nära kammarens mitt — inte att det
          har rätt eller får igenom mest. {namn('S')} har inget parti det röstar
          lika med ens hälften av gångerna.
        </p>
      </section>

      <section className="regel mt-20 py-16">
        <h2 className="rubrik max-w-[20ch] text-[clamp(2rem,5vw,44px)]">
          Tre av sidorna är nästan identiska
        </h2>
        <p className="mt-6 max-w-[62ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          {lista(REGERINGSPARTIERNA.map(namn))} röstar lika i{' '}
          {tal(minstaLikhet(par))}–{tal(hogstaLikhet(par))} % av alla voteringar.
          Deras sidor kommer därför att säga nästan samma sak, och det är ett
          resultat i sig snarare än ett fel. Läs dem som tre vyer av samma block.
        </p>
        <Forbehall rubrik="Talen mäter position, inte kvalitet." className="mt-8" litet>
          Samstämmighet säger var i kammaren ett parti står, inte om det har
          rätt eller får igenom mest. Två partier kan rösta lika av rakt motsatta
          skäl.
        </Forbehall>
        {/* Till frågan, inte till begränsningslistan: avsnittet ovan ställer
            exakt den fråga metodsidan numera har en egen adress för. */}
        <Textlank href="/metod#tre-lika" className="mt-8">
          Varför tre av partisidorna ser likadana ut
        </Textlank>
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
