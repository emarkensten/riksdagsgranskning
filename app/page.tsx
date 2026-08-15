import Link from 'next/link'
import { db, lista, namn, tal } from '@/lib/db'
import { Linjeetikett } from '@/components/rostrad'

export const revalidate = 3600

type Ensam = { parti: string; ensam: number; av: number; andel: number }
type Exempel = {
  parti: string; linje: string; forslagspunkt_id: number; amne: string
  beteckning: string; punkt: string; datum: string; sakfraga: string
}
type Forlust = {
  forslagspunkt_id: number; rm: string; beteckning: string; punkt: string
  datum: string; sakfraga: string; ja_innebar: string; nej_innebar: string
  motforslag_partier: string[] | null; ja: number; nej: number; marginal: number
}

async function hamta() {
  const klient = db()

  const [
    { data: par },
    { data: ensamma },
    { data: forluster },
    { data: riksmoten },
    { data: amnen },
    jamna,
    avgjorde,
    voteringar,
  ] = await Promise.all([
    klient.from('partisamstammighet').select('parti_1, parti_2, gemensamma, lika, samstammighet')
      .eq('amne', 'alla').order('samstammighet', { ascending: false }).limit(1),
    klient.from('parti_ensam').select('parti, ensam, av, andel').order('ensam', { ascending: false }),
    klient.from('utskottet_forlorade').select('*').order('datum'),
    // Fyra rader. Frånvaron för hela perioden måste summeras ur dem — den
    // enskilda raden för ett riksmöte är en annan siffra (10,6–14,9 %).
    klient.from('riksmote_summering').select('rm, roster, franvarande'),
    klient.from('amne_oversikt').select('*').order('avvikande_delta').limit(1),
    klient.from('jamn_votering').select('*', { count: 'exact', head: true }).lte('marginal', 3),
    // Samma marginalvillkor som raden ovan: siffran presenteras som en delmängd
    // av de jämna voteringarna och måste räknas på samma urval.
    klient.from('jamn_votering').select('*', { count: 'exact', head: true })
      .lte('marginal', 3).eq('franvaron_avgjorde', true),
    klient.from('jamn_votering').select('*', { count: 'exact', head: true }),
  ])

  const rankade = (ensamma ?? []).map((e: any) => ({ ...e, andel: Number(e.andel) })) as Ensam[]
  const mestEnsam = rankade[0]

  const { data: ensamExempel } = await klient
    .from('ensam_exempel').select('*')
    .eq('parti', mestEnsam?.parti ?? '').order('datum', { ascending: false })

  const roster = (riksmoten ?? []).reduce((n, r: any) => n + Number(r.roster), 0)
  const franvarande = (riksmoten ?? []).reduce((n, r: any) => n + Number(r.franvarande), 0)

  const a = (amnen ?? [])[0] as any

  return {
    topp: (par ?? [])[0] as any,
    rankade,
    mestEnsam,
    ensamExempel: (ensamExempel ?? []) as Exempel[],
    forluster: (forluster ?? []) as unknown as Forlust[],
    franvaroandel: roster > 0 ? (100 * franvarande) / roster : 0,
    roster,
    jamna: jamna.count ?? 0,
    avgjorde: avgjorde.count ?? 0,
    voteringar: voteringar.count ?? 0,
    amne: a && { ...a, avvikande_har: Number(a.avvikande_har), avvikande_normalt: Number(a.avvikande_normalt) },
  }
}

/**
 * M, KD och L röstar lika i 99,9–100 % av voteringarna. Namnger ett fynd ett av
 * dem gäller det i praktiken alla tre, och det måste stå bredvid siffran.
 */
function utbytbara(amne: { avvikande_1: string; avvikande_2: string }) {
  return ['M', 'KD', 'L'].some((p) => p === amne.avvikande_1 || p === amne.avvikande_2)
}

