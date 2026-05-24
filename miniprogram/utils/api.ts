const app = getApp<IAppOption>()

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
  header?: Record<string, string>
}

function request<T = any>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token') || app.globalData.token

    wx.request({
      url: app.globalData.baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success(res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          app.globalData.token = ''
          wx.reLaunch({ url: '/pages/index/index' })
          reject(new Error('未登录'))
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
        } else {
          const msg = (res.data as any)?.message || '请求失败'
          wx.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        }
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      },
    })
  })
}

export const authApi = {
  login: (account: string, password: string) =>
    request<{ accessToken: string; user: any }>({
      url: '/auth/login',
      method: 'POST',
      data: { account, password },
    }),
  wechatLogin: (code: string) =>
    request<{ accessToken: string; user: any }>({
      url: '/auth/wechat-login',
      method: 'POST',
      data: { code },
    }),
  profile: () => request<any>({ url: '/auth/profile' }),
}

export const elevatorApi = {
  list: (params?: any) =>
    request<any>({ url: '/elevators', data: params }),
  get: (id: string) => request<any>({ url: `/elevators/${id}` }),
}

export const repairApi = {
  list: (params?: any) =>
    request<any>({ url: '/repairs', data: params }),
  get: (id: string) => request<any>({ url: `/repairs/${id}` }),
  create: (data: any) =>
    request<any>({ url: '/repairs', method: 'POST', data }),
  accept: (id: string, data: any) =>
    request<any>({ url: `/repairs/${id}/accept`, method: 'PUT', data }),
  complete: (id: string, data: any) =>
    request<any>({ url: `/repairs/${id}/repair`, method: 'PUT', data }),
  getParts: (id: string) => request<any>({ url: `/repairs/${id}/parts` }),
  getCosts: (id: string) => request<any>({ url: `/repairs/${id}/costs` }),
  uploadMedia: (id: string, filePath: string) => {
    const token = wx.getStorageSync('token') || app.globalData.token
    return new Promise<any>((resolve, reject) => {
      wx.uploadFile({
        url: app.globalData.baseUrl + `/repairs/${id}/media`,
        filePath,
        name: 'file',
        header: {
          Authorization: `Bearer ${token}`,
        },
        success(res) {
          if (res.statusCode === 200) {
            resolve(JSON.parse(res.data))
          } else {
            reject(new Error('上传失败'))
          }
        },
        fail: reject,
      })
    })
  },
}

export const inspectionApi = {
  list: (params?: any) =>
    request<any>({ url: '/inspections', data: params }),
  create: (data: any) =>
    request<any>({ url: '/inspections', method: 'POST', data }),
  addPhoto: (id: string, data: any) =>
    request<any>({ url: `/inspections/${id}/photos`, method: 'POST', data }),
}

export const workflowApi = {
  get: (repairOrderId: string) =>
    request<any>({ url: `/workflows/${repairOrderId}` }),
  approve: (repairOrderId: string, data?: any) =>
    request<any>({ url: `/workflows/${repairOrderId}/approve`, method: 'POST', data }),
  reject: (repairOrderId: string, data?: any) =>
    request<any>({ url: `/workflows/${repairOrderId}/reject`, method: 'POST', data }),
}

export const dashboardApi = {
  overview: () => request<any>({ url: '/dashboard/overview' }),
}

export const maintenancePlanApi = {
  list: (params?: any) =>
    request<any>({ url: '/maintenance-plans', data: params }),
  updateStatus: (id: string, status: string) =>
    request<any>({ url: `/maintenance-plans/${id}/status`, method: 'PUT', data: { status } }),
}

export const notificationApi = {
  list: (params?: any) =>
    request<any>({ url: '/notifications', data: params }),
  unreadCount: () =>
    request<any>({ url: '/notifications/unread-count' }),
  markRead: (id: string) =>
    request<any>({ url: `/notifications/${id}/read`, method: 'PUT' }),
  markAllRead: () =>
    request<any>({ url: '/notifications/read-all', method: 'PUT' }),
}

export const projectApi = {
  list: (params?: any) =>
    request<any>({ url: '/projects', data: params }),
}
