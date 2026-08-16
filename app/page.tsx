import Link from 'next/link'
import { antal, datum, db, heltal, lista, namn, rader, rakna, tal, REGERINGSPARTIERNA } from '@/lib/db'
import { Linjeetikett } from '@/components/rostrad'
import { Etikett, Forbehall, Knapp, Nyckeltal, Partiprick, Textlank } from '@/components/system'
import { Stapel } from '@/components/stapel'
import { regeringsspann } from '@/lib/partier'
import AMNEN from '@/lib/amnen.json'

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
    par,
    ensamma,
    forluster,
    riksmoten,
    amnen,
    likhetsspann,
    jamna,
    avgjorde,
    voteringar,
  ] = await Promise.all([
    rader<any>(klient.from('partisamstammighet').select('parti_1, parti_2, gemensamma, lika, samstammighet')
      .eq('amne', 'alla').order('samstammighet', { ascending: false }).limit(1)),
    rader<Ensam>(klient.from('parti_ensam').select('parti, ensam, av, andel')
      .order('ensam', { ascending: false })),
    rader<Forlust>(klient.from('utskottet_forlorade').select('*').order('datum')),
    // En rad per riksmöte. Frånvaron för hela perioden måste summeras ur dem;
    // den enskilda raden är en helt annan siffra, och spannet mellan dem räknas
    // fram nedan och skrivs ut bredvid totalen.
    rader<{ rm: string; roster: number; franvarande: number }>(
      klient.from('riksmote_summering').select('rm, roster, franvarande')),
    // Storleken, inte tecknet. Sorterat på avvikande_delta vann alltid det par
    // som röstar mer olikt än vanligt, och ett par som röstar ovanligt lika
    // kunde aldrig nå citatet — hur stort utslaget än var.
    // Sekundärsorteringen är inte kosmetisk: två ämnen kan dela toppvärde
    // (jämställdhet och övrigt ligger båda på 19,9), och utan den avgör
    // radordningen i den materialiserade vyn vilket som blir sidans citat.
    rader<any>(klient.from('amne_oversikt').select('*')
      .order('avvikande_storlek', { ascending: false }).order('amne').limit(1)),
    regeringsspann(),
    rakna(antal(klient, 'jamn_votering').lte('marginal', 3), 'jämna voteringar'),
    // Samma marginalvillkor som raden ovan: siffran presenteras som en delmängd
    // av de jämna voteringarna och måste räknas på samma urval.
    rakna(antal(klient, 'jamn_votering').lte('marginal', 3).eq('franvaron_avgjorde', true),
      'voteringar där frånvaron avgjorde'),
    rakna(antal(klient, 'jamn_votering'), 'voteringar'),
  ])

  const rankade = ensamma.map((e) => ({ ...e, andel: Number(e.andel), ensam: Number(e.ensam) }))
  const mestEnsam = rankade[0]

  const ensamExempel = await rader<Exempel>(
    klient.from('ensam_exempel').select('*')
      .eq('parti', mestEnsam?.parti ?? '').order('datum', { ascending: false }))

  const roster = riksmoten.reduce((n, r) => n + Number(r.roster), 0)
  const franvarande = riksmoten.reduce((n, r) => n + Number(r.franvarande), 0)

  // Spannet mellan riksmötena. Talet för hela perioden är den vanligaste
  // förväxlingen i materialet — den som klickar vidare till frånvarosidan möts
  // av ett annat tal, och behöver veta varför redan här.
  //
  // Riksmötet skrivs ut bredvid varje ytterlighet. Ett nyss påbörjat riksmöte
  // har få voteringar och kan ge ett extremvärde; då ska läsaren se vilket det
  // gäller i stället för att få ett spann utan angivet underlag.
  const perRiksmote = riksmoten
    .filter((r) => Number(r.roster) > 0)
    .map((r) => ({
      rm: r.rm as string,
      andel: (100 * Number(r.franvarande)) / Number(r.roster),
    }))
    .sort((x, y) => x.andel - y.andel)

  const a = amnen[0] as any

  return {
    topp: par[0] as any,
    rankade,
    mestEnsam,
    ensamExempel,
    forluster,
    franvaroandel: roster > 0 ? (100 * franvarande) / roster : 0,
    lagsta: perRiksmote[0],
    hogsta: perRiksmote[perRiksmote.length - 1],
    likhetsspann,
    roster,
    jamna,
    avgjorde,
    voteringar,
    amne: a && {
      ...a,
      avvikande_har: Number(a.avvikande_har),
      avvikande_normalt: Number(a.avvikande_normalt),
      avvikande_storlek: Number(a.avvikande_storlek),
    },
  }
}

