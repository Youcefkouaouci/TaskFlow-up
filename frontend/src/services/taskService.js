import { api } from '../api/client'

// Nettoyage d'un éventuel ancien cache localStorage fictif
try {
  localStorage.removeItem('taskflow_tasks_v1')
} catch {
  // ignore
}

// Mappe le numéro de quadrant vers les champs urgent/important du backend
function quadrantToFields(quadrant) {
  const map = {
    1: { urgent: true, important: true },
    2: { urgent: false, important: true },
    3: { urgent: true, important: false },
    4: { urgent: false, important: false },
  }
  return map[quadrant] ?? {}
}

// Mappe une tâche retournée par l'API vers le format attendu par l'UI
export function apiTaskToFrontend(task) {
  if (!task) return null
  const quadrantMap = {
    'true-true': 1,
    'false-true': 2,
    'true-false': 3,
    'false-false': 4,
  }
  const codeMap = {
    1: 'DO',
    2: 'PLAN',
    3: 'DELEGATE',
    4: 'ELIMINATE',
  }
  const qNum =
    quadrantMap[`${Boolean(task.urgent)}-${Boolean(task.important)}`] ??
    (typeof task.quadrant === 'number' ? task.quadrant : 1)
  const resolvedContext = task.context || task.tag || 'Entreprise'
  return {
    ...task,
    projectId: task.projectId || null,
    context: resolvedContext,
    tag: task.tag || resolvedContext,
    quadrant: qNum,
    quadrantCode:
      typeof task.quadrant === 'string'
        ? task.quadrant
        : codeMap[qNum] || 'DO',
    deadline:
      task.deadline ||
      (task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('fr-FR')
        : null),
    completed: task.status === 'done',
    actionType:
      task.actionType ||
      (qNum === 3 ? 'share' : qNum === 4 ? 'delete' : null),
  }
}

export const normalizeTaskFromApi = apiTaskToFrontend

// Normalise les valeurs de status provenant de l'UI vers le contrat API
const STATUS_MAP = {
  todo: 'todo',
  'À faire': 'todo',
  wip: 'doing',
  in_progress: 'doing',
  inprogress: 'doing',
  'En cours': 'doing',
  doing: 'doing',
  done: 'done',
  'Terminé': 'done',
}

export async function fetchTasks(filter = {}) {
  const query = new URLSearchParams()
  if (filter.projectId) query.append('projectId', filter.projectId)
  const queryString = query.toString() ? `?${query.toString()}` : ''
  const data = await api.get(`/tasks${queryString}`)
  const items = Array.isArray(data) ? data : data?.items || []
  return items.map(apiTaskToFrontend)
}

export async function createTask(taskData) {
  const qFields = quadrantToFields(taskData.quadrant)
  const payload = {
    title: taskData.title,
    description: taskData.description ?? '',
    urgent: qFields.urgent ?? Boolean(taskData.urgent ?? taskData.isUrgent),
    important:
      qFields.important ??
      Boolean(taskData.important ?? taskData.isImportant),
    status: STATUS_MAP[taskData.status] ?? 'todo',
    dueDate: taskData.dueDate ?? null,
    projectId: taskData.projectId || null,
  }
  const created = await api.post('/tasks', payload)
  return apiTaskToFrontend({
    ...created,
    context: taskData.context || taskData.tag || 'Entreprise',
  })
}

export async function toggleTaskCompleted(taskId, completed) {
  const updated = await api.patch(`/tasks/${taskId}`, {
    status: completed ? 'done' : 'todo',
  })
  return apiTaskToFrontend(updated)
}

export async function updateTaskStatus(taskId, nextStatus) {
  const status = STATUS_MAP[nextStatus] ?? nextStatus
  const updated = await api.patch(`/tasks/${taskId}`, { status })
  return apiTaskToFrontend(updated)
}

export async function updateTask(taskId, updates) {
  const payload = {}
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.description !== undefined)
    payload.description = updates.description
  if (updates.urgent !== undefined) payload.urgent = Boolean(updates.urgent)
  if (updates.important !== undefined)
    payload.important = Boolean(updates.important)
  if (updates.status !== undefined) {
    payload.status = STATUS_MAP[updates.status] ?? updates.status
  }
  if (updates.dueDate !== undefined) {
    payload.dueDate = updates.dueDate || null
  }
  if (updates.projectId !== undefined) {
    payload.projectId = updates.projectId || null
  }

  const updated = await api.patch(`/tasks/${taskId}`, payload)
  return apiTaskToFrontend({
    ...updated,
    ...(updates.context ? { context: updates.context } : {}),
  })
}

export async function deleteTask(taskId) {
  return await api.delete(`/tasks/${taskId}`)
}

export async function moveTaskToQuadrant(taskId, quadrant) {
  const fields = quadrantToFields(quadrant)
  const updated = await api.patch(`/tasks/${taskId}`, fields)
  return apiTaskToFrontend(updated)
}

export async function delegateTask(_taskId, delegationData) {
  const subject = encodeURIComponent(
    `[TaskFlow - Délégation] ${delegationData.title}`
  )
  const body = encodeURIComponent(
    `Bonjour,\n\nJe te délègue cette tâche : "${delegationData.title}".\n\nMerci`
  )
  window.open(
    `mailto:${delegationData.delegateTo || ''}?subject=${subject}&body=${body}`
  )
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
