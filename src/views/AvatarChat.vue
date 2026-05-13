<template>
  <div class="avatar-chat-page">
    <!-- 左侧：会话列表 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">我的AI分身</span>
        <div style="display:flex;gap:6px">
          <el-tooltip content="记忆库" placement="bottom">
            <el-button size="small" :icon="Memo" @click="openMemoryDrawer" />
          </el-tooltip>
          <el-button size="small" type="primary" :icon="Plus" @click="newChat">新对话</el-button>
        </div>
      </div>

      <!-- 会话列表 -->
      <div class="session-list">
        <div
          v-for="s in sessions"
          :key="s.id"
          :class="['session-item', { active: s.id === currentSessionId }]"
          @click="openSession(s)"
        >
          <el-icon class="session-icon"><ChatDotRound /></el-icon>
          <span class="session-title">{{ s.title }}</span>
          <el-icon
            class="session-del"
            @click.stop="deleteSession(s.id)"
          ><Delete /></el-icon>
        </div>
        <div v-if="!sessions.length" class="empty-sessions">暂无会话，点击「新对话」开始</div>
      </div>
    </aside>

    <!-- 右侧：对话区域 -->
    <main class="chat-area">
      <!-- 顶部栏 -->
      <div class="chat-header">
        <span class="chat-persona-name">{{ personaName }}</span>
        <span v-if="currentSession" class="chat-session-title">· {{ currentSession.title }}</span>
      </div>

      <!-- 消息列表 -->
      <div ref="msgListRef" class="msg-list">
        <div v-if="!messages.length && !loading" class="chat-welcome">
          <el-icon class="welcome-icon"><Cpu /></el-icon>
          <p>你好！我是「{{ personaName }}」，有什么我能帮你的吗？</p>
          <p class="welcome-hint">我可以搜索社区帖子、查询用户资料，并基于人设回答你的问题。</p>
        </div>

        <template v-for="msg in messages" :key="msg.id">
          <!-- 工具调用提示（折叠） -->
          <div
            v-if="msg.role === 'tool'"
            class="msg-tool"
          >
            <el-icon><Tools /></el-icon>
            <span class="tool-label">工具结果</span>
            <el-collapse-transition>
              <pre v-show="msg._expanded" class="tool-content">{{ msg.content }}</pre>
            </el-collapse-transition>
            <span class="tool-toggle" @click="msg._expanded = !msg._expanded">
              {{ msg._expanded ? '收起' : '展开' }}
            </span>
          </div>

          <!-- 用户消息 -->
          <div v-else-if="msg.role === 'user'" class="msg-row msg-user">
            <div class="bubble bubble-user">{{ msg.content }}</div>
            <el-avatar class="avatar-icon" :size="32">我</el-avatar>
          </div>

          <!-- 分身消息 -->
          <div v-else-if="msg.role === 'assistant'" class="msg-row msg-bot">
            <el-avatar class="avatar-icon" :size="32" :style="{ background: '#6366f1' }">
              {{ personaName?.[0] || 'AI' }}
            </el-avatar>
            <div class="bubble bubble-bot">
              <div class="markdown-body" v-html="renderMarkdown(msg.content)" />
              <!-- 工具调用摘要标签 -->
              <div v-if="msg._toolCallsSummary?.length" class="tool-summary-tags">
                <el-tag
                  v-for="(t, i) in msg._toolCallsSummary"
                  :key="i"
                  size="small"
                  type="info"
                  class="tool-tag"
                >{{ t }}</el-tag>
              </div>
            </div>
          </div>
        </template>

        <!-- 加载中 -->
        <div v-if="chatLoading" class="msg-row msg-bot">
          <el-avatar :size="32" :style="{ background: '#6366f1' }">
            {{ personaName?.[0] || 'AI' }}
          </el-avatar>
          <div class="bubble bubble-bot bubble-typing">
            <span class="dot" /><span class="dot" /><span class="dot" />
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="3"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          :disabled="chatLoading"
          @keydown.enter.exact.prevent="sendMessage"
          resize="none"
          class="msg-input"
        />
        <el-button
          type="primary"
          :loading="chatLoading"
          :disabled="!inputText.trim()"
          @click="sendMessage"
          class="send-btn"
        >
          <el-icon><Promotion /></el-icon>
          发送
        </el-button>
      </div>
    </main>

    <!-- ── 记忆库抽屉 ─────────────────────────────────────── -->
    <el-drawer
      v-model="memoryDrawerVisible"
      title="长期记忆库"
      direction="rtl"
      size="420px"
      destroy-on-close
    >
      <div class="memory-panel">
        <!-- 工具栏 -->
        <div class="memory-toolbar">
          <el-button size="small" type="success" :icon="Download" @click="doExport">
            导出
          </el-button>
          <el-upload
            :show-file-list="false"
            accept=".json"
            :before-upload="doImport"
          >
            <el-button size="small" type="warning" :icon="Upload">导入</el-button>
          </el-upload>
          <el-button size="small" type="primary" :icon="EditPen" @click="memAddVisible = true">
            手动添加
          </el-button>
        </div>

        <!-- 手动添加表单 -->
        <div v-if="memAddVisible" class="memory-add-form">
          <el-input
            v-model="memAddContent"
            type="textarea"
            :rows="3"
            placeholder="输入要记住的内容…"
          />
          <div style="display:flex;gap:8px;margin-top:8px">
            <el-button type="primary" size="small" @click="submitAddMemory">保存</el-button>
            <el-button size="small" @click="memAddVisible = false; memAddContent = ''">取消</el-button>
          </div>
        </div>

        <!-- 记忆列表 -->
        <div v-loading="memLoading" class="memory-list">
          <div v-if="!memories.length && !memLoading" class="memory-empty">
            暂无记忆，对话、发帖、回复评论后会自动积累
          </div>
          <div v-for="m in memories" :key="m.id" class="memory-item">
            <div class="memory-item-header">
              <el-tag :type="memTypeTag(m.memoryType)" size="small">{{ memTypeLabel(m.memoryType) }}</el-tag>
              <span class="memory-time">{{ formatDate(m.createTime) }}</span>
              <el-icon class="memory-del" @click="doDeleteMemory(m.id)"><Delete /></el-icon>
            </div>
            <div class="memory-content">{{ m.content }}</div>
          </div>
          <!-- 加载更多 -->
          <div v-if="memHasMore" class="memory-more">
            <el-button size="small" text @click="loadMoreMemories">加载更多</el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, ChatDotRound, Cpu, Tools, Promotion, Download, Upload, EditPen, Memo } from '@element-plus/icons-vue'
