export default function TaskCard({
  task,
  onToggleStatus,
  onDelete,
  onDelegate,
}) {
  const isCompleted = task.completed

  return (
    <article
      id={task.id}
      className={`flex flex-col bg-surface-container-lowest p-3 rounded-lg gap-2 shadow-xs transition-all duration-200 hover:bg-surface-bright border border-outline-variant/10 ${
        isCompleted ? 'opacity-40 line-through' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onToggleStatus(task.id, !isCompleted)}
            className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
              isCompleted
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container hover:bg-surface-container-high'
            }`}
            aria-label={isCompleted ? 'Marquer comme non fait' : 'Marquer comme terminé'}
            title={isCompleted ? 'Réactiver la tâche' : 'Terminer la tâche'}
          >
            {isCompleted && (
              <span className="material-symbols-outlined text-[13px] leading-none">
                check
              </span>
            )}
          </button>

          <div className="flex flex-col flex-1 min-w-0">
            <span
              className={`text-xs sm:text-sm font-medium text-on-surface truncate ${
                isCompleted ? 'text-outline' : ''
              }`}
              title={task.title}
            >
              {task.title}
            </span>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {task.tag && (
                <span
                  className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                    task.tag === 'École'
                      ? 'bg-primary-fixed text-on-primary-fixed'
                      : 'bg-surface-container text-on-surface'
                  }`}
                >
                  {task.tag}
                </span>
              )}

              {task.deadline && (
                <span
                  className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded ${
                    task.deadlineType === 'urgent' || task.deadlineType === 'warning'
                      ? 'text-secondary bg-secondary-fixed'
                      : 'text-outline bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {task.deadlineType === 'repeat'
                      ? 'event_repeat'
                      : task.deadlineType === 'urgent'
                      ? 'schedule'
                      : 'calendar_today'}
                  </span>
                  <span>{task.deadline}</span>
                </span>
              )}

              {task.status && (
                <span
                  className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded ${
                    task.status === 'Urgent'
                      ? 'text-secondary bg-secondary-fixed'
                      : 'text-outline'
                  }`}
                >
                  {task.status === 'En cours' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span>
                  )}
                  <span>{task.status}</span>
                </span>
              )}

              {task.delegateTo && (
                <span className="text-[11px] text-outline font-normal">
                  {task.delegateTo}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {task.actionType === 'share' && (
            <button
              type="button"
              onClick={() => onDelegate(task)}
              className="flex items-center gap-1 bg-surface-container hover:bg-surface-container-high text-on-surface px-2 py-1 rounded text-[11px] font-semibold transition-colors"
              title="Transférer la tâche"
            >
              <span className="material-symbols-outlined text-[15px]">send</span>
              <span className="hidden sm:inline">Partager</span>
            </button>
          )}

          {task.actionType === 'mail' && (
            <button
              type="button"
              onClick={() => onDelegate(task)}
              className="flex items-center gap-1 bg-surface-container hover:bg-surface-container-high text-on-surface px-2 py-1 rounded text-[11px] font-semibold transition-colors"
              title="Envoyer par email"
            >
              <span className="material-symbols-outlined text-[15px]">mail</span>
              <span className="hidden sm:inline">Mail</span>
            </button>
          )}

          {task.actionType === 'delete' && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="text-outline hover:text-error p-1 rounded hover:bg-error-container/20 transition-colors"
              title="Éliminer / Supprimer cette tâche"
            >
              <span className="material-symbols-outlined text-[18px]">
                delete_sweep
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
