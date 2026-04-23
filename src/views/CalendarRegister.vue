<template>
  <AuthLayout title="注册账号" subtitle="欢迎注册" theme="fresh">
    <form @submit.prevent="submitRegister" class="auth-form">
      <label>
        <span>头像（可选）</span>
        <input
          ref="avatarInputRef"
          class="file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          @change="onAvatarChange"
        />
      </label>

      <div v-if="avatarPreview" class="avatar-preview-wrap">
        <img :src="avatarPreview" alt="avatar preview" class="avatar-preview" />
        <button class="avatar-clear-btn" type="button" @click="clearAvatarSelection">移除头像</button>
      </div>
      <p class="avatar-meta" v-if="avatarName">已选择: {{ avatarName }} ({{ avatarSizeText }})</p>

      <label>
        <span>用户名</span>
        <input v-model.trim="form.username" placeholder="请输入用户名" maxlength="64" />
      </label>

      <label>
        <span>昵称（可选）</span>
        <input v-model.trim="form.nickname" placeholder="例如：小李" maxlength="64" />
      </label>

      <label>
        <span>邮箱（可选）</span>
        <input v-model.trim="form.email" placeholder="请输入邮箱" maxlength="128" />
      </label>

      <label>
        <span>手机号（可选）</span>
        <input v-model.trim="form.mobile" placeholder="请输入手机号" maxlength="32" />
      </label>

      <label>
        <span>密码</span>
        <input v-model="form.password" type="password" placeholder="至少 6 位" maxlength="64" />
      </label>

      <label>
        <span>确认密码</span>
        <input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" maxlength="64" />
      </label>

      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

      <button :disabled="loading" type="submit">
        {{ loading ? '注册中...' : '注册并登录' }}
      </button>
    </form>

    <template #footer>
      <p class="switch-row">
        已有账号？
        <router-link to="/login">去登录</router-link>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/AuthLayout.vue'
import { fetchCurrentUserApi, registerApi, updateUserApi } from '@/api/authApi'
import { uploadFileApi } from '@/api/fileApi'
import { setAuthSession } from '@/utils/auth'
import { normalizeFileUrl } from '@/utils/fileUrl'

const route = useRoute()
const router = useRouter()

const form = reactive({
  username: '',
  nickname: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const errorMsg = ref('')
const avatarInputRef = ref(null)
const avatarFile = ref(null)
const avatarPreview = ref('')
const avatarName = ref('')
const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

const avatarSizeText = computed(() => {
  if (!avatarFile.value) return ''
  const sizeKb = avatarFile.value.size / 1024
  return sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(2)}MB` : `${Math.round(sizeKb)}KB`
})

const revokeAvatarPreview = () => {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
  }
}

const clearAvatarSelection = () => {
  revokeAvatarPreview()
  avatarFile.value = null
  avatarPreview.value = ''
  avatarName.value = ''
  if (avatarInputRef.value) {
    avatarInputRef.value.value = ''
  }
}

const onAvatarChange = (event) => {
  const file = event.target.files?.[0]
  clearAvatarSelection()

  if (!file) {
    return
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    errorMsg.value = '仅支持 PNG/JPG/WEBP/GIF 格式头像'
    return
  }

  if (file.size > MAX_AVATAR_SIZE) {
    errorMsg.value = '头像大小不能超过 2MB'
    return
  }

  errorMsg.value = ''
  avatarFile.value = file
  avatarName.value = file.name
  avatarPreview.value = URL.createObjectURL(file)
}

onBeforeUnmount(() => {
  revokeAvatarPreview()
})

const isEmailValid = (email) => {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const submitRegister = async () => {
  errorMsg.value = ''

  if (!form.username || !form.password) {
    errorMsg.value = '用户名和密码不能为空'
    return
  }

  if (form.password.length < 6) {
    errorMsg.value = '密码至少 6 位'
    return
  }

  if (form.password !== form.confirmPassword) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }

  if (!isEmailValid(form.email)) {
    errorMsg.value = '邮箱格式不正确'
    return
  }

  loading.value = true
  try {
    const registerRes = await registerApi({
      username: form.username,
      password: form.password,
      nickname: form.nickname || null,
      email: form.email || null,
      mobile: form.mobile || null
    })

    if (registerRes?.data?.code !== 200 || !registerRes?.data?.data?.token) {
      errorMsg.value = registerRes?.data?.message || '注册失败'
      return
    }

    const token = registerRes.data.data.token
    const fallbackUsername = registerRes.data.data.username || form.username
    setAuthSession({ token, user: { username: fallbackUsername } })

    let currentUser = { username: fallbackUsername }
    try {
      const meRes = await fetchCurrentUserApi()
      if (meRes?.data?.code === 200 && meRes?.data?.data?.username) {
        currentUser = {
          id: meRes.data.data.id,
          username: meRes.data.data.username
        }

        if (avatarFile.value && currentUser.id) {
          const uploadRes = await uploadFileApi(avatarFile.value)
          const avatarUrl = normalizeFileUrl(uploadRes?.data?.data?.url)
          if (uploadRes?.data?.code === 200 && avatarUrl) {
            await updateUserApi(currentUser.id, { avatarUrl })
          } else {
            throw new Error(uploadRes?.data?.message || '头像上传失败')
          }
        }
      }
    } catch (error) {
      if (avatarFile.value) {
        throw error
      }
      currentUser = { username: fallbackUsername }
    }

    setAuthSession({ token, user: currentUser })

    const redirectPath = typeof route.query.redirect === 'string' && route.query.redirect
      ? route.query.redirect
      : '/forum-square'
    router.replace(redirectPath)
  } catch (error) {
    errorMsg.value = error?.response?.data?.message || '注册失败，请检查后端服务'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

label span {
  display: block;
  text-align: left;
  margin-bottom: 6px;
  color: var(--label-color);
  font-size: 14px;
}

input {
  width: 100%;
  border: 1px solid var(--input-border);
  background: #fff;
  border-radius: 10px;
  padding: 11px 12px;
  font-size: 16px;
  box-sizing: border-box;
}

.file-input {
  padding: 8px 10px;
  background: #fff;
}

.avatar-preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.avatar-preview {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--input-border);
}

.avatar-clear-btn {
  width: auto;
  padding: 6px 12px;
  font-size: 13px;
}

.avatar-meta {
  margin: -6px 0 0;
  color: var(--sub-color);
  text-align: left;
  font-size: 13px;
}

input:focus {
  outline: none;
  border-color: var(--input-focus);
  box-shadow: 0 0 0 3px var(--input-focus-shadow);
}

button {
  border: none;
  border-radius: 12px;
  padding: 12px;
  background: var(--primary-bg);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  letter-spacing: 1px;
}

button:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.error {
  min-height: 20px;
  color: #c53535;
  margin: 0;
  text-align: left;
}

.switch-row {
  margin: 0;
  color: var(--sub-color);
}

.switch-row a {
  color: var(--link-color);
  font-weight: 600;
  text-decoration: none;
}
</style>
