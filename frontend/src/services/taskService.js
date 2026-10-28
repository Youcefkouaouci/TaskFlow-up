import { api } from '../api/client'
 
const STORAGE_KEY = 'taskflow_tasks_v1'
 
function getLocalTasks() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    const list = JSON.parse(stored)
    if (!Array.isArray(list)) return []
    return list.filter((t) => !/^task-[1-9]\d*$/.test(String(t?.id || '')))
  } catch {
    return []
  }
}

function saveLocalTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
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
function apiTaskToFrontend(task) {
  const quadrantMap = {
    'true-true': 1,
    'false-true': 2,
    'true-false': 3,
    'false-false': 4,
  }
  return {
    ...task,
    quadrant: quadrantMap[`${task.urgent}-${task.important}`] ?? 1,
    completed: task.status === 'done',
  }
}

// Normalise les valeurs de status provenant de l'UI vers le contrat API
const STATUS_MAP = {
  todo: 'todo', 'À faire': 'todo',
  wip: 'doing', 'En cours': 'doing', doing: 'doing',
  done: 'done', 'Terminé': 'done',
}

export async function fetchTasks(filter = {}) {
  try {
    const data = await api.get('/tasks')
    const list = Array.isArray(data) ? data : (data?.items || [])
    const tasks = list.map(apiTaskToFrontend)
    saveLocalTasks(tasks)
    return tasks
  } catch (err) {
    console.warn('[taskService] fetchTasks fallback localStorage', err)
    let tasks = getLocalTasks()
    if (filter.context && filter.context !== 'Tous') {
      tasks = tasks.filter((t) => t.context === filter.context || t.tag === filter.context)
    }
    return tasks
  }
}

export async function createTask(taskData) {
  try {
    const { quadrant, status: rawStatus, title, description, dueDate, deadline } = taskData
    const payload = {
      title,
      description: description || '',
      ...(dueDate || deadline ? { dueDate: dueDate || deadline } : {}),
      status: STATUS_MAP[rawStatus] ?? 'todo',
      ...quadrantToFields(quadrant),
    }
    const created = await api.post('/tasks', payload)
    const task = apiTaskToFrontend({ ...taskData, ...created })
    const current = getLocalTasks()
    saveLocalTasks([task, ...current])
    return task
  } catch (err) {
    console.warn('[taskService] createTask fallback localStorage', err)
    const tasks = getLocalTasks()
    const newTask = {
      ...taskData,
      id: `task-${Date.now()}`,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    const updated = [newTask, ...tasks]
    saveLocalTasks(updated)
    return newTask
  }
}

export async function toggleTaskCompleted(taskId, completed) {
  try {
    const updated = await api.patch(`/tasks/${taskId}`, { status: completed ? 'done' : 'todo' })
    const task = apiTaskToFrontend(updated)
    const current = getLocalTasks()
    saveLocalTasks(current.map((t) => (t.id === taskId ? task : t)))
    return task
  } catch (err) {
    console.warn('[taskService] toggleTaskCompleted fallback localStorage', err)
    const tasks = getLocalTasks()
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed } : t))
    saveLocalTasks(updated)
    return updated.find((t) => t.id === taskId)
  }
}

export async function deleteTask(taskId) {
  try {
    await api.delete(`/tasks/${taskId}`)
    const current = getLocalTasks()
    saveLocalTasks(current.filter((t) => t.id !== taskId))
    return true
  } catch (err) {
    console.warn('[taskService] deleteTask fallback localStorage', err)
    const tasks = getLocalTasks()
    const updated = tasks.filter((t) => t.id !== taskId)
    saveLocalTasks(updated)
    return true
  }
}

export async function moveTaskToQuadrant(taskId, quadrant) {
  const fields = quadrantToFields(quadrant)
  try {
    const updated = await api.patch(`/tasks/${taskId}`, fields)
    const task = apiTaskToFrontend(updated)
    const current = getLocalTasks()
    saveLocalTasks(current.map((t) => (t.id === taskId ? task : t)))
    return task
  } catch (err) {
    console.warn('[taskService] moveTaskToQuadrant fallback localStorage', err)
    const tasks = getLocalTasks()
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, quadrant, ...fields } : t
    )
    saveLocalTasks(updated)
    return updated.find((t) => t.id === taskId)
  }
}

export async function delegateTask(taskId, delegationData) {
  const subject = encodeURIComponent(`[TaskFlow - Délégation] ${delegationData.title}`)
  const body = encodeURIComponent(
    `Bonjour,\n\nJe te délègue cette tâche : "${delegationData.title}".\n\nMerci`
  )
  window.open(`mailto:${delegationData.delegateTo || ''}?subject=${subject}&body=${body}`)
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
