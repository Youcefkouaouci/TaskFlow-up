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
    const data = await api.post('/auth/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    })

    const user = {
      id: data.user?.id || data.userId,
      email: credentials.email.trim().toLowerCase(),
      name: credentials.email.split('@')[0],
      role: 'Alternant',
    }

    if (data.token) {
      localStorage.setItem('taskflow_token', data.token)
      localStorage.setItem('taskflow_user', JSON.stringify(user))
    }

    return { token: data.token, user }
  }

  return mockLocalLogin(credentials)
}

export async function registerUser(userData) {
  if (ENABLE_REAL_API) {
    const data = await api.post('/auth/register', {
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
    })

    const user = {
      id: data.user?.id || data.userId,
      email: userData.email.trim().toLowerCase(),
      name: userData.name || userData.email.split('@')[0],
      role: userData.role || 'Alternant',
    }

    if (data.token) {
      localStorage.setItem('taskflow_token', data.token)
      localStorage.setItem('taskflow_user', JSON.stringify(user))
    }

    return { token: data.token, user }
  }

  return mockLocalRegister(userData)
}

export async function forgotPassword(email) {
  if (!email) throw new Error('Adresse e-mail requise')
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ message: 'Instructions envoyées à votre adresse e-mail.' })
    }, 500)
  })
}

export async function logoutUser() {
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
      localStorage.setItem('taskflow_token', token)
      localStorage.setItem('taskflow_user', JSON.stringify(user))
      resolve({ user, token })
    }, 600)
  })
}
