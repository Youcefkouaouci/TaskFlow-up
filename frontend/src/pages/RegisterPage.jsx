/**
 * ============================================================================
 * TaskFlow - Page Inscription (React 19 + Tailwind CSS v4)
 * ============================================================================
 * Création de compte alternant / étudiant conforme à la charte monochrome
 * TaskFlow et aux exigences WCAG AAA (cibles min 44px, focus outline 2px, contraste 13:1).
 * 
 * FONCTIONNALITÉS FRONTEND :
 * 1. Formulaire d'inscription structuré (Nom complet, Email, Profil alternance, Mot de passe, Confirmation).
 * 2. Sélection interactive du profil d'alternance (Alternant, Étudiant, Professionnel).
 * 3. Validation dynamique des champs à la saisie et à la soumission :
 *    - Nom minimum 2 caractères.
 *    - Email valide avec détection des doublons (Erreur 409).
 *    - Mot de passe 8 caractères minimum.
 *    - Concordance stricte entre mot de passe et confirmation.
 *    - Acceptation obligatoire des conditions d'utilisation.
 * 4. Toggle Show/Hide Password indépendant pour le mot de passe et sa confirmation.
 * 5. Bannières d'alerte contextuelles en cas de conflit d'email ou de rejet API.
 * 6. Gestion fluide du chargement avec indicateur vectoriel (Spinner SVG).
 * 7. Lien direct vers la page de connexion ("Déjà un compte ? Se connecter").
 * 
 * SPÉCIFICATIONS DES ENDPOINTS API BACKEND :
 * -> POST /api/auth/register (Création de compte et génération du token JWT)
 * -> GET /api/auth/check-email?email=... (Vérification préalable de disponibilité)
 * ============================================================================
 */

import { useState } from 'react'
import { registerUser } from '../services/authService'

const PROFILE_OPTIONS = [
  { id: 'alternant', label: 'Alternant (Entreprise & École)' },
  { id: 'etudiant', label: 'Étudiant' },
  { id: 'pro', label: 'Professionnel' },
]

