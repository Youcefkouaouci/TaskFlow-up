/**
 * ============================================================================
 * TaskFlow - Page de Réinitialisation de Mot de Passe (/reset-password)
 * ============================================================================
 * Accessible via le lien envoyé par e-mail (SMTP Gmail) :
 *   http://localhost:5173/reset-password?token=<jeton>
 * Conforme aux bonnes pratiques HTML5 d'autofill (autocomplete="new-password").
 * ============================================================================
 */

import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '../services/authService'

export default function ResetPasswordPage() {
  const { token: paramToken } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialToken = paramToken || searchParams.get('token') || ''
  const [token, setToken] = useState(initialToken)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!token.trim()) {
      setError('Veuillez renseigner le jeton reçu par e-mail.')
      return
    }
    if (!password || password.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await resetPassword({ token, password })
      setIsSuccess(true)
    } catch (err) {
      setError(
        err.message ||
          'Ce lien de réinitialisation est invalide ou a expiré (validité 15 min).'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] p-4 sm:p-6 lg:p-12 font-sans antialiased flex flex-col items-center justify-center">
      <div className="w-full max-w-[420px] bg-white border border-[#E8E8E8] rounded-2xl p-7 sm:p-8 shadow-xs">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2.5 mb-2">
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

        {!isSuccess ? (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-[#111111] tracking-tight">
                Nouveau mot de passe
              </h1>
              <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                Choisissez un nouveau mot de passe sécurisé d'au moins 6
                caractères pour votre compte TaskFlow.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-[#FFF0F0] border border-[#E5484D] rounded-lg flex items-start gap-2.5 text-xs text-[#E5484D]">
                <span className="font-semibold leading-tight">{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {!initialToken && (
                <div>
                  <label
                    htmlFor="reset-token"
                    className="block text-xs font-semibold text-[#111111] mb-1.5"
                  >
                    Jeton ou lien reçu par e-mail{' '}
                    <span className="text-[#E5484D]">*</span>
                  </label>
                  <input
                    type="text"
                    id="reset-token"
                    name="reset-token"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="Collez le jeton ou le lien de réinitialisation..."
                    spellCheck="false"
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="w-full h-11 px-3.5 text-xs font-mono bg-white rounded-lg text-[#111111] border border-[#E8E8E8] focus:border-[#111111] focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-semibold text-[#111111]"
                  >
                    Nouveau mot de passe{' '}
                    <span className="text-[#E5484D]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-[11px] font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new-password"
                  name="new-password"
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="Minimum 6 caractères"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  className="w-full h-11 px-3.5 text-sm bg-white rounded-lg text-[#111111] border border-[#E8E8E8] focus:border-[#111111] focus:outline-none"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-semibold text-[#111111] mb-1.5"
                >
                  Confirmer le nouveau mot de passe{' '}
                  <span className="text-[#E5484D]">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirm-password"
                  name="confirm-password"
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="Répétez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  enterKeyHint="done"
                  className="w-full h-11 px-3.5 text-sm bg-white rounded-lg text-[#111111] border border-[#E8E8E8] focus:border-[#111111] focus:outline-none"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 px-4 bg-[#E5484D] hover:bg-[#D43D42] text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isLoading
                    ? 'Enregistrement en cours…'
                    : 'Enregistrer mon nouveau mot de passe'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-200">
              <span className="material-symbols-outlined text-[24px]">
                check_circle
              </span>
            </div>

            <h2 className="text-lg font-bold text-[#111111] mb-2">
              Mot de passe réinitialisé !
            </h2>
            <p className="text-xs text-[#6B6B6B] leading-relaxed mb-6">
              Votre nouveau mot de passe a été enregistré et votre session a été
              ouverte automatiquement.
            </p>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full h-11 px-4 bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Accéder à mon espace TaskFlow</span>
            </button>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-[#E8E8E8] text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs font-semibold text-[#111111] hover:underline cursor-pointer"
          >
            ← Retour à l'accueil TaskFlow
          </button>
        </div>
      </div>
    </div>
  )
}
