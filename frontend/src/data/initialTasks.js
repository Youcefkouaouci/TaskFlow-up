/**
 * initialTasks.js
 * Données d'exemple (mock) conformes à la maquette TaskFlow.
 * 
 * --------------------------------------------------------------------------
 * NOTE API BACKEND :
 * Lorsque le backend sera connecté, ces données seront remplacées par un appel
 * GET sur l'endpoint :
 * -> GET /api/tasks
 * Avec éventuellement des paramètres de filtrage :
 * -> GET /api/tasks?context=Entreprise
 * --------------------------------------------------------------------------
 */

export const INITIAL_TASKS = [
  // --- QUADRANT 1 : FAIRE (Urgent & Important) ---
  {
    id: 'task-1',
    title: 'Livrable sprint : Maquettes API livret',
    quadrant: 1, // 1 = Faire
    context: 'Entreprise',
    tag: 'Entreprise',
    deadline: "Aujourd'hui 17h",
    deadlineType: 'urgent', // badge rouge avec icône horloge
    status: 'En cours',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Préparer point hebdo avec tuteur',
    quadrant: 1,
    context: 'Entreprise',
    tag: 'Entreprise',
    deadline: 'Demain',
    deadlineType: 'warning', // badge rouge avec icône calendrier
    status: 'À faire',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Valider fiche de présence CFA d\'octobre',
    quadrant: 1,
    context: 'Entreprise',
    tag: 'Admin / RH',
    deadline: null,
    deadlineType: null,
    status: 'Urgent',
    completed: false,
    createdAt: new Date().toISOString(),
  },

  // --- QUADRANT 2 : PLANIFIER (Important & Non urgent) ---
  {
    id: 'task-4',
    title: 'Rédiger mémoire pro : Chapitre 2',
    quadrant: 2, // 2 = Planifier
    context: 'École',
    tag: 'École',
    deadline: '12 nov.',
    deadlineType: 'neutral', // icône calendrier neutre
    status: 'À faire',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-5',
    title: 'Veille tech React 19 pour l\'équipe',
    quadrant: 2,
    context: 'Entreprise',
    tag: 'Entreprise',
    deadline: 'Fin du mois',
    deadlineType: 'repeat', // icône repeat
    status: null,
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-6',
    title: 'Préparer soutenance mi-parcours',
    quadrant: 2,
    context: 'École',
    tag: 'École',
    deadline: '28 nov.',
    deadlineType: 'neutral',
    status: null,
    completed: false,
    createdAt: new Date().toISOString(),
  },

  // --- QUADRANT 3 : DÉLÉGUER (Urgent & Non important) ---
  {
    id: 'task-7',
    title: 'Compte-rendu réunion groupe compta',
    quadrant: 3, // 3 = Déléguer
    context: 'École',
    tag: 'École',
    delegateTo: 'Binôme Maxime',
    actionType: 'share', // icône avion/partage
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-8',
    title: 'Relancer devis imprimeur BDE',
    quadrant: 3,
    context: 'École',
    tag: 'École',
    delegateTo: 'Resp. Trésorerie',
    actionType: 'mail', // icône email
    completed: false,
    createdAt: new Date().toISOString(),
  },

  // --- QUADRANT 4 : ÉLIMINER (Ni urgent ni important) ---
  {
    id: 'task-9',
    title: 'Trier boîte mail secondaire',
    quadrant: 4, // 4 = Éliminer
    context: 'Entreprise',
    tag: null,
    actionType: 'delete', // icône corbeille / suppression
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-10',
    title: 'Veille superflue forums tech',
    quadrant: 4,
    context: 'Entreprise',
    tag: null,
    actionType: 'delete',
    completed: false,
    createdAt: new Date().toISOString(),
  },
]
