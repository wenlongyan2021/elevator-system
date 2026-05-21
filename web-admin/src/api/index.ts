import request from './request'

export const authApi = {
  login: (data: { phone: string; password: string }) =>
    request.post('/auth/login', data),
  profile: () => request.get('/auth/profile'),
}

export const orgApi = {
  getOrgs: () => request.get('/organizations'),
  updateOrg: (id: string, data: any) => request.put(`/organizations/${id}`, data),
  getProjects: (orgId?: string) =>
    request.get('/projects', { params: { orgId } }),
  createProject: (data: any) => request.post('/projects', data),
  updateProject: (id: string, data: any) => request.put(`/projects/${id}`, data),
  getProject: (id: string) => request.get(`/projects/${id}`),
  deleteProject: (id: string) => request.delete(`/projects/${id}`),
}

export const userApi = {
  getUsers: (params?: { projectId?: string; role?: string }) =>
    request.get('/users', { params }),
  createUser: (data: any) => request.post('/users', data),
  updateUser: (id: string, data: any) => request.put(`/users/${id}`, data),
  deleteUser: (id: string) => request.delete(`/users/${id}`),
  resetPassword: (id: string, password: string) =>
    request.put(`/users/${id}/password`, { password }),
  getHierarchy: () => request.get('/users/hierarchy'),
}

