
describe('Gestion des tâches', () => {
  describe('Authentification', () => {
    test.todo('refuse de lister les tâches sans token JWT');
    test.todo('refuse de créer une tâche sans token JWT');
    test.todo('refuse de modifier une tâche sans token JWT');
    test.todo('refuse de supprimer une tâche sans token JWT');
  });

  describe('POST /api/tasks', () => {
    test.todo('crée une tâche valide et renvoie le statut 201');
    test.todo('refuse un titre vide');
    test.todo('refuse un titre composé uniquement d’espaces');
    test.todo('refuse un titre de plus de 120 caractères');
    test.todo('refuse un statut invalide');
    test.todo('refuse une description de plus de 1000 caractères');
    test.todo('refuse une date invalide');
    test.todo('accepte une date facultative à null');
    test.todo('refuse les champs id et ownerId fournis par le client');
  });

  describe('GET /api/tasks', () => {
    test.todo('renvoie uniquement les tâches de l’utilisateur connecté');
    test.todo('renvoie une liste vide si aucune tâche n’existe');
  });

  describe('GET /api/tasks/:id', () => {
    test.todo('renvoie une tâche existante appartenant à l’utilisateur');
    test.todo('renvoie 404 pour une tâche inexistante');
    test.todo('renvoie 400 pour un identifiant mal formé');
    test.todo('empêche un utilisateur de lire la tâche d’un autre');
    test.todo('renvoie 404 pour une tâche appartenant à un autre utilisateur');
  });

  describe('PATCH /api/tasks/:id', () => {
    test.todo('modifie partiellement une tâche');
    test.todo('refuse une modification vide');
    test.todo('refuse un champ inconnu');
    test.todo('refuse les champs id et ownerId');
    test.todo('refuse une modification avec des données invalides');
    test.todo('empêche un utilisateur de modifier la tâche d’un autre');
    test.todo('renvoie 404 pour une tâche appartenant à un autre utilisateur');
  });

  describe('DELETE /api/tasks/:id', () => {
    test.todo('supprime une tâche et renvoie 204 sans corps');
    test.todo('renvoie 404 lors de la lecture d’une tâche supprimée');
    test.todo('renvoie 404 lors de la suppression d’une tâche inexistante');
    test.todo('empêche un utilisateur de supprimer la tâche d’un autre');
  });

  describe('Persistance', () => {
    test.todo('conserve les tâches après un redémarrage de l’API');
  });
});
