<template>
  <div class="inspection-list">
    <!-- Filters -->
    <el-card shadow="never" class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="电梯">
          <el-select
            v-model="filters.elevatorId"
            clearable
            placeholder="选择电梯"
            filterable
            style="width: 200px"
          >
            <el-option
              v-for="e in elevators"
              :key="e.id"
              :label="`${e.regCode ?? e.registrationCode ?? '--'} ${e.address ?? ''}`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.type" clearable placeholder="选择类型" style="width: 140px">
            <el-option label="巡查" value="PATROL" />
            <el-option label="维保前" value="MAINTAIN_BEFORE" />
            <el-option label="维保中" value="MAINTAIN_DURING" />
            <el-option label="维保后" value="MAINTAIN_AFTER" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button @click="handleExport">导出Excel</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table :data="list" v-loading="loading" stripe style="width: 100%">
        <el-table-column label="电梯编号" width="160">
          <template #default="{ row }">
            {{ row.elevator?.regCode ?? row.elevator?.registrationCode ?? row.elevatorRegCode ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="inspectionTypeTag(row.type)" size="small">
              {{ inspectionTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="检查人" width="130">
          <template #default="{ row }">{{ row.inspector?.name ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="位置" min-width="200" show-overflow-tooltip prop="location" />
        <el-table-column label="检查时间" width="170" prop="createdAt" />
        <el-table-column label="照片数" width="90" align="center">
          <template #default="{ row }">
            {{ row._count?.photos ?? row.photos?.length ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showDetail(row)">
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

    <!-- Detail Dialog -->
    <el-dialog
      v-model="detailVisible"
      title="检查详情"
      width="700px"
      :close-on-click-modal="false"
    >
      <template v-if="currentDetail">
        <el-descriptions :column="2" border style="margin-bottom: 16px">
          <el-descriptions-item label="电梯编号">
            {{ currentDetail.elevator?.regCode ?? currentDetail.elevatorRegCode ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ inspectionTypeLabel(currentDetail.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="检查人">
            {{ currentDetail.inspector?.name ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="检查时间">
            {{ currentDetail.createdAt ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="位置" :span="2">
            {{ currentDetail.location ?? '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="currentDetail.content" style="margin-bottom: 16px">
          <h4 style="margin: 0 0 8px">检查内容</h4>
          <p class="content-text">{{ currentDetail.content }}</p>
        </div>

        <div v-if="photoList.length" class="photo-section">
          <h4 style="margin: 0 0 8px">现场照片（{{ photoList.length }}张）</h4>
          <el-row :gutter="12">
            <el-col
              v-for="(photo, idx) in photoList"
              :key="idx"
              :xs="12"
              :sm="8"
              :md="6"
              style="margin-bottom: 12px"
            >
              <div class="photo-item">
                <el-image
                  :src="photo.url ?? photo"
                  :preview-src-list="previewImgList"
                  fit="cover"
                  style="width: 100%; height: 140px; border-radius: 4px; cursor: pointer"
                />
                <p v-if="photo.name" class="photo-name">{{ photo.name }}</p>
              </div>
            </el-col>
          </el-row>
        </div>
        <el-empty v-else description="暂无照片" />
      </template>
      <div v-else v-loading="detailLoading" style="height: 200px" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { inspectionApi, elevatorApi } from '@/api'

interface ElevatorItem {
  id: string
  regCode?: string
  registrationCode?: string
  address?: string
}

interface PhotoItem {
  url: string
  name?: string
}

interface InspectionItem {
  id: string
  elevator?: { regCode?: string; registrationCode?: string; project?: { id: string; name: string } }
  elevatorRegCode?: string
  type: string
  inspector?: { id: string; name: string; phone: string; avatar?: string }
  location: string
  content?: string
  note?: string
  createdAt: string
  photos?: any[]
  _count?: { photos?: number }
}

const list = ref<InspectionItem[]>([])
const elevators = ref<ElevatorItem[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const filters = reactive({
  elevatorId: '',
  type: '',
  startDate: '',
  endDate: '',
})
const dateRange = ref<[string, string] | null>(null)

// Detail dialog
const detailVisible = ref(false)
const detailLoading = ref(false)
const currentDetail = ref<InspectionItem | null>(null)

const typeLabelMap: Record<string, string> = {
  PATROL: '巡查',
  MAINTAIN_BEFORE: '维保前',
  MAINTAIN_DURING: '维保中',
  MAINTAIN_AFTER: '维保后',
}

const typeTagMap: Record<string, string> = {
  PATROL: '',
  MAINTAIN_BEFORE: 'primary',
  MAINTAIN_DURING: 'warning',
  MAINTAIN_AFTER: 'success',
}

function inspectionTypeLabel(type: string): string {
  return typeLabelMap[type] ?? type
}

function inspectionTypeTag(type: string): string {
  return typeTagMap[type] ?? ''
}

async function fetchElevators() {
  try {
    const res: any = await elevatorApi.list({ limit: 9999 })
    elevators.value = res.list ?? res.records ?? res.items ?? []
  } catch {
    elevators.value = []
  }
}

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: pageSize.value,
    }
    if (filters.elevatorId) params.elevatorId = filters.elevatorId
    if (filters.type) params.type = filters.type
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res: any = await inspectionApi.list(params)
    list.value = res.list ?? res.records ?? res.items ?? []
    total.value = res.total ?? res.count ?? 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function showDetail(row: InspectionItem) {
  currentDetail.value = null
  detailVisible.value = true
  detailLoading.value = true
  try {
    // Try fetching full detail; fall back to row data
    const res: any = await inspectionApi.get(row.id)
    currentDetail.value = res ?? row
  } catch {
    currentDetail.value = row
  } finally {
    detailLoading.value = false
  }
}

const photoList = computed(() => {
  if (!currentDetail.value?.photos) return []
  return currentDetail.value.photos.map((p: any) => ({
    url: p.filePath || p.url || p,
    name: p.createdAt ? new Date(p.createdAt).toLocaleString('zh-CN') : undefined,
  }))
})

const previewImgList = computed(() => {
  return photoList.value.map((p) => p.url)
})

function handleSearch() {
  currentPage.value = 1
  fetchList()
}

function handleReset() {
  filters.elevatorId = ''
  filters.type = ''
  dateRange.value = null
  currentPage.value = 1
  fetchList()
}

async function handleExport() {
  try {
    const params: any = {}
    if (filters.elevatorId) params.elevatorId = filters.elevatorId
    if (filters.type) params.type = filters.type
    const res: any = await inspectionApi.exportExcel(params)
    const blob = res instanceof Blob ? res : new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `巡查记录-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  fetchElevators()
  fetchList()
})
</script>

<style scoped>
.inspection-list {
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
.content-text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #333;
}
.photo-section {
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}
.photo-item {
  text-align: center;
}
.photo-name {
  font-size: 12px;
  color: #909399;
  margin: 4px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
