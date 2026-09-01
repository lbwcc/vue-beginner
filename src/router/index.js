import { createRouter, createWebHashHistory } from 'vue-router'
import { isFrontendAdmin, isLoggedIn, getCurrentAccount } from '@/utils/auth'
import { baseRoutes } from './modules/baseRoutes'
import { toolRoutes } from './modules/toolRoutes'
import { gameRoutes } from './modules/gameRoutes'
import { userRoutes } from './modules/userRoutes'
import { forumRoutes } from './modules/forumRoutes'

const routes = [
  ...baseRoutes,
  ...toolRoutes,
  ...gameRoutes,
  ...userRoutes,
  ...forumRoutes,
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  const loggedIn = isLoggedIn()
  const isAdmin = isFrontendAdmin()

  if (to.meta?.requiresAuth && !loggedIn) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

  if (to.meta?.guestOnly && loggedIn) {
    next('/forum-square')
    return
  }

  // 检查管理员权限（包括隐藏 Hermes 对话入口）
  if (to.meta?.adminOnly && !isAdmin) {
    next('/tools')
    return
  }

  // 检查指定用户白名单
  if (to.meta?.allowedUsers) {
    const username = getCurrentAccount()?.username
    if (!to.meta.allowedUsers.includes(username)) {
      next('/tools')
      return
    }
  }

  next()
})

export default router
