<template>
  <div class="login-container">
    <div class="login-card">
      <h2 class="login-title">电梯管理系统</h2>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="phone">
          <el-input v-model="form.phone" placeholder="手机号" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-button type="primary" size="large" :loading="loading" style="width:100%" @click="handleLogin" native-type="button">
          {{ loading ? '登录中...' : '登 录' }}
        </el-button>
      </el-form>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const errorMessage = ref('')
const formRef = ref()

const form = reactive({ phone: '', password: '' })
const rules = {
  phone: [{ required: true, message: '请输入手机号' }],
  password: [{ required: true, message: '请输入密码' }],
}

async function handleLogin() {
  console.log('[LOGIN] Starting login process...')
  errorMessage.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    console.log('[LOGIN] Form validation failed')
    return
  }
  
  loading.value = true
  try {
    console.log('[LOGIN] Calling auth.login with:', form.phone)
    await auth.login(form.phone, form.password)
    console.log('[LOGIN] Login success, auth store updated')
    
    ElMessage.success('登录成功')
    
    setTimeout(() => {
      console.log('[LOGIN] Redirecting to /dashboard')
      router.push('/dashboard')
    }, 300)
    
  } catch (error: any) {
    console.error('[LOGIN] Login failed:', error)
    const errorMsg = error?.response?.data?.message || error?.message || '登录失败，请检查账号密码'
    errorMessage.value = errorMsg
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}
.login-title {
  text-align: center;
  margin-bottom: 30px;
  color: #303133;
}
.error-message {
  margin-top: 16px;
  padding: 12px;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 14px;
  text-align: center;
}
</style>