import {
  agentChat,
  listSessions,
  archiveSession,
  getSessionMessages,
  getMyPersona,
  listMemories,
  addMemory,
  deleteMemory,
  exportMemories,
  importMemories
} from '@/api/avatarApi'

// ── 响应式状态 ───────────────────────────────────────────────────────────────

const personaName = ref('我的AI分身')
const sessions = ref([])
const currentSessionId = ref(null)
const messages = ref([])
const inputText = ref('')
const chatLoading = ref(false)
const loading = ref(false)
const msgListRef = ref(null)

// ── 记忆库 ────────────────────────────────────────────────────────────────────
const memoryDrawerVisible = ref(false)
const memLoading = ref(false)
const memories = ref([])
const memPage = ref(1)
const memHasMore = ref(false)
const memAddVisible = ref(false)
const memAddContent = ref('')

// ── 计算属性 ─────────────────────────────────────────────────────────────────

const currentSession = computed(() =>
  sessions.value.find(s => s.id === currentSessionId.value) || null
)

// ── 生命周期 ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadPersonaInfo()
  await loadSessions()
})

// ── 方法 ─────────────────────────────────────────────────────────────────────

async function loadPersonaInfo() {
  try {
    const res = await getMyPersona()
    if (res.data?.code === 200 && res.data.data?.name) {
      personaName.value = res.data.data.name
    }
  } catch {
    // ignore, fallback name is fine
  }
}

