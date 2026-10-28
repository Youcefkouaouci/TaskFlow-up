export default function ProductivityBanner({
  criticalCount = 0,
  nextDeadlineText = null,
  tempoState = 'Aucune urgence',
}) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 mb-space-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0">
          priority_high
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-on-surface">
            {criticalCount} action{criticalCount > 1 ? 's' : ''} critique
            {criticalCount > 1 ? 's' : ''}
          </span>
          <span className="text-xs text-outline">
            {nextDeadlineText
              ? `· Prochaine échéance : ${nextDeadlineText}`
              : 'dans le quadrant Faire (Q1).'}
          </span>
        </div>
      </div>

      <span className="text-[11px] font-semibold text-secondary bg-secondary-fixed px-2 py-0.5 rounded flex-shrink-0">
        {tempoState}
      </span>
    </div>
  )
}
