/**
 * Stapeln som ligger i sajtens tabellrader.
 *
 * Den är alltid en upprepning av talet bredvid — aldrig den enda bäraren av
 * informationen — och därför `aria-hidden`. Skalan är procent av radens bredd,
 * så en stapel som ska visa något annat än en andel skickar in det omräknat.
 *
 * Nollan ritar ingenting alls, inte ens spåret: en tom cell säger "det hände
 * aldrig" tydligare än ett tomt spår, som läses som ett mätfel.
 */
export function Stapel({
  andel,
  farg = 'var(--accent)',
  hojd = 14,
}: {
  andel: number
  farg?: string
  hojd?: number
}) {
  if (!(andel > 0)) return <span aria-hidden className="block" />

  const radie = hojd >= 12 ? 3 : 2
  return (
    <span
      aria-hidden
      className="block w-full"
      style={{ height: hojd, borderRadius: radie, background: 'var(--spar)' }}
    >
      <span
        className="block"
        style={{
          height: hojd,
          width: `${Math.min(100, andel)}%`,
          minWidth: 2,
          borderRadius: radie,
          background: farg,
        }}
      />
    </span>
  )
}
