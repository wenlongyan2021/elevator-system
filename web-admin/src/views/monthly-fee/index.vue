<template>
  <div>
    <el-card>
      <template #header>
        <div class="page-header">
          <span>月费管理</span>
          <div>
            <el-button @click="handleExport">导出Excel</el-button>
            <el-button @click="importVisible = true">导入Excel</el-button>
            <el-button type="primary" @click="generateVisible = true">生成月费</el-button>
          </div>
        </div>
      </template>
      <el-form :model="query" inline @keyup.enter="fetchData">
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:140px">
            <el-option label="待确认" value="PENDING" />
            <el-option label="已确认" value="CONFIRMED" />
            <el-option label="已付款" value="PAID" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
        </el-form-item>
      </el-form>
      <div class="table-toolbar" v-if="selectedIds.length > 0">
        <span class="selected-info">已选择 {{ selectedIds.length }} 条记录</span>
        <el-button size="small" type="primary" @click="handleBatchConfirm">批量确认收款</el-button>
        <el-button size="small" @click="selectedIds = []">取消选择</el-button>
      </div>
      <el-table :data="list" v-loading="loading" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="40" />
        <el-table-column label="年月" width="120">
          <template #default="scope">{{ formatMonth(scope.row.yearMonth) }}</template>
        </el-table-column>
        <el-table-column prop="elevatorCount" label="电梯数" width="80" />
        <el-table-column label="台/月单价" width="120">
          <template #default="scope">¥{{ scope.row.unitPrice }}</template>
        </el-table-column>
        <el-table-column label="应付总额" width="140">
          <template #default="scope">¥{{ Number(scope.row.totalAmount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="statusType(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="scope">
            <el-button size="small" @click="handleView(scope.row)">详情</el-button>
            <el-dropdown v-if="scope.row.status === 'PENDING'" @command="(c:string)=>handleConfirm(scope.row, c)">
              <el-button size="small">确认<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-item command="CONFIRMED">确认收款</el-dropdown-item>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.limit"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchData"
        style="margin-top: 16px; justify-content: flex-end;"
      />
    </el-card>

    <!-- Generate Dialog -->
    <el-dialog v-model="generateVisible" title="生成月费" width="420px">
      <el-form :model="generateForm" label-width="100px">
        <el-form-item label="维保单位">
          <el-select v-model="generateForm.maintenanceUnitId" filterable clearable placeholder="全部维保单位" style="width:100%">
            <el-option v-for="u in maintenanceUnits" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="年月">
          <el-date-picker v-model="generateForm.yearMonth" type="month" value-format="YYYY-MM" placeholder="选择月份" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">开始生成</el-button>
      </template>
    </el-dialog>

    <!-- Import Dialog -->
    <el-dialog v-model="importVisible" title="导入月费数据" width="420px">
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :show-file-list="true"
        accept=".xlsx,.xls"
        :limit="1"
        :on-exceed="() => ElMessage.warning('每次只能上传一个文件')"
      >
        <template #trigger>
          <el-button type="primary">选择文件</el-button>
        </template>
        <template #tip>
          <div class="el-upload__tip">仅支持 .xlsx 格式，请先<a @click="downloadMonthlyFeeTemplate()" style="cursor:pointer;color:#409EFF">下载模板</a></div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">开始导入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="月费详情" width="720px">
      <template v-if="detail">
        <el-descriptions :column="2" border style="margin-bottom: 16px">
          <el-descriptions-item label="年月">{{ formatMonth(detail.yearMonth) }}</el-descriptions-item>
          <el-descriptions-item label="电梯数量">{{ detail.elevatorCount }}</el-descriptions-item>
          <el-descriptions-item label="台/月单价">¥{{ detail.unitPrice }}</el-descriptions-item>
          <el-descriptions-item label="应付总额">¥{{ Number(detail.totalAmount).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="维修费合计">¥{{ Number(detail.repairCostTotal).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusText(detail.status) }}</el-descriptions-item>
        </el-descriptions>
        <h4 style="margin: 16px 0 8px; font-size: 14px;">电梯费用明细</h4>
        <el-table :data="detail.items || []" stripe size="small" max-height="300">
          <el-table-column label="电梯" min-width="160">
            <template #default="{ row }">{{ row.elevator?.regCode ?? '-' }}</template>
          </el-table-column>
          <el-table-column label="费用类型" width="100">
            <template #default="{ row }">{{ costTypeLabel(row.costType) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="120" align="right">
            <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="描述" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.description || '-' }}</template>
          </el-table-column>
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getMonthlyFees, generateMonthlyFees, updateMonthlyFeeStatus, getMonthlyFee, exportMonthlyFees, importMonthlyFees, downloadMonthlyFeeTemplate } from '@/api/monthly-fee'
import { maintenanceUnitApi } from '@/api'

