export default function ContextSwitch({
  activeContext,
  onSelectContext,
  projects = [],
  selectedProjectId = 'all',
  onSelectProject,
  onOpenNewTaskModal,
}) {
  return (
    <section className="py-space-md flex flex-col gap-space-sm">
      <div className="flex items-center justify-between gap-space-sm flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-surface-container rounded-lg">
            <button
              type="button"
              id="tab-tous"
              onClick={() => onSelectContext('Tous')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeContext === 'Tous'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeContext === 'Tous' ? 'bg-secondary' : 'bg-outline-variant'
                }`}
              ></span>
              <span>Tous</span>
            </button>

            <button
              type="button"
              id="tab-ent"
              onClick={() => onSelectContext('Entreprise')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeContext === 'Entreprise'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeContext === 'Entreprise'
                    ? 'bg-secondary'
                    : 'bg-outline-variant'
                }`}
              ></span>
              <span>Semaine Entreprise</span>
              <span className="text-outline font-normal text-[11px] hidden sm:inline">
                (3j restants)
              </span>
            </button>

            <button
              type="button"
              id="tab-ecole"
              onClick={() => onSelectContext('École')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeContext === 'École'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeContext === 'École'
                    ? 'bg-secondary'
                    : 'bg-outline-variant'
                }`}
              ></span>
              <span>École</span>
            </button>
          </div>

          {onSelectProject && (
            <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1.5 rounded-lg">
              <span className="material-symbols-outlined text-[16px] text-secondary">
                folder_open
              </span>
              <select
                aria-label="Filtrer par projet"
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-transparent text-xs font-semibold text-on-surface outline-none cursor-pointer pr-1"
              >
                <option value="all">Tous les projets</option>
                <option value="general">Projet Général (Sans projet)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    Projet : {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenNewTaskModal}
          className="flex items-center gap-1.5 bg-secondary hover:bg-[#a01f29] active:bg-[#8b1a23] text-on-secondary px-3.5 py-2 rounded-lg transition-colors flex-shrink-0 shadow-sm active:scale-95 cursor-pointer"
          aria-label="Créer une nouvelle tâche"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span className="text-xs font-semibold">Nouvelle tâche</span>
        </button>
      </div>
    </section>
  )
}
