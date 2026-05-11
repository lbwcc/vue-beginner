import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { clearAuthSession, getAuthToken, getCurrentAccount } from './auth'
import { appEnv, resolveApiBaseURL } from '@/config/env'
import { reportApiFailure } from '@/utils/monitor'
import pinia from '@/stores'
import { useAppStore } from '@/stores/app'

const pendingRequestMap = new Map()
const messageThrottleMap = new Map()

const http = axios.create({
	baseURL: resolveApiBaseURL(),
	timeout: appEnv.requestTimeout,
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
})

let authRedirecting = false

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const buildRequestKey = (config) => {
	const method = String(config?.method || 'get').toLowerCase()
	const url = String(config?.url || '')
	// Use hash to avoid non-ASCII characters in request headers
	try {
		const params = JSON.stringify(config?.params || {})
		const data = typeof config?.data === 'string' ? config.data : JSON.stringify(config?.data || {})
		const combined = `${method}::${url}::${params}::${data}`
		// Simple hash function to ensure ASCII-only result
		let hash = 0
		for (let i = 0; i < combined.length; i++) {
			const char = combined.charCodeAt(i)
			hash = ((hash << 5) - hash) + char
			hash = hash & hash // Convert to 32bit integer
		}
		return `${method}::${url}::${Math.abs(hash)}`
	} catch {
		return `${method}::${url}::${Date.now()}`
	}
}

const shouldRetry = (error) => {
	const status = Number(error?.response?.status || 0)
	if (!status) return true
	return status >= 500 || status === 429
}

const shouldShowMessage = (message) => {
	const text = String(message || '').trim()
	if (!text) return false
	const now = Date.now()
	const prev = messageThrottleMap.get(text) || 0
	if (now - prev < 2500) {
		return false
	}
	messageThrottleMap.set(text, now)
	return true
}

const setIdempotencyHeader = (config, requestKey) => {
	const method = String(config?.method || '').toUpperCase()
	if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
		return
	}
	const customKey = String(config?.idempotencyKey || '').trim()
	const idempotencyKey = customKey || requestKey
	config.headers = config.headers || {}
	if (!config.headers['X-Idempotency-Key']) {
		config.headers['X-Idempotency-Key'] = idempotencyKey
	}
}

const markApiFailure = (payload) => {
	reportApiFailure(payload)
	try {
		const appStore = useAppStore(pinia)
		appStore.markApiFailure()
	} catch {
		// ignore
	}
}

http.interceptors.request.use((config) => {
	const token = getAuthToken()
	const requestKey = buildRequestKey(config)
	const dedupeEnabled = config?.dedupe !== false

	if (token) {
		config.headers = config.headers || {}
		config.headers.Authorization = `Bearer ${token}`
	}

	if (dedupeEnabled && pendingRequestMap.has(requestKey)) {
		const controller = new AbortController()
		controller.abort('DUPLICATE_REQUEST')
		config.signal = controller.signal
		return config
	}

	pendingRequestMap.set(requestKey, Date.now())
	config.__requestKey = requestKey
	setIdempotencyHeader(config, requestKey)
	config.__retryCount = Number(config.__retryCount || 0)
	config.retry = config.retry == null ? appEnv.requestRetry : Number(config.retry)
	config.retryDelay = config.retryDelay == null ? appEnv.requestRetryDelay : Number(config.retryDelay)

	return config
})

const resolveMessageText = (payload, fallback = '') => {
	if (!payload) return fallback
	if (typeof payload === 'string') return payload
	if (typeof payload?.message === 'string') return payload.message
	if (typeof payload?.msg === 'string') return payload.msg
	if (typeof payload?.error === 'string') return payload.error
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
		if (response?.config?.__requestKey) {
			pendingRequestMap.delete(response.config.__requestKey)
		}
		const code = Number(response?.data?.code)
		const message = resolveMessageText(response?.data, '登录已过期，请重新登录')

		if (code === 401 || code === 403) {
			redirectToLoginByExpired(message)
			return Promise.reject(new Error(message))
		}

		return response
	},
	(error) => {
		const config = error?.config || {}
		if (config.__requestKey) {
			pendingRequestMap.delete(config.__requestKey)
		}

		if (axios.isCancel(error)) {
			return Promise.reject(error)
		}

		const status = error?.response?.status
		const payload = error?.response?.data
		const fallbackMessage = error?.message || '请求失败，请稍后重试'
		const message = resolveMessageText(payload, fallbackMessage)
		const retry = Number(config.retry || 0)
		const retryDelay = Number(config.retryDelay || 0)

		if (shouldRetry(error) && config.__retryCount < retry) {
			config.__retryCount += 1
			const backoff = retryDelay * Math.max(1, 2 ** (config.__retryCount - 1))
			return delay(backoff).then(() => http(config))
		}

		if (message && error && typeof error === 'object') {
			error.message = message
		}

		if (status === 401 || status === 403) {
			redirectToLoginByExpired(message)
		} else if (shouldShowMessage(message)) {
			ElMessage.error(message)
		}

		markApiFailure({
			url: config?.url,
			method: config?.method,
			status,
			message,
		})

		return Promise.reject(error)
	}
)

export default http