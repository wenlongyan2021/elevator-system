<template>
  <div class="dashboard-container" v-loading="loading">
    <!-- Toolbar -->
    <div class="toolbar">
      <span class="toolbar-title">电梯管理系统仪表盘</span>
      <div>
        <el-date-picker
          v-model="reportMonth"
          type="month"
          placeholder="选择月份"
          value-format="YYYY-MM"
          style="width: 160px; margin-right: 8px"
        />
        <el-button @click="handleExportReport">导出维修月报</el-button>
      </div>
    </div>

    <!-- Stat Cards -->
    <el-row :gutter="20" class="stat-row">
      <el-col :xs="12" :sm="12" :md="6" :xl="4" v-for="item in statCards" :key="item.label">
        <el-card shadow="hover" class="stat-card" :body-style="{ padding: '20px' }">
          <div class="stat-inner">
            <div class="stat-icon" :style="{ background: item.bg }">
              <el-icon :size="28" :color="item.color">
                <component :is="item.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ item.value }}</div>
              <div class="stat-label">{{ item.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Parts Alerts Bar -->
    <el-card v-if="partAlertCount > 0" shadow="hover" class="alert-bar" :body-style="{ padding: '12px 20px' }">
      <div class="alert-bar-inner">
        <div class="alert-bar-left">
          <el-icon :size="20" color="#E6A23C"><WarningFilled /></el-icon>
          <span class="alert-bar-text">配件库存预警：{{ partAlertCount }} 项配件用量/频率超过阈值</span>
        </div>
        <router-link to="/repair/parts-stats">
          <el-button size="small" type="warning" plain>查看详情</el-button>
        </router-link>
      </div>
    </el-card>

    <el-row :gutter="20" class="chart-row">
      <!-- Repair Trend -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header"><span>月度维修趋势</span></div>
          </template>
          <VChart v-if="repairTrendOption" :option="repairTrendOption" style="height: 300px" autoresize />
          <el-empty v-else description="暂无数据" :image-size="80" />
        </el-card>
      </el-col>

      <!-- Elevator Status Distribution -->
      <el-col :xs="24" :lg="6">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header"><span>电梯状态分布</span></div>
          </template>
          <VChart v-if="statusDistOption" :option="statusDistOption" style="height: 300px" autoresize />
          <el-empty v-else description="暂无数据" :image-size="80" />
        </el-card>
      </el-col>

      <!-- Urgency Breakdown -->
      <el-col :xs="24" :lg="6">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header"><span>报修紧急度</span></div>
          </template>
          <VChart v-if="urgencyOption" :option="urgencyOption" style="height: 300px" autoresize />
          <el-empty v-else description="暂无数据" :image-size="80" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <!-- Fault Distribution -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header"><span>故障分布</span></div>
          </template>
          <VChart v-if="faultDistributionOption" :option="faultDistributionOption" style="height: 300px" autoresize />
          <el-empty v-else description="暂无数据" :image-size="80" />
        </el-card>
      </el-col>

      <!-- Completion Rate Card -->
      <el-col :xs="24" :lg="6">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header"><span>维修完成率</span></div>
          </template>
          <div class="center-stat">
            <div class="big-number">{{ repairStats.completionRate }}<small>%</small></div>
            <div class="sub-text">已完成 / 总报修</div>
          </div>
        </el-card>
      </el-col>

      <!-- Today's Inspections Card -->
      <el-col :xs="24" :lg="6">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header"><span>今日巡查</span></div>
          </template>
          <div class="center-stat">
            <div class="big-number">{{ overview.todayInspections ?? 0 }}</div>
            <div class="sub-text">条巡查记录</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import { dashboardApi, repairApi } from '@/api'
import {
  DataBoard, CircleCheck, CircleClose, WarningFilled,
  Opportunity, Sell, Clock,
} from '@element-plus/icons-vue'

// ECharts
import { use } from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
use([CanvasRenderer, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent])

// ---------- Types ----------
interface OverviewData {
  totalElevators: number
  runningCount: number
  stoppedCount: number
  faultCount: number
  maintenanceCount: number
  pendingRepairs: number
  todayInspections: number
}

interface StatCard {
  label: string
  value: number | string
  icon: object
  color: string
  bg: string
}

// ---------- State ----------
const loading = ref(false)
const reportMonth = ref('')
const partAlertCount = ref(0)
const overview = ref<OverviewData>({
  totalElevators: 0, runningCount: 0, stoppedCount: 0,
  faultCount: 0, maintenanceCount: 0, pendingRepairs: 0, todayInspections: 0,
})
const repairTrendData = ref<any[]>([])
const faultDistributionData = ref<any[]>([])
const repairStats = ref({ completionRate: 0, urgencyBreakdown: [] as any[], statusBreakdown: [] as any[] })

// ---------- Stat Cards ----------
const statCards = computed<StatCard[]>(() => [
  { label: '电梯总数', value: overview.value.totalElevators, icon: DataBoard, color: '#409EFF', bg: 'rgba(64,158,255,0.1)' },
  { label: '运行中', value: overview.value.runningCount, icon: CircleCheck, color: '#67C23A', bg: 'rgba(103,194,58,0.1)' },
  { label: '已停梯', value: overview.value.stoppedCount, icon: CircleClose, color: '#F56C6C', bg: 'rgba(245,108,108,0.1)' },
  { label: '故障中', value: overview.value.faultCount, icon: WarningFilled, color: '#E6A23C', bg: 'rgba(230,162,60,0.1)' },
  { label: '维保中', value: overview.value.maintenanceCount, icon: Opportunity, color: '#9B59B6', bg: 'rgba(155,89,182,0.1)' },
  { label: '待维修', value: overview.value.pendingRepairs, icon: Sell, color: '#E74C3C', bg: 'rgba(231,76,60,0.1)' },
  { label: '今日巡查', value: overview.value.todayInspections, icon: Clock, color: '#2ECC71', bg: 'rgba(46,204,113,0.1)' },
])

// ---------- Chart Options ----------
const repairTrendOption = shallowRef<any>(null)
const faultDistributionOption = shallowRef<any>(null)
const statusDistOption = shallowRef<any>(null)
const urgencyOption = shallowRef<any>(null)

const faultTypeLabels: Record<string, string> = {
  DOOR_FAULT: '门系统故障', TRACTION_FAULT: '曳引系统', CONTROL_FAULT: '控制系统',
  SAFETY_FAULT: '安全保护', TRAPPED: '困人', OTHER: '其他',
}

const urgencyLabels: Record<string, string> = {
  EMERGENCY: '紧急', NORMAL: '普通', LOW: '一般',
}

const urgencyColors: Record<string, string> = {
  EMERGENCY: '#F56C6C', NORMAL: '#E6A23C', LOW: '#909399',
}

function buildRepairTrendOption(data: any[]) {
  if (!data?.length) { repairTrendOption.value = null; return }
  repairTrendOption.value = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}<br/>维修次数: {c}' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.map(i => { const p = i.month.split('-'); return p[1] ? `${parseInt(p[1], 10)}月` : i.month }), axisLabel: { color: '#909399' }, axisLine: { lineStyle: { color: '#E4E7ED' } } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#909399' }, splitLine: { lineStyle: { color: '#F2F6FC' } } },
    series: [{ type: 'bar', data: data.map(i => i.count), barMaxWidth: 36, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#409EFF' }, { offset: 1, color: '#79BBFF' }] }, borderRadius: [4, 4, 0, 0] } }],
  }
}

function buildFaultDistributionOption(data: any[]) {
  if (!data?.length) { faultDistributionOption.value = null; return }
  faultDistributionOption.value = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
    legend: { orient: 'vertical', right: '5%', top: 'center', itemWidth: 12, itemHeight: 12, textStyle: { color: '#606266', fontSize: 13 } },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['40%', '50%'], padAngle: 2,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: data.map(i => ({ name: faultTypeLabels[i.faultType] || i.faultType, value: i.count || i.value })),
      color: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#9B59B6', '#2ECC71'],
    }],
  }
}

