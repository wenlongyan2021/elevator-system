Page({
  data: {
    loggedIn: false,
    account: '',
    password: '',
    logging: false,
    userInfo: null,
    avatarLetter: '用',
    roleText: '',
    unreadCount: 0,
  },

  onShow() {
    this.checkLogin()
  },

  checkLogin() {
    const token = wx.getStorageSync('token')
    if (token) {
      const app = getApp()
      app.globalData.token = token
      this.loadProfile()
    }
    this.setData({ loggedIn: !!token })
  },

  onAccountInput(e: any) {
    this.setData({ account: e.detail.value })
  },

  onPasswordInput(e: any) {
    this.setData({ password: e.detail.value })
  },

  async handleLogin() {
    const { account, password } = this.data
    if (!account) {
      wx.showToast({ title: '请输入账号', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }

    this.setData({ logging: true })
    try {
      const { authApi } = await import('../../utils/api')
      const res = await authApi.login(account, password)

      wx.setStorageSync('token', res.accessToken)
      const app = getApp()
      app.globalData.token = res.accessToken

      this.setData({
        loggedIn: true,
        userInfo: res.user,
        logging: false,
      })
      this.updateUserDisplay(res.user)

      // Fetch unread notification count
      const { notificationApi } = await import('../../utils/api')
      notificationApi.unreadCount().then((r: any) => {
        this.setData({ unreadCount: r.count || r.unreadCount || 0 })
      }).catch(() => {})

      wx.showToast({ title: '登录成功', icon: 'success' })
    } catch {
      wx.showToast({ title: '登录失败', icon: 'none' })
      this.setData({ logging: false })
    }
  },

  async loadProfile() {
    try {
      const { authApi } = await import('../../utils/api')
      const user = await authApi.profile()
      this.setData({
        userInfo: user,
        loggedIn: true,
      })
      this.updateUserDisplay(user)
      const { notificationApi } = await import('../../utils/api')
      notificationApi.unreadCount().then((res: any) => {
        const count = res.count || res.unreadCount || 0
        this.setData({ unreadCount: count })
      }).catch(() => {})
    } catch { /* handled */ }
  },

  goNotifications() {
    wx.navigateTo({ url: '/pages/notification/notification' })
  },

  goMaintenancePlan() {
    wx.navigateTo({ url: '/pages/maintenance-plan/maintenance-plan' })
  },

  updateUserDisplay(user: any) {
    const letter = user.name ? user.name.charAt(0) : '用'
    const roles: Record<string, string> = {
      ADMIN: '系统管理员',
      PROJECT_MANAGER: '项目经理',
      PROJECT_SUPERVISOR: '项目主管',
      CUSTOMER_SERVICE: '客服管家',
      ENGINEER: '工程',
      SECURITY: '秩序',
      ELEVATOR_MAINTAINER: '电梯维保员',
      SAFETY_OFFICER: '安全员',
      SAFETY_DIRECTOR: '安全总监',
    }
    this.setData({
      avatarLetter: letter,
      roleText: roles[user.role] || user.role || '',
    })
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确认退出登录？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token')
          getApp().globalData.token = ''
          this.setData({
            loggedIn: false,
            userInfo: null,
            account: '',
            password: '',
          })
        }
      },
    })
  },

  viewProfile() {
    wx.showToast({ title: '个人信息', icon: 'none' })
  },
})
export {}
