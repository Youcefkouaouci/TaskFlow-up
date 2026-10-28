/**
 * ProductivityBanner.jsx
 * Bannière synthétique de charge mentale et de productivité.
 * 
 * --------------------------------------------------------------------------
 * FONCTIONNALITÉS FRONTEND :
 * - Signale visuellement les tâches prioritaires devant être traitées dans la journée
 * - Affiche une alerte stylisée avec icône 'priority_high'
 * - Affiche le badge de rythme (ex. "Rythme soutenu")
 * 
 * NOTE API BACKEND :
 * - Les données de cette bannière proviennent du calcul métier du domaine Task
 *   ou d'un endpoint dédié d'intelligence de planning :
 *   -> GET /api/tasks/insights
 *   Exemple de réponse JSON :
 *   {
 *     criticalCount: 3,
 *     deadlineLimit: "18h",
 *     tempoState: "Rythme soutenu"
 *   }
 * --------------------------------------------------------------------------
 */

export default function ProductivityBanner({
  criticalCount = 3,
  deadlineLimit = '18h',
  tempoState = 'Rythme soutenu',
}) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-container-low rounded-lg border border-outline-variant/20 mb-space-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0">
          priority_high
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs sm:text-sm font-semibold text-on-surface">
            {criticalCount} actions critiques
          </span>
          <span className="text-xs text-outline">
            attendent votre validation avant {deadlineLimit}.
          </span>
        </div>
      </div>

      <span className="text-[11px] font-semibold text-secondary bg-secondary-fixed px-2 py-0.5 rounded flex-shrink-0">
        {tempoState}
      </span>
    </div>
  )
}
