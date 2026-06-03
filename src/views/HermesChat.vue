<template>
  <AppShell
    title="Hermes 对话"
    eyebrow="AI 助手"
    subtitle="通过 lb-server 代理的 Hermes 流式对话，支持会话管理。"
    active-section="tools"
  >
    <template #header-actions>
      <el-button class="ghost-btn" type="button" @click="clearCurrentChat">清空当前</el-button>
    </template>

    <div class="hermes-layout" v-reveal="{ y: 12, duration: 0.36 }">
      <!-- 左侧：会话列表 -->
      <aside class="session-sidebar" v-reveal="{ y: 14, duration: 0.4, delay: 0.04 }">
        <div class="sidebar-header">
          <el-button class="new-chat-btn" type="primary" @click="handleNewSession">
            + 新会话
          </el-button>
        </div>

        <div class="session-list" v-reveal="{ y: 12, duration: 0.34, delay: 0.08 }">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="session-item"
            :class="{ active: currentSessionId === s.id }"
            v-reveal="{ y: 10, duration: 0.3, scroll: true, start: 'top 95%' }"
            @click="switchSession(s)"
          >
            <span class="session-title">{{ s.title || '新对话' }}</span>
            <el-icon
              class="delete-icon"
              @click.stop="handleDeleteSession(s)"
            >
              <Delete />
            </el-icon>
          </div>

          <div v-if="sessions.length === 0" class="empty-sessions">
            暂无会话
          </div>
        </div>
      </aside>

      <!-- 右侧：对话区域 -->
      <main class="chat-main" v-reveal="{ y: 14, duration: 0.42, delay: 0.06 }">
        <div ref="messageListRef" class="message-list" v-reveal="{ y: 12, duration: 0.34, delay: 0.1 }">
          <!-- 系统提示 -->
          <div v-if="displayMessages.length === 0" class="empty-tip">
            你好，我是 Hermes。开始新对话吧！
          </div>

          <!-- 消息列表 -->
          <template v-for="item in displayMessages" :key="item.id">
            <!-- 用户消息 -->
            <div v-if="item.role === 'user'" class="message-row is-user" v-reveal="{ y: 10, duration: 0.26, scroll: true, start: 'top 96%' }">
              <div class="bubble user-bubble">{{ item.content }}</div>
            </div>

            <!-- AI 回复 -->
            <div v-else-if="item.role === 'assistant'" class="message-row is-assistant" v-reveal="{ y: 10, duration: 0.26, scroll: true, start: 'top 96%' }">
              <div class="bubble ai-bubble">
                <!-- 思考过程 -->
                <template v-if="item.thinking && item.thinking.length > 0">
                  <div class="thinking-section" @click="item.thinkingExpanded = !item.thinkingExpanded">
                    <span class="thinking-toggle">
                      {{ item.thinkingExpanded ? '▼' : '▶' }}
                      工具调用 ({{ item.thinking.length }})
                    </span>
                    <div v-if="item.thinkingExpanded" class="thinking-details">
                      <div
                        v-for="(th, idx) in item.thinking"
                        :key="idx"
                        class="thinking-item"
                        :class="th.type"
                      >
                        <span class="thinking-label">{{ getThinkingLabel(th) }}</span>
                        <span class="thinking-content">{{ getThinkingContent(th) }}</span>
                      </div>
                    </div>
                  </div>
                </template>
                <!-- AI 回复内容 -->
                <div class="ai-text" v-html="renderMarkdown(item.content || '')" />
              </div>
            </div>
          </template>

          <!-- 加载中 -->
          <div v-if="loading" class="message-row is-assistant">
            <div class="bubble ai-bubble">
              <template v-if="currentThinking">
                <div class="thinking-section inline-thinking">
                  <span class="thinking-label">{{ getThinkingLabel(currentThinking) }}</span>
                  <span class="thinking-content">{{ getThinkingContent(currentThinking) }}</span>
                </div>
              </template>
              <span v-else class="loading-dots">Hermes 正在思考<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>
            </div>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="composer" v-reveal="{ y: 10, duration: 0.28, delay: 0.12 }">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="3"
            resize="none"
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            :disabled="loading"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <div class="composer-actions">
            <el-button
              class="primary-btn"
              type="primary"
              :loading="loading"
              :disabled="!inputText.trim()"
              @click="sendMessage"
            >
              发送
            </el-button>
          </div>
        </div>
      </main>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import AppShell from '@/components/AppShell.vue'
import { hermesStreamChat, listSessions, createSession, deleteSession, getMessages } from '@/api/hermesServerApi'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// ── 状态 ─────────────────────────────────────────────
const loading = ref(false)
const inputText = ref('')
const messageListRef = ref(null)

const sessions = ref([])          // {id, title, createTime, updateTime}
const currentSessionId = ref(null)
const currentThinking = ref(null) // 当前思考过程

// 消息列表（含特殊字段用于渲染）
const messages = ref([])

