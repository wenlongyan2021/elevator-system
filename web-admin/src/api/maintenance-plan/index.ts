import request from '@/api/request'
import * as XLSX from 'xlsx'

export function getMaintenancePlans(params?: any) {
  return request.get('/maintenance-plans', { params })
}

export function getMaintenancePlan(id: string) {
  return request.get(`/maintenance-plans/${id}`)
}

export function createMaintenancePlan(data: any) {
  return request.post('/maintenance-plans', data)
}

export function updateMaintenancePlanStatus(id: string, status: string) {
  return request.put(`/maintenance-plans/${id}/status`, { status })
}

export function deleteMaintenancePlan(id: string) {
  return request.delete(`/maintenance-plans/${id}`)
}

export function importMaintenancePlans(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/maintenance-plans/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function downloadPlanTemplate() {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet([
    {
      '电梯注册代码': 'EL2024001',
      '计划日期': '2024-06-01',
      '计划类型': '月度保',
      '维保员ID': 'user_id_here',
      '备注': '例行保养',
    },
  ])
  ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws, '维保计划')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '维保计划导入模板.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
