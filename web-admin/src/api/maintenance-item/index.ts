import { request } from './axios'

export const maintenanceItemApi = {
  findByPlanType: (planType: string) =>
    request.get(`/maintenance-items/plan-type/${planType}`),

  findGroupedByCategory: (planType: string) =>
    request.get(`/maintenance-items/grouped/${planType}`),

  getPlanTypeSummary: () =>
    request.get('/maintenance-items/summary'),
}