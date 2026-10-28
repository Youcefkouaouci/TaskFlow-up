import { api } from '../api/client'

const ENABLE_REAL_API = true

export async function checkBackendHealth() {
  try {
    const res = await api.get('/health')
    return { online: true, status: res.status }
  } catch (err) {
    return { online: false, error: err.message }
  }
}

export async function loginUser(credentials) {
  if (ENABLE_REAL_API) {
    try {
      const data = await api.post('/auth/login', {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      })

      const user = {
        id: data.userId || 'usr-default',
        email: credentials.email.trim().toLowerCase(),
        name: credentials.email.split('@')[0],
        role: 'Alternant',
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('taskflow_token', data.token)
        localStorage.setItem('taskflow_user', JSON.stringify(user))
      }

      return { token: data.token, user }
    } catch (err) {
      if (err.status) {
        const error = new Error(err.message || 'Identifiants invalides')
        error.status = err.status
        throw error
      }

      console.warn('[authService] Erreur réseau, fallback simulation', err)
      return mockLocalLogin(credentials)
    }
  }

  return mockLocalLogin(credentials)
}

export async function registerUser(userData) {
  if (ENABLE_REAL_API) {
    try {
      const data = await api.post('/auth/register', {
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
      })

      const user = {
        id: data.userId || `usr-${Date.now()}`,
        email: userData.email.trim().toLowerCase(),
        name: userData.name || userData.email.split('@')[0],
        role: userData.role || 'Alternant',
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('taskflow_token', data.token)
        localStorage.setItem('taskflow_user', JSON.stringify(user))
      }

      return { token: data.token, user }
    } catch (err) {
      if (err.status) {
        const error = new Error(err.message || "Erreur lors de l'inscription")
        error.status = err.status
        if (err.status === 409) {
          error.fieldErrors = { email: 'Cet email est déjà associé à un compte' }
        }
        throw error
      }

      console.warn('[authService] Erreur réseau, fallback simulation', err)
      return mockLocalRegister(userData)
    }
  }

  return mockLocalRegister(userData)
}

export async function forgotPassword(email) {
  try {
    return await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
  } catch (err) {
    if (!err.status || err.status === 404) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ message: 'Instructions envoyées à votre adresse e-mail.' })
        }, 500)
      })
    }
    throw err
  }
}

export async function logoutUser() {
  localStorage.removeItem('token')
  localStorage.removeItem('taskflow_token')
  localStorage.removeItem('taskflow_user')
  return Promise.resolve()
}

export function getCurrentUser() {
  const stored = localStorage.getItem('taskflow_user')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  return null
}

function mockLocalLogin(credentials) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const { email, password } = credentials
      if (email.includes('invalide') || password.length < 8) {
        const err = new Error('Email ou mot de passe incorrect.')
        err.status = 401
        return reject(err)
      }
      const user = {
        id: 'usr-1',
        email,
        name: email.split('@')[0],
        role: 'Alternant Master 2',
      }
      const token = 'mock_jwt_token_local_taskflow'
      localStorage.setItem('token', token)
      localStorage.setItem('taskflow_token', token)
      localStorage.setItem('taskflow_user', JSON.stringify(user))
      resolve({ user, token })
    }, 600)
  })
}

function mockLocalRegister(userData) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const { name, email, role } = userData
      if (email === 'admin@taskflow.fr' || email.includes('deja-pris')) {
        const err = new Error('Cette adresse email est déjà associée à un compte.')
        err.status = 409
        err.fieldErrors = { email: 'Email déjà utilisé' }
        return reject(err)
      }
      const user = {
        id: `usr-${Date.now()}`,
        email,
        name,
        role: role || 'Alternant',
      }
      const token = `jwt_mock_${Date.now()}`
      localStorage.setItem('token', token)
      localStorage.setItem('taskflow_token', token)
      localStorage.setItem('taskflow_user', JSON.stringify(user))
      resolve({ user, token })
    }, 600)
  })
}
