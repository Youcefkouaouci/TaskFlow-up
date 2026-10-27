
const ALLOWED_STATUSES = ['todo', 'doing', 'done'];

function validateTask(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['Les données de la tâche sont invalides.'];
  }

  // Le titre est obligatoire, entre 1 et 120 caractères
  if (
    typeof data.title !== 'string' ||
    data.title.trim().length < 1 ||
    data.title.trim().length > 120
  ) {
    errors.push('Le titre doit contenir entre 1 et 120 caractères.');
  }

  // Le statut doit être todo, doing ou done
  if (!ALLOWED_STATUSES.includes(data.status)) {
    errors.push('Le statut doit être todo, doing ou done.');
  }

  // La description est facultative, avec 1000 caractères maximum
  if (
    data.description !== undefined &&
    (typeof data.description !== 'string' || data.description.length > 1000)
  ) {
    errors.push('La description doit contenir au maximum 1000 caractères.');
  }

  // La date est facultative, au format YYYY-MM-DD, ou null
  if (data.dueDate !== undefined && data.dueDate !== null) {
    if (
      typeof data.dueDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate) ||
      !isValidDate(data.dueDate)
    ) {
      errors.push('La date doit être une date valide au format YYYY-MM-DD.');
    }
  }

  return errors;
}

function isValidDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

module.exports = { validateTask };
