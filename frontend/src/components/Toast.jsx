/**
 * Toast.jsx
 * Composant de notification éphémère (feedback utilisateur).
 * 
 * --------------------------------------------------------------------------
 * FONCTIONNALITÉS FRONTEND :
 * - Notification toast flottante au-dessus de la Bottom Navigation
 * - Animation d'apparition/disparition
 * - Feedback immédiat lors d'actions utilisateur (cocher, supprimer, filtrer, etc.)
 * --------------------------------------------------------------------------
 */

export default function Toast({ toast }) {
  if (!toast || !toast.visible) return null

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-medium shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <span className="material-symbols-outlined text-[16px] text-secondary">
        check_circle
      </span>
      <span>{toast.message}</span>
    </aside>
  )
}
