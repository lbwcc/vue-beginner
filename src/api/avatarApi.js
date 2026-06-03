import http from '@/utils/http'

const BASE = '/lb-api/api/forum/bot/agent'
const BOT_BASE = '/lb-api/api/forum/bot'

// ── 当前用户的分身信息 ──────────────────────────────────────────────────────

/** 获取当前用户的分身（不存在则后端自动创建） */
export function getMyPersona() {
  return http.get(`${BOT_BASE}/my-persona`)
}

// ── 会话管理 ──────────────────────────────────────────────────────────────── 

/** 创建新会话 */
export function createSession(title = '新对话') {
  return http.post(`${BASE}/sessions`, { title })
}

/** 列出当前用户的所有活跃会话 */
export function listSessions() {
  return http.get(`${BASE}/sessions`)
}

/** 归档（软删）会话 */
export function archiveSession(sessionId) {
  return http.delete(`${BASE}/sessions/${sessionId}`)
}

/** 获取会话消息历史 */
export function getSessionMessages(sessionId) {
  return http.get(`${BASE}/sessions/${sessionId}/messages`)
}

// ── 长期记忆 ─────────────────────────────────────────────────────────────────

/** 分页获取记忆列表 */
export function listMemories(page = 1, size = 20) {
  return http.get(`${BASE}/memories`, { params: { page, size } })
}

/** 手动添加一条记忆 */
export function addMemory(content, importance = 5) {
  return http.post(`${BASE}/memories`, { content, importance })
}

/** 删除一条记忆 */
export function deleteMemory(id) {
  return http.delete(`${BASE}/memories/${id}`)
}

/** 导出记忆（触发文件下载） */
export function exportMemories() {
  return `${BASE}/memories/export`
}

/** 导入记忆（FormData with file） */
export function importMemories(file) {
  const form = new FormData()
  form.append('file', file)
  return http.post(`${BASE}/memories/import`, form, { 
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ── AI 代理聊天 ─────────────────────────────────────────────────────────────────

/** 向 AI 分身发送消息并获取回复 */
export function agentChat(message, sessionId = null) {
  const payload = { message }
  if (sessionId) {
    return http.post(`${BASE}/sessions/${sessionId}/chat`, payload)
  }
  return http.post(`${BASE}/chat`, payload)
}
