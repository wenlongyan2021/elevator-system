import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const token = ref(localStorage.getItem('token') || '')

  async function login(phone: string, password: string) {
    const res: any = await authApi.login({ phone, password })
    token.value = res.accessToken
    user.value = res.user
    localStorage.setItem('token', res.accessToken)
    return res
  }

  async function fetchProfile() {
    const res: any = await authApi.profile()
    user.value = res
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  return { user, token, login, fetchProfile, logout }
})
