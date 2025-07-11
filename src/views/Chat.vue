<template>
  <div class="chat-container">
    <div class="chat-header">
      <h2>💬 聊天室</h2>
      <div class="header-info">
        <div class="connection-status" :class="{ 'connected': isConnected, 'disconnected': !isConnected }">
          {{ isConnected ? '已连接' : '未连接' }}
        </div>
        <div class="online-count" v-if="onlineUsers.length > 0">
          在线: {{ onlineUsers.length }}
        </div>
      </div>
    </div>

    <!-- 在线用户列表 -->
    <div class="online-users" v-if="showOnlineUsers && onlineUsers.length > 0">
      <h4>在线用户 ({{ onlineUsers.length }})</h4>
      <div class="users-list">
        <div 
          v-for="user in onlineUsers" 
          :key="user.id"
          class="user-item"
          :class="{ 'current-user': user.username === username }"
        >
          <span class="user-avatar">👤</span>
          <span class="user-name">{{ user.username }}</span>
          <span v-if="user.username === username" class="user-tag">(我)</span>
        </div>
      </div>
      <el-button @click="showOnlineUsers = false" size="small" type="text">隐藏</el-button>
    </div>
    
    <div class="chat-messages" ref="messagesContainer">
      <div 
        v-for="message in messages" 
        :key="message.id"
        class="message"
        :class="{ 
          'own-message': message.isOwn,
          'system-message': message.isSystem,
          'join-message': message.type === 'join',
          'leave-message': message.type === 'leave'
        }"
      >
        <div class="message-header" v-if="!message.isSystem">
          <span class="username">{{ message.username }}</span>
          <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="message-content">
          <span v-if="message.isSystem" class="system-icon">🔔</span>
          {{ message.content }}
        </div>
      </div>
      
      <!-- 正在输入指示器 -->
      <div v-if="typingUsers.length > 0" class="typing-indicator">
        <div class="typing-content">
          <span class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span class="typing-text">
            {{ typingUsers.join(', ') }} 正在输入...
          </span>
        </div>
      </div>
      
      <div v-if="messages.length === 0" class="no-messages">
        暂无消息，开始聊天吧！
      </div>
    </div>
    
    <div class="chat-input">
      <div class="username-input" v-if="!username">
        <el-input 
          v-model="tempUsername" 
          placeholder="请输入您的用户名"
          @keyup.enter="setUsername"
          maxlength="20"
          show-word-limit
        />
        <el-button @click="setUsername" type="primary" :disabled="!tempUsername.trim()">
          进入聊天室
        </el-button>
      </div>
      
      <div class="message-input" v-else>
        <div class="input-toolbar">
          <el-button 
            @click="showOnlineUsers = !showOnlineUsers" 
            size="small" 
            type="text"
            :icon="showOnlineUsers ? 'Hide' : 'User'"
          >
            {{ showOnlineUsers ? '隐藏用户' : '在线用户' }}
          </el-button>
          <el-button 
            @click="clearMessages" 
            size="small" 
            type="text"
          >
            清空消息
          </el-button>
          <el-button 
            @click="toggleConnection" 
            size="small" 
            :type="useRealSocket ? 'success' : 'warning'"
          >
            {{ useRealSocket ? '真实连接' : '模拟模式' }}
          </el-button>
        </div>
        <div class="input-row">
          <el-input 
            v-model="newMessage" 
            placeholder="输入消息... (Enter发送，Shift+Enter换行)"
            @keydown="handleKeyDown"
            @input="handleTyping"
            :disabled="!isConnected"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            maxlength="500"
            show-word-limit
          />
          <div class="send-buttons">
            <el-button 
              @click="sendMessage" 
              type="primary" 
              :disabled="!isConnected || !newMessage.trim()"
              class="send-btn"
            >
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="chat-info">
      <p v-if="useRealSocket">
        <span class="info-icon">🔗</span>
        真实 WebSocket 连接模式 - 需要启动服务器: <code>node server/chat-server.js</code>
      </p>
      <p v-else>
        <span class="info-icon">🤖</span>
        演示模式 - 消息仅在本地显示，会有自动回复
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElInput, ElButton, ElMessage } from 'element-plus'
import { io } from 'socket.io-client'

