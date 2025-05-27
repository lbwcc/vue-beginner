import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'home',
    component: function() {
      return import('../views/HomeView.vue')
    }
  },
  {
    path: '/bintodec',
    name: 'bintodec',
    component: function(){
      return import('../views/BintoDec.vue')
    }
  },
  {
    path: '/border',
    name: 'border',
    component: function(){
      return import('../views/BorderRadius.vue')
    }
  },
  {
    path: '/calculator',
    name: 'calculator',
    component: function(){
      return import('../views/Calculator.vue')
    }
  },
  {
    path: '/booksFinder',
    name: 'booksFinder',
    component: function(){
      return import('../views/BooksFinder.vue')
    }
  },
  {
    path: '/echartsDemo',
    name: 'echartsDemo',
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
    path: '/colorharmony',
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
  }
]

const router = createRouter({
  history: createWebHistory('/vue-beginner/'),
  routes
})

export default router
