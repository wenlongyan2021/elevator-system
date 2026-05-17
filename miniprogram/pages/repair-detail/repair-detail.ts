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
    accepting: false,
    canAccept: false,
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
      const canAccept = !repair.assigneeId && repair.status === 'PENDING_ACCEPT' && appUserRole === 'ELEVATOR_MAINTAINER'
      const canComplete = isAssignee && ['APPROVED', 'IN_REPAIR'].includes(repair.status)

      this.setData({ repair, workflow, canAccept, canComplete })
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

  async handleAccept() {
    const { repair } = this.data
    if (!repair) return
    const app = getApp<IAppOption>()
    const assigneeId = app.globalData.userInfo?.id
    if (!assigneeId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    this.setData({ accepting: true })
    try {
      const { repairApi } = await import('../../utils/api')
      await repairApi.accept(repair.id, { assigneeId })
      wx.showToast({ title: '已接单' })
      this.loadDetail(repair.id)
    } catch {
      wx.showToast({ title: '接单失败', icon: 'none' })
    } finally {
      this.setData({ accepting: false })
    }
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
})
export {}
