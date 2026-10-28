/**
 * NewTaskModal.jsx
 * Boîte de dialogue modale pour la création rapide d'une tâche.
 * 
 * --------------------------------------------------------------------------
 * FONCTIONNALITÉS FRONTEND :
 * - Overlay avec flou d'arrière-plan (backdrop-blur)
 * - Saisie contrôlée du titre de l'action avec autofocus
 * - Sélection du quadrant cible dans la matrice (1 Faire, 2 Planifier, 3 Déléguer, 4 Éliminer)
 * - Sélection du contexte de rattachement (Entreprise, École, Personnel)
 * - Validation du champ titre (empêche la saisie vide)
 * 
 * NOTE API BACKEND :
 * - Création d'une tâche via :
 *   -> POST /api/tasks
 *   Body envoyé :
 *   {
 *     title: string,
 *     quadrant: number (1-4),
 *     context: string,
 *     tag: string
 *   }
 * --------------------------------------------------------------------------
 */

import { useState } from 'react'

export default function NewTaskModal({ isOpen, onClose, onCreateTask }) {
  const [title, setTitle] = useState('')
  const [quadrant, setQuadrant] = useState(1)
  const [context, setContext] = useState('Entreprise')

  if (!isOpen) return null

  function handleSubmit(e) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    onCreateTask({
      title: trimmedTitle,
      quadrant: Number(quadrant),
      context: context,
      tag: context,
      status: Number(quadrant) === 1 ? 'À faire' : null,
      deadline: Number(quadrant) === 1 ? "Aujourd'hui" : null,
      deadlineType: Number(quadrant) === 1 ? 'urgent' : null,
    })

    setTitle('')
    setQuadrant(1)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-container-lowest rounded-xl p-5 flex flex-col gap-4 shadow-xl border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">
              add_task
            </span>
            <h2 className="text-base font-semibold text-on-surface">Nouvelle tâche</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-outline hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Formulaire de création */}
        {/* ENDPOINT : POST /api/tasks */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Champ Titre */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-on-surface-variant">
              Titre de l'action *
            </span>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Envoyer livret d'apprentissage..."
              className="px-3 py-2 bg-surface-container-low rounded-lg text-xs sm:text-sm text-on-surface placeholder:text-outline border border-transparent focus:border-secondary focus:bg-surface-container-lowest focus:outline-none transition-all"
              required
            />
          </label>

          {/* Grille Quadrant & Contexte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Sélection Quadrant */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface-variant">
                Quadrant cible
              </span>
              <select
                value={quadrant}
                onChange={(e) => setQuadrant(Number(e.target.value))}
                className="px-2.5 py-2 bg-surface-container-low rounded-lg text-xs sm:text-sm text-on-surface focus:outline-none focus:border-secondary border border-transparent"
              >
                <option value={1}>1 · Faire (Urgent/Important)</option>
                <option value={2}>2 · Planifier (Important)</option>
                <option value={3}>3 · Déléguer (Urgent)</option>
                <option value={4}>4 · Éliminer</option>
              </select>
            </label>

            {/* Sélection Contexte */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface-variant">
                Contexte
              </span>
              <select
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="px-2.5 py-2 bg-surface-container-low rounded-lg text-xs sm:text-sm text-on-surface focus:outline-none focus:border-secondary border border-transparent"
              >
                <option value="Entreprise">Entreprise</option>
                <option value="École">École</option>
                <option value="Personnel">Personnel</option>
              </select>
            </label>
          </div>

          {/* Actions Annuler / Enregistrer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-1.5 rounded-lg bg-secondary text-on-secondary text-xs font-semibold hover:bg-[#a01f29] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
