Component({
  properties: {},
  data: {},
  methods: {
    scan(): Promise<string> {
      return new Promise((resolve, reject) => {
        wx.scanCode({
          success: (res) => resolve(res.result),
          fail: (err) => reject(err),
        })
      })
    },
  },
})
