<template>
  <AuthLayout title="登录" subtitle="登录后可同步你的日历备注与个人数据" theme="apple">
    <form @submit.prevent="submitLogin" class="auth-form">
      <label>
        <span>用户名</span>
        <input v-model.trim="form.username" placeholder="请输入用户名" maxlength="64" />
      </label>

      <label>
        <span>密码</span>
        <input v-model="form.password" type="password" placeholder="请输入密码" maxlength="64" />
      </label>

      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

      <button :disabled="loading" type="submit">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </form>

    <template #footer>
      <p class="switch-row">
        还没有账号？
        <router-link to="/register">去注册</router-link>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/AuthLayout.vue'
import { fetchCurrentUserApi, loginApi } from '@/api/authApi'
import { setAuthSession } from '@/utils/auth'

const route = useRoute()
const router = useRouter()

const form = reactive({
  username: '',
  password: ''
})

const loading = ref(false)
const errorMsg = ref('')

const submitLogin = async () => {
  errorMsg.value = ''

  if (!form.username || !form.password) {
    errorMsg.value = '用户名和密码不能为空'
    return
  }

  loading.value = true
  try {
    const loginRes = await loginApi({
      username: form.username,
      password: form.password
    })

    if (loginRes?.data?.code !== 200 || !loginRes?.data?.data?.token) {
      errorMsg.value = loginRes?.message || '登录失败'
      return
    }

    const token = loginRes.data.data.token
    const fallbackUsername = loginRes.data.data.username || form.username
    setAuthSession({ token, user: { username: fallbackUsername } })

    let currentUser = { username: fallbackUsername }
    try {
      const meRes = await fetchCurrentUserApi()
      if (meRes?.data?.code === 200 && meRes?.data?.data?.username) {
        currentUser = {
          id: meRes.data.data.id,
          username: meRes.data.data.username,
          avatarUrl: meRes.data.data.avatarUrl || ''
        }
      }
    } catch (error) {
      currentUser = { username: fallbackUsername }
    }

    setAuthSession({ token, user: currentUser })

    const redirectPath = typeof route.query.redirect === 'string' && route.query.redirect
      ? route.query.redirect
      : '/forum-square'
    router.replace(redirectPath)
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || '登录失败，请检查后端服务'
    errorMsg.value = message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 420px;
  background: none !important;
  border: none !important;
  box-shadow: none !important;
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label span {
  display: block;
  text-align: left;
  margin-bottom: 0;
  color: var(--label-color);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.15px;
}

input {
  width: 100%;
  border: 1px solid var(--input-border);
  background: #fff;
  border-radius: 12px;
  min-height: 48px;
  padding: 12px 14px;
  font-size: 16px;
  color: var(--title-color);
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input::placeholder {
  color: var(--sub-color);
}

input:focus {
  outline: none;
  border-color: var(--input-focus);
  box-shadow: 0 0 0 3px var(--input-focus-shadow);
}

button {
  border: none;
  border-radius: 9999px;
  min-height: 46px;
  padding: 0 16px;
  background: var(--primary-bg);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  letter-spacing: 0;
  font-size: 16px;
  transition: transform 0.16s ease, opacity 0.16s ease, filter 0.16s ease;
}

button:hover:not(:disabled) {
  filter: brightness(1.02);
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.75;
  cursor: not-allowed;
  transform: none;
}

.error {
  min-height: 22px;
  border-radius: 10px;
  border: 1px solid rgba(197, 53, 53, 0.22);
  background: rgba(197, 53, 53, 0.08);
  color: #a72d2d;
  padding: 8px 10px;
  margin: 0;
  text-align: left;
  font-size: 13px;
  line-height: 1.4;
}

.switch-row {
  margin: 0;
  color: var(--sub-color);
  font-size: 14px;
}

.switch-row a {
  color: var(--link-color);
  font-weight: 600;
  text-decoration: none;
}

.switch-row a:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .auth-form {
    max-width: 100%;
    gap: 14px;
  }

  input {
    min-height: 44px;
    font-size: 15px;
  }

  button {
    min-height: 44px;
    font-size: 15px;
  }
}
</style>
