import { useState, useEffect, useCallback } from 'react'

const MATRIX_CONFIG = {
  'urgent-important': {
    quadrant: 1,
    title: 'Q1 : FAIRE IMMÉDIATEMENT',
    desc: 'Urgent & Important : aucun report possible. À finaliser dès votre bloc de concentration de ce matin.',
    pillText: 'Priorité absolue',
    pillClass: 'bg-secondary-fixed text-on-secondary-fixed',
    activeCell: 'q1',
    titleClass: 'text-secondary',
    stripeClass: 'bg-secondary',
  },
  'notUrgent-important': {
    quadrant: 2,
    title: 'Q2 : PLANIFIER (STRATÉGIQUE)',
    desc: "Important mais non urgent : planifiez un créneau dédié dans la semaine pour éviter l'effet panique.",
    pillText: 'Avancement clé',
    pillClass: 'bg-primary-fixed text-on-primary-fixed',
    activeCell: 'q2',
    titleClass: 'text-on-surface',
    stripeClass: 'bg-primary',
  },
  'urgent-notImportant': {
    quadrant: 3,
    title: 'Q3 : DÉLÉGUER / TRAITER VITE',
    desc: 'Urgent mais peu déterminant : regroupez cette tâche, traitez-la en batch ou sollicitez un pair.',
    pillText: 'Temps limité',
    pillClass: 'bg-surface-container-high text-on-surface',
    activeCell: 'q3',
    titleClass: 'text-on-surface-variant',
    stripeClass: 'bg-outline',
  },
  'notUrgent-notImportant': {
    quadrant: 4,
    title: 'Q4 : ÉLIMINER / REPORTER',
    desc: "Ni urgent, ni important : questionnez la pertinence de cette tâche face à vos objectifs d'alternance.",
    pillText: 'Bruit de fond',
    pillClass: 'bg-surface-container text-on-surface-variant',
    activeCell: 'q4',
    titleClass: 'text-outline',
    stripeClass: 'bg-surface-variant',
  },
}

