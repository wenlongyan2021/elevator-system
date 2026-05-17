import { formatTime, formatDate } from '../../utils/util'

Page({
  data: {
    records: [],
    takingPhoto: false,
    submitting: false,
    // Elevator selection
    elevatorId: '',
    elevatorList: [],
    selectedElevatorName: '',
    showElevatorPicker: false,
  },

  onShow() {
    this.loadRecords()
    this.loadElevators()
  },

  async loadElevators() {
    try {
      const { elevatorApi } = await import('../../utils/api')
      const res = await elevatorApi.list({ limit: 9999 })
      const list = res.list || res.records || res.items || []
      this.setData({ elevatorList: list })
    } catch { /* handled */ }
  },

  onElevatorChange(e: any) {
    const id = e.detail.value
    const elevator = this.data.elevatorList.find((e: any) => e.id === id)
    this.setData({
      elevatorId: id,
      selectedElevatorName: elevator ? `${elevator.regCode || ''} ${elevator.building || ''} ${elevator.locationDesc || ''}` : '',
    })
  },

  async loadRecords() {
    try {
      const { inspectionApi } = await import('../../utils/api')
      const res = await inspectionApi.list({ page: 1, limit: 20 })
      const list = res.list || res.records || res.items || []
      this.setData({ records: list })
    } catch { /* handled */ }
  },

  startInspection() {
    if (!this.data.elevatorId) {
      wx.showToast({ title: '请先选择巡查电梯', icon: 'none' })
      return
    }

    wx.getLocation({
      type: 'wgs84',
      success: (loc) => {
        this.takeWatermarkPhoto(loc)
      },
      fail() {
        wx.showToast({ title: '获取位置失败，请在设置中开启定位权限', icon: 'none' })
      },
    })
  },

  takeWatermarkPhoto(location: any) {
    this.setData({ takingPhoto: true })

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      sizeType: ['compressed'],
      success: (res: any) => {
        const tempFile = res.tempFiles[0].tempFilePath
        this.addWatermark(tempFile, location)
      },
      fail: () => {
        wx.showToast({ title: '拍照取消或失败', icon: 'none' })
        this.setData({ takingPhoto: false })
      },
    })
  },

  addWatermark(tempFilePath: string, location: any) {
    const ctx = wx.createCanvasContext('watermarkCanvas', this)
    const app = getApp<IAppOption>()
    const userName = app.globalData.userInfo?.name || ''
    const elevatorName = this.data.selectedElevatorName || ''

    wx.getImageInfo({
      src: tempFilePath,
      success: (imgInfo) => {
        const w = 375
        const h = w * (imgInfo.height / imgInfo.width)

        ctx.drawImage(tempFilePath, 0, 0, w, h)

        // Semi-transparent overlay at bottom
        ctx.setFillStyle('rgba(0, 0, 0, 0.55)')
        ctx.fillRect(0, h - 60, w, 60)

        // Watermark text: time + person + elevator + location
        ctx.setFillStyle('#ffffff')
        ctx.setFontSize(11)
        const now = new Date()
        const dateStr = formatDate(now)
        const timeStr = formatTime(now).split(' ')[1]
        const locStr = location
          ? `${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}`
          : ''
        ctx.fillText(`${dateStr} ${timeStr}  ${userName}`, 8, h - 44)
        ctx.fillText(`${elevatorName}`, 8, h - 28)
        ctx.fillText(`${locStr}`, 8, h - 12)

        ctx.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId: 'watermarkCanvas',
            success: (result: any) => {
              this.uploadPhoto(result.tempFilePath, location)
            },
            fail: () => {
              this.uploadPhoto(tempFilePath, location)
            },
            complete: () => {
              this.setData({ takingPhoto: false })
            },
          }, this)
        })
      },
      fail: () => {
        this.uploadPhoto(tempFilePath, location)
        this.setData({ takingPhoto: false })
      },
    })
  },

  async uploadPhoto(filePath: string, location: any) {
    this.setData({ submitting: true })
    try {
      const { inspectionApi } = await import('../../utils/api')
      const app = getApp<IAppOption>()
      const token = wx.getStorageSync('token')

      // Step 1: Upload photo file
      const uploadRes = await new Promise<any>((resolve, reject) => {
        wx.uploadFile({
          url: app.globalData.baseUrl + '/files/upload',
          filePath,
          name: 'file',
          header: { Authorization: 'Bearer ' + token },
          success(r) {
            if (r.statusCode === 200) resolve(JSON.parse(r.data))
            else reject(new Error('上传失败'))
          },
          fail: reject,
        })
      })

      // Step 2: Create inspection task
      const task = await inspectionApi.create({
        elevatorId: this.data.elevatorId,
        inspectorId: app.globalData.userInfo?.id,
        type: 'PATROL',
        latitude: location?.latitude,
        longitude: location?.longitude,
      })

      const taskId = task.id || task.data?.id

      // Step 3: Add photo to task (store web-accessible URL)
      if (taskId) {
        const filename = uploadRes.filename || ''
        const photoUrl = filename
          ? `${app.globalData.baseUrl}/uploads/${filename}`
          : (uploadRes.url || uploadRes.path || uploadRes)
        await inspectionApi.addPhoto(taskId, {
          filePath: photoUrl,
        })
      }

      wx.showToast({ title: '巡查记录已保存', icon: 'success' })
      this.loadRecords()
    } catch {
      wx.showToast({ title: '上传失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },
})
export {}
