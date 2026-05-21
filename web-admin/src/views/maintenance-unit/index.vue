<template>
  <div>
    <el-card>
      <template #header>
        <div class="page-header">
          <span>维保单位管理</span>
          <div>
            <el-button @click="handleExport">导出Excel</el-button>
            <el-button type="primary" @click="dialogVisible = true">新增维保单位</el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="name" label="单位名称" min-width="180" />
        <el-table-column prop="contactName" label="联系人" width="120" />
        <el-table-column prop="contactPhone" label="联系电话" width="140" />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="level" label="资质等级" width="100" />
        <el-table-column label="合同数" width="80">
          <template #default="scope">{{ scope.row._count?.contracts ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="综合评分" width="120" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.score != null" :type="scoreTagType(scope.row.score)" size="small">
              {{ scope.row.score }}分 · {{ scope.row.scoreLevel }}
            </el-tag>
            <span v-else class="text-muted">未评分</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button size="small" @click="handleRecalculate(scope.row)">评价</el-button>
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑维保单位' : '新增维保单位'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="单位名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contactName" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="资质等级">
          <el-select v-model="form.level" placeholder="请选择" style="width:100%">
            <el-option label="一级" value="一级" />
            <el-option label="二级" value="二级" />
            <el-option label="三级" value="三级" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- Score Dialog -->
    <el-dialog v-model="scoreVisible" title="维保单位评分" width="480px">
      <div v-loading="scoreLoading" style="min-height: 120px">
        <template v-if="scoreResult">
          <div class="score-display">
            <div class="score-circle" :class="scoreCircleClass(scoreResult.score)">
              <span class="score-value">{{ scoreResult.score }}</span>
              <span class="score-level">{{ scoreResult.scoreLevel }}</span>
            </div>
          </div>
          <el-descriptions :column="2" border style="margin-top: 20px">
            <el-descriptions-item label="考核均分(70%)">{{ scoreResult.evalScore }}分</el-descriptions-item>
            <el-descriptions-item label="维修完成率(30%)">{{ scoreResult.completionRate }}%</el-descriptions-item>
            <el-descriptions-item label="是否有考核数据">{{ scoreResult.hasEvalData ? '是' : '否' }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
      <template #footer>
        <el-button @click="scoreVisible = false">关闭</el-button>
        <el-button type="primary" :loading="scoreRecalculating" @click="handleRecalculate(currentScoreRow)">重新计算</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { maintenanceUnitApi } from '@/api'

const list = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const query = ref({ page: 1, limit: 20 })
const dialogVisible = ref(false)
const editingId = ref('')
const formRef = ref<any>(null)
const form = ref({ name: '', contactName: '', contactPhone: '', address: '', level: '' })
const rules = { name: [{ required: true, message: '请输入单位名称', trigger: 'blur' }] }

// Score state
const scoreVisible = ref(false)
const scoreLoading = ref(false)
const scoreRecalculating = ref(false)
const currentScoreRow = ref<any>(null)
const scoreResult = ref<any>(null)

async function fetchData() {
  loading.value = true
  try {
    const res: any = await maintenanceUnitApi.list(query.value)
    list.value = res.list || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function handleEdit(row: any) {
  editingId.value = row.id
  form.value = { name: row.name, contactName: row.contactName || '', contactPhone: row.contactPhone || '', address: row.address || '', level: row.level || '' }
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (editingId.value) {
    await maintenanceUnitApi.update(editingId.value, form.value)
    ElMessage.success('更新成功')
  } else {
    await maintenanceUnitApi.create(form.value)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  editingId.value = ''
  form.value = { name: '', contactName: '', contactPhone: '', address: '', level: '' }
  fetchData()
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确认删除维保单位「${row.name}」？`, '提示')
  await maintenanceUnitApi.remove(row.id)
  ElMessage.success('删除成功')
  fetchData()
}

// Score helpers
function scoreTagType(score: number) {
  if (score >= 90) return 'success'
  if (score >= 75) return 'warning'
  if (score >= 60) return 'info'
  return 'danger'
}
function scoreCircleClass(score: number) {
  if (score >= 90) return 'score-excellent'
  if (score >= 75) return 'score-good'
  if (score >= 60) return 'score-pass'
  return 'score-fail'
}

async function handleRecalculate(row: any) {
  currentScoreRow.value = row
  scoreLoading.value = true
  scoreVisible.value = true
  scoreResult.value = null
  try {
    const res: any = await maintenanceUnitApi.recalculateScore(row.id)
    scoreResult.value = res
    fetchData()
  } catch {
    ElMessage.error('评分计算失败')
  } finally {
    scoreLoading.value = false
    scoreRecalculating.value = false
  }
}

async function handleExport() {
  try {
    const res: any = await maintenanceUnitApi.exportExcel()
    const blob = res instanceof Blob ? res : new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `维保单位-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; }
.text-muted { color: #909399; font-size: 13px; }
.score-display { display: flex; justify-content: center; padding: 16px 0; }
.score-circle {
  width: 120px; height: 120px; border-radius: 50%;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; border: 4px solid #909399;
}
.score-excellent { border-color: #67C23A; color: #67C23A; }
.score-good { border-color: #E6A23C; color: #E6A23C; }
.score-pass { border-color: #409EFF; color: #409EFF; }
.score-fail { border-color: #F56C6C; color: #F56C6C; }
.score-value { font-size: 36px; font-weight: 700; line-height: 1; }
.score-level { font-size: 14px; margin-top: 4px; }
</style>
