<template>
  <div>
    <!-- Alerts Section -->
    <el-card v-if="alertData.alertCount > 0" shadow="hover" style="margin-bottom: 20px; border-left: 4px solid #E6A23C;">
      <template #header>
        <div class="page-header">
          <span><el-icon style="vertical-align: middle; margin-right: 4px;"><WarningFilled /></el-icon>配件库存预警</span>
          <el-tag :type="alertData.alertCount > 10 ? 'danger' : 'warning'" effect="plain">
            {{ alertData.alertCount }} 项预警
          </el-tag>
        </div>
      </template>
      <el-alert
        :title="`${alertData.startDate} 至 ${alertData.endDate}，用量 ≥ ${alertData.minQuantity} 或次数 ≥ ${alertData.minUseCount} 的配件`"
        type="warning" show-icon :closable="false" style="margin-bottom: 12px" />
      <el-table :data="alertData.alerts" stripe size="small" max-height="400">
        <el-table-column prop="partName" label="配件名称" min-width="160" />
        <el-table-column prop="partModel" label="型号" min-width="120">
          <template #default="{ row }">{{ row.partModel || '-' }}</template>
        </el-table-column>
        <el-table-column prop="totalQuantity" label="使用量" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.totalQuantity >= alertData.minQuantity ? 'danger' : 'warning'" size="small">
              {{ row.totalQuantity }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="useCount" label="使用次数" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.useCount >= alertData.minUseCount ? 'danger' : 'warning'" size="small">
              {{ row.useCount }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="avgQuantityPerUse" label="次均用量" width="90" align="center" />
        <el-table-column label="预警原因" min-width="220">
          <template #default="{ row }">
            <el-tag v-for="msg in row.alerts" :key="msg" size="small" style="margin-right: 4px; margin-bottom: 2px;">
              {{ msg }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Stats Section -->
    <el-card>
      <template #header>
        <div class="page-header">
          <span>配件使用统计</span>
          <div>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 240px; margin-right: 8px"
            />
            <el-button type="primary" @click="fetchData">查询</el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="partName" label="配件名称" min-width="160" />
        <el-table-column prop="partModel" label="型号" min-width="140">
          <template #default="{ row }">{{ row.partModel || '-' }}</template>
        </el-table-column>
        <el-table-column prop="totalQuantity" label="使用数量" width="100" align="center" />
        <el-table-column prop="useCount" label="使用次数" width="100" align="center" />
        <el-table-column label="总费用" width="140" align="right">
          <template #default="{ row }">¥{{ Number(row.totalCost).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="percentage" label="占比" width="100" align="center">
          <template #default="{ row }">{{ row.percentage }}%</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && list.length === 0" description="暂无配件使用记录" :image-size="80" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { repairApi } from '@/api'
import { WarningFilled } from '@element-plus/icons-vue'

const list = ref<any[]>([])
const loading = ref(false)
const dateRange = ref<string[]>([])
const alertData = reactive({
  startDate: '',
  endDate: '',
  minQuantity: 10,
  minUseCount: 5,
  totalParts: 0,
  alertCount: 0,
  alerts: [] as any[],
})

async function fetchAlerts() {
  try {
    const params: any = {}
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res: any = await repairApi.partsAlerts(params)
    if (res) {
      Object.assign(alertData, res)
    }
  } catch { /* handled by interceptor */ }
}

async function fetchData() {
  loading.value = true
  try {
    const params: any = {}
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const [statsRes, alertsRes] = await Promise.all([
      repairApi.partsStats(params),
      repairApi.partsAlerts(params),
    ])
    list.value = Array.isArray(statsRes) ? statsRes : []
    if (alertsRes) Object.assign(alertData, alertsRes)
  } finally {
    loading.value = false
  }
}

fetchData()
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; }
</style>
