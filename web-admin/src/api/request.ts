import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Simple retry wrapper: retries up to 2 times for idempotent methods on network error
async function withRetry(err: any, retries = 2): Promise<any> {
  const config = err.config
  if (!config || retries <= 0) throw err
  // Only retry idempotent methods on network/server errors
  const method = (config.method || '').toLowerCase()
  const isIdempotent = ['get', 'head', 'options', 'put', 'delete'].includes(method)
  const isRetryable = !err.response || (err.response.status >= 500)
  if (!isIdempotent || !isRetryable) throw err

  config.__retryCount = (config.__retryCount || 0) + 1
  await new Promise((r) => setTimeout(r, 1000 * config.__retryCount)) // linear backoff
  return request(config)
}

request.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status
    const msg = err.response?.data?.message || err.message || '请求失败'
    if (status === 401) {
      localStorage.removeItem('token')
      router.push('/login')
      return Promise.reject(err)
    }
    // Attempt retry for network / 5xx errors
    if (!status || status >= 500) {
      return withRetry(err)
    }
    ElMessage.error(msg)
    return Promise.reject(err)
  },
)

export default request
