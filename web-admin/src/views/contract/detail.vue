<template>
  <div class="contract-detail" v-loading="loading">
    <!-- 返回按钮 -->
    <div style="margin-bottom: 16px">
      <el-button @click="$router.back()">返回</el-button>
    </div>

    <!-- 基本信息卡片 -->
    <el-card shadow="never" class="info-card">
      <template #header>
        <span style="font-weight: 600">合同信息</span>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="合同编号">{{ contract.contractNo }}</el-descriptions-item>
        <el-descriptions-item label="合同名称">{{ contract.name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(contract.status)" size="small">
            {{ statusLabel(contract.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="维保单位">{{ contract.maintenanceUnit }}</el-descriptions-item>
        <el-descriptions-item label="开始日期">{{ contract.startDate }}</el-descriptions-item>
        <el-descriptions-item label="结束日期">{{ contract.endDate }}</el-descriptions-item>
        <el-descriptions-item label="月费(元)">{{ contract.monthlyPrice ? '¥' + Number(contract.monthlyPrice).toFixed(2) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="签约方">{{ contract.signatory }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ contract.contactPerson }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ contract.contactPhone }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ contract.remark }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 标签页 -->
    <el-card shadow="never" style="margin-top: 16px">
      <el-tabs v-model="activeTab">
        <!-- 电梯列表 -->
        <el-tab-pane label="电梯列表" name="elevators">
          <div style="margin-bottom: 12px">
            <el-button type="primary" size="small" @click="showElevatorDialog = true">
              关联电梯
            </el-button>
          </div>
          <el-table :data="elevators" v-loading="elevatorsLoading" border stripe style="width: 100%">
            <el-table-column label="注册代码" min-width="160">
              <template #default="{ row }">{{ row.elevator?.regCode || row.regCode }}</template>
            </el-table-column>
            <el-table-column label="品牌" width="120">
              <template #default="{ row }">{{ row.elevator?.brand || row.brand }}</template>
            </el-table-column>
            <el-table-column label="型号" width="140">
              <template #default="{ row }">{{ row.elevator?.model || row.model }}</template>
            </el-table-column>
            <el-table-column label="楼栋" width="100">
              <template #default="{ row }">{{ row.elevator?.building || row.building }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="elevatorStatusType(row.elevator?.status || row.status)" size="small">
                  {{ elevatorStatusLabel(row.elevator?.status || row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="danger" link size="small" @click="handleRemoveElevator(row)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!elevatorsLoading && elevators.length === 0" description="暂未关联电梯" />

          <!-- 关联电梯对话框 -->
          <el-dialog
            v-model="showElevatorDialog"
            title="关联电梯"
            width="500px"
            :close-on-click-modal="false"
            append-to-body
          >
            <el-select
              v-model="selectedElevatorIds"
              multiple
              filterable
              placeholder="请选择电梯"
              style="width: 100%"
            >
              <el-option
                v-for="e in availableElevators"
                :key="e.id"
                :label="`${e.regCode} - ${e.brand} ${e.model} (${e.building})`"
                :value="e.id"
              />
            </el-select>
            <template #footer>
              <el-button @click="showElevatorDialog = false">取消</el-button>
              <el-button type="primary" :loading="linking" @click="handleLinkElevators">确认</el-button>
            </template>
          </el-dialog>
        </el-tab-pane>

        <!-- 收费配件 -->
        <el-tab-pane label="收费配件" name="chargeParts">
          <div style="margin-bottom: 12px">
            <el-button type="primary" size="small" @click="openPartDialog('CHARGE')">添加配件</el-button>
          </div>
          <el-table :data="chargeParts" v-loading="partsLoading" border stripe style="width: 100%">
            <el-table-column prop="name" label="配件名称" min-width="160" />
            <el-table-column prop="model" label="规格型号" width="140" />
            <el-table-column prop="quantity" label="数量" width="80" align="center" />
            <el-table-column label="单价(元)" width="110" align="right">
              <template #default="{ row }">
                ¥{{ row.price ? Number(row.price).toFixed(2) : '0.00' }}
              </template>
            </el-table-column>
            <el-table-column label="总价(元)" width="110" align="right">
              <template #default="{ row }">
                ¥{{ row.price ? Number(row.price * (row.quantity || 1)).toFixed(2) : '0.00' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditPart(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDeletePart(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!partsLoading && chargeParts.length === 0" description="暂无收费配件" />
        </el-tab-pane>

        <!-- 免费配件 -->
        <el-tab-pane label="免费配件" name="freeParts">
          <div style="margin-bottom: 12px">
            <el-button type="primary" size="small" @click="openPartDialog('FREE')">添加配件</el-button>
          </div>
          <el-table :data="freeParts" v-loading="partsLoading" border stripe style="width: 100%">
            <el-table-column prop="name" label="配件名称" min-width="160" />
            <el-table-column prop="model" label="规格型号" width="140" />
            <el-table-column prop="quantity" label="数量" width="80" align="center" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditPart(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDeletePart(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!partsLoading && freeParts.length === 0" description="暂无免费配件" />
        </el-tab-pane>

        <!-- 考核记录 -->
        <el-tab-pane label="考核记录" name="evaluations">
          <div style="margin-bottom: 12px">
            <el-button type="primary" size="small" @click="openEvalDialog">添加考核</el-button>
          </div>
          <el-table :data="evaluations" v-loading="evalsLoading" border stripe style="width: 100%">
            <el-table-column label="考核日期" width="120">
              <template #default="{ row }">{{ row.month?.slice(0, 10) || row.evaluateDate }}</template>
            </el-table-column>
            <el-table-column prop="score" label="评分" width="80" align="center" />
            <el-table-column prop="evaluator" label="考核人" width="120" />
            <el-table-column prop="content" label="考核内容" min-width="200" show-overflow-tooltip />
            <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditEval(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteEval(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!evalsLoading && evaluations.length === 0" description="暂无考核记录" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 添加配件对话框 -->
    <el-dialog
      v-model="partDialogVisible"
      :title="partEditId ? '编辑配件' : (partType === 'CHARGE' ? '添加收费配件' : '添加免费配件')"
      width="500px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form ref="partFormRef" :model="partForm" :rules="partRules" label-width="100px">
        <el-form-item label="配件名称" prop="name">
          <el-input v-model="partForm.name" />
        </el-form-item>
        <el-form-item label="规格型号" prop="model">
          <el-input v-model="partForm.model" />
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="partForm.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="partType === 'CHARGE'" label="单价(元)" prop="price">
          <el-input-number v-model="partForm.price" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="partDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="partSaving" @click="handleSavePart">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加考核对话框 -->
    <el-dialog
      v-model="evalDialogVisible"
      :title="evalEditId ? '编辑考核记录' : '添加考核记录'"
      width="500px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form ref="evalFormRef" :model="evalForm" :rules="evalRules" label-width="100px">
        <el-form-item label="考核日期" prop="month">
          <el-date-picker v-model="evalForm.month" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="评分" prop="score">
          <el-input-number v-model="evalForm.score" :min="0" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="考核人" prop="evaluator">
          <el-input v-model="evalForm.evaluator" />
        </el-form-item>
        <el-form-item label="考核内容" prop="content">
          <el-input v-model="evalForm.content" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="evalForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="evalDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="evalSaving" @click="handleSaveEval">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { contractApi, elevatorApi } from '@/api'

const route = useRoute()
const contractId = route.params.id as string

// ---------- 状态 ----------
const loading = ref(false)
const contract = ref<any>({})
const activeTab = ref('elevators')

// 电梯
const elevators = ref<any[]>([])
const elevatorsLoading = ref(false)
const showElevatorDialog = ref(false)
const availableElevators = ref<any[]>([])
const selectedElevatorIds = ref<string[]>([])
const linking = ref(false)

// 配件
const partsLoading = ref(false)
const chargeParts = ref<any[]>([])
const freeParts = ref<any[]>([])
const partType = ref<'CHARGE' | 'FREE'>('CHARGE')
const partDialogVisible = ref(false)
const partSaving = ref(false)
const partEditId = ref('')
const partFormRef = ref()
const partForm = reactive({
  name: '',
  model: '',
  quantity: 1,
  price: 0,
})
const partRules = {
  name: [{ required: true, message: '请输入配件名称' }],
  quantity: [{ required: true, message: '请输入数量' }],
}

// 考核
const evalsLoading = ref(false)
const evaluations = ref<any[]>([])
const evalDialogVisible = ref(false)
const evalSaving = ref(false)
const evalEditId = ref('')
const evalFormRef = ref()
const evalForm = reactive({
  month: '',
  score: 0,
  evaluator: '',
  content: '',
  remark: '',
})
const evalRules = {
  month: [{ required: true, message: '请选择考核日期' }],
  evaluator: [{ required: true, message: '请输入考核人' }],
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

function elevatorStatusType(status: string): string {
  const map: Record<string, string> = {
    RUNNING: 'success',
    STOPPED: 'danger',
    MAINTENANCE: 'warning',
    FAULT: 'danger',
  }
  return map[status] || 'info'
}

function elevatorStatusLabel(status: string): string {
  const map: Record<string, string> = {
    RUNNING: '运行中',
    STOPPED: '停梯',
    MAINTENANCE: '维保中',
    FAULT: '故障',
  }
  return map[status] || status
}

// ---------- 数据加载 ----------
async function fetchContract() {
  loading.value = true
  try {
    const res: any = await contractApi.get(contractId)
    contract.value = res
  } finally {
    loading.value = false
  }
}

async function fetchElevators() {
  elevatorsLoading.value = true
  try {
    const res: any = await contractApi.get(contractId)
    elevators.value = res.elevators || []
  } finally {
    elevatorsLoading.value = false
  }
}

async function fetchAvailableElevators() {
  try {
    const res: any = await elevatorApi.list({ limit: 9999 })
    const all: any[] = res.list || res.records || []
    const linkedIds = new Set(elevators.value.map((e: any) => e.elevator?.id || e.id))
    availableElevators.value = all.filter((e: any) => !linkedIds.has(e.id))
  } catch {
    availableElevators.value = []
  }
}

async function fetchParts() {
  partsLoading.value = true
  try {
    const res: any = await contractApi.getParts(contractId)
    const parts: any[] = res || []
    chargeParts.value = parts.filter((p: any) => p.type === 'CHARGE')
    freeParts.value = parts.filter((p: any) => p.type === 'FREE')
  } finally {
    partsLoading.value = false
  }
}

async function fetchEvaluations() {
  evalsLoading.value = true
  try {
    const res: any = await contractApi.getEvaluations(contractId)
    evaluations.value = res || []
  } finally {
    evalsLoading.value = false
  }
}

// ---------- 关联电梯 ----------
async function handleLinkElevators() {
  if (selectedElevatorIds.value.length === 0) {
    ElMessage.warning('请选择要关联的电梯')
    return
  }
  linking.value = true
  try {
    await contractApi.addElevators(contractId, {
      elevatorIds: selectedElevatorIds.value,
    })
    ElMessage.success('关联成功')
    showElevatorDialog.value = false
    selectedElevatorIds.value = []
    fetchElevators()
  } finally {
    linking.value = false
  }
}

function handleRemoveElevator(row: any) {
  const elevatorId = row.elevator?.id || row.id
  const label = row.elevator?.regCode || row.regCode
  ElMessageBox.confirm(`确认移除电梯 "${label}"？`, '移除确认', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await contractApi.removeElevator(contractId, elevatorId)
    ElMessage.success('移除成功')
    fetchElevators()
  }).catch(() => {})
}

// ---------- 配件 ----------
function openPartDialog(type: 'CHARGE' | 'FREE', part?: any) {
  partType.value = type
  partEditId.value = part?.id || ''
  partForm.name = part?.name || ''
  partForm.model = part?.model || ''
  partForm.quantity = part?.quantity ?? 1
  partForm.price = part?.price ?? 0
  partDialogVisible.value = true
}

function openEditPart(row: any) {
  openPartDialog(row.type, row)
}

async function handleSavePart() {
  const valid = await partFormRef.value?.validate().catch(() => false)
  if (!valid) return

  partSaving.value = true
  try {
    const payload = {
      type: partType.value,
      name: partForm.name,
      model: partForm.model,
      quantity: partForm.quantity,
      unit: '个',
      price: partForm.price || undefined,
    }
    if (partEditId.value) {
      await contractApi.updatePart(contractId, partEditId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await contractApi.addPart(contractId, payload)
      ElMessage.success('添加成功')
    }
    partDialogVisible.value = false
    fetchParts()
  } finally {
    partSaving.value = false
  }
}

function handleDeletePart(row: any) {
  ElMessageBox.confirm(`确认删除配件 "${row.name}"？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await contractApi.deletePart(contractId, row.id)
    ElMessage.success('删除成功')
    fetchParts()
  }).catch(() => {})
}

// ---------- 考核 ----------
function openEvalDialog(ev?: any) {
  evalEditId.value = ev?.id || ''
  evalForm.month = ev?.month?.slice(0, 10) || ''
  evalForm.score = ev?.score ?? 0
  evalForm.evaluator = ev?.evaluator || ''
  evalForm.content = ev?.content || ''
  evalForm.remark = ev?.remark || ''
  evalDialogVisible.value = true
}

function openEditEval(row: any) {
  openEvalDialog(row)
}

async function handleSaveEval() {
  const valid = await evalFormRef.value?.validate().catch(() => false)
  if (!valid) return

  evalSaving.value = true
  try {
    const payload = {
      month: evalForm.month,
      score: evalForm.score,
      evaluator: evalForm.evaluator || undefined,
      content: evalForm.content || undefined,
      remark: evalForm.remark || undefined,
    }
    if (evalEditId.value) {
      await contractApi.updateEvaluation(contractId, evalEditId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await contractApi.addEvaluation(contractId, payload)
      ElMessage.success('添加成功')
    }
    evalDialogVisible.value = false
    fetchEvaluations()
  } finally {
    evalSaving.value = false
  }
}

function handleDeleteEval(row: any) {
  ElMessageBox.confirm('确认删除考核记录？', '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await contractApi.deleteEvaluation(contractId, row.id)
    ElMessage.success('删除成功')
    fetchEvaluations()
  }).catch(() => {})
}

// ---------- Tab 切换 ----------
watch(activeTab, (tab) => {
  if (tab === 'elevators' && elevators.value.length === 0) fetchElevators()
  else if ((tab === 'chargeParts' || tab === 'freeParts') && chargeParts.value.length === 0 && freeParts.value.length === 0) fetchParts()
  else if (tab === 'evaluations' && evaluations.value.length === 0) fetchEvaluations()
})

watch(showElevatorDialog, (val) => {
  if (val) fetchAvailableElevators()
})

onMounted(() => {
  fetchContract()
})
</script>

<style scoped>
.contract-detail {
  padding: 20px;
}
.info-card {
  margin-bottom: 0;
}
</style>
