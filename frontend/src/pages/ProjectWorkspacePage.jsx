/**
 * ============================================================================
 * TaskFlow - Espace Projet Collaboratif (/projects/:projectId)
 * ============================================================================
 * Regroupe dans une interface unifiée :
 * 1. Matrice d'Eisenhower & Tâches du projet (création, statut, assignation)
 * 2. Chat en temps réel par projet (Socket.io + persistance MongoDB `messages`)
 * 3. Partage de fichiers du projet (Upload Base64, téléchargement, suppression)
 * 4. Gestion de l'équipe projet et des rôles RBAC (`project_lead`, `contributor`, `viewer`)
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import {
  fetchProjectDetails,
  fetchProjectTasks,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
  fetchProjectMessages,
  sendProjectMessage,
  fetchProjectFiles,
  uploadProjectFile,
  deleteProjectFile,
  addOrUpdateProjectMember,
  removeProjectMember,
  getBackendOrigin,
} from '../services/groupProjectService'
import { normalizeTaskFromApi } from '../services/taskService'
import { getCurrentUser } from '../services/authService'
import Toast from '../components/Toast'

function formatFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`
  return `${(n / (1024 * 1024)).toFixed(2)} Mo`
}

export default function ProjectWorkspacePage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [currentUser] = useState(() => getCurrentUser())

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [messages, setMessages] = useState([])
  const [files, setFiles] = useState([])
  const [activeSection, setActiveSection] = useState('taches') // 'taches' | 'chat' | 'fichiers' | 'equipe'
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [toast, setToast] = useState({ message: '', visible: false })

  // Formulaire Nouvelle Tâche Projet
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskUrgent, setTaskUrgent] = useState(true)
  const [taskImportant, setTaskImportant] = useState(true)
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskAssignees, setTaskAssignees] = useState([])
  const [isCreatingTask, setIsCreatingTask] = useState(false)

  // Formulaire Chat
  const [chatInput, setChatInput] = useState('')
  const [isSendingChat, setIsSendingChat] = useState(false)
  const chatBottomRef = useRef(null)

  // Upload Fichier
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const fileInputRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  function showToast(message) {
    setToast({ message, visible: true })
    clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ message: '', visible: false })
    }, 2600)
  }

  // Chargement initial des données du projet
  useEffect(() => {
    let active = true
    async function initWorkspace() {
      try {
        const [projData, tasksData, msgsData, filesData] = await Promise.all([
          fetchProjectDetails(projectId),
          fetchProjectTasks(projectId),
          fetchProjectMessages(projectId),
          fetchProjectFiles(projectId),
        ])
        if (!active) return
        setProject(projData)
        setTasks(tasksData)
        setMessages(msgsData)
        setFiles(filesData)
      } catch (err) {
        if (!active) return
        setErrorMsg(err.message || "Impossible d'accéder à ce projet.")
      } finally {
        if (active) setIsLoading(false)
      }
    }
    initWorkspace()
    return () => {
      active = false
    }
  }, [projectId])

  // Connexion Socket.io temps réel à la room du projet
  useEffect(() => {
    if (!projectId) return
    const token =
      localStorage.getItem('token') || localStorage.getItem('taskflow_token')
    const socket = io(getBackendOrigin(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      setSocketConnected(true)
      socket.emit('project:join', projectId)
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
    })

    socket.on('project:message', (newMsg) => {
      setMessages((prev) =>
        prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
      )
    })

    socket.on('project:file_uploaded', (newFile) => {
      setFiles((prev) =>
        prev.some((f) => f.id === newFile.id) ? prev : [newFile, ...prev]
      )
    })

    socket.on('project:file_deleted', ({ id }) => {
      setFiles((prev) => prev.filter((f) => f.id !== id))
    })

    socket.on('project:task_created', (rawTask) => {
      const norm = normalizeTaskFromApi(rawTask)
      setTasks((prev) =>
        prev.some((t) => t.id === norm.id) ? prev : [norm, ...prev]
      )
    })

    socket.on('project:task_updated', (rawTask) => {
      const norm = normalizeTaskFromApi(rawTask)
      setTasks((prev) => prev.map((t) => (t.id === norm.id ? norm : t)))
    })

    socket.on('project:task_deleted', ({ id }) => {
      setTasks((prev) => prev.filter((t) => t.id !== id))
    })

    return () => {
      socket.emit('project:leave', projectId)
      socket.disconnect()
    }
  }, [projectId])

  useEffect(() => {
    if (activeSection === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeSection])

  const myRole = project?.myRole || 'viewer'
  const canWrite = myRole === 'project_lead' || myRole === 'contributor'
  const canAdminProject = myRole === 'project_lead'

  function toggleAssignee(userId) {
    setTaskAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    if (!taskTitle.trim() || !canWrite || isCreatingTask) return
    setIsCreatingTask(true)
    try {
      const created = await createProjectTask(projectId, {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        urgent: taskUrgent,
        important: taskImportant,
        dueDate: taskDueDate || null,
        assignedTo: taskAssignees,
      })
      setTasks((prev) =>
        prev.some((t) => t.id === created.id) ? prev : [created, ...prev]
      )
      setTaskTitle('')
      setTaskDesc('')
      setTaskDueDate('')
      setTaskAssignees([])
      showToast(`Tâche ajoutée (${created.quadrantCode}) !`)
    } catch (err) {
      showToast(err.message || 'Erreur lors de la création de la tâche')
    } finally {
      setIsCreatingTask(false)
    }
  }

  async function handleCycleTaskStatus(task) {
    if (!canWrite) {
      showToast('Mode lecture seule (Viewer)')
      return
    }
    const cycle = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    }
    const nextStatus = cycle[task.status] || 'todo'
    try {
      const updated = await updateProjectTask(projectId, task.id, {
        status: nextStatus,
      })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    } catch (err) {
      showToast(err.message || 'Impossible de modifier le statut')
    }
  }

  async function handleDeleteTask(taskId) {
    if (!canWrite) return
    try {
      await deleteProjectTask(projectId, taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      showToast('Tâche supprimée du projet')
    } catch (err) {
      showToast(err.message || 'Erreur lors de la suppression')
    }
  }

  async function handleSendChat(e) {
    e.preventDefault()
    if (!chatInput.trim() || !canWrite || isSendingChat) return
    setIsSendingChat(true)
    try {
      const created = await sendProjectMessage(projectId, chatInput.trim())
      setMessages((prev) =>
        prev.some((m) => m.id === created.id) ? prev : [...prev, created]
      )
      setChatInput('')
    } catch (err) {
      showToast(err.message || "Impossible d'envoyer le message")
    } finally {
      setIsSendingChat(false)
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file || !canWrite) return
    if (file.size > 10 * 1024 * 1024) {
      showToast('Le fichier dépasse la limite de 10 Mo')
      return
    }

    setIsUploadingFile(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = (err) => reject(err)
        reader.readAsDataURL(file)
      })

      const uploaded = await uploadProjectFile(projectId, {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        contentBase64: base64,
      })

      setFiles((prev) =>
        prev.some((f) => f.id === uploaded.id) ? prev : [uploaded, ...prev]
      )
      showToast(`Fichier « ${uploaded.filename} » partagé !`)
    } catch (err) {
      showToast(err.message || "Erreur lors de l'envoi du fichier")
    } finally {
      setIsUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteFile(fileId) {
    if (!canWrite) return
    try {
      await deleteProjectFile(projectId, fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      showToast('Fichier supprimé')
    } catch (err) {
      showToast(err.message || 'Impossible de supprimer ce fichier')
    }
  }

  async function handleSetMemberRole(userId, role) {
    try {
      const updated = await addOrUpdateProjectMember(projectId, {
        userId,
        role,
      })
      const refreshed = await fetchProjectDetails(projectId)
      setProject(refreshed || updated)
      showToast('Rôle du membre mis à jour !')
    } catch (err) {
      showToast(err.message || 'Erreur lors de la mise à jour du membre')
    }
  }

  async function handleRemoveMember(userId) {
    try {
      await removeProjectMember(projectId, userId)
      const refreshed = await fetchProjectDetails(projectId)
      setProject(refreshed)
      showToast('Membre retiré du projet')
    } catch (err) {
      showToast(err.message || 'Impossible de retirer ce membre')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3 text-outline">
        <span className="material-symbols-outlined animate-spin text-[32px] text-secondary">
          progress_activity
        </span>
        <span className="text-xs font-medium">
          Chargement de l'espace projet...
        </span>
      </div>
    )
  }

  if (errorMsg || !project) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center gap-4">
        <span className="material-symbols-outlined text-[36px] text-secondary">
          folder_off
        </span>
        <h1 className="text-lg font-bold text-on-surface">
          {errorMsg || 'Projet introuvable'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/?tab=partages')}
          className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-semibold cursor-pointer"
        >
          ← Retour aux Groupes & Projets
        </button>
      </div>
    )
  }

  const memberMap = new Map(
    (project.members || []).map((m) => [m.userId, m.name || m.email || 'Membre'])
  )

  const quadrantSections = [
    {
      num: 1,
      code: 'DO',
      title: '1. Faire (Urgent & Important)',
      border: 'border-l-4 border-secondary',
      badge: 'bg-secondary text-on-secondary',
    },
    {
      num: 2,
      code: 'PLAN',
      title: '2. Planifier (Important)',
      border: 'border border-outline-variant/15',
      badge: 'bg-primary text-on-primary',
    },
    {
      num: 3,
      code: 'DELEGATE',
      title: '3. Déléguer (Urgent)',
      border: 'border border-outline-variant/15',
      badge: 'bg-surface-container-high text-on-surface',
    },
    {
      num: 4,
      code: 'ELIMINATE',
      title: '4. Éliminer (Ni urgent ni important)',
      border: 'border border-outline-variant/15',
      badge: 'bg-surface-container text-outline',
    },
  ]

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface antialiased pb-16">
      {/* Barre supérieure du Projet */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 px-gutter py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/?tab=partages')}
              className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center cursor-pointer"
              title="Retour aux Groupes & Projets"
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_back
              </span>
            </button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  {project.groupName || 'Groupe'}
                </span>
                <span className="text-xs text-outline">·</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] font-bold uppercase">
                  Rôle : {myRole}
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-bold text-on-surface truncate">
                {project.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-container-low border border-outline-variant/15">
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              ></span>
              <span>{socketConnected ? 'Temps réel actif' : ' Hors-ligne'}</span>
            </span>
          </div>
        </div>

        {/* Onglets de navigation du projet */}
        <div className="max-w-5xl mx-auto mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            {
              id: 'taches',
              label: `Matrice & Tâches (${tasks.length})`,
              icon: 'grid_view',
            },
            {
              id: 'chat',
              label: `Chat Projet (${messages.length})`,
              icon: 'forum',
            },
            {
              id: 'fichiers',
              label: `Fichiers (${files.length})`,
              icon: 'attach_file',
            },
            {
              id: 'equipe',
              label: `Équipe (${project.members?.length || 1})`,
              icon: 'group',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Contenu principal selon l'onglet actif */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-gutter pt-6 flex flex-col gap-6">
        {/* ================================================================
            ONGLET 1 : MATRICE D'EISENHOWER & TÂCHES DU PROJET
           ================================================================ */}
        {activeSection === 'taches' && (
          <div className="flex flex-col gap-6">
            {canWrite ? (
              <form
                onSubmit={handleCreateTask}
                className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      add_task
                    </span>
                    Nouvelle tâche dans « {project.name} »
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">
                    Quadrant calculé :{' '}
                    {taskUrgent && taskImportant
                      ? 'DO (Faire)'
                      : !taskUrgent && taskImportant
                      ? 'PLAN (Planifier)'
                      : taskUrgent && !taskImportant
                      ? 'DELEGATE (Déléguer)'
                      : 'ELIMINATE (Éliminer)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Titre de la tâche *"
                    className="bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-transparent focus:border-secondary outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Description ou livrable attendu..."
                    className="bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-transparent focus:border-secondary outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setTaskUrgent(!taskUrgent)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
                        taskUrgent
                          ? 'bg-secondary text-on-secondary border-secondary'
                          : 'bg-surface-container-low text-on-surface border-outline-variant/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        bolt
                      </span>
                      <span>Urgent : {taskUrgent ? 'Oui' : 'Non'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTaskImportant(!taskImportant)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
                        taskImportant
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container-low text-on-surface border-outline-variant/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        verified
                      </span>
                      <span>Important : {taskImportant ? 'Oui' : 'Non'}</span>
                    </button>

                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="bg-surface-container-low text-on-surface text-xs px-3 py-1.5 rounded-xl border border-outline-variant/20 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!taskTitle.trim() || isCreatingTask}
                    className="px-4 py-2 bg-secondary text-on-secondary rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    {isCreatingTask ? 'Ajout...' : '+ Ajouter à la matrice'}
                  </button>
                </div>

                {/* Assignation aux membres du projet */}
                {project.members?.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-outline-variant/10">
                    <span className="text-[11px] text-outline font-medium">
                      Assigner à :
                    </span>
                    {project.members.map((m) => {
                      const selected = taskAssignees.includes(m.userId)
                      return (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => toggleAssignee(m.userId)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                            selected
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {m.name} ({m.role})
                        </button>
                      )
                    })}
                  </div>
                )}
              </form>
            ) : (
              <div className="p-3 rounded-xl bg-surface-container-low text-xs text-outline flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">
                  visibility
                </span>
                <span>
                  Vous consultez ce projet en mode lecture seule (Rôle :{' '}
                  <strong>viewer</strong>).
                </span>
              </div>
            )}

            {/* Grille 2x2 des 4 Quadrants du Projet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quadrantSections.map((q) => {
                const qTasks = tasks.filter((t) => t.quadrant === q.num)
                return (
                  <div
                    key={q.code}
                    className={`bg-surface-container-low rounded-2xl p-4 flex flex-col gap-3 ${q.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-on-surface">
                        {q.title}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${q.badge}`}
                      >
                        {qTasks.length} tâche(s)
                      </span>
                    </div>

                    {qTasks.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {qTasks.map((t) => {
                          const isDone = t.status === 'done' || t.completed
                          return (
                            <div
                              key={t.id}
                              className={`bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-outline-variant/10 flex flex-col gap-2 ${
                                isDone ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col min-w-0">
                                  <span
                                    className={`text-xs sm:text-sm font-semibold text-on-surface ${
                                      isDone ? 'line-through text-outline' : ''
                                    }`}
                                  >
                                    {t.title}
                                  </span>
                                  {t.description && (
                                    <p className="text-xs text-outline mt-0.5">
                                      {t.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleCycleTaskStatus(t)}
                                    disabled={!canWrite}
                                    className="px-2 py-0.5 rounded-md bg-surface-container-high text-[11px] font-semibold text-on-surface cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    {t.status === 'done'
                                      ? 'Terminé'
                                      : t.status === 'in_progress'
                                      ? 'En cours'
                                      : 'À faire'}
                                  </button>
                                  {canWrite && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(t.id)}
                                      className="p-1 text-outline hover:text-secondary cursor-pointer"
                                      title="Supprimer"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        delete
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                {t.deadline && (
                                  <span className="px-2 py-0.5 rounded bg-surface-container text-outline flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">
                                      event
                                    </span>
                                    {t.deadline}
                                  </span>
                                )}
                                {Array.isArray(t.assignedTo) &&
                                  t.assignedTo.map((uid) => (
                                    <span
                                      key={uid}
                                      className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-semibold"
                                    >
                                      @{memberMap.get(uid) || 'Membre'}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-outline italic bg-surface-container-lowest/60 rounded-xl">
                        Aucune tâche dans ce quadrant
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ================================================================
            ONGLET 2 : CHAT EN TEMPS RÉEL DU PROJET (Socket.io + MongoDB)
           ================================================================ */}
        {activeSection === 'chat' && (
          <div className="bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/15 flex flex-col h-[520px] overflow-hidden">
            <div className="p-3.5 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  forum
                </span>
                <span className="text-xs sm:text-sm font-bold text-on-surface">
                  Discussion instantanée · {project.name}
                </span>
              </div>
              <span className="text-[11px] text-outline">
                {messages.length} message(s)
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length > 0 ? (
                messages.map((m) => {
                  const isMine =
                    currentUser && m.senderId === currentUser.id
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[80%] ${
                        isMine
                          ? 'self-end items-end'
                          : 'self-start items-start'
                      }`}
                    >
                      <span className="text-[10px] text-outline px-1 mb-0.5">
                        {m.senderName || 'Membre'} ·{' '}
                        {new Date(m.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isMine
                            ? 'bg-primary text-on-primary rounded-br-xs'
                            : 'bg-surface-container-low text-on-surface rounded-bl-xs border border-outline-variant/10'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="my-auto text-center text-xs text-outline italic">
                  Aucun message pour l'instant. Lancez la discussion d'équipe !
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {canWrite ? (
              <form
                onSubmit={handleSendChat}
                className="p-3 border-t border-outline-variant/10 bg-surface-container-low flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Écrire un message à l'équipe projet..."
                  className="flex-1 bg-surface-container-lowest text-on-surface text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-outline-variant/15 focus:border-secondary outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isSendingChat}
                  className="px-4 py-2.5 bg-secondary text-on-secondary rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    send
                  </span>
                  <span>Envoyer</span>
                </button>
              </form>
            ) : (
              <div className="p-3 text-center text-xs text-outline bg-surface-container-low border-t border-outline-variant/10">
                Lecture seule : les membres Viewer ne peuvent pas envoyer de
                messages.
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            ONGLET 3 : PARTAGE DE FICHIERS DU PROJET
           ================================================================ */}
        {activeSection === 'fichiers' && (
          <div className="flex flex-col gap-4">
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm sm:text-base font-bold text-on-surface">
                  Pièces jointes & Livrables du projet
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Partagez vos documents PDF, maquettes, archives ou captures
                  (jusqu'à 10 Mo par fichier).
                </p>
              </div>

              {canWrite && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="project-file-upload"
                  />
                  <label
                    htmlFor="project-file-upload"
                    className={`px-4 py-2.5 bg-secondary text-on-secondary rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs ${
                      isUploadingFile ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      upload_file
                    </span>
                    <span>
                      {isUploadingFile
                        ? 'Envoi en cours...'
                        : '+ Déposer un fichier'}
                    </span>
                  </label>
                </div>
              )}
            </div>

            {files.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {files.map((f) => {
                  const downloadHref = f.fileUrl?.startsWith('http')
                    ? f.fileUrl
                    : `${getBackendOrigin()}${f.fileUrl}`
                  return (
                    <div
                      key={f.id}
                      className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary shrink-0">
                          <span className="material-symbols-outlined text-[22px]">
                            description
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                            {f.filename}
                          </span>
                          <span className="text-[11px] text-outline">
                            {formatFileSize(f.fileSize)} · par{' '}
                            {f.uploaderName || 'Membre'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={downloadHref}
                          target="_blank"
                          rel="noreferrer"
                          download={f.filename}
                          className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center"
                          title="Télécharger / Ouvrir"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            download
                          </span>
                        </a>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(f.id)}
                            className="p-2 rounded-lg bg-surface-container-low hover:bg-secondary-fixed text-outline hover:text-secondary flex items-center justify-center cursor-pointer"
                            title="Supprimer le fichier"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-outline-variant/15 text-xs text-outline italic">
                Aucun fichier partagé dans ce projet pour le moment.
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            ONGLET 4 : ÉQUIPE PROJET & RÔLES RBAC
           ================================================================ */}
        {activeSection === 'equipe' && (
          <div className="flex flex-col gap-5">
            <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-3">
              <h2 className="text-sm sm:text-base font-bold text-on-surface">
                Membres du projet « {project.name} »
              </h2>

              <div className="flex flex-col gap-2">
                {(project.members || []).map((m) => (
                  <div
                    key={m.userId}
                    className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-on-surface">
                        {m.name}
                      </span>
                      <span className="text-xs text-outline font-mono">
                        {m.email}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {canAdminProject ? (
                        <>
                          <select
                            value={m.role}
                            onChange={(e) =>
                              handleSetMemberRole(m.userId, e.target.value)
                            }
                            className="bg-surface-container-lowest text-on-surface text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-outline-variant/20 outline-none"
                          >
                            <option value="project_lead">Project Lead</option>
                            <option value="contributor">Contributor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.userId)}
                            className="text-xs text-secondary font-semibold hover:underline px-2 cursor-pointer"
                          >
                            Retirer
                          </button>
                        </>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-xs font-bold uppercase">
                          {m.role}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Membres du groupe parent pouvant être ajoutés au projet */}
            {canAdminProject && project.groupMembers?.length > 0 && (
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-3">
                <h3 className="text-xs sm:text-sm font-bold text-on-surface">
                  Ajouter un membre du groupe « {project.groupName} » à ce
                  projet
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.groupMembers.map((gm) => {
                    const alreadyInProject = project.members?.some(
                      (pm) => pm.userId === gm.userId
                    )
                    if (alreadyInProject) return null
                    return (
                      <button
                        key={gm.userId}
                        type="button"
                        onClick={() =>
                          handleSetMemberRole(gm.userId, 'contributor')
                        }
                        className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary hover:text-on-primary text-xs font-semibold transition-colors cursor-pointer"
                      >
                        + Ajouter {gm.name} ({gm.email})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Toast toast={toast} />
    </div>
  )
}
