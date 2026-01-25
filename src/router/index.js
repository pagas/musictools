import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    redirect: '/slowdowner'
  },
  {
    path: '/slowdowner',
    name: 'slowdowner',
    component: { template: '<div></div>' }
  },
  {
    path: '/analyzer',
    name: 'analyzer',
    component: { template: '<div></div>' }
  },
  {
    path: '/performance',
    name: 'performance',
    component: { template: '<div></div>' },
    meta: { requiresAuth: true }
  },
  {
    path: '/multitrack',
    name: 'multitrack',
    component: { template: '<div></div>' },
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
