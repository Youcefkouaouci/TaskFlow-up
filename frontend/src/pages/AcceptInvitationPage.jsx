/**
 * ============================================================================
 * TaskFlow - Page d'Acceptation d'Invitation (/invitations/accept?token=...)
 * ============================================================================
 * Gère le workflow complet lorsqu'un utilisateur clique sur le lien reçu par
 * e-mail :
 * 1. Vérification du jeton via GET /api/invitations/:token
 * 2. Si l'utilisateur est déjà connecté avec le bon email : acceptation en 1 clic
 * 3. Si l'utilisateur est connecté avec un autre compte : bascule rapide de compte
 * 4. Si l'utilisateur n'est pas connecté : Connexion ou Inscription intégrée
 *    (email pré-rempli) suivie de l'acceptation automatique de l'invitation
 * 5. Redirection fluide vers l'espace Groupes & Projets
 * ============================================================================
 */

import { useState, useEffect } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import {
  checkInvitationToken,
  acceptInvitationToken,
} from '../services/groupProjectService'
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
} from '../services/authService'

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const params = useParams()
  const navigate = useNavigate()

  const token = searchParams.get('token') || params.token || ''

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const [invitation, setInvitation] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isAccepting, setIsAccepting] = useState(false)
  const [acceptedGroup, setAcceptedGroup] = useState(null)

  // États du formulaire intégré Connexion / Inscription
  const [authTab, setAuthTab] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)

  useEffect(() => {
    let active = true
    async function verifyToken() {
      if (!token) {
        if (active) {
          setErrorMessage("Aucun jeton d'invitation fourni dans l'URL.")
          setIsLoading(false)
        }
        return
      }
      try {
        const data = await checkInvitationToken(token)
        if (!active) return
        setInvitation(data)
        setAuthTab(data.userExists ? 'login' : 'register')
      } catch (err) {
        if (!active) return
        setErrorMessage(
          err.message || "Cette invitation est introuvable, expirée ou déjà utilisée."
        )
      } finally {
        if (active) setIsLoading(false)
      }
    }
    verifyToken()
    return () => {
      active = false
    }
  }, [token])

  async function handleAcceptDirect() {
    if (!token || isAccepting) return
    setIsAccepting(true)
    setAuthError('')
    try {
      const res = await acceptInvitationToken(token)
      setAcceptedGroup(res.group)
    } catch (err) {
      setAuthError(
        err.message || "Impossible d'accepter cette invitation."
      )
    } finally {
      setIsAccepting(false)
    }
  }

  async function handleSwitchAccount() {
    await logoutUser()
    setCurrentUser(null)
    setAuthError('')
  }

  async function handleAuthAndAccept(e) {
    e.preventDefault()
    if (!invitation || isSubmittingAuth) return
    setIsSubmittingAuth(true)
    setAuthError('')

    try {
      let authResult
      if (authTab === 'register') {
        authResult = await registerUser({
          name: name.trim() || invitation.email.split('@')[0],
          email: invitation.email,
          password,
        })
      } else {
        authResult = await loginUser({
          email: invitation.email,
          password,
        })
      }

      setCurrentUser(authResult.user)

      // Accepter immédiatement l'invitation avec le nouveau JWT
      const acceptRes = await acceptInvitationToken(token)
      setAcceptedGroup(acceptRes.group)
    } catch (err) {
      setAuthError(
        err.message || "Échec de l'authentification ou de l'acceptation."
      )
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  const isSameEmail =
    currentUser &&
    invitation &&
    currentUser.email?.toLowerCase() === invitation.email?.toLowerCase()

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between font-sans text-on-surface antialiased px-gutter py-8">
      {/* En-tête minimaliste TaskFlow */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#111111] flex items-center justify-center p-1.5">
            <div className="grid grid-cols-2 gap-0.5 w-full h-full">
              <span className="bg-white rounded-[1px]"></span>
              <span className="bg-white/70 rounded-[1px]"></span>
              <span className="bg-white/40 rounded-[1px]"></span>
              <span className="bg-[#E5484D] rounded-[1px]"></span>
            </div>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold tracking-tight text-on-surface">
              TaskFlow
            </span>
            <span className="text-[11px] text-outline">
              L'important d'abord.
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-xs font-semibold text-outline hover:text-on-surface transition-colors cursor-pointer"
        >
          Retour à l'accueil →
        </button>
      </header>

      {/* Conteneur central */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        {isLoading ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-xs border border-outline-variant/15 flex flex-col items-center text-center gap-3">
            <span className="material-symbols-outlined animate-spin text-[32px] text-secondary">
              progress_activity
            </span>
            <h1 className="text-base font-bold text-on-surface">
              Vérification de votre invitation...
            </h1>
            <p className="text-xs text-outline">
              Validation du jeton cryptographique auprès du serveur TaskFlow.
            </p>
          </div>
        ) : errorMessage ? (
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-xs border border-outline-variant/15 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">
                link_off
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-bold text-on-surface">
                Invitation invalide ou expirée
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant">
                {errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/?tab=partages')}
              className="w-full h-11 bg-primary text-on-primary rounded-xl text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Accéder à mes groupes TaskFlow
            </button>
          </div>
        ) : acceptedGroup ? (
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-xs border border-emerald-200 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">
                check_circle
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Invitation acceptée
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-on-surface">
                Bienvenue dans « {acceptedGroup.name} » !
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant">
                Vous faites désormais partie de cet espace de travail avec le
                rôle <strong>{invitation?.role}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/?tab=partages')}
              className="w-full h-11 bg-primary text-on-primary rounded-xl text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                workspaces
              </span>
              <span>Ouvrir le groupe maintenant</span>
            </button>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-xs border border-outline-variant/15 flex flex-col gap-5">
            {/* Détails de l'invitation */}
            <div className="flex flex-col gap-2 text-center">
              <div className="mx-auto w-11 h-11 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">
                  mark_email_unread
                </span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                Invitation Collaborative
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-on-surface">
                Rejoindre « {invitation.groupName || 'Espace TaskFlow'} »
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant">
                <strong>{invitation.inviterName || 'Un administrateur'}</strong>{' '}
                vous invite à collaborer sur TaskFlow.
              </p>
            </div>

            {/* Récapitulatif structuré */}
            <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-2 text-xs border border-outline-variant/10">
              <div className="flex items-center justify-between">
                <span className="text-outline">Destinataire invité :</span>
                <span className="font-mono font-semibold text-on-surface">
                  {invitation.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-outline">Rôle attribué :</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-bold text-on-surface uppercase text-[10px]">
                  {invitation.role}
                </span>
              </div>
              {invitation.expiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-outline">Valide jusqu'au :</span>
                  <span className="text-on-surface font-medium">
                    {new Date(invitation.expiresAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-secondary-fixed text-on-secondary-fixed text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">
                  error
                </span>
                <span>{authError}</span>
              </div>
            )}

            {/* CAS 1 : Connecté avec le bon e-mail */}
            {isSameEmail ? (
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                    verified_user
                  </span>
                  <span>
                    Connecté en tant que <strong>{currentUser.email}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAcceptDirect}
                  disabled={isAccepting}
                  className="w-full h-12 bg-secondary hover:bg-[#a01f29] text-on-secondary rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    group_add
                  </span>
                  <span>
                    {isAccepting
                      ? 'Adhésion en cours...'
                      : `Accepter & Rejoindre « ${invitation.groupName} »`}
                  </span>
                </button>
              </div>
            ) : currentUser ? (
              /* CAS 2 : Connecté avec un AUTRE compte */
              <div className="flex flex-col gap-3">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">
                      swap_horiz
                    </span>
                    <span>Compte actif différent</span>
                  </div>
                  <p className="leading-relaxed">
                    Vous êtes actuellement connecté avec{' '}
                    <strong>{currentUser.email}</strong>, mais cette invitation
                    est destinée à <strong>{invitation.email}</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="w-full h-11 bg-primary text-on-primary rounded-xl font-semibold text-xs sm:text-sm hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Passer sur le compte {invitation.email}
                </button>
              </div>
            ) : (
              /* CAS 3 : Non connecté -> Formulaire intégré Connexion / Inscription */
              <div className="flex flex-col gap-4">
                <div className="bg-surface-container-high p-1 rounded-xl grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('login')
                      setAuthError('')
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      authTab === 'login'
                        ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    J'ai déjà un compte
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('register')
                      setAuthError('')
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      authTab === 'register'
                        ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    Créer mon compte
                  </button>
                </div>

                <form
                  onSubmit={handleAuthAndAccept}
                  className="flex flex-col gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface-variant">
                      Email invité
                    </label>
                    <input
                      type="email"
                      value={invitation.email}
                      disabled
                      className="w-full bg-surface-container text-outline text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-outline-variant/20 font-mono cursor-not-allowed"
                    />
                  </div>

                  {authTab === 'register' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-on-surface-variant">
                        Votre prénom ou nom
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Sarah Durand"
                        className="w-full bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-transparent focus:border-secondary outline-none"
                        required
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface-variant">
                      {authTab === 'register'
                        ? 'Choisissez un mot de passe (min. 8 caractères)'
                        : 'Votre mot de passe'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={authTab === 'register' ? 8 : 1}
                      className="w-full bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-transparent focus:border-secondary outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAuth || !password}
                    className="mt-1 w-full h-12 bg-secondary hover:bg-[#a01f29] text-on-secondary rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      login
                    </span>
                    <span>
                      {isSubmittingAuth
                        ? 'Validation en cours...'
                        : authTab === 'register'
                        ? 'Créer mon compte & Rejoindre le groupe'
                        : 'Se connecter & Rejoindre le groupe'}
                    </span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Pied de page */}
      <footer className="text-center text-[11px] text-outline">
        TaskFlow · Plateforme collaborative & Matrice d'Eisenhower
      </footer>
    </div>
  )
}