async function loadSessions() {
  try {
    const res = await listSessions()
    if (res.data?.code === 200) {
      sessions.value = res.data.data || []
    }
  } catch {
    // ignore
  }
}

async function openSession(session) {
  currentSessionId.value = session.id
  messages.value = []
  try {
    loading.value = true
    const res = await getSessionMessages(session.id)
    if (res.data?.code === 200) {
      const raw = res.data.data || []
      // 过滤 assistant 的 tool_calls 中间消息（只保留 user/assistant 文本和 tool 结果）
      messages.value = raw
        .filter(m => m.role !== 'assistant' || m.content)
        .map(m => ({ ...m, _expanded: false }))
    }
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

function newChat() {
  currentSessionId.value = null
  messages.value = []
  inputText.value = ''
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || chatLoading.value) return

  // 乐观更新 UI
  const userMsg = { id: Date.now(), role: 'user', content: text }
  messages.value.push(userMsg)
  inputText.value = ''
  chatLoading.value = true
  scrollToBottom()

  try {
    const res = await agentChat(text, currentSessionId.value)
    if (res.data?.code === 200) {
      const data = res.data.data
      // 如果是新会话，更新 sessionId 并刷新列表
      if (!currentSessionId.value) {
        currentSessionId.value = data.sessionId
        await loadSessions()
      }
      messages.value.push({
        id: Date.now() + 1,
        role: 'assistant',
        content: data.content,
        _toolCallsSummary: data.toolCallsSummary || []
      })
    } else {
      ElMessage.error(res.data?.message || 'AI 响应失败')
    }
  } catch (e) {
    ElMessage.error('请求失败，请检查网络或 AI 配置')
    messages.value.pop() // 回滚乐观更新
    inputText.value = text
  } finally {
    chatLoading.value = false
    scrollToBottom()
  }
}

async function deleteSession(sessionId) {
  try {
    await ElMessageBox.confirm('确认归档该会话？', '提示', { type: 'warning' })
    await archiveSession(sessionId)
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null
      messages.value = []
    }
    await loadSessions()
  } catch {
    // user cancelled
  }
}

