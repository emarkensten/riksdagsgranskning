interface Motion {
  id: string
  titel: string
  ledamot_namn?: string
  party?: string
  datum?: string
  quality_score?: number
  riksmote?: string
}

export function MotionCard({ motion }: { motion: Motion }) {
  const getQualityColor = (score?: number) => {
    if (!score) return 'bg-neutral-200 dark:bg-neutral-700'
    if (score >= 7) return 'bg-green-200 dark:bg-green-900/30'
    if (score >= 5) return 'bg-yellow-200 dark:bg-yellow-900/30'
    return 'bg-red-200 dark:bg-red-900/30'
  }

  return (
    <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-md dark:hover:shadow-lg transition-all duration-200">
      {/* Title */}
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-2 line-clamp-2 group-hover:text-blue-600">
        {motion.titel}
      </h3>

      {/* Meta Info */}
      <div className="space-y-1 mb-3 text-sm">
        {motion.ledamot_namn && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Ledamot:</span>
            <span className="text-neutral-900 dark:text-neutral-50 font-medium">{motion.ledamot_namn}</span>
          </div>
        )}
        {motion.party && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Parti:</span>
            <span className="text-neutral-900 dark:text-neutral-50 font-medium">{motion.party}</span>
          </div>
        )}
        {motion.riksmote && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Riksmöte:</span>
            <span className="text-neutral-900 dark:text-neutral-50 font-medium">{motion.riksmote}</span>
          </div>
        )}
        {motion.datum && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Datum:</span>
            <span className="text-neutral-900 dark:text-neutral-50 font-medium">
              {new Date(motion.datum).toLocaleDateString('sv-SE')}
            </span>
          </div>
        )}
      </div>

      {/* Quality Score */}
      {motion.quality_score !== undefined && (
        <div className="flex items-center gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Kvalitet</span>
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
                {motion.quality_score.toFixed(1)}/10
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getQualityColor(motion.quality_score)}`}
                style={{ width: `${(motion.quality_score / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
