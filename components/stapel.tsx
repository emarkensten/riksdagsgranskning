/**
 * Stapeln som ligger sist i sajtens tabellrader.
 *
 * Den är alltid en upprepning av talet bredvid — aldrig den enda bäraren av
 * informationen — och därför `aria-hidden`. Skalan är procent av radens bredd,
 * så en stapel som ska visa något annat än en andel skickar in det omräknat.
 */
export function Stapel({
  andel,
  farg = 'var(--accent)',
  hojd = 'h-2',
}: {
  andel: number
  farg?: string
  hojd?: string
}) {
  return (
    <span
      aria-hidden
      className={`block rounded-sm ${hojd}`}
      style={{
        width: `${Math.max(0, Math.min(100, andel))}%`,
        background: farg,
        minWidth: andel > 0 ? '2px' : 0,
      }}
    />
  )
}
