import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/login/index.vue'), meta: { requiresAuth: false } },
    {
      path: '/',
      component: () => import('@/views/layout/index.vue'),
      redirect: '/dashboard',
      meta: { requiresAuth: true },
      children: [
        { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/index.vue'), meta: { title: '看板' } },
        { path: 'elevator', name: 'Elevator', component: () => import('@/views/elevator/index.vue'), meta: { title: '电梯台账' } },
        { path: 'elevator/:id', name: 'ElevatorDetail', component: () => import('@/views/elevator/detail.vue'), meta: { title: '电梯详情' } },
        { path: 'contract', name: 'Contract', component: () => import('@/views/contract/index.vue'), meta: { title: '合同管理' } },
        { path: 'contract/:id', name: 'ContractDetail', component: () => import('@/views/contract/detail.vue'), meta: { title: '合同详情' } },
        { path: 'repair', name: 'Repair', component: () => import('@/views/repair/index.vue'), meta: { title: '报修管理' } },
        { path: 'repair/parts-stats', name: 'RepairPartsStats', component: () => import('@/views/repair/parts-stats.vue'), meta: { title: '配件使用统计' } },
        { path: 'repair/:id', name: 'RepairDetail', component: () => import('@/views/repair/detail.vue'), meta: { title: '报修详情' } },
        { path: 'organization', name: 'Organization', component: () => import('@/views/organization/index.vue'), meta: { title: '组织架构' } },
        { path: 'inspection', name: 'Inspection', component: () => import('@/views/inspection/index.vue'), meta: { title: '巡查维保' } },
        { path: 'qrcode', name: 'QRCode', component: () => import('@/views/qrcode/index.vue'), meta: { title: '二维码管理' } },
        { path: 'notification', name: 'Notification', component: () => import('@/views/notification/index.vue'), meta: { title: '消息通知' } },
        { path: 'workflow', name: 'Workflow', component: () => import('@/views/workflow/index.vue'), meta: { title: '审批流程' } },
        { path: 'maintenance-unit', name: 'MaintenanceUnit', component: () => import('@/views/maintenance-unit/index.vue'), meta: { title: '维保单位' } },
        { path: 'monthly-fee', name: 'MonthlyFee', component: () => import('@/views/monthly-fee/index.vue'), meta: { title: '月费管理' } },
        { path: 'maintenance-plan', name: 'MaintenancePlan', component: () => import('@/views/maintenance-plan/index.vue'), meta: { title: '维保计划' } },
      ],
    },
  ],
})

let isRefreshing = false
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  console.log('[ROUTER] Navigating to:', to.path, 'Token exists:', !!token)
  
  if (to.path === '/login') {
    if (token && !isRefreshing) {
      isRefreshing = true
      console.log('[ROUTER] Already logged in, redirecting to /dashboard')
      next('/dashboard')
    } else {
      console.log('[ROUTER] Allow to login page')
      next()
    }
  } else {
    if (!token) {
      console.log('[ROUTER] No token, redirecting to login')
      next('/login')
    } else {
      console.log('[ROUTER] Allow access to', to.path)
      isRefreshing = false
      next()
    }
  }
})

export default router
