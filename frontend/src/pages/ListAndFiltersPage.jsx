import { useState, useMemo } from 'react'

export default function ListAndFiltersPage({
  tasks = [],
  onToggleStatus,
  onCycleStatus,
  onDeleteTask,
  onShowToast,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatusFilter, setActiveStatusFilter] = useState('all')
  const [activeContextFilter, setActiveContextFilter] = useState('all')

  const overdueTask = useMemo(() => {
    const now = new Date()
    return (
      tasks.find((t) => {
        if (t.completed || t.status === 'done') return false
        if (t.dueDate && new Date(t.dueDate) < now) return true
        return false
      }) || null
    )
  }, [tasks])

  function handleQuickDoneOverdue() {
    if (!overdueTask) return
    onToggleStatus?.(overdueTask.id, true)
    onShowToast?.('Tâche en retard clôturée ! Bien joué.')
  }

  function handleRescheduleOverdue() {
    if (!overdueTask) return
    onShowToast?.('Pour replanifier, modifiez la date de la tâche dans la matrice.')
  }

  function handleToggleCheck(taskId) {
    const target = tasks.find((t) => t.id === taskId)
    if (!target) return
    const nextDone = !target.completed
    onToggleStatus?.(taskId, nextDone)
  }

  function handleCycle(taskId) {
    const target = tasks.find((t) => t.id === taskId)
    if (!target) return
    const current = target.status === 'inprogress' ? 'doing' : (target.status || 'todo')
    onCycleStatus?.(taskId, current)
  }

  function handleResetFilters() {
    setSearchQuery('')
    setActiveStatusFilter('all')
    setActiveContextFilter('all')
    onShowToast?.('Filtres réinitialisés')
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = (task.title || '').toLowerCase().includes(q)
        const matchTag = (task.tag || task.context || '').toLowerCase().includes(q)
        if (!matchTitle && !matchTag) return false
      }

      if (activeStatusFilter !== 'all') {
        const norm = task.status === 'inprogress' ? 'doing' : (task.status || 'todo')
        if (activeStatusFilter === 'todo' && norm !== 'todo') return false
        if (activeStatusFilter === 'inprogress' && norm !== 'doing') return false
        if (activeStatusFilter === 'done' && norm !== 'done') return false
      }

      if (activeContextFilter !== 'all') {
        const taskCtx = (task.context || '').toLowerCase()
        if (activeContextFilter === 'entreprise' && taskCtx !== 'entreprise') return false
        if (activeContextFilter === 'ecole' && taskCtx !== 'école' && taskCtx !== 'ecole')
          return false
      }

      return true
    })
  }, [tasks, searchQuery, activeStatusFilter, activeContextFilter])

  const statusCounts = useMemo(() => {
    return {
      all: tasks.length,
      todo: tasks.filter((t) => (t.status === 'todo' || !t.status) && !t.completed).length,
      inprogress: tasks.filter(
        (t) => (t.status === 'doing' || t.status === 'inprogress') && !t.completed
      ).length,
      done: tasks.filter((t) => t.status === 'done' || t.completed).length,
    }
  }, [tasks])

  const q1 = useMemo(() => filteredTasks.filter((t) => t.quadrant === 1), [filteredTasks])
  const q2 = useMemo(() => filteredTasks.filter((t) => t.quadrant === 2), [filteredTasks])
  const q3 = useMemo(() => filteredTasks.filter((t) => t.quadrant === 3), [filteredTasks])
  const q4 = useMemo(() => filteredTasks.filter((t) => t.quadrant === 4), [filteredTasks])

  const totalFilteredCount = filteredTasks.length

  return (
    <div className="flex flex-col w-full pb-24 max-w-2xl mx-auto">
      <section className="px-gutter pt-space-md pb-space-sm flex flex-col gap-space-sm">
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

      {overdueTask && (activeStatusFilter === 'all' || activeStatusFilter === 'todo') && (
        <section className="px-gutter pt-space-xs pb-space-sm animate-in fade-in duration-200">
          <div className="relative overflow-hidden bg-secondary-fixed text-on-secondary-fixed p-space-md rounded-xl shadow-xs border border-secondary/20">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary"></div>

            <div className="flex items-start justify-between gap-space-sm pl-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-secondary font-bold animate-pulse">
                  crisis_alert
                </span>
                <span className="text-[11px] uppercase tracking-wider font-bold text-secondary">
                  Alerte Retard
                </span>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 rounded-lg text-secondary text-[11px] font-semibold shadow-xs">
                <span className="material-symbols-outlined text-[13px]">priority_high</span>
                Quadrant {overdueTask.quadrant || 1}
              </div>
            </div>

            <div className="mt-2 pl-2">
              <h3 className="text-sm sm:text-base text-on-secondary-fixed font-bold tracking-tight">
                {overdueTask.title}
              </h3>
              <p className="text-xs text-on-secondary-fixed-variant mt-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">calendar_clock</span>
                <span>
                  Échéance : {overdueTask.deadline || overdueTask.dueDate || 'Dépassée'}
                </span>
              </p>
            </div>

            <div className="mt-space-md flex items-center gap-2 pl-2">
              <button
                type="button"
                onClick={handleQuickDoneOverdue}
                className="px-3.5 py-1.5 bg-secondary hover:bg-on-secondary-fixed text-on-secondary rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                Terminer
              </button>
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

      {totalFilteredCount > 0 ? (
        <div className="flex flex-col gap-space-md px-gutter mt-2">
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
                  onCycleStatus={() => handleCycle(task.id)}
                  onDelete={onDeleteTask ? () => onDeleteTask(task.id) : null}
                />
              ))}
            </div>
          )}

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
                  onCycleStatus={() => handleCycle(task.id)}
                  onDelete={onDeleteTask ? () => onDeleteTask(task.id) : null}
                />
              ))}
            </div>
          )}

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
                  onCycleStatus={() => handleCycle(task.id)}
                  onDelete={onDeleteTask ? () => onDeleteTask(task.id) : null}
                />
              ))}
            </div>
          )}

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
                  onCycleStatus={() => handleCycle(task.id)}
                  onDelete={onDeleteTask ? () => onDeleteTask(task.id) : null}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-space-xl my-6 mx-gutter bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-space-sm text-outline">
            <span className="material-symbols-outlined text-[24px]">filter_alt_off</span>
          </div>
          <h3 className="text-sm sm:text-base text-on-surface font-semibold">
            Aucune tâche trouvée
          </h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
            {tasks.length === 0
              ? 'Aucune tâche dans la base de données. Créez-en une depuis la matrice !'
              : 'Ajustez vos filtres ou terminez la journée l’esprit tranquille.'}
          </p>
          {tasks.length > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-space-md px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {tasks.length > 0 && (
        <footer className="mt-space-lg mx-gutter p-space-md bg-surface-container-low rounded-xl flex items-center justify-between text-on-surface-variant border border-outline-variant/15">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-outline text-[20px]">
              analytics
            </span>
            <span className="text-xs font-medium text-on-surface">
              {tasks.length} tâche{tasks.length > 1 ? 's' : ''} au total ·{' '}
              <span className="text-secondary font-bold">
                {overdueTask ? '1 en retard' : '0 en retard'}
              </span>{' '}
              · {statusCounts.done} terminée{statusCounts.done > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-outline">
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            <span>
              {tasks.length > 0
                ? Math.round((statusCounts.done / tasks.length) * 100)
                : 0}
              %
            </span>
          </div>
        </footer>
      )}
    </div>
  )
}

