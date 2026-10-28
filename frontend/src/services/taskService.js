/**
 * ============================================================================
 * TaskFlow - Service de gestion des tâches (API Service Layer)
 * ============================================================================
 * Connecté aux endpoints réels du backend Express/MongoDB :
 * - GET /api/tasks
 * - POST /api/tasks
 * - PATCH /api/tasks/:id/status
 * - PATCH /api/tasks/:id
 * - DELETE /api/tasks/:id
 * ============================================================================
 */

import { api } from '../api/client'
import { INITIAL_TASKS } from '../data/initialTasks'

const STORAGE_KEY = 'taskflow_tasks_v1'

const QUADRANT_CODE_TO_NUMBER = {
  DO: 1,
  PLAN: 2,
  DELEGATE: 3,
  ELIMINATE: 4,
}

const NUMBER_TO_URGENT_IMPORTANT = {
  1: { urgent: true, important: true },
  2: { urgent: false, important: true },
  3: { urgent: true, important: false },
  4: { urgent: false, important: false },
}

function getLocalTasks() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TASKS))
    return INITIAL_TASKS
  }
  try {
    return JSON.parse(stored)
  } catch {
    return INITIAL_TASKS
  }
}

function saveLocalTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function toIsoDateString(input) {
  if (!input) return null
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    return input.slice(0, 10)
  }
  const now = new Date()
  const lower = String(input).toLowerCase()
  if (lower.includes("aujourd'hui") || lower.includes('aujourdhui')) {
    return now.toISOString().slice(0, 10)
  }
  if (lower.includes('demain')) {
    const d = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  }
  if (lower.includes('semaine')) {
    const d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  }
  if (lower.includes('lundi')) {
    const d = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  }
  return null
}

function toBackendStatus(status) {
  if (!status) return 'todo'
  const s = String(status).toLowerCase()
  if (s === 'done' || s === 'terminé' || s === 'termine') return 'done'
  if (
    s === 'in_progress' ||
    s === 'inprogress' ||
    s === 'doing' ||
    s === 'wip' ||
    s === 'en cours'
  ) {
    return 'in_progress'
  }
  return 'todo'
}

function formatStatusLabel(status) {
  if (status === 'done') return 'Terminé'
  if (status === 'in_progress' || status === 'inprogress') return 'En cours'
  return 'À faire'
}

