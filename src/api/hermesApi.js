import axios from 'axios'

const HERMES_CHAT_URL = String(
  import.meta.env.VITE_HERMES_CHAT_URL || 'http://localhost:8642/v1/chat/completions'
).trim()

const HERMES_API_KEY = String(
  import.meta.env.VITE_HERMES_API_KEY || 'hermes-api-key-2026'
).trim()


const hermesClient = axios.create({
  timeout: 300000, // 5分钟
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${HERMES_API_KEY}`,
  },
})


// 支持流式和普通模式
export const hermesChatCompletion = async ({
  messages,
  model = 'hermes',
  temperature = 0.7,
  max_tokens = 1024,
  stream = false,
  onMessageChunk,
}) => {
  const normalizedMessages = Array.isArray(messages)
    ? messages.filter((item) => {
      const role = String(item?.role || '').trim()
      const content = String(item?.content || '').trim()
      return role && content
    })
    : []

  if (!normalizedMessages.some((item) => item.role === 'user')) {
    throw new Error('messages 中缺少 user 角色消息')
  }

  if (!stream) {
    // 普通模式
    return hermesClient.post(HERMES_CHAT_URL, {
      model,
      messages: normalizedMessages,
      temperature,
      max_tokens,
      stream,
    })
  }
  // 流式模式
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 300000)
  const resp = await fetch(HERMES_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${HERMES_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: normalizedMessages,
      temperature,
      max_tokens,
      stream: true,
    }),
    signal: controller.signal,
  })
  clearTimeout(timeoutId)
  if (!resp.ok) {
    let message = `Hermes 请求失败（${resp.status}）`
    try {
      const errorPayload = await resp.json()
      message = errorPayload?.error?.message || errorPayload?.message || message
    } catch {
      try {
        const text = await resp.text()
        if (text) message = text
      } catch {
        // ignore
      }
    }
    throw new Error(message)
  }
  if (!resp.body) throw new Error('Hermes 未返回流式响应')
  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let done = false
  let full = ''
  while (!done) {
    const { value, done: doneReading } = await reader.read()
    done = doneReading
    if (value) {
      const chunk = decoder.decode(value)
      full += chunk
      if (onMessageChunk) onMessageChunk(chunk, full)
    }
  }
  return { data: full }
}
