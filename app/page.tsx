import Link from 'next/link'
import { db } from '@/lib/db'

export const revalidate = 3600

async function siffror() {
  const klient = db()
  const [voteringar, punkter] = await Promise.all([
    klient.from('punkt_klartext').select('*', { count: 'exact', head: true }),
    klient.from('forslagspunkt').select('*', { count: 'exact', head: true })
      .not('votering_id', 'is', null),
  ])
  // Färdigräknat i en materialiserad vy — att aggregera 909k röstrader per
  // sidladdning slog i databasens statement timeout.
  const { data: sum } = await klient
    .from('riksmote_summering').select('franvaroandel').eq('rm', '2024/25').maybeSingle()

  return {
    forklarade: voteringar.count ?? 0,
    voteringspunkter: punkter.count ?? 0,
    franvaroandel: Number(sum?.franvaroandel ?? 0),
  }
}

export default async function Start() {
  const s = await siffror()

  return (
    <main className="pb-10">
      <section className="regel-tjock pt-8">
        <p
          className="stig text-[13px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--accent)', animationDelay: '0ms' }}
        >
          Riksmöte 2024/25
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
          className="stig mt-7 max-w-[46ch] text-[17px] leading-relaxed"
          style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}
        >
          Varje votering i kammaren, förklarad på vanlig svenska: vad frågan
          gällde, vad ett ja innebar och vad ett nej innebar — och hur varje
          parti ställde sig.
        </p>

        <div className="stig mt-10" style={{ animationDelay: '240ms' }}>
          <Link
            href="/voteringar"
            className="inline-block border-b-2 pb-1 text-[15px] font-medium transition-opacity hover:opacity-60"
            style={{ borderColor: 'var(--accent)' }}
          >
            Bläddra bland voteringarna →
          </Link>
        </div>
      </section>

      <section className="stig mt-20 grid gap-px sm:grid-cols-3" style={{ animationDelay: '320ms' }}>
        <Nyckeltal
          tal={s.forklarade.toLocaleString('sv-SE')}
          etikett="voteringar förklarade"
          not="Varje sammanfattning bygger på utskottets förslag och reservationerna."
        />
        <Nyckeltal
          tal={`${s.franvaroandel.toFixed(1)} %`}
          etikett="frånvaro i voteringar"
          not="Andel röstningstillfällen där ledamoten inte deltog."
        />
        <Nyckeltal
          tal="0,14 %"
          etikett="röster mot egna partiet"
          not="Ledamöter bryter i praktiken aldrig partilinjen."
        />
      </section>

      <section className="regel mt-20 pt-8">
        <h2 className="display text-2xl">Varför ett nej sällan betyder nej</h2>
        <div
          className="mt-4 grid max-w-[70ch] gap-4 text-[15px] leading-relaxed"
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
      </section>
    </main>
  )
}

function Nyckeltal({ tal, etikett, not }: { tal: string; etikett: string; not: string }) {
  return (
    <div className="regel py-6 sm:pr-8">
      <div className="display tabular text-[clamp(2.2rem,6vw,3.4rem)] leading-none">{tal}</div>
      <div className="mt-2 text-[13px] uppercase tracking-[0.12em]">{etikett}</div>
      <p className="mt-2 text-[13px] leading-snug" style={{ color: 'var(--black-svag)' }}>
        {not}
      </p>
    </div>
  )
}