export default function RegisterPage({
  onRegisterSuccess,
  onNavigateToLogin,
  onShowToast,
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState('alternant')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  // --------------------------------------------------------------------------
  // FONCTIONNALITÉ 1 : Soumission et validation de l'inscription
  // ENDPOINT CIBLE : POST /api/auth/register
  // PAYLOAD : { name, email, role, password }
  // CODES HTTP ATTENDUS :
  // - 201 Created : { token: "jwt_...", user: { id, email, name, role } }
  // - 409 Conflict : { error: "Cette adresse email est déjà associée à un compte." }
  // - 422 Unprocessable Entity : { errors: { email: "...", password: "..." } }
  // --------------------------------------------------------------------------
  async function handleSubmit(e) {
    if (e) e.preventDefault()

    const errors = {}

    if (!name || name.trim().length < 2) {
      errors.name = 'Veuillez renseigner votre nom complet (min 2 caractères)'
    }

    if (!email || !email.includes('@')) {
      errors.email = 'Veuillez saisir une adresse email valide'
    }

    if (!password || password.length < 8) {
      errors.password = '8 caractères minimum requis'
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Les deux mots de passe ne correspondent pas'
    }

    if (!acceptTerms) {
      errors.terms = 'Vous devez accepter les conditions pour créer un compte'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setGlobalError('Veuillez corriger les informations signalées ci-dessous.')
      return
    }

    setIsLoading(true)
    setGlobalError(null)
    setFieldErrors({})

    try {
      const selectedRole =
        PROFILE_OPTIONS.find((p) => p.id === profile)?.label || 'Alternant'

      const data = await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: selectedRole,
        password,
      })

      setIsLoading(false)
      onShowToast?.(`Compte créé avec succès ! Bienvenue ${data.user.name}.`)
      onRegisterSuccess?.(data.user)
    } catch (err) {
      setIsLoading(false)
      setGlobalError(err.message || "Erreur lors de la création du compte.")
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] p-4 sm:p-6 lg:p-12 font-sans antialiased flex flex-col items-center justify-center">
      {/* 1. Carte Inscription Principale */}
      <div className="w-full max-w-[440px] bg-white border border-[#E8E8E8] rounded-2xl p-7 sm:p-8 shadow-xs">
        {/* Logo & Tagline */}
        <div className="text-center mb-7">
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
            Créer un compte
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Rejoignez TaskFlow et optimisez vos priorités d'alternance.
          </p>
        </div>

        {/* Bannière d'erreur globale */}
        {globalError && (
          <div className="mb-5 p-3 bg-[#FFF0F0] border border-[#E5484D] rounded-lg flex items-start gap-2.5 text-xs text-[#E5484D] animate-fadeIn">
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

        {/* Formulaire d'inscription */}
        {/* ENDPOINT : POST /api/auth/register */}
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {/* Champ Nom complet */}
          <div>
            <label
              htmlFor="reg-name"
              className="block text-xs font-semibold text-[#111111] mb-1.5"
            >
              Nom complet <span className="text-[#E5484D]">*</span>
            </label>
            <input
              type="text"
              id="reg-name"
              name="name"
              placeholder="ex: Lucas Martin"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: null }))
                }
                if (globalError) setGlobalError(null)
              }}
              className={`w-full h-11 px-3.5 text-sm bg-white rounded-lg text-[#111111] placeholder-[#A0A0A0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111] focus:ring-offset-2 ${
                fieldErrors.name
                  ? 'border-2 border-[#E5484D] bg-[#FFF0F0]/25'
                  : 'border border-[#E8E8E8] focus:border-[#111111]'
              }`}
              required
              disabled={isLoading}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-[#E5484D] font-medium flex items-center gap-1">
                <span>{fieldErrors.name}</span>
              </p>
            )}
          </div>

          {/* Champ Email */}
          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-semibold text-[#111111] mb-1.5"
            >
              Email académique ou pro <span className="text-[#E5484D]">*</span>
            </label>
            <input
              type="email"
              id="reg-email"
              name="email"
              placeholder="lucas.martin@master-gestion.fr"
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
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-[#E5484D] font-medium flex items-center gap-1">
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          {/* Sélecteur de profil / statut */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Votre situation
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {PROFILE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setProfile(opt.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-left flex items-center justify-between border transition-all cursor-pointer ${
                    profile === opt.id
                      ? 'border-[#111111] bg-[#111111] text-white shadow-xs'
                      : 'border-[#E8E8E8] bg-white text-[#6B6B6B] hover:text-[#111111]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {profile === opt.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D]"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Champ Mot de passe */}
          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-semibold text-[#111111] mb-1.5"
            >
              Mot de passe <span className="text-[#E5484D]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="reg-password"
                name="password"
                placeholder="Au moins 8 caractères"
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
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-[#E5484D] font-medium flex items-center gap-1">
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          {/* Champ Confirmation du mot de passe */}
          <div>
            <label
              htmlFor="reg-confirm-password"
              className="block text-xs font-semibold text-[#111111] mb-1.5"
            >
              Confirmer le mot de passe <span className="text-[#E5484D]">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="reg-confirm-password"
                name="confirmPassword"
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: null }))
                  }
                  if (globalError) setGlobalError(null)
                }}
                className={`w-full h-11 pl-3.5 pr-11 text-sm bg-white rounded-lg text-[#111111] placeholder-[#A0A0A0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111] focus:ring-offset-2 ${
                  fieldErrors.confirmPassword
                    ? 'border-2 border-[#E5484D] bg-[#FFF0F0]/25'
                    : 'border border-[#E8E8E8] focus:border-[#111111]'
                }`}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
                aria-label={
                  showConfirmPassword
                    ? 'Masquer la confirmation'
                    : 'Afficher la confirmation'
                }
              >
                {showConfirmPassword ? (
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
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-[#E5484D] font-medium flex items-center gap-1">
                <span>{fieldErrors.confirmPassword}</span>
              </p>
            )}
          </div>

          {/* Case à cocher des conditions */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked)
                  if (fieldErrors.terms) {
                    setFieldErrors((prev) => ({ ...prev, terms: null }))
                  }
                }}
                className="mt-0.5 w-4 h-4 rounded text-[#E5484D] focus:ring-[#111111] border-[#E8E8E8] cursor-pointer"
              />
              <span className="text-xs text-[#6B6B6B] leading-tight">
                J'accepte les{' '}
                <span className="text-[#111111] underline font-medium">
                  conditions d'utilisation
                </span>{' '}
                et la politique de confidentialité.
              </span>
            </label>
            {fieldErrors.terms && (
              <p className="mt-1 text-xs text-[#E5484D] font-medium">
                {fieldErrors.terms}
              </p>
            )}
          </div>

          {/* Bouton CTA Inscription */}
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
                  <span>Création du compte…</span>
                </div>
              ) : (
                <>
                  <span>Créer mon compte</span>
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

        {/* Lien vers Connexion */}
        <div className="mt-6 pt-5 border-t border-[#E8E8E8] text-center">
          <p className="text-xs text-[#6B6B6B]">
            Déjà un compte ?{' '}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="font-semibold text-[#111111] hover:underline ml-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#111111] rounded"
            >
              Se connecter
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
