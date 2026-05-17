import { statusText, statusType } from '../../utils/util'

Page({
  data: {
    list: [],
    filterStatus: '',
    page: 1,
    hasMore: true,
    loading: false,
  },

  onLoad() {
    this.loadData(true)
  },

  onPullDownRefresh() {
    this.loadData(true).then(() => wx.stopPullDownRefresh())
  },

  async loadData(reset: boolean) {
    if (this.data.loading) return
    if (reset) this.setData({ page: 1, hasMore: true })

    this.setData({ loading: true })
    try {
      const { maintenancePlanApi } = await import('../../utils/api')
      const app = getApp<IAppOption>()
      const maintainerId = app.globalData.userInfo?.id
      if (!maintainerId) {
        this.setData({ list: [], loading: false })
        return
      }

      const page = reset ? 1 : this.data.page
      const res = await maintenancePlanApi.list({
        page,
        limit: 20,
        maintainerId,
        status: this.data.filterStatus || undefined,
      })
      const list = res.list || []
      this.setData({
        list: reset ? list : [...this.data.list, ...list],
        page: page + 1,
        hasMore: list.length >= 20,
      })
    } catch { /* handled */ }
    finally { this.setData({ loading: false }) }
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadData(false)
    }
  },

  setFilter(e: any) {
    const status = e.currentTarget.dataset.status
    this.setData({ filterStatus: status === this.data.filterStatus ? '' : status })
    this.loadData(true)
  },

  async startPlan(e: any) {
    const id = e.currentTarget.dataset.id
    try {
      const { maintenancePlanApi } = await import('../../utils/api')
      await maintenancePlanApi.updateStatus(id, 'IN_PROGRESS')
      wx.showToast({ title: '已开始执行' })
      this.loadData(true)
    } catch {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async completePlan(e: any) {
    const id = e.currentTarget.dataset.id
    try {
      const { maintenancePlanApi } = await import('../../utils/api')
      await maintenancePlanApi.updateStatus(id, 'COMPLETED')
      wx.showToast({ title: '已完成' })
      this.loadData(true)
    } catch {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  planTypeText(t: string): string {
    const map: Record<string, string> = {
      HALF_MONTHLY: '半月保', MONTHLY: '月度保', QUARTERLY: '季度保',
      HALF_YEARLY: '半年保', YEARLY: '年度保',
    }
    return map[t] || t
  },

  statusText,
  statusType,
})
export {}
