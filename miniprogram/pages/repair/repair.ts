import { statusText, statusType } from '../../utils/util'

Page({
  data: {
    activeTab: 'list',
    repairs: [],
    offlineCount: 0,

    // Form
    projects: [],
    selectedProjectName: '',
    selectedProjectId: '',
    elevators: [],
    selectedElevatorLabel: '',
    selectedElevatorId: '',
    formUrgency: 'NORMAL',
    formStopType: '',
    selectedStopLabel: '',
    formDescription: '',
    photos: [] as string[],
    submitting: false,

    // Voice recording
    recording: false,
    recordedVoice: '',
    recordingDuration: 0,

    urgencyOptions: [
      { label: '一般', value: 'LOW' },
      { label: '普通', value: 'NORMAL' },
      { label: '紧急', value: 'EMERGENCY' },
    ],
    stopOptions: [
      { label: '未停梯', value: 'NO_STOP' },
      { label: '已停梯', value: 'STOPPED' },
    ],
  },

  statusText,
  statusType,

  onLoad(options: any) {
    if (options.elevatorId) {
      this.setData({
        activeTab: 'create',
        selectedElevatorId: options.elevatorId,
      })
    }
  },

  onShow() {
    this.loadRepairs()
    this.loadProjects()
    // Flush offline queue and update badge
    const app = getApp<IAppOption>()
    app.flushOfflineQueue()
    const queue = app.getOfflineQueue()
    this.setData({ offlineCount: queue.length })
  },

  async loadRepairs() {
    try {
      const { repairApi } = await import('../../utils/api')
      const res = await repairApi.list({ page: 1, limit: 50 })
      const list = res.list || res.records || []
      this.setData({ repairs: list })
    } catch { /* handled */ }
  },

  async loadProjects() {
    try {
      const { projectApi } = await import('../../utils/api')
      const res = await projectApi.list()
      const list = res.list || res.records || res || []
      this.setData({ projects: list })
    } catch { /* handled */ }
  },

  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
    if (tab === 'create' && this.data.selectedElevatorId) {
      this.loadElevators()
    }
  },

  async loadElevators() {
    try {
      const { elevatorApi } = await import('../../utils/api')
      const res = await elevatorApi.list({ limit: 999 })
      const list = res.list || res.records || []
      const elevators = list.map((e: any) => ({
        id: e.id,
        label: `${e.regCode || e.registrationCode || '--'} - ${e.building || ''}`,
      }))
      this.setData({ elevators })
    } catch { /* handled */ }
  },

  onProjectChange(e: any) {
    const idx = e.detail.value
    const project = this.data.projects[idx]
    if (project) {
      this.setData({
        selectedProjectName: project.name,
        selectedProjectId: project.id,
      })
      this.loadElevators()
    }
  },

  onElevatorChange(e: any) {
    const idx = e.detail.value
    const elevator = this.data.elevators[idx]
    if (elevator) {
      this.setData({
        selectedElevatorLabel: elevator.label,
        selectedElevatorId: elevator.id,
      })
    }
  },

  setUrgency(e: any) {
    this.setData({ formUrgency: e.currentTarget.dataset.value })
  },

  onStopTypeChange(e: any) {
    const idx = e.detail.value
    const opt = this.data.stopOptions[idx]
    if (opt) {
      this.setData({ formStopType: opt.value, selectedStopLabel: opt.label })
    }
  },

  onDescInput(e: any) {
    this.setData({ formDescription: e.detail.value })
  },

  takePhoto() {
    wx.chooseMedia({
      count: 6 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['camera'],
      sizeType: ['compressed'],
      success: (res: any) => {
        const newPhotos = res.tempFiles.map((f: any) => f.tempFilePath)
        this.setData({ photos: [...this.data.photos, ...newPhotos] })
      },
    })
  },

  removePhoto(e: any) {
    const idx = e.currentTarget.dataset.index
    const photos = [...this.data.photos]
    photos.splice(idx, 1)
    this.setData({ photos })
  },

  startRecording() {
    const recorderManager = wx.getRecorderManager()
    const durationTimer: number = 0

    recorderManager.onStart(() => {
      this.setData({ recording: true, recordingDuration: 0 })
    })

    recorderManager.onError(() => {
      this.setData({ recording: false })
      wx.showToast({ title: '录音失败', icon: 'none' })
    })

    recorderManager.onStop((res) => {
      this.setData({ recording: false, recordedVoice: res.tempFilePath })
    })

    wx.authorize({
      scope: 'scope.record',
      success: () => {
        recorderManager.start({ duration: 60000, format: 'mp3' })
      },
      fail: () => {
        wx.showToast({ title: '需要录音权限', icon: 'none' })
      },
    })
  },

  stopRecording() {
    const recorderManager = wx.getRecorderManager()
    recorderManager.stop()
  },

  playVoice() {
    if (!this.data.recordedVoice) return
    const audioCtx = wx.createInnerAudioContext()
    audioCtx.src = this.data.recordedVoice
    audioCtx.play()
  },

  clearVoice() {
    this.setData({ recordedVoice: '', recordingDuration: 0 })
  },

  async submitRepair() {
    if (!this.data.selectedElevatorId) {
      wx.showToast({ title: '请选择电梯', icon: 'none' })
      return
    }
    if (!this.data.formDescription) {
      wx.showToast({ title: '请填写故障描述', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const { repairApi } = await import('../../utils/api')
      const repair = await repairApi.create({
        elevatorId: this.data.selectedElevatorId,
        urgency: this.data.formUrgency,
        stopType: this.data.formStopType || 'NO_STOP',
        description: this.data.formDescription,
      })

      // Upload photos if any
      for (const photo of this.data.photos) {
        try {
          await repairApi.uploadMedia(repair.id, photo)
        } catch { /* skip failed uploads */ }
      }

      // Upload voice recording if any
      if (this.data.recordedVoice) {
        try {
          const token = wx.getStorageSync('token') || getApp().globalData.token
          await new Promise<any>((resolve, reject) => {
            wx.uploadFile({
              url: getApp().globalData.baseUrl + `/repairs/${repair.id}/media`,
              filePath: this.data.recordedVoice,
              name: 'file',
              header: { Authorization: 'Bearer ' + token },
              success(r) { resolve(JSON.parse(r.data)) },
              fail: reject,
            })
          })
        } catch { /* skip failed upload */ }
      }

      wx.showToast({ title: '报修提交成功', icon: 'success' })
      this.setData({
        activeTab: 'list',
        selectedElevatorId: '',
        selectedElevatorLabel: '',
        formUrgency: 'NORMAL',
        formStopType: '',
        selectedStopLabel: '',
        formDescription: '',
        photos: [],
        recordedVoice: '',
      })
      this.loadRepairs()
    } catch {
      // Offline save: queue form data for later auto-submit
      try {
        const app = getApp<IAppOption>()
        app.addToOfflineQueue({
          elevatorId: this.data.selectedElevatorId,
          urgency: this.data.formUrgency,
          stopType: this.data.formStopType || 'NO_STOP',
          description: this.data.formDescription,
          photos: this.data.photos,
        })
        this.setData({
          activeTab: 'list',
          selectedElevatorId: '',
          selectedElevatorLabel: '',
          formUrgency: 'NORMAL',
          formStopType: '',
          selectedStopLabel: '',
          formDescription: '',
          photos: [],
          recordedVoice: '',
        })
      } catch {
        wx.showToast({ title: '提交失败', icon: 'none' })
      }
    } finally {
      this.setData({ submitting: false })
    }
  },

  viewDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/repair-detail/repair-detail?id=${id}` })
  },
})
export {}
