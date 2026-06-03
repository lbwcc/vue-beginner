export const forumRoutes = [
  {
    path: '/goeasy-chat',
    redirect: '/forum-square',
  },
  {
    path: '/social-chat',
    redirect: (to) => ({ path: '/forum-square', query: to.query }),
  },
  {
    path: '/forumchat',
    name: 'ForumChat',
    meta: { requiresAuth: true },
    component: () => import('../../views/ForumChat.vue'),
  },
  {
    path: '/forum-chat',
    redirect: (to) => ({ path: '/forumchat', query: to.query }),
  },
  {
    path: '/forum-square',
    name: 'ForumSquare',
    meta: { requiresAuth: true },
    component: () => import('../../views/ForumSquare.vue'),
  },
  {
    path: '/forum-square/compose',
    name: 'ForumCompose',
    meta: { requiresAuth: true },
    component: () => import('../../views/ForumCompose.vue'),
  },
  {
    path: '/forum-square/post/:id',
    name: 'ForumPostDetail',
    meta: { requiresAuth: true },
    component: () => import('../../views/ForumPostDetail.vue'),
  },
  {
    path: '/avatar-chat',
    name: 'AvatarChat',
    meta: { requiresAuth: true },
    component: () => import('../../views/AvatarChat.vue'),
  },
]
