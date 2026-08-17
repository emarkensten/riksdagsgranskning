import { delningsbild, OG_STORLEK, OG_TYP } from '@/lib/og'
import { FRAGOR, fraga } from '@/lib/fragor'

export const alt = 'Valfrågan, och hur riksdagens partier röstade om den'
export const size = OG_STORLEK
export const contentType = OG_TYP
export const revalidate = 3600

export function generateStaticParams() {
  return FRAGOR.map((f) => ({ slug: f.slug }))
}

/**
 * Frågesidans delningsbild.
 *
 * Rubriken är frågan, inte sajtens namn: den som ser kortet i ett flöde ska
 * kunna avgöra på en halv sekund om det svarar på något hen undrar över. Det
 * är hela poängen med att frågesidorna finns — de är den enda ytan på sajten
 * som möter läsaren i hens egna ord i stället för i kammarens.
 *
 * Ingen `sakerhet`-flagga i bilden. Alla nio är höga, och ett förbehåll som
 * bara ibland dyker upp i ett socialt kort läses som en varning om just den
 * frågan. Flaggan hör hemma på sidan, där den kan förklaras.
 */
export default async function Bild({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const f = fraga(slug)
  if (!f) {
    return delningsbild({
      etikett: 'Valfrågor 2026',
      rubrik: 'Den här frågan finns inte.',
      fot: 'Nio valfrågor där en votering ordagrant matchar.',
    })
  }
  return delningsbild({
    etikett: 'Valfrågor 2026',
    rubrik: f.rubrik,
    fot: 'Så röstade riksdagens partier — och vad ett ja och ett nej innebar.',
  })
}
