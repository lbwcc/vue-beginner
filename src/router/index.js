import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: function() {
      return import('../views/HomeView.vue')
    }
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
    path: '/fireworks',
    name: 'FireworksDemo',
    component: function() {
      return import('../views/FireworksDemo.vue')
    }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: function() {
      return import('../views/Chat.vue')
    }
  },
  {
    path: '/goeasy-chat',
    name: 'GoEasyChat',
    component: function() {
      return import('../views/GoEasyChat.vue')
    }
  }
]

const router = createRouter({
  history: createWebHashHistory('/vue-beginner/'),
  routes
})

export default router
