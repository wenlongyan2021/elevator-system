App<IAppOption>({
  globalData: {
    token: '',
    userInfo: null,
    baseUrl: 'https://elevator.ruihaoe.cn/api',
  },
  onLaunch() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
    }
    // Flush offline queue on launch
    this.flushOfflineQueue()
  },

  // Offline queue
  getOfflineQueue(): any[] {
    return wx.getStorageSync('offlineRepairs') || []
  },

  addToOfflineQueue(item: any) {
    const queue = this.getOfflineQueue()
    queue.push({ ...item, _queuedAt: Date.now() })
    wx.setStorageSync('offlineRepairs', queue)
    wx.showToast({ title: `已离线保存，待网络恢复后自动提交（共${queue.length}条）`, icon: 'none', duration: 2000 })
  },

  removeFromOfflineQueue(index: number) {
    const queue = this.getOfflineQueue()
    queue.splice(index, 1)
    wx.setStorageSync('offlineRepairs', queue)
  },

  async flushOfflineQueue() {
    const queue = this.getOfflineQueue()
    if (queue.length === 0) return

    const token = wx.getStorageSync('token')
    if (!token) return

    wx.getNetworkType({
      success: (net) => {
        if (net.networkType === 'none' || net.networkType === 'unknown') return
      },
    })

    const { repairApi } = await import('./utils/api')
    const failed: number[] = []

    for (let i = queue.length - 1; i >= 0; i--) {
      const item = queue[i]
      try {
        const repair = await repairApi.create({
          elevatorId: item.elevatorId,
          urgency: item.urgency,
          stopType: item.stopType || 'NO_STOP',
          description: item.description,
        })
        // Upload photos if available
        for (const photo of (item.photos || [])) {
          try {
            await repairApi.uploadMedia(repair.id, photo)
          } catch { /* skip */ }
        }
        this.removeFromOfflineQueue(i)
      } catch {
        failed.push(i)
      }
    }

    if (failed.length < queue.length) {
      wx.showToast({ title: `离线报修已自动提交${queue.length - failed.length}条`, icon: 'success' })
    }
  },
})
