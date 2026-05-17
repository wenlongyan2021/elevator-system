<template>
  <div class="contract-page">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input
        v-model="query.keyword"
        placeholder="搜索合同名称/编号"
        clearable
        style="width: 260px"
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      />
      <el-select
        v-model="query.status"
        placeholder="状态"
        clearable
        style="width: 140px; margin-left: 12px"
        @change="handleSearch"
      >
        <el-option label="进行中" value="ACTIVE" />
        <el-option label="草稿" value="DRAFT" />
        <el-option label="已过期" value="EXPIRED" />
        <el-option label="已终止" value="TERMINATED" />
      </el-select>
      <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
        查询
      </el-button>
      <div class="toolbar-right">
        <el-button @click="handleImport">导入Excel</el-button>
        <el-button @click="handleExport">导出Excel</el-button>
        <el-button type="primary" @click="openCreate">新建合同</el-button>
      </div>
    </div>

    <!-- 表格 -->
    <el-table :data="list" v-loading="loading" border stripe style="width: 100%">
      <el-table-column prop="contractNo" label="合同编号" min-width="160" />
      <el-table-column prop="name" label="合同名称" min-width="180" />
      <el-table-column label="维保单位" min-width="160">
        <template #default="{ row }">{{ row.maintenanceUnit?.name || row.maintenanceUnit }}</template>
      </el-table-column>
      <el-table-column prop="startDate" label="开始日期" width="110" />
      <el-table-column prop="endDate" label="结束日期" width="110" />
      <el-table-column prop="monthlyPrice" label="月费(元)" width="110" align="right">
        <template #default="{ row }">
          {{ row.monthlyPrice ? '¥' + Number(row.monthlyPrice).toFixed(2) : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="$router.push(`/contract/${row.id}`)">查看</el-button>
          <el-button type="primary" link size="small" @click.stop="openEdit(row)">编辑</el-button>
          <el-button type="danger" link size="small" @click.stop="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </div>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑合同' : '新建合同'"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        style="max-height: 60vh; overflow-y: auto"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同编号" prop="contractNo">
              <el-input v-model="form.contractNo" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同名称" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="维保单位" prop="maintenanceUnit">
              <el-select v-model="form.maintenanceUnit" filterable allow-create clearable placeholder="搜索或输入" style="width:100%">
                <el-option v-for="u in maintenanceUnits" :key="u.id" :label="u.name" :value="u.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="进行中" value="ACTIVE" />
                <el-option label="草稿" value="DRAFT" />
                <el-option label="已过期" value="EXPIRED" />
                <el-option label="已终止" value="TERMINATED" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期" prop="startDate">
              <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="endDate">
              <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="月费(元)" prop="monthlyPrice">
              <el-input-number v-model="form.monthlyPrice" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同总价(元)" prop="totalPrice">
              <el-input-number v-model="form.totalPrice" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="付款周期" prop="paymentCycle">
              <el-select v-model="form.paymentCycle" style="width: 100%">
                <el-option label="月付" value="monthly" />
                <el-option label="季付" value="quarterly" />
                <el-option label="年付" value="yearly" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="签约方" prop="signatory">
              <el-input v-model="form.signatory" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contactPerson">
              <el-input v-model="form.contactPerson" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="form.contactPhone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="考核标准" prop="evaluationStd">
          <el-input v-model="form.evaluationStd" type="textarea" :rows="2" placeholder='JSON格式，如：{"响应速度": 20, "服务质量": 30}' />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- Import Dialog -->
    <el-dialog v-model="importVisible" title="导入合同数据" width="420px">
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
          <div class="el-upload__tip">仅支持 .xlsx 格式</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { contractApi, maintenanceUnitApi } from '@/api'

// ---------- 状态 ----------
const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref('')
const formRef = ref()
const maintenanceUnits = ref<any[]>([])
const importVisible = ref(false)
const importing = ref(false)
const uploadRef = ref<any>(null)

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: '',
})

const defaultForm = {
  contractNo: '',
  name: '',
  maintenanceUnit: '',
  startDate: '',
  endDate: '',
  monthlyPrice: 0,
  totalPrice: 0,
  paymentCycle: 'monthly',
  status: 'DRAFT',
  signatory: '',
  contactPerson: '',
  contactPhone: '',
  evaluationStd: '',
  remark: '',
}

const form = reactive({ ...defaultForm })

const rules = {
  contractNo: [{ required: true, message: '请输入合同编号' }],
  name: [{ required: true, message: '请输入合同名称' }],
  maintenanceUnit: [{ required: true, message: '请选择维保单位' }],
  startDate: [{ required: true, message: '请选择开始日期' }],
  endDate: [{ required: true, message: '请选择结束日期' }],
}

// ---------- 状态映射 ----------
function statusType(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'success',
    DRAFT: 'info',
    EXPIRED: 'danger',
    TERMINATED: 'warning',
  }
  return map[status] || 'info'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: '进行中',
    DRAFT: '草稿',
    EXPIRED: '已过期',
    TERMINATED: '已终止',
  }
  return map[status] || status
}

// ---------- 数据加载 ----------
async function fetchData() {
  loading.value = true
  try {
    const res = await contractApi.list({
      page: query.page,
      limit: query.pageSize,
      keyword: query.keyword || undefined,
      status: query.status || undefined,
    })
    const data = (res as any)
    list.value = data.list || data.records || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

async function loadMaintenanceUnits() {
  try {
    const res = await maintenanceUnitApi.list({ page: 1, limit: 999 })
    maintenanceUnits.value = (res as any).list || []
  } catch {
    maintenanceUnits.value = []
  }
}

function handleSearch() {
  query.page = 1
  fetchData()
}

// ---------- 新建 ----------
function openCreate() {
  isEdit.value = false
  editId.value = ''
  Object.assign(form, defaultForm)
  dialogVisible.value = true
}

// ---------- 编辑 ----------
function openEdit(row: any) {
  isEdit.value = true
  editId.value = row.id
  Object.assign(form, {
    contractNo: row.contractNo || '',
    name: row.name || '',
    maintenanceUnit: row.maintenanceUnit?.name || row.maintenanceUnit || '',
    startDate: row.startDate?.slice(0, 10) || '',
    endDate: row.endDate?.slice(0, 10) || '',
    monthlyPrice: row.monthlyPrice ?? 0,
    totalPrice: row.totalPrice ?? 0,
    paymentCycle: row.paymentCycle || 'monthly',
    status: row.status || 'DRAFT',
    signatory: row.signatory || '',
    contactPerson: row.contactPerson || '',
    contactPhone: row.contactPhone || '',
    evaluationStd: row.evaluationStd || '',
    remark: row.remark || '',
  } as typeof defaultForm)
  dialogVisible.value = true
}

// ---------- 保存 ----------
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    if (isEdit.value) {
      await contractApi.update(editId.value, form)
      ElMessage.success('更新成功')
    } else {
      await contractApi.create(form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    saving.value = false
  }
}

// ---------- 删除 ----------
function handleDelete(row: any) {
  ElMessageBox.confirm(`确认删除合同 "${row.name}"？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await contractApi.remove(row.id)
    ElMessage.success('删除成功')
    fetchData()
  }).catch(() => {})
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
    const formData = new FormData()
    formData.append('file', file)
    const res: any = await contractApi.importExcel(formData)
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

async function handleExport() {
  try {
    const res: any = await contractApi.exportExcel(query)
    const blob = res instanceof Blob ? res : new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `合同管理-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  fetchData()
  loadMaintenanceUnits()
})
</script>

<style scoped>
.contract-page {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.toolbar-right {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
