/**
 * ============================================================================
 * TaskFlow - Tableau de Bord & Statistiques (Personnel & Projet — Chart.js)
 * ============================================================================
 * Affiche :
 * 1. Indicateurs clés (KPIs) : Taux de complétion (%), Tâches terminées,
 *    Actions critiques Q1, Tâches en retard.
 * 2. Graphique Doughnut (Chart.js) : Répartition par Quadrant d'Eisenhower (Q1..Q4).
 * 3. Graphique Bar (Chart.js) : Avancement par Statut (À faire, En cours, Terminé)
 *    & répartition par Contexte (Entreprise vs École).
 * 4. Graphique Bar (Chart.js) + Tableau détaillé : Tâches assignées, terminées
 *    et en retard par utilisateur / membre du projet.
 * ============================================================================
 */

import { useState, useEffect, useMemo } from 'react'
import ChartCanvas from '../components/ChartCanvas'
import {
  fetchProjectDetails,
  fetchProjectTasks,
} from '../services/groupProjectService'

function toDateKey(dateObj) {
  if (!dateObj || Number.isNaN(dateObj.getTime())) return null
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const d = String(dateObj.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isTaskOverdue(task, todayKey) {
  if (!task || task.completed || task.status === 'done') return false
  if (task.dueDate) {
    const key =
      typeof task.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(task.dueDate)
        ? task.dueDate.slice(0, 10)
        : toDateKey(new Date(task.dueDate))
    if (key && key < todayKey) return true
  }
  return false
}

export default function StatsDashboardPage({
  tasks = [],
  projects = [],
  currentUser = null,
  fixedProject = null,
  fixedTasks = null,
}) {
  const [selectedContext, setSelectedContext] = useState('Tous')
  const [selectedProjectId, setSelectedProjectId] = useState('all')
  const [remoteProjectData, setRemoteProjectData] = useState(null)

  const todayKey = useMemo(() => toDateKey(new Date()), [])

  // Si l'utilisateur choisit un projet spécifique dans le sélecteur, charger ses tâches et ses membres
  useEffect(() => {
    if (
      fixedProject ||
      !selectedProjectId ||
      selectedProjectId === 'all' ||
      selectedProjectId === 'general'
    ) {
      return
    }
    let active = true
    Promise.all([
      fetchProjectDetails(selectedProjectId).catch(() => null),
      fetchProjectTasks(selectedProjectId).catch(() => []),
    ]).then(([details, projTasks]) => {
      if (!active) return
      setRemoteProjectData({
        projectId: selectedProjectId,
        details,
        tasks: Array.isArray(projTasks) ? projTasks : [],
      })
    })
    return () => {
      active = false
    }
  }, [selectedProjectId, fixedProject])

  const activeProjectDetails =
    fixedProject ||
    (remoteProjectData?.projectId === selectedProjectId
      ? remoteProjectData.details
      : null)

  // Ensemble de tâches analysées
  const scopedTasks = useMemo(() => {
    if (fixedTasks) return fixedTasks

    let source = tasks
    if (
      selectedProjectId !== 'all' &&
      selectedProjectId !== 'general' &&
      remoteProjectData?.projectId === selectedProjectId &&
      remoteProjectData.tasks.length > 0
    ) {
      source = remoteProjectData.tasks
    }

    return source.filter((t) => {
      if (selectedContext !== 'Tous') {
        const ctx = t.context || t.tag || 'Entreprise'
        if (ctx !== selectedContext) return false
      }
      if (selectedProjectId === 'general') {
        if (t.projectId) return false
      } else if (
        selectedProjectId !== 'all' &&
        remoteProjectData?.projectId !== selectedProjectId
      ) {
        if (t.projectId !== selectedProjectId) return false
      }
      return true
    })
  }, [
    fixedTasks,
    tasks,
    selectedContext,
    selectedProjectId,
    remoteProjectData,
  ])

  // Calcul des KPIs globaux
  const stats = useMemo(() => {
    const total = scopedTasks.length
    const done = scopedTasks.filter(
      (t) => t.completed || t.status === 'done'
    ).length
    const inProgress = scopedTasks.filter(
      (t) =>
        !t.completed &&
        (t.status === 'doing' ||
          t.status === 'in_progress' ||
          t.status === 'En cours')
    ).length
    const todo = Math.max(0, total - done - inProgress)

    const q1 = scopedTasks.filter((t) => t.quadrant === 1).length
    const q2 = scopedTasks.filter((t) => t.quadrant === 2).length
    const q3 = scopedTasks.filter((t) => t.quadrant === 3).length
    const q4 = scopedTasks.filter((t) => t.quadrant === 4).length

    const overdue = scopedTasks.filter((t) => isTaskOverdue(t, todayKey)).length
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

    const entrepriseCount = scopedTasks.filter(
      (t) => (t.context || t.tag || 'Entreprise') === 'Entreprise'
    ).length
    const ecoleCount = scopedTasks.filter(
      (t) => (t.context || t.tag) === 'École'
    ).length

    return {
      total,
      done,
      inProgress,
      todo,
      q1,
      q2,
      q3,
      q4,
      overdue,
      completionRate,
      entrepriseCount,
      ecoleCount,
    }
  }, [scopedTasks, todayKey])

  // Statistiques par Utilisateur / Membre (terminées, actives, en retard)
  const userStats = useMemo(() => {
    const map = new Map()

    // Initialiser avec les membres du projet actif si disponible
    if (Array.isArray(activeProjectDetails?.members)) {
      for (const m of activeProjectDetails.members) {
        map.set(m.userId, {
          userId: m.userId,
          name: m.name || m.email?.split('@')[0] || 'Membre',
          role: m.role,
          total: 0,
          done: 0,
          active: 0,
          overdue: 0,
        })
      }
    } else if (currentUser) {
      const myId = currentUser.id || 'me'
      map.set(myId, {
        userId: myId,
        name: currentUser.name || 'Moi',
        role: 'Alternant',
        total: 0,
        done: 0,
        active: 0,
        overdue: 0,
      })
    }

    for (const task of scopedTasks) {
      const assignees =
        Array.isArray(task.assignedTo) && task.assignedTo.length > 0
          ? task.assignedTo
          : [task.ownerId || currentUser?.id || 'me']

      const isDone = Boolean(task.completed || task.status === 'done')
      const overdue = isTaskOverdue(task, todayKey)

      for (const uid of assignees) {
        const key = String(uid)
        if (!map.has(key)) {
          const isMe = currentUser?.id && key === String(currentUser.id)
          map.set(key, {
            userId: key,
            name: isMe
              ? currentUser.name || 'Moi'
              : task.delegateTo || `Membre (${key.slice(-4)})`,
            role: 'Membre',
            total: 0,
            done: 0,
            active: 0,
            overdue: 0,
          })
        }
        const entry = map.get(key)
        entry.total += 1
        if (isDone) {
          entry.done += 1
        } else {
          entry.active += 1
          if (overdue) entry.overdue += 1
        }
      }
    }

    return [...map.values()]
  }, [scopedTasks, activeProjectDetails, currentUser, todayKey])

  // Configuration Chart.js 1 : Doughnut Répartition par Quadrant
  const quadrantChartData = useMemo(
    () => ({
      labels: [
        'Q1 · Faire (Urgent & Important)',
        'Q2 · Planifier (Important)',
        'Q3 · Déléguer (Urgent)',
        'Q4 · Éliminer',
      ],
      datasets: [
        {
          data: [stats.q1, stats.q2, stats.q3, stats.q4],
          backgroundColor: ['#b3261e', '#111111', '#757575', '#d4d4d4'],
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    }),
    [stats.q1, stats.q2, stats.q3, stats.q4]
  )

  const doughnutOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { size: 11, family: 'Inter, sans-serif' },
          },
        },
      },
      cutout: '64%',
    }),
    []
  )

  // Configuration Chart.js 2 : Barres par Statut d'avancement
  const statusChartData = useMemo(
    () => ({
      labels: ['À faire (Todo)', 'En cours (In Progress)', 'Terminé (Done)'],
      datasets: [
        {
          label: 'Nombre de tâches',
          data: [stats.todo, stats.inProgress, stats.done],
          backgroundColor: ['#757575', '#111111', '#16a34a'],
          borderRadius: 8,
          maxBarThickness: 46,
        },
      ],
    }),
    [stats.todo, stats.inProgress, stats.done]
  )

  const barOptions = useMemo(
    () => ({
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false },
        },
      },
    }),
    []
  )

  // Configuration Chart.js 3 : Tâches terminées vs en cours vs en retard par Utilisateur
  const userChartData = useMemo(
    () => ({
      labels: userStats.map((u) => u.name),
      datasets: [
        {
          label: 'Terminées',
          data: userStats.map((u) => u.done),
          backgroundColor: '#16a34a',
          borderRadius: 6,
          maxBarThickness: 32,
        },
        {
          label: 'En cours / À faire',
          data: userStats.map((u) => Math.max(0, u.active - u.overdue)),
          backgroundColor: '#111111',
          borderRadius: 6,
          maxBarThickness: 32,
        },
        {
          label: 'En retard',
          data: userStats.map((u) => u.overdue),
          backgroundColor: '#b3261e',
          borderRadius: 6,
          maxBarThickness: 32,
        },
      ],
    }),
    [userStats]
  )

  const userBarOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11 } },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false },
        },
      },
    }),
    []
  )

  return (
    <div className="flex flex-col w-full pb-24 gap-space-md pt-space-sm">
      {/* 1. En-tête & Filtres (masqués si embarqué dans un projet fixe) */}
      {!fixedProject && (
        <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                monitoring
              </span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-xl font-bold text-on-surface">
                Tableau de Bord & Statistiques
              </h1>
              <p className="text-xs text-outline">
                Suivez votre taux de complétion, la répartition Eisenhower et les tâches en retard par membre.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-surface-container rounded-lg">
              {['Tous', 'Entreprise', 'École'].map((ctx) => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setSelectedContext(ctx)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    selectedContext === ctx
                      ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {ctx}
                </button>
              ))}
            </div>

            <select
              aria-label="Filtrer les statistiques par projet"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-surface-container px-2.5 py-1.5 rounded-lg text-xs font-semibold text-on-surface outline-none cursor-pointer"
            >
              <option value="all">Tous les projets</option>
              <option value="general">Projet Général</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Projet : {p.name}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* 2. Cartes KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-outline-variant/15 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-outline font-semibold">
            <span>Taux de complétion</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-600">
              verified
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-on-surface">
              {stats.completionRate}%
            </span>
            <span className="text-xs text-outline">
              ({stats.done}/{stats.total})
            </span>
          </div>
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-outline-variant/15 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-outline font-semibold">
            <span>Tâches terminées</span>
            <span className="material-symbols-outlined text-[18px] text-primary">
              task_alt
            </span>
          </div>
          <span className="text-2xl font-bold text-on-surface">
            {stats.done}
          </span>
          <span className="text-[11px] text-outline">
            {stats.inProgress} en cours · {stats.todo} à faire
          </span>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-outline-variant/15 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-outline font-semibold">
            <span>Urgences Q1 (Faire)</span>
            <span className="material-symbols-outlined text-[18px] text-secondary">
              bolt
            </span>
          </div>
          <span className="text-2xl font-bold text-secondary">{stats.q1}</span>
          <span className="text-[11px] text-outline">
            {stats.q2} planifiées (Q2) · {stats.q3} déléguées (Q3)
          </span>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-outline-variant/15 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-outline font-semibold">
            <span>Tâches en retard</span>
            <span className="material-symbols-outlined text-[18px] text-secondary">
              warning
            </span>
          </div>
          <span
            className={`text-2xl font-bold ${
              stats.overdue > 0 ? 'text-secondary' : 'text-emerald-600'
            }`}
          >
            {stats.overdue}
          </span>
          <span className="text-[11px] text-outline">
            {stats.overdue === 0
              ? 'Aucun retard détecté 🎉'
              : 'Échéance dépassée non terminée'}
          </span>
        </div>
      </section>

      {/* 3. Graphiques Chart.js : Répartition par Quadrant & Avancement par Statut */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Doughnut : Répartition par Quadrant */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                pie_chart
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-on-surface uppercase tracking-wider">
                Répartition par Quadrant d'Eisenhower
              </h2>
            </div>
            <span className="text-xs font-semibold text-outline">
              {stats.total} tâche(s)
            </span>
          </div>

          {stats.total > 0 ? (
            <ChartCanvas
              type="doughnut"
              data={quadrantChartData}
              options={doughnutOptions}
              height={230}
            />
          ) : (
            <div className="h-[230px] flex items-center justify-center text-xs text-outline italic">
              Aucune tâche à afficher pour ce filtre.
            </div>
          )}
        </div>

        {/* Bar : Avancement par Statut */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">
                bar_chart
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-on-surface uppercase tracking-wider">
                Avancement par Statut
              </h2>
            </div>
            <span className="text-xs font-semibold text-outline">
              Entreprise : {stats.entrepriseCount} · École : {stats.ecoleCount}
            </span>
          </div>

          {stats.total > 0 ? (
            <ChartCanvas
              type="bar"
              data={statusChartData}
              options={barOptions}
              height={230}
            />
          ) : (
            <div className="h-[230px] flex items-center justify-center text-xs text-outline italic">
              Aucune tâche à afficher pour ce filtre.
            </div>
          )}
        </div>
      </section>

      {/* 4. Graphique & Tableau : Tâches terminées, actives et en retard par Utilisateur */}
      <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">
              group
            </span>
            <h2 className="text-xs sm:text-sm font-bold text-on-surface uppercase tracking-wider">
              Suivi et Tâches en retard par Utilisateur / Membre
            </h2>
          </div>
          <span className="text-xs font-semibold text-outline">
            {userStats.length} participant(s)
          </span>
        </div>

        {userStats.length > 0 && stats.total > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <ChartCanvas
              type="bar"
              data={userChartData}
              options={userBarOptions}
              height={240}
            />

            <div className="flex flex-col gap-2">
              {userStats.map((u) => {
                const rate =
                  u.total > 0 ? Math.round((u.done / u.total) * 100) : 0
                return (
                  <div
                    key={u.userId}
                    className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                          {u.name}
                        </span>
                        <span className="text-[11px] text-outline">
                          {u.total} tâche(s) · {rate}% terminé
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                        {u.done} terminée(s)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface">
                        {u.active} active(s)
                      </span>
                      {u.overdue > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary">
                          {u.overdue} en retard
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-outline italic py-4 text-center">
            Aucune donnée d'assignation disponible pour le moment.
          </p>
        )}
      </section>
    </div>
  )
}