export default function CreateTaskPage({
  onBack,
  onSaveTask,
  projects = [],
  defaultProjectId = '',
  defaultContext = 'Entreprise',
}) {
  const [title, setTitle] = useState("Dossier d'évaluation tuteur M1")
  const [context, setContext] = useState(() =>
    defaultContext === 'École' ? 'school' : 'work'
  )
  const [projectId, setProjectId] = useState(() =>
    defaultProjectId && defaultProjectId !== 'all' && defaultProjectId !== 'general'
      ? defaultProjectId
      : ''
  )
  const [isUrgent, setIsUrgent] = useState(true)
  const [isImportant, setIsImportant] = useState(true)
  const [dueDateIso, setDueDateIso] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })
  const [dueDateText, setDueDateText] = useState("Aujourd'hui")
  const [dueTimeText, setDueTimeText] = useState('18:00 (avant fin de journée)')
  const [hasReminder, setHasReminder] = useState(true)
  const [status, setStatus] = useState('todo') 
  const [isShareEnabled, setIsShareEnabled] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const verdictKey = `${isUrgent ? 'urgent' : 'notUrgent'}-${
    isImportant ? 'important' : 'notImportant'
  }`
  const verdict = MATRIX_CONFIG[verdictKey]

  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault()
      const trimmedTitle = title.trim()
      if (!trimmedTitle || isSubmitting) return

      setIsSubmitting(true)

      const newTaskPayload = {
        title: trimmedTitle,
        quadrant: verdict.quadrant,
        context: context === 'work' ? 'Entreprise' : 'École',
        tag: context === 'work' ? 'Entreprise' : 'École',
        projectId: projectId || null,
        dueDate: dueDateIso || null,
        deadline: dueDateText,
        deadlineType: isUrgent ? 'urgent' : 'neutral',
        status: status === 'todo' ? 'À faire' : status === 'wip' ? 'En cours' : 'Terminé',
        completed: status === 'done',
        isUrgent,
        isImportant,
        reminder: hasReminder,
        notifyEmail: isShareEnabled ? shareEmail : null,
      }

      try {
        if (onSaveTask) {
          await onSaveTask(newTaskPayload)
        }
        setTimeout(() => {
          onBack()
        }, 300)
      } catch (err) {
        console.error(err)
        setIsSubmitting(false)
      }
    },
    [
      title,
      isSubmitting,
      verdict.quadrant,
      context,
      projectId,
      dueDateIso,
      dueDateText,
      isUrgent,
      isImportant,
      status,
      hasReminder,
      isShareEnabled,
      shareEmail,
      onSaveTask,
      onBack,
    ]
  )

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit])

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface antialiased">
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/15">
        <div className="h-16 px-gutter flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-space-sm min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Retour à la matrice"
              className="min-w-[40px] min-h-[40px] -ml-2 flex items-center justify-center text-on-surface hover:text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>

            <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1 bg-surface-container-low border border-outline-variant/30 flex-shrink-0">
              <div className="grid grid-cols-2 gap-1 w-5 h-5">
                <span className="bg-secondary rounded-[2px]"></span>
                <span className="bg-secondary/70 rounded-[2px]"></span>
                <span className="bg-secondary/50 rounded-[2px]"></span>
                <span className="bg-outline-variant rounded-[2px]"></span>
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <h1 className="font-semibold text-base text-on-surface truncate">
                Création De Tâche
              </h1>
              <span className="text-xs text-outline truncate">
                TaskFlow • L'important d'abord.
              </span>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[18px]">
              person
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-safe bg-surface max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="px-gutter pt-4 pb-8 flex flex-col gap-space-lg">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-on-surface-variant hover:text-on-surface px-2 py-1 -ml-2 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Nouvelle tâche
            </span>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className={`font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:opacity-90 transition-all ${
                isUrgent
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-primary text-on-primary'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    refresh
                  </span>
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-surface-container-low p-3 rounded-xl flex items-center justify-between border border-outline-variant/15">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                bolt
              </span>
              <p className="text-xs text-on-surface truncate">
                Mode alternance : priorisation en moins de 10s
              </p>
            </div>
            <span className="text-xs text-outline flex-shrink-0">Matrice 2x2</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="taskTitle" className="text-xs font-semibold text-outline uppercase">
              Intitulé de l'action
            </label>
            <div className="bg-surface-container-lowest rounded-xl shadow-xs p-3.5 border border-outline-variant/20 focus-within:border-secondary transition-colors">
              <input
                id="taskTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Rendre le livrable tuteur semestriel..."
                className="w-full bg-transparent text-sm sm:text-base text-on-surface placeholder:text-outline-variant outline-none font-medium"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-outline uppercase">
                Sphère de responsabilité
              </label>
              <span className="text-xs font-semibold text-secondary">
                Alternance active
              </span>
            </div>
            <div className="bg-surface-container-high p-1 rounded-xl grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setContext('school')}
                className={`py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs sm:text-sm transition-all ${
                  context === 'school'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                    : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">school</span>
                <span className="truncate">École (Campus Bordeaux)</span>
              </button>

              <button
                type="button"
                onClick={() => setContext('work')}
                className={`py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs sm:text-sm transition-all ${
                  context === 'work'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                    : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">
                  business_center
                </span>
                <span className="truncate">Entreprise (TechCorp)</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="taskProject"
                className="text-xs font-semibold text-outline uppercase flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  folder_open
                </span>
                <span>Projet associé</span>
              </label>
              <span className="text-xs text-on-surface-variant">
                {projectId ? 'Projet collaboratif' : 'Projet Général'}
              </span>
            </div>
            <div className="bg-surface-container-lowest rounded-xl shadow-xs p-3 border border-outline-variant/20 focus-within:border-secondary transition-colors">
              <select
                id="taskProject"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-on-surface font-medium outline-none cursor-pointer"
              >
                <option value="">
                  Projet Général (Sans projet spécifique)
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-outline uppercase">
                Évaluation Eisenhower (Calcul automatique)
              </label>
              <span className="text-xs text-on-surface-variant">2 critères clés</span>
            </div>

            <div
              onClick={() => setIsUrgent(!isUrgent)}
              className="bg-surface-container-lowest rounded-xl p-3.5 flex items-center justify-between shadow-xs border border-outline-variant/15 cursor-pointer select-none hover:bg-surface-bright transition-colors"
            >
              <div className="flex items-start gap-3 pr-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    timer
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-on-surface">
                    C'est urgent
                  </span>
                  <span className="text-xs text-on-surface-variant truncate">
                    À livrer d'ici 48h ou deadline inflexible
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isUrgent}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsUrgent(!isUrgent)
                }}
                className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 flex-shrink-0 ${
                  isUrgent ? 'bg-secondary' : 'bg-surface-variant'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full shadow-sm transition-transform transform ${
                    isUrgent
                      ? 'bg-on-secondary translate-x-5'
                      : 'bg-outline-variant translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div
              onClick={() => setIsImportant(!isImportant)}
              className="bg-surface-container-lowest rounded-xl p-3.5 flex items-center justify-between shadow-xs border border-outline-variant/15 cursor-pointer select-none hover:bg-surface-bright transition-colors"
            >
              <div className="flex items-start gap-3 pr-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    verified
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-on-surface">
                    C'est important
                  </span>
                  <span className="text-xs text-on-surface-variant truncate">
                    Impact déterminant pour diplôme ou contrat
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isImportant}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsImportant(!isImportant)
                }}
                className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 flex-shrink-0 ${
                  isImportant ? 'bg-primary' : 'bg-surface-variant'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full shadow-sm transition-transform transform ${
                    isImportant
                      ? 'bg-on-primary translate-x-5'
                      : 'bg-outline-variant translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs flex flex-col gap-3 transition-all relative overflow-hidden border border-outline-variant/15">
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${verdict.stripeClass}`} />

            <div className="flex items-center justify-between pl-1">
              <div className="flex flex-col">
                <span className="text-xs text-outline font-medium">Quadrant calculé</span>
                <h2 className={`font-bold text-sm sm:text-base ${verdict.titleClass}`}>
                  {verdict.title}
                </h2>
              </div>

              <div
                aria-label="Visualisation de la matrice 2x2"
                className="w-11 h-11 bg-surface-container rounded-lg p-1 flex items-center justify-center flex-shrink-0"
              >
                <svg className="w-full h-full" fill="none" viewBox="0 0 36 36">
                  <rect
                    x="2"
                    y="2"
                    width="14"
                    height="14"
                    rx="2"
                    className={`transition-colors ${
                      verdict.activeCell === 'q1' ? 'fill-secondary' : 'fill-surface-variant'
                    }`}
                  />
                  <rect
                    x="20"
                    y="2"
                    width="14"
                    height="14"
                    rx="2"
                    className={`transition-colors ${
                      verdict.activeCell === 'q2' ? 'fill-primary' : 'fill-surface-variant'
                    }`}
                  />
                  <rect
                    x="2"
                    y="20"
                    width="14"
                    height="14"
                    rx="2"
                    className={`transition-colors ${
                      verdict.activeCell === 'q3' ? 'fill-outline' : 'fill-surface-variant'
                    }`}
                  />
                  <rect
                    x="20"
                    y="20"
                    width="14"
                    height="14"
                    rx="2"
                    className={`transition-colors ${
                      verdict.activeCell === 'q4' ? 'fill-outline-variant' : 'fill-surface-variant'
                    }`}
                  />
                </svg>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-on-surface-variant pl-1">
              {verdict.desc}
            </p>

            <div className="pl-1 flex items-center gap-2 flex-wrap">
              <span
                className={`${verdict.pillClass} text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  priority_high
                </span>
                <span>{verdict.pillText}</span>
              </span>
              <span className="text-xs text-outline">
                Temps estimé conseillé : 45 min
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs flex flex-col gap-3 border border-outline-variant/15">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-outline uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                <span>Échéance & Alerte</span>
              </label>
              <span className="bg-secondary/10 text-secondary text-xs font-semibold px-2 py-0.5 rounded-full">
                J-0
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-surface-container py-2 px-3 rounded-lg flex items-center justify-between gap-2 text-left">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-on-surface">
                    {dueDateText}
                  </span>
                  <span className="text-xs text-secondary font-medium truncate">
                    {dueTimeText}
                  </span>
                </div>
                <input
                  type="date"
                  value={dueDateIso}
                  aria-label="Date d'échéance"
                  onChange={(e) => {
                    const val = e.target.value
                    setDueDateIso(val)
                    if (val) {
                      const [y, m, d] = val.split('-').map(Number)
                      setDueDateText(
                        new Date(y, m - 1, d).toLocaleDateString('fr-FR')
                      )
                    }
                  }}
                  className="bg-surface-container-lowest text-on-surface text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-outline-variant/20 outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => setHasReminder(!hasReminder)}
                className={`py-2.5 px-3 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors ${
                  hasReminder
                    ? 'bg-secondary-fixed text-on-secondary-fixed'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
                title="Rappel 1h avant l'échéance"
              >
                <span className="material-symbols-outlined text-[18px]">
                  notifications_active
                </span>
                <span>-1h</span>
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pt-1">
              <button
                type="button"
                onClick={() => {
                  const d = new Date()
                  d.setDate(d.getDate() + 1)
                  setDueDateIso(
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  )
                  setDueDateText('Demain')
                  setDueTimeText('09h00 (début de matinée)')
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-variant transition-colors cursor-pointer"
              >
                Demain 09h00
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date()
                  const day = d.getDay() || 7
                  const diff = 5 - day
                  d.setDate(d.getDate() + (diff >= 0 ? diff : 7 + diff))
                  setDueDateIso(
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  )
                  setDueDateText('Fin de semaine')
                  setDueTimeText('Vendredi 17h00')
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-variant transition-colors cursor-pointer"
              >
                Fin de semaine
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date()
                  const day = d.getDay() || 7
                  d.setDate(d.getDate() + (8 - day))
                  setDueDateIso(
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  )
                  setDueDateText('Lundi prochain')
                  setDueTimeText('Lundi 09h00')
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-variant transition-colors cursor-pointer"
              >
                Lundi prochain
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-outline uppercase">
              Statut de démarrage
            </label>
            <div className="bg-surface-container-high p-1 rounded-xl grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setStatus('todo')}
                className={`py-2 px-1 rounded-lg text-center text-xs sm:text-sm font-semibold transition-all ${
                  status === 'todo'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                    : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                À faire
              </button>
              <button
                type="button"
                onClick={() => setStatus('wip')}
                className={`py-2 px-1 rounded-lg text-center text-xs sm:text-sm font-semibold transition-all ${
                  status === 'wip'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                    : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                En cours
              </button>
              <button
                type="button"
                onClick={() => setStatus('done')}
                className={`py-2 px-1 rounded-lg text-center text-xs sm:text-sm font-semibold transition-all ${
                  status === 'done'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                    : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Terminé
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs flex flex-col gap-3 border border-outline-variant/15">
            <label
              className="flex items-start gap-3 cursor-pointer select-none"
              onClick={() => setIsShareEnabled(!isShareEnabled)}
            >
              <div className="pt-0.5">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    isShareEnabled ? 'bg-primary' : 'bg-surface-container'
                  }`}
                >
                  {isShareEnabled && (
                    <span className="material-symbols-outlined text-[16px] text-on-primary">
                      check
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-on-surface">
                  Notifier un collègue ou référent
                </span>
                <span className="text-xs text-on-surface-variant">
                  Envoie une synthèse directe de la tâche par e-mail
                </span>
              </div>
            </label>

            {isShareEnabled && (
              <div className="flex flex-col gap-1.5 pt-2 animate-in fade-in duration-150">
                <div className="bg-surface-container-low rounded-lg p-2.5 flex items-center gap-2 border border-outline-variant/20 focus-within:border-secondary">
                  <span className="material-symbols-outlined text-outline text-[18px]">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="tuteur@techcorp.fr ou referent@campus.fr"
                    className="bg-transparent text-xs sm:text-sm text-on-surface placeholder:text-outline-variant outline-none w-full"
                  />
                </div>
                <span className="text-[11px] text-outline pl-1">
                  Un lien sécurisé TaskFlow sera joint au récapitulatif.
                </span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="w-full bg-primary text-on-primary py-3.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">add_task</span>
              <span>Créer et intégrer à mon planning</span>
            </button>
            <p className="text-xs text-center text-outline pt-2">
              Raccourci : ⌘ + Entrée pour enregistrer instantanément
            </p>
          </div>
        </form>
      </main>
    </div>
  )
}
