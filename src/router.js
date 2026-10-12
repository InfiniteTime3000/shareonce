import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import ViewShare from './views/ViewShare.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/s/:id', name: 'share', component: ViewShare, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
