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
  deleteTask,
  delegateTask,
  moveTaskToQuadrant,
} from './services/taskService'
import {
  getCurrentUser,
  logoutUser,
} from './services/authService'

export default function App() {
  const [currentPage, setCurrentPage] = useState('matrix') 
  const [authMode, setAuthMode] = useState('login') 
  const [authEmail, setAuthEmail] = useState('')
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [activeContext, setActiveContext] = useState('Entreprise') 
  const [isFocusFaireOnly, setIsFocusFaireOnly] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('matrice')
  const [toast, setToast] = useState({ message: '', visible: false })

  useEffect(() => {
    async function loadTasks() {
      try {
        setIsLoading(true)
        setLoadError(null)
        const data = await fetchTasks()
        setTasks(data)
      } catch (error) {
        setLoadError('Impossible de charger les tâches. Vérifiez votre connexion.')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    loadTasks()
  }, [])

  function showToast(message) {
    setToast({ message, visible: true })
    clearTimeout(window.__toastTimeout)
    window.__toastTimeout = setTimeout(() => {
      setToast({ message: '', visible: false })
    }, 2500)
  }

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
      await toggleTaskCompleted(taskId, nextCompletedState)
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: nextCompletedState } : t))
      )
      showToast(nextCompletedState ? 'Tâche terminée ! Bravo 🎉' : 'Tâche réactivée')
    } catch (error) {
      showToast('Impossible de mettre à jour le statut')
      console.error(error)
    }
  }

  async function handleCreateTask(newTaskData) {
    try {
      const created = await createTask(newTaskData)
      setTasks((prev) => [created, ...prev])
      showToast('Nouvelle tâche ajoutée à la matrice !')
    } catch (error) {
      showToast('Erreur lors de la création de la tâche')
      console.error(error)
    }
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
      await moveTaskToQuadrant(taskId, newQuadrant)
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, quadrant: newQuadrant } : t))
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
            ? 'Partages'
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
          <ListAndFiltersPage onShowToast={showToast} />
        ) : activeTab === 'partages' ? (
          <SharesPage onShowToast={showToast} />
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
