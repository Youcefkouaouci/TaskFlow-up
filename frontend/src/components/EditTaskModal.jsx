/**
 * ============================================================================
 * TaskFlow - Modale d'Édition Complète d'une Tâche (<dialog closedby="any">)
 * ============================================================================
 * Permet de modifier :
 * - Titre & Description
 * - Urgence & Importance (recalcul en direct du Quadrant d'Eisenhower)
 * - Statut (À faire / En cours / Terminé)
 * - Date d'échéance (dueDate YYYY-MM-DD)
 * - Assignations aux membres du projet (assignedTo, si projectMembers fourni)
 * ============================================================================
 */

import { useState, useEffect, useRef, useId } from 'react'

function toDateInputValue(dueDate) {
  if (!dueDate) return ''
  if (typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dueDate)) {
    return dueDate.slice(0, 10)
  }
  const parsed = new Date(dueDate)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  return ''
}

function normalizeFormStatus(status, completed) {
  if (completed || status === 'done' || status === 'Terminé') return 'done'
  if (
    status === 'doing' ||
    status === 'in_progress' ||
    status === 'inprogress' ||
    status === 'En cours'
  ) {
    return 'doing'
  }
  return 'todo'
}

function EditTaskForm({
  task,
  titleId,
  projectMembers,
  projects = [],
  onSave,
  onCancel,
}) {
  const [title, setTitle] = useState(() => task.title || '')
  const [description, setDescription] = useState(() => task.description || '')
  const [context, setContext] = useState(
    () => task.context || task.tag || 'Entreprise'
  )
  const [projectId, setProjectId] = useState(() => task.projectId || '')
  const [urgent, setUrgent] = useState(() =>
    typeof task.urgent === 'boolean'
      ? task.urgent
      : task.quadrant === 1 || task.quadrant === 3
  )
  const [important, setImportant] = useState(() =>
    typeof task.important === 'boolean'
      ? task.important
      : task.quadrant === 1 || task.quadrant === 2
  )
  const [status, setStatus] = useState(() =>
    normalizeFormStatus(task.status, task.completed)
  )
  const [dueDate, setDueDate] = useState(() => toDateInputValue(task.dueDate))
  const [assignedTo, setAssignedTo] = useState(() =>
    Array.isArray(task.assignedTo) ? task.assignedTo : []
  )
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function toggleAssignee(userId) {
    setAssignedTo((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMsg('Le titre de la tâche est obligatoire.')
      return
    }

    setIsSaving(true)
    setErrorMsg('')
    try {
      await onSave?.(task.id, {
        title: title.trim(),
        description: description.trim(),
        context,
        projectId: projectId || null,
        urgent,
        important,
        status,
        dueDate: dueDate || null,
        assignedTo,
      })
      onCancel?.()
    } catch (err) {
      setErrorMsg(err.message || 'Impossible de mettre à jour cette tâche.')
    } finally {
      setIsSaving(false)
    }
  }

  const calculatedQuadrant =
    urgent && important
      ? '1 · DO (Faire immédiatement)'
      : !urgent && important
      ? '2 · PLAN (Planifier)'
      : urgent && !important
      ? '3 · DELEGATE (Déléguer)'
      : '4 · ELIMINATE (Éliminer)'

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-secondary">
            edit_square
          </span>
          <h2
            id={titleId}
            className="text-base sm:text-lg font-bold text-on-surface"
          >
            Modifier la tâche
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low cursor-pointer"
          aria-label="Fermer la modale"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Titre */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="edit-task-title"
          className="text-xs font-semibold text-on-surface"
        >
          Titre de la tâche <span className="text-secondary">*</span>
        </label>
        <input
          id="edit-task-title"
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-surface-container-low text-on-surface text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
          required
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="edit-task-desc"
          className="text-xs font-semibold text-on-surface"
        >
          Description / Notes
        </label>
        <textarea
          id="edit-task-desc"
          rows={3}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détails, livrables attendus, critères..."
          className="bg-surface-container-low text-on-surface text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none resize-y"
        />
      </div>

      {/* Urgence & Importance -> Quadrant d'Eisenhower */}
      <div className="flex flex-col gap-2 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface">
            Matrice d'Eisenhower
          </span>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">
            {calculatedQuadrant}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setUrgent((v) => !v)}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border transition-colors ${
              urgent
                ? 'bg-secondary text-on-secondary border-secondary'
                : 'bg-surface-container-lowest text-on-surface border-outline-variant/20'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span>Urgent : {urgent ? 'Oui' : 'Non'}</span>
          </button>

          <button
            type="button"
            onClick={() => setImportant((v) => !v)}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border transition-colors ${
              important
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest text-on-surface border-outline-variant/20'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              verified
            </span>
            <span>Important : {important ? 'Oui' : 'Non'}</span>
          </button>
        </div>
      </div>

      {/* Statut & Échéance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-task-status"
            className="text-xs font-semibold text-on-surface"
          >
            Statut d'avancement
          </label>
          <select
            id="edit-task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-surface-container-low text-on-surface text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
          >
            <option value="todo">À faire (Todo)</option>
            <option value="doing">En cours (In Progress)</option>
            <option value="done">Terminé (Done)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-task-duedate"
            className="text-xs font-semibold text-on-surface"
          >
            Date d'échéance
          </label>
          <input
            id="edit-task-duedate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
          />
        </div>
      </div>

      {/* Contexte & Projet associé */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-task-context"
            className="text-xs font-semibold text-on-surface"
          >
            Contexte (Alternance)
          </label>
          <select
            id="edit-task-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="bg-surface-container-low text-on-surface text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
          >
            <option value="Entreprise">Entreprise</option>
            <option value="École">École</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-task-project"
            className="text-xs font-semibold text-on-surface"
          >
            Projet associé
          </label>
          <select
            id="edit-task-project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-surface-container-low text-on-surface text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-xl border border-outline-variant/20 focus:border-secondary outline-none"
          >
            <option value="">Projet Général (Sans projet)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignation aux membres (si projet collaboratif) */}
      {projectMembers.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-xs font-semibold text-on-surface">
            Membres assignés à cette tâche
          </span>
          <div className="flex flex-wrap gap-1.5">
            {projectMembers.map((m) => {
              const selected = assignedTo.includes(m.userId)
              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => toggleAssignee(m.userId)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    selected
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {selected ? '✓ ' : '+ '}
                  {m.name} ({m.role})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/15">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold cursor-pointer"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSaving || !title.trim()}
          className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-[#a01f29] text-on-secondary text-xs font-semibold cursor-pointer disabled:opacity-50"
        >
          {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </form>
  )
}

export default function EditTaskModal({
  task,
  isOpen,
  onClose,
  onSave,
  projectMembers = [],
  projects = [],
}) {
  const dialogRef = useRef(null)
  const titleId = useId()

  // Ouverture / fermeture native <dialog> avec showModal() + fallback light-dismiss
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && task) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [isOpen, task])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    function handleNativeClose() {
      onClose?.()
    }

    function handleBackdropClick(event) {
      if ('closedBy' in HTMLDialogElement.prototype) return
      if (event.target !== dialog) return
      const rect = dialog.getBoundingClientRect()
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      if (!isDialogContent) {
        dialog.close()
      }
    }

    dialog.addEventListener('close', handleNativeClose)
    dialog.addEventListener('click', handleBackdropClick)
    return () => {
      dialog.removeEventListener('close', handleNativeClose)
      dialog.removeEventListener('click', handleBackdropClick)
    }
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      {...{ closedby: 'any' }}
      aria-labelledby={titleId}
      className="m-auto w-full max-w-lg rounded-2xl bg-surface-container-lowest text-on-surface p-0 shadow-xl border border-outline-variant/20 backdrop:bg-black/50 backdrop:backdrop-blur-xs"
    >
      {task && (
        <EditTaskForm
          key={task.id}
          task={task}
          titleId={titleId}
          projectMembers={projectMembers}
          projects={projects}
          onSave={onSave}
          onCancel={() => dialogRef.current?.close()}
        />
      )}
    </dialog>
  )
}
