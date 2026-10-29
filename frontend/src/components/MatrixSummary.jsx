export default function MatrixSummary({
  totalActiveCount = 9,
  criticalCount = 3,
  mentalHealthText = 'Charge mentale équilibrée. Prochaine échéance : 17h00.',
  isFocusFaireOnly,
  onToggleFocusFaire,
}) {
  return (
    <footer className="mt-space-md flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/15">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface flex-shrink-0">
          <span className="material-symbols-outlined text-[18px]">analytics</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs sm:text-sm font-semibold text-on-surface">
            {totalActiveCount} tâches actives · {criticalCount} critiques (Faire)
          </span>
          <span className="text-xs text-outline">{mentalHealthText}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <button
          type="button"
          onClick={onToggleFocusFaire}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 ${
            isFocusFaireOnly
              ? 'bg-secondary text-on-secondary shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
          }`}
          title="Afficher uniquement les tâches du quadrant Faire"
        >
          <span className="material-symbols-outlined text-[15px]">tune</span>
          <span>{isFocusFaireOnly ? 'Afficher toute la matrice' : 'Focus Faire seul'}</span>
        </button>
      </div>
    </footer>
  )
}
