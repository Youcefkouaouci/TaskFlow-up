
describe('Authentification', () => {
  describe('POST /api/auth/register', () => {
    test.todo('inscrit un utilisateur valide et renvoie un token JWT');
    test.todo('refuse un email déjà utilisé avec le code EMAIL_ALREADY_USED');
    test.todo('considère deux emails de casse différente comme identiques');
    test.todo('refuse un email invalide avec le code INVALID_INPUT');
    test.todo('refuse un mot de passe de moins de 8 caractères');
    test.todo('refuse une requête avec des champs obligatoires manquants');
    test.todo('ne renvoie jamais le mot de passe ni son hash');
  });

  describe('POST /api/auth/login', () => {
    test.todo('connecte un utilisateur avec des identifiants valides');
    test.todo('refuse un mot de passe incorrect avec le statut 401');
    test.todo('refuse un email inconnu avec le statut 401');
    test.todo('refuse un email invalide avec le statut 400');
    test.todo('refuse une requête avec des champs obligatoires manquants');
  });

  describe('Routes protégées par JWT', () => {
    test.todo('refuse une requête sans token avec le statut 401');
    test.todo('refuse un token JWT invalide avec le statut 401');
    test.todo('refuse un en-tête Bearer mal formé avec le statut 401');
    test.todo('refuse un token JWT expiré avec le statut 401');
  });
});
