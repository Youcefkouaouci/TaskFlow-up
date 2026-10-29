/**
 * ============================================================================
 * TaskFlow - Vue Calendrier / Agenda (Style FullCalendar — Mois & Semaine)
 * ============================================================================
 * - Affichage Mois (grille 7j Lun-Dim) et Semaine (7 colonnes détaillées)
 * - Code couleur par Quadrant d'Eisenhower (Q1 Faire, Q2 Planifier, Q3 Déléguer, Q4 Éliminer)
 * - Drag & Drop d'une tâche d'un jour à un autre (ou depuis les tâches sans échéance)
 *   pour mettre à jour `dueDate` via PATCH /api/tasks/:id
 * - Panneau du jour sélectionné avec création rapide de tâche à cette date
 * ============================================================================
 */

import { useState, useMemo } from 'react'

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const QUADRANT_BADGE = {
  1: {
    label: 'Q1 · Faire',
    chip: 'bg-secondary text-on-secondary border-secondary',
    dot: 'bg-secondary',
  },
  2: {
    label: 'Q2 · Planifier',
    chip: 'bg-primary text-on-primary border-primary',
    dot: 'bg-primary',
  },
  3: {
    label: 'Q3 · Déléguer',
    chip: 'bg-surface-container-high text-on-surface border-outline-variant/40',
    dot: 'bg-outline',
  },
  4: {
    label: 'Q4 · Éliminer',
    chip: 'bg-surface-container text-outline border-outline-variant/20',
    dot: 'bg-outline-variant',
  },
}

/**
 * Formatte un objet Date local en clé YYYY-MM-DD
 */
