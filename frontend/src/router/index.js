import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import LotteryPage from '../components/LotteryPage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/lottery',
    name: 'Lottery',
    component: LotteryPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router