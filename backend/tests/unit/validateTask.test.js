
const { validateTask } = require('../../src/domain/task/validateTask');

describe('validateTask', () => {
  // Cas nominaux
  test('accepte une tâche valide', () => {
    const task = {
      title: 'Réviser JavaScript',
      status: 'todo',
      description: 'Réviser les fonctions',
      dueDate: '2026-12-29',
    };

    expect(validateTask(task)).toEqual([]);
  });

  test('accepte les trois statuts autorisés', () => {
    for (const status of ['todo', 'doing', 'done']) {
      expect(
        validateTask({ title: 'Ma tâche', status })
      ).toEqual([]);
    }
  });

  test('accepte une date valide', () => {
    expect(
      validateTask({
        title: 'Ma tâche',
        status: 'todo',
        dueDate: '2026-12-29',
      })
    ).toEqual([]);
  });

  test('accepte une date facultative à null', () => {
    expect(
      validateTask({
        title: 'Ma tâche',
        status: 'todo',
        dueDate: null,
      })
    ).toEqual([]);
  });

  test('accepte une description vide', () => {
    expect(
      validateTask({
        title: 'Ma tâche',
        status: 'todo',
        description: '',
      })
    ).toEqual([]);
  });

  test('accepte une description de 1000 caractères', () => {
    expect(
      validateTask({
        title: 'Ma tâche',
        status: 'todo',
        description: 'a'.repeat(1000),
      })
    ).toEqual([]);
  });

  test('accepte un titre de 120 caractères', () => {
    expect(
      validateTask({
        title: 'a'.repeat(120),
        status: 'todo',
      })
    ).toEqual([]);
  });

  test('accepte un titre entouré d’espaces si son contenu est valide', () => {
    expect(
      validateTask({
        title: '  Ma tâche  ',
        status: 'todo',
      })
    ).toEqual([]);
  });

  // Validation du titre
  test('refuse un titre vide', () => {
    expect(
      validateTask({ title: '', status: 'todo' })
    ).toContain('Le titre doit contenir entre 1 et 120 caractères.');
  });

  test('refuse un titre composé uniquement d’espaces', () => {
    expect(
      validateTask({ title: '   ', status: 'todo' })
    ).toContain('Le titre doit contenir entre 1 et 120 caractères.');
  });

  test('refuse un titre absent', () => {
    expect(
      validateTask({ status: 'todo' })
    ).toContain('Le titre doit contenir entre 1 et 120 caractères.');
  });

  test('refuse un titre trop long', () => {
    expect(
      validateTask({ title: 'a'.repeat(121), status: 'todo' })
    ).toContain('Le titre doit contenir entre 1 et 120 caractères.');
  });

  test('refuse un titre qui n’est pas une chaîne', () => {
    expect(
      validateTask({ title: 123, status: 'todo' })
    ).toContain('Le titre doit contenir entre 1 et 120 caractères.');
  });

  // Validation du statut
  test('refuse un statut invalide', () => {
    expect(
      validateTask({ title: 'Ma tâche', status: 'invalid' })
    ).toContain('Le statut doit être todo, doing ou done.');
  });

  test('refuse un statut absent', () => {
    expect(
      validateTask({ title: 'Ma tâche' })
    ).toContain('Le statut doit être todo, doing ou done.');
  });

  // Validation de la description
  test('refuse une description trop longue', () => {
    expect(
      validateTask({
        title: 'Ma tâche',
        status: 'todo',
        description: 'a'.repeat(1001),
      })
    ).toContain('La description doit contenir au maximum 1000 caractères.');
  });

  test('refuse une description qui n’est pas une chaîne', () => {
    expect(
      validateTask({
        title: 'Ma tâche',
        status: 'todo',
        description: 123,
      })
    ).toContain('La description doit contenir au maximum 1000 caractères.');
  });

  // Validation de la date
  test('refuse une date inexistante', () => {
    expect(
      validateTask({
        title: 'Ma tâche',
        status: 'todo',
        dueDate: '2026-02-30',
      })
    ).toContain('La date doit être une date valide au format YYYY-MM-DD.');
  });

  test('refuse une date au mauvais format', () => {
    expect(
      validateTask({
        title: 'Ma tâche',
        status: 'todo',
        dueDate: '29/12/2026',
      })
    ).toContain('La date doit être une date valide au format YYYY-MM-DD.');
  });

  test('refuse une date qui n’est pas une chaîne ni null', () => {
    expect(
      validateTask({
        title: 'Ma tâche',
        status: 'todo',
        dueDate: 20261229,
      })
    ).toContain('La date doit être une date valide au format YYYY-MM-DD.');
  });

  // Validation générale des données
  test('refuse des données absentes', () => {
    expect(validateTask(null)).toEqual([
      'Les données de la tâche sont invalides.',
    ]);
  });

  test('refuse un tableau à la place des données', () => {
    expect(validateTask([])).toEqual([
      'Les données de la tâche sont invalides.',
    ]);
  });

  test('refuse une chaîne à la place des données', () => {
    expect(validateTask('ma tâche')).toEqual([
      'Les données de la tâche sont invalides.',
    ]);
  });
});
