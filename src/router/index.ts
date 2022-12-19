import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '',
    redirect: '/timetable'
  },
  {
    path: '/timetable',
    name: 'Timetable',
    component: () => import ('../views/TimetableView.vue')
  }
]

const loginRoutes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import ('../views/login/LoginSetup.vue')
  }
]

// push for each login route
loginRoutes.forEach(route => routes.push(route))

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from) => {
  if (localStorage.loggedIn !== "true" && to.name !== 'Login') {
    return { name: 'Login' }
  }
})

export default router
