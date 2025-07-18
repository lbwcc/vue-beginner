<template>
  <div class="goeasy-chat-container">
    <div class="chat-header">
      <h2>💬lbw广场</h2>
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
        <h3>👋 欢迎来到lbw广场</h3>
        <p>请输入您的用户名和选择头像开始聊天</p>
        <el-form @submit.prevent="handleLogin">
          <!-- 头像选择器 -->
          <el-form-item label="选择头像:">
            <div class="avatar-selector-simple">
              <div class="current-avatar-display" @click="showAvatarDialog = true">
                <span class="avatar-icon">{{ selectedAvatar }}</span>
                <span class="change-text">点击更换头像</span>
              </div>
            </div>
          </el-form-item>
          
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
                <span>{{ selectedAvatar }}</span>
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
          v-for="(message, index) in messages" 
          :key="message.id"
          class="message"
          :class="messageClasses(message, index)"
        >
          <!-- 时间分隔线 -->
          <div v-if="shouldShowTimeDivider(message, index)" class="time-divider">
            <span class="time-text">{{ formatDateDivider(message.timestamp) }}</span>
          </div>
          
          <!-- 消息内容 -->
          <div class="message-wrapper">
            <!-- 用户头像 (非系统消息且非自己的消息) -->
            <div v-if="!message.isSystem && message.userId !== currentUser?.id" class="message-avatar">
              <span class="avatar-icon">{{ message.avatar || '👤' }}</span>
            </div>
            
            <div class="message-bubble">
              <!-- 消息头部 (显示用户名和时间戳的条件) -->
              <div v-if="shouldShowMessageHeader(message, index)" class="message-header">
                <span class="username" :class="{ 'system-username': message.isSystem }">
                  {{ message.username }}
                </span>
                <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
              </div>
              
              <!-- 消息内容 -->
              <div class="message-content" :class="{ 'long-message': message.content.length > 200 }">
                <div v-if="message.content.length > 200" class="message-text">
                  <div v-if="!message.expanded" class="message-preview">
                    {{ message.content.substring(0, 200) }}...
                    <el-button 
                      type="text" 
                      size="small" 
                      @click="toggleMessageExpanded(message)"
                      class="expand-btn"
                    >
                      展开
                    </el-button>
                  </div>
                  <div v-else class="message-full">
                    {{ message.content }}
                    <el-button 
                      type="text" 
                      size="small" 
                      @click="toggleMessageExpanded(message)"
                      class="collapse-btn"
                    >
                      收起
                    </el-button>
                  </div>
                </div>
                <div v-else>
                  {{ message.content }}
                </div>
              </div>
            </div>
            
            <!-- 自己消息的头像占位 -->
            <div v-if="message.userId === currentUser?.id && !message.isSystem" class="message-avatar-placeholder"></div>
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

    <!-- 头像选择弹窗 -->
    <el-dialog
      v-model="showAvatarDialog"
      title="选择头像"
      width="500px"
      :before-close="handleAvatarDialogClose"
    >
      <div class="avatar-dialog-content">
        <div class="current-selection">
          <div class="selected-avatar">
            <span class="avatar-large">{{ tempSelectedAvatar }}</span>
            <p>当前选择</p>
          </div>
        </div>
        
        <div class="avatar-categories">
          <el-tabs v-model="activeAvatarTab" type="card">
            <el-tab-pane label="👤 人物" name="people">
              <div class="avatar-grid">
                <div 
                  v-for="avatar in peopleAvatars" 
                  :key="avatar"
                  class="avatar-option"
                  :class="{ 'selected': tempSelectedAvatar === avatar }"
                  @click="selectAvatar(avatar)"
                >
                  {{ avatar }}
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="🐶 动物" name="animals">
              <div class="avatar-grid">
                <div 
                  v-for="avatar in animalAvatars" 
                  :key="avatar"
                  class="avatar-option"
                  :class="{ 'selected': tempSelectedAvatar === avatar }"
                  @click="selectAvatar(avatar)"
                >
                  {{ avatar }}
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="🎭 其他" name="others">
              <div class="avatar-grid">
                <div 
                  v-for="avatar in otherAvatars" 
                  :key="avatar"
                  class="avatar-option"
                  :class="{ 'selected': tempSelectedAvatar === avatar }"
                  @click="selectAvatar(avatar)"
                >
                  {{ avatar }}
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="getRandomAvatar" type="info">
            🎲 随机选择
          </el-button>
          <el-button @click="showAvatarDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmAvatarSelection">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
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
const selectedAvatar = ref('👨')
const showAvatarDialog = ref(false)
const activeAvatarTab = ref('people')
const tempSelectedAvatar = ref('👨')

