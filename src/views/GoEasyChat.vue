<template>
  <div class="goeasy-chat-container">
    <div class="chat-header">
      <h2>💬 GoEasy 聊天室</h2>
      <div class="header-info">
        <div class="connection-status" :class="statusClass">
          {{ connectionStatusText }}
        </div>
        <div class="online-count" v-if="onlineUsers.length > 0">
          在线: {{ onlineUsers.length }}
        </div>
        <el-button 
          v-if="onlineUsers.length > 0"
          @click="showOnlineUsers = !showOnlineUsers" 
          size="small" 
          type="primary"
          :icon="showOnlineUsers ? 'Hide' : 'User'"
        >
          {{ showOnlineUsers ? '隐藏用户' : '显示用户' }}
        </el-button>
      </div>
    </div>

    <!-- 用户登录表单 -->
    <div v-if="!isLoggedIn" class="login-form">
      <el-card class="login-card">
        <h3>👋 欢迎来到 GoEasy 聊天室</h3>
        <p>请输入您的用户名开始聊天</p>
        <el-form @submit.prevent="handleLogin">
          <el-form-item>
            <el-input
              v-model="tempUsername"
              placeholder="请输入用户名"
              maxlength="20"
              show-word-limit
              @keyup.enter="handleLogin"
              :disabled="isConnecting"
            >
              <template #prepend>
                <span>👤</span>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button 
              type="primary" 
              @click="handleLogin"
              :loading="isConnecting"
              :disabled="!tempUsername.trim()"
              style="width: 100%"
            >
              {{ isConnecting ? '连接中...' : '加入聊天室' }}
            </el-button>
          </el-form-item>
        </el-form>
        
        <div class="features">
          <h4>✨ 功能特色</h4>
          <ul>
            <li>🌍 基于 GoEasy 云服务，稳定可靠</li>
            <li>⚡ 实时消息传输，低延迟</li>
            <li>👥 在线用户实时显示</li>
            <li>🔒 安全的连接管理</li>
            <li>📱 支持多端同步</li>
          </ul>
        </div>
      </el-card>
    </div>

    <!-- 聊天界面 -->
    <div v-else class="chat-interface">
      <!-- 在线用户列表 -->
      <transition name="slide-down">
        <div v-if="showOnlineUsers" class="online-users">
          <div class="users-header">
            <h4>👥 在线用户 ({{ onlineUsers.length }})</h4>
            <el-button @click="showOnlineUsers = false" size="small" type="text" :icon="'Close'">
              关闭
            </el-button>
          </div>
          <div class="users-list">
            <div 
              v-for="user in onlineUsers" 
              :key="user.id"
              class="user-item"
              :class="{ 'current-user': user.id === currentUser?.id }"
            >
              <span class="user-avatar">{{ user.avatar || '👤' }}</span>
              <span class="user-name">{{ user.username }}</span>
              <span v-if="user.id === currentUser?.id" class="user-tag">(我)</span>
              <span class="user-time">{{ formatJoinTime(user.joinTime) }}</span>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- 消息列表 -->
      <div class="chat-messages" ref="messagesContainer">
        <div 
          v-for="message in messages" 
          :key="message.id"
          class="message"
          :class="messageClasses(message)"
        >
          <div class="message-header">
            <span class="username" :class="{ 'system-username': message.isSystem }">
              <span class="user-avatar">{{ message.avatar || '👤' }}</span>
              {{ message.username }}
            </span>
            <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-content">
            {{ message.content }}
          </div>
        </div>
        
        <!-- 空状态 -->
        <div v-if="messages.length === 0" class="empty-messages">
          <div class="empty-icon">💬</div>
          <p>还没有消息，开始聊天吧！</p>
        </div>
      </div>

      <!-- 消息输入区域 -->
      <div class="chat-input">
        <div class="input-wrapper">
          <el-input
            v-model="newMessage"
            placeholder="输入消息..."
            @keyup.enter="sendMessage"
            :disabled="!isConnected"
            maxlength="500"
            show-word-limit
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            resize="none"
          >
            <template #append>
              <el-button 
                type="primary" 
                @click="sendMessage"
                :disabled="!newMessage.trim() || !isConnected"
                :loading="isSending"
              >
                {{ isSending ? '发送中' : '发送' }}
              </el-button>
            </template>
          </el-input>
        </div>
        
        <div class="chat-actions">
          <el-button size="small" @click="clearMessages" type="warning" :icon="'Delete'">
            清空消息
          </el-button>
          <el-button size="small" @click="handleLogout" type="danger" :icon="'SwitchButton'">
            退出聊天室
          </el-button>
        </div>
      </div>
    </div>

    <!-- 连接错误提示 -->
    <el-alert
      v-if="connectionError"
      :title="connectionError"
      type="error"
      show-icon
      :closable="false"
      class="error-alert"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import chatRoom from '@/utils/goeasy.js'

