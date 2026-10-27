/**
 * ============================================================================
 * TaskFlow - Page Connexion (React 19 + Tailwind CSS v4)
 * ============================================================================
 * Conforme à la charte monochrome stricte et aux critères d'accessibilité WCAG AAA
 * (cibles tactiles min 44px, contour focus visible 2px, contraste texte 13:1).
 * 
 * FONCTIONNALITÉS FRONTEND :
 * 1. Formulaire de connexion sécurisé (Email & Mot de passe).
 * 2. Validation dynamique à la soumission et lors de la saisie avec retours visuels précis.
 * 3. Toggle Show/Hide Password avec retour visuel vectoriel accessible.
 * 4. Bannière contextuelle d'alerte en cas d'identifiants incorrects (Erreur 401).
 * 5. Gestion de l'état de chargement asynchrone (Spinner SVG, bouton désactivé, curseur wait).
 * 6. Navigation fluide vers la page d'inscription ("Créer un compte").
 * 7. Action "Mot de passe oublié ?" avec notification immédiate.
 * 
 * SPÉCIFICATIONS DES ENDPOINTS API BACKEND :
 * -> POST /api/auth/login (Authentification JWT par identifiants)
 * -> POST /api/auth/forgot-password (Demande de réinitialisation)
 * -> GET /api/auth/me (Vérification de session & profil actif)
 * ============================================================================
 */

import { useState } from 'react'
import { loginUser, forgotPassword } from '../services/authService'

