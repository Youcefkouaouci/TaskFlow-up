/**
 * ============================================================================
 * TaskFlow - Page Liste & Filtres (React 19 + Tailwind CSS v4)
 * ============================================================================
 * Reproduction exacte et enrichie de la maquette Stitch (code.html).
 * 
 * FONCTIONNALITÉS FRONTEND :
 * 1. Recherche instantanée en temps réel par mots-clés (titre, tag, etc.).
 * 2. Filtres horizontaux par Statut (Toutes, À faire, En cours, Terminées) avec compteurs dynamiques.
 * 3. Filtres contextuels par Sphère (Tous, Entreprise, École) et bouton Réinitialiser.
 * 4. Section Alerte Retard (Overdue Banner) avec actions rapides "Terminer" et "Reprogrammer".
 * 5. Liste des tâches regroupées par Quadrants Eisenhower avec compteurs réactifs.
 * 6. "Tap-to-Change Status" : un clic sur le badge de statut fait cycler l'état (À faire -> En cours -> Terminé).
 * 7. Checkbox avec feedback visuel immédiat (rayer la tâche, réduire l'opacité).
 * 8. État vide (Empty State) élégant avec bouton de réinitialisation si aucun résultat.
 * 9. Synthèse d'avancement au bas de la liste (total, retards, terminées, pourcentage d'avancement).
 * 
 * ENDPOINTS API BACKEND REQUIS :
 * -> GET /api/tasks?search=&status=&context= (Récupération filtrée des tâches)
 * -> GET /api/tasks/overdue (Récupération spécifique de la tâche critique en retard)
 * -> PATCH /api/tasks/:id/status (Mise à jour du statut cyclique ou case à cocher)
 * -> PATCH /api/tasks/:id/reschedule (Reprogrammation de l'échéance d'une tâche)
 * -> GET /api/tasks/stats (Calcul du pourcentage d'avancement global)
 * ============================================================================
 */

import { useState, useMemo } from 'react'

const INITIAL_OVERDUE_TASK = {
  id: 'task-overdue-1',
  title: 'Rapport hebdomadaire activité entreprise',
  quadrant: 1,
  context: 'Entreprise',
  tag: 'Entreprise',
  deadline: 'Hier à 18:00',
  tutorNote: 'Tuteur en attente',
  completed: false,
  status: 'À faire',
}

const INITIAL_LIST_TASKS = [
  // QUADRANT 1
  {
    id: 'task-1',
    title: 'Livrable sprint : Maquettes API livret',
    quadrant: 1,
    context: 'Entreprise',
    tag: 'Entreprise',
    deadline: "Aujourd'hui, 17h00",
    deadlineType: 'alarm',
    isUrgentBadge: true,
    status: 'inprogress', // 'todo' | 'inprogress' | 'done'
    completed: false,
  },
  {
    id: 'task-2',
    title: 'Réponse offre alternance N+1',
    quadrant: 1,
    context: 'École',
    tag: 'École',
    deadline: 'Demain, 12h00',
    deadlineType: 'alarm',
    isUrgentBadge: true,
    status: 'todo',
    completed: false,
  },
  // QUADRANT 2
  {
    id: 'task-3',
    title: 'Rédaction chapitre mémoire pro',
    quadrant: 2,
    context: 'École',
    tag: 'École',
    deadline: 'Dans 5 jours',
    deadlineType: 'event',
    isUrgentBadge: false,
    status: 'todo',
    completed: false,
  },
  // QUADRANT 3
  {
    id: 'task-4',
    title: 'Relecture slides soutenance',
    quadrant: 3,
    context: 'École',
    tag: 'École',
    sharedWith: 'Sarah',
    isUrgentBadge: false,
    status: 'inprogress',
    completed: false,
  },
  // QUADRANT 4
  {
    id: 'task-5',
    title: 'Nettoyage des favoris navigateur',
    quadrant: 4,
    context: 'Entreprise',
    tag: 'Entreprise',
    deadline: 'Archivé',
    isUrgentBadge: false,
    status: 'done',
    completed: true,
  },
]

