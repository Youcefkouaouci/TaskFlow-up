import { useState } from 'react'
import { updateUserProfile } from '../services/authService'
import { getBackendOrigin } from '../services/groupProjectService'

export default function ProfilePage({
  user,
  onUserUpdated,
  onLogout,
  onGoToMatrix,
  onGoToShares,
  onShowToast,
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // État d'édition du nom
  const [nameInput, setNameInput] = useState(
    () => user?.name || user?.email?.split('@')[0] || 'Alternant'
  )
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameError, setNameError] = useState('')

  // État de changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const displayName = user?.name || user?.email?.split('@')[0] || 'Alternant'
  const displayEmail = user?.email || 'utilisateur@taskflow.fr'
  const displayRole = user?.role || 'Alternant (Entreprise & École)'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleSaveName(e) {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (trimmed.length < 2) {
      setNameError('Le nom doit contenir au moins 2 caractères.')
      return
    }
    setIsSavingName(true)
    setNameError('')
    try {
      const { user: updatedUser } = await updateUserProfile({ name: trimmed })
      onUserUpdated?.(updatedUser)
      onShowToast?.('Nom du profil mis à jour avec succès !')
    } catch (err) {
      setNameError(err.message || 'Impossible de mettre à jour le nom.')
    } finally {
      setIsSavingName(false)
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    setPasswordError('')
    if (!currentPassword) {
      setPasswordError('Veuillez saisir votre mot de passe actuel.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError(
        'Le nouveau mot de passe doit contenir au moins 6 caractères.'
      )
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les deux nouveaux mots de passe ne correspondent pas.')
      return
    }

    setIsSavingPassword(true)
    try {
      const { user: updatedUser } = await updateUserProfile({
        currentPassword,
        newPassword,
      })
      onUserUpdated?.(updatedUser)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onShowToast?.('Mot de passe modifié avec succès !')
    } catch (err) {
      setPasswordError(
        err.message || 'Impossible de modifier le mot de passe.'
      )
    } finally {
      setIsSavingPassword(false)
    }
  }

  async function handleLogoutClick() {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } catch {
      onShowToast?.('Erreur lors de la déconnexion')
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex flex-col w-full pb-28 max-w-xl mx-auto px-gutter pt-space-md gap-space-lg font-sans antialiased">
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Session Active · Auth JWT
            </span>
          </div>
          <span className="text-xs text-outline font-medium">TaskFlow Workspace</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
          Mon Compte
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          Gérez votre profil alternant et votre session de travail synchronisée.
        </p>
      </div>

      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-900 shadow-2xs">
        <span className="material-symbols-outlined text-emerald-600 text-[20px] shrink-0">
          verified
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-sm">Vous êtes déjà connecté</span>
          <p className="text-emerald-800 leading-relaxed">
            Votre compte est authentifié. Vos tâches et délégations sont synchronisées en continu avec la base de données.
          </p>
        </div>
      </div>

      <section className="bg-surface-container-lowest rounded-2xl shadow-xs p-6 flex flex-col gap-5 border border-outline-variant/15">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#111111] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            {initials || 'TF'}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-on-surface truncate">
                {displayName}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">
                Actif
              </span>
            </div>
            <p className="text-xs text-on-surface-variant truncate font-mono">
              {displayEmail}
            </p>
            <p className="text-xs text-outline font-medium mt-0.5">
              {displayRole}
            </p>
          </div>
        </div>

        <div className="border-t border-outline-variant/10 pt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col bg-surface-container-low p-2.5 rounded-xl">
            <span className="text-[11px] text-outline font-medium">Environnement</span>
            <span className="font-semibold text-on-surface">Docker Backend</span>
          </div>
          <div className="flex flex-col bg-surface-container-low p-2.5 rounded-xl">
            <span className="text-[11px] text-outline font-medium">Protocole Auth</span>
            <span className="font-semibold text-on-surface">JWT (Bearer) + Bcrypt</span>
          </div>
        </div>
      </section>

      {/* Formulaire de modification du nom */}
      <form
        onSubmit={handleSaveName}
        className="bg-surface-container-lowest rounded-2xl shadow-xs p-5 flex flex-col gap-3.5 border border-outline-variant/15"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-secondary">
            badge
          </span>
          <h3 className="text-xs sm:text-sm font-bold text-on-surface uppercase tracking-wider">
            Informations personnelles
          </h3>
        </div>

        {nameError && (
          <div className="p-2.5 rounded-xl bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold">
            {nameError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Votre nom complet"
            aria-label="Nom d'affichage"
            className="flex-1 bg-surface-container-low text-on-surface text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
            required
          />
          <button
            type="submit"
            disabled={isSavingName || !nameInput.trim() || nameInput.trim() === displayName}
            className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isSavingName ? 'Enregistrement...' : 'Enregistrer le nom'}
          </button>
        </div>
      </form>

      {/* Formulaire de modification du mot de passe */}
      <form
        onSubmit={handleSavePassword}
        className="bg-surface-container-lowest rounded-2xl shadow-xs p-5 flex flex-col gap-3.5 border border-outline-variant/15"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-secondary">
              lock_reset
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-on-surface uppercase tracking-wider">
              Changer mon mot de passe
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className="text-[11px] font-semibold text-outline hover:text-on-surface flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">
              {showPasswords ? 'visibility_off' : 'visibility'}
            </span>
            <span>{showPasswords ? 'Masquer' : 'Afficher'}</span>
          </button>
        </div>

        {passwordError && (
          <div className="p-2.5 rounded-xl bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold">
            {passwordError}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <input
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Mot de passe actuel"
            aria-label="Mot de passe actuel"
            className="bg-surface-container-low text-on-surface text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe (min. 6 car.)"
              aria-label="Nouveau mot de passe"
              className="bg-surface-container-low text-on-surface text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
            />
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmer le nouveau mot de passe"
              aria-label="Confirmer le nouveau mot de passe"
              className="bg-surface-container-low text-on-surface text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={
                isSavingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-[#a01f29] text-on-secondary text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSavingPassword
                ? 'Modification...'
                : 'Mettre à jour le mot de passe'}
            </button>
          </div>
        </div>
      </form>

      <section className="flex flex-col gap-2">
        <span className="text-xs font-bold text-outline uppercase tracking-wider px-1">
          Navigation Rapide
        </span>

        <button
          type="button"
          onClick={onGoToMatrix}
          className="w-full p-3.5 bg-surface-container-lowest hover:bg-surface-container-low rounded-xl border border-outline-variant/15 flex items-center justify-between text-xs sm:text-sm font-semibold text-on-surface transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </div>
            <span>Accéder à ma matrice d'Eisenhower</span>
          </div>
          <span className="material-symbols-outlined text-[18px] text-outline">
            arrow_forward_ios
          </span>
        </button>

        <button
          type="button"
          onClick={onGoToShares}
          className="w-full p-3.5 bg-surface-container-lowest hover:bg-surface-container-low rounded-xl border border-outline-variant/15 flex items-center justify-between text-xs sm:text-sm font-semibold text-on-surface transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
            </div>
            <span>Consulter les tâches déléguées (Partages)</span>
          </div>
          <span className="material-symbols-outlined text-[18px] text-outline">
            arrow_forward_ios
          </span>
        </button>

        <a
          href={`${getBackendOrigin()}/api/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full p-3.5 bg-surface-container-lowest hover:bg-surface-container-low rounded-xl border border-outline-variant/15 flex items-center justify-between text-xs sm:text-sm font-semibold text-on-surface transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary-fixed/50 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">api</span>
            </div>
            <span>Documentation API interactive Swagger (/api/docs)</span>
          </div>
          <span className="material-symbols-outlined text-[18px] text-outline">
            open_in_new
          </span>
        </a>
      </section>

      <section className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={handleLogoutClick}
          className="w-full h-12 bg-white hover:bg-red-50 active:bg-red-100 text-[#E5484D] border-2 border-[#E5484D] rounded-xl font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isLoggingOut ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">
                refresh
              </span>
              <span>Déconnexion en cours…</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span>Se déconnecter</span>
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-outline">
          La déconnexion supprimera votre token local et fermera votre session de travail.
        </p>
      </section>
    </div>
  )
}