// 头像选项 - 分类
const peopleAvatars = ref([
  '👨', '👩', '🧑', '👶', '👴', '👵', 
  '🤵', '👸', '🤴', '👮', '👷', '💂', 
  '🕵️', '👩‍⚕️', '👨‍⚕️', '👩‍🌾', '👨‍🌾', '👩‍🍳', 
  '👨‍🍳', '👩‍🎓', '👨‍🎓', '👩‍🎤', '👨‍🎤', '👩‍💻', 
  '👨‍💻', '🧙', '🧚', '🧛', '🧜', '🧞'
])

const animalAvatars = ref([
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
  '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
  '🐷', '🐸', '🐵', '🐔', '🐧', '🐦',
  '🦄', '🐺', '🦝', '🦔', '🐾', '🐝'
])

const otherAvatars = ref([
  '🤖', '👽', '👻', '🎃', '🤡', '💀',
  '⭐', '🌟', '✨', '💎', '🔥', '💫',
  '🌈', '☀️', '🌙', '⚡', '❄️', '🌸'
])

// 所有头像选项（用于随机选择）
const allAvatars = computed(() => [
  ...peopleAvatars.value,
  ...animalAvatars.value,
  ...otherAvatars.value
])

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
const messageClasses = (message, index) => ({
  'own-message': message.userId === currentUser.value?.id,
  'system-message': message.isSystem,
  'join-message': message.type === 'join',
  'leave-message': message.type === 'leave',
  'grouped-message': isGroupedMessage(message, index),
  'first-in-group': isFirstInGroup(message, index),
  'last-in-group': isLastInGroup(message, index)
})

// 判断是否为分组消息
const isGroupedMessage = (message, index) => {
  if (message.isSystem) return false
  if (index === 0) return false
  
  const prevMessage = messages.value[index - 1]
  if (!prevMessage || prevMessage.isSystem) return false
  
  const timeDiff = new Date(message.timestamp) - new Date(prevMessage.timestamp)
  const isConsecutive = timeDiff <= 2 * 60 * 1000 // 2分钟内
  const isSameUser = message.userId === prevMessage.userId
  
  return isConsecutive && isSameUser
}

// 判断是否为分组中的第一条消息
const isFirstInGroup = (message, index) => {
  if (message.isSystem) return false
  return !isGroupedMessage(message, index)
}

// 判断是否为分组中的最后一条消息
const isLastInGroup = (message, index) => {
  if (message.isSystem) return false
  if (index === messages.value.length - 1) return true
  
  const nextMessage = messages.value[index + 1]
  if (!nextMessage) return true
  
  return !isGroupedMessage(nextMessage, index + 1) || nextMessage.userId !== message.userId
}

// 判断是否显示消息头部
const shouldShowMessageHeader = (message, index) => {
  if (message.isSystem) return false
  return isFirstInGroup(message, index)
}

// 判断是否显示时间分隔线
const shouldShowTimeDivider = (message, index) => {
  if (index === 0) return true
  
  const prevMessage = messages.value[index - 1]
  if (!prevMessage) return true
  
  const currentDate = new Date(message.timestamp)
  const prevDate = new Date(prevMessage.timestamp)
  
  // 如果是不同的日期，显示日期分隔线
  if (currentDate.toDateString() !== prevDate.toDateString()) {
    return true
  }
  
  // 如果时间间隔超过30分钟，显示时间分隔线
  const timeDiff = currentDate - prevDate
  return timeDiff > 30 * 60 * 1000 // 30分钟
}

