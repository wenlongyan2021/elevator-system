import { statusText, statusType } from '../../utils/util'

Page({
  data: {
    list: [],
    keyword: '',
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
      const { elevatorApi } = await import('../../utils/api')
      const page = reset ? 1 : this.data.page
      const res = await elevatorApi.list({
        page,
        limit: 20,
        keyword: this.data.keyword || undefined,
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

  onSearchInput(e: any) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.loadData(true)
  },

  setFilter(e: any) {
    const status = e.currentTarget.dataset.status
    this.setData({ filterStatus: status === this.data.filterStatus ? '' : status })
    this.loadData(true)
  },

  goDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/elevator-info/elevator-info?id=${id}` })
  },

  statusText,
  statusType,
})
export {}
