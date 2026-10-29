import { api } from '../api/client'

export async function checkBackendHealth() {
  try {
    const res = await api.get('/health')
    return { online: true, status: res.status }
  } catch (err) {
    return { online: false, error: err.message }
  }
}

export async function loginUser(credentials) {
  const data = await api.post('/auth/login', {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
  })

  const user = {
    id: data.user?.id || data.userId,
    email: credentials.email.trim().toLowerCase(),
    name: data.user?.name || data.name || credentials.email.split('@')[0],
    avatarUrl: data.user?.avatarUrl || data.avatarUrl || null,
    role: 'Alternant',
  }

  if (data.token) {
    localStorage.setItem('token', data.token)
    localStorage.setItem('taskflow_token', data.token)
    localStorage.setItem('taskflow_user', JSON.stringify(user))
  }

  return { token: data.token, user }
}

export async function registerUser(userData) {
  try {
    const data = await api.post('/auth/register', {
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      name: userData.name || userData.email.split('@')[0],
    })

    const user = {
      id: data.user?.id || data.userId,
      email: credentialsEmail(userData.email),
      name: data.user?.name || data.name || userData.name || userData.email.split('@')[0],
      avatarUrl: data.user?.avatarUrl || data.avatarUrl || null,
      role: userData.role || 'Alternant',
    }

    if (data.token) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('taskflow_token', data.token)
      localStorage.setItem('taskflow_user', JSON.stringify(user))
    }

    return { token: data.token, user }
  } catch (err) {
    if (err.status === 409) {
      err.fieldErrors = { email: 'Cet email est déjà associé à un compte' }
    }
    throw err
  }
}

function credentialsEmail(email) {
  return email ? email.trim().toLowerCase() : ''
}

export async function forgotPassword(email) {
  return await api.post('/auth/forgot-password', {
    email: email.trim().toLowerCase(),
  })
}

export async function resetPassword({ token, password }) {
  const raw = token ? token.trim() : ''
  const match = raw.match(/token=([a-f0-9]+)/i)
  const cleanToken = match ? match[1] : raw

  const data = await api.post('/auth/reset-password', {
    token: cleanToken,
    password,
  })

  const user = {
    id: data.user?.id || data.userId,
    email: data.user?.email || '',
    name: data.user?.name || data.name || 'Utilisateur',
    avatarUrl: data.user?.avatarUrl || data.avatarUrl || null,
    role: 'Alternant',
  }

  if (data.token) {
    localStorage.setItem('token', data.token)
    localStorage.setItem('taskflow_token', data.token)
    localStorage.setItem('taskflow_user', JSON.stringify(user))
  }

  return { token: data.token, user, message: data.message }
}

export async function updateUserProfile({ name, currentPassword, newPassword }) {
  const payload = {}
  if (name !== undefined) payload.name = name.trim()
  if (newPassword) {
    payload.currentPassword = currentPassword
    payload.newPassword = newPassword
  }

  const data = await api.patch('/auth/profile', payload)
  const existing = getCurrentUser() || {}
  const user = {
    ...existing,
    id: data.user?.id || data.userId || existing.id,
    email: data.user?.email || existing.email || '',
    name: data.user?.name || data.name || name || existing.name || 'Alternant',
    avatarUrl:
      data.user?.avatarUrl !== undefined
        ? data.user.avatarUrl
        : existing.avatarUrl || null,
    role: existing.role || 'Alternant (Entreprise & École)',
  }

  if (data.token) {
    localStorage.setItem('token', data.token)
    localStorage.setItem('taskflow_token', data.token)
  }
  localStorage.setItem('taskflow_user', JSON.stringify(user))

  return { user, message: data.message }
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
