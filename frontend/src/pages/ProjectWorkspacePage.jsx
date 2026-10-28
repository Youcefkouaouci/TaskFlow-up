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
  updateProject,
  deleteProject,
  fetchProjectTasks,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
  fetchProjectMessages,
  sendProjectMessage,
  fetchProjectFiles,
  uploadProjectFile,
  deleteProjectFile,
  fetchProjectActivities,
  addOrUpdateProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  sendGroupInvitation,
  getBackendOrigin,
} from '../services/groupProjectService'
import { normalizeTaskFromApi } from '../services/taskService'
import { getCurrentUser } from '../services/authService'
import EditTaskModal from '../components/EditTaskModal'
import NotificationBell from '../components/NotificationBell'
import StatsDashboardPage from './StatsDashboardPage'
import Toast from '../components/Toast'

function formatFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`
  return `${(n / (1024 * 1024)).toFixed(2)} Mo`
}

function formatRelativeTime(isoDate) {
  if (!isoDate) return "à l'instant"
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  )
  if (diffSec < 45) return "à l'instant"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `il y a ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'hier'
  if (diffDays < 7) return `il y a ${diffDays} j`
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ACTIVITY_META = {
  task_created: {
    icon: 'add_task',
    badgeClass: 'bg-secondary-fixed text-on-secondary-fixed',
  },
  task_moved: {
    icon: 'swap_horiz',
    badgeClass: 'bg-primary text-on-primary',
  },
  task_status_changed: {
    icon: 'task_alt',
    badgeClass: 'bg-emerald-100 text-emerald-900',
  },
  task_updated: {
    icon: 'edit_note',
    badgeClass: 'bg-surface-container-high text-on-surface',
  },
  task_deleted: {
    icon: 'delete',
    badgeClass: 'bg-secondary/15 text-secondary',
  },
  file_uploaded: {
    icon: 'upload_file',
    badgeClass: 'bg-primary-fixed text-on-primary-fixed',
  },
  file_deleted: {
    icon: 'folder_delete',
    badgeClass: 'bg-secondary/15 text-secondary',
  },
  member_added: {
    icon: 'person_add',
    badgeClass: 'bg-emerald-100 text-emerald-900',
  },
  member_role_updated: {
    icon: 'admin_panel_settings',
    badgeClass: 'bg-primary text-on-primary',
  },
  member_removed: {
    icon: 'person_remove',
    badgeClass: 'bg-secondary/15 text-secondary',
  },
  project_updated: {
    icon: 'tune',
    badgeClass: 'bg-surface-container-high text-on-surface',
  },
}

