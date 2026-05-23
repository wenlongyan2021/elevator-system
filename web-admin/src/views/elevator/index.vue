<template>
  <div class="elevator-page">
    <!-- 搜索与工具栏 -->
    <div class="toolbar">
      <el-input
        v-model="query.keyword"
        placeholder="搜索注册代码/品牌/型号"
        clearable
        style="width: 250px"
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
        <el-option label="运行中" value="RUNNING" />
        <el-option label="停梯" value="STOPPED" />
        <el-option label="维保中" value="MAINTENANCE" />
        <el-option label="故障" value="FAULT" />
      </el-select>
      <el-select
        v-model="query.projectId"
        placeholder="所属项目"
        clearable
        filterable
        style="width: 180px; margin-left: 12px"
        @change="handleSearch"
      >
        <el-option
          v-for="p in projects"
          :key="p.id"
          :label="p.name"
          :value="p.id"
        />
      </el-select>
      <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
        查询
      </el-button>

      <div class="toolbar-right">
        <el-upload
          :show-file-list="false"
          :before-upload="handleImport"
          accept=".xlsx,.xls"
        >
          <el-button>导入 Excel</el-button>
        </el-upload>
        <el-button @click="handleExport" :loading="exporting">导出 Excel</el-button>
        <el-button type="primary" @click="openCreate">新建电梯</el-button>
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      :data="list"
      v-loading="loading"
      border
      stripe
      style="width: 100%"
      @row-click="handleRowClick"
    >
      <el-table-column prop="regCode" label="注册代码" min-width="160" />
      <el-table-column prop="brand" label="品牌" width="120" />
      <el-table-column prop="model" label="型号" width="140" />
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="projectName" label="所属项目" min-width="140" />
      <el-table-column prop="building" label="楼栋" width="100" />
      <el-table-column prop="nextInspectDate" label="下次检验日期" width="130" />
      <el-table-column prop="customerServiceName" label="客服" width="100" />
      <el-table-column label="安全员" width="100">
        <template #default="{ row }">{{ row.safetyOfficer?.name ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="安全总监" width="100">
        <template #default="{ row }">{{ row.safetyDirector?.name ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="maintainerName" label="维保人员" width="100" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click.stop="openEdit(row)">编辑</el-button>
          <el-button type="primary" link size="small" @click.stop="handleGenerateQR(row)">二维码</el-button>
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
      :title="isEdit ? '编辑电梯' : '新建电梯'"
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
            <el-form-item label="注册代码" prop="regCode">
              <el-input v-model="form.regCode" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌" prop="brand">
              <el-input v-model="form.brand" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="型号" prop="model">
              <el-input v-model="form.model" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="层站数" prop="floorCount">
              <el-input-number v-model="form.floorCount" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="载重(kg)" prop="capacity">
              <el-input-number v-model="form.capacity" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="速度(m/s)" prop="speed">
              <el-input-number v-model="form.speed" :min="0" :step="0.5" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="安装日期" prop="installDate">
              <el-date-picker v-model="form.installDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="上次检验日期" prop="lastInspectDate">
              <el-date-picker v-model="form.lastInspectDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="下次检验日期" prop="nextInspectDate">
              <el-date-picker v-model="form.nextInspectDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="运行中" value="RUNNING" />
                <el-option label="停梯" value="STOPPED" />
                <el-option label="维保中" value="MAINTENANCE" />
                <el-option label="故障" value="FAULT" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属项目" prop="projectId">
              <el-select v-model="form.projectId" filterable style="width: 100%">
                <el-option
                  v-for="p in projects"
                  :key="p.id"
                  :label="p.name"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="楼栋" prop="building">
              <el-input v-model="form.building" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客服" prop="customerServiceId">
              <el-select v-model="form.customerServiceId" filterable clearable style="width: 100%">
                <el-option
                  v-for="u in userList"
                  :key="u.id"
                  :label="u.name || u.phone"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="维保人员" prop="maintainerId">
              <el-select v-model="form.maintainerId" filterable clearable style="width: 100%">
                <el-option
                  v-for="u in userList"
                  :key="u.id"
                  :label="u.name || u.phone"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="安全员" prop="safetyOfficerId">
              <el-select v-model="form.safetyOfficerId" filterable clearable style="width: 100%">
                <el-option
                  v-for="u in safetyOfficerList"
                  :key="u.id"
                  :label="u.name || u.phone"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="安全总监" prop="safetyDirectorId">
              <el-select v-model="form.safetyDirectorId" filterable clearable style="width: 100%">
                <el-option
                  v-for="u in safetyDirectorList"
                  :key="u.id"
                  :label="u.name || u.phone"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile, UploadRawFile } from 'element-plus'
