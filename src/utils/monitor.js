import { appEnv } from '@/config/env'

const listeners = {
  apiFailure: [],
}

const shouldSample = () => {
  const rate = Number(appEnv.monitorSampleRate)
  if (!Number.isFinite(rate) || rate >= 1) return true
  if (rate <= 0) return false
  return Math.random() <= rate
}

const emit = (type, payload) => {
  const queue = listeners[type] || []
  queue.forEach((handler) => {
    try {
      handler(payload)
    } catch {
      // ignore
    }
  })
}

const report = (type, payload = {}) => {
  if (!shouldSample()) return
  const event = {
    type,
    payload,
    mode: appEnv.mode,
    page: typeof window !== 'undefined' ? window.location.href : '',
    ts: Date.now(),
  }
  if (appEnv.isDev) {
    console.warn('[monitor:event]', event)
  }
}

export const onApiFailure = (handler) => {
  listeners.apiFailure.push(handler)
  return () => {
    const index = listeners.apiFailure.indexOf(handler)
    if (index >= 0) {
      listeners.apiFailure.splice(index, 1)
    }
  }
}

export const reportApiFailure = (payload) => {
  report('api_failure', payload)
  emit('apiFailure', payload)
}

export const initAppMonitor = () => {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    report('runtime_error', {
      message: event?.message,
      source: event?.filename,
      line: event?.lineno,
      column: event?.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason
    report('promise_rejection', {
      message: reason?.message || String(reason || 'Unknown rejection'),
    })
  })

  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            report('performance_lcp', { value: entry.startTime })
          }
          if (entry.entryType === 'layout-shift' && entry.value) {
            report('performance_cls', { value: entry.value })
          }
        })
      })
      observer.observe({ type: 'largest-contentful-paint', buffered: true })
      observer.observe({ type: 'layout-shift', buffered: true })
    } catch {
      // ignore unsupported browser fallback
    }
  }
}