function buildStatusDistOption() {
  const o = overview.value
  const data = [
    { name: '运行中', value: o.runningCount },
    { name: '已停梯', value: o.stoppedCount },
    { name: '故障', value: o.faultCount },
    { name: '维保中', value: o.maintenanceCount },
  ]
  if (data.every(d => d.value === 0)) { statusDistOption.value = null; return }
  statusDistOption.value = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}台 ({d}%)' },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'],
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
      data,
      color: ['#67C23A', '#F56C6C', '#E6A23C', '#9B59B6'],
    }],
  }
}

function buildUrgencyOption() {
  const breakdown = repairStats.value.urgencyBreakdown
  if (!breakdown?.length) { urgencyOption.value = null; return }
  urgencyOption.value = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'],
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
      data: breakdown.map(i => ({ name: urgencyLabels[i.urgency] || i.urgency, value: i.count })),
      color: ['#F56C6C', '#E6A23C', '#909399'],
    }],
  }
}

// ---------- Data Loading ----------
async function fetchData() {
  loading.value = true
  try {
    const [overviewRes, trendRes, faultRes, statsRes, alertsRes] = await Promise.all([
      dashboardApi.overview(),
      dashboardApi.repairTrend(12),
      dashboardApi.faultDistribution(),
      dashboardApi.repairStats(),
      repairApi.partsAlerts().catch(() => null),
    ])

    overview.value = (overviewRes as any) ?? overview.value
    partAlertCount.value = (alertsRes as any)?.alertCount ?? 0

    const trend = (trendRes as any) ?? []
    repairTrendData.value = Array.isArray(trend) ? trend : []
    buildRepairTrendOption(repairTrendData.value)

    const fault = (faultRes as any) ?? {}
    faultDistributionData.value = fault.distribution ?? []
    buildFaultDistributionOption(faultDistributionData.value)

    const stats = (statsRes as any) ?? {}
    repairStats.value = {
      completionRate: stats.completionRate ?? 0,
      urgencyBreakdown: stats.urgencyBreakdown ?? [],
      statusBreakdown: stats.statusBreakdown ?? [],
    }

    buildStatusDistOption()
    buildUrgencyOption()
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

async function handleExportReport() {
  try {
    let params: any = {}
    if (reportMonth.value) {
      const parts = reportMonth.value.split('-')
      params = { year: parseInt(parts[0]), month: parseInt(parts[1]) }
    }
    const res: any = await repairApi.exportReport(params)
    const blob = res instanceof Blob ? res : new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const suffix = reportMonth.value ? `-${reportMonth.value}` : ''
    a.download = `维修月报${suffix}-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.dashboard-container { padding: 0; min-height: 400px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.toolbar-title { font-size: 18px; font-weight: 600; color: #303133; }
.stat-row { margin-bottom: 20px; }
.stat-card { border-radius: 8px; transition: transform 0.2s, box-shadow 0.2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.stat-inner { display: flex; align-items: center; gap: 16px; }
.stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-info { flex: 1; min-width: 0; }
.stat-value { font-size: 28px; font-weight: 700; color: #303133; line-height: 1.2; }
.stat-label { font-size: 14px; color: #909399; margin-top: 4px; }
.alert-bar { margin-bottom: 20px; border-left: 4px solid #E6A23C; border-radius: 8px; }
.alert-bar-inner { display: flex; align-items: center; justify-content: space-between; }
.alert-bar-left { display: flex; align-items: center; gap: 8px; }
.alert-bar-text { font-size: 14px; color: #606266; }
.chart-row { margin-bottom: 0; }
.chart-card { border-radius: 8px; margin-bottom: 20px; }
.card-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; color: #303133; }
.center-stat { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 0; }
.big-number { font-size: 48px; font-weight: 700; color: #409EFF; line-height: 1; }
.big-number small { font-size: 20px; font-weight: 400; color: #909399; }
.sub-text { font-size: 14px; color: #909399; margin-top: 8px; }
</style>
