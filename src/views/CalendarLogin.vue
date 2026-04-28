<template>
  <AuthLayout title="登录" subtitle="登录后可同步你的日历备注与个人数据" theme="warm">
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
          username: meRes.data.data.username
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
  gap: 14px;
  width: 100%;
  max-width: 360px;
  background: none !important;
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
