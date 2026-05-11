import { createRouter, createWebHashHistory } from 'vue-router'
import { isFrontendAdmin, isLoggedIn } from '@/utils/auth'
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

  if (to.meta?.adminOnly && !isFrontendAdmin()) {
    next('/calendar')
    return
  }

  next()
})

export default router
