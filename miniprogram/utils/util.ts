export function formatTime(date: Date): string {
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())
  return `${y}-${m}-${d} ${h}:${min}`
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  return `${y}-${m}-${d}`
}

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n
}

export function statusText(status: string): string {
  const map: Record<string, string> = {
    RUNNING: '运行中',
    STOPPED: '停梯',
    MAINTENANCE: '维保中',
    FAULT: '故障',
    PENDING_ACCEPT: '待分配',
    PENDING_REPAIR: '维修中',
    PENDING_SUPERVISOR: '待主管审批',
    PENDING_MANAGER: '待经理审批',
    APPROVED: '已批准',
    RESOLVED: '已修复',
    CLOSED: '已完结',
    REJECTED: '已驳回',
  }
  return map[status] || status
}

export function statusType(status: string): string {
  if (['RUNNING', 'APPROVED', 'RESOLVED', 'CLOSED'].includes(status)) return 'success'
  if (['STOPPED', 'FAULT', 'REJECTED'].includes(status)) return 'danger'
  if (['MAINTENANCE', 'PENDING_ACCEPT', 'PENDING_SUPERVISOR', 'PENDING_MANAGER'].includes(status)) return 'warning'
  return 'primary'
}

export function navigateTo(url: string) {
  wx.navigateTo({ url })
}

export function showToast(title: string, icon: 'success' | 'error' | 'none' = 'none') {
  wx.showToast({ title, icon })
}

export function showLoading(title = '加载中...') {
  wx.showLoading({ title })
}

export function hideLoading() {
  wx.hideLoading()
}

export function planTypeText(type: string): string {
  const map: Record<string, string> = {
    HALF_MONTHLY: '半月保',
    MONTHLY: '月度保',
    QUARTERLY: '季度保',
    HALF_YEARLY: '半年保',
    YEARLY: '年度保',
  }
  return map[type] || type
}

export function planStatusType(status: string): string {
  if (status === 'COMPLETED') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  return 'primary'
}

export function planStatusText(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待执行',
    IN_PROGRESS: '进行中',
    COMPLETED: '已完成',
  }
  return map[status] || status
}

export function typeLabel(type: string): string {
  const map: Record<string, string> = {
    REPAIR: '报修',
    INSPECT: '巡查',
    CONTRACT: '合同',
    SYSTEM: '系统',
  }
  return map[type] || type
}