export default function ListAndFiltersPage({ onShowToast }) {
  // --------------------------------------------------------------------------
  // ÉTATS DE FILTRAGE ET RECHERCHE
  // --------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatusFilter, setActiveStatusFilter] = useState('all') // 'all' | 'todo' | 'inprogress' | 'done'
  const [activeContextFilter, setActiveContextFilter] = useState('all') // 'all' | 'entreprise' | 'ecole'

  const [overdueTask, setOverdueTask] = useState(INITIAL_OVERDUE_TASK)
  const [tasks, setTasks] = useState(INITIAL_LIST_TASKS)

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 1 : Actions rapides sur la tâche en retard
  // ENDPOINTS CIBLES :
  // - Clôture : PATCH /api/tasks/:id/status (Body: { status: 'done', completed: true })
  // - Reprogrammation : PATCH /api/tasks/:id/reschedule (Body: { deadline: 'Demain 09:00' })
  // --------------------------------------------------------------------------
  function handleQuickDoneOverdue() {
    setOverdueTask(null)
    onShowToast?.('Tâche en retard clôturée ! Bien joué.')
  }

  function handleRescheduleOverdue() {
    setOverdueTask(null)
    onShowToast?.('Tâche reportée à demain 09:00')
  }

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 2 : Bascule Checkbox terminée / active
  // ENDPOINT CIBLE : PATCH /api/tasks/:id/status
  // --------------------------------------------------------------------------
  function handleToggleCheck(taskId) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextDone = !t.completed
          onShowToast?.(nextDone ? 'Tâche marquée comme terminée !' : 'Tâche réactivée')
          return {
            ...t,
            completed: nextDone,
            status: nextDone ? 'done' : 'todo',
          }
        }
        return t
      })
    )
  }

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 3 : Tap-to-Change Status (cycle : todo -> inprogress -> done)
  // ENDPOINT CIBLE : PATCH /api/tasks/:id/status
  // --------------------------------------------------------------------------
  function handleCycleStatus(taskId) {
    const cycle = { todo: 'inprogress', inprogress: 'done', done: 'todo' }
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus = cycle[t.status] || 'todo'
          const isDone = nextStatus === 'done'
          onShowToast?.(`Statut mis à jour : ${getStatusLabel(nextStatus)}`)
          return {
            ...t,
            status: nextStatus,
            completed: isDone,
          }
        }
        return t
      })
    )
  }

  function getStatusLabel(status) {
    if (status === 'todo') return 'À faire'
    if (status === 'inprogress') return 'En cours'
    if (status === 'done') return 'Terminé'
    return status
  }

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 4 : Réinitialiser tous les filtres
  // --------------------------------------------------------------------------
  function handleResetFilters() {
    setSearchQuery('')
    setActiveStatusFilter('all')
    setActiveContextFilter('all')
    onShowToast?.('Filtres réinitialisés')
  }

  // --------------------------------------------------------------------------
  // CALCULS MÉTIER : Filtrage dynamique des tâches
  // --------------------------------------------------------------------------
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Filtre par recherche texte
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = task.title.toLowerCase().includes(q)
        const matchTag = task.tag?.toLowerCase().includes(q)
        if (!matchTitle && !matchTag) return false
      }

      // 2. Filtre par statut
      if (activeStatusFilter !== 'all') {
        if (task.status !== activeStatusFilter) return false
      }

      // 3. Filtre par contexte
      if (activeContextFilter !== 'all') {
        const taskCtx = task.context.toLowerCase()
        if (activeContextFilter === 'entreprise' && taskCtx !== 'entreprise') return false
        if (activeContextFilter === 'ecole' && taskCtx !== 'école' && taskCtx !== 'ecole')
          return false
      }

      return true
    })
  }, [tasks, searchQuery, activeStatusFilter, activeContextFilter])

  // Compteurs pour les boutons de filtres
  const statusCounts = useMemo(() => {
    return {
      all: tasks.length + (overdueTask ? 1 : 0),
      todo: tasks.filter((t) => t.status === 'todo').length + (overdueTask ? 1 : 0),
      inprogress: tasks.filter((t) => t.status === 'inprogress').length,
      done: tasks.filter((t) => t.status === 'done').length,
    }
  }, [tasks, overdueTask])

  // Regroupement par quadrant
  const q1 = useMemo(() => filteredTasks.filter((t) => t.quadrant === 1), [filteredTasks])
  const q2 = useMemo(() => filteredTasks.filter((t) => t.quadrant === 2), [filteredTasks])
  const q3 = useMemo(() => filteredTasks.filter((t) => t.quadrant === 3), [filteredTasks])
  const q4 = useMemo(() => filteredTasks.filter((t) => t.quadrant === 4), [filteredTasks])

  const totalFilteredCount = filteredTasks.length

  return (
    <div className="flex flex-col w-full pb-24 max-w-2xl mx-auto">
      {/* 1. Zone de recherche et contrôles de filtres */}
      {/* ENDPOINT CIBLE : GET /api/tasks?search=&status=&context= */}
      <section className="px-gutter pt-space-md pb-space-sm flex flex-col gap-space-sm">
        {/* Barre de recherche */}
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
            search
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une tâche, livrable, cours..."
            className="w-full h-11 pl-10 pr-10 bg-surface-container-lowest text-on-surface font-body-md text-xs sm:text-sm rounded-xl outline-none placeholder:text-outline border border-outline-variant/15 transition-all focus:border-secondary focus:bg-surface-container-low shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-outline hover:text-on-surface"
              aria-label="Effacer la recherche"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
            </button>
          )}
        </div>

        {/* Pilules de filtres par statut */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setActiveStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeStatusFilter === 'all'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Toutes</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeStatusFilter === 'all' ? 'bg-white/20' : 'bg-surface-container-highest'
              }`}
            >
              {statusCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatusFilter('todo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeStatusFilter === 'todo'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>À faire</span>
            <span className="px-1.5 py-0.2 bg-surface-container-highest rounded-full text-[10px]">
              {statusCounts.todo}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatusFilter('inprogress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeStatusFilter === 'inprogress'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>En cours</span>
            <span className="px-1.5 py-0.2 bg-surface-container-highest rounded-full text-[10px]">
              {statusCounts.inprogress}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatusFilter('done')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeStatusFilter === 'done'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Terminées</span>
            <span className="px-1.5 py-0.2 bg-surface-container-highest rounded-full text-[10px]">
              {statusCounts.done}
            </span>
          </button>
        </div>

        {/* Filtres de Contexte Alternance (Entreprise / École) */}
        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-outline pr-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">work_history</span>
              Contexte :
            </span>

            <button
              type="button"
              onClick={() => setActiveContextFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                activeContextFilter === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Tous
            </button>

            <button
              type="button"
              onClick={() => setActiveContextFilter('entreprise')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeContextFilter === 'entreprise'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              Entreprise
            </button>

            <button
              type="button"
              onClick={() => setActiveContextFilter('ecole')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeContextFilter === 'ecole'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-surface-tint"></span>
              École
            </button>
          </div>

          {/* Bouton Réinitialiser */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-outline hover:text-secondary text-xs font-semibold flex items-center gap-0.5 ml-auto transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Réinitialiser
          </button>
        </div>
      </section>

      {/* 2. SECTION ALERTE TÂCHE EN RETARD (OVERDUE TASK) */}
      {/* ENDPOINT CIBLE : GET /api/tasks/overdue */}
      {overdueTask && (activeStatusFilter === 'all' || activeStatusFilter === 'todo') && (
        <section className="px-gutter pt-space-xs pb-space-sm animate-in fade-in duration-200">
          <div className="relative overflow-hidden bg-secondary-fixed text-on-secondary-fixed p-space-md rounded-xl shadow-xs border border-secondary/20">
            {/* Liseré bordeaux à gauche */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary"></div>

            <div className="flex items-start justify-between gap-space-sm pl-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-secondary font-bold animate-pulse">
                  crisis_alert
                </span>
                <span className="text-[11px] uppercase tracking-wider font-bold text-secondary">
                  Alerte Retard · 1 jour
                </span>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 rounded-lg text-secondary text-[11px] font-semibold shadow-xs">
                <span className="material-symbols-outlined text-[13px]">priority_high</span>
                Quadrant I
              </div>
            </div>

            <div className="mt-2 pl-2">
              <h3 className="text-sm sm:text-base text-on-secondary-fixed font-bold tracking-tight">
                {overdueTask.title}
              </h3>
              <p className="text-xs text-on-secondary-fixed-variant mt-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">calendar_clock</span>
                <span>
                  Échéance : {overdueTask.deadline} • {overdueTask.tutorNote}
                </span>
              </p>
            </div>

            {/* Boutons d'action rapide sur le retard */}
            <div className="mt-space-md flex items-center gap-2 pl-2">
              {/* ENDPOINT : PATCH /api/tasks/:id/status */}
              <button
                type="button"
                onClick={handleQuickDoneOverdue}
                className="px-3.5 py-1.5 bg-secondary hover:bg-on-secondary-fixed text-on-secondary rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                Terminer
              </button>
              {/* ENDPOINT : PATCH /api/tasks/:id/reschedule */}
              <button
                type="button"
                onClick={handleRescheduleOverdue}
                className="px-3.5 py-1.5 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">schedule_send</span>
                Reprogrammer
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. LISTE DES TÂCHES GROUPÉES PAR QUADRANTS EISENHOWER */}
      {totalFilteredCount > 0 ? (
        <div className="flex flex-col gap-space-md px-gutter mt-2">
          {/* QUADRANT 1: FAIRE (Urgent & Important) */}
          {q1.length > 0 && (
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-secondary-fixed"></span>
                  <h2 className="text-xs sm:text-sm text-secondary tracking-tight uppercase font-bold">
                    1. Faire (Urgent & Important)
                  </h2>
                </div>
                <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-semibold">
                  {q1.length} {q1.length > 1 ? 'tâches' : 'tâche'}
                </span>
              </div>

              {q1.map((task) => (
                <ListTaskCard
                  key={task.id}
                  task={task}
                  hasAccentBorder={true}
                  onToggleCheck={() => handleToggleCheck(task.id)}
                  onCycleStatus={() => handleCycleStatus(task.id)}
                />
              ))}
            </div>
          )}

          {/* QUADRANT 2: PLANIFIER (Important) */}
          {q2.length > 0 && (
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-surface-container"></span>
                  <h2 className="text-xs sm:text-sm text-on-surface tracking-tight uppercase font-bold">
                    2. Planifier (Important)
                  </h2>
                </div>
                <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-semibold">
                  {q2.length} {q2.length > 1 ? 'tâches' : 'tâche'}
                </span>
              </div>

              {q2.map((task) => (
                <ListTaskCard
                  key={task.id}
                  task={task}
                  hasAccentBorder={false}
                  onToggleCheck={() => handleToggleCheck(task.id)}
                  onCycleStatus={() => handleCycleStatus(task.id)}
                />
              ))}
            </div>
          )}

          {/* QUADRANT 3: DÉLÉGUER (Urgent) */}
          {q3.length > 0 && (
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-outline ring-4 ring-surface-container"></span>
                  <h2 className="text-xs sm:text-sm text-on-surface tracking-tight uppercase font-bold">
                    3. Déléguer
                  </h2>
                </div>
                <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-semibold">
                  {q3.length} {q3.length > 1 ? 'tâches' : 'tâche'}
                </span>
              </div>

              {q3.map((task) => (
                <ListTaskCard
                  key={task.id}
                  task={task}
                  hasAccentBorder={false}
                  onToggleCheck={() => handleToggleCheck(task.id)}
                  onCycleStatus={() => handleCycleStatus(task.id)}
                />
              ))}
            </div>
          )}

          {/* QUADRANT 4: ÉLIMINER / DÉCHARGER */}
          {q4.length > 0 && (
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-outline-variant ring-4 ring-surface-container"></span>
                  <h2 className="text-xs sm:text-sm text-on-surface-variant tracking-tight uppercase font-semibold">
                    4. Éliminer / Décharger
                  </h2>
                </div>
                <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full font-semibold">
                  {q4.length} {q4.length > 1 ? 'tâches' : 'tâche'}
                </span>
              </div>

              {q4.map((task) => (
                <ListTaskCard
                  key={task.id}
                  task={task}
                  hasAccentBorder={false}
                  onToggleCheck={() => handleToggleCheck(task.id)}
                  onCycleStatus={() => handleCycleStatus(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 4. ÉTAT VIDE (EMPTY STATE QUAND LES FILTRES RETOURNENT 0) */
        <div className="flex flex-col items-center justify-center text-center p-space-xl my-6 mx-gutter bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-space-sm text-outline">
            <span className="material-symbols-outlined text-[24px]">filter_alt_off</span>
          </div>
          <h3 className="text-sm sm:text-base text-on-surface font-semibold">
            Aucune tâche trouvée
          </h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
            Ajustez vos filtres ou terminez la journée l'esprit tranquille.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-space-md px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* 5. FOOTER DE SYNTHÈSE & POURCENTAGE */}
      {/* ENDPOINT CIBLE : GET /api/tasks/stats */}
      <footer className="mt-space-lg mx-gutter p-space-md bg-surface-container-low rounded-xl flex items-center justify-between text-on-surface-variant border border-outline-variant/15">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline text-[20px]">
            analytics
          </span>
          <span className="text-xs font-medium text-on-surface">
            {tasks.length + (overdueTask ? 1 : 0)} tâches au total ·{' '}
            <span className="text-secondary font-bold">
              {overdueTask ? '1 en retard' : '0 en retard'}
            </span>{' '}
            · {statusCounts.done} terminées
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-outline">
          <span className="material-symbols-outlined text-[16px]">done_all</span>
          <span>
            {Math.round(
              (statusCounts.done / (tasks.length + (overdueTask ? 1 : 0))) * 100
            )}
            %
          </span>
        </div>
      </footer>
    </div>
  )
}

/**
 * Composant de carte de tâche spécifique pour la vue Liste & Filtres
 */
function ListTaskCard({ task, hasAccentBorder, onToggleCheck, onCycleStatus }) {
  const isDone = task.status === 'done' || task.completed

  return (
    <article
      className={`relative bg-surface-container-lowest p-space-md rounded-xl transition-all duration-200 border border-outline-variant/15 shadow-xs ${
        isDone ? 'opacity-70' : 'opacity-100 hover:bg-surface-bright'
      }`}
    >
      {/* Liseré rouge bordeaux sur Quadrant 1 */}
      {hasAccentBorder && (
        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-secondary"></div>
      )}

      <div className={`flex items-start gap-space-sm ${hasAccentBorder ? 'pl-1.5' : ''}`}>
        {/* Checkbox avec feedback tactile */}
        <button
          type="button"
          onClick={onToggleCheck}
          className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
            isDone
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-high hover:bg-surface-container-highest text-surface-container-lowest'
          }`}
          aria-label={isDone ? 'Réactiver la tâche' : 'Terminer la tâche'}
        >
          <span
            className={`material-symbols-outlined text-[15px] ${
              isDone ? 'opacity-100' : 'opacity-0'
            }`}
          >
            check
          </span>
        </button>

        {/* Détails de la tâche */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`text-xs sm:text-sm font-semibold tracking-tight leading-snug truncate ${
                isDone ? 'line-through text-outline' : 'text-on-surface'
              }`}
            >
              {task.title}
            </span>

            {task.isUrgentBadge && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-secondary-fixed text-on-secondary-fixed shrink-0">
                Urgent
              </span>
            )}
          </div>

          {/* Badges Contexte & Échéance */}
          <div className="flex items-center gap-space-xs mt-1.5 flex-wrap">
            {task.tag && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    task.context === 'Entreprise' ? 'bg-secondary' : 'bg-surface-tint'
                  }`}
                ></span>
                {task.tag}
              </span>
            )}

            {task.sharedWith && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed">
                <span className="material-symbols-outlined text-[13px]">group</span>
                Partagé avec {task.sharedWith}
              </span>
            )}

            {task.deadline && (
              <span className="text-outline text-[11px] flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[13px]">
                  {task.deadlineType === 'alarm' ? 'alarm' : 'event'}
                </span>
                {task.deadline}
              </span>
            )}
          </div>

          {/* Barre Tap-to-Change Status */}
          <div className="mt-space-sm pt-2 flex items-center justify-between bg-surface-container-low px-2 py-1 rounded-lg">
            <span className="text-[11px] font-medium text-on-surface-variant">Statut :</span>
            <button
              type="button"
              onClick={onCycleStatus}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-surface-container-highest text-on-surface active:scale-95 transition-transform"
              title="Cliquer pour changer le statut"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  task.status === 'done'
                    ? 'bg-primary'
                    : task.status === 'inprogress'
                    ? 'bg-secondary'
                    : 'bg-outline'
                }`}
              ></span>
              <span>
                {task.status === 'done'
                  ? 'Terminé'
                  : task.status === 'inprogress'
                  ? 'En cours'
                  : 'À faire'}
              </span>
              <span className="material-symbols-outlined text-[14px] text-outline">
                unfold_more
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