// 响应式数据
const messages = ref([])
const newMessage = ref('')
const username = ref('')
const tempUsername = ref('')
const isConnected = ref(false)
const messagesContainer = ref(null)
const onlineUsers = ref([])
const showOnlineUsers = ref(false)
const typingUsers = ref([])
const useRealSocket = ref(false) // 是否使用真实 WebSocket 连接
const socket = ref(null)
const typingTimer = ref(null)
const isTyping = ref(false)

// WebSocket 连接管理
const connectSocket = () => {
  if (!useRealSocket.value || socket.value) return
  
  try {
    // 根据环境选择不同的连接地址
    const socketUrl = import.meta.env.PROD 
      ? 'https://chat-aaydn2iyh-lbs-projects-d8a353b9.vercel.app'
      : 'http://localhost:3001'
    
    socket.value = io(socketUrl, {
      transports: ['polling', 'websocket'],
      timeout: 10000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      addSystemMessage('已连接到聊天服务器', 'connect')
      
      // 发送用户加入信息
      if (username.value) {
        socket.value.emit('user:join', { username: username.value })
      }
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
      addSystemMessage('与服务器断开连接', 'disconnect')
      onlineUsers.value = []
    })

    socket.value.on('connect_error', (error) => {
      isConnected.value = false
      addSystemMessage('连接失败，切换到演示模式', 'error')
      useRealSocket.value = false
      simulateConnection()
    })

    socket.value.on('message:received', (message) => {
      const isOwn = message.userId === socket.value.id
      messages.value.push({
        ...message,
        isOwn,
        timestamp: new Date(message.timestamp)
      })
      scrollToBottom()
    })

    socket.value.on('user:joined', (data) => {
      addSystemMessage(data.message, 'join')
    })

    socket.value.on('user:left', (data) => {
      addSystemMessage(data.message, 'leave')
    })

    socket.value.on('users:online', (users) => {
      onlineUsers.value = users
    })

    socket.value.on('typing:user', (data) => {
      if (data.isTyping) {
        if (!typingUsers.value.includes(data.username)) {
          typingUsers.value.push(data.username)
        }
      } else {
        const index = typingUsers.value.indexOf(data.username)
        if (index > -1) {
          typingUsers.value.splice(index, 1)
        }
      }
    })

  } catch (error) {
    console.error('Socket connection error:', error)
    useRealSocket.value = false
    simulateConnection()
  }
}

const disconnectSocket = () => {
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
  isConnected.value = false
  onlineUsers.value = []
  typingUsers.value = []
}

// 模拟连接状态
const simulateConnection = () => {
  setTimeout(() => {
    isConnected.value = true
    addSystemMessage('演示模式已启动，消息仅本地显示', 'demo')
    // 模拟在线用户
    onlineUsers.value = [
      { id: 'demo1', username: username.value || '用户', joinTime: new Date() },
      { id: 'demo2', username: '小助手', joinTime: new Date() },
      { id: 'demo3', username: 'Vue学习者', joinTime: new Date() }
    ]
  }, 1000)
}

// 设置用户名
const setUsername = () => {
  if (tempUsername.value.trim()) {
    username.value = tempUsername.value.trim()
    tempUsername.value = ''
    
    if (useRealSocket.value) {
      connectSocket()
    } else {
      simulateConnection()
    }
  }
}

// 添加系统消息
const addSystemMessage = (content, type = 'system') => {
  messages.value.push({
    id: Date.now() + Math.random(),
    username: '系统',
    content,
    timestamp: new Date(),
    isOwn: false,
    isSystem: true,
    type
  })
  scrollToBottom()
}

// 发送消息
const sendMessage = () => {
  if (!newMessage.value.trim() || !username.value || !isConnected.value) return

  const messageContent = newMessage.value.trim()
  const message = {
    id: Date.now() + Math.random(),
    username: username.value,
    content: messageContent,
    timestamp: new Date(),
    isOwn: true
  }

  if (useRealSocket.value && socket.value) {
    // 发送到服务器
    socket.value.emit('message:send', { content: messageContent })
    stopTyping()
  } else {
    // 演示模式
    messages.value.push(message)
    setTimeout(() => simulateReply(), 1000 + Math.random() * 2000)
  }

  newMessage.value = ''
  scrollToBottom()
}

