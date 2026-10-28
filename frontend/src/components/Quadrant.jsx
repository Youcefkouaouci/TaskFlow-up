import { useState } from 'react'
import TaskCard from './TaskCard'

export default function Quadrant({
  id,
  title,
  subtitle,
  badgeText,
  isCritical = false,
  tasks = [],
  onToggleStatus,
  onDelete,
  onDelegate,
  onMoveQuadrant,
  onEdit,
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  function handleDragOver(e) {
    if (!onMoveQuadrant) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!isDragOver) setIsDragOver(true)
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false)
    }
  }

  function handleDrop(e) {
    if (!onMoveQuadrant) return
    e.preventDefault()
    setIsDragOver(false)
    const draggedTaskId = e.dataTransfer.getData('text/plain')
    const fromQuadrant = Number(
      e.dataTransfer.getData('application/x-taskflow-quadrant')
    )
    if (draggedTaskId && fromQuadrant !== id) {
      onMoveQuadrant(draggedTaskId, id)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col bg-surface-container-low rounded-lg p-space-md gap-space-sm relative overflow-hidden transition-all ${
        isCritical
          ? 'border-l-[3.5px] border-secondary'
          : 'border border-outline-variant/10'
      } ${
        isDragOver
          ? 'ring-2 ring-secondary bg-secondary-fixed/20 scale-[1.01]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs sm:text-sm font-bold tracking-wider uppercase ${
              isCritical
                ? 'text-secondary'
                : id === 2
                ? 'text-primary'
                : id === 3
                ? 'text-on-surface-variant'
                : 'text-outline'
            }`}
          >
            {title}
          </span>
          <span className="text-xs text-outline">{subtitle}</span>
        </div>

        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
            isCritical
              ? 'bg-secondary text-on-secondary'
              : 'bg-surface-container text-on-surface'
          }`}
        >
          {badgeText}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              onDelegate={onDelegate}
              onMoveQuadrant={onMoveQuadrant}
              onEdit={onEdit}
            />
          ))
        ) : (
          <div className="p-3 text-center text-xs text-outline italic bg-surface-container-lowest/50 rounded-lg">
            Aucune tâche dans ce quadrant
          </div>
        )}
      </div>
    </div>
  )
}
