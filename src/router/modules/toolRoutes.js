export const toolRoutes = [
  {
    path: '/tools',
    name: 'ToolList',
    component: () => import('../../views/ToolList.vue'),
  },
  {
    path: '/hermes-chat',
    name: 'HermesChat',
    meta: { adminOnly: true },
    component: () => import('../../views/HermesChat.vue'),
  },
  {
    path: '/bintodec',
    name: 'BintoDec',
    component: () => import('../../views/BintoDec.vue'),
  },
  {
    path: '/border',
    name: 'Border',
    component: () => import('../../views/BorderRadius.vue'),
  },
  {
    path: '/calculator',
    name: 'Calculator',
    component: () => import('../../views/Calculator.vue'),
  },
  {
    path: '/booksFinder',
    name: 'BooksFinder',
    component: () => import('../../views/BooksFinder.vue'),
  },
  {
    path: '/echartsDemo',
    name: 'EchartsDemo',
    component: () => import('../../views/EchartsDemo.vue'),
  },
  {
    path: '/colorHarmony',
    name: 'ColorHarmony',
    component: () => import('../../views/ColorHarmony.vue'),
  },
  {
    path: '/fireworks',
    name: 'FireworksDemo',
    component: () => import('../../views/FireworksDemo.vue'),
  },
  {
    path: '/weather-detail',
    name: 'WeatherDetail',
    component: () => import('../../views/WeatherDetail.vue'),
  },
  {
    path: '/pet-config',
    name: 'PetConfig',
    component: () => import('../../views/PetConfig.vue'),
  },
  {
    path: '/dice',
    name: 'Dice',
    component: () => import('../../views/Dice.vue'),
  },
  {
    path: '/pregnancy-guide',
    name: 'PregnancyGuide',
    meta: { requiresAuth: true, allowedUsers: ['lbwcc', 'erer'] },
    component: () => import('../../views/PregnancyGuide.vue'),
  },
]
