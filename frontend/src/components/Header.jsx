import NotificationBell from './NotificationBell'

export default function Header({
  title = 'Matrice',
  urgentCount = 0,
  onProfileClick,
  user = null,
  onShowToast,
}) {
  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-gutter flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-space-sm min-w-0">
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

        <div className="flex items-center gap-space-sm flex-shrink-0">
          {user && (
            <div
              className="flex items-center px-2.5 py-1 bg-secondary-fixed text-on-secondary-fixed rounded-xl gap-1"
              title={`${urgentCount} tâches urgentes nécessitent votre attention`}
            >
              <span className="text-xs text-secondary font-bold">{urgentCount}</span>
              <span className="text-xs text-on-secondary-fixed hidden sm:inline">urgents</span>
            </div>
          )}

          <NotificationBell user={user} onShowToast={onShowToast} />

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
