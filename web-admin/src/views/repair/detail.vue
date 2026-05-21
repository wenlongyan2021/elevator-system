<template>
  <div class="repair-detail" v-loading="loading">
    <!-- Header -->
    <el-page-header :icon="ArrowLeft" @back="goBack">
      <template #content>
        <span class="page-title">报修详情 - {{ detail?.orderNo ?? '' }}</span>
      </template>
    </el-page-header>

    <!-- Status Timeline -->
    <el-card shadow="never" class="section-card" v-if="detail">
      <template #header>
        <span>工单状态</span>
      </template>
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="待分配" />
        <el-step title="维修中" />
        <el-step title="主管审批" />
        <el-step title="经理审批" />
        <el-step title="已完成" />
      </el-steps>
      <div style="text-align: center; margin-top: 12px">
        <el-tag :type="statusType(detail.status)" size="medium">
          {{ statusLabel(detail.status) }}
        </el-tag>
        <span class="ml-2 text-secondary">
          报修时间：{{ detail.createdAt }}
        </span>
      </div>
    </el-card>

    <div v-if="detail" class="detail-grid">
      <!-- Elevator Info -->
      <el-card shadow="never" class="section-card">
        <template #header><span>电梯信息</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="注册代码">
            {{ detail.elevator?.regCode ?? detail.elevator?.registrationCode ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="所在项目">
            {{ detail.elevator?.projectName ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="电梯型号">
            {{ detail.elevator?.model ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="安装地址">
            {{ detail.elevator?.address ?? '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Reporter & Assignee -->
      <el-card shadow="never" class="section-card">
        <template #header><span>相关人员</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="报修人">
            {{ detail.reporterName ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="报修人电话">
            {{ detail.reporterPhone ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="维修人">
            {{ detail.assigneeName ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="维修人电话">
            {{ detail.assigneePhone ?? '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Description -->
      <el-card shadow="never" class="section-card">
        <template #header><span>故障描述</span></template>
        <p class="description-text">{{ detail.description ?? '暂无描述' }}</p>
      </el-card>

      <!-- Media Files -->
      <el-card shadow="never" class="section-card" v-if="detail.mediaFiles && detail.mediaFiles.length">
        <template #header><span>现场资料</span></template>
        <el-row :gutter="12">
          <el-col
            v-for="(file, idx) in detail.mediaFiles"
            :key="idx"
            :xs="12"
            :sm="8"
            :md="6"
            style="margin-bottom: 12px"
          >
            <el-image
              v-if="isImage(typeof file === 'string' ? file : file.url)"
              :src="typeof file === 'string' ? file : file.url"
              :preview-src-list="imageList"
              fit="cover"
              style="width: 100%; height: 140px; border-radius: 4px; cursor: pointer"
            />
            <el-link
              v-else
              :href="typeof file === 'string' ? file : file.url"
              type="primary"
              target="_blank"
            >
              {{ typeof file === 'string' ? '附件' : (file.name ?? '附件') }}
            </el-link>
          </el-col>
        </el-row>
      </el-card>

      <!-- Action Buttons -->
      <el-card shadow="never" class="section-card" v-if="showActions">
        <template #header><span>操作</span></template>

        <!-- Assign Maintainer -->
        <div v-if="detail.status === 'PENDING_ACCEPT'" style="margin-bottom: 12px">
          <el-form ref="assignFormRef" :model="assignForm" :rules="assignRules" label-width="100px">
            <el-form-item label="分配维修人" prop="assigneeId">
              <el-select v-model="assignForm.assigneeId" placeholder="请选择维修人员" style="width: 280px">
                <el-option
                  v-for="user in maintainers"
                  :key="user.id"
                  :label="`${user.name} (${user.phone})`"
                  :value="user.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleAssign">分配</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- Complete Repair Form -->
        <div v-if="detail.status === 'PENDING_REPAIR'" style="margin-bottom: 12px">
          <el-form ref="repairFormRef" :model="repairForm" :rules="repairRules" label-width="100px">
            <el-form-item label="维修摘要" prop="summary">
              <el-input
                v-model="repairForm.summary"
                type="textarea"
                :rows="3"
                placeholder="请填写维修摘要"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleCompleteRepair">完成维修</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- Approve / Reject -->
        <div
          v-if="detail.status === 'PENDING_SUPERVISOR' || detail.status === 'PENDING_MANAGER'"
          style="margin-bottom: 12px"
        >
          <el-input
            v-model="approvalComment"
            type="textarea"
            :rows="2"
            placeholder="审批意见（可选）"
            style="max-width: 400px; margin-bottom: 12px"
          />
          <div>
            <el-button type="success" @click="handleApprove">批准</el-button>
            <el-button type="danger" @click="handleReject">驳回</el-button>
          </div>
        </div>
      </el-card>

      <!-- Parts List -->
      <el-card shadow="never" class="section-card">
        <template #header><span>配件清单</span></template>
        <el-table :data="partsList" stripe v-loading="partsLoading" empty-text="暂无配件记录">
          <el-table-column prop="name" label="配件名称" min-width="140" />
          <el-table-column prop="model" label="规格型号" width="140" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column prop="unitPrice" label="单价" width="100">
            <template #default="{ row }">
              {{ row.unitPrice ? `¥${row.unitPrice}` : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="totalPrice" label="小计" width="120">
            <template #default="{ row }">
              {{ row.totalPrice ? `¥${row.totalPrice}` : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="120" />
        </el-table>
      </el-card>

      <!-- Costs List -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>费用明细</span>
            <div>
              <el-button size="small" @click="handleGenerateFundWord">申报Word</el-button>
              <el-button type="primary" size="small" @click="openCostDialog()">添加费用</el-button>
            </div>
          </div>
        </template>
        <el-table :data="costsList" stripe v-loading="costsLoading" empty-text="暂无费用记录">
          <el-table-column label="费用类型" width="140">
            <template #default="{ row }">{{ costTypeLabel(row.costType) }}</template>
          </el-table-column>
          <el-table-column prop="description" label="说明" min-width="180" />
          <el-table-column label="金额" width="120">
            <template #default="{ row }">
              {{ row.amount ? `¥${Number(row.amount).toFixed(2)}` : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="记录时间" width="170" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openCostDialog(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="handleDeleteCost(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- Recommended Parts -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>智能推荐配件</span>
            <el-button size="small" :loading="recLoading" @click="loadRecommendedParts">分析推荐</el-button>
          </div>
        </template>
        <template v-if="recommendedParts.length > 0">
          <div v-if="recInfo" class="rec-info">基于故障描述「{{ recInfo.repairDescription }}」匹配 {{ recInfo.contractCount }} 份合同 {{ recInfo.totalParts }} 个配件</div>
          <el-table :data="recommendedParts" stripe empty-text="点击分析推荐按钮从合同配件中匹配">
            <el-table-column prop="name" label="配件名称" min-width="160" />
            <el-table-column prop="model" label="规格型号" width="140" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="row.type === 'FREE' ? 'success' : 'warning'" size="small">{{ row.type === 'FREE' ? '免费' : '收费' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="单价" width="100">
              <template #default="{ row }">{{ row.price ? `¥${Number(row.price).toFixed(2)}` : '-' }}</template>
            </el-table-column>
            <el-table-column label="匹配度" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.relevanceScore >= 10 ? 'success' : 'warning'" size="small">{{ row.relevanceScore }}分</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="匹配关键词" min-width="160">
              <template #default="{ row }">
                <el-tag v-for="kw in row.matchedKeywords" :key="kw" size="small" style="margin:2px">{{ kw }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <el-empty v-else-if="!recLoading" description="点击分析推荐从合同配件中智能匹配" :image-size="60" />
      </el-card>

      <!-- Workflow History -->
      <el-card shadow="never" class="section-card" v-if="workflowHistory.length">
        <template #header><span>审批流程</span></template>
        <el-timeline>
          <el-timeline-item
            v-for="(item, idx) in workflowHistory"
            :key="idx"
            :timestamp="item.createdAt ?? item.time ?? ''"
            :type="item.action === 'REJECT' ? 'danger' : item.action === 'APPROVE' ? 'success' : 'primary'"
          >
            <p>
              <strong>{{ item.operator ?? item.operatorName ?? '系统' }}</strong>
              {{ actionLabel(item.action) }}
            </p>
            <p v-if="item.comment" class="text-secondary">{{ item.comment }}</p>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <!-- Fund Materials -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>维修资金材料</span>
            <el-button size="small" type="primary" @click="openMaterialDialog()">添加材料</el-button>
          </div>
        </template>
        <el-table :data="materialsList" stripe v-loading="materialsLoading" empty-text="暂无资金材料">
          <el-table-column label="材料类型" width="130">
            <template #default="{ row }">{{ materialTypeLabel(row.materialType) }}</template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="160" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'APPROVED' ? 'success' : row.status === 'SUBMITTED' ? 'primary' : 'warning'" size="small">
                {{ row.status === 'APPROVED' ? '已通过' : row.status === 'SUBMITTED' ? '已提交' : '待提交' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="提交时间" width="170" />
          <el-table-column label="文件" width="80">
            <template #default="{ row }">
              <el-link v-if="row.filePath" type="primary" :href="row.filePath" target="_blank" :underline="false">查看</el-link>
              <span v-else class="text-secondary">-</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- Material Dialog -->
    <el-dialog
      v-model="materialDialogVisible"
      title="添加维修资金材料"
      width="500px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form ref="materialFormRef" :model="materialForm" :rules="materialRules" label-width="100px">
        <el-form-item label="材料类型" prop="materialType">
          <el-select v-model="materialForm.materialType" style="width: 100%">
            <el-option label="公告" value="ANNOUNCEMENT" />
            <el-option label="报价单" value="QUOTATION" />
            <el-option label="审价报告" value="REVIEW_PRICE" />
            <el-option label="照片" value="PHOTO" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="materialForm.title" placeholder="请输入材料标题" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="materialForm.content" type="textarea" :rows="4" placeholder="请输入材料内容（可选）" />
        </el-form-item>
        <el-form-item label="文件路径">
          <el-input v-model="materialForm.filePath" placeholder="文件上传后的URL路径（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="materialDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="materialSaving" @click="handleSaveMaterial">提交</el-button>
      </template>
    </el-dialog>

    <!-- Cost Dialog -->
    <el-dialog
      v-model="costDialogVisible"
      :title="costEditId ? '编辑费用' : '添加费用'"
      width="500px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form ref="costFormRef" :model="costForm" :rules="costRules" label-width="100px">
        <el-form-item label="费用类型" prop="costType">
          <el-select v-model="costForm.costType" style="width: 100%">
            <el-option label="免费" value="FREE" />
            <el-option label="合同内" value="CONTRACT_IN" />
            <el-option label="合同外" value="CONTRACT_OUT" />
            <el-option label="公共维修资金" value="PUBLIC_FUND" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额(元)" prop="amount">
          <el-input-number v-model="costForm.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="说明" prop="description">
          <el-input v-model="costForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="costDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="costSaving" @click="handleSaveCost">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { repairApi, workflowApi } from '@/api'

interface MediaFile {
  url: string
  name?: string
}

interface ElevatorInfo {
  regCode?: string
  registrationCode?: string
  projectName?: string
  model?: string
  address?: string
}

interface RepairDetail {
  id: string
  orderNo: string
  elevator?: ElevatorInfo
  status: string
  urgency: string
  description: string
  reporterName: string
  reporterPhone?: string
  assigneeName?: string
  assigneePhone?: string
  createdAt: string
  mediaFiles?: (MediaFile | string)[]
}

interface PartItem {
  name: string
  model?: string
  quantity: number
  unit?: string
  unitPrice?: number
  totalPrice?: number
  remark?: string
}

interface CostItem {
  id: string
  costType: string
  description?: string
  amount: number
  createdAt: string
}

interface WorkflowHistoryItem {
  action: string
  operator?: string
  operatorName?: string
  comment?: string
  createdAt?: string
  time?: string
}

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<RepairDetail | null>(null)
const partsList = ref<PartItem[]>([])
const partsLoading = ref(false)
const costsList = ref<CostItem[]>([])
const costsLoading = ref(false)
const workflowHistory = ref<WorkflowHistoryItem[]>([])
const materialsList = ref<any[]>([])
const materialsLoading = ref(false)

// Recommended parts
const recLoading = ref(false)
const recommendedParts = ref<any[]>([])
const recInfo = ref<any>(null)

// Material dialog
const materialDialogVisible = ref(false)
const materialSaving = ref(false)
const materialFormRef = ref()
const materialForm = reactive({
  materialType: 'ANNOUNCEMENT',
  title: '',
  content: '',
  filePath: '',
})
const materialRules = {
  materialType: [{ required: true, message: '请选择材料类型' }],
  title: [{ required: true, message: '请输入标题' }],
}

function materialTypeLabel(type: string): string {
  const map: Record<string, string> = {
    ANNOUNCEMENT: '公告', QUOTATION: '报价单',
    REVIEW_PRICE: '审价报告', PHOTO: '照片',
  }
  return map[type] || type
}

// Maintainers list for assignment
const maintainers = ref<any[]>([])

// Assign form
const assignFormRef = ref()
const assignForm = reactive({
  assigneeId: '',
})
const assignRules = {
  assigneeId: [{ required: true, message: '请选择维修人员', trigger: 'blur' }],
}

const repairFormRef = ref()
const repairForm = ref({ summary: '' })
const repairRules = {
  summary: [{ required: true, message: '请填写维修摘要', trigger: 'blur' }],
}

const approvalComment = ref('')

// Cost management
const costDialogVisible = ref(false)
const costSaving = ref(false)
const costEditId = ref('')
const costFormRef = ref()
const costForm = reactive({
  costType: 'FREE',
  amount: 0,
  description: '',
})
const costRules = {
  costType: [{ required: true, message: '请选择费用类型' }],
  amount: [{ required: true, message: '请输入金额' }],
}

const costTypeMap: Record<string, string> = {
  FREE: '免费',
  CONTRACT_IN: '合同内',
  CONTRACT_OUT: '合同外',
  PUBLIC_FUND: '公共维修资金',
}
function costTypeLabel(type: string): string {
  return costTypeMap[type] || type
}

// Status helpers
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

function statusLabel(status: string): string {
  return statusMap[status]?.label ?? status
}

function statusType(status: string): string {
  return statusMap[status]?.type ?? ''
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    SUBMIT: '提交申请',
    ACCEPT: '接单',
    REPAIR: '完成维修',
    APPROVE: '批准',
    REJECT: '驳回',
    CLOSE: '完结',
  }
  return map[action] ?? action
}

function isImage(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)
}

const imageList = computed(() => {
  if (!detail.value?.mediaFiles) return []
  return detail.value.mediaFiles
    .map((f) => (typeof f === 'string' ? f : f.url))
    .filter((u) => isImage(u))
})

const currentStep = computed(() => {
  const map: Record<string, number> = {
    PENDING_ACCEPT: 0,
    PENDING_REPAIR: 1,
    PENDING_SUPERVISOR: 2,
    PENDING_MANAGER: 3,
    APPROVED: 4,
    RESOLVED: 4,
    CLOSED: 4,
    REJECTED: -1,
  }
  return map[detail.value?.status ?? ''] ?? 0
})

const showActions = computed(() => {
  if (!detail.value) return false
  return ['PENDING_ACCEPT', 'PENDING_REPAIR', 'PENDING_SUPERVISOR', 'PENDING_MANAGER'].includes(
    detail.value.status
  )
})

async function fetchDetail() {
  const id = route.params.id as string
  if (!id) {
    ElMessage.error('缺少报修单ID参数')
    router.push('/repair')
    return
  }
  loading.value = true
  try {
    const res: any = await repairApi.get(id)
    detail.value = res
  } catch (err: any) {
    detail.value = null
    const msg = err?.response?.data?.message || ''
    if (msg.includes('不存在') || err?.response?.status === 404) {
      ElMessage.error('报修单不存在或已被删除')
    } else {
      ElMessage.error('获取工单详情失败')
    }
  } finally {
    loading.value = false
  }
}

async function fetchParts() {
  const id = route.params.id as string
  if (!id) return
  partsLoading.value = true
  try {
    const res: any = await repairApi.getParts(id)
    partsList.value = res ?? []
  } catch {
    partsList.value = []
  } finally {
    partsLoading.value = false
  }
}

async function fetchCosts() {
  const id = route.params.id as string
  if (!id) return
  costsLoading.value = true
  try {
    const res: any = await repairApi.getCosts(id)
    costsList.value = res ?? []
  } catch {
    costsList.value = []
  } finally {
    costsLoading.value = false
  }
}

async function loadRecommendedParts() {
  const id = route.params.id as string
  if (!id) return
  recLoading.value = true
  try {
    const res: any = await repairApi.recommendedParts(id)
    recommendedParts.value = res.recommendations ?? []
    recInfo.value = res
  } catch {
    recommendedParts.value = []
    recInfo.value = null
  } finally {
    recLoading.value = false
  }
}

async function fetchWorkflow() {
  const id = route.params.id as string
  if (!id) return
  try {
    const res: any = await workflowApi.get(id)
    workflowHistory.value = res.history ?? res.timeline ?? res.records ?? (Array.isArray(res) ? res : [])
  } catch {
    workflowHistory.value = []
  }
}

async function fetchMaterials() {
  const id = route.params.id as string
  if (!id) return
  materialsLoading.value = true
  try {
    const res = await workflowApi.getMaterials(id)
    materialsList.value = (res as any) ?? []
  } catch {
    materialsList.value = []
  } finally {
    materialsLoading.value = false
  }
}

function openMaterialDialog() {
  materialForm.materialType = 'ANNOUNCEMENT'
  materialForm.title = ''
  materialForm.content = ''
  materialForm.filePath = ''
  materialDialogVisible.value = true
}

async function handleSaveMaterial() {
  const valid = await materialFormRef.value?.validate().catch(() => false)
  if (!valid) return
  materialSaving.value = true
  try {
    await workflowApi.addMaterial(route.params.id as string, materialForm)
    ElMessage.success('添加成功')
    materialDialogVisible.value = false
    fetchMaterials()
  } catch {
    ElMessage.error('添加失败')
  } finally {
    materialSaving.value = false
  }
}

async function fetchMaintainers() {
  try {
    const res: any = await repairApi.getMaintainers()
    maintainers.value = res || []
  } catch {
    maintainers.value = []
  }
}

async function handleAssign() {
  const valid = await assignFormRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    await repairApi.accept(route.params.id as string, {
      assigneeId: assignForm.assigneeId,
    })
    ElMessage.success('分配成功')
    fetchDetail()
    assignForm.assigneeId = ''
  } catch {
    ElMessage.error('分配失败')
  }
}

async function handleCompleteRepair() {
  const valid = await repairFormRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    await repairApi.complete(route.params.id as string, {
      summary: repairForm.value.summary,
    })
    ElMessage.success('维修完成')
    fetchDetail()
    fetchWorkflow()
  } catch {
    ElMessage.error('提交失败')
  }
}

async function handleApprove() {
  try {
    await ElMessageBox.confirm('确认批准该工单？', '提示', { type: 'info' })
  } catch {
    return
  }
  try {
    await workflowApi.approve(route.params.id as string, {
      comment: approvalComment.value,
    })
    ElMessage.success('已批准')
    fetchDetail()
    fetchWorkflow()
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleReject() {
  try {
    await ElMessageBox.confirm('确认驳回该工单？', '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await workflowApi.reject(route.params.id as string, {
      comment: approvalComment.value,
    })
    ElMessage.success('已驳回')
    fetchDetail()
    fetchWorkflow()
  } catch {
    ElMessage.error('操作失败')
  }
}

// ---------- Cost management ----------
function openCostDialog(cost?: any) {
  costEditId.value = cost?.id || ''
  costForm.costType = cost?.costType || 'FREE'
  costForm.amount = cost?.amount ?? 0
  costForm.description = cost?.description || ''
  costDialogVisible.value = true
}

async function handleSaveCost() {
  const valid = await costFormRef.value?.validate().catch(() => false)
  if (!valid) return

  costSaving.value = true
  try {
    if (costEditId.value) {
      await repairApi.updateCost(route.params.id as string, costEditId.value, costForm)
      ElMessage.success('更新成功')
    } else {
      await repairApi.addCost(route.params.id as string, costForm)
      ElMessage.success('添加成功')
    }
    costDialogVisible.value = false
    fetchCosts()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    costSaving.value = false
  }
}

function handleDeleteCost(row: any) {
  ElMessageBox.confirm('确认删除该费用记录？', '删除确认', {
    type: 'warning',
  }).then(async () => {
    await repairApi.deleteCost(route.params.id as string, row.id)
    ElMessage.success('删除成功')
    fetchCosts()
  }).catch(() => {})
}

async function handleGenerateFundWord() {
  try {
    const res: any = await repairApi.generateFundWord(route.params.id as string)
    const blob = res instanceof Blob ? res : new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `维修资金申报-${(detail.value as any)?.orderNo || route.params.id}.docx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('文档生成成功')
  } catch {
    ElMessage.error('文档生成失败')
  }
}

function goBack() {
  router.push('/repair')
}

onMounted(() => {
  fetchDetail()
  fetchParts()
  fetchCosts()
  fetchWorkflow()
  fetchMaterials()
  fetchMaintainers()
})
</script>

<style scoped>
.repair-detail {
  padding: 16px;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
}
.section-card {
  margin-top: 16px;
}
.detail-grid {
  max-width: 960px;
}
.description-text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #333;
}
.text-secondary {
  color: #909399;
  font-size: 13px;
}
.ml-2 {
  margin-left: 8px;
}
</style>