import { elevatorApi, orgApi, userApi, qrcodeApi } from '@/api'

const router = useRouter()
const route = useRoute()

// ---------- 状态 ----------
const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const projects = ref<any[]>([])
const userList = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref('')
const formRef = ref()

const query = reactive({
  page: 1,
  pageSize: 20,
  keyword: (route.query.keyword as string) || '',
  status: (route.query.status as string) || '',
  projectId: (route.query.projectId as string) || '',
})

const defaultForm = {
  regCode: '',
  brand: '',
  model: '',
  floorCount: 1,
  capacity: 1000,
  speed: 1.5,
  installDate: '',
  lastInspectDate: '',
  nextInspectDate: '',
  status: 'RUNNING',
  projectId: '',
  building: '',
  customerServiceId: '',
  safetyOfficerId: '',
  safetyDirectorId: '',
  maintainerId: '',
}

const form = reactive({ ...defaultForm })

const safetyOfficerList = computed(() =>
  userList.value.filter(u => u.role === 'SAFETY_OFFICER')
)
const safetyDirectorList = computed(() =>
  userList.value.filter(u => u.role === 'SAFETY_DIRECTOR')
)

const rules = {
  regCode: [{ required: true, message: '请输入注册代码' }],
  brand: [{ required: true, message: '请输入品牌' }],
  status: [{ required: true, message: '请选择状态' }],
}

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

// ---------- 数据加载 ----------
async function fetchData() {
  loading.value = true
  try {
    const res = await elevatorApi.list({
      page: query.page,
      limit: query.pageSize,
      keyword: query.keyword || undefined,
      status: query.status || undefined,
      projectId: query.projectId || undefined,
    })
    const data = (res as any)
    list.value = data.list || data.records || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

async function loadProjects() {
  try {
    const res = await orgApi.getProjects()
    projects.value = (res as any) || []
  } catch {
    projects.value = []
  }
}

async function loadUsers() {
  try {
    const res = await userApi.getUsers()
    userList.value = (res as any) || []
  } catch {
    userList.value = []
  }
}

function handleSearch() {
  query.page = 1
  fetchData()
}

// ---------- 行点击 ----------
function handleRowClick(row: any) {
  router.push(`/elevator/${row.id}`)
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
    regCode: row.regCode || '',
    brand: row.brand || '',
    model: row.model || '',
    floorCount: row.floorCount ?? 1,
    capacity: row.capacity ?? 1000,
    speed: row.speed ?? 1.5,
    installDate: row.installDate || '',
    lastInspectDate: row.lastInspectDate || '',
    nextInspectDate: row.nextInspectDate || '',
    status: row.status || 'RUNNING',
    projectId: row.projectId || '',
    building: row.building || '',
    customerServiceId: row.customerServiceId || '',
    safetyOfficerId: row.safetyOfficerId || '',
    safetyDirectorId: row.safetyDirectorId || '',
    maintainerId: row.maintainerId || '',
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
      await elevatorApi.update(editId.value, form)
      ElMessage.success('更新成功')
    } else {
      await elevatorApi.create(form)
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
  ElMessageBox.confirm(`确认删除电梯 "${row.regCode}"？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await elevatorApi.remove(row.id)
    ElMessage.success('删除成功')
    fetchData()
  }).catch(() => {})
}

// ---------- 二维码 ----------
async function handleGenerateQR(row: any) {
  try {
    await qrcodeApi.generate(row.id)
    ElMessage.success('二维码生成成功')
  } catch {
    ElMessage.error('生成失败')
  }
}

// ---------- 导入 ----------
async function handleImport(rawFile: UploadRawFile): Promise<boolean> {
  if (!rawFile) return false
  const formData = new FormData()
  formData.append('file', rawFile)
  try {
    await elevatorApi.importExcel(formData)
    ElMessage.success('导入成功')
    fetchData()
  } catch {
    // 错误已在请求拦截器中处理
  }
  return false // 阻止默认上传
}

// ---------- 导出 ----------
async function handleExport() {
  exporting.value = true
  try {
    const params: any = {}
    if (query.keyword) params.keyword = query.keyword
    if (query.status) params.status = query.status
    if (query.projectId) params.projectId = query.projectId
    const res: any = await elevatorApi.exportExcel(params)
    const blob = new Blob([res], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `电梯台账_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  fetchData()
  loadProjects()
  loadUsers()
})
</script>

<style scoped>
.elevator-page {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
  gap: 4px;
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
