<template>
  <div class="elevator-detail" v-loading="loading">
    <!-- 返回按钮 -->
    <div style="margin-bottom: 16px">
      <el-button @click="$router.back()">返回</el-button>
    </div>

    <!-- 基本信息卡片 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <span style="font-weight: 600">基本信息</span>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="注册代码">{{ elevator.regCode }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ elevator.brand }}</el-descriptions-item>
        <el-descriptions-item label="型号">{{ elevator.model }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(elevator.status)" size="small">
            {{ statusLabel(elevator.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="所属项目">{{ elevator.projectName || elevator.project?.name }}</el-descriptions-item>
        <el-descriptions-item label="楼栋">{{ elevator.building }}</el-descriptions-item>
        <el-descriptions-item label="层站数">{{ elevator.floorCount }}</el-descriptions-item>
        <el-descriptions-item label="载重(kg)">{{ elevator.capacity }}</el-descriptions-item>
        <el-descriptions-item label="速度(m/s)">{{ elevator.speed }}</el-descriptions-item>
        <el-descriptions-item label="安装日期">{{ elevator.installDate }}</el-descriptions-item>
        <el-descriptions-item label="上次检验日期">{{ elevator.lastInspectDate }}</el-descriptions-item>
        <el-descriptions-item label="下次检验日期">{{ elevator.nextInspectDate }}</el-descriptions-item>
        <el-descriptions-item label="客服">{{ elevator.customerServiceName || elevator.customerService?.name }}</el-descriptions-item>
        <el-descriptions-item label="维保人员">{{ elevator.maintainerName || elevator.maintainer?.name }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 标签页 -->
    <el-card shadow="never" style="margin-top: 16px">
      <el-tabs v-model="activeTab">
        <!-- 合同信息 -->
        <el-tab-pane label="合同信息" name="contract">
          <el-table :data="contracts" v-loading="contractsLoading" border stripe style="width: 100%">
            <el-table-column prop="contractNo" label="合同编号" min-width="160" />
            <el-table-column prop="name" label="合同名称" min-width="160" />
            <el-table-column label="维保单位" width="160">
              <template #default="{ row }">{{ row.maintenanceUnit?.name ?? row.maintenanceUnitName ?? '-' }}</template>
            </el-table-column>
            <el-table-column prop="startDate" label="开始日期" width="110" />
            <el-table-column prop="endDate" label="结束日期" width="110" />
            <el-table-column prop="status" label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="contractStatusType(row.status)" size="small">
                  {{ contractStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="$router.push(`/contract/${row.id}`)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!contractsLoading && contracts.length === 0" description="暂无关联合同" />
        </el-tab-pane>

        <!-- 报修记录 -->
        <el-tab-pane label="报修记录" name="repair">
          <el-table :data="repairs" v-loading="repairsLoading" border stripe style="width: 100%">
            <el-table-column prop="orderNo" label="报修编号" width="160" />
            <el-table-column prop="description" label="故障描述" min-width="200" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="repairStatusType(row.status)" size="small">
                  {{ repairStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="报修人" width="100">
              <template #default="{ row }">{{ row.reporter?.name ?? '-' }}</template>
            </el-table-column>
            <el-table-column prop="createdAt" label="报修时间" width="170" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="$router.push(`/repair/${row.id}`)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!repairsLoading && repairs.length === 0" description="暂无报修记录" />
        </el-tab-pane>

        <!-- 巡查记录 -->
        <el-tab-pane label="巡查记录" name="inspection">
          <el-table :data="inspections" v-loading="inspectionsLoading" border stripe style="width: 100%">
            <el-table-column label="巡查日期" width="120">
              <template #default="{ row }">{{ row.createdAt ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="巡查人" width="100">
              <template #default="{ row }">{{ row.inspector?.name ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="巡查内容" min-width="240" show-overflow-tooltip>
              <template #default="{ row }">{{ row.note ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="照片数" width="80" align="center">
              <template #default="{ row }">{{ row._count?.photos ?? row.photos?.length ?? 0 }}</template>
            </el-table-column>
            <el-table-column prop="location" label="位置" min-width="160" show-overflow-tooltip />
          </el-table>
          <el-empty v-if="!inspectionsLoading && inspections.length === 0" description="暂无巡查记录" />
        </el-tab-pane>

        <!-- 二维码 -->
        <el-tab-pane label="二维码" name="qrcode">
          <div style="text-align: center; padding: 40px 0">
            <template v-if="qrCodeImage">
              <el-image
                :src="qrCodeImage"
                style="width: 200px; height: 200px"
                fit="contain"
              />
              <div style="margin-top: 12px; color: #909399; font-size: 13px">
                电梯二维码
              </div>
            </template>
            <template v-else>
              <el-empty description="暂无二维码">
                <el-button type="primary" :loading="qrGenerating" @click="handleGenerateQR">
                  生成二维码
                </el-button>
              </el-empty>
            </template>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { elevatorApi, contractApi, repairApi, inspectionApi, qrcodeApi } from '@/api'

const route = useRoute()
const elevatorId = route.params.id as string

// ---------- 状态 ----------
const loading = ref(false)
const elevator = ref<any>({})
const activeTab = ref('contract')

// 合同
const contracts = ref<any[]>([])
const contractsLoading = ref(false)

// 报修
const repairs = ref<any[]>([])
const repairsLoading = ref(false)

// 巡查
const inspections = ref<any[]>([])
const inspectionsLoading = ref(false)

// 二维码
const qrCodeImage = ref('')
const qrGenerating = ref(false)

// ---------- 状态映射 ----------
function statusType(status: string): string {
  const map: Record<string, string> = {
    RUNNING: 'success',
    STOPPED: 'danger',
    MAINTENANCE: 'warning',
    FAULT: 'danger',
  }
  return map[status] || 'info'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    RUNNING: '运行中',
    STOPPED: '停梯',
    MAINTENANCE: '维保中',
    FAULT: '故障',
  }
  return map[status] || status
}

function contractStatusType(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'success',
    DRAFT: 'info',
    EXPIRED: 'danger',
    TERMINATED: 'warning',
  }
  return map[status] || 'info'
}

function contractStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: '进行中',
    DRAFT: '草稿',
    EXPIRED: '已过期',
    TERMINATED: '已终止',
  }
  return map[status] || status
}

function repairStatusType(status: string): string {
  const map: Record<string, string> = {
    PENDING_ACCEPT: 'warning',
    PENDING_REPAIR: 'primary',
    PENDING_PARTS_VERIFY: 'warning',
    PENDING_SUPERVISOR: 'warning',
    PENDING_MANAGER: 'warning',
    PENDING_FUND_REVIEW: 'warning',
    APPROVED: 'success',
    RESOLVED: 'success',
    CLOSED: 'info',
    REJECTED: 'danger',
  }
  return map[status] || 'info'
}

function repairStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_ACCEPT: '待接单',
    PENDING_REPAIR: '维修中',
    PENDING_PARTS_VERIFY: '待确认配件',
    PENDING_SUPERVISOR: '待主管审批',
    PENDING_MANAGER: '待经理审批',
    PENDING_FUND_REVIEW: '待维修资金材料',
    APPROVED: '已批准',
    RESOLVED: '已修复',
    CLOSED: '已完结',
    REJECTED: '已驳回',
  }
  return map[status] || status
}

// ---------- 数据加载 ----------
async function fetchElevator() {
  loading.value = true
  try {
    const res = await elevatorApi.get(elevatorId)
    elevator.value = res
  } finally {
    loading.value = false
  }
}

async function fetchContracts() {
  contractsLoading.value = true
  try {
    const res: any = await contractApi.list({ elevatorId })
    contracts.value = res.list ?? res.records ?? []
  } finally {
    contractsLoading.value = false
  }
}

async function fetchRepairs() {
  repairsLoading.value = true
  try {
    const res: any = await repairApi.list({ elevatorId })
    repairs.value = res.list ?? res.records ?? res.items ?? []
  } finally {
    repairsLoading.value = false
  }
}

async function fetchInspections() {
  inspectionsLoading.value = true
  try {
    const res: any = await inspectionApi.list({ elevatorId })
    inspections.value = res.list ?? res.records ?? res.items ?? []
  } finally {
    inspectionsLoading.value = false
  }
}

async function fetchQRCode() {
  try {
    const res: any = await qrcodeApi.getByElevator(elevatorId)
    if (res?.qrImagePath) {
      qrCodeImage.value = res.qrImagePath
    } else if (res?.url) {
      qrCodeImage.value = res.url
    } else if (res?.imageUrl) {
      qrCodeImage.value = res.imageUrl
    } else if (typeof res === 'string') {
      qrCodeImage.value = res
    }
  } catch {
    qrCodeImage.value = ''
  }
}

async function handleGenerateQR() {
  qrGenerating.value = true
  try {
    const res: any = await qrcodeApi.generate(elevatorId)
    if (res?.qrImagePath) {
      qrCodeImage.value = res.qrImagePath
    } else if (res?.url) {
      qrCodeImage.value = res.url
    } else if (res?.imageUrl) {
      qrCodeImage.value = res.imageUrl
    } else if (typeof res === 'string') {
      qrCodeImage.value = res
    }
    ElMessage.success('二维码生成成功')
  } finally {
    qrGenerating.value = false
  }
}

// 选项卡切换时加载对应数据
watch(activeTab, (tab) => {
  if (tab === 'contract' && contracts.value.length === 0) fetchContracts()
  else if (tab === 'repair' && repairs.value.length === 0) fetchRepairs()
  else if (tab === 'inspection' && inspections.value.length === 0) fetchInspections()
  else if (tab === 'qrcode' && !qrCodeImage.value) fetchQRCode()
})

onMounted(() => {
  fetchElevator()
})
</script>

<style scoped>
.elevator-detail {
  padding: 20px;
}
.info-card {
  margin-bottom: 0;
}
</style>