function toDateKey(dateObj) {
  if (!dateObj || Number.isNaN(dateObj.getTime())) return null
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const d = String(dateObj.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Extrait la clé YYYY-MM-DD d'une tâche à partir de `dueDate` ou `deadline`
 */
function resolveTaskDateKey(task, referenceToday = new Date()) {
  if (!task) return null

  if (task.dueDate) {
    if (
      typeof task.dueDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}/.test(task.dueDate)
    ) {
      return task.dueDate.slice(0, 10)
    }
    const parsed = new Date(task.dueDate)
    if (!Number.isNaN(parsed.getTime())) {
      return toDateKey(parsed)
    }
  }

  if (typeof task.deadline === 'string' && task.deadline.trim()) {
    const raw = task.deadline.trim()
    const lower = raw.toLowerCase()
    const base = new Date(
      referenceToday.getFullYear(),
      referenceToday.getMonth(),
      referenceToday.getDate()
    )

    if (lower.includes("aujourd'hui") || lower === 'ce soir') {
      return toDateKey(base)
    }
    if (lower.includes('demain')) {
      base.setDate(base.getDate() + 1)
      return toDateKey(base)
    }
    if (lower.includes('fin de semaine') || lower.includes('vendredi')) {
      const day = base.getDay() || 7 // 1..7 (Lun..Dim)
      const diffToFriday = 5 - day
      base.setDate(base.getDate() + (diffToFriday >= 0 ? diffToFriday : 7 + diffToFriday))
      return toDateKey(base)
    }
    if (lower.includes('lundi prochain')) {
      const day = base.getDay() || 7
      const diffToMonday = 8 - day
      base.setDate(base.getDate() + diffToMonday)
      return toDateKey(base)
    }

    // Format français JJ/MM/AAAA
    const frMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (frMatch) {
      return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`
    }

    // Format ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10)
    }
  }

  return null
}

/**
 * Construit les 42 cellules (6 semaines de 7 jours Lun->Dim) pour un mois donné
 */
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  // Convertir Dimanche (0) -> 6, Lundi (1) -> 0, etc.
  const startOffset = (firstOfMonth.getDay() + 6) % 7
  const gridStartDate = new Date(year, month, 1 - startOffset)

  const cells = []
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(
      gridStartDate.getFullYear(),
      gridStartDate.getMonth(),
      gridStartDate.getDate() + i
    )
    cells.push({
      date: cellDate,
      dateKey: toDateKey(cellDate),
      dayNumber: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === month,
    })
  }
  return cells
}

/**
 * Construit les 7 jours (Lun->Dim) de la semaine contenant `anchorDate`
 */
function buildWeekDays(anchorDate) {
  const dayOffset = (anchorDate.getDay() + 6) % 7
  const monday = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    anchorDate.getDate() - dayOffset
  )
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + i
    )
    days.push({
      date: d,
      dateKey: toDateKey(d),
      dayNumber: d.getDate(),
      dayLabel: DAYS_SHORT[i],
    })
  }
  return days
}

export default function CalendarPage({
  tasks = [],
  projects = [],
  onToggleStatus,
  onEditTask,
  onDeleteTask,
  onUpdateTaskDate,
  onCreateTaskOnDate,
  onShowToast,
}) {
  const todayKey = useMemo(() => toDateKey(new Date()), [])
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week'
  const [cursorDate, setCursorDate] = useState(() => new Date())
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    toDateKey(new Date())
  )
  const [contextFilter, setContextFilter] = useState('Tous') // 'Tous' | 'Entreprise' | 'École'
  const [projectFilter, setProjectFilter] = useState('all')
  const [dragOverDateKey, setDragOverDateKey] = useState(null)

  // Formulaire d'ajout rapide pour le jour sélectionné
  const [quickTitle, setQuickTitle] = useState('')
  const [quickQuadrant, setQuickQuadrant] = useState(1)
  const [isAddingQuick, setIsAddingQuick] = useState(false)

  // Filtrage des tâches selon contexte et projet
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (contextFilter !== 'Tous') {
        const ctx = t.context || t.tag || 'Entreprise'
        if (ctx !== contextFilter) return false
      }
      if (projectFilter === 'general') {
        if (t.projectId) return false
      } else if (projectFilter !== 'all') {
        if (t.projectId !== projectFilter) return false
      }
      return true
    })
  }, [tasks, contextFilter, projectFilter])

  // Indexation des tâches par clé YYYY-MM-DD + liste des tâches sans échéance
  const { tasksByDate, unscheduledTasks } = useMemo(() => {
    const map = new Map()
    const noDate = []
    const now = new Date()

    for (const task of filteredTasks) {
      const key = resolveTaskDateKey(task, now)
      if (key) {
        if (!map.has(key)) map.set(key, [])
        map.get(key).push(task)
      } else {
        noDate.push(task)
      }
    }

    // Trier chaque journée par priorité (Q1 -> Q4) puis non-terminées d'abord
    for (const [, list] of map.entries()) {
      list.sort((a, b) => {
        if (Boolean(a.completed) !== Boolean(b.completed)) {
          return a.completed ? 1 : -1
        }
        return (a.quadrant || 1) - (b.quadrant || 1)
      })
    }

    return { tasksByDate: map, unscheduledTasks: noDate }
  }, [filteredTasks])

  const monthCells = useMemo(
    () => buildMonthGrid(cursorDate.getFullYear(), cursorDate.getMonth()),
    [cursorDate]
  )

  const weekDays = useMemo(() => buildWeekDays(cursorDate), [cursorDate])

  const periodTitle = useMemo(() => {
    if (viewMode === 'month') {
      const formatted = cursorDate.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      })
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }
    const first = weekDays[0].date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })
    const last = weekDays[6].date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return `${first} – ${last}`
  }, [viewMode, cursorDate, weekDays])

  function handlePrev() {
    setCursorDate((prev) => {
      if (viewMode === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      }
      return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7)
    })
  }

  function handleNext() {
    setCursorDate((prev) => {
      if (viewMode === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      }
      return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7)
    })
  }

  function handleToday() {
    const now = new Date()
    setCursorDate(now)
    setSelectedDateKey(toDateKey(now))
  }

  function handleTaskDragStart(e, task) {
    e.dataTransfer.setData('text/plain', String(task.id))
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDropOnDate(e, targetDateKey) {
    e.preventDefault()
    setDragOverDateKey(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId || !targetDateKey) return
    try {
      await onUpdateTaskDate?.(taskId, targetDateKey)
      setSelectedDateKey(targetDateKey)
    } catch (err) {
      onShowToast?.(err.message || "Impossible de déplacer l'échéance")
    }
  }

  async function handleQuickAdd(e) {
    e.preventDefault()
    if (!quickTitle.trim() || !selectedDateKey || isAddingQuick) return
    setIsAddingQuick(true)
    try {
      await onCreateTaskOnDate?.({
        title: quickTitle.trim(),
        quadrant: Number(quickQuadrant),
        dueDate: selectedDateKey,
        context: contextFilter !== 'Tous' ? contextFilter : 'Entreprise',
        tag: contextFilter !== 'Tous' ? contextFilter : 'Entreprise',
        projectId:
          projectFilter !== 'all' && projectFilter !== 'general'
            ? projectFilter
            : null,
        status: 'todo',
      })
      setQuickTitle('')
    } finally {
      setIsAddingQuick(false)
    }
  }

  const selectedDayTasks = tasksByDate.get(selectedDateKey) || []
  const selectedDayFormatted = useMemo(() => {
    if (!selectedDateKey) return ''
    const [y, m, d] = selectedDateKey.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [selectedDateKey])

  // Statistiques rapides des échéances
  const overdueCount = useMemo(() => {
    let count = 0
    for (const [dateKey, list] of tasksByDate.entries()) {
      if (dateKey < todayKey) {
        count += list.filter((t) => !t.completed).length
      }
    }
    return count
  }, [tasksByDate, todayKey])

  const todayTasksCount = useMemo(() => {
    return (tasksByDate.get(todayKey) || []).filter((t) => !t.completed).length
  }, [tasksByDate, todayKey])

  return (
    <div className="flex flex-col w-full pb-28 gap-space-md pt-space-sm">
      {/* 1. Barre d'en-tête & Contrôles du Calendrier */}
      <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                calendar_month
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-on-surface">
                  Agenda & Échéances
                </h1>
                {overdueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold">
                    {overdueCount} en retard
                  </span>
                )}
                {todayTasksCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold">
                    {todayTasksCount} aujourd'hui
                  </span>
                )}
              </div>
              <p className="text-xs text-outline">
                Visualisez vos livrables par semaine ou par mois et glissez-déposez vos tâches sur un jour pour les planifier.
              </p>
            </div>
          </div>

          {/* Sélecteur Mois / Semaine */}
          <div className="flex items-center gap-1 p-1 bg-surface-container rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Mois
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Semaine
            </button>
          </div>
        </div>

        {/* Barre de navigation temporelle + Filtres Contexte & Projet */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface cursor-pointer"
              aria-label="Période précédente"
            >
              <span className="material-symbols-outlined text-[18px]">
                chevron_left
              </span>
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-on-surface cursor-pointer"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface cursor-pointer"
              aria-label="Période suivante"
            >
              <span className="material-symbols-outlined text-[18px]">
                chevron_right
              </span>
            </button>
            <h2 className="text-sm sm:text-base font-bold text-on-surface ml-1">
              {periodTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-surface-container rounded-lg">
              {['Tous', 'Entreprise', 'École'].map((ctx) => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setContextFilter(ctx)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    contextFilter === ctx
                      ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {ctx}
                </button>
              ))}
            </div>

            <select
              aria-label="Filtrer le calendrier par projet"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-surface-container px-2.5 py-1.5 rounded-lg text-xs font-semibold text-on-surface outline-none cursor-pointer"
            >
              <option value="all">Tous les projets</option>
              <option value="general">Projet Général</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 2. Grille Principale (Calendrier + Panneau Jour sélectionné) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md items-start">
        {/* Colonne Gauche (2/3) : Grille Calendrier Mois ou Semaine */}
        <section className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-3 sm:p-4 shadow-xs border border-outline-variant/15 flex flex-col gap-2">
          {/* En-tête des 7 jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 text-center pb-1 border-b border-outline-variant/10">
            {DAYS_SHORT.map((dayName) => (
              <span
                key={dayName}
                className="text-[11px] font-bold uppercase tracking-wider text-outline py-1"
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* VUE MOIS (42 cases) */}
          {viewMode === 'month' ? (
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {monthCells.map((cell) => {
                const dayTasks = tasksByDate.get(cell.dateKey) || []
                const isToday = cell.dateKey === todayKey
                const isSelected = cell.dateKey === selectedDateKey
                const isDragOver = dragOverDateKey === cell.dateKey
                const isPast = cell.dateKey < todayKey

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => setSelectedDateKey(cell.dateKey)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (dragOverDateKey !== cell.dateKey) {
                        setDragOverDateKey(cell.dateKey)
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverDateKey(null)
                      }
                    }}
                    onDrop={(e) => handleDropOnDate(e, cell.dateKey)}
                    className={`min-h-[82px] sm:min-h-[104px] p-1.5 rounded-xl border flex flex-col gap-1 transition-all cursor-pointer select-none ${
                      isDragOver
                        ? 'ring-2 ring-secondary bg-secondary-fixed/25 border-secondary'
                        : isSelected
                        ? 'border-primary bg-surface-container-low shadow-2xs'
                        : cell.isCurrentMonth
                        ? 'border-outline-variant/15 bg-surface-container-lowest hover:bg-surface-container-low/60'
                        : 'border-transparent bg-surface-container-low/30 opacity-45'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                          isToday
                            ? 'bg-secondary text-on-secondary'
                            : isSelected
                            ? 'bg-primary text-on-primary'
                            : 'text-on-surface'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-bold text-outline">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 overflow-hidden">
                      {dayTasks.slice(0, 3).map((t) => {
                        const qStyle =
                          QUADRANT_BADGE[t.quadrant] || QUADRANT_BADGE[1]
                        return (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              handleTaskDragStart(e, t)
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedDateKey(cell.dateKey)
                              onEditTask?.(t)
                            }}
                            title={`${t.title} (${qStyle.label})`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.01] ${
                              t.completed
                                ? 'bg-surface-container text-outline line-through opacity-60'
                                : isPast
                                ? 'bg-secondary text-on-secondary ring-1 ring-secondary'
                                : qStyle.chip
                            }`}
                          >
                            {t.completed ? '✓ ' : ''}
                            {t.title}
                          </div>
                        )
                      })}
                      {dayTasks.length > 3 && (
                        <span className="text-[10px] font-bold text-secondary pl-1">
                          + {dayTasks.length - 3} autre(s)
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* VUE SEMAINE (7 colonnes détaillées) */
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 pt-1">
              {weekDays.map((day) => {
                const dayTasks = tasksByDate.get(day.dateKey) || []
                const isToday = day.dateKey === todayKey
                const isSelected = day.dateKey === selectedDateKey
                const isDragOver = dragOverDateKey === day.dateKey

                return (
                  <div
                    key={day.dateKey}
                    onClick={() => setSelectedDateKey(day.dateKey)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (dragOverDateKey !== day.dateKey) {
                        setDragOverDateKey(day.dateKey)
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverDateKey(null)
                      }
                    }}
                    onDrop={(e) => handleDropOnDate(e, day.dateKey)}
                    className={`min-h-[220px] p-2.5 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer ${
                      isDragOver
                        ? 'ring-2 ring-secondary bg-secondary-fixed/25 border-secondary'
                        : isSelected
                        ? 'border-primary bg-surface-container-low shadow-xs'
                        : 'border-outline-variant/15 bg-surface-container-lowest hover:bg-surface-container-low/50'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-outline-variant/10 pb-1.5">
                      <span className="text-xs font-bold text-outline uppercase sm:hidden">
                        {day.dayLabel}
                      </span>
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                          isToday
                            ? 'bg-secondary text-on-secondary'
                            : isSelected
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container text-on-surface'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                      <span className="text-[10px] font-semibold text-outline">
                        {dayTasks.length} tâche(s)
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1">
                      {dayTasks.length > 0 ? (
                        dayTasks.map((t) => {
                          const qStyle =
                            QUADRANT_BADGE[t.quadrant] || QUADRANT_BADGE[1]
                          return (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation()
                                handleTaskDragStart(e, t)
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditTask?.(t)
                              }}
                              className={`p-2 rounded-lg text-[11px] font-semibold flex flex-col gap-1 cursor-grab active:cursor-grabbing shadow-2xs ${
                                t.completed
                                  ? 'bg-surface-container text-outline line-through opacity-60'
                                  : qStyle.chip
                              }`}
                            >
                              <span className="line-clamp-2">{t.title}</span>
                              <span className="text-[9px] opacity-80 uppercase">
                                {qStyle.label}
                              </span>
                            </div>
                          )
                        })
                      ) : (
                        <span className="text-[11px] text-outline/60 italic m-auto text-center">
                          Libre
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Légende des Quadrants */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-outline-variant/10 text-[11px] text-outline">
            <div className="flex items-center gap-3 flex-wrap">
              {[1, 2, 3, 4].map((q) => (
                <span key={q} className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${QUADRANT_BADGE[q].dot}`}
                  ></span>
                  <span>{QUADRANT_BADGE[q].label}</span>
                </span>
              ))}
            </div>
            <span className="italic">
              Astuce : glissez une tâche sur une autre date pour la reprogrammer
            </span>
          </div>
        </section>

        {/* Colonne Droite (1/3) : Détail du jour sélectionné + Tâches à planifier */}
        <aside className="flex flex-col gap-space-md">
          {/* Carte du jour sélectionné */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-outline-variant/15 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2.5">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Jour sélectionné
                </span>
                <h3 className="text-sm font-bold text-on-surface capitalize">
                  {selectedDayFormatted}
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-xs font-bold text-on-surface">
                {selectedDayTasks.length} tâche(s)
              </span>
            </div>

            {/* Liste des tâches de ce jour */}
            {selectedDayTasks.length > 0 ? (
              <div className="flex flex-col gap-2">
                {selectedDayTasks.map((t) => {
                  const qStyle =
                    QUADRANT_BADGE[t.quadrant] || QUADRANT_BADGE[1]
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-start justify-between gap-2"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleStatus?.(t.id, !t.completed)}
                          className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 cursor-pointer ${
                            t.completed
                              ? 'bg-secondary text-on-secondary'
                              : 'bg-surface-container-lowest border border-outline-variant/40'
                          }`}
                          title={
                            t.completed
                              ? 'Réactiver la tâche'
                              : 'Marquer comme terminée'
                          }
                        >
                          {t.completed && (
                            <span className="material-symbols-outlined text-[12px]">
                              check
                            </span>
                          )}
                        </button>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-xs sm:text-sm font-semibold text-on-surface truncate ${
                              t.completed ? 'line-through text-outline' : ''
                            }`}
                          >
                            {t.title}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${qStyle.chip}`}
                            >
                              {qStyle.label}
                            </span>
                            {(t.context || t.tag) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-semibold">
                                {t.context || t.tag}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditTask?.(t)}
                          className="p-1 rounded text-outline hover:text-primary cursor-pointer"
                          title="Modifier la tâche"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            edit
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask?.(t.id)}
                          className="p-1 rounded text-outline hover:text-secondary cursor-pointer"
                          title="Supprimer la tâche"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-outline italic py-2">
                Aucune échéance prévue à cette date.
              </p>
            )}

            {/* Formulaire d'ajout rapide à la date sélectionnée */}
            <form
              onSubmit={handleQuickAdd}
              className="flex flex-col gap-2 pt-2 border-t border-outline-variant/10"
            >
              <span className="text-[11px] font-bold text-outline uppercase">
                + Planifier une tâche ce jour
              </span>
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Titre de la tâche..."
                className="bg-surface-container-low text-on-surface text-xs px-3 py-2 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={quickQuadrant}
                  onChange={(e) => setQuickQuadrant(Number(e.target.value))}
                  className="flex-1 bg-surface-container-low text-on-surface text-xs font-semibold px-2.5 py-2 rounded-xl border border-outline-variant/20 outline-none"
                >
                  <option value={1}>Q1 · Faire (Urgent & Important)</option>
                  <option value={2}>Q2 · Planifier (Important)</option>
                  <option value={3}>Q3 · Déléguer (Urgent)</option>
                  <option value={4}>Q4 · Éliminer</option>
                </select>
                <button
                  type="submit"
                  disabled={!quickTitle.trim() || isAddingQuick}
                  className="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-semibold cursor-pointer disabled:opacity-40 shrink-0"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>

          {/* Tâches sans date d'échéance (glissables vers le calendrier) */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-outline-variant/15 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  event_upcoming
                </span>
                <span>Tâches sans date ({unscheduledTasks.length})</span>
              </span>
            </div>

            {unscheduledTasks.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                {unscheduledTasks.map((t) => {
                  const qStyle =
                    QUADRANT_BADGE[t.quadrant] || QUADRANT_BADGE[1]
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, t)}
                      className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[15px] text-outline">
                          drag_indicator
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${qStyle.dot}`}
                          title={qStyle.label}
                        ></span>
                        <span className="text-xs font-semibold text-on-surface truncate">
                          {t.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTaskDate?.(t.id, selectedDateKey)
                        }
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-primary text-on-primary cursor-pointer shrink-0"
                        title={`Planifier au ${selectedDateKey}`}
                      >
                        Planifier ici
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-outline italic">
                Toutes vos tâches ont une date d'échéance attribuée ! 🎉
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
