Component({
  properties: {},
  data: {},
  methods: {
    addWatermark(
      imagePath: string,
      location: { latitude: number; longitude: number },
    ): Promise<string> {
      return new Promise((resolve, reject) => {
        const query = this.createSelectorQuery()
        query.select('#watermarkCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            const canvas = res[0]?.node as any
            if (!canvas) {
              // Fallback: return original path
              resolve(imagePath)
              return
            }
            const ctx = canvas.getContext('2d')
            const img = canvas.createImage()
            img.src = imagePath
            img.onload = () => {
              const w = 375
              const h = w * (img.height / img.width)
              canvas.width = w
              canvas.height = h
              ctx.drawImage(img, 0, 0, w, h)
              // Watermark overlay
              ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
              ctx.fillRect(0, h - 50, w, 50)
              ctx.fillStyle = '#ffffff'
              ctx.font = '12px sans-serif'
              const now = new Date()
              const pad = (n: number) => n < 10 ? '0' + n : '' + n
              const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
              const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`
              ctx.fillText(`${dateStr} ${timeStr}`, 8, h - 30)
              ctx.fillText(`${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}`, 8, h - 12)
              // Export
              wx.canvasToTempFilePath({
                canvas,
                success: (result) => resolve(result.tempFilePath),
                fail: () => resolve(imagePath),
              }, this)
            }
            img.onerror = () => resolve(imagePath)
          })
      })
    },
  },
})
