<template>
  <div>
    <el-card>
      <template #header>
        <div class="page-header">
          <span>维保计划</span>
          <div>
            <el-button @click="downloadPlanTemplate()">下载模板</el-button>
            <el-button type="primary" @click="importVisible = true">导入Excel</el-button>
            <el-button type="primary" @click="dialogVisible = true">新增计划</el-button>
          </div>
        </div>
      </template>
      <el-form :model="query" inline @keyup.enter="fetchData">
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:120px">
            <el-option label="待执行" value="PENDING" />
            <el-option label="执行中" value="IN_PROGRESS" />
            <el-option label="已完成" value="COMPLETED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="电梯" min-width="160">
          <template #default="scope">{{ scope.row.elevator?.regCode ?? scope.row.elevatorId }} ({{ scope.row.elevator?.building || '-' }})</template>
        </el-table-column>
        <el-table-column label="计划日期" width="120">
          <template #default="scope">{{ scope.row.planDate?.slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column label="计划类型" width="120">
          <template #default="scope">{{ planTypeText(scope.row.planType) }}</template>
        </el-table-column>
        <el-table-column label="维保员" min-width="150">
          <template #default="scope">
            <el-tag v-for="(id, idx) in (scope.row.maintainerIds || (scope.row.maintainerId ? [scope.row.maintainerId] : []))" :key="id" size="small" style="margin-right: 4px;" :type="(idx % 4) === 0 ? '' : (idx % 4) === 1 ? 'success' : (idx % 4) === 2 ? 'warning' : 'danger'">
              {{ getUserName(id) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="statusType(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button size="small" v-if="scope.row.status === 'PENDING'" @click="handleStart(scope.row)">开始</el-button>
            <el-button size="small" v-if="scope.row.status === 'IN_PROGRESS'" type="success" @click="handleComplete(scope.row)">完成</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
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

    <!-- Import Dialog -->
    <el-dialog v-model="importVisible" title="导入维保计划" width="420px">
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
          <div class="el-upload__tip">仅支持 .xlsx 格式，请先<a @click="downloadPlanTemplate()" style="cursor:pointer;color:#409EFF">下载模板</a>，维保员ID用逗号分隔，至少2人</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">开始导入</el-button>
      </template>
    </el-dialog>

    <!-- Create Dialog -->
    <el-dialog v-model="dialogVisible" title="新增维保计划" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="电梯" prop="elevatorIds">
          <el-select 
            v-model="form.elevatorIds" 
            multiple
            filterable 
            placeholder="请选择电梯（可多选）" 
            style="width:100%"
          >
            <el-option v-for="e in elevators" :key="e.id" :label="`${e.regCode} (${e.building || '-'})`" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划日期" prop="planDate">
          <el-date-picker v-model="form.planDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="计划类型" prop="planType">
          <el-select v-model="form.planType" style="width:100%">
            <el-option label="半月保" value="HALF_MONTHLY" />
            <el-option label="月度保" value="MONTHLY" />
            <el-option label="季度保" value="QUARTERLY" />
            <el-option label="半年保" value="HALF_YEARLY" />
            <el-option label="年度保" value="YEARLY" />
          </el-select>
        </el-form-item>
        <el-form-item label="维保员" prop="maintainerIds">
          <el-select v-model="form.maintainerIds" multiple filterable placeholder="请选择维保员（至少2人）" style="width:100%">
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMaintenancePlans, batchCreateMaintenancePlan, updateMaintenancePlanStatus, deleteMaintenancePlan, importMaintenancePlans, downloadPlanTemplate } from '@/api/maintenance-plan'
import { elevatorApi, userApi } from '@/api'

const list = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const elevators = ref<any[]>([])
const users = ref<any[]>([])
const userMap = computed(() => {
  const map: Record<string, string> = {}
  users.value.forEach(u => { map[u.id] = u.name })
  return map
})
const query = ref({ page: 1, limit: 20, status: '' })
const dialogVisible = ref(false)
const importVisible = ref(false)
const importing = ref(false)
const saving = ref(false)
const uploadRef = ref<any>(null)
const formRef = ref<any>(null)
const form = ref({ elevatorIds: [] as string[], planDate: '', planType: 'MONTHLY', maintainerIds: [] as string[], remark: '' })
const rules = {
  elevatorIds: [{ required: true, message: '请选择电梯', trigger: 'change' }, { type: 'array', min: 1, message: '请至少选择一台电梯', trigger: 'change' }],
  planDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  planType: [{ required: true, message: '请选择类型', trigger: 'change' }],
  maintainerIds: [
    { required: true, message: '请选择维保员', trigger: 'change' }, 
    { type: 'array', min: 2, message: '请至少选择2名维保员', trigger: 'change' }
  ],
}

function planTypeText(t: string) {
  const map: Record<string, string> = { HALF_MONTHLY: '半月保', MONTHLY: '月度保', QUARTERLY: '季度保', HALF_YEARLY: '半年保', YEARLY: '年度保' }
  return map[t] || t
}
function statusType(s: string) { return s === 'COMPLETED' ? 'success' : s === 'IN_PROGRESS' ? 'warning' : 'info' }
function statusText(s: string) { return s === 'PENDING' ? '待执行' : s === 'IN_PROGRESS' ? '执行中' : '已完成' }
function getUserName(id: string) { return userMap.value[id] || id }

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getMaintenancePlans(query.value)
    list.value = res.list || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  const [eRes, uRes] = await Promise.all([
    elevatorApi.list({ page: 1, limit: 999 }),
    userApi.getUsers({}),
  ])
  elevators.value = (eRes as any).list || []
  users.value = Array.isArray(uRes) ? uRes : (uRes as any).list || []
}

async function handleSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  saving.value = true
  try {
    const res: any = await batchCreateMaintenancePlan({
      elevatorIds: form.value.elevatorIds,
      planDate: form.value.planDate,
      planType: form.value.planType,
      maintainerIds: form.value.maintainerIds,
      remark: form.value.remark,
    })
    ElMessage.success(`创建成功，共生成 ${res.created} 条维保计划`)
    dialogVisible.value = false
    form.value = { elevatorIds: [], planDate: '', planType: 'MONTHLY', maintainerIds: [], remark: '' }
    fetchData()
  } catch (e: any) {
    console.error('创建维保计划失败:', e)
    ElMessage.error(e?.response?.data?.message || e?.message || '创建失败，请检查输入')
  } finally {
    saving.value = false
  }
}

async function handleStart(row: any) {
  await updateMaintenancePlanStatus(row.id, 'IN_PROGRESS')
  ElMessage.success('已开始')
  fetchData()
}

async function handleComplete(row: any) {
  await updateMaintenancePlanStatus(row.id, 'COMPLETED')
  ElMessage.success('已完成')
  fetchData()
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确认删除维保计划？`, '提示')
  await deleteMaintenancePlan(row.id)
  ElMessage.success('删除成功')
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
    const res: any = await importMaintenancePlans(file)
    ElMessage.success(`导入完成：成功 ${res.imported} 条${res.errors?.length ? `，失败 ${res.errors.length} 条` : ''}`)
    if (res.errors?.length) {
      console.warn('导入错误:', res.errors)
    }
    importVisible.value = false
    upload.clearFiles()
    fetchData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

onMounted(() => { fetchData(); loadOptions() })
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; }
</style>