export const elevatorApi = {
  list: (params?: any) => request.get('/elevators', { params }),
  get: (id: string) => request.get(`/elevators/${id}`),
  create: (data: any) => request.post('/elevators', data),
  update: (id: string, data: any) => request.put(`/elevators/${id}`, data),
  remove: (id: string) => request.delete(`/elevators/${id}`),
  importExcel: (file: FormData) =>
    request.post('/elevators/import', file, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  exportExcel: (params?: any) =>
    request.post('/elevators/export', params, { responseType: 'blob' }),
  upcomingInspections: () => request.get('/elevators/upcoming-inspections'),
}

export const contractApi = {
  list: (params?: any) => request.get('/contracts', { params }),
  get: (id: string) => request.get(`/contracts/${id}`),
  create: (data: any) => request.post('/contracts', data),
  update: (id: string, data: any) => request.put(`/contracts/${id}`, data),
  remove: (id: string) => request.delete(`/contracts/${id}`),
  addElevators: (id: string, data: any) =>
    request.post(`/contracts/${id}/elevators`, data),
  removeElevator: (id: string, elevatorId: string) =>
    request.delete(`/contracts/${id}/elevators/${elevatorId}`),
  addPart: (id: string, data: any) =>
    request.post(`/contracts/${id}/parts`, data),
  updatePart: (id: string, partId: string, data: any) =>
    request.put(`/contracts/${id}/parts/${partId}`, data),
  getParts: (id: string) => request.get(`/contracts/${id}/parts`),
  deletePart: (id: string, partId: string) =>
    request.delete(`/contracts/${id}/parts/${partId}`),
  addEvaluation: (id: string, data: any) =>
    request.post(`/contracts/${id}/evaluations`, data),
  updateEvaluation: (id: string, evalId: string, data: any) =>
    request.put(`/contracts/${id}/evaluations/${evalId}`, data),
  deleteEvaluation: (id: string, evalId: string) =>
    request.delete(`/contracts/${id}/evaluations/${evalId}`),
  getEvaluations: (id: string) =>
    request.get(`/contracts/${id}/evaluations`),
  importExcel: (file: FormData) =>
    request.post('/contracts/import', file, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  exportExcel: (params?: any) =>
    request.post('/contracts/export', params, { responseType: 'blob' }),
}

export const repairApi = {
  list: (params?: any) => request.get('/repairs', { params }),
  get: (id: string) => request.get(`/repairs/${id}`),
  create: (data: any) => request.post('/repairs', data),
  accept: (id: string, data: any) =>
    request.put(`/repairs/${id}/accept`, data),
  complete: (id: string, data: any) =>
    request.put(`/repairs/${id}/repair`, data),
  updateStatus: (id: string, data: any) =>
    request.put(`/repairs/${id}/status`, data),
  getParts: (id: string) => request.get(`/repairs/${id}/parts`),
  addPart: (id: string, data: any) =>
    request.post(`/repairs/${id}/parts`, data),
  getCosts: (id: string) => request.get(`/repairs/${id}/costs`),
  addCost: (id: string, data: any) =>
    request.post(`/repairs/${id}/costs`, data),
  updateCost: (id: string, costId: string, data: any) =>
    request.put(`/repairs/${id}/costs/${costId}`, data),
  deleteCost: (id: string, costId: string) =>
    request.delete(`/repairs/${id}/costs/${costId}`),
  generateFundWord: (id: string) =>
    request.get(`/repairs/${id}/fund-word`, { responseType: 'blob' }),
  exportReport: (params?: { year?: number; month?: number }) =>
    request.get('/repairs/report/export', { params, responseType: 'blob' }),
  partsStats: (params?: { startDate?: string; endDate?: string }) =>
    request.get('/repairs/parts-stats', { params }),
  partsAlerts: (params?: {
    startDate?: string; endDate?: string;
    minQuantity?: number; minUseCount?: number;
  }) => request.get('/repairs/parts-alerts', { params }),
  recommendedParts: (id: string) =>
    request.get(`/repairs/${id}/recommended-parts`),
  getMaintainers: () => request.get('/repairs/maintainers'),
}

export const workflowApi = {
  get: (repairOrderId: string) =>
    request.get(`/workflows/${repairOrderId}`),
  approve: (repairOrderId: string, data?: any) =>
    request.post(`/workflows/${repairOrderId}/approve`, data),
  reject: (repairOrderId: string, data?: any) =>
    request.post(`/workflows/${repairOrderId}/reject`, data),
  addMaterial: (repairOrderId: string, data: any) =>
    request.post(`/workflows/${repairOrderId}/materials`, data),
  getMaterials: (repairOrderId: string) =>
    request.get(`/workflows/${repairOrderId}/materials`),
  generateFundMaterialDoc: (repairOrderId: string) =>
    request.post(`/workflows/${repairOrderId}/generate-material-doc`, {}, { responseType: 'blob' }),
}

export const qrcodeApi = {
  getByElevator: (elevatorId: string) =>
    request.get(`/qrcodes/${elevatorId}`),
  generate: (elevatorId: string) =>
    request.post(`/qrcodes/${elevatorId}`),
  list: () => request.get('/qrcodes'),
}

export const inspectionApi = {
  list: (params?: any) => request.get('/inspections', { params }),
  create: (data: any) => request.post('/inspections', data),
  get: (id: string) => request.get(`/inspections/${id}`),
  exportExcel: (params?: any) =>
    request.get('/inspections/export', { params, responseType: 'blob' }),
}

export const dashboardApi = {
  overview: () => request.get('/dashboard/overview'),
  projectStats: (projectId: string) =>
    request.get(`/dashboard/project/${projectId}`),
  repairTrend: (months?: number) =>
    request.get('/dashboard/repair-trend', { params: { months } }),
  faultDistribution: (projectId?: string) =>
    request.get('/dashboard/fault-distribution', { params: { projectId } }),
  repairStats: () => request.get('/dashboard/repair-stats'),
}

export const notificationApi = {
  list: (params?: any) => request.get('/notifications', { params }),
  unreadCount: () => request.get('/notifications/unread-count'),
  markRead: (id: string) => request.put(`/notifications/${id}/read`),
  markAllRead: () => request.put('/notifications/read-all'),
}

export const maintenanceUnitApi = {
  list: (params?: any) => request.get('/maintenance-units', { params }),
  get: (id: string) => request.get(`/maintenance-units/${id}`),
  create: (data: any) => request.post('/maintenance-units', data),
  update: (id: string, data: any) => request.put(`/maintenance-units/${id}`, data),
  remove: (id: string) => request.delete(`/maintenance-units/${id}`),
  getScore: (id: string) => request.get(`/maintenance-units/${id}/score`),
  recalculateScore: (id: string) => request.post(`/maintenance-units/${id}/recalculate-score`),
  exportExcel: (params?: any) =>
    request.post('/maintenance-units/export', params, { responseType: 'blob' }),
}

export const monthlyFeeApi = {
  list: (params?: any) => request.get('/monthly-fees', { params }),
  get: (id: string) => request.get(`/monthly-fees/${id}`),
  generate: (data?: any) => request.post('/monthly-fees/generate', data || {}),
  updateStatus: (id: string, status: string) => request.put(`/monthly-fees/${id}/status`, { status }),
  export: (params?: any) => request.post('/monthly-fees/export', params, { responseType: 'blob' }),
  import: (file: FormData) => request.post('/monthly-fees/import', file, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  }),
}

export const maintenancePlanApi = {
  list: (params?: any) => request.get('/maintenance-plans', { params }),
  get: (id: string) => request.get(`/maintenance-plans/${id}`),
  create: (data: any) => request.post('/maintenance-plans', data),
  batchCreate: (data: any) => request.post('/maintenance-plans/batch', data),
  updateStatus: (id: string, status: string) => request.put(`/maintenance-plans/${id}/status`, { status }),
  remove: (id: string) => request.delete(`/maintenance-plans/${id}`),
}