// ── 计算属性 ─────────────────────────────────────────
const displayMessages = computed(() =>
  messages.value.filter((m) => m.role !== 'system')
)

// ── 生命周期 ─────────────────────────────────────────
onMounted(() => {
  loadSessions()
})

// ── 会话管理 ─────────────────────────────────────────
const loadSessions = async () => {
  try {
    const resp = await listSessions()
    sessions.value = resp.data.data || []
  } catch (e) {
    console.warn('加载会话列表失败:', e)
  }
}

const handleNewSession = async () => {
  try {
    const resp = await createSession('新对话')
    const newSession = resp.data.data
    sessions.value.unshift(newSession)
    switchSession(newSession)
  } catch (e) {
    ElMessage.error('创建会话失败')
  }
}

const switchSession = async (session) => {
  currentSessionId.value = session.id
  messages.value = []
  currentThinking.value = null

  try {
    const resp = await getMessages(session.id)
    messages.value = (resp.data.data || []).map((m) => ({
      ...m,
      thinkingExpanded: false,
      thinking: [],
    }))
  } catch (e) {
    console.warn('加载消息失败:', e)
  }

  scrollToBottom()
}

const handleDeleteSession = async (session) => {
  try {
    await ElMessageBox.confirm(`确定删除会话「${session.title}」？`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deleteSession(session.id)
    sessions.value = sessions.value.filter((s) => s.id !== session.id)
    if (currentSessionId.value === session.id) {
      currentSessionId.value = null
      messages.value = []
    }
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

const clearCurrentChat = () => {
  messages.value = []
  currentThinking.value = null
  scrollToBottom()
}

const updateMessageById = (messageId, updater) => {
  const index = messages.value.findIndex((message) => message.id === messageId)
  if (index === -1) return null

  const currentMessage = messages.value[index]
  const nextMessage = typeof updater === 'function'
    ? updater(currentMessage)
    : { ...currentMessage, ...updater }

  messages.value.splice(index, 1, nextMessage)
  return messages.value[index]
}

const appendThinkingEntry = (messageId, entry) => {
  const updatedMessage = updateMessageById(messageId, (message) => ({
    ...message,
    thinkingExpanded: true,
    thinking: [...(message.thinking || []), entry],
  }))

  if (!updatedMessage?.thinking?.length) return null
  return updatedMessage.thinking[updatedMessage.thinking.length - 1]
}

// ── 发送消息 ─────────────────────────────────────────
let abortController = null

const sendMessage = async () => {
  const content = inputText.value.trim()
  if (!content || loading.value) return

  inputText.value = ''
  loading.value = true
  currentThinking.value = null

  // 构建历史消息
  const historyMessages = messages.value
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map(({ role, content }) => ({ role, content }))

  // 添加新用户消息
  const userMsg = {
    id: Date.now(),
    role: 'user',
    content,
    thinking: [],
    thinkingExpanded: false,
  }
  messages.value.push(userMsg)

  // 创建空的 assistant 消息占位
  const assistantMessageId = Date.now() + 1
  const assistantMsg = {
    id: assistantMessageId,
    role: 'assistant',
    content: '',
    thinking: [],
    thinkingExpanded: true,
  }
  messages.value.push(assistantMsg)
  scrollToBottom()

  let fullText = ''
  let currentToolName = null

  abortController = hermesStreamChat({
    messages: [...historyMessages, { role: 'user', content }],
    sessionId: currentSessionId.value,
    onMeta: (payload) => {
      // 新的 sessionId
      if (!currentSessionId.value && payload.sessionId) {
        currentSessionId.value = payload.sessionId
        // 更新会话列表标题
        loadSessions()
      }
    },
    onText: (text) => {
      fullText += text
      updateMessageById(assistantMessageId, (message) => ({
        ...message,
        content: fullText,
      }))
      scrollToBottom()
    },
    onThinking: (payload) => {
      if (payload.type === 'tool_call') {
        currentToolName = payload.tool
        currentThinking.value = appendThinkingEntry(assistantMessageId, {
          type: 'tool_call',
          tool: payload.tool,
          content: '',
        })
      } else if (payload.type === 'tool_result') {
        currentThinking.value = appendThinkingEntry(assistantMessageId, {
          type: 'tool_result',
          tool: payload.tool || currentToolName,
          content: payload.content || '',
        })
      } else if (payload.type === 'tool_done') {
        currentToolName = null
        currentThinking.value = null
      }
    },
    onDone: () => {
      loading.value = false
      currentThinking.value = null
      scrollToBottom()
    },
    onError: (err) => {
      loading.value = false
      currentThinking.value = null
      updateMessageById(assistantMessageId, (message) => ({
        ...message,
        content: `错误: ${err.message}`,
      }))
      ElMessage.error(err.message || '请求失败')
    },
  })
}

// ── 工具方法 ─────────────────────────────────────────
const scrollToBottom = () => {
  nextTick(() => {
    const el = messageListRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

const getThinkingLabel = (th) => {
  if (th.type === 'tool_call') return `🔧 ${th.tool || '工具'}`
  if (th.type === 'tool_result') return `📥 结果`
  return th.type || ''
}

const getThinkingContent = (th) => {
  if (th.type === 'tool_call') return '调用中...'
  if (th.type === 'tool_result') {
    const c = th.content || ''
    return c.length > 200 ? c.slice(0, 200) + '...' : c
  }
  return th.content || ''
}

// Markdown 渲染（安全过滤）
const renderMarkdown = (text) => {
  try {
    const html = marked.parse(text || '', {
      gfm: true,
      breaks: true,
    })
    return DOMPurify.sanitize(html)
  } catch {
    return text
  }
}
</script>

<style scoped>
.hermes-layout {
  display: flex;
  gap: 0;
  height: calc(100vh - 160px);
  min-height: 500px;
}

/* ── 左侧会话列表 ─────────────────────────────────────── */
.session-sidebar {
  width: 220px;
  min-width: 180px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.new-chat-btn {
  width: 100%;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.15s;
}

.session-item:hover {
  background: #eee;
}

.session-item.active {
  background: #e3f2fd;
}

.session-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.delete-icon {
  opacity: 0;
  font-size: 14px;
  color: #999;
  cursor: pointer;
  transition: opacity 0.15s;
}

.session-item:hover .delete-icon {
  opacity: 1;
}

.delete-icon:hover {
  color: #f56c6c;
}

.empty-sessions {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px 0;
}

/* ── 右侧对话区域 ─────────────────────────────────────── */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 14px;
  min-width: 0;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  background: #f5f5f7;
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 12px;
}

.empty-tip {
  color: #6e6e73;
  text-align: center;
  margin-top: 30px;
  font-size: 14px;
}

.message-row {
  display: flex;
  margin: 10px 0;
}

.message-row.is-user {
  justify-content: flex-end;
}

.message-row.is-assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: min(760px, 88%);
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.user-bubble {
  background: #0066cc;
  color: #fff;
}

.ai-bubble {
  background: #fff;
  color: #1d1d1f;
  border: 1px solid #e0e0e0;
}

/* ── 思考过程 ───────────────────────────────────────── */
.thinking-section {
  border: 1px solid #e8f4fd;
  border-radius: 8px;
  background: #f0f9ff;
  margin-bottom: 8px;
  font-size: 13px;
}

.thinking-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 10px;
  color: #0369a1;
  font-weight: 500;
}

.thinking-details {
  padding: 6px 10px 8px;
  border-top: 1px solid #e0f2fe;
}

.thinking-item {
  padding: 4px 0;
  border-bottom: 1px dashed #e0f2fe;
}

.thinking-item:last-child {
  border-bottom: none;
}

.thinking-label {
  font-weight: 500;
  color: #0369a1;
  margin-right: 6px;
}

.thinking-content {
  color: #64748b;
  font-size: 12px;
}

.thinking-section.inline-thinking {
  background: #fffbeb;
  border-color: #fef3c7;
  margin-bottom: 6px;
}

.ai-text :deep(p) {
  margin: 0 0 8px;
}

.ai-text :deep(p:last-child) {
  margin-bottom: 0;
}

.ai-text :deep(h1),
.ai-text :deep(h2),
.ai-text :deep(h3),
.ai-text :deep(h4) {
  margin: 10px 0 8px;
  line-height: 1.35;
}

.ai-text :deep(ul),
.ai-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.ai-text :deep(li) {
  margin: 4px 0;
}

.ai-text :deep(blockquote) {
  margin: 8px 0;
  padding: 6px 10px;
  border-left: 3px solid #93c5fd;
  background: #f8fafc;
  color: #334155;
}

.ai-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
}

.ai-text :deep(th),
.ai-text :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 6px 8px;
  text-align: left;
}

.ai-text :deep(th) {
  background: #f8fafc;
}

.ai-text :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.ai-text :deep(code) {
  background: #f1f5f9;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 13px;
}

.ai-text :deep(pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.ai-text :deep(pre code) {
  background: none;
  padding: 0;
}

/* ── 加载动画 ───────────────────────────────────────── */
.loading-dots {
  color: #6e6e73;
}

.loading-dots .dot {
  animation: blink 1.2s infinite;
}

.loading-dots .dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dots .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}

/* ── 输入区 ───────────────────────────────────────── */
.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
}

.primary-btn {
  min-width: 80px;
}

/* ── 响应式 ───────────────────────────────────────── */
@media (max-width: 768px) {
  .hermes-layout {
    flex-direction: column;
    height: auto;
  }

  .session-sidebar {
    width: 100%;
    min-width: unset;
    height: auto;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }

  .message-list {
    min-height: 50vh;
    max-height: 60vh;
  }
}
</style>
