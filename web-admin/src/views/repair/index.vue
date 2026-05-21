<template>
  <div class="repair-list">
    <!-- Filter Toolbar -->
    <el-card shadow="never" class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="选择状态" style="width: 140px">
            <el-option label="待分配" value="PENDING_ACCEPT" />
            <el-option label="维修中" value="PENDING_REPAIR" />
            <el-option label="待主管审批" value="PENDING_SUPERVISOR" />
            <el-option label="待经理审批" value="PENDING_MANAGER" />
            <el-option label="已批准" value="APPROVED" />
            <el-option label="已修复" value="RESOLVED" />
            <el-option label="已完结" value="CLOSED" />
            <el-option label="已驳回" value="REJECTED" />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="filters.urgency" clearable placeholder="选择紧急程度" style="width: 140px">
            <el-option label="紧急" value="EMERGENCY" />
            <el-option label="普通" value="NORMAL" />
            <el-option label="一般" value="LOW" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目">
          <el-select v-model="filters.projectId" clearable placeholder="选择项目" style="width: 180px">
            <el-option
              v-for="p in projects"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table
        :data="repairList"
        v-loading="loading"
        stripe
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="orderNo" label="工单编号" width="180" />
        <el-table-column label="电梯编号" width="160">
          <template #default="{ row }">
            {{ row.elevator?.regCode ?? row.elevator?.registrationCode ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="紧急程度" width="100">
          <template #default="{ row }">
            <el-tag :type="urgencyType(row.urgency)" size="small" effect="dark">
              {{ urgencyLabel(row.urgency) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="故障描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ truncateText(row.description, 30) }}
          </template>
        </el-table-column>
        <el-table-column label="报修人" width="120" prop="reporterName" />
        <el-table-column label="维修人" width="120" prop="assigneeName" />
        <el-table-column label="报修时间" width="170" prop="createdAt" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="goDetail(row.id)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          :total="total"
          @size-change="fetchList"
          @current-change="fetchList"
          v-model:current-page="currentPage"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { repairApi, orgApi } from '@/api'

const router = useRouter()

interface RepairItem {
  id: string
  orderNo: string
  elevator?: { regCode?: string; registrationCode?: string }
  status: string
  urgency: string
  description: string
  reporterName: string
  assigneeName: string
  createdAt: string
}

interface Project {
  id: string
  name: string
}

// State
const repairList = ref<RepairItem[]>([])
const projects = ref<Project[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const filters = reactive({
  status: '',
  urgency: '',
  projectId: '',
})

// Status labels and types
const statusMap: Record<string, { label: string; type: string }> = {
  PENDING_ACCEPT: { label: '待分配', type: 'warning' },
  PENDING_REPAIR: { label: '维修中', type: 'primary' },
  PENDING_SUPERVISOR: { label: '待主管审批', type: 'warning' },
  PENDING_MANAGER: { label: '待经理审批', type: 'danger' },
  APPROVED: { label: '已批准', type: 'success' },
  RESOLVED: { label: '已修复', type: 'success' },
  CLOSED: { label: '已完结', type: '' },
  REJECTED: { label: '已驳回', type: 'info' },
}

const urgencyMap: Record<string, { label: string; type: string }> = {
  EMERGENCY: { label: '紧急', type: 'danger' },
  NORMAL: { label: '普通', type: '' },
  LOW: { label: '一般', type: 'info' },
}

function statusLabel(status: string): string {
  return statusMap[status]?.label ?? status
}

function statusType(status: string): string {
  return statusMap[status]?.type ?? ''
}

function urgencyLabel(urgency: string): string {
  return urgencyMap[urgency]?.label ?? urgency
}

function urgencyType(urgency: string): string {
  return urgencyMap[urgency]?.type ?? ''
}

function truncateText(text: string, maxLen: number): string {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

// Fetch projects for filter
async function fetchProjects() {
  try {
    const res: any = await orgApi.getProjects()
    projects.value = Array.isArray(res) ? res : []
  } catch {
    // Silently handle – project filter is optional
  }
}

// Fetch repair list
async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: pageSize.value,
    }
    if (filters.status) params.status = filters.status
    if (filters.urgency) params.urgency = filters.urgency
    if (filters.projectId) params.projectId = filters.projectId

    const res: any = await repairApi.list(params)
    repairList.value = res.list ?? res.records ?? res.items ?? []
    total.value = res.total ?? res.count ?? 0
  } catch {
    repairList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchList()
}

function handleReset() {
  filters.status = ''
  filters.urgency = ''
  filters.projectId = ''
  currentPage.value = 1
  fetchList()
}

function handleRowClick(row: RepairItem) {
  goDetail(row.id)
}

function goDetail(id: string) {
  router.push(`/repair/${id}`)
}

onMounted(() => {
  fetchProjects()
  fetchList()
})
</script>

<style scoped>
.repair-list {
  padding: 16px;
}
.filter-card {
  margin-bottom: 16px;
}
.table-card {
  min-height: 400px;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 0;
}
</style>
