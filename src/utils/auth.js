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
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) return token
  return ''
}

export const getCurrentAccount = () => {
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
