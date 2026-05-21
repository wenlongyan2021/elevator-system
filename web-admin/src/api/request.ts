import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  console.log('[REQUEST] URL:', config.url, 'Token exists:', !!token)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('[REQUEST] Added Authorization header')
  }
  return config
})

async function withRetry(err: any, retries = 2): Promise<any> {
  const config = err.config
  if (!config || retries <= 0) throw err
  const method = (config.method || '').toLowerCase()
  const isIdempotent = ['get', 'head', 'options', 'put', 'delete'].includes(method)
  const isRetryable = !err.response || (err.response.status >= 500)
  if (!isIdempotent || !isRetryable) throw err

  config.__retryCount = (config.__retryCount || 0) + 1
  await new Promise((r) => setTimeout(r, 1000 * config.__retryCount))
  return request(config)
}

request.interceptors.response.use(
  (res) => {
    console.log('[RESPONSE] Success:', res.config.url)
    return res.data
  },
  (err) => {
    const status = err.response?.status
    const msg = err.response?.data?.message || err.message || '请求失败'
    console.error('[RESPONSE ERROR] URL:', err.config?.url, 'Status:', status, 'Message:', msg)
    
    if (status === 401) {
      console.error('[401 ERROR] Token expired or invalid, redirecting to login')
      localStorage.removeItem('token')
      router.push('/login')
      return Promise.reject(err)
    }
    
    if (!status || status >= 500) {
      return withRetry(err)
    }
    ElMessage.error(msg)
    return Promise.reject(err)
  },
)

export default request
