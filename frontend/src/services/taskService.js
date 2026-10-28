/**
 * ============================================================================
 * TaskFlow - Service de gestion des tâches (API Service Layer)
 * ============================================================================
 * Connecté via le client API centralisé (../api/client).
 * Tente d'appeler les endpoints réels du backend Express/MongoDB :
 * - GET /api/tasks
 * - POST /api/tasks
 * - PATCH /api/tasks/:id/status
 * - DELETE /api/tasks/:id
 * - POST /api/tasks/:id/delegate
 * 
 * En cas d'indisponibilité ou si la route n'est pas encore montée côté backend (404),
 * un fallback local persistant prend automatiquement le relais sans interrompre l'expérience utilisateur.
 * ============================================================================
 */

import { api } from '../api/client'
import { INITIAL_TASKS } from '../data/initialTasks'

/**
 * Clé de stockage local pour persister les tâches en mode autonome / fallback
 */
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

/**
 * ----------------------------------------------------------------------------
 * ENDPOINT : GET /api/tasks
 * Description : Récupère la liste de toutes les tâches de l'utilisateur connecté.
 * Paramètres optionnels de requête (Query params) :
 *   - context : string ('Entreprise' | 'École' | 'Tous')
 *   - quadrant : number (1, 2, 3, 4)
 *   - completed : boolean
 * Headers requis :
 *   - Authorization : Bearer <JWT_TOKEN>
 * Code réponse attendu :
 *   - 200 OK -> Array<Task>
 * ----------------------------------------------------------------------------
 */
export async function fetchTasks(filter = {}) {
  try {
    const query = new URLSearchParams()
    if (filter.context && filter.context !== 'Tous') query.append('context', filter.context)
    if (filter.quadrant) query.append('quadrant', filter.quadrant)
    const queryString = query.toString() ? `?${query.toString()}` : ''
    return await api.get(`/tasks${queryString}`)
  } catch {
    // Si l'endpoint n'est pas encore monté côté backend (ex: 404), fallback local transparent
    let tasks = getLocalTasks()
    if (filter.context && filter.context !== 'Tous') {
      tasks = tasks.filter((t) => t.context === filter.context || t.tag === filter.context)
    }
    return tasks
  }
}

/**
 * ----------------------------------------------------------------------------
 * ENDPOINT : POST /api/tasks
 * Description : Crée une nouvelle tâche dans un quadrant donné.
 * Body (JSON) :
 *   {
 *     title: string (requis),
 *     quadrant: number (1 | 2 | 3 | 4) (requis),
 *     context: string ('Entreprise' | 'École' | 'Personnel') (requis),
 *     tag: string (optionnel),
 *     deadline: string (optionnel),
 *     deadlineType: 'urgent' | 'warning' | 'repeat' | 'neutral' (optionnel),
 *     status: string (optionnel),
 *     delegateTo: string (optionnel)
 *   }
 * Headers requis :
 *   - Content-Type: application/json
 *   - Authorization: Bearer <JWT_TOKEN>
 * Code réponse attendu :
 *   - 201 Created -> Task nouvellement créée avec _id généré par MongoDB
 * ----------------------------------------------------------------------------
 */
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

/**
 * ----------------------------------------------------------------------------
 * ENDPOINT : PATCH /api/tasks/:id/status
 * Description : Met à jour l'état d'achèvement d'une tâche.
 * Body (JSON) :
 *   { completed: boolean }
 * Headers requis :
 *   - Content-Type: application/json
 *   - Authorization: Bearer <JWT_TOKEN>
 * Code réponse attendu :
 *   - 200 OK -> Task mise à jour
 * ----------------------------------------------------------------------------
 */
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

/**
 * ----------------------------------------------------------------------------
 * ENDPOINT : DELETE /api/tasks/:id
 * Description : Supprime définitivement une tâche.
 * Headers requis :
 *   - Authorization: Bearer <JWT_TOKEN>
 * Code réponse attendu :
 *   - 204 No Content
 * ----------------------------------------------------------------------------
 */
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

/**
 * ----------------------------------------------------------------------------
 * ENDPOINT : POST /api/tasks/:id/delegate
 * Description : Marque une tâche comme déléguée ou déclenche l'envoi d'un courriel.
 * Body (JSON) :
 *   {
 *     delegateTo: string (email ou nom du collaborateur),
 *     title: string
 *   }
 * Headers requis :
 *   - Content-Type: application/json
 *   - Authorization: Bearer <JWT_TOKEN>
 * Code réponse attendu :
 *   - 200 OK -> { success: true, message: "Délégation enregistrée" }
 * ----------------------------------------------------------------------------
 */
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

/**
 * Récupère le résumé chiffré des tâches par cadran
 */
export function getQuadrantSummary(tasks) {
  return {
    q1: tasks.filter((t) => t.quadrant === 1 && !t.completed).length,
    q2: tasks.filter((t) => t.quadrant === 2 && !t.completed).length,
    q3: tasks.filter((t) => t.quadrant === 3 && !t.completed).length,
    q4: tasks.filter((t) => t.quadrant === 4 && !t.completed).length,
    total: tasks.filter((t) => !t.completed).length,
  }
}
