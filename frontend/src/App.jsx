/**
 * ============================================================================
 * TaskFlow - Application Principale (React 19 + Tailwind CSS v4)
 * ============================================================================
 * Connectée de bout en bout au Backend Express / MongoDB :
 * - Authentification JWT (`/api/auth/login`, `/api/auth/register`)
 * - CRUD Tâches & Matrice d'Eisenhower (`/api/tasks`)
 * - Groupes, Projets & Invitations par e-mail (`/api/groups`, `/api/projects`, `/api/invitations`)
 * ============================================================================
 */

import { useState, useEffect, useMemo } from 'react'
import Header from './components/Header'
import ContextSwitch from './components/ContextSwitch'
import ProductivityBanner from './components/ProductivityBanner'
import Quadrant from './components/Quadrant'
import MatrixSummary from './components/MatrixSummary'
import NewTaskModal from './components/NewTaskModal'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import CreateTaskPage from './pages/CreateTaskPage'
import ListAndFiltersPage from './pages/ListAndFiltersPage'
import SharesPage from './pages/SharesPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ProfilePage from './pages/ProfilePage'
import {
  fetchTasks,
  createTask,
  toggleTaskCompleted,
  updateTaskStatus,
  deleteTask,
  delegateTask,
  shareTask,
} from './services/taskService'
import {
  getCurrentUser,
  logoutUser,
} from './services/authService'
import { acceptInvitationToken } from './services/groupProjectService'

export default function App() {
  const [currentPage, setCurrentPage] = useState('matrix') // 'matrix' | 'create-task' | 'login'
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register' | 'forgot-password'
  const [authEmail, setAuthEmail] = useState('')
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeContext, setActiveContext] = useState('Entreprise') // 'Entreprise' | 'École'
  const [isFocusFaireOnly, setIsFocusFaireOnly] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('matrice')
  const [toast, setToast] = useState({ message: '', visible: false })

  function showToast(message) {
    setToast({ message, visible: true })
    clearTimeout(window.__toastTimeout)
    window.__toastTimeout = setTimeout(() => {
      setToast({ message: '', visible: false })
    }, 2500)
  }

  // Recharger les tâches au démarrage et à chaque changement d'utilisateur connecté
  useEffect(() => {
    let active = true
    async function loadTasks() {
      try {
        const data = await fetchTasks()
        if (active) setTasks(data)
      } catch (error) {
        if (active) showToast('Erreur lors du chargement des tâches')
        console.error(error)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadTasks()
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
      context === 'Entreprise'
        ? 'Filtre actif : Semaine Entreprise'
        : 'Filtre actif : Cursus École'
    )
  }

  async function handleToggleStatus(taskId, nextCompletedState) {
    try {
      const updated = await toggleTaskCompleted(taskId, nextCompletedState)
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                ...updated,
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
      todo: 'in_progress',
      in_progress: 'done',
      inprogress: 'done',
      done: 'todo',
    }
    const nextStatus = cycle[task.status] || 'todo'
    try {
      const updated = await updateTaskStatus(task.id, nextStatus)
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                ...updated,
                status: nextStatus,
                completed: nextStatus === 'done',
              }
            : t
        )
      )
      const label =
        nextStatus === 'done'
          ? 'Terminé'
          : nextStatus === 'in_progress'
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

  async function handleDeleteTask(taskId) {
    try {
      await deleteTask(taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      showToast('Tâche supprimée')
    } catch (error) {
      showToast('Erreur lors de la suppression')
      console.error(error)
    }
  }

  async function handleShareTask(taskId, email) {
    try {
      await shareTask(taskId, email)
      showToast('Tâche partagée par email !')
    } catch (error) {
      showToast('Erreur lors du partage')
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
      setAuthMode('login')
      showToast('Vous avez été déconnecté avec succès.')
    } catch (error) {
      console.error(error)
      showToast('Erreur lors de la déconnexion')
    }
  }

  const activeTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks])

  const quadrant1Tasks = useMemo(
    () => tasks.filter((t) => t.quadrant === 1),
    [tasks]
  )
  const quadrant2Tasks = useMemo(
    () => tasks.filter((t) => t.quadrant === 2),
    [tasks]
  )
  const quadrant3Tasks = useMemo(
    () => tasks.filter((t) => t.quadrant === 3),
    [tasks]
  )
  const quadrant4Tasks = useMemo(
    () => tasks.filter((t) => t.quadrant === 4),
    [tasks]
  )

  const urgentCount = useMemo(
    () => activeTasks.filter((t) => t.quadrant === 1).length,
    [activeTasks]
  )

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
      />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface max-w-7xl mx-auto px-gutter">
        {activeTab === 'liste' ? (
          <ListAndFiltersPage
            tasks={tasks}
            onToggleStatus={handleToggleStatus}
            onCycleStatus={handleCycleTaskStatus}
            onDeleteTask={handleDeleteTask}
            onShowToast={showToast}
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
              onOpenNewTaskModal={() => setCurrentPage('create-task')}
            />

            <ProductivityBanner
              criticalCount={urgentCount}
              deadlineLimit="18h"
              tempoState="Rythme soutenu"
            />

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-outline">
                <span className="material-symbols-outlined animate-spin text-[28px]">
                  progress_activity
                </span>
                <span className="text-xs">Chargement de la matrice...</span>
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
                  onShare={handleShareTask}
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
                  />
                )}
              </section>
            )}

            <MatrixSummary
              totalActiveCount={activeTasks.length}
              criticalCount={urgentCount}
              mentalHealthText="Charge mentale équilibrée. Prochaine échéance : 17h00."
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
