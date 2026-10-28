import { useState } from 'react'
import { forgotPassword } from '../services/authService'

export default function ForgotPasswordPage({
  initialEmail = '',
  onNavigateToLogin,
  onShowToast,
}) {
  const [email, setEmail] = useState(initialEmail || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    if (e) e.preventDefault()

    if (!email || !email.includes('@')) {
      setError('Veuillez saisir une adresse email valide.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await forgotPassword(email.trim())
      setIsLoading(false)
      setIsSubmitted(true)
      onShowToast?.(`Lien de réinitialisation envoyé à ${email}`)
      startCooldown()
    } catch (err) {
      setIsLoading(false)
      setError(err.message || "Erreur lors de l'envoi des instructions.")
    }
  }

  function startCooldown() {
    setResendCooldown(30)
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
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

        {!isSubmitted ? (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-[#111111] tracking-tight">
                Mot de passe oublié
              </h1>
              <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                Saisissez l'adresse email associée à votre compte pour recevoir un lien de réinitialisation sécurisé.
              </p>
            </div>

            {error && (
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
                <span className="font-semibold leading-tight">{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-[#111111] mb-1.5"
                >
                  Email de votre compte <span className="text-[#E5484D]">*</span>
                </label>
                <input
                  type="email"
                  id="forgot-email"
                  name="email"
                  placeholder="nom.prenom@etudiant.fr"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                  }}
                  className={`w-full h-11 px-3.5 text-sm bg-white rounded-lg text-[#111111] placeholder-[#A0A0A0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111] focus:ring-offset-2 ${
                    error
                      ? 'border-2 border-[#E5484D] bg-[#FFF0F0]/25'
                      : 'border border-[#E8E8E8] focus:border-[#111111]'
                  }`}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>

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
                      <span>Envoi des instructions…</span>
                    </div>
                  ) : (
                    <>
                      <span>Envoyer le lien</span>
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
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-2 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-[#FFF0F0] text-[#E5484D] flex items-center justify-center mb-4 border border-[#E5484D]/30">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>

            <h2 className="text-lg font-bold text-[#111111] mb-2">
              Lien de réinitialisation envoyé !
            </h2>

            <p className="text-xs text-[#6B6B6B] leading-relaxed mb-6 max-w-sm">
              Si un compte est associé à <strong className="text-[#111111]">{email}</strong>, vous recevrez un e-mail avec un lien sécurisé valable 15 minutes.
            </p>

            <div className="w-full flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="w-full h-11 px-4 bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Retour à la connexion</span>
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0}
                onClick={handleSubmit}
                className={`text-xs font-semibold py-2 transition-colors ${
                  resendCooldown > 0
                    ? 'text-[#A0A0A0] cursor-not-allowed'
                    : 'text-[#E5484D] hover:underline cursor-pointer'
                }`}
              >
                {resendCooldown > 0
                  ? `Renvoyer l'e-mail dans ${resendCooldown}s`
                  : "Vous n'avez rien reçu ? Renvoyer le lien"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-[#E8E8E8] text-center">
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="text-xs font-semibold text-[#111111] hover:underline cursor-pointer inline-flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-[#111111] rounded"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Retour à la connexion</span>
          </button>
        </div>
      </div>

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
