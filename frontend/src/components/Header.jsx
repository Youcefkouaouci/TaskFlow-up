/**
 * Header.jsx
 * En-tête de navigation principale de TaskFlow.
 * 
 * --------------------------------------------------------------------------
 * FONCTIONNALITÉS FRONTEND :
 * - Affiche le logo officiel 2x2 rouge de la matrice TaskFlow
 * - Affiche le titre de l'application et la baseline "L'important d'abord"
 * - Affiche le badge dynamique du nombre d'actions urgentes en attente
 * - Affiche le bouton d'avatar utilisateur pour accéder au profil
 * 
 * NOTE API BACKEND :
 * - Profil utilisateur : GET /api/users/me -> { id, name, avatarUrl, email }
 * - Compteur d'urgence : calculé soit depuis GET /api/tasks, soit via GET /api/tasks/urgent-count
 * --------------------------------------------------------------------------
 */

export default function Header({
  title = 'Matrice',
  urgentCount = 4,
  onProfileClick,
  user = null,
}) {
  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-gutter flex items-center justify-between max-w-7xl mx-auto">
        {/* Identité de l'application (Logo + Titre) */}
        <div className="flex items-center gap-space-sm min-w-0">
          {/* Logo 2x2 Rouge TaskFlow reproduit fidèlement */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center p-1 bg-surface-container-low border border-outline-variant/30 flex-shrink-0"
            title="TaskFlow - Matrice d'Eisenhower"
          >
            <div className="grid grid-cols-2 gap-1 w-5 h-5">
              <span className="bg-secondary rounded-[2px]"></span>
              <span className="bg-secondary/70 rounded-[2px]"></span>
              <span className="bg-secondary/50 rounded-[2px]"></span>
              <span className="bg-outline-variant rounded-[2px]"></span>
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-bold text-lg text-primary tracking-tight">TaskFlow</span>
              <span className="hidden sm:inline-block text-xs text-outline px-1">•</span>
              <span className="text-sm font-semibold text-on-surface truncate">{title}</span>
            </div>
            <span className="text-xs text-outline truncate">L'important d'abord.</span>
          </div>
        </div>

        {/* Actions rapides à droite (Badges & Profil utilisateur) */}
        <div className="flex items-center gap-space-sm flex-shrink-0">
          {/* Badge du contexte actuel */}
          <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 bg-secondary-fixed text-on-secondary-fixed rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span className="text-xs font-semibold">Entreprise</span>
          </div>

          {/* Badge indicateur de tâches urgentes */}
          <div
            className="flex items-center px-2.5 py-1 bg-secondary-fixed text-on-secondary-fixed rounded-xl gap-1"
            title={`${urgentCount} tâches urgentes nécessitent votre attention`}
          >
            <span className="text-xs text-secondary font-bold">{urgentCount}</span>
            <span className="text-xs text-on-secondary-fixed hidden sm:inline">urgents</span>
          </div>

          {/* Bouton profil utilisateur */}
          {/* ENDPOINT : GET /api/users/me / PATCH /api/users/me */}
          <button
            type="button"
            onClick={onProfileClick}
            className="relative w-8 h-8 rounded-full bg-primary hover:bg-neutral-800 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 cursor-pointer text-white font-bold text-xs"
            aria-label="Profil utilisateur"
            title={user ? `Connecté : ${user.name || user.email}` : 'Mon compte'}
          >
            {user ? (
              <>
                <span>{(user.name?.[0] || user.email?.[0] || 'U').toUpperCase()}</span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-surface rounded-full"></span>
              </>
            ) : (
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
