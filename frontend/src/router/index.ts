import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth', top: 90 }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      component: PublicLayout,
      children: [
        { path: '', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: { zh: '首页', ja: 'ホーム' } } },
        { path: 'tools', name: 'tools', component: () => import('@/views/ToolsView.vue'), meta: { title: { zh: '专业诊断', ja: '専門診断' } } },
        { path: 'tools/highly-skilled', name: 'highly-skilled', component: () => import('@/views/HighlySkilledView.vue'), meta: { title: { zh: '高度人才积分计算', ja: '高度人材ポイント計算' } } },
        { path: 'tools/permanent-residence', name: 'permanent-residence', component: () => import('@/views/PermanentResidenceView.vue'), meta: { title: { zh: '永住申请条件诊断', ja: '永住許可要件診断' } } },
        { path: 'tools/highly-skilled-pr', redirect: '/tools/highly-skilled' },
        { path: 'tools/j-skip', redirect: '/tools/highly-skilled' },
        { path: 'guide', name: 'guide', component: () => import('@/views/GuideView.vue'), meta: { title: { zh: '使用说明', ja: 'ご利用案内' } } },
        { path: 'privacy', name: 'privacy', component: () => import('@/views/LegalView.vue'), props: { page: 'privacy' }, meta: { title: { zh: '隐私政策', ja: 'プライバシーポリシー' } } },
        { path: 'terms', name: 'terms', component: () => import('@/views/LegalView.vue'), props: { page: 'terms' }, meta: { title: { zh: '使用条款', ja: '利用規約' } } },
        { path: 'disclaimer', name: 'disclaimer', component: () => import('@/views/LegalView.vue'), props: { page: 'disclaimer' }, meta: { title: { zh: '免责声明', ja: '免責事項' } } },
        { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: { zh: '页面未找到', ja: 'ページが見つかりません' } } },
      ],
    },
  ],
})

router.afterEach((to) => {
  const locale = localStorage.getItem('sunrise-diagnosis-locale')
  const title = to.meta.title as { zh: string; ja: string } | undefined
  const localizedTitle = locale === 'ja-JP' ? title?.ja : title?.zh
  document.title = localizedTitle ? `${localizedTitle} | SUNRISE` : 'SUNRISE 专业诊断中心'
})

export default router
