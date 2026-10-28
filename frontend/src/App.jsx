import { useState, useEffect, useMemo } from 'react'
import Header from './components/Header'
import ContextSwitch from './components/ContextSwitch'
import ProductivityBanner from './components/ProductivityBanner'
import Quadrant from './components/Quadrant'
import MatrixSummary from './components/MatrixSummary'
import NewTaskModal from './components/NewTaskModal'
import EditTaskModal from './components/EditTaskModal'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import CreateTaskPage from './pages/CreateTaskPage'
import ListAndFiltersPage from './pages/ListAndFiltersPage'
import CalendarPage from './pages/CalendarPage'
import StatsDashboardPage from './pages/StatsDashboardPage'
import SharesPage from './pages/SharesPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ProfilePage from './pages/ProfilePage'
import {
  fetchTasks,
  createTask,
  updateTask,
  toggleTaskCompleted,
  deleteTask,
  delegateTask,
  moveTaskToQuadrant,
} from './services/taskService'
import {
  getCurrentUser,
  logoutUser,
} from './services/authService'
import {
  acceptInvitationToken,
  fetchMyProjects,
} from './services/groupProjectService'
import { api } from './api/client'

export default function App() {
  const [currentPage, setCurrentPage] = useState('matrix') // 'matrix' | 'create-task' | 'login'
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register' | 'forgot-password'
  const [authEmail, setAuthEmail] = useState('')
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [activeContext, setActiveContext] = useState('Tous') // 'Tous' | 'Entreprise' | 'École'
  const [selectedProjectId, setSelectedProjectId] = useState('all') // 'all' | 'general' | projectId
  const [isFocusFaireOnly, setIsFocusFaireOnly] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') || 'matrice'
  })
  const [toast, setToast] = useState({ message: '', visible: false })

  function showToast(message) {
    setToast({ message, visible: true })
    clearTimeout(window.__toastTimeout)
    window.__toastTimeout = setTimeout(() => {
      setToast({ message: '', visible: false })
    }, 2500)
  }

  // Recharger les tâches et les projets depuis MongoDB uniquement lorsqu'un utilisateur est connecté
  useEffect(() => {
    let active = true
    async function loadTasksAndProjects() {
      if (!currentUser) {
        if (active) {
          setTasks([])
          setProjects([])
          setLoadError(null)
          setIsLoading(false)
        }
        return
      }
      try {
        setIsLoading(true)
        setLoadError(null)
        const [data, userProjects] = await Promise.all([
          fetchTasks(),
          fetchMyProjects().catch(() => []),
        ])
        if (active) {
          setTasks(data)
          setProjects(Array.isArray(userProjects) ? userProjects : [])
        }
      } catch (error) {
        if (active) {
          setLoadError('Impossible de charger vos tâches depuis la base de données.')
          showToast('Erreur lors du chargement des tâches')
        }
        console.error(error)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadTasksAndProjects()
    return () => {
      active = false
    }
  }, [currentUser])

  // Si l'URL contient ?token=... (lien d'invitation reçu par e-mail), accepter automatiquement
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token && currentUser) {
      acceptInvitationToken(token)
        .then((res) => {
          showToast(
            `Invitation acceptée ! Vous avez rejoint « ${res.group?.name || 'le groupe'} »`
          )
          window.history.replaceState({}, '', window.location.pathname)
          setActiveTab('partages')
        })
        .catch((err) => {
          showToast(err.message || 'Impossible de valider cette invitation')
        })
    }
  }, [currentUser])

  function handleSelectContext(context) {
    setActiveContext(context)
    showToast(
      context === 'Tous'
        ? 'Filtre actif : Tous les contextes'
        : context === 'Entreprise'
        ? 'Filtre actif : Semaine Entreprise'
        : 'Filtre actif : Cursus École'
    )
  }

  function handleSelectProject(projectId) {
    setSelectedProjectId(projectId)
    if (projectId === 'all') {
      showToast('Filtre projet : Tous les projets')
    } else if (projectId === 'general') {
      showToast('Filtre projet : Projet Général')
    } else {
      const found = projects.find((p) => p.id === projectId)
      showToast(`Filtre projet : ${found ? found.name : 'Projet sélectionné'}`)
    }
  }

  async function handleToggleStatus(taskId, nextCompletedState) {
    try {
      await toggleTaskCompleted(taskId, nextCompletedState)
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                completed: nextCompletedState,
                status: nextCompletedState ? 'done' : 'todo',
              }
            : t
        )
      )
      showToast(
        nextCompletedState ? 'Tâche terminée ! Bravo 🎉' : 'Tâche réactivée'
      )
    } catch (error) {
      showToast('Impossible de mettre à jour le statut')
      console.error(error)
    }
  }

  async function handleCycleTaskStatus(task) {
    const cycle = {
      todo: 'doing',
      in_progress: 'done',
      doing: 'done',
      inprogress: 'done',
      done: 'todo',
    }
    const nextStatus = cycle[task.status] || 'todo'
    try {
      await api.patch(`/tasks/${task.id}`, { status: nextStatus })
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: nextStatus,
                completed: nextStatus === 'done',
              }
            : t
        )
      )
      const label =
        nextStatus === 'done'
          ? 'Terminé'
          : nextStatus === 'doing' || nextStatus === 'in_progress'
          ? 'En cours'
          : 'À faire'
      showToast(`Statut mis à jour : ${label}`)
    } catch (error) {
      showToast('Erreur lors du changement de statut')
      console.error(error)
    }
  }

  async function handleCreateTask(newTaskData) {
    try {
      const created = await createTask(newTaskData)
      setTasks((prev) => [created, ...prev])
      showToast('Nouvelle tâche enregistrée dans la matrice !')
    } catch (error) {
      showToast('Erreur lors de la création de la tâche')
      console.error(error)
    }
  }

  async function handleUpdateTask(taskId, updates) {
    const updated = await updateTask(taskId, updates)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
    setEditingTask(null)
    showToast('Tâche modifiée avec succès !')
  }

  async function handleDeleteTask(taskId) {
    try {
      await deleteTask(taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      showToast('Tâche supprimée du quadrant')
    } catch (error) {
      showToast('Erreur lors de la suppression')
      console.error(error)
    }
  }

  async function handleMoveQuadrant(taskId, newQuadrant) {
    try {
      const updated = await moveTaskToQuadrant(taskId, newQuadrant)
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, ...updated, quadrant: newQuadrant } : t
        )
      )
      const labels = { 1: 'Faire', 2: 'Planifier', 3: 'Déléguer', 4: 'Éliminer' }
      showToast(`Tâche déplacée → ${labels[newQuadrant]}`)
    } catch (error) {
      showToast('Impossible de déplacer la tâche')
      console.error(error)
    }
  }

  async function handleDelegateTask(task) {
    try {
      await delegateTask(task.id, {
        title: task.title,
        delegateTo: task.delegateTo,
      })
      showToast('Application de messagerie ouverte')
    } catch (error) {
      showToast('Erreur lors de la délégation')
      console.error(error)
    }
  }

  function handleToggleFocusFaire() {
    setIsFocusFaireOnly((prev) => {
      const nextState = !prev
      showToast(
        nextState
          ? 'Affichage focalisé : Faire uniquement'
          : 'Affichage complet de la matrice'
      )
      return nextState
    })
  }

  async function handleLogout() {
    try {
      await logoutUser()
      setCurrentUser(null)
      setTasks([])
      setProjects([])
      setAuthMode('login')
      showToast('Vous avez été déconnecté avec succès.')
    } catch (error) {
      console.error(error)
      showToast('Erreur lors de la déconnexion')
    }
  }

  const filteredMatrixTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Filtre par contexte (Entreprise / École)
      if (activeContext !== 'Tous') {
        const taskContext = t.context || t.tag || 'Entreprise'
        if (taskContext !== activeContext) return false
      }
      // Filtre par projet (Tous / Projet Général / Projet spécifique)
      if (selectedProjectId === 'general') {
        if (t.projectId) return false
      } else if (selectedProjectId !== 'all') {
        if (t.projectId !== selectedProjectId) return false
      }
      return true
    })
  }, [tasks, activeContext, selectedProjectId])

  const activeTasks = useMemo(
    () => filteredMatrixTasks.filter((t) => !t.completed),
    [filteredMatrixTasks]
  )

  const quadrant1Tasks = useMemo(
    () => filteredMatrixTasks.filter((t) => t.quadrant === 1),
    [filteredMatrixTasks]
  )
  const quadrant2Tasks = useMemo(
    () => filteredMatrixTasks.filter((t) => t.quadrant === 2),
    [filteredMatrixTasks]
  )
  const quadrant3Tasks = useMemo(
    () => filteredMatrixTasks.filter((t) => t.quadrant === 3),
    [filteredMatrixTasks]
  )
  const quadrant4Tasks = useMemo(
    () => filteredMatrixTasks.filter((t) => t.quadrant === 4),
    [filteredMatrixTasks]
  )

  const urgentCount = useMemo(
    () => activeTasks.filter((t) => t.quadrant === 1).length,
    [activeTasks]
  )

  const nextDeadlineLabel = useMemo(() => {
    const dated = activeTasks
      .filter((t) => t.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    if (dated.length === 0) return null
    return new Date(dated[0].dueDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    })
  }, [activeTasks])

  const tempoStateLabel = useMemo(() => {
    if (urgentCount === 0) return 'Aucune urgence'
    if (urgentCount <= 2) return 'Charge maîtrisée'
    return 'Priorité haute'
  }, [urgentCount])

  if (currentPage === 'login') {
    return (
      <>
        <div className="relative">
          <div className="fixed top-4 right-4 z-50">
            <button
              type="button"
              onClick={() => setCurrentPage('matrix')}
              className="px-3.5 py-2 rounded-lg bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>← Retour à la matrice</span>
            </button>
          </div>
          {currentUser ? (
            <ProfilePage
              user={currentUser}
              onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
              onLogout={handleLogout}
              onGoToMatrix={() => setCurrentPage('matrix')}
              onGoToShares={() => {
                setCurrentPage('matrix')
                setActiveTab('partages')
              }}
              onShowToast={showToast}
            />
          ) : authMode === 'register' ? (
            <RegisterPage
              onRegisterSuccess={(user) => {
                setCurrentUser(user)
                setCurrentPage('matrix')
                showToast(`Bienvenue ${user.name} ! Compte créé.`)
              }}
              onNavigateToLogin={() => setAuthMode('login')}
              onShowToast={showToast}
            />
          ) : authMode === 'forgot-password' ? (
            <ForgotPasswordPage
              initialEmail={authEmail}
              onNavigateToLogin={() => setAuthMode('login')}
              onShowToast={showToast}
            />
          ) : (
            <LoginPage
              onLoginSuccess={(user) => {
                setCurrentUser(user)
                setCurrentPage('matrix')
                showToast(`Bienvenue ${user.name} ! Connexion réussie.`)
              }}
              onNavigateToRegister={() => setAuthMode('register')}
              onNavigateToForgotPassword={(email) => {
                setAuthEmail(email)
                setAuthMode('forgot-password')
              }}
              onShowToast={showToast}
            />
          )}
        </div>
        <Toast toast={toast} />
      </>
    )
  }

  if (currentPage === 'create-task') {
    return (
      <>
        <CreateTaskPage
          onBack={() => setCurrentPage('matrix')}
          projects={projects}
          defaultProjectId={selectedProjectId}
          defaultContext={activeContext}
          onSaveTask={async (taskData) => {
            await handleCreateTask(taskData)
            setCurrentPage('matrix')
          }}
        />
        <Toast toast={toast} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface antialiased">
      <Header
        title={
          activeTab === 'partages'
            ? 'Groupes & Invitations'
            : activeTab === 'liste'
            ? 'Liste & Filtres'
            : activeTab === 'agenda'
            ? 'Calendrier & Échéances'
            : activeTab === 'stats'
            ? 'Tableau de Bord & Statistiques'
            : activeTab === 'compte'
            ? currentUser
              ? 'Mon Compte'
              : authMode === 'register'
              ? 'Inscription'
              : authMode === 'forgot-password'
              ? 'Mot de passe oublié'
              : 'Connexion'
            : 'Matrice'
        }
        urgentCount={urgentCount}
        onProfileClick={() => setActiveTab('compte')}
        user={currentUser}
        onShowToast={showToast}
      />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface max-w-7xl mx-auto px-gutter">
        {!currentUser && activeTab !== 'compte' ? (
          <div className="my-auto py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary-fixed/60 text-secondary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[28px]">lock</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-on-surface">
              Connexion requise
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Connectez-vous ou créez un compte pour accéder à vos tâches, votre agenda, vos statistiques et vos espaces projets enregistrés en base de données.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setActiveTab('compte')
                }}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register')
                  setActiveTab('compte')
                }}
                className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Créer un compte
              </button>
            </div>
          </div>
        ) : activeTab === 'liste' ? (
          <ListAndFiltersPage
            tasks={tasks}
            onToggleStatus={handleToggleStatus}
            onCycleStatus={handleCycleTaskStatus}
            onDeleteTask={handleDeleteTask}
            onEditTask={(task) => setEditingTask(task)}
            onShowToast={showToast}
          />
        ) : activeTab === 'agenda' ? (
          <CalendarPage
            tasks={tasks}
            projects={projects}
            onToggleStatus={handleToggleStatus}
            onEditTask={(task) => setEditingTask(task)}
            onDeleteTask={handleDeleteTask}
            onUpdateTaskDate={async (taskId, targetDateKey) => {
              const updated = await updateTask(taskId, {
                dueDate: targetDateKey,
              })
              setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? updated : t))
              )
              showToast(`Échéance déplacée au ${targetDateKey}`)
            }}
            onCreateTaskOnDate={handleCreateTask}
            onShowToast={showToast}
          />
        ) : activeTab === 'stats' ? (
          <StatsDashboardPage
            tasks={tasks}
            projects={projects}
            currentUser={currentUser}
          />
        ) : activeTab === 'partages' ? (
          <SharesPage
            currentUser={currentUser}
            onNavigateToLogin={() => setActiveTab('compte')}
            onShowToast={showToast}
          />
        ) : activeTab === 'compte' ? (
          currentUser ? (
            <ProfilePage
              user={currentUser}
              onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
              onLogout={handleLogout}
              onGoToMatrix={() => setActiveTab('matrice')}
              onGoToShares={() => setActiveTab('partages')}
              onShowToast={showToast}
            />
          ) : authMode === 'register' ? (
            <RegisterPage
              onRegisterSuccess={(user) => {
                setCurrentUser(user)
                setActiveTab('matrice')
                showToast(`Bienvenue ${user.name} ! Compte créé.`)
              }}
              onNavigateToLogin={() => setAuthMode('login')}
              onShowToast={showToast}
            />
          ) : authMode === 'forgot-password' ? (
            <ForgotPasswordPage
              initialEmail={authEmail}
              onNavigateToLogin={() => setAuthMode('login')}
              onShowToast={showToast}
            />
          ) : (
            <LoginPage
              onLoginSuccess={(user) => {
                setCurrentUser(user)
                setActiveTab('matrice')
                showToast(`Bienvenue ${user.name} ! Connexion réussie.`)
              }}
              onNavigateToRegister={() => setAuthMode('register')}
              onNavigateToForgotPassword={(email) => {
                setAuthEmail(email)
                setAuthMode('forgot-password')
              }}
              onShowToast={showToast}
            />
          )
        ) : (
          <>
            <ContextSwitch
              activeContext={activeContext}
              onSelectContext={handleSelectContext}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={handleSelectProject}
              onOpenNewTaskModal={() => setCurrentPage('create-task')}
            />

            <ProductivityBanner
              criticalCount={urgentCount}
              nextDeadlineText={nextDeadlineLabel}
              tempoState={tempoStateLabel}
            />

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-outline">
                <span className="material-symbols-outlined animate-spin text-[28px]">
                  progress_activity
                </span>
                <span className="text-xs">Chargement de la matrice...</span>
              </div>
            ) : loadError ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <span className="material-symbols-outlined text-[32px] text-error">
                  cloud_off
                </span>
                <p className="text-sm text-on-surface-variant">{loadError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-space-md w-full">
                <Quadrant
                  id={1}
                  title="Faire"
                  subtitle="· Urgent & Important"
                  badgeText={`${quadrant1Tasks.length} tâches`}
                  isCritical={true}
                  tasks={quadrant1Tasks}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDeleteTask}
                  onDelegate={handleDelegateTask}
                  onMoveQuadrant={handleMoveQuadrant}
                  onEdit={(task) => setEditingTask(task)}
                />

                {!isFocusFaireOnly && (
                  <Quadrant
                    id={2}
                    title="Planifier"
                    subtitle="· Important"
                    badgeText={`${quadrant2Tasks.length} tâches`}
                    isCritical={false}
                    tasks={quadrant2Tasks}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDeleteTask}
                    onDelegate={handleDelegateTask}
                    onMoveQuadrant={handleMoveQuadrant}
                    onEdit={(task) => setEditingTask(task)}
                  />
                )}

                {!isFocusFaireOnly && (
                  <Quadrant
                    id={3}
                    title="Déléguer"
                    subtitle="· Urgent"
                    badgeText={`${quadrant3Tasks.length} tâches`}
                    isCritical={false}
                    tasks={quadrant3Tasks}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDeleteTask}
                    onDelegate={handleDelegateTask}
                    onMoveQuadrant={handleMoveQuadrant}
                    onEdit={(task) => setEditingTask(task)}
                  />
                )}

                {!isFocusFaireOnly && (
                  <Quadrant
                    id={4}
                    title="Éliminer"
                    subtitle="· Ni urgent ni important"
                    badgeText={`${quadrant4Tasks.length} tâches`}
                    isCritical={false}
                    tasks={quadrant4Tasks}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDeleteTask}
                    onDelegate={handleDelegateTask}
                    onMoveQuadrant={handleMoveQuadrant}
                    onEdit={(task) => setEditingTask(task)}
                  />
                )}
              </section>
            )}

            <MatrixSummary
              totalActiveCount={activeTasks.length}
              criticalCount={urgentCount}
              mentalHealthText={
                nextDeadlineLabel
                  ? `Prochaine échéance enregistrée : ${nextDeadlineLabel}.`
                  : 'Toutes les données affichées sont synchronisées avec MongoDB.'
              }
              isFocusFaireOnly={isFocusFaireOnly}
              onToggleFocusFaire={handleToggleFocusFaire}
            />
          </>
        )}
      </main>

      <NewTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateTask={handleCreateTask}
        projects={projects}
        defaultProjectId={selectedProjectId}
        defaultContext={activeContext}
      />

      <EditTaskModal
        task={editingTask}
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSave={handleUpdateTask}
        projects={projects}
      />

      <Toast toast={toast} />

      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          setActiveTab(tabId)
        }}
      />
    </div>
  )
}
