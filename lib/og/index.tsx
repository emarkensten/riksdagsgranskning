import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { korta } from '@/lib/sajt'

/**
 * Delningsbilden, i formspråkets egna värden.
 *
 * Bilden ritas av satori och inte av en webbläsare, så CSS-variablerna i
 * globals.css finns inte här — färgerna står som literaler och måste hållas i
 * takt med tabellen i docs/DESIGN_GUIDELINES.md för hand. Det är skälet till
 * att de ligger samlade överst och inte utspridda i märkspråket.
 *
 * Bara ljust läge. En delningsbild följer inte läsarens tema.
 */
const PAPPER = '#fbfbf9'
const BLACK = '#0b0b0c'
const BLACK_MJUK = '#45454a'
const LINJE = '#e6e4dd'
const ACCENT = '#cf3c14'

export const OG_STORLEK = { width: 1200, height: 630 }
export const OG_TYP = 'image/png'

/**
 * Typsnitten läses från disk, inte från Google och inte genom `fetch`.
 *
 * `next/font/google` lägger filerna i .next under ett hashat namn som inte går
 * att peka på härifrån, och en hämtning mot fonts.gstatic.com vid rendering
 * hade gjort varje delningsbild beroende av att någon annans tjänst svarar.
 *
 * Mönstret `fetch(new URL('./x.ttf', import.meta.url))` — det som står i Next
 * egen dokumentation — fungerar bara när filen ligger bredvid själva
 * opengraph-image-filen. Härifrån gör webpack om den till den relativa
 * sökvägen `/_next/static/media/…`, och `fetch` kan inte tolka en relativ URL
 * på servern: `TypeError: Failed to parse URL`. Därför `readFile` mot en
 * absolut sökväg i stället, med filerna listade i `outputFileTracingIncludes`
 * så att de följer med i bygget.
 *
 * satori klarar ttf och otf men inte woff2, så filerna ligger som ttf.
 */
async function typsnitt() {
  const katalog = join(process.cwd(), 'lib', 'og')
  const [fet, normal] = await Promise.all([
    readFile(join(katalog, 'SchibstedGrotesk-ExtraBold.ttf')),
    readFile(join(katalog, 'SchibstedGrotesk-Regular.ttf')),
  ])
  return [
    { name: 'Schibsted Grotesk', data: fet, weight: 800 as const, style: 'normal' as const },
    { name: 'Schibsted Grotesk', data: normal, weight: 400 as const, style: 'normal' as const },
  ]
}

/**
 * Så många tecken får plats på fyra rader vid den minsta rubrikstorleken.
 *
 * Mätt mot materialet, inte gissat: sakfrågorna är i snitt 126 tecken och som
 * längst 247, och 1 758 av 2 587 är längre än 110. En bild som bara kapar på
 * höjden hade alltså skurit av var tredje rubrik mitt i ett ord, utan att det
 * syns att något fattas.
 */
const TAK = 150

/**
 * Rubrikens storlek faller med längden.
 *
 * En sakfråga kan vara tre ord eller trettio, och en fast storlek spräcker den
 * långa. Stegen är valda mot den användbara bredden — 1 200 px minus 144 px
 * marginal — så att varje steg ryms på fyra rader ända upp till TAK.
 */
function storlek(text: string) {
  if (text.length <= 34) return 104
  if (text.length <= 60) return 82
  if (text.length <= 110) return 62
  return 52
}

/**
 * Delningsbilden. `etikett` står överst i signalfärg, `rubrik` bär bilden och
 * `fot` är den hela meningen under hårlinjen.
 */
export function delningsbild({
  etikett,
  rubrik,
  fot,
}: {
  etikett: string
  rubrik: string
  fot: string
}) {
  const text = korta(rubrik, TAK)
  return typsnitt().then(
    (fonts) =>
      new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: PAPPER,
              padding: '64px 72px',
              fontFamily: 'Schibsted Grotesk',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: ACCENT }} />
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: ACCENT,
                }}
              >
                {etikett}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: storlek(text),
                fontWeight: 800,
                letterSpacing: '-0.045em',
                lineHeight: 1.02,
                color: BLACK,
                // Fyra rader är taket. korta() ska ha gjort det onödigt, men
                // utan spärren trycker en oväntat bred rubrik ut ordmärket ur
                // bilden i stället för att kapas.
                maxHeight: storlek(text) * 4.2,
                overflow: 'hidden',
              }}
            >
              {text}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                borderTop: `1px solid ${LINJE}`,
                paddingTop: 26,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 26,
                  fontWeight: 400,
                  color: BLACK_MJUK,
                  maxWidth: 780,
                }}
              >
                {fot}
              </div>
              {/* Samma delning som ordmärket i app/layout.tsx: första halvan i
                  bläck, andra i signalfärg. Bilden ritas av satori och kan inte
                  läsa komponenten, så strängen står två gånger — ändras den ena
                  ska den andra följa med. */}
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em' }}>
                <span style={{ color: BLACK }}>Riksdags</span>
                <span style={{ color: ACCENT }}>kammaren</span>
              </div>
            </div>
          </div>
        ),
        { ...OG_STORLEK, fonts },
      ),
  )
}
