import http from '@/utils/http'
import { getAuthToken } from '@/utils/auth'

const BASE = '/lb-api'
const HERMES_STREAM_TIMEOUT_MS = 10 * 60 * 1000

// ── 会话 CRUD ─────────────────────────────────────────────

export const listSessions = () =>
  http.get(`${BASE}/api/hermes/sessions`)

export const createSession = (title) =>
  http.post(`${BASE}/api/hermes/sessions`, { title })

export const deleteSession = (id) =>
  http.delete(`${BASE}/api/hermes/sessions/${id}`)

export const getMessages = (sessionId) =>
  http.get(`${BASE}/api/hermes/sessions/${sessionId}/messages`)

// ── SSE 流式对话 ─────────────────────────────────────────

/**
 * 通过 lb-server 代理 Hermes SSE 流式对话
 * @param {Object} options
 * @param {Array}   options.messages    - 消息列表 [{role, content}]
 * @param {number|null} options.sessionId - 会话 ID（可选）
 * @param {Function} options.onMeta     - 收到 meta 事件 {sessionId}
 * @param {Function} options.onText      - 收到 text 片段（字符串）
 * @param {Function} options.onThinking  - 收到 thinking 事件（对象）
 * @param {Function} options.onDone     - 完成
 * @param {Function} options.onError    - 出错
 * @returns {AbortController}
 */
export const hermesStreamChat = ({
  messages,
  sessionId = null,
  onMeta,
  onText,
  onThinking,
  onDone,
  onError,
}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HERMES_STREAM_TIMEOUT_MS)

  const body = {
    messages: messages.filter((m) => m.role && String(m.content || '').trim()),
    stream: true,
  }
  if (sessionId) body.sessionId = sessionId

  fetch(`${BASE}/api/hermes/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      // 带上用户 token
      ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then((resp) => {
      clearTimeout(timeoutId)
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`)
      }
      if (!resp.body) throw new Error('No stream body')

      const reader = resp.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let eventName = null
      let dataBuffer = ''
      let doneEmitted = false

      const read = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            if (!doneEmitted && onDone) onDone()
            return
          }

          const chunk = decoder.decode(value, { stream: true })
          const parts = (dataBuffer + chunk).split('\n')
          dataBuffer = parts.pop() || ''

          for (let i = 0; i < parts.length; i++) {
            const line = parts[i].replace(/\r$/, '')

            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim()
              continue
            }

            if (line.startsWith('data:')) {
              // 可能多行 data
              let dataVal = line.slice(5)
              // 如果下一行不是 event: 或 data: 且不是空行，继续拼接
              while (i + 1 < parts.length && !parts[i + 1].startsWith('event:') && !parts[i + 1].startsWith('data:') && parts[i + 1] !== '') {
                i++
                dataVal += '\n' + parts[i]
              }
              dataVal = dataVal.trim()

              // done 事件可能只有空 data，此时也需要结束
              if (eventName === 'done') {
                if (!doneEmitted && onDone) onDone()
                doneEmitted = true
                eventName = null
                continue
              }

              if (!dataVal || dataVal === '[DONE]') continue

              try {
                const payload = JSON.parse(dataVal)

                if (eventName === 'meta' && onMeta) {
                  console.debug('[SSE] meta event received:', payload)
                  onMeta(payload)
                } else if (eventName === 'text' && onText) {
                  console.debug('[SSE] text event received:', payload)
                  onText(typeof payload === 'string' ? payload : JSON.stringify(payload))
                } else if (eventName === 'thinking' && onThinking) {
                  console.debug('[SSE] thinking event received:', payload)
                  onThinking(payload)
                } else if (eventName === 'done' && onDone) {
                  console.debug('[SSE] done event received')
                  if (!doneEmitted) onDone()
                  doneEmitted = true
                } else if (eventName === 'error' && onError) {
                  console.error('[SSE] error event received:', payload)
                  onError(new Error(String(payload)))
                }
              } catch (e) {
                // JSON 解析失败，当作纯文本处理
                if (eventName === 'text' && onText) onText(dataVal)
              }
              eventName = null
              continue
            }

            if (line === '') {
              // 空行 = 事件结束
              eventName = null
            }
          }

          read()
        }).catch(onError)
      }

      read()
    })
    .catch((err) => {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        if (onError) onError(new Error('请求超时'))
      } else if (onError) {
        onError(err)
      }
    })

  return controller
}
