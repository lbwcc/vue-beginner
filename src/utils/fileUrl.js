import { appEnv } from '@/config/env'

const API_PROXY_PREFIX = '/lb-api'
const ABSOLUTE_URL_RE = /^(https?:)?\/\//i
const SPECIAL_URL_RE = /^(blob:|data:)/i
const backendOrigin = appEnv.backendOrigin
const useBackendOrigin = appEnv.isProd && backendOrigin

const withBackendOrigin = (path) => {
  if (!useBackendOrigin) {
    return path
  }
  return `${backendOrigin}${path}`
}

export const normalizeFileUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) {
    return ''
  }

  if (SPECIAL_URL_RE.test(raw) || ABSOLUTE_URL_RE.test(raw)) {
    return raw
  }

  if (raw === API_PROXY_PREFIX || raw.startsWith(`${API_PROXY_PREFIX}/`)) {
    return withBackendOrigin(raw)
  }

  if (raw.startsWith('/')) {
    return withBackendOrigin(`${API_PROXY_PREFIX}${raw}`)
  }

  const cleaned = raw.replace(/^\.?\//, '')
  if (cleaned === 'lb-api' || cleaned.startsWith('lb-api/')) {
    return withBackendOrigin(`/${cleaned}`)
  }
  return withBackendOrigin(`${API_PROXY_PREFIX}/${cleaned}`)
}