// 格式化日期分隔线
const formatDateDivider = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  const diffTime = today - messageDate
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays === 2) {
    return '前天'
  } else if (diffDays <= 7) {
    return date.toLocaleDateString('zh-CN', { weekday: 'long' })
  } else {
    return date.toLocaleDateString('zh-CN', { 
      month: 'long', 
      day: 'numeric' 
    })
  }
}

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
      avatar: selectedAvatar.value
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
    selectedAvatar.value = '👨'
    
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
    messagesContainer.value.scrollTo({
      top: messagesContainer.value.scrollHeight,
      behavior: 'smooth'
    })
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
  const randomIndex = Math.floor(Math.random() * allAvatars.value.length)
  tempSelectedAvatar.value = allAvatars.value[randomIndex]
  selectedAvatar.value = tempSelectedAvatar.value
}

// 选择头像
const selectAvatar = (avatar) => {
  tempSelectedAvatar.value = avatar
}

// 确认头像选择
const confirmAvatarSelection = () => {
  selectedAvatar.value = tempSelectedAvatar.value
  showAvatarDialog.value = false
  ElMessage.success('头像已更换')
}

// 处理头像弹窗关闭
const handleAvatarDialogClose = () => {
  // 恢复到之前选择的头像
  tempSelectedAvatar.value = selectedAvatar.value
  showAvatarDialog.value = false
}

// 打开头像选择弹窗
const openAvatarDialog = () => {
  tempSelectedAvatar.value = selectedAvatar.value
  showAvatarDialog.value = true
}

// 切换消息展开状态
const toggleMessageExpanded = (message) => {
  message.expanded = !message.expanded
  
  // 滚动调整
  nextTick(() => {
    if (message.expanded) {
      scrollToBottom()
    }
  })
}

