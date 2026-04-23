<template>
  <div class="admin-page">
    <header class="admin-header">
      <button class="ghost" @click="goBack">返回首页</button>
      <h2>用户管理</h2>
      <button class="danger" @click="logout">退出登录</button>
    </header>

    <section class="card">
      <h3>新增用户</h3>
      <div class="form-grid">
        <input v-model.trim="createForm.username" placeholder="用户名" />
        <input v-model="createForm.password" type="password" placeholder="密码（至少6位）" />
        <input v-model.trim="createForm.nickname" placeholder="昵称" />
        <input v-model.trim="createForm.email" placeholder="邮箱" />
        <input v-model.trim="createForm.mobile" placeholder="手机号" />
        <select v-model.number="createForm.status">
          <option :value="1">启用</option>
          <option :value="0">禁用</option>
        </select>
      </div>
      <div class="row-actions">
        <button @click="createUser" :disabled="saving">{{ saving ? '提交中...' : '创建用户' }}</button>
      </div>
    </section>

    <section class="card">
      <h3>用户列表</h3>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <table class="user-table" v-if="users.length">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>昵称</th>
            <th>邮箱</th>
            <th>手机号</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.nickname }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.mobile }}</td>
            <td>{{ user.status === 1 ? '启用' : '禁用' }}</td>
            <td>
              <button class="mini" @click="startEdit(user)">编辑</button>
              <button class="mini danger" @click="removeUser(user)" :disabled="deletingId === user.id">
                {{ deletingId === user.id ? '删除中...' : '删除' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无用户数据</p>
    </section>

    <section class="card" v-if="editingUser">
      <h3>编辑用户 #{{ editingUser.id }}</h3>
      <div class="form-grid">
        <input v-model.trim="editForm.username" placeholder="用户名" />
        <input v-model="editForm.password" type="password" placeholder="新密码（留空不改）" />
        <input v-model.trim="editForm.nickname" placeholder="昵称" />
        <input v-model.trim="editForm.email" placeholder="邮箱" />
        <input v-model.trim="editForm.mobile" placeholder="手机号" />
        <select v-model.number="editForm.status">
          <option :value="1">启用</option>
          <option :value="0">禁用</option>
        </select>
      </div>
      <div class="row-actions">
        <button @click="saveEdit" :disabled="saving">{{ saving ? '保存中...' : '保存修改' }}</button>
        <button class="ghost" @click="cancelEdit">取消</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearAuthSession } from '@/utils/auth'
import { createUserApi, deleteUserApi, listUsersApi, updateUserApi } from '@/api/userApi'

const router = useRouter()
const users = ref([])
const errorMsg = ref('')
const saving = ref(false)
const deletingId = ref(null)
const editingUser = ref(null)

const createForm = reactive({
  username: '',
  password: '',
  nickname: '',
  email: '',
  mobile: '',
  status: 1
})

const editForm = reactive({
  username: '',
  password: '',
  nickname: '',
  email: '',
  mobile: '',
  status: 1
})

const isEmailValid = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const loadUsers = async () => {
  errorMsg.value = ''
  try {
    const res = await listUsersApi()
    if (res?.data?.code === 200 && Array.isArray(res?.data?.data)) {
      users.value = res.data.data
      return
    }
    errorMsg.value = res?.data?.message || '获取用户列表失败'
  } catch (error) {
    errorMsg.value = error?.response?.data?.message || '获取用户列表失败'
  }
}

const createUser = async () => {
  errorMsg.value = ''
  if (!createForm.username || !createForm.password) {
    errorMsg.value = '用户名和密码不能为空'
    return
  }
  if (createForm.password.length < 6) {
    errorMsg.value = '密码至少 6 位'
    return
  }
  if (!isEmailValid(createForm.email)) {
    errorMsg.value = '邮箱格式不正确'
    return
  }

  saving.value = true
  try {
    const payload = {
      username: createForm.username,
      password: createForm.password,
      nickname: createForm.nickname || null,
      email: createForm.email || null,
      mobile: createForm.mobile || null,
      status: createForm.status
    }
    const res = await createUserApi(payload)
    if (res?.data?.code !== 200) {
      errorMsg.value = res?.data?.message || '创建失败'
      return
    }
    createForm.username = ''
    createForm.password = ''
    createForm.nickname = ''
    createForm.email = ''
    createForm.mobile = ''
    createForm.status = 1
    await loadUsers()
  } catch (error) {
    errorMsg.value = error?.response?.data?.message || '创建失败'
  } finally {
    saving.value = false
  }
}

const startEdit = (user) => {
  editingUser.value = user
  editForm.username = user.username || ''
  editForm.password = ''
  editForm.nickname = user.nickname || ''
  editForm.email = user.email || ''
  editForm.mobile = user.mobile || ''
  editForm.status = user.status ?? 1
}

const cancelEdit = () => {
  editingUser.value = null
}

const saveEdit = async () => {
  if (!editingUser.value) return

  errorMsg.value = ''
  if (!editForm.username) {
    errorMsg.value = '用户名不能为空'
    return
  }
  if (editForm.password && editForm.password.length < 6) {
    errorMsg.value = '新密码至少 6 位'
    return
  }
  if (!isEmailValid(editForm.email)) {
    errorMsg.value = '邮箱格式不正确'
    return
  }

  saving.value = true
  try {
    const payload = {
      username: editForm.username,
      nickname: editForm.nickname || null,
      email: editForm.email || null,
      mobile: editForm.mobile || null,
      status: editForm.status
    }
    if (editForm.password) {
      payload.password = editForm.password
    }

    const res = await updateUserApi(editingUser.value.id, payload)
    if (res?.data?.code !== 200) {
      errorMsg.value = res?.data?.message || '保存失败'
      return
    }

    editingUser.value = null
    await loadUsers()
  } catch (error) {
    errorMsg.value = error?.response?.data?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

const removeUser = async (user) => {
  if (!confirm(`确认删除用户 ${user.username} 吗？`)) {
    return
  }
  errorMsg.value = ''
  deletingId.value = user.id
  try {
    const res = await deleteUserApi(user.id)
    if (res?.data?.code !== 200) {
      errorMsg.value = res?.data?.message || '删除失败'
      return
    }
    await loadUsers()
  } catch (error) {
    errorMsg.value = error?.response?.data?.message || '删除失败'
  } finally {
    deletingId.value = null
  }
}

const goBack = () => {
  router.push('/forum-square')
}

const logout = () => {
  clearAuthSession()
  router.replace('/calendar/login')
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.admin-page {
  max-width: 980px;
  margin: 18px auto;
  padding: 0 16px 24px;
  box-sizing: border-box;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

h2,
h3 {
  margin: 0;
}

.card {
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

input,
select,
button {
  border-radius: 8px;
  border: 1px solid #d6d6d6;
  padding: 9px 10px;
  font-size: 14px;
}

button {
  border: none;
  background: #2b7a49;
  color: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button.ghost {
  background: #f3f3f3;
  color: #333;
  border: 1px solid #d7d7d7;
}

button.danger {
  background: #b84040;
}

button.mini {
  padding: 6px 9px;
  margin-right: 8px;
}

.row-actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.user-table th,
.user-table td {
  border-bottom: 1px solid #efefef;
  padding: 8px 6px;
  text-align: left;
  font-size: 13px;
}

.error {
  color: #b84040;
}

.empty {
  color: #777;
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .user-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
