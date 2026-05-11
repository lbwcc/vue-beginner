const trimSlash = (value) => String(value || '').trim().replace(/\/+$/, '')

const mode = String(import.meta.env.MODE || '').trim() || 'development'
const isDev = import.meta.env.DEV
const isProd = import.meta.env.PROD

const backendOrigin = trimSlash(import.meta.env.VITE_BACKEND_ORIGIN)

export const appEnv = {
  mode,
  isDev,
  isProd,
  appName: String(import.meta.env.VITE_APP_NAME || 'vue-beginner').trim(),
  backendOrigin,
  apiPrefix: String(import.meta.env.VITE_API_PREFIX || '/lb-api').trim(),
  wsPath: String(import.meta.env.VITE_WS_PATH || '/lb-api/ws').trim(),
  requestTimeout: Number(import.meta.env.VITE_HTTP_TIMEOUT || 30000),
  requestRetry: Number(import.meta.env.VITE_HTTP_RETRY || 1),
  requestRetryDelay: Number(import.meta.env.VITE_HTTP_RETRY_DELAY || 500),
  monitorSampleRate: Number(import.meta.env.VITE_MONITOR_SAMPLE_RATE || 1),
}

export const resolveApiBaseURL = () => {
  if (!appEnv.isProd || !appEnv.backendOrigin) {
    return undefined
  }
  return appEnv.backendOrigin
}

export const resolveWsEndpoint = () => {
  if (appEnv.backendOrigin) {
    return `${appEnv.backendOrigin}${appEnv.wsPath}`
  }
  if (typeof window === 'undefined') {
    return appEnv.wsPath
  }
  return `${window.location.origin}${appEnv.wsPath}`
}