// 模拟其他用户回复
const simulateReply = () => {
  const replies = [
    '你好！👋',
    '很高兴见到你',
    '今天天气不错呢 ☀️',
    '这个聊天室很棒',
    '我也在学习 Vue.js',
    '有什么问题可以一起讨论',
    '学习前端真有趣',
    '加油！💪',
    '你的代码写得不错',
    '继续保持学习的热情'
  ]
  
  const randomReply = replies[Math.floor(Math.random() * replies.length)]
  const botNames = ['小助手', '开发者', '访客', 'Vue学习者', '前端爱好者']
  const randomName = botNames[Math.floor(Math.random() * botNames.length)]
  
  messages.value.push({
    id: Date.now() + Math.random(),
    username: randomName,
    content: randomReply,
    timestamp: new Date(),
    isOwn: false
  })
  
  scrollToBottom()
}

// 处理键盘事件
const handleKeyDown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// 处理输入事件（用于显示正在输入状态）
const handleTyping = () => {
  if (!useRealSocket.value || !socket.value || !isConnected.value) return

  if (!isTyping.value) {
    isTyping.value = true
    socket.value.emit('typing:start')
  }

  // 清除之前的定时器
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
  }

  // 设置新的定时器，2秒后停止输入状态
  typingTimer.value = setTimeout(stopTyping, 2000)
}

const stopTyping = () => {
  if (isTyping.value && socket.value) {
    isTyping.value = false
    socket.value.emit('typing:stop')
  }
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
    typingTimer.value = null
  }
}

// 切换连接模式
const toggleConnection = () => {
  if (useRealSocket.value) {
    disconnectSocket()
    useRealSocket.value = false
    simulateConnection()
    ElMessage.info('已切换到演示模式')
  } else {
    disconnectSocket()
    useRealSocket.value = true
    connectSocket()
    ElMessage.info('正在尝试连接真实服务器...')
  }
}