function ListTaskCard({ task, hasAccentBorder, onToggleCheck, onCycleStatus, onDelete }) {
  const isDone = task.status === 'done' || task.completed
  const isDoing = task.status === 'doing' || task.status === 'inprogress'

  return (
    <article
      className={`relative bg-surface-container-lowest p-space-md rounded-xl transition-all duration-200 border border-outline-variant/15 shadow-xs ${
        isDone ? 'opacity-70' : 'opacity-100 hover:bg-surface-bright'
      }`}
    >
      {hasAccentBorder && (
        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-secondary"></div>
      )}

      <div className={`flex items-start gap-space-sm ${hasAccentBorder ? 'pl-1.5' : ''}`}>
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

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`text-xs sm:text-sm font-semibold tracking-tight leading-snug truncate ${
                isDone ? 'line-through text-outline' : 'text-on-surface'
              }`}
            >
              {task.title}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {(task.urgent || task.quadrant === 1 || task.quadrant === 3) && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-secondary-fixed text-on-secondary-fixed">
                  Urgent
                </span>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="text-outline hover:text-error p-0.5 transition-colors"
                  title="Supprimer la tâche"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-space-xs mt-1.5 flex-wrap">
            {(task.tag || task.context) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    task.context === 'Entreprise' ? 'bg-secondary' : 'bg-surface-tint'
                  }`}
                ></span>
                {task.tag || task.context}
              </span>
            )}

            {task.delegateTo && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed">
                <span className="material-symbols-outlined text-[13px]">group</span>
                Délégué à {task.delegateTo}
              </span>
            )}

            {(task.dueDate || task.deadline) && (
              <span className="text-outline text-[11px] flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[13px]">
                  event
                </span>
                {task.dueDate || task.deadline}
              </span>
            )}
          </div>

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
                  isDone
                    ? 'bg-primary'
                    : isDoing
                    ? 'bg-secondary'
                    : 'bg-outline'
                }`}
              ></span>
              <span>
                {isDone
                  ? 'Terminé'
                  : isDoing
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