// 设置事件监听器
const setupEventListeners = () => {
  // 监听消息
  chatRoom.onMessage((message) => {
    messages.value.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
      expanded: false // 初始化展开状态
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
  min-height: 94vh;
  
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
      
      .avatar-selector-simple {
        display: flex;
        justify-content: center;
        margin-bottom: 20px;
        
        .current-avatar-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          border: 2px dashed #409eff;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #f8f9fa;
          
          &:hover {
            border-color: #66b1ff;
            background: #ecf5ff;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
          }
          
          .avatar-icon {
            font-size: 48px;
            margin-bottom: 8px;
            display: block;
          }
          
          .change-text {
            font-size: 14px;
            color: #409eff;
            font-weight: 500;
          }
        }
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
    scroll-behavior: smooth;
    
    // 自定义滚动条样式
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
      
      &:hover {
        background: #a8a8a8;
      }
    }
    
    .time-divider {
      text-align: center;
      margin: 20px 0;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #e4e7ed;
      }
      
      .time-text {
        background: #f5f7fa;
        color: #909399;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        position: relative;
        z-index: 1;
      }
    }
    
    .message {
      margin-bottom: 4px;
      
      &.grouped-message {
        margin-bottom: 2px;
        
        .message-wrapper {
          .message-bubble .message-content {
            margin-top: 2px;
          }
        }
      }
      
      &.last-in-group {
        margin-bottom: 16px;
      }
      
      .message-wrapper {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        justify-content: flex-start;
        
        .message-avatar {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          
          .avatar-icon {
            font-size: 20px;
            background: #f0f2f5;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
        
        .message-avatar-placeholder {
          width: 36px;
          flex-shrink: 0;
        }
        
        .message-bubble {
          flex: 1;
          max-width: calc(100% - 80px);
          text-align: left;
          
          .message-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
            justify-content: flex-start;
            
            .username {
              font-weight: 600;
              color: #333;
              font-size: 14px;
            }
            
            .timestamp {
              font-size: 11px;
              color: #999;
            }
          }
          
          .message-content {
            background: #f0f0f0;
            padding: 8px 12px;
            border-radius: 18px;
            word-wrap: break-word;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.4;
            display: inline-block;
            text-align: left;
            
            &.long-message {
              .expand-btn, .collapse-btn {
                color: #409eff;
                padding: 0;
                margin-left: 8px;
                font-size: 12px;
                
                &:hover {
                  text-decoration: underline;
                }
              }
              
              .message-preview, .message-full {
                display: inline;
              }
            }
          }
        }
      }
      
      &.own-message {
        .message-wrapper {
          flex-direction: row-reverse;
          
          .message-bubble {
            text-align: right;
            
            .message-header {
              justify-content: flex-end;
            }
            
            .message-content {
              background: #409eff;
              color: white;
              border-radius: 18px 18px 4px 18px;
              text-align: left;
            }
          }
        }
      }
      
      &.system-message {
        .message-wrapper {
          justify-content: center;
          
          .message-bubble {
            max-width: 80%;
            text-align: center;
            
            .message-content {
              background: #f0f0f0;
              color: #666;
              border-radius: 16px;
              font-style: italic;
              text-align: center;
              font-size: 13px;
            }
          }
        }
        
        .username {
          color: #999 !important;
        }
      }
      
      &.join-message .message-content {
        background: #67c23a !important;
        color: white !important;
      }
      
      &.leave-message .message-content {
        background: #f56c6c !important;
        color: white !important;
      }
      
      // 分组消息的特殊样式
      &.grouped-message {
        &.own-message .message-bubble .message-content {
          border-radius: 18px 4px 4px 18px;
        }
        
        &:not(.own-message) .message-bubble .message-content {
          border-radius: 4px 18px 18px 4px;
        }
        
        &.last-in-group.own-message .message-bubble .message-content {
          border-radius: 18px 4px 18px 18px;
        }
        
        &.last-in-group:not(.own-message) .message-bubble .message-content {
          border-radius: 4px 18px 18px 18px;
        }
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
      
      .el-button {
        transition: all 0.3s ease;
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
      }
    }
  }
  
  .error-alert {
    margin-top: 20px;
  }
  
  // 头像选择弹窗样式
  :deep(.el-dialog) {
    border-radius: 12px;
    
    .el-dialog__header {
      padding: 20px 20px 10px;
      
      .el-dialog__title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }
    }
    
    .el-dialog__body {
      padding: 10px 20px;
    }
    
    .el-dialog__footer {
      padding: 10px 20px 20px;
    }
  }
  
  .avatar-dialog-content {
    .current-selection {
      text-align: center;
      margin-bottom: 20px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 10px;
      
      .selected-avatar {
        .avatar-large {
          font-size: 64px;
          display: block;
          margin-bottom: 10px;
        }
        
        p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }
      }
    }
    
    .avatar-categories {
      :deep(.el-tabs) {
        .el-tabs__header {
          margin-bottom: 15px;
          
          .el-tabs__nav {
            border-radius: 6px;
            overflow: hidden;
          }
          
          .el-tabs__item {
            border-radius: 0;
            
            &.is-active {
              background: #409eff;
              color: white;
              border-color: #409eff;
            }
          }
        }
        
        .el-tab-pane {
          .avatar-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
            gap: 10px;
            max-height: 300px;
            overflow-y: auto;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            
            &::-webkit-scrollbar {
              width: 6px;
            }
            
            &::-webkit-scrollbar-track {
              background: #f1f1f1;
              border-radius: 3px;
            }
            
            &::-webkit-scrollbar-thumb {
              background: #c1c1c1;
              border-radius: 3px;
              
              &:hover {
                background: #a8a8a8;
              }
            }
            
            .avatar-option {
              width: 50px;
              height: 50px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 28px;
              border: 2px solid transparent;
              border-radius: 10px;
              cursor: pointer;
              transition: all 0.3s ease;
              background: white;
              
              &:hover {
                background: #e9ecef;
                transform: scale(1.15);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              }
              
              &.selected {
                border-color: #409eff;
                background: #ecf5ff;
                transform: scale(1.15);
                box-shadow: 0 2px 12px rgba(64, 158, 255, 0.4);
              }
            }
          }
        }
      }
    }
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
      gap: 10px;
      text-align: center;
      
      h2 {
        font-size: 20px;
        margin-bottom: 5px;
      }
      
      .header-info {
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        
        .connection-status {
          font-size: 11px;
          padding: 4px 10px;
        }
        
        .online-count {
          font-size: 11px;
          padding: 4px 10px;
        }
        
        .el-button {
          font-size: 12px;
          padding: 6px 12px;
          height: auto;
        }
      }
    }
    
    .chat-interface {
      height: calc(100vh - 160px);
      min-height: 400px;
    }
    
    .login-form .login-card {
      .avatar-selector-simple {
        .current-avatar-display {
          padding: 15px;
          
          .avatar-icon {
            font-size: 40px;
          }
          
          .change-text {
            font-size: 13px;
          }
        }
      }
    }
    
    .online-users .users-list {
      grid-template-columns: 1fr;
    }
    
    .chat-messages {
      padding: 15px;
      
      .message .message-wrapper {
        .message-bubble {
          max-width: calc(100% - 50px);
        }
      }
      
      .message.own-message .message-wrapper .message-bubble,
      .message.system-message .message-wrapper .message-bubble {
        max-width: calc(100% - 20px);
      }
    }
    
    .chat-input {
      padding: 15px;
      
      .input-wrapper {
        margin-bottom: 12px;
      }
      
      .chat-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        
        .el-button {
          font-size: 13px;
          padding: 8px 12px;
          
          &:first-child {
            order: 1;
          }
          
          &:last-child {
            order: 2;
          }
        }
      }
    }
  }
}