// 清空消息
const clearMessages = () => {
  messages.value = []
  ElMessage.success('消息已清空')
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 格式化时间
const formatTime = (date) => {
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

// 监听用户名变化
watch(username, (newUsername) => {
  if (newUsername && useRealSocket.value && socket.value && isConnected.value) {
    socket.value.emit('user:join', { username: newUsername })
  }
})

// 组件挂载时
onMounted(() => {
  // 默认演示模式
  // simulateConnection()
})

// 组件卸载时清理
onUnmounted(() => {
  stopTyping()
  disconnectSocket()
  if (typingTimer.value) {
    clearTimeout(typingTimer.value)
  }
})
</script>

<style lang="scss" scoped>
.chat-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-main, #f7f8fa);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--bg-cell, #fff);
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);

  h2 {
    margin: 0;
    color: var(--main-text, #222);
    font-size: 1.5rem;
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .connection-status {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      
      &.connected {
        background: #67c23a;
        color: white;
      }
      
      &.disconnected {
        background: #f56c6c;
        color: white;
      }
    }

    .online-count {
      padding: 6px 12px;
      background: var(--button, #409eff);
      color: white;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }
  }
}

.online-users {
  background: var(--bg-cell, #fff);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);

  h4 {
    margin: 0 0 12px 0;
    color: var(--main-text, #222);
    font-size: 1.1rem;
  }

  .users-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;

    .user-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #f0f2f5;
      border-radius: 18px;
      font-size: 14px;
      color: var(--main-text, #222);

      &.current-user {
        background: var(--button, #409eff);
        color: white;
      }

      .user-avatar {
        font-size: 12px;
      }

      .user-tag {
        font-size: 12px;
        opacity: 0.8;
      }
    }
  }
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: var(--bg-cell, #fff);
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);

  .message {
    margin-bottom: 16px;
    
    &.own-message {
      .message-content {
        background: var(--button, #409eff);
        color: white;
        margin-left: auto;
        margin-right: 0;
      }
      
      .message-header {
        text-align: right;
      }
    }

    &.system-message {
      .message-content {
        background: #f0f9ff;
        color: #1e40af;
        border: 1px solid #bfdbfe;
        margin: 0 auto;
        text-align: center;
        font-style: italic;
        max-width: 80%;

        .system-icon {
          margin-right: 6px;
        }
      }
    }

    &.join-message {
      .message-content {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
    }

    &.leave-message {
      .message-content {
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      font-size: 12px;
      color: #999;

      .username {
        font-weight: bold;
        color: var(--button, #409eff);
      }

      .timestamp {
        font-size: 11px;
      }
    }

    .message-content {
      background: #f5f5f5;
      padding: 10px 14px;
      border-radius: 12px;
      max-width: 75%;
      word-wrap: break-word;
      line-height: 1.4;
      color: var(--main-text, #222);
      white-space: pre-wrap;
    }
  }

  .typing-indicator {
    margin-bottom: 16px;

    .typing-content {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #999;
      font-style: italic;

      .typing-dots {
        display: flex;
        gap: 3px;

        span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #999;
          animation: typing 1.4s infinite ease-in-out;

          &:nth-child(1) { animation-delay: -0.32s; }
          &:nth-child(2) { animation-delay: -0.16s; }
        }
      }
    }
  }

  .no-messages {
    text-align: center;
    color: #999;
    font-style: italic;
    margin-top: 50px;
    font-size: 16px;
  }
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.chat-input {
  .username-input,
  .message-input {
    background: var(--bg-cell, #fff);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  }

  .username-input {
    display: flex;
    gap: 12px;
    align-items: flex-end;

    .el-input {
      flex: 1;
    }
  }

  .message-input {
    .input-toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      justify-content: flex-end;

      .el-button {
        font-size: 12px;
        padding: 4px 8px;
      }
    }

    .input-row {
      display: flex;
      gap: 12px;
      align-items: flex-end;

      .el-input {
        flex: 1;
      }

      .send-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .send-btn {
          min-width: 70px;
        }
      }
    }
  }
}

.chat-info {
  margin-top: 16px;
  padding: 16px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  color: #856404;
  font-size: 14px;

  p {
    margin: 0;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .info-icon {
      font-size: 16px;
    }

    code {
      background: rgba(0,0,0,0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }
  }
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Element Plus 样式覆盖 */
:deep(.el-textarea__inner) {
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  transition: border-color 0.3s;

  &:focus {
    border-color: var(--button, #409eff);
  }
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-container {
    padding: 10px;
    height: 90vh;
  }
  
  .chat-header {
    padding: 12px 16px;
    
    h2 {
      font-size: 1.2rem;
    }

    .header-info {
      flex-direction: column;
      gap: 6px;
      align-items: flex-end;

      .connection-status,
      .online-count {
        font-size: 12px;
        padding: 4px 8px;
      }
    }
  }

  .chat-messages {
    padding: 12px 16px;

    .message {
      .message-content {
        max-width: 85% !important;
        font-size: 14px;
      }
    }
  }

  .online-users {
    padding: 12px;

    .users-list {
      .user-item {
        font-size: 12px;
        padding: 4px 8px;
      }
    }
  }

  .chat-input {
    .username-input,
    .message-input {
      padding: 12px;
    }

    .message-input {
      .input-toolbar {
        flex-wrap: wrap;
        justify-content: center;

        .el-button {
          font-size: 11px;
        }
      }

      .input-row {
        flex-direction: column;
        gap: 8px;

        .send-buttons {
          align-self: stretch;

          .send-btn {
            width: 100%;
          }
        }
      }
    }
  }

  .chat-info {
    padding: 12px;
    font-size: 12px;

    p {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
  }
}

@media (max-width: 480px) {
  .chat-container {
    padding: 8px;
  }

  .chat-header {
    flex-direction: column;
    gap: 8px;
    text-align: center;

    .header-info {
      flex-direction: row;
      justify-content: center;
    }
  }
}
</style>