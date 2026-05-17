import { statusText, statusType } from '../../utils/util'

Page({
  data: {
    loggedIn: false,
    unreadCount: 0,
    stats: [
      { label: '电梯总数', value: 0, color: 'text-primary' },
      { label: '运行中', value: 0, color: 'text-success' },
      { label: '已停梯', value: 0, color: 'text-danger' },
      { label: '待维修', value: 0, color: 'text-warning' },
    ],
    repairs: [],
  },

  statusText,
  statusType,

  onLoad() {
    this.checkLogin()
  },

  onShow() {
    this.checkLogin()
    if (this.data.loggedIn) {
      this.loadData()
    }
  },

  checkLogin() {
    const token = wx.getStorageSync('token')
    this.setData({ loggedIn: !!token })
    if (token) this.fetchUnreadCount()
  },

  async fetchUnreadCount() {
    try {
      const { notificationApi } = await import('../../utils/api')
      const res = await notificationApi.unreadCount()
      this.setData({ unreadCount: res.unreadCount || 0 })
    } catch { /* handled */ }
  },

  goNotifications() {
    wx.navigateTo({ url: '/pages/notification/notification' })
  },

  async loadData() {
    const { dashboardApi, repairApi } = await import('../../utils/api')
    try {
      const overview = await dashboardApi.overview()
      const stats = [
        { label: '电梯总数', value: overview.totalElevators || 0, color: 'text-primary' },
        { label: '运行中', value: overview.runningCount || 0, color: 'text-success' },
        { label: '已停梯', value: overview.stoppedCount || 0, color: 'text-danger' },
        { label: '待维修', value: overview.pendingRepairs || 0, color: 'text-warning' },
      ]
      this.setData({ stats })

      const res = await repairApi.list({ page: 1, limit: 10 })
      const list = res.list || res.records || []
      this.setData({ repairs: list })
    } catch { /* handled by api interceptor */ }
  },

  goLogin() {
    wx.switchTab({ url: '/pages/profile/profile' })
  },

  scanQR() {
    wx.scanCode({
      success(res) {
        if (res.result) {
          wx.navigateTo({ url: `/pages/elevator-info/elevator-info?code=${encodeURIComponent(res.result)}` })
        }
      },
      fail() {
        wx.showToast({ title: '扫码失败', icon: 'none' })
      },
    })
  },

  goRepair() {
    wx.switchTab({ url: '/pages/repair/repair' })
  },

  goInspection() {
    wx.switchTab({ url: '/pages/inspection/inspection' })
  },

  goElevatorList() {
    wx.navigateTo({ url: '/pages/elevator-list/elevator-list' })
  },

  refreshData() {
    wx.showLoading({ title: '刷新中...' })
    this.loadData()
    wx.hideLoading()
    wx.showToast({ title: '已刷新', icon: 'success' })
  },

  viewRepair(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/repair-detail/repair-detail?id=${id}` })
  },
})

export {}
