import { typeLabel } from '../../utils/util'

Page({
  data: {
    list: [] as any[],
    loading: false,
    unreadCount: 0,
    page: 1,
    pageSize: 20,
    hasMore: true,
    activeTab: 'all' as 'all' | 'unread',
  },

  typeLabel,

  onShow() {
    this.loadData(true)
  },

  async loadData(reset: boolean) {
    if (this.data.loading) return
    this.setData({ loading: true })
    if (reset) this.setData({ page: 1, hasMore: true })

    try {
      const { notificationApi } = await import('../../utils/api')
      const page = reset ? 1 : this.data.page
      const params: any = { page, limit: this.data.pageSize }
      if (this.data.activeTab === 'unread') params.isRead = false

      const [listRes, countRes] = await Promise.all([
        notificationApi.list(params),
        notificationApi.unreadCount(),
      ])
      const newItems = listRes.list || listRes.records || []
      this.setData({
        list: reset ? newItems : [...this.data.list, ...newItems],
        page: page + 1,
        hasMore: newItems.length >= this.data.pageSize,
        unreadCount: countRes.unreadCount || 0,
      })
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadData(false)
    }
  },

  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab as string
    if (tab === this.data.activeTab) return
    this.setData({ activeTab: tab, page: 1, list: [], hasMore: true })
    this.loadData(true)
  },

  async handleClick(e: any) {
    const { id, ref, read } = e.currentTarget.dataset

    // Mark as read
    if (!read) {
      try {
        const { notificationApi } = await import('../../utils/api')
        await notificationApi.markRead(id)
        const list = this.data.list.map((item: any) =>
          item.id === id ? { ...item, isRead: true } : item,
        )
        const unreadCount = Math.max(0, this.data.unreadCount - 1)
        this.setData({ list, unreadCount })
      } catch { /* handled */ }
    }

    // Navigate to related business
    if (ref) {
      wx.navigateTo({ url: `/pages/repair-detail/repair-detail?id=${ref}` })
    }
  },

  async markAllRead() {
    try {
      const { notificationApi } = await import('../../utils/api')
      await notificationApi.markAllRead()
      const list = this.data.list.map((item: any) => ({ ...item, isRead: true }))
      this.setData({ list, unreadCount: 0 })
      wx.showToast({ title: '已全部已读', icon: 'success' })
    } catch { /* handled */ }
  },
})
export {}
