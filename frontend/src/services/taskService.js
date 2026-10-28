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

export async function fetchTasks(filter = {}) {
  try {
    const query = new URLSearchParams()
    if (filter.context && filter.context !== 'Tous') query.append('context', filter.context)
    if (filter.quadrant) query.append('quadrant', filter.quadrant)
    const queryString = query.toString() ? `?${query.toString()}` : ''
    return await api.get(`/tasks${queryString}`)
  } catch {
    let tasks = getLocalTasks()
    if (filter.context && filter.context !== 'Tous') {
      tasks = tasks.filter((t) => t.context === filter.context || t.tag === filter.context)
    }
    return tasks
  }
}

export async function createTask(taskData) {
  try {
    return await api.post('/tasks', taskData)
  } catch {
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
    return await api.patch(`/tasks/${taskId}/status`, { completed })
  } catch {
    const tasks = getLocalTasks()
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed } : t))
    saveLocalTasks(updated)
    return updated.find((t) => t.id === taskId)
  }
}

export async function deleteTask(taskId) {
  try {
    return await api.delete(`/tasks/${taskId}`)
  } catch {
    const tasks = getLocalTasks()
    const updated = tasks.filter((t) => t.id !== taskId)
    saveLocalTasks(updated)
    return true
  }
}

export async function delegateTask(taskId, delegationData) {
  try {
    return await api.post(`/tasks/${taskId}/delegate`, delegationData)
  } catch {
    const subject = encodeURIComponent(`[TaskFlow - Délégation] ${delegationData.title}`)
    const body = encodeURIComponent(
      `Bonjour,\n\nJe te délègue cette tâche : "${delegationData.title}".\n\nMerci,\nLucas (TaskFlow)`
    )
    window.location.href = `mailto:${delegationData.delegateTo || ''}?subject=${subject}&body=${body}`
    return { success: true, localMailtoTriggered: true }
  }
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