export default async function Start() {
  const d = await hamta()

  // Meningarna nedan hämtar både tal och namn ur data. En hårdkodad formulering
  // som "båda gångerna" eller "M, KD och L gjorde det aldrig" blir tyst osann
  // så fort nästa riksmöte importeras.
  const aldrigEnsamma = d.rankade.filter((p) => p.ensam === 0).map((p) => namn(p.parti))
  const forlustPartier = [...new Set(d.forluster.flatMap((f) => f.motforslag_partier ?? []))]

  const fynd = [
    {
      tal: d.topp ? d.topp.lika.toLocaleString('sv-SE') : '—',
      text: `av ${d.topp?.gemensamma.toLocaleString('sv-SE')} voteringar röstade ${namn(d.topp?.parti_1)} och ${namn(d.topp?.parti_2)} lika. Deras linjer gick aldrig isär under hela mandatperioden.`,
      href: '/samstammighet',
      lank: 'Se hela matrisen',
    },
    {
      tal: d.mestEnsam?.ensam.toLocaleString('sv-SE') ?? '—',
      text: `gånger stod ${namn(d.mestEnsam?.parti)} ensamt mot alla sju andra partier — oftare än något annat parti.${
        aldrigEnsamma.length ? ` ${lista(aldrigEnsamma)} gjorde det aldrig.` : ''
      }`,
      href: '#ensam',
      lank: 'Se alla åtta partier',
    },
    {
      tal: String(d.forluster.length),
      text: `gånger föll utskottets förslag i kammaren, av ${d.voteringar.toLocaleString('sv-SE')} voteringar.${
        forlustPartier.length ? ` Reservationen kom från ${lista(forlustPartier.map(namn))}.` : ''
      }`,
      href: '#forlorade',
      lank: 'Se fallen',
    },
    {
      tal: `${tal(d.franvaroandel)} %`,
      text: `av ${d.roster.toLocaleString('sv-SE')} röstningstillfällen stod tomma. Att rösta i kammaren är ledamotens mest grundläggande uppgift.`,
      href: '/franvaro',
      lank: 'Se frånvaron per parti',
    },
    {
      tal: d.jamna.toLocaleString('sv-SE'),
      text: `voteringar avgjordes med tre rösters marginal eller mindre. I ${d.avgjorde} av dem hade utfallet blivit ett annat om alla frånvarande röstat med sitt parti.`,
      href: '/franvaro',
      lank: 'Se de jämna voteringarna',
    },
  ]

  return (
    <main className="pb-10">
      <section className="regel-tjock pt-8">
        <p
          className="stig text-[13px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--accent)', animationDelay: '0ms' }}
        >
          Mandatperioden 2022–2026
        </p>

        <h1
          className="display stig mt-5 text-[clamp(2.6rem,8vw,5.5rem)]"
          style={{ animationDelay: '80ms' }}
        >
          Så röstade
          <br />
          riksdagen<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>

        <p
          className="stig mt-7 max-w-[48ch] text-[17px] leading-relaxed"
          style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}
        >
          {d.voteringar.toLocaleString('sv-SE')} voteringar med namnupprop, var och
          en förklarad på vanlig svenska: vad frågan gällde, vad ett ja innebar
          och vad ett nej innebar. Här är fem saker de tillsammans visar.
        </p>
      </section>

      <section className="mt-10">
        <ol>
          {fynd.map((f, i) => (
            <li key={f.href + i} className="regel py-9">
              <div
                className="display tabular text-[clamp(3.2rem,13vw,7.5rem)] leading-[0.82]"
                style={{ color: 'var(--accent)' }}
              >
                {f.tal}
              </div>
              <p className="mt-6 max-w-[46ch] text-[19px] leading-snug">{f.text}</p>
              <Link
                href={f.href}
                className="mt-5 inline-block border-b pb-1 text-[14px] transition-opacity hover:opacity-60"
                style={{ borderColor: 'var(--accent)' }}
              >
                {f.lank} →
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Den sista siffran är aritmetik, inte en anklagelse. Riksdagen kvittar
          frånvaro: när en ledamot uteblir avstår ofta en ledamot från motsatt
          sida frivilligt, just för att styrkeförhållandet ska hålla. Vilka
          voteringar som kvittades framgår inte av öppna data, så beräkningen
          antar att alla frånvarande hade röstat med sitt parti.
        </p>
      </section>

      {d.amne && (
        <section className="regel-tjock mt-20 pt-8">
          <p className="display max-w-[26ch] text-[clamp(1.7rem,4.5vw,2.8rem)] leading-[1.05]">
            I frågor om {d.amne.amne} röstar {namn(d.amne.avvikande_1)} och{' '}
            {namn(d.amne.avvikande_2)} lika i
            <span style={{ color: 'var(--accent)' }}> {tal(d.amne.avvikande_har)} % </span>
            av voteringarna — mot {tal(d.amne.avvikande_normalt)} % i alla frågor.
          </p>
          <p className="mt-5 max-w-[56ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
            Ingen annan ämnesskillnad i riksdagen är större. Alla 28 partipar är
            mätta likadant i alla 16 ämnen, utan att något par valts ut i förväg.
            {utbytbara(d.amne) && (
              <>
                {' '}Vilket av dem som hamnar i meningen avgörs dock av tiondelar:
                Moderaterna, Kristdemokraterna och Liberalerna röstar lika i
                99,9–100 % av alla voteringar, så fyndet gäller alla tre.
              </>
            )}
          </p>
          <Link
            href="/amnen"
            className="mt-5 inline-block border-b pb-1 text-[14px] transition-opacity hover:opacity-60"
            style={{ borderColor: 'var(--accent)' }}
          >
            Se alla 16 ämnen →
          </Link>
        </section>
      )}

      <section id="ensam" className="regel mt-20 scroll-mt-6 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Ensam mot alla</h2>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Hur ofta ett parti hamnade på en linje som inget av de sju andra
          delade, räknat på samtliga {d.mestEnsam?.av.toLocaleString('sv-SE')} voteringar.
        </p>

        <table className="mt-7 w-full max-w-xl text-[14px]">
          <tbody>
            {d.rankade.map((p) => (
              <tr key={p.parti} className="regel">
                <td className="py-2.5 font-semibold">{p.parti}</td>
                <td className="tabular py-2.5 text-right font-semibold">
                  {p.ensam.toLocaleString('sv-SE')}
                </td>
                <td className="tabular py-2.5 pl-5 text-right" style={{ color: 'var(--black-svag)' }}>
                  {tal(p.andel)} %
                </td>
                <td className="w-1/2 py-2.5 pl-5">
                  <span
                    className="block h-2 rounded-sm"
                    style={{
                      width: `${(100 * p.ensam) / (d.rankade[0]?.ensam || 1)}%`,
                      background: p.ensam > 0 ? 'var(--accent)' : 'transparent',
                      minWidth: p.ensam > 0 ? '2px' : 0,
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-5 max-w-[62ch] border-l-2 py-3 pl-4 text-[14px] leading-relaxed"
           style={{ borderColor: 'var(--accent)', background: 'var(--accent-svag)', color: 'var(--black-mjuk)' }}>
          <strong style={{ color: 'var(--black)' }}>Nollorna är mekaniska.</strong>{' '}
          Moderaterna, Kristdemokraterna och Liberalerna röstar lika i 99,9–100 %
          av alla voteringar. Ett av dem kan därför nästan aldrig bli ensamt —
          de två andra står redan på samma linje. Siffran mäter inte hur
          självständigt ett parti är, utan hur ofta det drev en linje utan att
          få sällskap.
        </p>

        {d.ensamExempel.length > 0 && (
          <>
            <h3 className="mt-10 text-[13px] uppercase tracking-[0.12em]" style={{ color: 'var(--black-svag)' }}>
              De tre senaste gångerna {namn(d.mestEnsam?.parti)} stod ensamt
            </h3>
            <ol className="mt-3">
              {d.ensamExempel.map((e) => (
                <li key={e.forslagspunkt_id} className="regel py-4">
                  <Link href={`/voteringar/${e.forslagspunkt_id}`} className="group block">
                    <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] uppercase tracking-[0.1em]"
                         style={{ color: 'var(--black-svag)' }}>
                      <span>{e.beteckning} · punkt {e.punkt}</span>
                      <span>{e.datum}</span>
                      <span style={{ color: 'var(--accent)' }}>{e.amne}</span>
                    </div>
                    <p className="mt-1.5 max-w-[68ch] text-[16px] leading-snug transition-opacity group-hover:opacity-60">
                      {e.sakfraga}
                    </p>
                  </Link>
                  <div className="mt-3 flex items-center gap-2">
                    <Linjeetikett parti={e.parti} linje={e.linje} />
                    <span className="text-[12px]" style={{ color: 'var(--black-svag)' }}>
                      röstade {e.linje.toLowerCase()} — ensamt
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <section id="forlorade" className="regel mt-20 scroll-mt-6 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">När utskottet förlorade</h2>
        <p className="mt-4 max-w-[64ch] text-[15px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          I varje votering ställs utskottets förslag som ja och reservationen som
          nej. Under hela mandatperioden vann nej-sidan {d.forluster.length} gånger.
        </p>

        <ol className="mt-8">
          {d.forluster.map((f) => (
            <li key={f.forslagspunkt_id} className="regel py-6">
              <div className="flex flex-wrap items-baseline gap-x-3 text-[12px] uppercase tracking-[0.1em]"
                   style={{ color: 'var(--black-svag)' }}>
                <span>{f.beteckning} · punkt {f.punkt}</span>
                <span>{f.datum}</span>
              </div>
              <Link href={`/voteringar/${f.forslagspunkt_id}`} className="group block">
                <p className="mt-2 max-w-[60ch] text-[18px] leading-snug transition-opacity group-hover:opacity-60">
                  {f.sakfraga}
                </p>
              </Link>
              <p className="tabular mt-4 text-[15px]">
                <span style={{ color: 'var(--nej)' }}>{f.nej} nej</span>
                <span style={{ color: 'var(--black-svag)' }}> mot </span>
                <span>{f.ja} ja</span>
                <span style={{ color: 'var(--black-svag)' }}>
                  {' '}· reservationen kom från {f.motforslag_partier?.join(', ') ?? '—'}
                </span>
              </p>
              {/* Klartexten inleds nästan alltid med "Nej innebar…", så någon
                  egen etikett behövs inte — den skulle bara upprepa texten. */}
              <p className="mt-3 max-w-[64ch] border-l-2 py-1 pl-4 text-[14px] leading-relaxed"
                 style={{ borderColor: 'var(--nej)', color: 'var(--black-mjuk)' }}>
                {f.nej_innebar}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-[64ch] text-[13px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Siffran gäller kammaren, inte regeringen. En regering kan förlora i
          utskottet innan frågan når votering, och sådana förluster syns inte i
          röstdata.
        </p>
      </section>

      <section className="regel mt-20 pt-8">
        <h2 className="display text-[clamp(1.6rem,4vw,2.4rem)]">Varför ett nej sällan betyder nej</h2>
        <div
          className="mt-5 grid max-w-[70ch] gap-4 text-[16px] leading-relaxed"
          style={{ color: 'var(--black-mjuk)' }}
        >
          <p>
            I riksdagen ställs utskottets förslag mot en reservation. Ett parti
            som röstar nej till mer pengar till skolan har därför oftast röstat
            för sitt eget förslag om mer pengar till skolan.
          </p>
          <p>
            Därför står det här alltid utskrivet vad reservationen ville — inte
            bara att någon röstade nej. Utan den upplysningen blir varje slutsats
            om ett partis hållning missvisande.
          </p>
        </div>
        <Link
          href="/voteringar"
          className="mt-6 inline-block border-b pb-1 text-[14px] transition-opacity hover:opacity-60"
          style={{ borderColor: 'var(--linje)', color: 'var(--black-mjuk)' }}
        >
          Bläddra bland voteringarna →
        </Link>
      </section>
    </main>
  )
}

