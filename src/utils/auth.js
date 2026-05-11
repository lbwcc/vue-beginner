import pinia from '@/stores'
import { useAuthStore } from '@/stores/auth'

const TOKEN_KEY = 'lb-auth-token'
const USER_KEY = 'lb-auth-user'

const safeJsonParse = (raw) => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

const toStableUserId = (username) => {
  if (!username) return ''
  return `u_${encodeURIComponent(String(username)).replace(/%/g, '').toLowerCase()}`
}

export const getAuthToken = () => {
  try {
    const authStore = useAuthStore(pinia)
    if (authStore.token) return authStore.token
  } catch {
    // ignore
  }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) return token
  return ''
}

export const getCurrentAccount = () => {
  try {
    const authStore = useAuthStore(pinia)
    if (authStore.currentAccount?.username) {
      return authStore.currentAccount
    }
  } catch {
    // ignore
  }

  const user = safeJsonParse(localStorage.getItem(USER_KEY))

  if (user && user.username) {
    return {
      id: user.id || toStableUserId(user.username),
      username: user.username,
      avatar: user.avatar || '👤',
      source: 'lb-auth'
    }
  }

  return null
}

export const setAuthSession = ({ token, user }) => {
  try {
    const authStore = useAuthStore(pinia)
    authStore.setSession({ token, user })
    return
  } catch {
    // ignore and fallback to storage
  }

  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  }

  if (user && user.username) {
    const normalizedUser = {
      id: user.id || toStableUserId(user.username),
      username: user.username,
      avatar: user.avatar || '👤'
    }
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser))
  }
}

export const clearAuthSession = () => {
  try {
    const authStore = useAuthStore(pinia)
    authStore.clearSession()
    return
  } catch {
    // ignore and fallback to storage
  }

  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem('calendar-token')
  localStorage.removeItem('calendar-token-user')
}

export const isLoggedIn = () => {
  return !!(getAuthToken() && getCurrentAccount()?.username)
}

export const isFrontendAdmin = () => {
  return getCurrentAccount()?.username === 'lbwcc'
}