// 响应式数据
const messages = ref([])
const newMessage = ref('')
const tempUsername = ref('')
const isLoggedIn = ref(false)
const isConnecting = ref(false)
const isSending = ref(false)
const isConnected = ref(false)
const connectionError = ref('')
const messagesContainer = ref(null)
const onlineUsers = ref([])
const showOnlineUsers = ref(false)
const currentUser = ref(null)

// 计算属性
const statusClass = computed(() => ({
  'connected': isConnected.value,
  'disconnected': !isConnected.value && !isConnecting.value,
  'connecting': isConnecting.value
}))

const connectionStatusText = computed(() => {
  if (isConnecting.value) return '连接中...'
  if (isConnected.value) return '已连接'
  return '未连接'
})

// 消息样式类
const messageClasses = (message) => ({
  'own-message': message.userId === currentUser.value?.id,
  'system-message': message.isSystem,
  'join-message': message.type === 'join',
  'leave-message': message.type === 'leave'
})

// 登录处理
const handleLogin = async () => {
  if (!tempUsername.value.trim()) {
    ElMessage.warning('请输入用户名')
    return
  }

  if (tempUsername.value.trim().length < 2) {
    ElMessage.warning('用户名至少需要2个字符')
    return
  }

  isConnecting.value = true
  connectionError.value = ''

  try {
    const userInfo = {
      username: tempUsername.value.trim(),
      avatar: getRandomAvatar()
    }

    currentUser.value = await chatRoom.connect(userInfo)
    isLoggedIn.value = true
    
    ElMessage.success(`欢迎 ${currentUser.value.username}！`)
    
    // 滚动到底部
    await nextTick()
    scrollToBottom()
    
  } catch (error) {
    console.error('登录失败:', error)
    connectionError.value = `连接失败: ${error.message || '未知错误'}`
    ElMessage.error('连接失败，请检查网络后重试')
  } finally {
    isConnecting.value = false
  }
}

// 登出处理
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出聊天室吗？',
      '确认退出',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    chatRoom.disconnect()
    isLoggedIn.value = false
    currentUser.value = null
    messages.value = []
    onlineUsers.value = []
    tempUsername.value = ''
    
    ElMessage.success('已退出聊天室')
  } catch {
    // 用户取消
  }
}

// 发送消息
const sendMessage = async () => {
  if (!newMessage.value.trim() || !isConnected.value) return

  isSending.value = true
  
  try {
    await chatRoom.sendMessage(newMessage.value)
    newMessage.value = ''
    
    // 滚动到底部
    await nextTick()
    scrollToBottom()
    
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送失败，请重试')
  } finally {
    isSending.value = false
  }
}

// 清空消息
const clearMessages = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有消息吗？',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    messages.value = []
    ElMessage.success('消息已清空')
  } catch {
    // 用户取消
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
  
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化加入时间
const formatJoinTime = (joinTime) => {
  if (!joinTime) return ''
  const date = new Date(joinTime)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取随机头像
const getRandomAvatar = () => {
  const avatars = ['👨', '👩', '🧑', '👶', '👴', '👵', '🤵', '👸', '🤴', '👮', '👷', '💂', '🕵️', '👩‍⚕️', '👨‍⚕️', '👩‍🌾', '👨‍🌾', '👩‍🍳', '👨‍🍳', '👩‍🎓', '👨‍🎓', '👩‍🎤', '👨‍🎤', '👩‍💻', '👨‍💻']
  return avatars[Math.floor(Math.random() * avatars.length)]
}

// 设置事件监听器
const setupEventListeners = () => {
  // 监听消息
  chatRoom.onMessage((message) => {
    messages.value.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    })
    
    // 滚动到底部
    nextTick(() => {
      scrollToBottom()
    })
  })

  // 监听连接状态
  chatRoom.onStatusChange((status, error) => {
    isConnected.value = status === 'connected'
    
    if (status === 'error' && error) {
      connectionError.value = `连接错误: ${error.message || '未知错误'}`
    } else {
      connectionError.value = ''
    }
  })

  // 监听用户列表变化
  chatRoom.onUserListChange((users) => {
    onlineUsers.value = users.sort((a, b) => {
      // 当前用户排在前面
      if (a.id === currentUser.value?.id) return -1
      if (b.id === currentUser.value?.id) return 1
      return a.username.localeCompare(b.username)
    })
  })
}

// 组件挂载
onMounted(() => {
  setupEventListeners()
  
  // 检查是否已经连接
  if (chatRoom.getConnectionStatus()) {
    isConnected.value = true
    const user = chatRoom.getCurrentUser()
    if (user) {
      currentUser.value = user
      isLoggedIn.value = true
    }
  }
})

