import { createRouter, createWebHashHistory } from 'vue-router'
import { isFrontendAdmin, isLoggedIn } from '@/utils/auth'

const routes = [
  {
    path: '/',
    redirect: '/forum-square'
  },
  {
    path: '/home',
    redirect: '/forum-square'
  },
  {
    path: '/bintodec',
    name: 'BintoDec',
    component: function(){
      return import('../views/BintoDec.vue')
    }
  },
  {
    path: '/border',
    name: 'Border',
    component: function(){
      return import('../views/BorderRadius.vue')
    }
  },
  {
    path: '/calculator',
    name: 'Calculator',
    component: function(){
      return import('../views/Calculator.vue')
    }
  },
  {
    path: '/booksFinder',
    name: 'BooksFinder',
    component: function(){
      return import('../views/BooksFinder.vue')
    }
  },
  {
    path: '/echartsDemo',
    name: 'EchartsDemo',
    component: function(){
      return import('../views/EchartsDemo.vue')
    }
  },
  {
    path: '/snakeGame',
    name: 'SnakeGame',
    component: function(){
      return import('../views/Snake.vue')
    }
  },
  {
    path: '/tetris',
    name: 'Tetris',
    component: function(){
      return import('../views/Tetris.vue')
    }
  },
  {
    path: '/colorHarmony',
    name: 'ColorHarmony',
    component: function() {
      return import('../views/ColorHarmony.vue')
    }
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: function() {
      return import('../views/Calendar.vue')
    }
  },
  {
    path: '/login',
    name: 'CalendarLogin',
    meta: { guestOnly: true },
    component: function() {
      return import('../views/CalendarLogin.vue')
    }
  },
  {
    path: '/calendar/login',
    redirect: '/login'
  },
  {
    path: '/register',
    name: 'CalendarRegister',
    meta: { guestOnly: true },
    component: function() {
      return import('../views/CalendarRegister.vue')
    }
  },
  {
    path: '/calendar/register',
    redirect: '/register'
  },
  {
    path: '/profile',
    name: 'UserProfileMe',
    meta: { requiresAuth: true },
    component: function() {
      return import('../views/UserProfile.vue')
    }
  },
  {
    path: '/users/:id',
    name: 'UserProfile',
    meta: { requiresAuth: true },
    component: function() {
      return import('../views/UserProfile.vue')
    }
  },
  {
    path: '/profile/edit',
    name: 'ProfileEdit',
    meta: { requiresAuth: true },
    component: function() {
      return import('../views/ProfileEdit.vue')
    }
  },
  {
    path: '/user-admin',
    name: 'UserAdmin',
    meta: { requiresAuth: true, adminOnly: true },
    component: function() {
      return import('../views/UserAdmin.vue')
    }
  },
  {
    path: '/fireworks',
    name: 'FireworksDemo',
    component: function() {
      return import('../views/FireworksDemo.vue')
    }
  },
  {
    path: '/goeasy-chat',
    redirect: '/forum-square'
  },
  {
    path: '/lottery',
    name: 'Lottery',
    component: function() {
      return import('../views/lottery.vue')
    }
  },
  {
    path: '/game2048',
    name: 'Game2048',
    component: function() {
      return import('../views/Game2048.vue')
    }
  },
  {
    path: '/weather-detail',
    name: 'WeatherDetail',
    component: function() {
      return import('../views/WeatherDetail.vue')
    }
  },
  {
    path: '/gomoku',
    name: 'Gomoku',
    component: function() {
      return import('../views/Gomoku.vue')
    }
  },
  {
    path: '/dice',
    name: 'Dice',
    component: function() {
      return import('../views/Dice.vue')
    }
  },
  {
    path: '/social-chat',
    redirect: to => ({ path: '/forum-square', query: to.query })
  },
  {
    path: '/forumchat',
    name: 'ForumChat',
    meta: { requiresAuth: true },
    component: function() {
      return import('../views/ForumChat.vue')
    }
  },
  {
    path: '/forum-chat',
    redirect: to => ({ path: '/forumchat', query: to.query })
  },
  {
    path: '/forum-square',
    name: 'ForumSquare',
    meta: { requiresAuth: true },
    component: function() {
      return import('../views/ForumSquare.vue')
    }
  },
  {
    path: '/forum-square/compose',
    name: 'ForumCompose',
    meta: { requiresAuth: true },
    component: function() {
      return import('../views/ForumCompose.vue')
    }
  },
  {
    path: '/forum-square/post/:id',
    name: 'ForumPostDetail',
    meta: { requiresAuth: true },
    component: function() {
      return import('../views/ForumPostDetail.vue')
    }
  }
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
