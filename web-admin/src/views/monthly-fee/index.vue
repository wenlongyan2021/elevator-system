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
      
      <!-- 统计卡片 -->
      <el-row :gutter="20" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-card shadow="hover" :body-style="{ padding: '20px' }" class="stat-card" style="border-left: 4px solid #67C23A">
            <div class="stat-label">待确认（笔数）</div>
            <div class="stat-value">{{ stats.pending.count }}</div>
            <div class="stat-amount">¥{{ stats.pending.amount.toFixed(2) }}</div>
            <el-button type="text" size="small" @click="quickFilter('PENDING')">查看明细 →</el-button>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" :body-style="{ padding: '20px' }" class="stat-card" style="border-left: 4px solid #E6A23C">
            <div class="stat-label">已确认（笔数）</div>
            <div class="stat-value">{{ stats.confirmed.count }}</div>
            <div class="stat-amount">¥{{ stats.confirmed.amount.toFixed(2) }}</div>
            <el-button type="text" size="small" @click="quickFilter('CONFIRMED')">查看明细 →</el-button>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" :body-style="{ padding: '20px' }" class="stat-card" style="border-left: 4px solid #409EFF">
            <div class="stat-label">已付款（笔数）</div>
            <div class="stat-value">{{ stats.paid.count }}</div>
            <div class="stat-amount">¥{{ stats.paid.amount.toFixed(2) }}</div>
            <el-button type="text" size="small" @click="quickFilter('PAID')">查看明细 →</el-button>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" :body-style="{ padding: '20px' }" class="stat-card" style="border-left: 4px solid #909399">
            <div class="stat-label">合计（笔数）</div>
            <div class="stat-value">{{ stats.total.count }}</div>
            <div class="stat-amount">¥{{ stats.total.amount.toFixed(2) }}</div>
            <el-button type="text" size="small" @click="quickFilter('')">查看全部 →</el-button>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 快速筛选 -->
      <el-row style="margin-bottom: 16px">
        <el-col :span="24">
          <el-button-group>
            <el-button 
              :type="query.status === '' ? 'primary' : 'default'" 
              size="small" 
              @click="quickFilter('')"
            >全部</el-button>
            <el-button 
              :type="query.status === 'PENDING' ? 'primary' : 'default'" 
              size="small" 
              @click="quickFilter('PENDING')"
            >待确认 {{ stats.pending.count > 0 ? `(${stats.pending.count})` : '' }}</el-button>
            <el-button 
              :type="query.status === 'CONFIRMED' ? 'primary' : 'default'" 
              size="small" 
              @click="quickFilter('CONFIRMED')"
            >已确认 {{ stats.confirmed.count > 0 ? `(${stats.confirmed.count})` : '' }}</el-button>
            <el-button 
              :type="query.status === 'PAID' ? 'primary' : 'default'" 
              size="small" 
              @click="quickFilter('PAID')"
            >已付款 {{ stats.paid.count > 0 ? `(${stats.paid.count})` : '' }}</el-button>
          </el-button-group>
        </el-col>
      </el-row>
      
      <el-form :model="query" inline @keyup.enter="fetchData">
        <el-form-item label="年月">
          <el-date-picker
            v-model="query.yearMonth"
            type="month"
            placeholder="选择年月"
            value-format="YYYY-MM"
            clearable
            style="width:140px"
          />
        </el-form-item>
        <el-form-item label="维保单位">
          <el-select v-model="query.maintenanceUnitId" placeholder="全部" clearable filterable style="width:200px">
            <el-option v-for="u in maintenanceUnits" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:140px">
            <el-option label="待确认" value="PENDING" />
            <el-option label="已确认" value="CONFIRMED" />
            <el-option label="已付款" value="PAID" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
      <div class="table-toolbar" v-if="selectedIds.length > 0">
        <span class="selected-info">已选择 {{ selectedIds.length }} 条记录</span>
        <el-button size="small" type="primary" @click="handleBatchConfirm">批量确认收款</el-button>
        <el-button size="small" @click="selectedIds = []">取消选择</el-button>
      </div>
      <el-table :data="list" v-loading="loading" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="40" />
        <el-table-column label="年月" width="120" sortable>
          <template #default="scope">{{ formatMonth(scope.row.yearMonth) }}</template>
        </el-table-column>
        <el-table-column label="维保单位" min-width="160">
          <template #default="scope">
            {{ typeof scope.row.maintenanceUnit === 'object' ? scope.row.maintenanceUnit?.name : scope.row.maintenanceUnit || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="elevatorCount" label="电梯数" width="80" align="center" />
        <el-table-column label="台/月单价" width="120" align="right">
          <template #default="scope">¥{{ scope.row.unitPrice }}</template>
        </el-table-column>
        <el-table-column label="维保费" width="120" align="right">
          <template #default="scope">
            <span style="color: #67C23A">¥{{ Number(scope.row.maintenanceFeeTotal || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="维修费" width="120" align="right">
          <template #default="scope">
            <span style="color: #E6A23C">¥{{ Number(scope.row.repairCostTotal || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="应付总额" width="140" align="right">
          <template #default="scope">
            <span style="color: #409EFF; font-weight: bold">¥{{ Number(scope.row.totalAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="statusType(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" link @click="handleView(scope.row)">详情</el-button>
            <el-dropdown v-if="scope.row.status === 'PENDING'" @command="(c:string)=>handleConfirm(scope.row, c)">
              <el-button size="small" type="success" link>确认<el-icon><ArrowDown /></el-icon></el-button>
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

    <el-dialog v-model="detailVisible" title="月费详情" width="900px">
      <template v-if="detail">
        <el-descriptions :column="3" border style="margin-bottom: 16px">
          <el-descriptions-item label="年月">{{ formatMonth(detail.yearMonth) }}</el-descriptions-item>
          <el-descriptions-item label="电梯数量">{{ detail.elevatorCount }}</el-descriptions-item>
          <el-descriptions-item label="维保费合计">
            <span style="color: #67C23A; font-weight: bold">¥{{ Number(detail.maintenanceFeeTotal || 0).toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="台/月单价">¥{{ detail.unitPrice }}</el-descriptions-item>
          <el-descriptions-item label="维修费合计">
            <span style="color: #E6A23C; font-weight: bold">¥{{ Number(detail.repairCostTotal || 0).toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="应付总额">
            <span style="color: #409EFF; font-weight: bold; font-size: 16px">¥{{ Number(detail.totalAmount).toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="维保费（固定）" :span="3">
            <el-tag type="success" size="small">合同约定</el-tag>
            按合同约定的台/月单价收取，每月固定
          </el-descriptions-item>
          <el-descriptions-item label="维修费（变动）" :span="3">
            <el-tag type="warning" size="small">实际发生</el-tag>
            根据当月实际发生的维修费用统计
          </el-descriptions-item>
        </el-descriptions>
        
        <el-tabs>
          <el-tab-pane label="费用明细（按日期）" name="byDate">
            <el-table :data="sortedDetailItems" stripe size="small" max-height="400" :default-sort="{ prop: 'date', order: 'ascending' }">
              <el-table-column label="日期" width="120" sortable prop="date">
                <template #default="{ row }">
                  {{ row.date || formatDate(row.createdAt) }}
                </template>
              </el-table-column>
              <el-table-column label="电梯" min-width="140">
                <template #default="{ row }">
                  {{ row.elevator?.regCode ?? '-' }}
                  <br>
                  <span style="color: #909399; font-size: 12px">{{ row.elevator?.building || '' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="费用类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.costType === 'CONTRACT_IN' ? 'success' : 'warning'" size="small">
                    {{ costTypeLabel(row.costType) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="费用说明" min-width="180">
                <template #default="{ row }">
                  <div style="font-size: 13px">{{ row.description || '-' }}</div>
                </template>
              </el-table-column>
              <el-table-column label="金额" width="120" align="right" sortable prop="amount">
                <template #default="{ row }">
                  <span :style="{ color: row.costType === 'CONTRACT_IN' ? '#67C23A' : '#E6A23C', fontWeight: 'bold' }">
                    ¥{{ Number(row.amount).toFixed(2) }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
            <div style="margin-top: 12px; padding: 12px; background: #f5f7fa; border-radius: 4px;">
              <el-row :gutter="20">
                <el-col :span="8">
                  <div style="text-align: center">
                    <div style="color: #909399; font-size: 12px">维保费（合同内）</div>
                    <div style="color: #67C23A; font-size: 20px; font-weight: bold">
                      ¥{{ Number(detail.maintenanceFeeTotal || 0).toFixed(2) }}
                    </div>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div style="text-align: center">
                    <div style="color: #909399; font-size: 12px">维修费（合同外）</div>
                    <div style="color: #E6A23C; font-size: 20px; font-weight: bold">
                      ¥{{ Number(detail.repairCostTotal || 0).toFixed(2) }}
                    </div>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div style="text-align: center">
                    <div style="color: #909399; font-size: 12px">费用合计</div>
                    <div style="color: #409EFF; font-size: 20px; font-weight: bold">
                      ¥{{ Number(detail.totalAmount).toFixed(2) }}
                    </div>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="电梯维度" name="byElevator">
            <el-table :data="elevatorSummary" stripe size="small" max-height="400">
              <el-table-column label="电梯" min-width="140">
                <template #default="{ row }">
                  <div style="font-weight: bold">{{ row.regCode }}</div>
                  <div style="color: #909399; font-size: 12px">{{ row.building || '-' }}</div>
                </template>
              </el-table-column>
              <el-table-column label="维保费" width="120" align="right">
                <template #default="{ row }">
                  <span style="color: #67C23A">¥{{ Number(row.maintenanceFee).toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="维修费" width="120" align="right">
                <template #default="{ row }">
                  <span style="color: #E6A23C">¥{{ Number(row.repairFee).toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="小计" width="120" align="right">
                <template #default="{ row }">
                  <span style="color: #409EFF; font-weight: bold">¥{{ Number(row.total).toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="明细条数" width="100" align="center">
                <template #default="{ row }">{{ row.count }} 条</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getMonthlyFees,
  getMonthlyFee,
  generateMonthlyFees,
  updateMonthlyFeeStatus,
  exportMonthlyFees,
  importMonthlyFees,
  downloadMonthlyFeeTemplate,
} from '@/api/monthly-fee'
import { maintenanceUnitApi } from '@/api'

const list = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const query = ref({ page: 1, limit: 20, status: '', yearMonth: '', maintenanceUnitId: '' })

// 统计数据
const stats = ref({
  pending: { count: 0, amount: 0 },
  confirmed: { count: 0, amount: 0 },
  paid: { count: 0, amount: 0 },
  total: { count: 0, amount: 0 },
})

// 计算统计数据
function calculateStats(data: any[]) {
  const pending = { count: 0, amount: 0 }
  const confirmed = { count: 0, amount: 0 }
  const paid = { count: 0, amount: 0 }
  const total = { count: 0, amount: 0 }
  
  data.forEach(item => {
    const amount = Number(item.totalAmount) || 0
    total.count++
    total.amount += amount
    
    if (item.status === 'PENDING') {
      pending.count++
      pending.amount += amount
    } else if (item.status === 'CONFIRMED') {
      confirmed.count++
      confirmed.amount += amount
    } else if (item.status === 'PAID') {
      paid.count++
      paid.amount += amount
    }
  })
  
  stats.value = { pending, confirmed, paid, total }
}
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

// 计算属性：按日期排序的费用明细
const sortedDetailItems = computed(() => {
  if (!detail.value?.items) return []
  return [...detail.value.items].sort((a, b) => {
    const dateA = a.date || a.createdAt || ''
    const dateB = b.date || b.createdAt || ''
    return dateA.localeCompare(dateB)
  })
})

// 计算属性：按电梯维度汇总
const elevatorSummary = computed(() => {
  if (!detail.value?.items) return []
  const map = new Map<string, any>()
  
  detail.value.items.forEach((item: any) => {
    const key = item.elevator?.id || item.elevatorId
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        regCode: item.elevator?.regCode || '-',
        building: item.elevator?.building || '',
        maintenanceFee: 0,
        repairFee: 0,
        total: 0,
        count: 0,
      })
    }
    const summary = map.get(key)!
    if (item.costType === 'CONTRACT_IN') {
      summary.maintenanceFee += Number(item.amount) || 0
    } else {
      summary.repairFee += Number(item.amount) || 0
    }
    summary.total += Number(item.amount) || 0
    summary.count++
  })
  
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
})

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

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusType(s: string) { return s === 'PAID' ? 'success' : s === 'CONFIRMED' ? 'warning' : 'info' }
function statusText(s: string) { return s === 'PENDING' ? '待确认' : s === 'CONFIRMED' ? '已确认' : '已付款' }
function costTypeLabel(t: string) {
  const map: Record<string, string> = {
    'CONTRACT_IN': '维保费',
    'CONTRACT_OUT': '维修费',
    'FREE': '免费',
    'PUBLIC_FUND': '公共维修基金'
  }
  return map[t] || t
}

async function fetchData() {
  loading.value = true
  try {
    const queryParams: any = { page: query.value.page, limit: query.value.limit }
    if (query.value.status && query.value.status !== '') {
      queryParams.status = query.value.status
    }
    if (query.value.yearMonth && query.value.yearMonth !== '') {
      queryParams.yearMonth = query.value.yearMonth
    }
    if (query.value.maintenanceUnitId && query.value.maintenanceUnitId !== '') {
      queryParams.maintenanceUnitId = query.value.maintenanceUnitId
    }
    
    const res: any = await getMonthlyFees(queryParams)
    list.value = res.list || []
    total.value = res.total || 0
    
    // 计算统计数据
    calculateStats(list.value)
  } finally {
    loading.value = false
  }
}

// 快速筛选
function quickFilter(status: string) {
  query.value.status = status
  query.value.page = 1
  fetchData()
}

// 重置查询
function resetQuery() {
  query.value = { page: 1, limit: 20, status: '', yearMonth: '', maintenanceUnitId: '' }
  fetchData()
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
    const result = await generateMonthlyFees({
      maintenanceUnitId: generateForm.value.maintenanceUnitId || undefined,
      year,
      month,
    })
    
    const resultData: any = result
    const generated = resultData?.generated ?? 0
    if (generated === 0) {
      ElMessage.warning(resultData?.message || '没有找到有效合同来生成月费')
    } else {
      ElMessage.success(`月费生成成功，共生成 ${generated} 条记录`)
    }
    
    generateVisible.value = false
    generateForm.value = { maintenanceUnitId: '', yearMonth: '' }
    
    // 强制重置到第一页并刷新数据
    query.value.page = 1
    query.value.status = ''
    query.value.maintenanceUnitId = ''
    
    // 等待数据库写入完成
    await new Promise(resolve => setTimeout(resolve, 500))
    await fetchData()
    
    // 显示刷新后的总数
    if (generated > 0) {
      ElMessage.info(`当前共有 ${total.value} 条月费记录`)
    }
  } catch (err: any) {
    console.error('生成月费失败:', err)
    ElMessage.error(err?.response?.data?.message || '生成失败')
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
    // 确保刷新数据
    await new Promise(resolve => setTimeout(resolve, 300))
    await fetchData()
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

/* 统计卡片样式 */
.stat-card {
  transition: all 0.3s;
  cursor: pointer;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}
.stat-amount {
  font-size: 16px;
  color: #606266;
  margin-top: 4px;
  font-weight: 500;
}
</style>
