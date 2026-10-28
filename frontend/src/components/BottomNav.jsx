/**
 * BottomNav.jsx
 * Barre de navigation inférieure fixe pour mobile et desktop.
 * 
 * --------------------------------------------------------------------------
 * FONCTIONNALITÉS FRONTEND :
 * - Navigation entre les 4 vues de l'application :
 *   1. "Matrice" (Vue courante de la matrice d'Eisenhower)
 *   2. "Liste & Filtres" (Vue tabulaire / liste avec tri)
 *   3. "Partages" (Tâches déléguées avec pastille de notification rouge)
 *   4. "Compte" (Profil utilisateur et paramètres de l'alternance)
 * - Indicateur actif avec surlignage rouge bordeaux supérieur (border-t-2)
 * 
 * NOTE API BACKEND / ROUTING :
 * - Associé aux routes et endpoints suivants :
 *   - Matrice : / (GET /api/tasks)
 *   - Liste & Filtres : /tasks/list (GET /api/tasks?sort=deadline)
 *   - Partages : /tasks/delegations (GET /api/tasks/delegated)
 *   - Compte : /profile (GET /api/users/me)
 * --------------------------------------------------------------------------
 */

export default function BottomNav({ activeTab = 'matrice', onSelectTab }) {
  const tabs = [
    {
      id: 'matrice',
      label: 'Matrice',
      icon: 'grid_view',
      hasBadge: false,
    },
    {
      id: 'liste',
      label: 'Liste & Filtres',
      icon: 'filter_list',
      hasBadge: false,
    },
    {
      id: 'partages',
      label: 'Partages',
      icon: 'forward_to_inbox',
      hasBadge: true, // pastille rouge visible sur le screen
    },
    {
      id: 'compte',
      label: 'Compte',
      icon: 'manage_accounts',
      hasBadge: false,
    },
  ]

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.04)] border-t border-outline-variant/15">
      <div className="h-16 px-gutter grid grid-cols-4 items-center max-w-7xl mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors gap-0.5 relative ${
                isActive
                  ? 'text-secondary border-t-2 border-secondary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface font-normal'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">
                  {tab.icon}
                </span>
                {/* Pastille de notification rouge pour les partages */}
                {tab.hasBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-secondary"></span>
                )}
              </div>
              <span className="text-[11px] tracking-normal leading-tight">
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
