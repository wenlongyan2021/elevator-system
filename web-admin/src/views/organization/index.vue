<template>
  <div class="org-page">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="项目管理" name="projects">
        <el-button type="primary" style="margin-bottom:16px" @click="openProjectDialog">新建项目</el-button>
        <el-table :data="projects" v-loading="loading" border stripe>
          <el-table-column prop="name" label="项目名称" min-width="180" />
          <el-table-column prop="address" label="地址" min-width="250" />
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="editProject(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="deleteProject(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="用户管理" name="users">
        <el-button type="primary" style="margin-bottom:16px" @click="openUserDialog">新建用户</el-button>
        <el-table :data="users" v-loading="userLoading" border stripe>
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="phone" label="手机号" width="140" />
          <el-table-column prop="role" label="角色" width="140" />
          <el-table-column prop="projectName" label="所属项目" min-width="160" />
          <el-table-column label="操作" width="240">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="editUser(row)">编辑</el-button>
              <el-button type="warning" link size="small" @click="resetPassword(row)">重置密码</el-button>
              <el-button type="danger" link size="small" @click="deleteUser(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="组织架构树" name="hierarchy">
        <el-tree :data="hierarchy" :props="treeProps" default-expand-all v-loading="treeLoading" />
      </el-tab-pane>
    </el-tabs>

    <!-- Project Dialog -->
    <el-dialog v-model="projectDialog" :title="isEditProject ? '编辑项目' : '新建项目'" width="500px">
      <el-form ref="projectFormRef" :model="projectForm" label-width="80px">
        <el-form-item label="名称" prop="name" :rules="[{ required: true, message: '请输入项目名称' }]">
          <el-input v-model="projectForm.name" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="projectForm.address" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="projectDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProject">保存</el-button>
      </template>
    </el-dialog>

    <!-- User Dialog -->
    <el-dialog v-model="userDialog" :title="isEditUser ? '编辑用户' : '新建用户'" width="500px">
      <el-form ref="userFormRef" :model="userForm" label-width="80px">
        <el-form-item label="姓名" prop="name" :rules="[{ required: true, message: '请输入姓名' }]">
          <el-input v-model="userForm.name" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone" :rules="[{ required: true, message: '请输入手机号' }]">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" style="width:100%">
            <el-option label="项目主管" value="PROJECT_SUPERVISOR" />
            <el-option label="客服管家" value="CUSTOMER_SERVICE" />
            <el-option label="工程" value="ENGINEER" />
            <el-option label="秩序" value="SECURITY" />
            <el-option label="电梯维保员" value="ELEVATOR_MAINTAINER" />
            <el-option label="安全员" value="SAFETY_OFFICER" />
            <el-option label="安全总监" value="SAFETY_DIRECTOR" />
            <el-option label="管理员" value="ADMIN" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属项目" prop="projectId">
          <el-select v-model="userForm.projectId" filterable clearable style="width:100%">
            <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orgApi, userApi } from '@/api'

const activeTab = ref('projects')

// Projects
const loading = ref(false)
const projects = ref<any[]>([])
const projectDialog = ref(false)
const isEditProject = ref(false)
const editProjectId = ref('')
const projectForm = ref({ name: '', address: '' })
const projectFormRef = ref()
const saving = ref(false)

async function fetchProjects() {
  loading.value = true
  try {
    const res = await orgApi.getProjects()
    projects.value = (res as any) || []
  } catch {
    projects.value = []
  } finally {
    loading.value = false
  }
}

function openProjectDialog() {
  isEditProject.value = false
  editProjectId.value = ''
  projectForm.value = { name: '', address: '' }
  projectDialog.value = true
}

function editProject(row: any) {
  isEditProject.value = true
  editProjectId.value = row.id
  projectForm.value = { name: row.name || '', address: row.address || '' }
  projectDialog.value = true
}

async function saveProject() {
  const valid = await projectFormRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    if (isEditProject.value) {
      await orgApi.updateProject(editProjectId.value, projectForm.value)
      ElMessage.success('更新成功')
    } else {
      await orgApi.createProject(projectForm.value)
      ElMessage.success('创建成功')
    }
    projectDialog.value = false
    fetchProjects()
  } finally {
    saving.value = false
  }
}

function deleteProject(row: any) {
  ElMessageBox.confirm(`确认删除项目「${row.name}」？该项目下的电梯需提前迁出。`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await orgApi.deleteProject(row.id)
    ElMessage.success('删除成功')
    fetchProjects()
  }).catch(() => {})
}

// Users
const userLoading = ref(false)
const users = ref<any[]>([])
const userDialog = ref(false)
const isEditUser = ref(false)
const editUserId = ref('')
const userForm = ref({ name: '', phone: '', role: '', projectId: '' })
const userFormRef = ref()

async function fetchUsers() {
  userLoading.value = true
  try {
    const res = await userApi.getUsers()
    users.value = (res as any) || []
  } catch {
    users.value = []
  } finally {
    userLoading.value = false
  }
}

function openUserDialog() {
  isEditUser.value = false
  editUserId.value = ''
  userForm.value = { name: '', phone: '', role: 'ENGINEER', projectId: '' }
  userDialog.value = true
}

function editUser(row: any) {
  isEditUser.value = true
  editUserId.value = row.id
  userForm.value = {
    name: row.name || '',
    phone: row.phone || '',
    role: row.role || '',
    projectId: row.projectId || '',
  }
  userDialog.value = true
}

async function saveUser() {
  const valid = await userFormRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    if (isEditUser.value) {
      const data: any = { name: userForm.value.name, role: userForm.value.role }
      if (userForm.value.projectId) data.projectIds = [userForm.value.projectId]
      await userApi.updateUser(editUserId.value, data)
      ElMessage.success('更新成功')
    } else {
      const data: any = {
        name: userForm.value.name,
        phone: userForm.value.phone,
        role: userForm.value.role,
      }
      if (userForm.value.projectId) data.projectIds = [userForm.value.projectId]
      await userApi.createUser(data)
      ElMessage.success('创建成功')
    }
    userDialog.value = false
    fetchUsers()
  } finally {
    saving.value = false
  }
}

function deleteUser(row: any) {
  ElMessageBox.confirm(`确认将用户「${row.name}」停用？`, '删除确认', {
    confirmButtonText: '确认停用',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    await userApi.deleteUser(row.id)
    ElMessage.success('已停用')
    fetchUsers()
  }).catch(() => {})
}

function resetPassword(row: any) {
  ElMessageBox.prompt('输入新密码（至少6位）', '重置密码', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputType: 'password',
    inputPattern: /^.{6,}$/,
    inputErrorMessage: '密码长度至少6位',
  }).then(async ({ value }) => {
    await userApi.resetPassword(row.id, value)
    ElMessage.success('密码已重置')
  }).catch(() => {})
}

// Hierarchy
const treeLoading = ref(false)
const hierarchy = ref<any[]>([])
const treeProps = { children: 'children', label: 'name' }

async function fetchHierarchy() {
  treeLoading.value = true
  try {
    const res = await userApi.getHierarchy()
    hierarchy.value = (res as any) || []
  } catch {
    hierarchy.value = []
  } finally {
    treeLoading.value = false
  }
}

function handleTabChange(name: string) {
  if (name === 'projects' && !projects.value.length) fetchProjects()
  if (name === 'users' && !users.value.length) fetchUsers()
  if (name === 'hierarchy' && !hierarchy.value.length) fetchHierarchy()
}

onMounted(fetchProjects)
</script>

<style scoped>
.org-page {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}
</style>
