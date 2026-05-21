<template>
  <div class="workflow-list">
    <!-- Filters -->
    <el-card shadow="never" class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="选择状态" style="width: 140px">
            <el-option label="待审批" value="pending" />
            <el-option label="已批准" value="approved" />
            <el-option label="已驳回" value="rejected" />
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
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table :data="list" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="orderNo" label="工单编号" width="180" />
        <el-table-column label="电梯编号" width="160">
          <template #default="{ row }">
            {{ row.elevator?.regCode ?? row.elevator?.registrationCode ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="报修描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="当前步骤" width="140">
          <template #default="{ row }">
            <el-tag :type="stepType(row.workflow?.currentStep)" size="small">
              {{ stepLabel(row.workflow?.currentStep) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.workflow?.status === 'COMPLETED' ? 'success' : row.workflow?.status === 'REJECTED' ? 'danger' : 'warning'" size="small">
              {{ row.workflow?.status === 'COMPLETED' ? '已完成' : row.workflow?.status === 'REJECTED' ? '已驳回' : row.workflow?.status === 'ACTIVE' ? '待审批' : '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170" prop="createdAt" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showFlow(row)">审批流程</el-button>
            <el-button
              type="success"
              link
              size="small"
              v-if="row.workflow?.status === 'ACTIVE'"
              @click="handleApprove(row)"
            >
              批准
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              v-if="row.workflow?.status === 'ACTIVE'"
              @click="handleReject(row)"
            >
              驳回
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

    <!-- Approval Timeline Dialog -->
    <el-dialog
      v-model="flowDialogVisible"
      title="审批流程"
      width="560px"
      :close-on-click-modal="false"
    >
      <div v-if="flowLoading" v-loading="flowLoading" style="height: 100px" />
      <el-timeline v-else>
        <el-timeline-item
          v-for="(item, idx) in flowRecords"
          :key="idx"
          :timestamp="item.createdAt ?? item.time ?? ''"
          :type="
            item.action === 'REJECT'
              ? 'danger'
              : item.action === 'APPROVE'
                ? 'success'
                : 'primary'
          "
        >
          <p>
            <strong>{{ item.operator ?? item.operatorName ?? '系统' }}</strong>
            {{ item.actionLabel ?? item.action ?? '-' }}
          </p>
          <p v-if="item.comment" class="text-secondary">{{ item.comment }}</p>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>

    <!-- Approve/Reject Dialog -->
    <el-dialog
      v-model="actionDialogVisible"
      :title="actionDialogTitle"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form :model="actionForm">
        <el-form-item label="审批意见">
          <el-input
            v-model="actionForm.comment"
            type="textarea"
            :rows="3"
            placeholder="请输入审批意见（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actionDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="actionSubmitting"
          @click="confirmAction"
        >
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { workflowApi, repairApi } from '@/api'

interface WorkflowItem {
  id: string
  orderNo?: string
  elevator?: { regCode?: string; registrationCode?: string }
  description?: string
  currentStep?: string
  currentStepName?: string
  status: string
  createdAt: string
}

interface FlowRecord {
  action: string
  actionLabel?: string
  operator?: string
  operatorName?: string
  comment?: string
  createdAt?: string
  time?: string
}

const list = ref<WorkflowItem[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const filters = reactive({
  status: '',
  startDate: '',
  endDate: '',
})
const dateRange = ref<[string, string] | null>(null)

// Flow dialog
const flowDialogVisible = ref(false)
const flowLoading = ref(false)
const flowRecords = ref<FlowRecord[]>([])
const currentFlowItem = ref<WorkflowItem | null>(null)

// Action dialog
const actionDialogVisible = ref(false)
const actionDialogTitle = ref('')
const actionSubmitting = ref(false)
const actionType = ref<'approve' | 'reject'>('approve')
const currentActionItem = ref<WorkflowItem | null>(null)
const actionForm = reactive({ comment: '' })

const stepLabels: Record<string, string> = {
  PENDING_ACCEPT: '待分配',
  PENDING_REPAIR: '维修中',
  PENDING_PARTS_VERIFY: '待确认配件',
  PENDING_SUPERVISOR: '待主管审批',
  PENDING_MANAGER: '待经理审批',
  PENDING_FUND_REVIEW: '待维修资金材料',
  APPROVED: '已批准',
  RESOLVED: '已修复',
}

function stepType(step?: string): string {
  if (!step) return ''
  if (['PENDING_MANAGER', 'PENDING_FUND_REVIEW'].includes(step)) return 'danger'
  if (['PENDING_SUPERVISOR', 'PENDING_PARTS_VERIFY'].includes(step)) return 'warning'
  return 'primary'
}

function stepLabel(step?: string): string {
  return step ? (stepLabels[step] || step) : '-'
}

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: pageSize.value,
    }
    if (filters.status) params.status = filters.status
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res: any = await repairApi.list({ ...params, hasWorkflow: true })
    list.value = res.list ?? res.records ?? res.items ?? []
    total.value = res.total ?? res.count ?? 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function showFlow(row: WorkflowItem) {
  currentFlowItem.value = row
  flowDialogVisible.value = true
  flowLoading.value = true
  try {
    const res: any = await workflowApi.get(row.id)
    const nodes = res.nodes ?? []
    flowRecords.value = nodes.map((n: any) => ({
      action: n.action,
      actionLabel: n.action === 'APPROVE' ? '审批通过' : n.action === 'REJECT' ? '驳回' : n.action || '提交',
      operator: n.approver?.name || n.approverName || '系统',
      comment: n.comment,
      createdAt: n.createdAt,
    }))
  } catch {
    flowRecords.value = []
  } finally {
    flowLoading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchList()
}

function handleReset() {
  filters.status = ''
  dateRange.value = null
  currentPage.value = 1
  fetchList()
}

function handleApprove(row: WorkflowItem) {
  actionType.value = 'approve'
  actionDialogTitle.value = '批准工单'
  currentActionItem.value = row
  actionForm.comment = ''
  actionDialogVisible.value = true
}

function handleReject(row: WorkflowItem) {
  actionType.value = 'reject'
  actionDialogTitle.value = '驳回工单'
  currentActionItem.value = row
  actionForm.comment = ''
  actionDialogVisible.value = true
}

async function confirmAction() {
  if (!currentActionItem.value) return
  actionSubmitting.value = true
  try {
    const id = currentActionItem.value.id
    const payload = actionForm.comment ? { comment: actionForm.comment } : {}
    if (actionType.value === 'approve') {
      await workflowApi.approve(id, payload)
      ElMessage.success('已批准')
    } else {
      await workflowApi.reject(id, payload)
      ElMessage.success('已驳回')
    }
    actionDialogVisible.value = false
    fetchList()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    actionSubmitting.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.workflow-list {
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
.text-secondary {
  color: #909399;
  font-size: 13px;
}
</style>
