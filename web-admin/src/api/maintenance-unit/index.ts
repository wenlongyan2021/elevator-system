import request from '@/api/request'

export function getMaintenanceUnits(params?: any) {
  return request.get('/maintenance-units', { params })
}

export function getMaintenanceUnit(id: string) {
  return request.get(`/maintenance-units/${id}`)
}

export function createMaintenanceUnit(data: any) {
  return request.post('/maintenance-units', data)
}

export function updateMaintenanceUnit(id: string, data: any) {
  return request.put(`/maintenance-units/${id}`, data)
}

export function deleteMaintenanceUnit(id: string) {
  return request.delete(`/maintenance-units/${id}`)
}
