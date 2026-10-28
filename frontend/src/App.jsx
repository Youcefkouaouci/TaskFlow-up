/**
 * ============================================================================
 * TaskFlow - Application Principale (React 19 + Tailwind CSS v4)
 * ============================================================================
 * Reproduction fidèle de la maquette Stitch et du prototype code.html.
 * 
 * ARCHITECTURE ORIENTÉE API :
 * - Tous les appels de données passent par le service '../services/taskService'
 * - Chaque fonction gérant une interaction utilisateur indique précisément :
 *   - L'endpoint REST backend cible
 *   - La méthode HTTP (GET, POST, PATCH, DELETE)
 *   - Le corps de requête (Body JSON) ou paramètres attendus
 * - Un fallback local transparent est actif tant que le backend n'est pas branché
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
  deleteTask,
  delegateTask,
} from './services/taskService'
import {
  getCurrentUser,
  logoutUser,
} from './services/authService'

export default function App() {
  // --------------------------------------------------------------------------
  // ÉTATS GLOBAUX DU FRONTEND
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 1 : Chargement initial des tâches
  // ENDPOINT CIBLE : GET /api/tasks
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function loadTasks() {
      try {
        setIsLoading(true)
        const data = await fetchTasks()
        setTasks(data)
      } catch (error) {
        showToast('Erreur lors du chargement des tâches')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    loadTasks()
  }, [])

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 2 : Notification Toast éphémère
  // --------------------------------------------------------------------------
  function showToast(message) {
    setToast({ message, visible: true })
    clearTimeout(window.__toastTimeout)
    window.__toastTimeout = setTimeout(() => {
      setToast({ message: '', visible: false })
    }, 2500)
  }

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 3 : Changement de contexte (Semaine Entreprise / École)
  // ENDPOINT CIBLE : POST /api/users/current-context
  // PAYLOAD : { activeContext: 'Entreprise' | 'École' }
  // --------------------------------------------------------------------------
  function handleSelectContext(context) {
    setActiveContext(context)
    showToast(
      context === 'Entreprise'
        ? 'Filtre actif : Semaine Entreprise'
        : 'Filtre actif : Cursus École'
    )
  }

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 4 : Basculer le statut complété d'une tâche
  // ENDPOINT CIBLE : PATCH /api/tasks/:id/status
  // PAYLOAD : { completed: boolean }
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 5 : Créer une nouvelle tâche dans la matrice
  // ENDPOINT CIBLE : POST /api/tasks
  // PAYLOAD : { title, quadrant, context, tag, status, deadline, deadlineType }
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 6 : Supprimer / Éliminer définitivement une tâche
  // ENDPOINT CIBLE : DELETE /api/tasks/:id
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 7 : Déléguer une tâche par e-mail ou système
  // ENDPOINT CIBLE : POST /api/tasks/:id/delegate
  // PAYLOAD : { taskId, delegateTo, title }
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 8 : Mode "Focus Faire seul"
  // Isole visuellement le premier quadrant (Urgent & Important)
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 9 : Déconnexion de session utilisateur
  // ENDPOINT CIBLE : Clôture du token JWT local & réinitialisation d'état
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // CALCULS MÉTIER & FILTRAGE DES QUADRANTS
  // --------------------------------------------------------------------------
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

  // Si l'utilisateur est sur la page dédiée "Connexion / Authentification"
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

  // Si l'utilisateur est sur la page dédiée "Création De Tâche"
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
      {/* 1. Barre de navigation haute (Header) avec titre adaptatif */}
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

      {/* 2. Conteneur principal (avec dégagement Header et BottomNav) */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-24 bg-surface max-w-7xl mx-auto px-gutter">
        {activeTab === 'liste' ? (
          /* VUE LISTE & FILTRES */
          <ListAndFiltersPage onShowToast={showToast} />
        ) : activeTab === 'partages' ? (
          /* VUE PARTAGES PAR EMAIL */
          <SharesPage onShowToast={showToast} />
        ) : activeTab === 'compte' ? (
          /* VUE COMPTE UTILISATEUR / CONNEXION & INSCRIPTION */
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
          /* VUE MATRICE D'EISENHOWER */
          <>
            {/* Contrôleur de contexte & Action vers Création de Tâche */}
            <ContextSwitch
              activeContext={activeContext}
              onSelectContext={handleSelectContext}
              onOpenNewTaskModal={() => setCurrentPage('create-task')}
            />

            {/* Bannière de productivité et actions critiques */}
            <ProductivityBanner
              criticalCount={urgentCount}
              deadlineLimit="18h"
              tempoState="Rythme soutenu"
            />

            {/* 3. Matrice d'Eisenhower interactive (Grille 2x2 responsive) */}
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-outline">
                <span className="material-symbols-outlined animate-spin text-[28px]">
                  progress_activity
                </span>
                <span className="text-xs">Chargement de la matrice...</span>
              </div>
            ) : (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-space-md w-full">
                {/* QUADRANT 1 : FAIRE (Urgent & Important) */}
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
                />

                {/* QUADRANT 2 : PLANIFIER (Important & Non urgent) */}
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

                {/* QUADRANT 3 : DÉLÉGUER (Urgent & Non important) */}
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

                {/* QUADRANT 4 : ÉLIMINER (Ni urgent ni important) */}
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

            {/* 4. Barre de synthèse de la matrice & Mode Focus */}
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

      {/* 5. Modale d'ajout d'une nouvelle tâche */}
      <NewTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateTask={handleCreateTask}
      />

      {/* 6. Toast de notification pour les retours utilisateur */}
      <Toast toast={toast} />

      {/* 7. Barre de navigation inférieure fixe */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          setActiveTab(tabId)
        }}
      />
    </div>
  )
}
