import { api } from '../api/client'
import { INITIAL_TASKS } from '../data/initialTasks'

const STORAGE_KEY = 'taskflow_tasks_v1'

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

export async function fetchTasks(filter = {}) {
  try {
    const data = await api.get('/tasks')
    return data.items
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
    const { quadrant, context, tag, deadline, deadlineType, delegateTo, actionType, ...rest } = taskData
    const payload = {
      ...rest,
      ...quadrantToFields(quadrant),
    }
    return await api.post('/tasks', payload)
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
    return await api.patch(`/tasks/${taskId}`, { status: completed ? 'done' : 'todo' })
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
    return await api.delete(`/tasks/${taskId}`)
  } catch (err) {
    console.warn('[taskService] deleteTask fallback localStorage', err)
    const tasks = getLocalTasks()
    const updated = tasks.filter((t) => t.id !== taskId)
    saveLocalTasks(updated)
    return true
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
