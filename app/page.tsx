import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Riksdagsgranskning',
  description:
    'Så röstade riksdagen 2022–2026. Byggt på öppna data från Sveriges riksdag.',
}

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Riksdagsgranskning</h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-400">
        Så röstade riksdagen under mandatperioden 2022–2026. Byggt på öppna data
        från Sveriges riksdag.
      </p>
      <p className="mt-8 text-sm text-neutral-500">
        Datainsamlingen är på plats. Gränssnittet byggs härnäst.
      </p>
    </main>
  )
}