const list = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const query = ref({ page: 1, limit: 20, status: '' })
const detailVisible = ref(false)
const detail = ref<any>(null)
const importVisible = ref(false)
const importing = ref(false)
const uploadRef = ref<any>(null)

const generateVisible = ref(false)
const generating = ref(false)
const generateForm = ref({ maintenanceUnitId: '', yearMonth: '' })
const maintenanceUnits = ref<any[]>([])

// Batch selection
const selectedIds = ref<string[]>([])

function handleSelectionChange(rows: any[]) {
  selectedIds.value = rows.filter(r => r.status === 'PENDING').map(r => r.id)
}

async function handleBatchConfirm() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择待确认的记录')
    return
  }
  try {
    await Promise.all(selectedIds.value.map(id => updateMonthlyFeeStatus(id, 'CONFIRMED')))
    ElMessage.success(`已确认 ${selectedIds.value.length} 条记录`)
    selectedIds.value = []
    fetchData()
  } catch {
    ElMessage.error('批量确认失败')
  }
}

function formatMonth(ym: string) {
  if (!ym) return ''
  const d = new Date(ym)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function statusType(s: string) { return s === 'PAID' ? 'success' : s === 'CONFIRMED' ? 'warning' : 'info' }
function statusText(s: string) { return s === 'PENDING' ? '待确认' : s === 'CONFIRMED' ? '已确认' : '已付款' }
function costTypeLabel(t: string) {
  const map: Record<string, string> = { FREE: '免费', CONTRACT_IN: '合同内', CONTRACT_OUT: '合同外', PUBLIC_FUND: '公共维修资金' }
  return map[t] || t
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getMonthlyFees(query.value)
    list.value = res.list || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  try {
    const res: any = await exportMonthlyFees(query.value)
    const blob = res instanceof Blob ? res : new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `月费管理-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

async function loadMaintenanceUnits() {
  try {
    const res: any = await maintenanceUnitApi.list()
    maintenanceUnits.value = res.list ?? res ?? []
  } catch { /* ignore */ }
}

async function handleGenerate() {
  if (!generateForm.value.yearMonth) {
    ElMessage.warning('请选择年月')
    return
  }
  generating.value = true
  try {
    const [year, month] = generateForm.value.yearMonth.split('-').map(Number)
    await generateMonthlyFees({
      maintenanceUnitId: generateForm.value.maintenanceUnitId || undefined,
      year,
      month,
    })
    ElMessage.success('月费生成成功')
    generateVisible.value = false
    generateForm.value = { maintenanceUnitId: '', yearMonth: '' }
    fetchData()
  } catch {
    ElMessage.error('生成失败')
  } finally {
    generating.value = false
  }
}

async function handleView(row: any) {
  const res: any = await getMonthlyFee(row.id)
  detail.value = res
  detailVisible.value = true
}

async function handleConfirm(row: any, status: string) {
  await updateMonthlyFeeStatus(row.id, status)
  ElMessage.success('操作成功')
  fetchData()
}

async function handleImport() {
  const upload = uploadRef.value
  if (!upload || upload.uploadFiles.length === 0) {
    ElMessage.warning('请先选择文件')
    return
  }
  importing.value = true
  try {
    const file = upload.uploadFiles[0].raw
    const res: any = await importMonthlyFees(file)
    ElMessage.success(`导入完成：成功 ${res.imported} 条${res.errors?.length ? `，失败 ${res.errors.length} 条` : ''}`)
    if (res.errors?.length) console.warn('导入错误:', res.errors)
    importVisible.value = false
    upload.clearFiles()
    fetchData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

onMounted(() => { fetchData(); loadMaintenanceUnits() })
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; }
.table-toolbar { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.selected-info { font-size: 13px; color: #409eff; }
</style>
