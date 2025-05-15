import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'home',
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
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
