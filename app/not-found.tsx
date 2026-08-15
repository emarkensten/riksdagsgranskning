import Link from 'next/link'

/**
 * 404. Nås av notFound() i voteringsdetaljen, partisidan och voteringslistans
 * sidnummer — alla tre kan få en adress som ser rimlig ut men inte finns.
 */
export default function Saknas() {
  return (
    <main className="pb-10">
      <div className="regel-tjock pt-8">
        <p className="text-[13px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          404
        </p>
        <h1 className="display mt-5 max-w-[16ch] text-[clamp(2.2rem,6vw,4rem)]">
          Den här sidan finns inte<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <p className="mt-7 max-w-[52ch] text-[17px] leading-relaxed" style={{ color: 'var(--black-mjuk)' }}>
          Adressen kan höra till en votering utan klarspråksförklaring, ett
          parti som inte sitter i riksdagen, eller ett sidnummer bortom listans
          slut.
        </p>
      </div>

      <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[14px]">
        {[
          ['/voteringar', 'Bläddra bland voteringarna'],
          ['/partier', 'De åtta partierna'],
          ['/metod', 'Så räknar vi'],
        ].map(([href, text]) => (
          <Link key={href} href={href} className="border-b pb-1 transition-opacity hover:opacity-60"
                style={{ borderColor: 'var(--accent)' }}>
            {text}
          </Link>
        ))}
      </nav>
    </main>
  )
}
