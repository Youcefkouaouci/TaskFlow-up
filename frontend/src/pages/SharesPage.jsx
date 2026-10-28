import { useState } from 'react'

const FREQUENT_CONTACTS = [
  {
    id: 'contact-1',
    name: 'Sarah D.',
    role: 'Mémoire',
    email: 'sarah.durand@etudiant-ecole.fr',
  },
  {
    id: 'contact-2',
    name: 'Alexandre M.',
    role: 'Tuteur',
    email: 'alexandre.martin@entreprise-corp.com',
  },
  {
    id: 'contact-3',
    name: 'Thomas L.',
    role: 'Groupe',
    email: 'thomas.lefevre@etudiant-ecole.fr',
  },
]

const INITIAL_HISTORY = [
  {
    id: 'hist-1',
    title: 'Compte-rendu réunion envoyé à Alex',
    context: 'Entreprise',
    dateText: 'Hier à 17h30',
    status: 'Remis',
    icon: 'check',
  },
  {
    id: 'hist-2',
    title: 'Maquettes UI envoyées à Thomas',
    context: 'École',
    dateText: 'Il y a 3 jours',
    status: 'Consulté',
    icon: 'done_all',
  },
]

export default function SharesPage({ onShowToast }) {
  const [recipientEmail, setRecipientEmail] = useState('sarah.durand@etudiant-ecole.fr')
  const [subject, setSubject] = useState(
    '[TaskFlow] Tâche assignée : Finaliser la partie Analyse Financière'
  )
  const [customNote, setCustomNote] = useState(
    "Salut Sarah, voici les éléments convenus pour notre rendu de jeudi. Peux-tu t'en charger ? Merci !"
  )
  const [sendCci, setSendCci] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [history, setHistory] = useState(INITIAL_HISTORY)

  function handleSelectContact(contact) {
    setRecipientEmail(contact.email)
  }

  async function handleSendEmail(e) {
    if (e) e.preventDefault()
    if (!recipientEmail || isSending) return

    setIsSending(true)

    setTimeout(() => {
      setIsSending(false)
      const recipientName =
        FREQUENT_CONTACTS.find((c) => c.email === recipientEmail)?.name || recipientEmail

      const newHistoryItem = {
        id: `hist-${Date.now()}`,
        title: `Délégation transmise à ${recipientName}`,
        context: 'École',
        dateText: "À l'instant",
        status: 'Envoyé',
        icon: 'check',
      }
      setHistory((prev) => [newHistoryItem, ...prev])

      onShowToast?.(`Email transmis avec succès à ${recipientName} !`)
    }, 850)
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
          <span className="text-xs text-outline font-medium">MVP v1.4</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
          Partager une tâche par email
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          Envoyez un récapitulatif clair et structuré sans dispersion ni perte
          d'alignement.
        </p>
      </div>

      <section className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md flex flex-col gap-space-sm relative overflow-hidden border border-outline-variant/15">
        <div className="flex items-center justify-between gap-space-sm flex-wrap">
          <div className="flex items-center gap-space-xs">
            <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-semibold">
              École · Master 2
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              DÉLÉGUER
            </span>
          </div>
          <span className="text-[11px] text-outline flex items-center gap-0.5 font-medium">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            29 oct. 14h
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm sm:text-base font-bold text-on-surface">
            Finaliser la partie Analyse Financière du mémoire de groupe
          </h2>
          <div className="flex items-center gap-space-sm pt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-lg">
              <span className="material-symbols-outlined text-[14px] text-secondary">
                hourglass_empty
              </span>
              Statut : À faire
            </span>
            <span className="text-xs text-outline">
              Livrable requis : Tableaux Excel + Synthèse
            </span>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md flex flex-col gap-space-md border border-outline-variant/15">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
          <span className="text-xs sm:text-sm font-bold text-on-surface">
            Paramètres du transfert
          </span>
          <span className="text-xs font-semibold text-secondary">Étape 1 sur 2</span>
        </div>

        <div className="flex flex-col gap-space-xs">
          <label
            htmlFor="recipient-email"
            className="text-xs font-semibold text-on-surface-variant"
          >
            Email du camarade ou collègue
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
              placeholder="nom@ecole-ou-entreprise.fr"
              className="w-full bg-surface-container-low text-on-surface text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-transparent focus:border-secondary focus:bg-surface-container transition-colors outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] text-outline font-medium">
              Contacts fréquents en alternance :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENT_CONTACTS.map((contact) => {
                const isSelected = recipientEmail === contact.email
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelectContact(contact)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all ${
                      isSelected
                        ? 'bg-surface-container text-on-surface shadow-xs border border-outline-variant/30'
                        : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    )}
                    <span>
                      {contact.name} ({contact.role})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-space-xs">
          <label
            htmlFor="email-subject"
            className="text-xs font-semibold text-on-surface-variant"
          >
            Objet du mail généré
          </label>
          <input
            id="email-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
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
            <span className="text-[11px] text-outline">Modifiable</span>
          </div>
          <textarea
            id="custom-note"
            rows="3"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full bg-surface-container-low text-on-surface text-xs sm:text-sm p-3 rounded-xl border border-transparent focus:border-secondary focus:bg-surface-container transition-colors outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-semibold text-on-surface">
              M'envoyer une copie en CCI
            </span>
            <span className="text-xs text-outline">
              Garder une trace dans votre boîte académique
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

      <section className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-outline">
              visibility
            </span>
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
              Aperçu du rendu destinataire
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
            <span className="text-xs font-bold text-secondary">URGENT</span>
          </div>

          <div className="bg-surface-container p-3 rounded-lg flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">
                chat_bubble_outline
              </span>
              Message de Lucas (Alternant) :
            </div>
            <p className="text-xs text-on-surface italic">
              {customNote ? `« ${customNote} »` : "« (Aucun message d'accompagnement saisi) »"}
            </p>
          </div>

          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary">
                CADRAN II : DÉLÉGUER
              </span>
              <span className="text-xs text-outline">Échéance : 29 Octobre · 14h00</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-on-surface">
              Finaliser la partie Analyse Financière du mémoire de groupe
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-on-surface-variant">
                Contexte : Master 2 Management
              </span>
              <span className="text-[11px] px-2 py-0.5 bg-surface-container-high rounded-full text-on-surface">
                Statut : Non entamé
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-outline">
              Généré via TaskFlow Workspace
            </span>
            <span className="text-[11px] font-semibold text-on-surface underline cursor-pointer">
              Ouvrir dans le navigateur
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={handleSendEmail}
          disabled={isSending || !recipientEmail}
          className="w-full h-12 bg-secondary hover:bg-[#a01f29] active:bg-[#8b1a23] text-on-secondary rounded-xl font-semibold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">
                refresh
              </span>
              <span>Envoi en cours via SendGrid...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">send</span>
              <span>Envoyer par email (via API SendGrid)</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-center">
          <span className="material-symbols-outlined text-[14px] text-outline">
            verified_user
          </span>
          <span className="text-xs text-outline">
            Protocole SMTP crypté · Synchro instantanée avec la Matrice
          </span>
        </div>
      </div>

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
            {history.length} envois cette semaine
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
                    {item.context} · {item.dateText} · {item.status}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-outline flex-shrink-0">
                {item.icon}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
