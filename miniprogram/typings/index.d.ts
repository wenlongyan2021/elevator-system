interface IAppOption {
  globalData: {
    token: string
    userInfo: any
    baseUrl: string
  }
  getOfflineQueue(): any[]
  addToOfflineQueue(item: any): void
  removeFromOfflineQueue(index: number): void
  flushOfflineQueue(): Promise<void>
}
