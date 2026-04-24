import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { clearAuthSession, getAuthToken, getCurrentAccount } from './auth'

const backendOrigin = String(import.meta.env.VITE_BACKEND_ORIGIN || '').trim().replace(/\/+$/, '')
const useRemoteBackendDirect = import.meta.env.PROD && backendOrigin

const http = axios.create({
	baseURL: useRemoteBackendDirect ? backendOrigin : undefined,
	timeout: 10000
})

let authRedirecting = false

http.interceptors.request.use((config) => {
	const token = getAuthToken()
	const account = getCurrentAccount()

	if (token) {
		config.headers = config.headers || {}
		config.headers.Authorization = `Bearer ${token}`
	}

	if (account?.username) {
		config.headers = config.headers || {}
		config.headers['X-User-Name'] = account.username
		config.headers['X-User-Id'] = account.id
	}

	return config
})

const resolveMessageText = (payload, fallback = '') => {
	if (!payload) return fallback
	if (typeof payload === 'string') return payload
	if (typeof payload?.message === 'string') return payload.message
	return fallback
}

const redirectToLoginByExpired = (message) => {
	if (authRedirecting) {
		return
	}
	const currentPath = router.currentRoute.value?.path || ''
	if (currentPath === '/login' || currentPath === '/register') {
		return
	}

	authRedirecting = true
	clearAuthSession()
	ElMessage.warning(message || '登录已过期，请重新登录')

	router
		.replace({
			path: '/login',
			query: { redirect: router.currentRoute.value?.fullPath || '/forum-square' },
		})
		.finally(() => {
			authRedirecting = false
		})
}

http.interceptors.response.use(
	(response) => {
		const code = Number(response?.data?.code)
		const message = resolveMessageText(response?.data, '登录已过期，请重新登录')

		if (code === 401 || code === 403) {
			redirectToLoginByExpired(message)
			return Promise.reject(new Error(message))
		}

		return response
	},
	(error) => {
		const status = error?.response?.status
		const payload = error?.response?.data
		const message = resolveMessageText(payload, '登录已过期，请重新登录')

		if (status === 401 || status === 403) {
			redirectToLoginByExpired(message)
		}

		return Promise.reject(error)
	}
)

export default http