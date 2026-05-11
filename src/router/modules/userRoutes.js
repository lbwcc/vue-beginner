export const userRoutes = [
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('../../views/Calendar.vue'),
  },
  {
    path: '/login',
    name: 'CalendarLogin',
    meta: { guestOnly: true },
    component: () => import('../../views/CalendarLogin.vue'),
  },
  {
    path: '/calendar/login',
    redirect: '/login',
  },
  {
    path: '/register',
    name: 'CalendarRegister',
    meta: { guestOnly: true },
    component: () => import('../../views/CalendarRegister.vue'),
  },
  {
    path: '/calendar/register',
    redirect: '/register',
  },
  {
    path: '/profile',
    name: 'UserProfileMe',
    meta: { requiresAuth: true },
    component: () => import('../../views/UserProfile.vue'),
  },
  {
    path: '/users/:id',
    name: 'UserProfile',
    meta: { requiresAuth: true },
    component: () => import('../../views/UserProfile.vue'),
  },
  {
    path: '/profile/edit',
    name: 'ProfileEdit',
    meta: { requiresAuth: true },
    component: () => import('../../views/ProfileEdit.vue'),
  },
  {
    path: '/user-admin',
    name: 'UserAdmin',
    meta: { requiresAuth: true, adminOnly: true },
    component: () => import('../../views/UserAdmin.vue'),
  },
]
