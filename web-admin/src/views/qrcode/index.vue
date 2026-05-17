<template>
  <div class="qrcode-page">
    <!-- Generate QR code for a specific elevator -->
    <el-card shadow="never" class="action-card">
      <template #header><span>生成二维码</span></template>
      <el-form :model="generateForm" inline>
        <el-form-item label="选择电梯" :required="true">
          <el-select
            v-model="generateForm.elevatorId"
            placeholder="请选择电梯"
            filterable
            clearable
            style="width: 300px"
          >
            <el-option
              v-for="e in elevators"
              :key="e.id"
              :label="`${e.regCode ?? e.registrationCode ?? '--'}`"
              :value="e.id"
            >
              <span style="float: left">{{ e.regCode ?? e.registrationCode ?? '--' }}</span>
              <span style="float: right; color: #909399; font-size: 12px">
                {{ e.address ?? '' }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="generating" @click="handleGenerate">
            生成二维码
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- QR Code List -->
    <el-card shadow="never" class="list-card">
      <template #header><span>二维码列表</span></template>

      <el-table :data="list" v-loading="loading" stripe style="width: 100%">
        <el-table-column label="电梯编号" width="180">
          <template #default="{ row }">
            {{ row.elevator?.regCode ?? row.elevator?.registrationCode ?? row.elevatorRegCode ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="电梯地址" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.elevator?.address ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="二维码" width="140" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="showQRCode(row)"
              v-if="row.qrImagePath || row.qrcodeUrl || row.qrCodeUrl"
            >
              查看二维码
            </el-button>
            <span v-else class="text-secondary">暂无</span>
          </template>
        </el-table-column>
        <el-table-column label="生成时间" width="170" prop="createdAt" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              :loading="regeneratingId === row.id"
              @click="handleRegenerate(row)"
            >
              重新生成
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

    <!-- QR Code Preview Dialog -->
    <el-dialog
      v-model="qrDialogVisible"
      title="二维码"
      width="400px"
      align-center
      :close-on-click-modal="false"
    >
      <div class="qr-preview" v-if="currentQRUrl">
        <img :src="currentQRUrl" alt="电梯二维码" class="qr-image" />
        <p class="qr-label">{{ currentQRLabel }}</p>
        <el-button type="primary" @click="downloadQR" style="margin-top: 12px">
          下载二维码
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { qrcodeApi, elevatorApi } from '@/api'

interface ElevatorItem {
  id: string
  regCode?: string
  registrationCode?: string
  address?: string
}

interface QRCodeItem {
  id: string
  elevator?: { id: string; regCode?: string; registrationCode?: string; address?: string }
  elevatorRegCode?: string
  qrcodeUrl?: string
  qrCodeUrl?: string
  createdAt: string
}

const elevators = ref<ElevatorItem[]>([])
const list = ref<QRCodeItem[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const generateForm = reactive({
  elevatorId: '',
})
const generating = ref(false)

// QR preview dialog
const qrDialogVisible = ref(false)
const currentQRUrl = ref('')
const currentQRLabel = ref('')
const currentQRItem = ref<QRCodeItem | null>(null)

// Regenerating tracking
const regeneratingId = ref<string | null>(null)

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
    const res: any = await qrcodeApi.list()
    const items = Array.isArray(res) ? res : res.list ?? res.records ?? res.items ?? []
    list.value = items
    total.value = items.length
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function handleGenerate() {
  if (!generateForm.elevatorId) {
    ElMessage.warning('请先选择电梯')
    return
  }
  generating.value = true
  try {
    const res = await qrcodeApi.generate(generateForm.elevatorId)
    ElMessage.success('二维码生成成功')
    generateForm.elevatorId = ''
    fetchList()
  } catch {
    ElMessage.error('生成失败')
  } finally {
    generating.value = false
  }
}

async function handleRegenerate(row: QRCodeItem) {
  regeneratingId.value = row.id
  try {
    const elevatorId = row.elevator?.id ?? row.id
    await qrcodeApi.generate(elevatorId)
    ElMessage.success('已重新生成')
    fetchList()
  } catch {
    ElMessage.error('重新生成失败')
  } finally {
    regeneratingId.value = null
  }
}

function showQRCode(row: QRCodeItem) {
  currentQRItem.value = row
  currentQRUrl.value = (row as any).qrImagePath ?? row.qrcodeUrl ?? row.qrCodeUrl ?? ''
  currentQRLabel.value =
    row.elevator?.regCode ?? row.elevatorRegCode ?? '电梯二维码'
  qrDialogVisible.value = true
}

function downloadQR() {
  if (!currentQRUrl.value) return
  // Open in new tab for download; server can set content-disposition
  const link = document.createElement('a')
  link.href = currentQRUrl.value
  link.download = `${currentQRLabel.value}_二维码.png`
  link.target = '_blank'
  link.click()
}

onMounted(() => {
  fetchElevators()
  fetchList()
})
</script>

<style scoped>
.qrcode-page {
  padding: 16px;
}
.action-card {
  margin-bottom: 16px;
}
.list-card {
  min-height: 400px;
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 0;
}
.qr-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.qr-image {
  width: 240px;
  height: 240px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
.qr-label {
  margin-top: 12px;
  font-size: 14px;
  color: #606266;
}
.text-secondary {
  color: #909399;
  font-size: 13px;
}
</style>
