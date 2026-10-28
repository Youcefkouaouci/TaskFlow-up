import { useState, useMemo } from 'react'
import { delegateTask } from '../services/taskService'

const CONTACTS_KEY = 'taskflow_recent_contacts'
const HISTORY_KEY = 'taskflow_share_history'

function loadFromStorage(key) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : []
  } catch {
    return []
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage errors
  }
}

export default function SharesPage({ tasks = [], currentUser, onShowToast }) {
  const [chosenTaskId, setChosenTaskId] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [customNote, setCustomNote] = useState('')
  const [sendCci, setSendCci] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [recentContacts, setRecentContacts] = useState(() => loadFromStorage(CONTACTS_KEY))
  const [history, setHistory] = useState(() => loadFromStorage(HISTORY_KEY))

  const selectedTask = useMemo(() => {
    if (chosenTaskId) {
      const found = tasks.find((t) => t.id === chosenTaskId)
      if (found) return found
    }
    const q3 = tasks.find((t) => t.quadrant === 3)
    return q3 || tasks[0] || null
  }, [tasks, chosenTaskId])

  const subject = customSubject !== '' ? customSubject : (selectedTask ? `[TaskFlow - Délégation] ${selectedTask.title}` : '')

  async function handleSendEmail(e) {
    if (e) e.preventDefault()
    if (!recipientEmail.trim() || isSending || !selectedTask) return

    setIsSending(true)

    try {
      await delegateTask(selectedTask.id, {
        title: selectedTask.title,
        delegateTo: recipientEmail.trim(),
      })

      const now = new Date()
      const dateText = now.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })

      const newHistoryItem = {
        id: `hist-${Date.now()}`,
        title: `Délégation : ${selectedTask.title}`,
        context: selectedTask.context || 'Entreprise',
        dateText,
        status: 'Transmis',
        recipient: recipientEmail.trim(),
        icon: 'forward_to_inbox',
      }

      const updatedHistory = [newHistoryItem, ...history.slice(0, 19)]
      setHistory(updatedHistory)
      saveToStorage(HISTORY_KEY, updatedHistory)

      if (!recentContacts.includes(recipientEmail.trim())) {
        const updatedContacts = [recipientEmail.trim(), ...recentContacts.slice(0, 5)]
        setRecentContacts(updatedContacts)
        saveToStorage(CONTACTS_KEY, updatedContacts)
      }

      setCustomNote('')
      onShowToast?.(`Délégation transmise à ${recipientEmail} !`)
    } catch (err) {
      console.error(err)
      onShowToast?.('Impossible d’ouvrir le client de messagerie.')
    } finally {
      setIsSending(false)
    }
  }

  const quadrantLabels = {
    1: 'Q1 : FAIRE',
    2: 'Q2 : PLANIFIER',
    3: 'Q3 : DÉLÉGUER',
    4: 'Q4 : ÉLIMINER',
  }

  return (
    <div className="flex flex-col w-full pb-28 max-w-2xl mx-auto px-gutter pt-space-md gap-space-lg">
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[20px] text-secondary">
              mark_email_read
            </span>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">
              Transmission Directe
            </span>
          </div>
          <span className="text-xs text-outline font-medium">TaskFlow</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
          Partager une tâche par email
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          Déléguez une tâche issue de votre base de données avec récapitulatif clair.
        </p>
      </div>

      {tasks.length > 0 && selectedTask ? (
        <section className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md flex flex-col gap-space-sm relative overflow-hidden border border-outline-variant/15">
          <div className="flex items-center justify-between gap-space-sm flex-wrap">
            <div className="flex items-center gap-space-xs">
              <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-semibold">
                {selectedTask.context || 'Entreprise'}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                {quadrantLabels[selectedTask.quadrant] || 'DÉLÉGUER'}
              </span>
            </div>
            {(selectedTask.dueDate || selectedTask.deadline) && (
              <span className="text-[11px] text-outline flex items-center gap-0.5 font-medium">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                {selectedTask.dueDate || selectedTask.deadline}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="task-select" className="text-[11px] font-semibold text-outline uppercase">
              Tâche sélectionnée dans la BDD :
            </label>
            <select
              id="task-select"
              value={selectedTask?.id || ''}
              onChange={(e) => setChosenTaskId(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface text-xs sm:text-sm p-2.5 rounded-xl border border-outline-variant/20 outline-none focus:border-secondary font-semibold"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  [{quadrantLabels[t.quadrant]?.slice(0, 2) || 'Q'}] {t.title} ({t.context || 'Général'})
                </option>
              ))}
            </select>
            {selectedTask.description && (
              <p className="text-xs text-on-surface-variant pt-1 italic">
                {selectedTask.description}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-surface-container-lowest rounded-xl p-space-lg text-center border border-outline-variant/15 flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-[32px] text-outline">
            inbox
          </span>
          <p className="text-xs sm:text-sm font-semibold text-on-surface">
            Aucune tâche disponible dans la base de données
          </p>
          <p className="text-xs text-outline max-w-xs">
            Créez une tâche dans la matrice pour pouvoir la déléguer et la partager.
          </p>
        </section>
      )}

      {selectedTask && (
        <section className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md flex flex-col gap-space-md border border-outline-variant/15">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
            <span className="text-xs sm:text-sm font-bold text-on-surface">
              Paramètres du transfert
            </span>
            <span className="text-xs font-semibold text-secondary">Délégation</span>
          </div>

          <div className="flex flex-col gap-space-xs">
            <label
              htmlFor="recipient-email"
              className="text-xs font-semibold text-on-surface-variant"
            >
              Email du destinataire *
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined text-[18px] text-outline absolute left-3 pointer-events-none">
                alternate_email
              </span>
              <input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="ex: collegue@entreprise.com ou tuteur@email.fr"
                className="w-full bg-surface-container-low text-on-surface text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-transparent focus:border-secondary focus:bg-surface-container transition-colors outline-none"
                required
              />
            </div>

            {recentContacts.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] text-outline font-medium">
                  Destinataires récents :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {recentContacts.map((email) => {
                    const isSelected = recipientEmail === email
                    return (
                      <button
                        key={email}
                        type="button"
                        onClick={() => setRecipientEmail(email)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all ${
                          isSelected
                            ? 'bg-surface-container text-on-surface shadow-xs border border-outline-variant/30'
                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        )}
                        <span>{email}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-space-xs">
            <label
              htmlFor="email-subject"
              className="text-xs font-semibold text-on-surface-variant"
            >
              Objet du mail
            </label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="[TaskFlow - Délégation] Intitulé de la tâche"
              className="w-full bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-transparent focus:border-secondary focus:bg-surface-container transition-colors outline-none"
            />
          </div>

          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <label
                htmlFor="custom-note"
                className="text-xs font-semibold text-on-surface-variant"
              >
                Note d'accompagnement
              </label>
              <span className="text-[11px] text-outline">Optionnel</span>
            </div>
            <textarea
              id="custom-note"
              rows="3"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Bonjour, je te délègue cette tâche..."
              className="w-full bg-surface-container-low text-on-surface text-xs sm:text-sm p-3 rounded-xl border border-transparent focus:border-secondary focus:bg-surface-container transition-colors outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-semibold text-on-surface">
                Copie en CCI
              </span>
              <span className="text-xs text-outline">
                Garder une trace dans votre messagerie
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sendCci}
              onClick={() => setSendCci(!sendCci)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 ${
                sendCci ? 'bg-secondary' : 'bg-surface-container-high'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-on-secondary shadow-sm transition-transform transform ${
                  sendCci ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>
      )}

      {selectedTask && (
        <section className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-outline">
                visibility
              </span>
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
                Aperçu du message
              </span>
            </div>
            <span className="text-[11px] font-semibold text-secondary">
              Format Standardisé
            </span>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-xs p-4 flex flex-col gap-3 border border-outline-variant/15 text-xs sm:text-sm">
            <div className="flex items-center justify-between bg-surface-container-low p-2.5 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-bold text-on-surface tracking-tight">TaskFlow</span>
                <span className="text-xs text-outline">· Notification de délégation</span>
              </div>
              <span className="text-xs font-bold text-secondary">
                {quadrantLabels[selectedTask.quadrant] || 'DÉLÉGATION'}
              </span>
            </div>

            <div className="bg-surface-container p-3 rounded-lg flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">
                  chat_bubble_outline
                </span>
                Message de {currentUser?.name || 'Lucas'} :
              </div>
              <p className="text-xs text-on-surface italic">
                {customNote ? `« ${customNote} »` : "« (Aucun message d'accompagnement saisi) »"}
              </p>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary">
                  TÂCHE : {selectedTask.title}
                </span>
                {(selectedTask.dueDate || selectedTask.deadline) && (
                  <span className="text-xs text-outline">
                    Échéance : {selectedTask.dueDate || selectedTask.deadline}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-on-surface">
                {selectedTask.title}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-on-surface-variant">
                  Contexte : {selectedTask.context || 'Entreprise'}
                </span>
                <span className="text-[11px] px-2 py-0.5 bg-surface-container-high rounded-full text-on-surface">
                  Statut : {selectedTask.status === 'done' ? 'Terminé' : 'À traiter'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {selectedTask && (
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleSendEmail}
            disabled={isSending || !recipientEmail.trim()}
            className="w-full h-12 bg-secondary hover:bg-[#a01f29] active:bg-[#8b1a23] text-on-secondary rounded-xl font-semibold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  refresh
                </span>
                <span>Délégation en cours...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">send</span>
                <span>Déléguer la tâche par email</span>
              </>
            )}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-space-xs pt-space-xs">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-outline">
                history
              </span>
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
                Dernières délégations
              </span>
            </div>
            <span className="text-[11px] text-outline">
              {history.length} envoi{history.length > 1 ? 's' : ''} enregistré{history.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-surface-container-lowest rounded-xl shadow-xs p-3 flex items-center justify-between gap-space-sm border border-outline-variant/15"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 text-on-surface">
                    <span className="material-symbols-outlined text-[18px]">
                      forward_to_inbox
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-semibold text-on-surface truncate">
                      {item.title}
                    </span>
                    <span className="text-xs text-outline">
                      {item.context} · {item.recipient} · {item.dateText}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-outline flex-shrink-0">
                  check
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