/**
 * M, KD och L röstar lika i praktiskt taget varje votering. Namnger ett fynd ett av
 * dem gäller det i praktiken alla tre, och det måste stå bredvid siffran.
 */
function utbytbara(amne: { avvikande_1: string; avvikande_2: string }) {
  return REGERINGSPARTIERNA.some((p) => p === amne.avvikande_1 || p === amne.avvikande_2)
}

export default async function Start() {
  const d = await hamta()

  // Meningarna nedan hämtar både tal och namn ur data. En hårdkodad formulering
  // som "båda gångerna" eller "M, KD och L gjorde det aldrig" blir tyst osann
  // så fort nästa riksmöte importeras.
  const aldrigEnsamma = d.rankade.filter((p) => p.ensam === 0).map((p) => namn(p.parti))
  const forlustPartier = [...new Set(d.forluster.flatMap((f) => f.motforslag_partier ?? []))]
  const storstEnsam = d.rankade[0]?.ensam || 1
  // De av de tre utbytbara partierna som faktiskt står i ämnescitatet. Oftast
  // ett, men paret kan bestå av två av dem, och då ska båda namnges.
  const utpekade = d.amne
    ? REGERINGSPARTIERNA.filter((p) => p === d.amne.avvikande_1 || p === d.amne.avvikande_2)
    : []
  // Citatet kan lika gärna handla om ett par som röstar ovanligt lika som om
  // ett som röstar ovanligt olikt. Talen bär inte riktningen på egen hand:
  // 61 mot 36 ser ut som en spricka tills det står att 36 är det normala.
  const amnetIsar = d.amne ? Number(d.amne.avvikande_delta) < 0 : false

  return (
    <main>
      {/* Hero */}
      <section className="pb-16 pt-[72px] sm:pb-[72px] sm:pt-[88px]">
        <div className="stig flex items-center gap-2.5" style={{ animationDelay: '0ms' }}>
          <span
            aria-hidden
            className="inline-block h-[9px] w-[9px] rounded-full"
            style={{ background: 'var(--accent)' }}
          />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
            Mandatperioden 2022–2026
          </span>
        </div>

        <h1
          className="display stig mt-10 max-w-[15ch] text-[clamp(3rem,9vw,116px)]"
          style={{ animationDelay: '80ms' }}
        >
          Så röstade riksdagen.
        </h1>

        <p
          className="stig mt-10 max-w-[46ch] text-[clamp(18px,2.4vw,22px)] leading-[1.45]"
          style={{ color: 'var(--black-mjuk)', animationDelay: '160ms' }}
        >
          {heltal(d.voteringar)} voteringar med namnupprop, var och en förklarad
          på vanlig svenska. Här är fem saker de tillsammans visar.
        </p>

        <div className="stig mt-10 flex flex-wrap gap-3" style={{ animationDelay: '160ms' }}>
          <Knapp href="#fynd">Läs de fem fynden</Knapp>
          <Knapp href="/voteringar" ton="sekundar">Sök en votering</Knapp>
        </div>
      </section>

      {/* Fynd 01–02 — två celler delade av en hårlinje */}
      <section
        id="fynd"
        className="grid scroll-mt-6 border-t sm:grid-cols-2"
        style={{ borderColor: 'var(--linje)' }}
      >
        <div
          className="border-b py-11 sm:border-b-0 sm:border-r sm:pr-12"
          style={{ borderColor: 'var(--linje)' }}
        >
          <Etikett>Fynd 01 · Samstämmighet</Etikett>
          <Nyckeltal klass="mt-[22px] text-[clamp(3.4rem,10vw,92px)]">
            {d.topp ? heltal(Number(d.topp.lika)) : '—'}
          </Nyckeltal>
          <p className="mt-[22px] max-w-[34ch] text-[18px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
            av {heltal(Number(d.topp?.gemensamma ?? 0))} voteringar röstade{' '}
            {namn(d.topp?.parti_1)} och {namn(d.topp?.parti_2)} lika.{' '}
            {Number(d.topp?.lika) === Number(d.topp?.gemensamma)
              ? 'Deras linjer gick aldrig isär.'
              : `Det är ${tal(Number(d.topp?.samstammighet ?? 0))} % — inget par röstade oftare lika.`}
          </p>
          <Textlank href="/samstammighet" className="mt-5">Se hela matrisen</Textlank>
        </div>

        <div className="py-11 sm:pl-12">
          <Etikett>Fynd 02 · Ensam mot alla</Etikett>
          <Nyckeltal klass="mt-[22px] text-[clamp(3.4rem,10vw,92px)]">
            {heltal(d.mestEnsam?.ensam ?? 0)}
          </Nyckeltal>
          <p className="mt-[22px] max-w-[34ch] text-[18px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
            gånger stod {namn(d.mestEnsam?.parti)} ensamt mot alla sju andra
            partier — oftare än något annat parti.
            {aldrigEnsamma.length ? ` ${lista(aldrigEnsamma)} gjorde det aldrig.` : ''}
          </p>
          <Textlank href="#ensam" className="mt-5">Se alla åtta partier</Textlank>
        </div>
      </section>

      {/* Fynd 03 — tal och mening i samma baslinje */}
      <section className="regel py-11">
        <Etikett>Fynd 03 · Kammaren fällde utskottet</Etikett>
        <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-4">
          <Nyckeltal klass="text-[clamp(3.4rem,10vw,92px)]">{d.forluster.length}</Nyckeltal>
          <p className="mb-2 max-w-[52ch] text-[18px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
            gånger föll utskottets förslag i kammaren, av {heltal(d.voteringar)} voteringar.
            {forlustPartier.length ? ` Reservationen kom från ${lista(forlustPartier.map(namn))}.` : ''}
          </p>
        </div>
        <Textlank href="#forlorade" className="mt-6">Se fallen</Textlank>
      </section>

      {/* Fynd 04–05 — sidans enda mörka fält. Lime får bara förekomma här. */}
      <section className="panel helbredd py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-y-12 px-5 sm:px-8 md:grid-cols-[1.1fr_1fr] md:gap-x-14">
        <div>
          <Etikett>Fynd 04 · Frånvaro</Etikett>
          <Nyckeltal ton="signal" klass="mt-5 text-[clamp(4rem,13vw,148px)]">
            {tal(d.franvaroandel)} %
          </Nyckeltal>
          <p className="mt-7 max-w-[38ch] text-[20px] leading-[1.45]" style={{ color: 'var(--black-mjuk)' }}>
            av {heltal(d.roster)} röstningstillfällen stod tomma. Andelen
            varierar mellan riksmötena: {tal(d.hogsta?.andel ?? 0)} % i {d.hogsta?.rm}{' '}
            mot {tal(d.lagsta?.andel ?? 0)} % i {d.lagsta?.rm}.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          <Etikett>Fynd 05 · Frånvaron avgjorde</Etikett>
          <Nyckeltal ton="signal" klass="text-[clamp(3.4rem,10vw,92px)]">
            {heltal(d.avgjorde)}
          </Nyckeltal>
          <p className="max-w-[40ch] text-[17px] leading-[1.5]" style={{ color: 'var(--black-mjuk)' }}>
            voteringar hade kunnat sluta annorlunda om alla frånvarande röstat
            med sitt parti — av {heltal(d.jamna)} som avgjordes med tre rösters
            marginal eller mindre.
          </p>
          <p className="max-w-[44ch] text-[13.5px] leading-[1.55]" style={{ color: 'var(--black-svag)' }}>
            Aritmetik, inte anklagelse: riksdagen kvittar frånvaro, och vilka
            voteringar som kvittades framgår inte av öppna data. Beräkningen
            antar att alla frånvarande hade röstat med sitt parti.
          </p>
          <Textlank href="/franvaro#avgjorde" className="mt-2">
            Se de {heltal(d.avgjorde)} fallen
          </Textlank>
        </div>
        </div>
      </section>

      {/* Ämnesutsagan — sidans enda pull-quote */}
      {d.amne && (
        <section className="regel py-16">
          <p className="rubrik max-w-[24ch] text-[clamp(1.9rem,5.5vw,46px)] leading-[1.05]">
            I frågor om {d.amne.amne} röstar {namn(d.amne.avvikande_1)} och{' '}
            {namn(d.amne.avvikande_2)} lika i
            <span style={{ color: 'var(--accent)' }}> {tal(d.amne.avvikande_har)} % </span>
            av voteringarna — mot {tal(d.amne.avvikande_normalt)} % i alla frågor.
          </p>
          <p className="mt-6 max-w-[56ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
            {tal(d.amne.avvikande_storlek)} procentenheter{' '}
            {amnetIsar ? 'under' : 'över'} parets egen normalnivå — riksdagens
            största ämnesutslag. Inget annat partipar ligger så långt från sin
            vanliga nivå i något ämne, åt något håll. Alla 28 partipar är mätta
            likadant i alla {AMNEN.length} ämnen, utan att något par valts ut i
            förväg.
            {utbytbara(d.amne) && (
              <>
                {/* filter och inte find: står två av de tre i citatet ska båda
                    namnges, annars pekar meningen ut det ena utan att säga
                    varför just det. */}
                {' '}Att det står {lista(utpekade.map(namn))} här avgörs av
                tiondelar: {lista(REGERINGSPARTIERNA.map(namn))} röstar lika i{' '}
                {d.likhetsspann} av alla voteringar, så fyndet gäller alla tre.
              </>
            )}
          </p>
          <Textlank href="/amnen" className="mt-5">Se alla {AMNEN.length} ämnen</Textlank>
        </section>
      )}

      {/* Ensam mot alla — tabellen */}
      <section id="ensam" className="regel scroll-mt-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <h2 className="rubrik text-[clamp(2rem,5vw,44px)]">Ensam mot alla</h2>
          <p className="max-w-[42ch] text-[14.5px] sm:text-right" style={{ color: 'var(--black-mjuk)' }}>
            Hur ofta ett parti drev en linje som ingen av de sju andra delade,
            räknat på {heltal(d.mestEnsam?.av ?? 0)} voteringar.
          </p>
        </div>

        <div className="mt-7">
          {d.rankade.map((p) => (
            <div
              key={p.parti}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 py-4 sm:grid-cols-[minmax(180px,240px)_96px_1fr_80px]"
              style={{ borderBottom: '1px solid var(--linje)' }}
            >
              <span className="flex items-center gap-3 text-[17px] font-bold sm:text-[19px]">
                <Partiprick parti={p.parti} />
                {namn(p.parti)}
              </span>
              <span
                className="tabular text-right text-[17px] font-bold sm:text-left sm:text-[19px]"
                style={{ color: p.ensam > 0 ? 'var(--black)' : 'var(--black-svag)' }}
              >
                {heltal(p.ensam)}
              </span>
              <span className="hidden sm:block">
                <Stapel andel={(100 * p.ensam) / storstEnsam} />
              </span>
              <span
                className="tabular col-span-2 text-[15px] sm:col-span-1 sm:text-right"
                style={{ color: 'var(--black-svag)' }}
              >
                {tal(p.andel)} %
              </span>
            </div>
          ))}
        </div>

        <Forbehall rubrik="Nollorna är mekaniska." className="mt-7">
          {lista(REGERINGSPARTIERNA.map(namn))} röstar lika i {d.likhetsspann} av
          alla voteringar. Ett av dem kan därför nästan aldrig bli ensamt — de
          två andra står redan på samma linje. Siffran mäter inte hur
          självständigt ett parti är, utan hur ofta det drev en linje utan att få
          sällskap.
        </Forbehall>

        {d.ensamExempel.length > 0 && (
          <>
            <Etikett className="mt-14">
              De tre senaste gångerna {namn(d.mestEnsam?.parti)} stod ensamt
            </Etikett>
            <ol className="mt-5">
              {d.ensamExempel.map((e) => (
                <li key={e.forslagspunkt_id} className="regel py-5">
                  <Link href={`/voteringar/${e.forslagspunkt_id}`} className="group block">
                    <div className="mono flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
                         style={{ color: 'var(--etikett)' }}>
                      <span>{e.beteckning} · punkt {e.punkt}</span>
                      <span>{datum(e.datum)}</span>
                      <span style={{ color: 'var(--accent)' }}>{e.amne}</span>
                    </div>
                    <p className="mt-2.5 max-w-[56ch] text-[19px] font-semibold leading-[1.35] tracking-[-0.01em] transition-opacity duration-150 group-hover:opacity-70">
                      {e.sakfraga}
                    </p>
                  </Link>
                  <div className="mt-3.5 flex items-center gap-2.5">
                    <Linjeetikett parti={e.parti} linje={e.linje} />
                    <span className="text-[13.5px]" style={{ color: 'var(--black-svag)' }}>
                      röstade {e.linje.toLowerCase()} — ensamt
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {/* När utskottet förlorade */}
      <section id="forlorade" className="regel scroll-mt-6 py-16">
        <h2 className="rubrik text-[clamp(2rem,5vw,44px)]">När utskottet förlorade</h2>
        <p className="mt-5 max-w-[64ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
          I varje votering ställs utskottets förslag som ja och reservationen som
          nej. Under hela mandatperioden vann nej-sidan {d.forluster.length} gånger.
        </p>

        <ol className="mt-9">
          {d.forluster.map((f) => (
            <li key={f.forslagspunkt_id} className="regel py-6">
              <div className="mono flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] uppercase tracking-[0.1em]"
                   style={{ color: 'var(--etikett)' }}>
                <span>{f.beteckning} · punkt {f.punkt}</span>
                <span>{datum(f.datum)}</span>
              </div>
              <Link href={`/voteringar/${f.forslagspunkt_id}`} className="group block">
                <p className="mt-2.5 max-w-[56ch] text-[19px] font-semibold leading-[1.35] tracking-[-0.01em] transition-opacity duration-150 group-hover:opacity-70">
                  {f.sakfraga}
                </p>
              </Link>
              <p className="tabular mt-4 text-[15px]">
                <span className="font-bold" style={{ color: 'var(--nej)' }}>{f.nej} nej</span>
                <span style={{ color: 'var(--black-svag)' }}> mot </span>
                <span className="font-bold">{f.ja} ja</span>
                <span style={{ color: 'var(--black-svag)' }}>
                  {' '}· reservationen kom från {f.motforslag_partier?.join(', ') ?? '—'}
                </span>
              </p>
              {/* Klartexten inleds nästan alltid med "Nej innebar…", så någon
                  egen etikett behövs inte — den skulle bara upprepa texten. */}
              <p className="mt-3.5 max-w-[64ch] py-1 pl-4 text-[14.5px] leading-relaxed"
                 style={{ borderLeft: '3px solid var(--nej)', color: 'var(--black-mjuk)' }}>
                {f.nej_innebar}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-[64ch] text-[13.5px] leading-relaxed" style={{ color: 'var(--black-svag)' }}>
          Siffran gäller kammaren, inte regeringen. En regering kan förlora i
          utskottet innan frågan når votering, och sådana förluster syns inte i
          röstdata.
        </p>
      </section>

      {/* Varför ett nej sällan betyder nej */}
      <section className="regel py-16">
        <h2 className="rubrik max-w-[18ch] text-[clamp(2rem,5vw,44px)]">
          Varför ett nej sällan betyder nej
        </h2>
        <div className="mt-6 grid max-w-[70ch] gap-4 text-[16.5px] leading-[1.6]"
             style={{ color: 'var(--black-mjuk)' }}>
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
        <div className="mt-8">
          <Knapp href="/voteringar" ton="sekundar">Bläddra bland voteringarna</Knapp>
        </div>
      </section>
    </main>
  )
}
