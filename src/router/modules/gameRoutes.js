export const gameRoutes = [
  {
    path: '/games',
    name: 'GameList',
    component: () => import('../../views/GameList.vue'),
  },
  {
    path: '/snakeGame',
    name: 'SnakeGame',
    component: () => import('../../views/Snake.vue'),
  },
  {
    path: '/tetris',
    name: 'Tetris',
    component: () => import('../../views/Tetris.vue'),
  },
  {
    path: '/lottery',
    name: 'Lottery',
    component: () => import('../../views/lottery.vue'),
  },
  {
    path: '/game2048',
    name: 'Game2048',
    component: () => import('../../views/Game2048.vue'),
  },
  {
    path: '/gomoku',
    name: 'Gomoku',
    component: () => import('../../views/Gomoku.vue'),
  },
]
