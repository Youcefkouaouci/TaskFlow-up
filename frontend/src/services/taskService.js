/**
 * ============================================================================
 * TaskFlow - Service de gestion des tâches (API Service Layer)
 * ============================================================================
 * Ce fichier prépare l'intégration avec le Backend Express / MongoDB.
 * Il centralise toutes les requêtes HTTP (REST) et fournit des fallbacks
 * locaux afin que l'interface fonctionne directement en mode autonome.
 *
 * Pour brancher le vrai backend :
 * 1. Définir VITE_API_URL dans le fichier .env (ex: http://localhost:5000/api)
 * 2. Passer ENABLE_REAL_API à true (ou conditionner sur import.meta.env.PROD)
 * ============================================================================
 */

import { INITIAL_TASKS } from '../data/initialTasks'

// Configuration de base de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const ENABLE_REAL_API = false // Basculer à true une fois les endpoints backend implémentés

/**
 * Clé de stockage local pour persister les tâches en mode simulation
 */
const STORAGE_KEY = 'taskflow_tasks_v1'

/**
 * Initialise le cache local avec les données mock initiales si vide
 */
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
  if (ENABLE_REAL_API) {
    const query = new URLSearchParams()
    if (filter.context && filter.context !== 'Tous') query.append('context', filter.context)
    if (filter.quadrant) query.append('quadrant', filter.quadrant)

    const response = await fetch(`${API_BASE_URL}/tasks?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    })
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des tâches (${response.status})`)
    }
    return await response.json()
  }

  // Simulation locale :
  let tasks = getLocalTasks()
  if (filter.context && filter.context !== 'Tous') {
    tasks = tasks.filter((t) => t.context === filter.context || t.tag === filter.context)
  }
  return tasks
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
  if (ENABLE_REAL_API) {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(taskData),
    })
    if (!response.ok) {
      throw new Error(`Erreur lors de la création de la tâche (${response.status})`)
    }
    return await response.json()
  }

  // Simulation locale :
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

/**
 * ----------------------------------------------------------------------------
 * ENDPOINT : PATCH /api/tasks/:id/status
 * Description : Bascule le statut terminé / actif d'une tâche.
 * Paramètres URL :
 *   - id : string (MongoDB ObjectId de la tâche)
 * Body (JSON) :
 *   {
 *     completed: boolean
 *   }
 * Headers requis :
 *   - Authorization: Bearer <JWT_TOKEN>
 * Code réponse attendu :
 *   - 200 OK -> Task mise à jour
 * ----------------------------------------------------------------------------
 */
export async function toggleTaskCompleted(taskId, completed) {
  if (ENABLE_REAL_API) {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ completed }),
    })
    if (!response.ok) {
      throw new Error(`Erreur lors de la mise à jour du statut (${response.status})`)
    }
    return await response.json()
  }

  // Simulation locale :
  const tasks = getLocalTasks()
  const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed } : t))
  saveLocalTasks(updated)
  return updated.find((t) => t.id === taskId)
}

/**
 * ----------------------------------------------------------------------------
 * ENDPOINT : DELETE /api/tasks/:id
 * Description : Supprime définitivement une tâche (utilisé notamment dans le quadrant Éliminer).
 * Paramètres URL :
 *   - id : string (MongoDB ObjectId de la tâche)
 * Headers requis :
 *   - Authorization: Bearer <JWT_TOKEN>
 * Code réponse attendu :
 *   - 204 No Content (ou 200 OK { success: true })
 * ----------------------------------------------------------------------------
 */
export async function deleteTask(taskId) {
  if (ENABLE_REAL_API) {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        // 'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    })
    if (!response.ok) {
      throw new Error(`Erreur lors de la suppression de la tâche (${response.status})`)
    }
    return true
  }

  // Simulation locale :
  const tasks = getLocalTasks()
  const updated = tasks.filter((t) => t.id !== taskId)
  saveLocalTasks(updated)
  return true
}

/**
 * ----------------------------------------------------------------------------
 * ENDPOINT : POST /api/tasks/:id/delegate
 * Description : Déclenche la délégation d'une tâche (envoi d'email automatique ou notification).
 * Paramètres URL :
 *   - id : string (MongoDB ObjectId de la tâche)
 * Body (JSON) :
 *   {
 *     recipientEmail: string (optionnel),
 *     delegateTo: string,
 *     note: string
 *   }
 * Headers requis :
 *   - Authorization: Bearer <JWT_TOKEN>
 * Code réponse attendu :
 *   - 200 OK -> { message: "Délégation transmise avec succès" }
 * ----------------------------------------------------------------------------
 */
export async function delegateTask(taskId, delegationData) {
  if (ENABLE_REAL_API) {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/delegate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(delegationData),
    })
    if (!response.ok) {
      throw new Error(`Erreur lors de la délégation (${response.status})`)
    }
    return await response.json()
  }

  // Action client native (mailto) :
  const subject = encodeURIComponent(`[TaskFlow] Délégation : ${delegationData.title}`)
  const body = encodeURIComponent(
    `Bonjour,\n\nJe te transfère cette tâche à traiter en priorité :\n"${delegationData.title}"\n\nMerci d'avance pour ton retour.`
  )
  window.location.href = `mailto:?subject=${subject}&body=${body}`
  return { success: true }
}

/**
 * ----------------------------------------------------------------------------
 * ENDPOINT : GET /api/users/me/stats
 * Description : Fournit les statistiques de productivité pour la barre de synthèse.
 * Code réponse attendu :
 *   - 200 OK ->
 *     {
 *       activeTasksCount: number,
 *       criticalFaireCount: number,
 *       nextDeadline: string,
 *       mentalHealthStatus: 'Équilibrée' | 'Surchargée' | 'Calme'
 *     }
 * ----------------------------------------------------------------------------
 */
export async function fetchMatrixStats() {
  if (ENABLE_REAL_API) {
    const response = await fetch(`${API_BASE_URL}/users/me/stats`, {
      method: 'GET',
      headers: {
        // 'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    })
    if (!response.ok) {
      throw new Error(`Erreur récupération statistiques (${response.status})`)
    }
    return await response.json()
  }

  const tasks = getLocalTasks()
  const active = tasks.filter((t) => !t.completed)
  const faire = active.filter((t) => t.quadrant === 1)

  return {
    activeTasksCount: active.length,
    criticalFaireCount: faire.length,
    nextDeadline: '17h00',
    mentalHealthStatus: 'Charge mentale équilibrée. Prochaine échéance : 17h00.',
  }
}
