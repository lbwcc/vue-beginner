import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    themeKey: '',
    unreadNotifyCount: 0,
    apiFailCount: 0,
  }),
  actions: {
    setThemeKey(themeKey) {
      this.themeKey = String(themeKey || '').trim()
    },
    setUnreadNotifyCount(count) {
      this.unreadNotifyCount = Math.max(0, Number(count) || 0)
    },
    markApiFailure() {
      this.apiFailCount += 1
    },
  },
})
