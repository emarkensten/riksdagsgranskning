import { Metadata } from 'next'
import { HomeHero } from '@/components/home/home-hero'

export const metadata: Metadata = {
  title: 'Riksdagsgranskning - Swedish Parliamentary Analysis',
  description: 'AI-driven analysis of Swedish parliamentary motions, member activity, and the gap between rhetoric and voting behavior.',
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <HomeHero />
      </div>
    </main>
  )
}
