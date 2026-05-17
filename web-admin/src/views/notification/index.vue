<template>
  <div class="notification-list">
    <!-- Page header -->
    <div class="page-header">
      <h2 class="page-title">消息通知</h2>
      <el-button
        v-if="unreadCount > 0"
        type="primary"
        plain
        size="small"
        @click="handleMarkAllRead"
      >
        全部标记已读
      </el-button>
    </div>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane :label="`未读 (${unreadCount})`" name="unread" />
    </el-tabs>

    <!-- Loading -->
    <div v-if="loading" v-loading="loading" style="height: 120px" />

    <!-- Empty state -->
    <el-empty v-else-if="!list.length" description="暂无消息" />

    <!-- Notification Cards -->
    <div v-else class="notification-cards">
      <el-card
        v-for="item in list"
        :key="item.id"
        shadow="never"
        class="notification-card"
        :class="{ unread: !item.isRead }"
        @click="handleClick(item)"
      >
        <div class="card-body">
          <div class="card-icon">
            <el-icon :size="28" :color="iconColor(item.type)">
              <component :is="iconComponent(item.type)" />
            </el-icon>
          </div>
          <div class="card-content">
            <div class="card-title-row">
              <span class="card-title">{{ item.title }}</span>
              <span v-if="!item.isRead" class="unread-dot" />
            </div>
            <p class="card-text">{{ item.content }}</p>
            <span class="card-time">{{ item.createdAt }}</span>
          </div>
          <div class="card-status" v-if="!item.isRead">
            <el-badge is-dot />
          </div>
        </div>
      </el-card>
    </div>

    <!-- Pagination -->
    <div class="pagination-wrap" v-if="total > pageSize">
      <el-pagination
        v-model:page-size="pageSize"
        layout="total, prev, pager, next"
        :total="total"
        @current-change="fetchList"
        v-model:current-page="currentPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Bell,
  WarningFilled,
  SuccessFilled,
  InfoFilled,
  ChatDotSquare,
} from '@element-plus/icons-vue'
import { notificationApi } from '@/api'

const router = useRouter()

interface NotificationItem {
  id: string
  title: string
  content: string
  type?: string
  isRead: boolean
  createdAt: string
  refId?: string
}

const activeTab = ref('all')
const list = ref<NotificationItem[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const unreadCount = ref(0)

function iconColor(type?: string): string {
  const map: Record<string, string> = {
    warning: '#e6a23c',
    error: '#f56c6c',
    success: '#67c23a',
    info: '#909399',
    repair: '#409eff',
    workflow: '#409eff',
    system: '#909399',
  }
  return map[type ?? ''] ?? '#409eff'
}

function iconComponent(type?: string): any {
  const map: Record<string, any> = {
    warning: WarningFilled,
    error: WarningFilled,
    success: SuccessFilled,
    info: InfoFilled,
    repair: ChatDotSquare,
    workflow: ChatDotSquare,
    system: Bell,
  }
  return map[type ?? ''] ?? Bell
}

async function fetchUnreadCount() {
  try {
    const res = await notificationApi.unreadCount()
    unreadCount.value = (res as any).count ?? 0
  } catch {
    unreadCount.value = 0
  }
}

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: pageSize.value,
    }
    if (activeTab.value === 'unread') {
      params.isRead = false
    }
    const res: any = await notificationApi.list(params)
    list.value = res.list ?? res.records ?? res.items ?? []
    total.value = res.total ?? res.count ?? 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function handleClick(item: NotificationItem) {
  if (!item.isRead) {
    try {
      await notificationApi.markRead(item.id)
      item.isRead = true
      if (unreadCount.value > 0) unreadCount.value--
    } catch {
      // Silently handle – marking read is non-critical
    }
  }
  // Navigate to related business page
  if (item.refId) {
    const type = item.type?.toLowerCase() || ''
    if (type === 'repair') router.push(`/repair/${item.refId}`)
    else if (type === 'contract') router.push(`/contract/${item.refId}`)
    else if (type === 'inspection') router.push('/inspection')
    else if (type === 'workflow') router.push(`/workflow`)
  }
}

async function handleMarkAllRead() {
  try {
    await notificationApi.markAllRead()
    ElMessage.success('已全部标记已读')
    unreadCount.value = 0
    fetchList()
  } catch {
    ElMessage.error('操作失败')
  }
}

function handleTabChange() {
  currentPage.value = 1
  fetchList()
}

onMounted(() => {
  fetchUnreadCount()
  fetchList()
})
</script>

<style scoped>
.notification-list {
  padding: 16px;
  max-width: 760px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.notification-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-card {
  cursor: pointer;
  border: 1px solid #ebeef5;
  transition: background-color 0.2s;
}

.notification-card:hover {
  background-color: #f5f7fa;
}

.notification-card.unread {
  border-left: 3px solid #409eff;
}

.card-body {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.card-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f5ff;
  border-radius: 50%;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #409eff;
  flex-shrink: 0;
}

.card-text {
  margin: 0 0 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-time {
  font-size: 12px;
  color: #c0c4cc;
}

.card-status {
  flex-shrink: 0;
  padding-top: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}
</style>