// 组件卸载
onUnmounted(() => {
  // 清理事件监听器
  chatRoom.cleanup()
})
</script>

<style scoped lang="scss">
.goeasy-chat-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  
  .chat-header {
    background: rgba(255, 255, 255, 0.95);
    padding: 20px;
    border-radius: 15px 15px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    
    h2 {
      margin: 0;
      background: linear-gradient(45deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .header-info {
      display: flex;
      align-items: center;
      gap: 15px;
      
      .connection-status {
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        
        &.connected {
          background: #67c23a;
          color: white;
        }
        
        &.disconnected {
          background: #f56c6c;
          color: white;
        }
        
        &.connecting {
          background: #e6a23c;
          color: white;
        }
      }
      
      .online-count {
        background: #409eff;
        color: white;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
      }
    }
  }
  
  .login-form {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 0 0 15px 15px;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    
    .login-card {
      border: none;
      box-shadow: none;
      
      h3 {
        text-align: center;
        margin-bottom: 10px;
        color: #333;
      }
      
      p {
        text-align: center;
        color: #666;
        margin-bottom: 30px;
      }
      
      .features {
        margin-top: 30px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        
        h4 {
          margin: 0 0 15px 0;
          color: #333;
        }
        
        ul {
          margin: 0;
          padding-left: 20px;
          
          li {
            margin: 8px 0;
            color: #666;
          }
        }
      }
    }
  }
  
  .chat-interface {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 0 0 15px 15px;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    height: calc(100vh - 200px);
    min-height: 500px;
  }
  
  .online-users {
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    padding: 15px;
    
    .users-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      
      h4 {
        margin: 0;
        color: #333;
      }
    }
    
    .users-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      
      .user-item {
        background: white;
        padding: 10px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 2px solid transparent;
        transition: all 0.3s ease;
        
        &.current-user {
          border-color: #409eff;
          background: #ecf5ff;
        }
        
        .user-avatar {
          font-size: 16px;
        }
        
        .user-name {
          font-weight: 500;
          flex: 1;
        }
        
        .user-tag {
          background: #409eff;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
        }
        
        .user-time {
          font-size: 12px;
          color: #999;
        }
      }
    }
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    
    .message {
      margin-bottom: 20px;
      
      &.own-message {
        text-align: right;
        
        .message-header {
          justify-content: flex-end;
        }
        
        .message-content {
          background: #409eff;
          color: white;
          border-radius: 18px 18px 5px 18px;
          margin-left: 60px;
        }
      }
      
      &.system-message {
        text-align: center;
        
        .message-content {
          background: #f0f0f0;
          color: #666;
          border-radius: 18px;
          font-style: italic;
          margin: 0 60px;
        }
        
        .system-username {
          color: #999 !important;
        }
      }
      
      &.join-message .message-content {
        background: #67c23a;
        color: white;
      }
      
      &.leave-message .message-content {
        background: #f56c6c;
        color: white;
      }
      
      .message-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 5px;
        
        .username {
          font-weight: bold;
          color: #333;
          display: flex;
          align-items: center;
          gap: 5px;
          
          .user-avatar {
            font-size: 14px;
          }
        }
        
        .timestamp {
          font-size: 12px;
          color: #999;
        }
      }
      
      .message-content {
        background: #f0f0f0;
        padding: 12px 16px;
        border-radius: 18px 18px 18px 5px;
        max-width: calc(100% - 60px);
        display: inline-block;
        word-wrap: break-word;
        white-space: pre-wrap;
      }
    }
    
    .empty-messages {
      text-align: center;
      padding: 60px 20px;
      color: #999;
      
      .empty-icon {
        font-size: 48px;
        margin-bottom: 20px;
      }
    }
  }
  
  .chat-input {
    padding: 20px;
    border-top: 1px solid #e9ecef;
    background: #f8f9fa;
    
    .input-wrapper {
      margin-bottom: 10px;
    }
    
    .chat-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
  }
  
  .error-alert {
    margin-top: 20px;
  }
}

// 动画
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .goeasy-chat-container {
    padding: 10px;
    
    .chat-header {
      padding: 15px;
      flex-direction: column;
      gap: 15px;
      text-align: center;
      
      .header-info {
        justify-content: center;
      }
    }
    
    .online-users .users-list {
      grid-template-columns: 1fr;
    }
    
    .chat-messages .message {
      &.own-message .message-content,
      &.system-message .message-content {
        margin-left: 20px;
        margin-right: 20px;
      }
    }
    
    .chat-input .chat-actions {
      flex-direction: column;
      
      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