function formatDueDateDisplay(dueDate) {
  if (!dueDate) return null
  const d = new Date(dueDate)
  if (Number.isNaN(d.getTime())) return String(dueDate)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

/**
 * Normalise une tâche reçue du backend MongoDB pour l'interface React
 */
export function normalizeTaskFromApi(raw) {
  if (!raw) return raw
  const quadrantNum =
    typeof raw.quadrant === 'number'
      ? raw.quadrant
      : QUADRANT_CODE_TO_NUMBER[raw.quadrant] ||
        (raw.urgent && raw.important
          ? 1
          : !raw.urgent && raw.important
          ? 2
          : raw.urgent && !raw.important
          ? 3
          : 4)

  const normStatus = toBackendStatus(raw.status)
  const isDone = normStatus === 'done' || Boolean(raw.completed)

  return {
    ...raw,
    id: raw.id || raw._id,
    quadrant: quadrantNum,
    quadrantCode:
      typeof raw.quadrant === 'string'
        ? raw.quadrant
        : Object.keys(QUADRANT_CODE_TO_NUMBER).find(
            (k) => QUADRANT_CODE_TO_NUMBER[k] === quadrantNum
          ),
    urgent: Boolean(raw.urgent ?? raw.isUrgent ?? (quadrantNum === 1 || quadrantNum === 3)),
    important: Boolean(
      raw.important ?? raw.isImportant ?? (quadrantNum === 1 || quadrantNum === 2)
    ),
    status: normStatus,
    statusLabel: formatStatusLabel(normStatus),
    completed: isDone,
    context: raw.context || raw.tag || 'Entreprise',
    tag: raw.tag || raw.context || 'Entreprise',
    deadline: raw.deadline || formatDueDateDisplay(raw.dueDate),
    deadlineType: raw.deadlineType || (raw.urgent ? 'urgent' : 'neutral'),
    actionType:
      raw.actionType ||
      (quadrantNum === 3 ? 'mail' : quadrantNum === 4 ? 'delete' : null),
  }
}

export async function fetchTasks(filter = {}) {
  try {
    const query = new URLSearchParams()
    if (filter.projectId) query.append('projectId', filter.projectId)
    if (filter.status && filter.status !== 'all') {
      query.append('status', toBackendStatus(filter.status))
    }
    if (filter.quadrant) {
      const qCode =
        typeof filter.quadrant === 'string'
          ? filter.quadrant
          : Object.keys(QUADRANT_CODE_TO_NUMBER).find(
              (k) => QUADRANT_CODE_TO_NUMBER[k] === Number(filter.quadrant)
            )
      if (qCode) query.append('quadrant', qCode)
    }
    const queryString = query.toString() ? `?${query.toString()}` : ''
    const data = await api.get(`/tasks${queryString}`)
    return Array.isArray(data) ? data.map(normalizeTaskFromApi) : []
  } catch {
    let tasks = getLocalTasks().map(normalizeTaskFromApi)
    if (filter.context && filter.context !== 'Tous') {
      tasks = tasks.filter(
        (t) => t.context === filter.context || t.tag === filter.context
      )
    }
    return tasks
  }
}

export async function createTask(taskData) {
  const fallbackFlags = NUMBER_TO_URGENT_IMPORTANT[Number(taskData.quadrant)] || {
    urgent: true,
    important: true,
  }

  const urgent =
    typeof taskData.urgent === 'boolean'
      ? taskData.urgent
      : typeof taskData.isUrgent === 'boolean'
      ? taskData.isUrgent
      : fallbackFlags.urgent

  const important =
    typeof taskData.important === 'boolean'
      ? taskData.important
      : typeof taskData.isImportant === 'boolean'
      ? taskData.isImportant
      : fallbackFlags.important

  const backendPayload = {
    title: taskData.title,
    description: taskData.description || '',
    urgent,
    important,
    status: toBackendStatus(taskData.status),
    dueDate: toIsoDateString(taskData.dueDate || taskData.deadline),
    ...(taskData.projectId ? { projectId: taskData.projectId } : {}),
  }

  try {
    const created = await api.post('/tasks', backendPayload)
    return normalizeTaskFromApi({
      ...created,
      context: taskData.context || 'Entreprise',
      tag: taskData.tag || taskData.context || 'Entreprise',
      deadline: taskData.deadline || formatDueDateDisplay(created.dueDate),
    })
  } catch {
    const tasks = getLocalTasks()
    const newTask = normalizeTaskFromApi({
      ...taskData,
      ...backendPayload,
      id: `task-${Date.now()}`,
      completed: backendPayload.status === 'done',
      createdAt: new Date().toISOString(),
    })
    const updated = [newTask, ...tasks]
    saveLocalTasks(updated)
    return newTask
  }
}

export async function toggleTaskCompleted(taskId, completed) {
  const nextStatus = completed ? 'done' : 'todo'
  try {
    const updated = await api.patch(`/tasks/${taskId}/status`, {
      completed,
      status: nextStatus,
    })
    return normalizeTaskFromApi(updated)
  } catch {
    const tasks = getLocalTasks()
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, completed, status: nextStatus } : t
    )
    saveLocalTasks(updated)
    return normalizeTaskFromApi(updated.find((t) => t.id === taskId))
  }
}

export async function updateTaskStatus(taskId, nextStatus) {
  const status = toBackendStatus(nextStatus)
  try {
    const updated = await api.patch(`/tasks/${taskId}/status`, { status })
    return normalizeTaskFromApi(updated)
  } catch {
    const tasks = getLocalTasks()
    const updated = tasks.map((t) =>
      t.id === taskId
        ? { ...t, status, completed: status === 'done' }
        : t
    )
    saveLocalTasks(updated)
    return normalizeTaskFromApi(updated.find((t) => t.id === taskId))
  }
}

export async function deleteTask(taskId) {
  try {
    await api.delete(`/tasks/${taskId}`)
    return true
  } catch {
    const tasks = getLocalTasks()
    const updated = tasks.filter((t) => t.id !== taskId)
    saveLocalTasks(updated)
    return true
  }
}

export async function shareTask(taskId, email) {
  return await api.post(`/tasks/${taskId}/share`, { email })
}

export async function delegateTask(taskId, delegationData) {
  const subject = encodeURIComponent(
    `[TaskFlow - Délégation] ${delegationData.title}`
  )
  const body = encodeURIComponent(
    `Bonjour,\n\nJe te délègue cette tâche : "${delegationData.title}".\n\nMerci,\nTaskFlow`
  )
  window.location.href = `mailto:${delegationData.delegateTo || ''}?subject=${subject}&body=${body}`
  return { success: true, localMailtoTriggered: true }
}

export function getQuadrantSummary(tasks) {
  return {
    q1: tasks.filter((t) => t.quadrant === 1 && !t.completed).length,
    q2: tasks.filter((t) => t.quadrant === 2 && !t.completed).length,
    q3: tasks.filter((t) => t.quadrant === 3 && !t.completed).length,
    q4: tasks.filter((t) => t.quadrant === 4 && !t.completed).length,
    total: tasks.filter((t) => !t.completed).length,
  }
}
