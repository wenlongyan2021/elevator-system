import { statusText, statusType } from '../../utils/util'

Page({
  data: {
    repair: null,
    parts: [],
    workflow: null,
    showCompleteForm: false,
    resolveNote: '',
    isPartsNeeded: false,
    submitting: false,
    canComplete: false,
  },

  onLoad(options: any) {
    if (options.id) {
      this.loadDetail(options.id)
    }
  },

  async loadDetail(id: string) {
    wx.showLoading({ title: '加载中...' })
    try {
      const { repairApi, workflowApi } = await import('../../utils/api')
      const [repair, workflow] = await Promise.all([
        repairApi.get(id),
        workflowApi.get(id).catch(() => null),
      ])

      const app = getApp<IAppOption>()
      const currentUserId = app.globalData.userInfo?.id
      const isAssignee = !!(currentUserId && repair.assignee?.id === currentUserId)
      const appUserRole = app.globalData.userInfo?.role

      // Any maintainer can accept when status is PENDING_ACCEPT and no assignee yet
      const canComplete = isAssignee && repair.status === 'PENDING_REPAIR'

      this.setData({ repair, workflow, canComplete })
      this.loadParts(id)
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  async loadParts(id: string) {
    try {
      const { repairApi } = await import('../../utils/api')
      const parts = await repairApi.getParts(id)
      this.setData({ parts: parts || [] })
    } catch { /* handled */ }
  },

  toggleCompleteForm() {
    this.setData({
      showCompleteForm: !this.data.showCompleteForm,
      resolveNote: '',
      isPartsNeeded: false,
    })
  },

  onNoteInput(e: any) {
    this.setData({ resolveNote: e.detail.value })
  },

  onPartsNeededChange(e: any) {
    this.setData({ isPartsNeeded: e.detail.value.length > 0 })
  },

  async handleComplete() {
    const { repair, resolveNote } = this.data
    if (!repair || !resolveNote.trim()) {
      wx.showToast({ title: '请填写维修说明', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    try {
      const { repairApi } = await import('../../utils/api')
      await repairApi.complete(repair.id, {
        resolveNote,
        isPartsNeeded: this.data.isPartsNeeded,
      })
      wx.showToast({ title: '提交成功' })
      this.setData({ showCompleteForm: false })
      this.loadDetail(repair.id)
    } catch {
      wx.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  urgencyText(urg: string): string {
    const map: Record<string, string> = { EMERGENCY: '紧急', NORMAL: '普通', LOW: '一般' }
    return map[urg] || urg || '-'
  },

  stopTypeText(stopType: string): string {
    const map: Record<string, string> = { STOPPED: '停梯', NOT_STOPPED: '未停梯' }
    return map[stopType] || stopType || '-'
  },

  stepName(step: string): string {
    const map: Record<string, string> = {
      SUBMIT: '提交报修',
      MAINTAINER_ACCEPT: '维保员接单',
      MAINTAINER_REPAIR: '维保员维修',
      SUPERVISOR_APPROVE: '主管审批',
      MANAGER_APPROVE: '经理审批',
      PARTS_CONFIRM: '配件确认',
      FUND_MATERIAL: '维修资金材料',
      COMPLETE: '维修完成',
      REJECT: '已驳回',
      APPROVE: '审批通过',
    }
    return map[step] || step || '-'
  },

  statusText,
  statusType,

  arrivedTimeDisplay(): string {
    if (!this.data.repair?.arrivedAt) return '待记录'
    return this.formatTime(this.data.repair.arrivedAt)
  },

  arrivedTagType(): string {
    if (!this.data.repair?.createdAt || !this.data.repair?.arrivedAt) return 'info'
    const arrivedMin = (new Date(this.data.repair.arrivedAt).getTime() - new Date(this.data.repair.createdAt).getTime()) / 60000
    if (arrivedMin <= 30) return 'success'
    if (arrivedMin <= 60) return 'warning'
    return 'danger'
  },

  rescueAlertMsg(): string {
    const repair = this.data.repair
    if (!repair) return ''
    if (repair.rescueCompletedAt && repair.createdAt) {
      const totalMin = (new Date(repair.rescueCompletedAt).getTime() - new Date(repair.createdAt).getTime()) / 60000
      if (totalMin <= 120) return '30分钟内到达，2小时内完成解救'
      return `超时解救，用时${Math.round(totalMin)}分钟`
    }
    if (repair.arrivedAt && repair.createdAt) {
      const arrivedMin = (new Date(repair.arrivedAt).getTime() - new Date(repair.createdAt).getTime()) / 60000
      if (arrivedMin > 30) return `到达超时（${Math.round(arrivedMin)}分钟 > 30分钟）`
      return `到达及时（${Math.round(arrivedMin)}分钟）`
    }
    return ''
  },

  rescueAlertLevel(): string {
    const repair = this.data.repair
    if (!repair) return ''
    if (repair.rescueCompletedAt && repair.createdAt) {
      const totalMin = (new Date(repair.rescueCompletedAt).getTime() - new Date(repair.createdAt).getTime()) / 60000
      if (totalMin <= 120) return 'success'
      if (totalMin <= 180) return 'warning'
      return 'danger'
    }
    if (repair.arrivedAt) {
      const arrivedMin = (new Date(repair.arrivedAt).getTime() - new Date(repair.createdAt).getTime()) / 60000
      if (arrivedMin <= 30) return 'success'
      if (arrivedMin <= 60) return 'warning'
      return 'danger'
    }
    return 'info'
  },

  formatTime(ts: string): string {
    if (!ts) return '-'
    return new Date(ts).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  },

  async handleSetArrived() {
    try {
      const { repairApi } = await import('../../utils/api')
      await repairApi.setArrived(this.data.repair.id)
      wx.showToast({ title: '已记录到达时间' })
      this.loadDetail(this.data.repair.id)
    } catch {
      wx.showToast({ title: '记录失败', icon: 'none' })
    }
  },

  async handleSetRescueComplete() {
    try {
      const { repairApi } = await import('../../utils/api')
      await repairApi.setRescueComplete(this.data.repair.id)
      wx.showToast({ title: '已记录解救完成' })
      this.loadDetail(this.data.repair.id)
    } catch {
      wx.showToast({ title: '记录失败', icon: 'none' })
    }
  },
})

export {}
