import { defineStore } from 'pinia'

const TOKEN_KEY = 'lb-auth-token'
const USER_KEY = 'lb-auth-user'

const safeJsonParse = (raw) => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const toStableUserId = (username) => {
  if (!username) return ''
  return `u_${encodeURIComponent(String(username)).replace(/%/g, '').toLowerCase()}`
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    user: null,
    hydrated: false,
  }),
  getters: {
    isLoggedIn: (state) => !!(state.token && state.user?.username),
    isFrontendAdmin: (state) => state.user?.username === 'lbwcc',
    currentAccount: (state) => state.user,
  },
  actions: {
    hydrateFromStorage() {
      this.token = localStorage.getItem(TOKEN_KEY) || ''
      const user = safeJsonParse(localStorage.getItem(USER_KEY))
      if (user && user.username) {
        this.user = {
          id: user.id || toStableUserId(user.username),
          username: user.username,
          avatar: user.avatar || '👤',
          avatarUrl: user.avatarUrl || '',
          source: 'lb-auth',
        }
      } else {
        this.user = null
      }
      this.hydrated = true
    },
    setSession({ token, user }) {
      if (token) {
        this.token = token
        localStorage.setItem(TOKEN_KEY, token)
      }
      if (user && user.username) {
        this.user = {
          id: user.id || toStableUserId(user.username),
          username: user.username,
          avatar: user.avatar || '👤',
          avatarUrl: user.avatarUrl || '',
          source: 'lb-auth',
        }
        localStorage.setItem(USER_KEY, JSON.stringify(this.user))
      }
    },
    clearSession() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem('calendar-token')
      localStorage.removeItem('calendar-token-user')
    },
  },
})
