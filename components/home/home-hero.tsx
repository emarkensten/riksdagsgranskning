'use client'

import Link from 'next/link'
import { ArrowRight, TrendingDown, AlertCircle, BarChart3, Users } from 'lucide-react'

export function HomeHero() {
  return (
    <div className="space-y-12">
      {/* Main Hero Section */}
      <div className="space-y-6">
        <div>
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">
            Riksdagsgranskning
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 max-w-3xl">
            AI-driven analysis of Swedish parliamentary motions, member activity, and the gap between rhetoric and voting behavior.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link href="/motioner">
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              Explore Motions
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <Link href="/analys">
            <button className="flex items-center gap-2 px-6 py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-50 rounded-lg font-medium transition-colors">
              View Analysis
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* Key Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Total Motions</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">8,706</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Analyzed from 2022-2025</p>
        </div>

        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Active Members</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">349</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">With voting & motion data</p>
        </div>

        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Average Absence</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">8.2%</p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-500" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Member voting absence rate</p>
        </div>

        <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Quality Anomalies</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">247</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Motions flagged for review</p>
        </div>
      </div>

      {/* Key Findings Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Key Findings</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Finding 1 */}
          <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-1">Motion Quality Variance</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Motion quality scores vary significantly by topic and sponsor. Some members consistently submit higher-quality proposals with better documentation.
                </p>
                <Link href="/analys" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                  View quality analysis →
                </Link>
              </div>
            </div>
          </div>

          {/* Finding 2 */}
          <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                  <TrendingDown className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-1">Absence Patterns</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Member absence rates show interesting patterns correlating with parliamentary period and party affiliation. Some absences align with committee work.
                </p>
                <Link href="/analys" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                  Explore absence data →
                </Link>
              </div>
            </div>
          </div>

          {/* Finding 3 */}
          <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-1">Rhetoric-Action Gap</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Analysis identifies members whose voting patterns sometimes diverge from their stated policy positions in motions, indicating potential inconsistency.
                </p>
                <Link href="/analys" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                  View rhetoric analysis →
                </Link>
              </div>
            </div>
          </div>

          {/* Finding 4 */}
          <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-1">Member Activity Profiles</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Members show diverse activity profiles, from highly active motion sponsors to focused voting participants. Detailed profiles are available.
                </p>
                <Link href="/medlemmar" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                  Browse members →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 mb-2">About This Project</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Riksdagsgranskning uses artificial intelligence to analyze Swedish parliamentary data, providing transparency into member activities, motion quality, and voting patterns. Data is sourced from the official Riksdagen API and analyzed using modern language models.
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Last updated: 2025. Data covers the 2022-2025 parliamentary period (mandatperioden).
        </p>
      </div>
    </div>
  )
}
