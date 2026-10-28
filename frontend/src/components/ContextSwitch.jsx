export default function ContextSwitch({
  activeContext,
  onSelectContext,
  onOpenNewTaskModal,
}) {
  return (
    <section className="py-space-md flex flex-col gap-space-sm">
      <div className="flex items-center justify-between gap-space-sm flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-surface-container rounded-lg">
          <button
            type="button"
            id="tab-ent"
            onClick={() => onSelectContext('Entreprise')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeContext === 'Entreprise'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                activeContext === 'Entreprise' ? 'bg-secondary' : 'bg-outline-variant'
              }`}
            ></span>
            <span>Semaine Entreprise</span>
            <span className="text-outline font-normal text-[11px]">(3j restants)</span>
          </button>

          <button
            type="button"
            id="tab-ecole"
            onClick={() => onSelectContext('École')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeContext === 'École'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                activeContext === 'École' ? 'bg-secondary' : 'bg-outline-variant'
              }`}
            ></span>
            <span>École</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenNewTaskModal}
          className="flex items-center gap-1.5 bg-secondary hover:bg-[#a01f29] active:bg-[#8b1a23] text-on-secondary px-3.5 py-2 rounded-lg transition-colors flex-shrink-0 shadow-sm active:scale-95"
          aria-label="Créer une nouvelle tâche"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span className="text-xs font-semibold">Nouvelle tâche</span>
        </button>
      </div>
    </section>
  )
}
