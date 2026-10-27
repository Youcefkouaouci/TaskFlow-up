/**
 * Quadrant.jsx
 * Composant de quadrant de la Matrice d'Eisenhower (2x2).
 * 
 * --------------------------------------------------------------------------
 * FONCTIONNALITÉS FRONTEND :
 * - Affiche le titre du quadrant, la qualification (urgent/important) et le compteur
 * - Rend la liste des cartes de tâches associées
 * - Applique le style distinctif (ex: bordure rouge accentuée pour le quadrant 1 "FAIRE")
 * 
 * NOTE API BACKEND :
 * - Filtrage des tâches d'un quadrant :
 *   -> GET /api/tasks?quadrant=1
 * --------------------------------------------------------------------------
 */

import TaskCard from './TaskCard'

export default function Quadrant({
  id,
  title,
  subtitle,
  badgeText,
  isCritical = false,
  tasks = [],
  onToggleStatus,
  onDelete,
  onDelegate,
}) {
  return (
    <div
      className={`flex flex-col bg-surface-container-low rounded-lg p-space-md gap-space-sm relative overflow-hidden transition-all ${
        isCritical ? 'border-l-[3.5px] border-secondary' : 'border border-outline-variant/10'
      }`}
    >
      {/* En-tête du quadrant */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs sm:text-sm font-bold tracking-wider uppercase ${
              isCritical
                ? 'text-secondary'
                : id === 2
                ? 'text-primary'
                : id === 3
                ? 'text-on-surface-variant'
                : 'text-outline'
            }`}
          >
            {title}
          </span>
          <span className="text-xs text-outline">{subtitle}</span>
        </div>

        {/* Badge de comptage de tâches */}
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
            isCritical
              ? 'bg-secondary text-on-secondary'
              : 'bg-surface-container text-on-surface'
          }`}
        >
          {badgeText}
        </span>
      </div>

      {/* Liste des cartes du quadrant */}
      <div className="flex flex-col gap-2">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              onDelegate={onDelegate}
            />
          ))
        ) : (
          <div className="p-3 text-center text-xs text-outline italic bg-surface-container-lowest/50 rounded-lg">
            Aucune tâche dans ce quadrant
          </div>
        )}
      </div>
    </div>
  )
}