// 超小屏幕优化
@media (max-width: 480px) {
  .goeasy-chat-container {
    padding: 5px;
    
    .chat-header {
      padding: 12px;
      
      h2 {
        font-size: 18px;
      }
      
      .header-info {
        .el-button {
          font-size: 11px;
          padding: 5px 10px;
        }
      }
    }
    
    .chat-interface {
      height: calc(100vh - 140px);
    }
    
    .login-form .login-card {
      .avatar-selector-simple {
        .current-avatar-display {
          padding: 12px;
          
          .avatar-icon {
            font-size: 36px;
          }
          
          .change-text {
            font-size: 12px;
          }
        }
      }
    }
    
    .chat-input {
      padding: 12px;
      
      .chat-actions {
        gap: 6px;
        
        .el-button {
          font-size: 12px;
          padding: 6px 8px;
          min-height: 32px;
          
          // 在极小屏幕上垂直排列
          @media (max-width: 360px) {
            grid-column: 1 / -1;
          }
        }
      }
    }
  }
  
  // 在极小屏幕上使按钮垂直排列
  @media (max-width: 360px) {
    .goeasy-chat-container .chat-input .chat-actions {
      grid-template-columns: 1fr;
      
      .el-button {
        width: 100%;
      }
    }
  }
  
  // 移动端弹窗优化
  @media (max-width: 768px) {
    :deep(.el-dialog) {
      width: 95% !important;
      margin: 5vh auto !important;
      
      .el-dialog__body {
        padding: 15px;
      }
      
      .avatar-dialog-content {
        .current-selection {
          padding: 15px;
          
          .selected-avatar .avatar-large {
            font-size: 48px;
          }
        }
        
        .avatar-categories {
          :deep(.el-tab-pane) {
            .avatar-grid {
              grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
              gap: 6px;
              max-height: 200px;
              
              .avatar-option {
                width: 40px;
                height: 40px;
                font-size: 22px;
              }
            }
          }
        }
      }
    }
  }
  
  @media (max-width: 480px) {
    :deep(.el-dialog) {
      .avatar-dialog-content {
        .current-selection {
          padding: 12px;
          
          .selected-avatar .avatar-large {
            font-size: 40px;
          }
        }
        
        .avatar-categories {
          :deep(.el-tab-pane) {
            .avatar-grid {
              grid-template-columns: repeat(auto-fit, minmax(35px, 1fr));
              gap: 4px;
              max-height: 180px;
              
              .avatar-option {
                width: 35px;
                height: 35px;
                font-size: 18px;
              }
            }
          }
        }
      }
    }
  }
}
</style>
