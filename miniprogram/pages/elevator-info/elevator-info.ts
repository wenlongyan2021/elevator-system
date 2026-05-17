import { statusText, statusType, formatTime, planTypeText, planStatusType, planStatusText } from '../../utils/util'

Page({
  data: {
    elevator: null as any,
    repairList: [] as any[],
    planList: [] as any[],
    loading: false,
    repairLoading: false,
    activeSection: 'info' as 'info' | 'repairs' | 'plans',
  },

  statusText,
  statusType,
  formatTime,
  planTypeText,
  planStatusType,
  planStatusText,

  onLoad(options: any) {
    let elevatorId = options.id

    // Parse QR code result
    if (options.code) {
      const match = options.code.match(/[?&]elevatorId=([^&]+)/)
      elevatorId = match ? decodeURIComponent(match[1]) : options.code
    }

    if (elevatorId) {
      this.loadElevator(elevatorId)
      this.loadRepairs(elevatorId)
      this.loadPlans(elevatorId)
    }
  },

  async loadElevator(id: string) {
    this.setData({ loading: true })
    try {
      const { elevatorApi } = await import('../../utils/api')
      const elevator = await elevatorApi.get(id)
      this.setData({ elevator })
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadRepairs(elevatorId: string) {
    this.setData({ repairLoading: true })
    try {
      const { repairApi } = await import('../../utils/api')
      const res = await repairApi.list({ elevatorId, limit: 5 })
      this.setData({ repairList: res.list || [] })
    } catch {/* ignore */}
    finally { this.setData({ repairLoading: false }) }
  },

  async loadPlans(elevatorId: string) {
    try {
      const { maintenancePlanApi } = await import('../../utils/api')
      const res = await maintenancePlanApi.list({ elevatorId, limit: 5 })
      this.setData({ planList: res.list || [] })
    } catch {/* ignore */}
  },

  switchTab(e: any) {
    const section = e.currentTarget.dataset.section as string
    this.setData({ activeSection: section })
  },

  goRepair() {
    const elevator = this.data.elevator
    if (elevator) {
      wx.navigateTo({ url: `/pages/repair/repair?elevatorId=${elevator.id}` })
    }
  },

  goRepairDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/repair-detail/repair-detail?id=${id}` })
  },
})
export {}
