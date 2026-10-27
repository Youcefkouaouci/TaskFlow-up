/**
 * ============================================================================
 * TaskFlow - Service d'Authentification (Auth API Service Layer)
 * ============================================================================
 * 
 * Ce module gère toutes les interactions avec les endpoints d'authentification JWT.
 * Architecture Orientée API (Hexagonale / REST).
 * 
 * CONTRATS D'ENDPOINTS BACKEND :
 * 
 * 1. CONNEXION UTILISATEUR :
 *    - Méthode : POST
 *    - Route : /api/auth/login
 *    - Payload JSON : { "email": string, "password": string }
 *    - Réponses HTTP :
 *      - 200 OK : { "token": "jwt_token_string", "user": { "id", "email", "name", "role" } }
 *      - 401 Unauthorized : { "error": "Email ou mot de passe incorrect." }
 *      - 422 Unprocessable Entity : { "errors": { "email": "Adresse invalide", "password": "8 caractères min" } }
 * 
 * 2. INSCRIPTION / CRÉATION DE COMPTE :
 *    - Méthode : POST
 *    - Route : /api/auth/register
 *    - Payload JSON : { "name": string, "email": string, "password": string, "role": string }
 *    - Réponses HTTP :
 *      - 201 Created : { "token": "jwt_token_string", "user": { "id", "email", "name", "role" } }
 *      - 409 Conflict : { "error": "Cette adresse email est déjà associée à un compte." }
 *      - 422 Unprocessable Entity : { "errors": { ... } }
 * 
 * 3. MOT DE PASSE OUBLIÉ :
 *    - Méthode : POST
 *    - Route : /api/auth/forgot-password
 *    - Payload JSON : { "email": string }
 *    - Réponse HTTP : 200 OK : { "message": "Email de réinitialisation transmis." }
 * 
 * 4. VÉRIFICATION DU TOKEN / PROFIL UTILISATEUR :
 *    - Méthode : GET
 *    - Route : /api/auth/me
 *    - Header : Authorization: Bearer <token>
 *    - Réponses HTTP :
 *      - 200 OK : { "user": { ... } }
 *      - 401 / 403 Forbidden : Session expirée
 * 
 * 5. DÉCONNEXION :
 *    - Méthode : POST
 *    - Route : /api/auth/logout
 * ============================================================================
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const ENABLE_REAL_API = false // Basculer à true quand le backend Express/Mongo sera connecté

/**
 * Connexion par e-mail et mot de passe
 * Endpoint cible : POST /api/auth/login
 */
export async function loginUser(credentials) {
  if (ENABLE_REAL_API) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      const error = new Error(errorData.error || 'Erreur lors de la connexion')
      error.status = res.status
      error.errors = errorData.errors
      throw error
    }

    const data = await res.json()
    localStorage.setItem('taskflow_token', data.token)
    return data
  }

  // Simulation locale avec validation
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const { email, password } = credentials

      // Simulation cas d'erreur identifiants
      if (email.includes('invalide') || password.length < 8) {
        const err = new Error('Email ou mot de passe incorrect.')
        err.status = 401
        err.fieldErrors = {
          email: !email.includes('@') ? 'Adresse email invalide' : null,
          password: password.length < 8 ? '8 caractères minimum' : null,
        }
        return reject(err)
      }

      const mockUser = {
        id: 'usr-1',
        email: email,
        name: 'Lucas Martin',
        role: 'Alternant Master 2',
      }
      const mockToken = 'mock_jwt_token_taskflow_xyz123'
      localStorage.setItem('taskflow_token', mockToken)
      resolve({ user: mockUser, token: mockToken })
    }, 700)
  })
}

/**
 * Inscription / Création de compte
 * Endpoint cible : POST /api/auth/register
 */
export async function registerUser(userData) {
  if (ENABLE_REAL_API) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      const error = new Error(errorData.error || "Erreur lors de l'inscription")
      error.status = res.status
      error.errors = errorData.errors
      throw error
    }

    const data = await res.json()
    localStorage.setItem('taskflow_token', data.token)
    return data
  }

  // Simulation locale avec validation
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const { name, email, password, role } = userData

      // Simulation email déjà existant
      if (email === 'admin@taskflow.fr' || email.includes('deja-pris')) {
        const err = new Error('Cette adresse email est déjà associée à un compte.')
        err.status = 409
        err.fieldErrors = { email: 'Email déjà utilisé' }
        return reject(err)
      }

      if (!name || name.trim().length < 2) {
        const err = new Error('Veuillez renseigner un nom complet valide.')
        err.status = 422
        err.fieldErrors = { name: '2 caractères minimum requis' }
        return reject(err)
      }

      if (!email.includes('@')) {
        const err = new Error('Adresse email invalide.')
        err.status = 422
        err.fieldErrors = { email: 'Adresse email invalide' }
        return reject(err)
      }

      if (password.length < 8) {
        const err = new Error('Le mot de passe doit comporter au moins 8 caractères.')
        err.status = 422
        err.fieldErrors = { password: '8 caractères minimum' }
        return reject(err)
      }

      const newUser = {
        id: `usr-${Date.now()}`,
        email: email,
        name: name,
        role: role || 'Alternant Master 2',
      }
      const mockToken = `jwt_${Date.now()}_taskflow`
      localStorage.setItem('taskflow_token', mockToken)
      resolve({ user: newUser, token: mockToken })
    }, 750)
  })
}

/**
 * Demande de réinitialisation de mot de passe
 * Endpoint cible : POST /api/auth/forgot-password
 */
export async function forgotPassword(email) {
  if (ENABLE_REAL_API) {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    return res.json()
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ message: 'Instructions envoyées à votre adresse e-mail.' })
    }, 500)
  })
}

/**
 * Déconnexion utilisateur
 * Endpoint cible : POST /api/auth/logout
 */
export async function logoutUser() {
  localStorage.removeItem('taskflow_token')
  return Promise.resolve()
}
