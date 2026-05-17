<template>
  <el-container style="height:100vh">
    <el-aside width="220px" style="background:#304156">
      <div class="logo">电梯管理系统</div>
      <el-menu
        :default-active="route.path"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard"><el-icon><DataAnalysis /></el-icon>看板</el-menu-item>
        <el-menu-item index="/organization"><el-icon><User /></el-icon>组织架构</el-menu-item>
        <el-menu-item index="/elevator"><el-icon><Monitor /></el-icon>电梯台账</el-menu-item>
        <el-menu-item index="/contract"><el-icon><Document /></el-icon>合同管理</el-menu-item>
        <el-menu-item index="/maintenance-unit"><el-icon><OfficeBuilding /></el-icon>维保单位</el-menu-item>
        <el-menu-item index="/monthly-fee"><el-icon><Coin /></el-icon>月费管理</el-menu-item>
        <el-menu-item index="/maintenance-plan"><el-icon><Calendar /></el-icon>维保计划</el-menu-item>
        <el-menu-item index="/repair"><el-icon><WarningFilled /></el-icon>报修管理</el-menu-item>
        <el-menu-item index="/workflow"><el-icon><List /></el-icon>审批流程</el-menu-item>
        <el-menu-item index="/inspection"><el-icon><Camera /></el-icon>巡查维保</el-menu-item>
        <el-menu-item index="/qrcode"><el-icon><Grid /></el-icon>二维码管理</el-menu-item>
        <el-menu-item index="/notification"><el-icon><Bell /></el-icon>消息通知</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="background:#fff;border-bottom:1px solid #e6e6e6;display:flex;align-items:center;justify-content:flex-end">
        <el-dropdown @command="handleCommand">
          <span style="cursor:pointer">
            {{ auth.user?.name || '用户' }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </template>
        </el-dropdown>
      </el-header>
      <el-main style="background:#f0f2f5">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  DataAnalysis, User, Monitor, Document,
  OfficeBuilding, Coin, Calendar,
  WarningFilled, List, Camera, Grid, Bell,
  ArrowDown,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

onMounted(() => { if (!auth.user) auth.fetchProfile() })

function handleCommand(cmd: string) {
  if (cmd === 'logout') {
    auth.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #1f2d3d;
}
</style>
