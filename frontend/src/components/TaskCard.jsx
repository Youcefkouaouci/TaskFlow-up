import { useState } from 'react'

const QUADRANT_LABELS = {
  1: { short: 'Q1', label: 'Faire' },
  2: { short: 'Q2', label: 'Planifier' },
  3: { short: 'Q3', label: 'Déléguer' },
  4: { short: 'Q4', label: 'Éliminer' },
}

export default function TaskCard({
  task,
  onToggleStatus,
  onDelete,
  onDelegate,
  onMoveQuadrant,
  onEdit,
}) {
  const isCompleted = task.completed
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  function handleDeleteClick() {
    if (confirmingDelete) {
      onDelete(task.id)
      setConfirmingDelete(false)
    } else {
      setConfirmingDelete(true)
    }
  }

  function handleMoveClick(quadrant) {
    onMoveQuadrant(task.id, quadrant)
    setShowMoveMenu(false)
  }

  function handleDragStart(e) {
    if (!onMoveQuadrant) return
    e.dataTransfer.setData('text/plain', String(task.id))
    e.dataTransfer.setData(
      'application/x-taskflow-quadrant',
      String(task.quadrant)
    )
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  function handleDragEnd() {
    setIsDragging(false)
  }

  return (
    <article
      id={task.id}
      draggable={Boolean(onMoveQuadrant)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`flex flex-col bg-surface-container-lowest p-3 rounded-lg gap-2 shadow-xs transition-all duration-200 hover:bg-surface-bright border border-outline-variant/10 ${
        onMoveQuadrant ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        isDragging
          ? 'opacity-50 scale-[0.98] ring-2 ring-secondary/40'
          : isCompleted
          ? 'opacity-40 line-through'
          : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {onMoveQuadrant && (
            <span
              className="material-symbols-outlined text-[16px] text-outline/60 hover:text-outline mt-0.5 select-none shrink-0"
              title="Glisser-déposer vers un autre quadrant"
              aria-hidden="true"
            >
              drag_indicator
            </span>
          )}
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

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="text-outline hover:text-primary p-1 rounded hover:bg-surface-container transition-colors cursor-pointer"
              title="Modifier cette tâche"
              aria-label="Modifier cette tâche"
            >
              <span className="material-symbols-outlined text-[17px]">edit</span>
            </button>
          )}

          {onMoveQuadrant && (
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowMoveMenu((v) => !v); setConfirmingDelete(false) }}
                className="text-outline hover:text-primary p-1 rounded hover:bg-surface-container transition-colors"
                title="Déplacer vers un autre quadrant"
              >
                <span className="material-symbols-outlined text-[18px]">drive_file_move</span>
              </button>

              {showMoveMenu && (
                <div className="absolute right-0 top-7 z-10 bg-surface-container-lowest border border-outline-variant/20 rounded-lg shadow-md p-1.5 flex flex-col gap-1 min-w-[120px]">
                  {[1, 2, 3, 4].map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={task.quadrant === q}
                      onClick={() => handleMoveClick(q)}
                      className={`text-left px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
                        task.quadrant === q
                          ? 'text-outline cursor-default'
                          : 'text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {QUADRANT_LABELS[q].short} · {QUADRANT_LABELS[q].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {confirmingDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDeleteClick}
                className="text-[11px] font-semibold text-error bg-error-container/30 hover:bg-error-container/60 px-2 py-1 rounded transition-colors"
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-outline hover:text-on-surface p-1 rounded transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="text-outline hover:text-error p-1 rounded hover:bg-error-container/20 transition-colors"
              title="Supprimer cette tâche"
            >
              <span className="material-symbols-outlined text-[18px]">
                {task.actionType === 'delete' ? 'delete_sweep' : 'delete'}
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
