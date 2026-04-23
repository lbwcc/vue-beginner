<template>
  <div class="profile-page">
    <section class="profile-card">
      <div class="head-row">
        <button class="ghost" @click="goHome">返回首页</button>
        <h2>个人信息编辑</h2>
      </div>

      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
      <p class="success" v-if="successMsg">{{ successMsg }}</p>

      <div class="avatar-area">
        <img :src="avatarPreview || defaultAvatar" alt="avatar" class="avatar" />
        <input ref="avatarInputRef" type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onAvatarChange" />
      </div>

      <div class="form-grid">
        <label>
          <span>用户名</span>
          <input :value="form.username" disabled />
        </label>

        <label>
          <span>昵称</span>
          <input v-model.trim="form.nickname" maxlength="64" />
        </label>

        <label>
          <span>邮箱</span>
          <input v-model.trim="form.email" maxlength="128" />
        </label>

        <label>
          <span>手机号</span>
          <input v-model.trim="form.mobile" maxlength="32" />
        </label>

        <label>
          <span>新密码（可选）</span>
          <input v-model="form.password" type="password" maxlength="64" />
        </label>
      </div>

      <div class="actions">
        <button @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchCurrentUserApi, updateUserApi } from '@/api/authApi'
import { uploadFileApi } from '@/api/fileApi'
import { getCurrentAccount, setAuthSession } from '@/utils/auth'
import { normalizeFileUrl } from '@/utils/fileUrl'

const router = useRouter()
const account = ref(getCurrentAccount())
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const avatarInputRef = ref(null)
const avatarFile = ref(null)
const avatarPreview = ref('')

const form = reactive({
  id: null,
  username: '',
  nickname: '',
  email: '',
  mobile: '',
  password: '',
  avatarUrl: ''
})

const defaultAvatar = computed(() => {
  return 'https://via.placeholder.com/96x96.png?text=Avatar'
})

const revokePreview = () => {
  if (avatarPreview.value && avatarPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarPreview.value)
  }
}

const onAvatarChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
    errorMsg.value = '头像仅支持 PNG/JPG/WEBP/GIF'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    errorMsg.value = '头像大小不能超过 2MB'
    return
  }

  errorMsg.value = ''
  revokePreview()
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
}

const isEmailValid = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const loadProfile = async () => {
  errorMsg.value = ''
  const res = await fetchCurrentUserApi()
  if (res?.data?.code !== 200 || !res?.data?.data?.id) {
    throw new Error(res?.data?.message || '加载个人信息失败')
  }

  const data = res.data.data
  form.id = data.id
  form.username = data.username || ''
  form.nickname = data.nickname || ''
  form.email = data.email || ''
  form.mobile = data.mobile || ''
  form.avatarUrl = data.avatarUrl || ''
  avatarPreview.value = normalizeFileUrl(form.avatarUrl) || ''
}

const save = async () => {
  errorMsg.value = ''
  successMsg.value = ''

  if (!form.id) {
    errorMsg.value = '当前用户信息无效'
    return
  }
  if (form.password && form.password.length < 6) {
    errorMsg.value = '新密码至少 6 位'
    return
  }
  if (!isEmailValid(form.email)) {
    errorMsg.value = '邮箱格式不正确'
    return
  }

  saving.value = true
  try {
    let finalAvatarUrl = form.avatarUrl || null
    if (avatarFile.value) {
      const uploadRes = await uploadFileApi(avatarFile.value)
      if (uploadRes?.data?.code !== 200 || !uploadRes?.data?.data?.url) {
        throw new Error(uploadRes?.data?.message || '头像上传失败')
      }
      finalAvatarUrl = normalizeFileUrl(uploadRes.data.data.url)
    }

    const payload = {
      nickname: form.nickname || null,
      email: form.email || null,
      mobile: form.mobile || null,
      avatarUrl: finalAvatarUrl
    }
    if (form.password) {
      payload.password = form.password
    }

    const updateRes = await updateUserApi(form.id, payload)
    if (updateRes?.data?.code !== 200) {
      throw new Error(updateRes?.data?.message || '保存失败')
    }

    form.avatarUrl = finalAvatarUrl || ''
    form.password = ''
    avatarFile.value = null
    if (avatarInputRef.value) avatarInputRef.value.value = ''

    setAuthSession({
      token: undefined,
      user: {
        id: form.id,
        username: form.username,
        avatar: form.avatarUrl || '👤'
      }
    })

    successMsg.value = '保存成功'
  } catch (error) {
    errorMsg.value = error?.message || error?.response?.data?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

const goHome = () => {
  router.push('/forum-square')
}

onMounted(async () => {
  try {
    await loadProfile()
  } catch (error) {
    errorMsg.value = error?.message || '加载失败'
  }
})

onBeforeUnmount(() => {
  revokePreview()
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.profile-card {
  width: min(92vw, 640px);
  background: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 14px;
  padding: 18px;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.avatar-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
}

.avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ddd;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

label span {
  display: block;
  text-align: left;
  margin-bottom: 4px;
  font-size: 13px;
}

input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d8d8d8;
  border-radius: 8px;
  padding: 9px 10px;
}

.actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

button {
  border: none;
  border-radius: 8px;
  padding: 9px 14px;
  cursor: pointer;
  background: #2f7a43;
  color: #fff;
}

button.ghost {
  background: #efefef;
  color: #333;
}

.error {
  color: #b84040;
}

.success {
  color: #2f7a43;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
