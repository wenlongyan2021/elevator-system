import request from '@/api/request'
import * as XLSX from 'xlsx'

export function getMonthlyFees(params?: any) {
  return request.get('/monthly-fees', { params })
}

export function getMonthlyFee(id: string) {
  return request.get(`/monthly-fees/${id}`)
}

export function generateMonthlyFees(data?: any) {
  return request.post('/monthly-fees/generate', data || {})
}

export function updateMonthlyFeeStatus(id: string, status: string) {
  return request.put(`/monthly-fees/${id}/status`, { status })
}

export function exportMonthlyFees(params?: any) {
  return request.post('/monthly-fees/export', params, { responseType: 'blob' })
}

export function importMonthlyFees(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/monthly-fees/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function downloadMonthlyFeeTemplate() {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet([
    { '维保单位': '某某维保公司', '年月': '2024-06', '电梯数量': 10, '台/月单价': 500, '应付总额': 5000, '状态': '待确认', '备注': '' },
  ])
  ws['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws, '月费数据')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '月费导入模板.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
