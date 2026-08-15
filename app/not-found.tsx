import { Etikett, Knapp, Textlank } from '@/components/system'

/**
 * 404. Nås av notFound() i voteringsdetaljen, partisidan och voteringslistans
 * sidnummer — alla tre kan få en adress som ser rimlig ut men inte finns.
 */
export default function Saknas() {
  return (
    <main className="py-20">
      <Etikett ton="signal">404</Etikett>
      <h1 className="rubrik mt-6 max-w-[16ch] text-[clamp(2rem,5vw,44px)]">
        Den här sidan finns inte.
      </h1>
      <p className="mt-6 max-w-[52ch] text-[16.5px] leading-[1.6]" style={{ color: 'var(--black-mjuk)' }}>
        Adressen kan höra till en votering utan klarspråksförklaring, ett parti
        som inte sitter i riksdagen, eller ett sidnummer bortom listans slut.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Knapp href="/">Till startsidan</Knapp>
        <Knapp href="/voteringar" ton="sekundar">Bläddra bland voteringarna</Knapp>
      </div>

      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
        <Textlank href="/partier">De åtta partierna</Textlank>
        <Textlank href="/metod">Så räknar jag</Textlank>
      </div>
    </main>
  )
}