export default function ProjectWorkspacePage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [currentUser] = useState(() => getCurrentUser())

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [messages, setMessages] = useState([])
  const [files, setFiles] = useState([])
  const [activities, setActivities] = useState([])
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('taches') // 'taches' | 'chat' | 'fichiers' | 'equipe' | 'activite'
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
  const [editingTask, setEditingTask] = useState(null)

  // Formulaire Chat
  const [chatInput, setChatInput] = useState('')
  const [isSendingChat, setIsSendingChat] = useState(false)
  const chatBottomRef = useRef(null)

  // Upload Fichier
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const fileInputRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  // Gestion Équipe & Rôles Projet
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState('')
  const [selectedGroupMemberRole, setSelectedGroupMemberRole] =
    useState('contributor')
  const [memberEmailInput, setMemberEmailInput] = useState('')
  const [memberEmailRole, setMemberEmailRole] = useState('contributor')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState(null)

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
        const [projData, tasksData, msgsData, filesData, activitiesData] =
          await Promise.all([
            fetchProjectDetails(projectId),
            fetchProjectTasks(projectId),
            fetchProjectMessages(projectId),
            fetchProjectFiles(projectId),
            fetchProjectActivities(projectId).catch(() => []),
          ])
        if (!active) return
        setProject(projData)
        setTasks(tasksData)
        setMessages(msgsData)
        setFiles(filesData)
        setActivities(Array.isArray(activitiesData) ? activitiesData : [])
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

    socket.on('project:members_updated', async () => {
      try {
        const refreshed = await fetchProjectDetails(projectId)
        setProject(refreshed)
      } catch {
        // Ignorer si l'utilisateur a été retiré
      }
    })

    socket.on('project:updated', (payload) => {
      if (!payload) return
      setProject((prev) =>
        prev
          ? {
              ...prev,
              name: payload.name ?? prev.name,
              description: payload.description ?? prev.description,
            }
          : prev
      )
    })

    socket.on('project:activity_created', (newAct) => {
      if (!newAct) return
      setActivities((prev) =>
        prev.some((a) => a.id === newAct.id) ? prev : [newAct, ...prev]
      )
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

  async function handleSaveEditedProjectTask(taskId, updates) {
    if (!canWrite) return
    const updated = await updateProjectTask(projectId, taskId, updates)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
    setEditingTask(null)
    showToast('Tâche du projet mise à jour !')
  }

  const [dragOverQuadrant, setDragOverQuadrant] = useState(null)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectDesc, setEditProjectDesc] = useState('')
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false)

  function openEditProjectForm() {
    setEditProjectName(project?.name || '')
    setEditProjectDesc(project?.description || '')
    setIsEditingProject(true)
  }

  async function handleUpdateProjectInfo(e) {
    e.preventDefault()
    if (!canAdminProject || !editProjectName.trim() || isSavingProject) return
    setIsSavingProject(true)
    try {
      const updated = await updateProject(projectId, {
        name: editProjectName.trim(),
        description: editProjectDesc.trim(),
      })
      setProject(updated)
      setIsEditingProject(false)
      showToast('Informations du projet mises à jour !')
    } catch (err) {
      showToast(err.message || 'Impossible de modifier ce projet')
    } finally {
      setIsSavingProject(false)
    }
  }

  async function handleDeleteCurrentProject() {
    if (!canAdminProject) return
    try {
      await deleteProject(projectId)
      navigate('/?tab=partages')
    } catch (err) {
      showToast(err.message || 'Impossible de supprimer ce projet')
    }
  }

  async function handleMoveProjectTaskQuadrant(taskId, targetQuadrantNum) {
    if (!canWrite) return
    const qMap = {
      1: { urgent: true, important: true, label: 'Faire (Q1)' },
      2: { urgent: false, important: true, label: 'Planifier (Q2)' },
      3: { urgent: true, important: false, label: 'Déléguer (Q3)' },
      4: { urgent: false, important: false, label: 'Éliminer (Q4)' },
    }
    const target = qMap[targetQuadrantNum]
    if (!target) return
    try {
      const updated = await updateProjectTask(projectId, taskId, {
        urgent: target.urgent,
        important: target.important,
      })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
      showToast(`Tâche déplacée → ${target.label}`)
    } catch (err) {
      showToast(err.message || 'Impossible de déplacer la tâche')
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

  async function handleSetMemberRole(userId, role, isExistingMember = false) {
    setUpdatingMemberId(userId)
    try {
      const updated = isExistingMember
        ? await updateProjectMemberRole(projectId, userId, role)
        : await addOrUpdateProjectMember(projectId, { userId, role })
      const refreshed = await fetchProjectDetails(projectId)
      setProject(refreshed || updated)
      showToast(
        isExistingMember
          ? `Rôle mis à jour en « ${role} » !`
          : `Membre ajouté au projet avec le rôle « ${role} » !`
      )
    } catch (err) {
      showToast(err.message || 'Erreur lors de la mise à jour du membre')
    } finally {
      setUpdatingMemberId(null)
    }
  }

  async function handleAddGroupMemberForm(e) {
    e.preventDefault()
    if (!selectedGroupMemberId || !canAdminProject) return
    await handleSetMemberRole(
      selectedGroupMemberId,
      selectedGroupMemberRole,
      false
    )
    setSelectedGroupMemberId('')
  }

  async function handleAddMemberByEmail(e) {
    e.preventDefault()
    const cleanEmail = memberEmailInput.trim().toLowerCase()
    if (!cleanEmail || !canAdminProject || isAddingMember) return
    setIsAddingMember(true)
    try {
      await addOrUpdateProjectMember(projectId, {
        email: cleanEmail,
        role: memberEmailRole,
      })
      const refreshed = await fetchProjectDetails(projectId)
      setProject(refreshed)
      setMemberEmailInput('')
      showToast(
        `${cleanEmail} a été ajouté au projet (${memberEmailRole}) !`
      )
    } catch (err) {
      // Si l'utilisateur n'a pas encore de compte ou n'est pas dans le groupe, on tente d'envoyer une invitation e-mail au groupe parent
      if (project?.groupId) {
        try {
          const groupRole = memberEmailRole === 'project_lead' ? 'admin' : 'member'
          await sendGroupInvitation(project.groupId, {
            email: cleanEmail,
            role: groupRole,
          })
          setMemberEmailInput('')
          showToast(
            `Invitation e-mail envoyée à ${cleanEmail} pour rejoindre le groupe « ${project.groupName} » !`
          )
        } catch (inviteErr) {
          showToast(
            inviteErr.message ||
              err.message ||
              "Impossible d'ajouter ou d'inviter cet utilisateur"
          )
        }
      } else {
        showToast(err.message || "Impossible d'ajouter ce membre")
      }
    } finally {
      setIsAddingMember(false)
    }
  }

  async function handleRemoveMember(userId) {
    setUpdatingMemberId(userId)
    try {
      await removeProjectMember(projectId, userId)
      const refreshed = await fetchProjectDetails(projectId)
      setProject(refreshed)
      showToast('Membre retiré du projet')
    } catch (err) {
      showToast(err.message || 'Impossible de retirer ce membre')
    } finally {
      setUpdatingMemberId(null)
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

  const projectMembers = project.members || []
  const leadCount = projectMembers.filter(
    (pm) => pm.role === 'project_lead'
  ).length
  const availableGroupMembers = (project.groupMembers || []).filter(
    (gm) => !projectMembers.some((pm) => pm.userId === gm.userId)
  )
  const groupRoleMap = new Map(
    (project.groupMembers || []).map((gm) => [gm.userId, gm.role])
  )
  const roleDescriptions = {
    project_lead: {
      label: 'Project Lead',
      desc: 'Administration complète du projet, des membres et des tâches',
      badgeClass: 'bg-secondary text-on-secondary',
    },
    contributor: {
      label: 'Contributor',
      desc: 'Création/modification des tâches, chat et partage de fichiers',
      badgeClass: 'bg-primary text-on-primary',
    },
    viewer: {
      label: 'Viewer',
      desc: 'Consultation en lecture seule de la matrice et des livrables',
      badgeClass: 'bg-surface-container-high text-on-surface',
    },
  }

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
              {project.description && (
                <p className="text-xs text-outline truncate max-w-md">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canAdminProject && (
              <>
                <button
                  type="button"
                  onClick={openEditProjectForm}
                  className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Modifier le nom ou la description du projet"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    edit
                  </span>
                  <span className="hidden sm:inline">Modifier</span>
                </button>

                {confirmDeleteProject ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDeleteCurrentProject}
                      className="px-2.5 py-1.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold cursor-pointer"
                    >
                      Confirmer suppression
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteProject(false)}
                      className="px-2 py-1.5 rounded-xl bg-surface-container-low text-outline text-xs font-semibold cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteProject(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-secondary-fixed text-secondary text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Supprimer ce projet"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      delete
                    </span>
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setIsActivityDrawerOpen((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border ${
                isActivityDrawerOpen
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-outline-variant/15'
              }`}
              title="Ouvrir le fil d'actualité latéral du projet"
            >
              <span className="material-symbols-outlined text-[16px]">
                history
              </span>
              <span>Activité ({activities.length})</span>
            </button>

            <NotificationBell user={currentUser} onShowToast={showToast} />

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

        {/* Formulaire d'édition rapide du nom & description du projet */}
        {isEditingProject && canAdminProject && (
          <form
            onSubmit={handleUpdateProjectInfo}
            className="max-w-5xl mx-auto mt-3 p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center"
          >
            <input
              type="text"
              value={editProjectName}
              onChange={(e) => setEditProjectName(e.target.value)}
              placeholder="Nom du projet"
              aria-label="Nom du projet"
              className="flex-1 bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none font-semibold"
              required
            />
            <input
              type="text"
              value={editProjectDesc}
              onChange={(e) => setEditProjectDesc(e.target.value)}
              placeholder="Description du projet (optionnelle)"
              aria-label="Description du projet"
              className="flex-1 bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                disabled={isSavingProject || !editProjectName.trim()}
                className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                {isSavingProject ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingProject(false)}
                className="px-3 py-2 rounded-xl bg-surface-container-low text-on-surface text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

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
            {
              id: 'stats',
              label: 'Statistiques',
              icon: 'monitoring',
            },
            {
              id: 'activite',
              label: `Journal (${activities.length})`,
              icon: 'history',
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
                const isTargetQuadrant = dragOverQuadrant === q.num
                return (
                  <div
                    key={q.code}
                    onDragOver={(e) => {
                      if (!canWrite) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (dragOverQuadrant !== q.num) setDragOverQuadrant(q.num)
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverQuadrant(null)
                      }
                    }}
                    onDrop={(e) => {
                      if (!canWrite) return
                      e.preventDefault()
                      setDragOverQuadrant(null)
                      const draggedId = e.dataTransfer.getData('text/plain')
                      const fromQ = Number(
                        e.dataTransfer.getData('application/x-taskflow-quadrant')
                      )
                      if (draggedId && fromQ !== q.num) {
                        handleMoveProjectTaskQuadrant(draggedId, q.num)
                      }
                    }}
                    className={`bg-surface-container-low rounded-2xl p-4 flex flex-col gap-3 transition-all ${
                      q.border
                    } ${
                      isTargetQuadrant
                        ? 'ring-2 ring-secondary bg-secondary-fixed/20 scale-[1.01]'
                        : ''
                    }`}
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
                              draggable={canWrite}
                              onDragStart={(e) => {
                                if (!canWrite) return
                                e.dataTransfer.setData('text/plain', String(t.id))
                                e.dataTransfer.setData(
                                  'application/x-taskflow-quadrant',
                                  String(t.quadrant)
                                )
                                e.dataTransfer.effectAllowed = 'move'
                              }}
                              className={`bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-outline-variant/10 flex flex-col gap-2 ${
                                canWrite
                                  ? 'cursor-grab active:cursor-grabbing'
                                  : ''
                              } ${isDone ? 'opacity-60' : ''}`}
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
                                      : t.status === 'in_progress' ||
                                        t.status === 'doing'
                                      ? 'En cours'
                                      : 'À faire'}
                                  </button>
                                  {canWrite && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setEditingTask(t)}
                                        className="p-1 text-outline hover:text-primary cursor-pointer"
                                        title="Modifier la tâche"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          edit
                                        </span>
                                      </button>
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
                                    </>
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
              {/* Légende des Rôles RBAC du Projet */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(roleDescriptions).map(([roleKey, info]) => (
                  <div
                    key={roleKey}
                    className="bg-surface-container-lowest rounded-2xl p-3.5 border border-outline-variant/15 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${info.badgeClass}`}
                      >
                        {info.label}
                      </span>
                      <span className="text-[11px] font-bold text-outline">
                        {
                          projectMembers.filter((m) => m.role === roleKey)
                            .length
                        }{' '}
                        membre(s)
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {info.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Liste des membres actifs du projet */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-3.5">
                <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2.5">
                  <div className="flex flex-col">
                    <h2 className="text-sm sm:text-base font-bold text-on-surface">
                      Membres du projet « {project.name} »
                    </h2>
                    <span className="text-xs text-outline">
                      {canAdminProject
                        ? 'En tant que Project Lead, vous pouvez modifier le rôle de chaque membre ou gérer les accès.'
                        : 'Consultez les membres et leurs rôles au sein de ce projet.'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-secondary">
                    {projectMembers.length} actif(s)
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {projectMembers.map((m) => {
                    const isMe = currentUser && m.userId === currentUser.id
                    const isOnlyLead =
                      m.role === 'project_lead' && leadCount <= 1
                    const isUpdating = updatingMemberId === m.userId
                    const groupRole = groupRoleMap.get(m.userId)
                    const roleInfo =
                      roleDescriptions[m.role] || roleDescriptions.viewer

                    return (
                      <div
                        key={m.userId}
                        className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-3 flex-wrap border border-outline-variant/10"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
                            {(m.name || m.email || 'M')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                                {m.name}
                              </span>
                              {isMe && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-bold">
                                  Vous
                                </span>
                              )}
                              {groupRole && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-outline font-medium">
                                  Groupe : {groupRole}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-outline font-mono truncate">
                              {m.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canAdminProject ? (
                            <>
                              <label
                                htmlFor={`role-select-${m.userId}`}
                                className="sr-only"
                              >
                                Rôle de {m.name}
                              </label>
                              <select
                                id={`role-select-${m.userId}`}
                                value={m.role}
                                disabled={isUpdating}
                                onChange={(e) =>
                                  handleSetMemberRole(
                                    m.userId,
                                    e.target.value,
                                    true
                                  )
                                }
                                className="bg-surface-container-lowest text-on-surface text-xs font-semibold px-3 py-1.5 rounded-xl border border-outline-variant/25 focus:border-secondary outline-none cursor-pointer disabled:opacity-50"
                              >
                                <option value="project_lead">
                                  Project Lead (Admin projet)
                                </option>
                                <option
                                  value="contributor"
                                  disabled={isOnlyLead}
                                >
                                  Contributor (Écriture)
                                </option>
                                <option value="viewer" disabled={isOnlyLead}>
                                  Viewer (Lecture seule)
                                </option>
                              </select>
                              <button
                                type="button"
                                disabled={isOnlyLead || isUpdating}
                                onClick={() => handleRemoveMember(m.userId)}
                                title={
                                  isOnlyLead
                                    ? 'Impossible de retirer le dernier Project Lead'
                                    : 'Retirer ce membre du projet'
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-surface-container hover:bg-secondary-fixed text-xs text-secondary font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Retirer
                              </button>
                            </>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${roleInfo.badgeClass}`}
                            >
                              {roleInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Section Administration : Ajouter un membre du groupe ou par e-mail */}
              {canAdminProject && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Ajouter un membre déjà présent dans le groupe parent */}
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-secondary">
                        group_add
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-on-surface">
                        Depuis le groupe « {project.groupName} »
                      </h3>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Sélectionnez un membre du groupe parent et choisissez son
                      rôle dans ce projet.
                    </p>

                    {availableGroupMembers.length > 0 ? (
                      <>
                        <form
                          onSubmit={handleAddGroupMemberForm}
                          className="flex flex-col gap-2.5"
                        >
                          <select
                            value={selectedGroupMemberId}
                            onChange={(e) =>
                              setSelectedGroupMemberId(e.target.value)
                            }
                            className="bg-surface-container-low text-on-surface text-xs px-3 py-2.5 rounded-xl border border-outline-variant/20 outline-none"
                            required
                          >
                            <option value="">
                              -- Choisir un membre du groupe ({availableGroupMembers.length}{' '}
                              disponible(s)) --
                            </option>
                            {availableGroupMembers.map((gm) => (
                              <option key={gm.userId} value={gm.userId}>
                                {gm.name} ({gm.email}) — Rôle groupe : {gm.role}
                              </option>
                            ))}
                          </select>

                          <div className="flex gap-2">
                            <select
                              value={selectedGroupMemberRole}
                              onChange={(e) =>
                                setSelectedGroupMemberRole(e.target.value)
                              }
                              className="flex-1 bg-surface-container-low text-on-surface text-xs font-semibold px-3 py-2 rounded-xl border border-outline-variant/20 outline-none"
                            >
                              <option value="contributor">
                                Rôle : Contributor
                              </option>
                              <option value="project_lead">
                                Rôle : Project Lead
                              </option>
                              <option value="viewer">Rôle : Viewer</option>
                            </select>
                            <button
                              type="submit"
                              disabled={!selectedGroupMemberId}
                              className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer shrink-0"
                            >
                              + Ajouter au projet
                            </button>
                          </div>
                        </form>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {availableGroupMembers.map((gm) => (
                            <button
                              key={gm.userId}
                              type="button"
                              onClick={() =>
                                handleSetMemberRole(
                                  gm.userId,
                                  selectedGroupMemberRole,
                                  false
                                )
                              }
                              className="px-2.5 py-1 rounded-xl bg-surface-container-low hover:bg-primary hover:text-on-primary text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              + {gm.name} ({selectedGroupMemberRole})
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="p-3 rounded-xl bg-surface-container-low text-xs text-outline italic">
                        Tous les membres actuels du groupe « {project.groupName}{' '}
                        » font déjà partie de ce projet.
                      </div>
                    )}
                  </div>

                  {/* 2. Ajouter ou inviter directement par adresse e-mail */}
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-secondary">
                        person_add
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-on-surface">
                        Ajouter / Inviter par e-mail
                      </h3>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Ajoutez directement un utilisateur inscrit par e-mail avec
                      son rôle projet (ou envoyez-lui une invitation SMTP s'il
                      n'est pas encore dans le groupe).
                    </p>

                    <form
                      onSubmit={handleAddMemberByEmail}
                      className="flex flex-col gap-2.5"
                    >
                      <input
                        type="email"
                        value={memberEmailInput}
                        onChange={(e) => setMemberEmailInput(e.target.value)}
                        placeholder="collaborateur@ecole.fr"
                        className="bg-surface-container-low text-on-surface text-xs px-3 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
                        required
                      />
                      <div className="flex gap-2">
                        <select
                          value={memberEmailRole}
                          onChange={(e) => setMemberEmailRole(e.target.value)}
                          className="flex-1 bg-surface-container-low text-on-surface text-xs font-semibold px-3 py-2 rounded-xl border border-outline-variant/20 outline-none"
                        >
                          <option value="contributor">
                            Rôle : Contributor
                          </option>
                          <option value="project_lead">
                            Rôle : Project Lead
                          </option>
                          <option value="viewer">Rôle : Viewer</option>
                        </select>
                        <button
                          type="submit"
                          disabled={!memberEmailInput.trim() || isAddingMember}
                          className="px-4 py-2 bg-secondary text-on-secondary rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer shrink-0"
                        >
                          {isAddingMember ? 'Ajout...' : '+ Attribuer'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
        )}

        {/* ================================================================
            ONGLET 5 : STATISTIQUES DU PROJET (CHART.JS)
           ================================================================ */}
        {activeSection === 'stats' && (
          <StatsDashboardPage
            fixedProject={project}
            fixedTasks={tasks}
            currentUser={currentUser}
          />
        )}

        {/* ================================================================
            ONGLET 6 : JOURNAL D'ACTIVITÉ DU PROJET (AUDIT LOG CHRONOLOGIQUE)
           ================================================================ */}
        {activeSection === 'activite' && (
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary">
                  history
                </span>
                <h2 className="text-sm sm:text-base font-bold text-on-surface">
                  Journal d'activité du projet « {project.name} »
                </h2>
              </div>
              <span className="text-xs font-semibold text-outline">
                {activities.length} événement(s) enregistré(s)
              </span>
            </div>

            {activities.length > 0 ? (
              <div className="relative pl-4 border-l-2 border-outline-variant/25 flex flex-col gap-3 my-1">
                {activities.map((item) => {
                  const meta = ACTIVITY_META[item.action] || {
                    icon: 'bolt',
                    badgeClass: 'bg-surface-container-high text-on-surface',
                  }
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-start justify-between gap-3 flex-wrap"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.badgeClass}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {meta.icon}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-xs sm:text-sm text-on-surface leading-snug">
                            <strong className="font-bold">
                              {item.actorName || 'Membre'}
                            </strong>{' '}
                            <span>{item.description}</span>
                          </p>
                          <span className="text-[11px] text-outline mt-0.5">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-outline italic py-4 text-center">
                Aucune activité enregistrée pour le moment. Créez ou déplacez
                une tâche, ou partagez un fichier pour voir l'historique en
                direct.
              </p>
            )}
          </div>
        )}
      </main>

      {/* PANNEAU LATÉRAL (DRAWER) DU JOURNAL D'ACTIVITÉ EN TEMPS RÉEL */}
      {isActivityDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-2xs"
          onClick={() => setIsActivityDrawerOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            aria-label="Fil d'actualité du projet"
            className="w-full max-w-md h-full bg-surface-container-lowest shadow-2xl border-l border-outline-variant/20 flex flex-col animate-in slide-in-from-right duration-150"
          >
            <div className="p-4 border-b border-outline-variant/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary">
                  history
                </span>
                <div className="flex flex-col">
                  <h2 className="text-sm font-bold text-on-surface">
                    Fil d'actualité · {project.name}
                  </h2>
                  <span className="text-[11px] text-outline">
                    Historique chronologique en temps réel (Audit Log)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActivityDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface cursor-pointer"
                aria-label="Fermer le fil d'actualité"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activities.length > 0 ? (
                <div className="relative pl-4 border-l-2 border-outline-variant/25 flex flex-col gap-3">
                  {activities.map((item) => {
                    const meta = ACTIVITY_META[item.action] || {
                      icon: 'bolt',
                      badgeClass: 'bg-surface-container-high text-on-surface',
                    }
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-start gap-2.5"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.badgeClass}`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {meta.icon}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-xs text-on-surface leading-relaxed">
                            <strong className="font-bold">
                              {item.actorName || 'Membre'}
                            </strong>{' '}
                            <span>{item.description}</span>
                          </p>
                          <span className="text-[10px] font-semibold text-outline mt-1">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-6 text-outline">
                  <span className="material-symbols-outlined text-[32px] opacity-60">
                    history
                  </span>
                  <p className="text-xs italic">
                    Aucune activité récente dans ce projet.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <EditTaskModal
        task={editingTask}
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEditedProjectTask}
        projectMembers={project.members || []}
      />

      <Toast toast={toast} />
    </div>
  )
}