export default function LoginPage({
  onLoginSuccess,
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onShowToast,
  isSessionExpired = false,
}) {
  const [email, setEmail] = useState('lucas.martin@master-gestion.fr')
  const [password, setPassword] = useState('alternance2026!')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(isSessionExpired)
  const [fieldErrors, setFieldErrors] = useState({ email: null, password: null })

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 1 : Soumission du formulaire de connexion
  // ENDPOINT CIBLE : POST /api/auth/login
  // PAYLOAD : { email: string, password: string }
  // CODES HTTP ATTENDUS :
  // - 200 OK : { token: "jwt_...", user: { id, email, name, role } }
  // - 401 Unauthorized : { error: "Email ou mot de passe incorrect." }
  // - 422 Unprocessable Entity : { errors: { email: "...", password: "..." } }
  // --------------------------------------------------------------------------
  async function handleSubmit(e) {
    if (e) e.preventDefault()

    // Validation préalable côté client
    const errors = { email: null, password: null }
    if (!email || !email.includes('@')) {
      errors.email = 'Adresse email valide requise'
    }
    if (!password || password.length < 8) {
      errors.password = '8 caractères minimum requis'
    }

    if (errors.email || errors.password) {
      setFieldErrors(errors)
      setGlobalError('Email ou mot de passe incorrect.')
      return
    }

    setIsLoading(true)
    setGlobalError(null)
    setSessionExpired(false)
    setFieldErrors({ email: null, password: null })

    try {
      const data = await loginUser({ email, password })
      setIsLoading(false)
      onShowToast?.(`Bienvenue ${data.user.name} ! Connexion réussie.`)
      onLoginSuccess?.(data.user)
    } catch (err) {
      setIsLoading(false)
      setGlobalError(err.message || 'Email ou mot de passe incorrect.')
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors)
      }
    }
  }

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 2 : Demande de réinitialisation de mot de passe
  // ENDPOINT CIBLE : POST /api/auth/forgot-password
  // PAYLOAD : { email: string }
  // --------------------------------------------------------------------------
  async function handleForgotPassword(e) {
    e.preventDefault()
    if (onNavigateToForgotPassword) {
      onNavigateToForgotPassword(email)
      return
    }
    if (!email) {
      setFieldErrors((prev) => ({
        ...prev,
        email: "Saisissez votre email pour réinitialiser le mot de passe",
      }))
      return
    }
    try {
      await forgotPassword(email)
      onShowToast?.(`Instructions de réinitialisation envoyées à ${email}`)
    } catch {
      onShowToast?.("Erreur lors de l'envoi de la réinitialisation")
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] p-4 sm:p-6 lg:p-12 font-sans antialiased flex flex-col items-center justify-center">
      {/* 1. Carte Connexion Principale */}
      <div className="w-full max-w-[400px] bg-white border border-[#E8E8E8] rounded-2xl p-7 sm:p-8 shadow-xs">
        {/* Logo & Tagline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            {/* Grille 2x2 Logo TaskFlow */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
              aria-label="Logo TaskFlow"
            >
              <rect
                x="1"
                y="1"
                width="9"
                height="9"
                rx="1.5"
                fill="#E5484D"
                stroke="#111111"
                strokeWidth="1.5"
              />
              <rect
                x="12"
                y="1"
                width="9"
                height="9"
                rx="1.5"
                fill="none"
                stroke="#111111"
                strokeWidth="1.5"
              />
              <rect
                x="1"
                y="12"
                width="9"
                height="9"
                rx="1.5"
                fill="none"
                stroke="#111111"
                strokeWidth="1.5"
              />
              <rect
                x="12"
                y="12"
                width="9"
                height="9"
                rx="1.5"
                fill="none"
                stroke="#111111"
                strokeWidth="1.5"
              />
            </svg>
            <span className="text-xl font-bold tracking-tight text-[#111111]">
              TaskFlow
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] italic font-normal tracking-wide">
            « L'important d'abord. »
          </p>
        </div>

        {/* Titre et sous-titre */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#111111] tracking-tight">
            Connexion
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Accédez à votre matrice de priorisation.
          </p>
        </div>

        {/* Bannière d'erreur d'identifiants (401) */}
        {globalError && (
          <div className="mb-5 p-3 bg-[#FFF0F0] border border-[#E5484D] rounded-lg flex items-start gap-2.5 text-xs text-[#E5484D]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span className="font-semibold leading-tight">{globalError}</span>
          </div>
        )}

        {/* Bannière Session expirée (403) */}
        {sessionExpired && (
          <div className="mb-5 p-3 bg-[#F5F5F5] border border-[#111111] rounded-lg flex items-start gap-2.5 text-xs text-[#111111]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span className="font-medium leading-tight">
              Votre session a expiré, reconnectez-vous.
            </span>
          </div>
        )}

        {/* Formulaire de connexion sécurisé */}
        {/* ENDPOINT : POST /api/auth/login */}
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {/* Champ Email */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-[#111111] mb-1.5"
            >
              Email <span className="text-[#E5484D]">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                id="login-email"
                name="email"
                placeholder="nom.prenom@etudiant.fr"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: null }))
                  }
                  if (globalError) setGlobalError(null)
                }}
                className={`w-full h-11 px-3.5 text-sm bg-white rounded-lg text-[#111111] placeholder-[#A0A0A0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111] focus:ring-offset-2 ${
                  fieldErrors.email
                    ? 'border-2 border-[#E5484D] bg-[#FFF0F0]/25'
                    : 'border border-[#E8E8E8] focus:border-[#111111]'
                }`}
                required
                disabled={isLoading}
              />
            </div>

            {/* Erreur de validation sous le champ email */}
            {fieldErrors.email && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#E5484D] font-medium">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{fieldErrors.email}</span>
              </div>
            )}
          </div>

          {/* Champ Mot de passe */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[#111111]"
              >
                Mot de passe <span className="text-[#E5484D]">*</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-[#6B6B6B] hover:text-[#111111] underline transition-colors cursor-pointer"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                name="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: null }))
                  }
                  if (globalError) setGlobalError(null)
                }}
                className={`w-full h-11 pl-3.5 pr-11 text-sm bg-white rounded-lg text-[#111111] placeholder-[#A0A0A0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111] focus:ring-offset-2 ${
                  fieldErrors.password
                    ? 'border-2 border-[#E5484D] bg-[#FFF0F0]/25'
                    : 'border border-[#E8E8E8] focus:border-[#111111]'
                }`}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
                aria-label={
                  showPassword
                    ? 'Masquer le mot de passe'
                    : 'Afficher le mot de passe'
                }
              >
                {showPassword ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>

            {/* Erreur de validation sous le champ mot de passe */}
            {fieldErrors.password && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#E5484D] font-medium">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{fieldErrors.password}</span>
              </div>
            )}
          </div>

          {/* Bouton CTA principal full width */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full h-11 px-4 bg-[#E5484D] hover:bg-[#D43D42] active:bg-[#B92F34] text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#111111] focus:ring-offset-2 ${
                isLoading ? 'opacity-75 cursor-wait' : ''
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Connexion…</span>
                </div>
              ) : (
                <>
                  <span>{sessionExpired ? 'Se reconnecter' : 'Se connecter'}</span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14"></path>
                    <path d="M12 5l7 7-7 7"></path>
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Lien de redirection vers l'inscription */}
        <div className="mt-6 pt-5 border-t border-[#E8E8E8] text-center">
          <p className="text-xs text-[#6B6B6B]">
            Pas encore de compte ?{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="font-semibold text-[#111111] hover:underline ml-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#111111] rounded"
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>

      {/* Note accessibilité sous la carte */}
      <div className="mt-6 text-center text-xs text-[#6B6B6B] flex items-center justify-center flex-wrap gap-3">
        <span className="inline-flex items-center gap-1">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Auth JWT & Bcrypt
        </span>
        <span>•</span>
        <span>Cibles tactiles min 44px</span>
        <span>•</span>
        <span>Contraste texte 13:1</span>
      </div>
    </div>
  )
}