function scrollToBottom() {
  nextTick(() => {
    const el = msgListRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

/** 简易 Markdown 渲染（仅转义 + 换行） */
function renderMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

// ── 记忆库方法 ──────────────────────────────────────────────────────────────

async function openMemoryDrawer() {
  memoryDrawerVisible.value = true
  memories.value = []
  memPage.value = 1
  await loadMemories()
}

async function loadMemories() {
  memLoading.value = true
  try {
    const res = await listMemories(memPage.value, 20)
    if (res.data?.code === 200) {
      const { list, total } = res.data.data
      memories.value = [...memories.value, ...(list || [])]
      memHasMore.value = memories.value.length < total
    }
  } finally {
    memLoading.value = false
  }
}

async function loadMoreMemories() {
  memPage.value++
  await loadMemories()
}

async function submitAddMemory() {
  const content = memAddContent.value.trim()
  if (!content) return
  try {
    await addMemory(content, 7)
    ElMessage.success('记忆已保存')
    memAddContent.value = ''
    memAddVisible.value = false
    memories.value = []
    memPage.value = 1
    await loadMemories()
  } catch {
    ElMessage.error('保存失败')
  }
}

async function doDeleteMemory(id) {
  try {
    await ElMessageBox.confirm('确认删除该条记忆？', '提示', { type: 'warning' })
    await deleteMemory(id)
    memories.value = memories.value.filter(m => m.id !== id)
    ElMessage.success('已删除')
  } catch {
    // user cancelled
  }
}

function doExport() {
  const url = exportMemories()
  window.open('/lb-api' + url.replace('/lb-api', ''), '_blank')
}

async function doImport(file) {
  try {
    const res = await importMemories(file)
    if (res.data?.code === 200) {
      const { imported, total } = res.data.data
      ElMessage.success(`导入成功：${imported}/${total} 条`)
      memories.value = []
      memPage.value = 1
      await loadMemories()
    } else {
      ElMessage.error(res.data?.message || '导入失败')
    }
  } catch {
    ElMessage.error('导入失败')
  }
  return false  // 阻止 el-upload 自动上传
}

function memTypeLabel(type) {
  return { chat: '对话', post: '发帖', reply: '回复', manual: '备注' }[type] || type
}

function memTypeTag(type) {
  return { chat: 'primary', post: 'success', reply: 'warning', manual: 'info' }[type] || ''
}

function formatDate(dt) {
  if (!dt) return ''
  return String(dt).replace('T', ' ').substring(0, 16)
}
</script>

<style scoped>
.avatar-chat-page {
  display: flex;
  height: calc(100vh - 60px);
  background: var(--el-bg-color-page, #f5f7fa);
  overflow: hidden;
}

/* ── 侧边栏 ── */
.sidebar {
  width: 240px;
  min-width: 200px;
  background: var(--el-bg-color, #fff);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.sidebar-title {
  font-weight: 600;
  font-size: 14px;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  cursor: pointer;
  border-radius: 6px;
  margin: 2px 6px;
  transition: background 0.15s;
  position: relative;
}

.session-item:hover {
  background: var(--el-fill-color-light);
}

.session-item.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.session-title {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
}

.session-del {
  opacity: 0;
  color: var(--el-text-color-secondary);
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.session-item:hover .session-del {
  opacity: 1;
}

.empty-sessions {
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  padding: 20px 10px;
}

/* ── 主对话区 ── */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  padding: 12px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color, #fff);
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.chat-session-title {
  font-weight: 400;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* ── 消息列表 ── */
.msg-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto;
  color: var(--el-text-color-secondary);
  text-align: center;
  gap: 6px;
}

.welcome-icon {
  font-size: 40px;
  color: var(--el-color-primary);
  margin-bottom: 8px;
}

.welcome-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 80%;
}

.msg-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.msg-bot {
  align-self: flex-start;
}

.avatar-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  max-width: 100%;
}

.bubble-user {
  background: var(--el-color-primary);
  color: #fff;
  border-top-right-radius: 4px;
}

.bubble-bot {
  background: var(--el-bg-color, #fff);
  border: 1px solid var(--el-border-color-light);
  border-top-left-radius: 4px;
}

/* 打字动画 */
.bubble-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-color-primary);
  animation: blink 1.2s infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

/* 工具调用结果折叠 */
.msg-tool {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 4px 8px;
  background: var(--el-fill-color-extra-light);
  border-radius: 6px;
  align-self: flex-start;
  max-width: 80%;
}

.tool-content {
  background: var(--el-fill-color);
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  white-space: pre-wrap;
  margin-top: 4px;
}

.tool-toggle {
  cursor: pointer;
  color: var(--el-color-primary);
  text-decoration: underline;
}

.tool-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.tool-tag {
  font-size: 11px;
}

/* Inline code */
.markdown-body :deep(code) {
  background: var(--el-fill-color-light);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 13px;
}

/* ── 输入区 ── */
.input-area {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  background: var(--el-bg-color, #fff);
  border-top: 1px solid var(--el-border-color-light);
  align-items: flex-end;
}

.msg-input {
  flex: 1;
}

.send-btn {
  flex-shrink: 0;
  height: 72px;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .sidebar {
    width: 0;
    min-width: 0;
    display: none;
  }
}

/* ── 记忆库面板 ── */
.memory-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.memory-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.memory-add-form {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  background: var(--el-fill-color-extra-light);
}

.memory-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.memory-empty {
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  padding: 30px 10px;
}

.memory-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--el-bg-color);
}

.memory-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.memory-time {
  flex: 1;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.memory-del {
  cursor: pointer;
  color: var(--el-color-danger);
  font-size: 14px;
  opacity: 0.6;
}
.memory-del:hover { opacity: 1; }

.memory-content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-all;
}

.memory-more {
  text-align: center;
  padding: 8px;
}
</style>
