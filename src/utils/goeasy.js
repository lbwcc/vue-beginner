import GoEasy from 'goeasy'

// GoEasy 配置 - 使用固定配置避免环境变量解析问题
const CONFIG = {
  host: 'hangzhou.goeasy.io', // 根据您的应用区域选择：singapore.goeasy.io, hangzhou.goeasy.io
  appkey: 'BC-fb81bdd571b148f09c030da31d3e1ddf', // 请替换为您的 GoEasy Common Key
  modules: ['pubsub'] // 启用发布订阅模块
}

// 聊天室类
class ChatRoom {
  constructor() {
    this.goeasy = null
    this.currentUser = null
    this.currentChannel = 'vue-chat-room' // 默认频道
    this.isConnected = false
    this.messageCallbacks = []
    this.statusCallbacks = []
    this.userCallbacks = []
    this.onlineUsers = new Map()
  }

  // 初始化 GoEasy
  initGoEasy() {
    if (this.goeasy) return Promise.resolve()
    
    return new Promise((resolve, reject) => {
      try {
        // 创建 GoEasy 实例
        this.goeasy = GoEasy.getInstance(CONFIG)
        
        if (this.goeasy && this.goeasy.pubsub) {
          console.log('🔧 GoEasy 实例创建成功')
          
          // 建立连接
          this.goeasy.connect({
            onSuccess: () => {
              console.log('✅ GoEasy 连接成功')
              this.isConnected = true
              this.notifyStatusChange('connected')
              resolve()
            },
            onFailed: (error) => {
              console.error('❌ GoEasy 连接失败:', error)
              this.isConnected = false
              this.notifyStatusChange('error', error)
              reject(error)
            }
          })
        } else {
          throw new Error('GoEasy 实例创建失败或 pubsub 模块不可用')
        }
        
      } catch (error) {
        console.error('GoEasy 初始化失败:', error)
        this.notifyStatusChange('error', error)
        reject(error)
      }
    })
  }

  // 连接到 GoEasy
  connect(userInfo) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.initGoEasy()
        
        this.currentUser = {
          id: userInfo.id || `user_${Date.now()}`,
          username: userInfo.username,
          avatar: userInfo.avatar || '👤',
          joinTime: new Date()
        }

        // GoEasy 不需要显式连接，直接加入频道
        this.joinChannel(this.currentChannel)
        
        console.log('🚀 用户连接成功:', this.currentUser.username)
        resolve(this.currentUser)
        
      } catch (error) {
        console.error('❌ 用户连接失败:', error)
        reject(error)
      }
    })
  }

  // 断开连接
  disconnect() {
    if (this.currentUser) {
      // 发送离开消息
      this.sendSystemMessage(`${this.currentUser.username} 离开了聊天室`, 'leave')
      
      // 从在线用户列表中移除
      this.removeFromOnlineUsers(this.currentUser.id)
    }

    // 断开 GoEasy 连接
    if (this.goeasy && this.isConnected) {
      this.goeasy.disconnect({
        onSuccess: () => {
          console.log('✅ GoEasy 断开连接成功')
        },
        onFailed: (error) => {
          console.error('❌ GoEasy 断开连接失败:', error)
        }
      })
    }
    
    this.currentUser = null
    this.isConnected = false
    this.onlineUsers.clear()
  }

  // 加入频道
  joinChannel(channelName) {
    if (!this.goeasy) {
      console.error('GoEasy 未初始化')
      return
    }
    
    if (!this.isConnected) {
      console.error('GoEasy 尚未连接，无法订阅频道')
      return
    }
    
    this.currentChannel = channelName

    // 订阅消息频道
    this.goeasy.pubsub.subscribe({
      channel: `${channelName}_messages`,
      onMessage: (message) => {
        try {
          const messageData = JSON.parse(message.content)
          this.notifyMessageReceived(messageData)
        } catch (error) {
          console.error('解析消息失败:', error)
        }
      },
      onSuccess: () => {
        console.log(`📻 成功订阅消息频道: ${channelName}_messages`)
        
        // 发送加入消息
        if (this.currentUser) {
          this.sendSystemMessage(`${this.currentUser.username} 加入了聊天室`, 'join')
          this.addToOnlineUsers(this.currentUser)
        }
      },
      onFailed: (error) => {
        console.error('❌ 订阅消息频道失败:', error)
        this.notifyStatusChange('error', error)
      }
    })

    // 订阅用户状态频道
    this.goeasy.pubsub.subscribe({
      channel: `${channelName}_users`,
      onMessage: (message) => {
        try {
          const userData = JSON.parse(message.content)
          this.handleUserStatusMessage(userData)
        } catch (error) {
          console.error('解析用户状态消息失败:', error)
        }
      },
      onSuccess: () => {
        console.log(`👥 成功订阅用户频道: ${channelName}_users`)
      },
      onFailed: (error) => {
        console.error('❌ 订阅用户频道失败:', error)
      }
    })

    // 获取当前在线用户
    this.getOnlineUsers()
  }

  // 发送消息
  sendMessage(content) {
    if (!this.isConnected || !this.currentUser || !this.goeasy) {
      throw new Error('未连接到聊天服务器')
    }

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      username: this.currentUser.username,
      userId: this.currentUser.id,
      avatar: this.currentUser.avatar,
      timestamp: new Date().toISOString(),
      type: 'chat'
    }

    return new Promise((resolve, reject) => {
      this.goeasy.pubsub.publish({
        channel: `${this.currentChannel}_messages`,
        message: JSON.stringify(message),
        onSuccess: () => {
          console.log('📤 消息发送成功')
          resolve(message)
        },
        onFailed: (error) => {
          console.error('❌ 消息发送失败:', error)
          reject(error)
        }
      })
    })
  }

  // 发送系统消息
  sendSystemMessage(content, type = 'system') {
    if (!this.goeasy || !this.isConnected) return

    const message = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      username: '系统',
      userId: 'system',
      avatar: '🤖',
      timestamp: new Date().toISOString(),
      type,
      isSystem: true
    }

    this.goeasy.pubsub.publish({
      channel: `${this.currentChannel}_messages`,
      message: JSON.stringify(message),
      onSuccess: () => {
        console.log('📤 系统消息发送成功')
      },
      onFailed: (error) => {
        console.error('❌ 系统消息发送失败:', error)
      }
    })
  }

  // 处理用户状态消息
  handleUserStatusMessage(userData) {
    switch (userData.action) {
      case 'join':
        this.addToOnlineUsers(userData.user)
        break
      case 'leave':
        this.removeFromOnlineUsers(userData.userId)
        break
      case 'heartbeat':
        this.updateUserActivity(userData.user)
        break
    }
  }

  // 添加到在线用户列表
  addToOnlineUsers(user) {
    this.onlineUsers.set(user.id, {
      ...user,
      lastActivity: new Date()
    })
    this.notifyUserListUpdate()
  }

  // 从在线用户列表移除
  removeFromOnlineUsers(userId) {
    this.onlineUsers.delete(userId)
    this.notifyUserListUpdate()
  }

  // 更新用户活动时间
  updateUserActivity(user) {
    if (this.onlineUsers.has(user.id)) {
      this.onlineUsers.set(user.id, {
        ...this.onlineUsers.get(user.id),
        lastActivity: new Date()
      })
    }
  }

  // 获取在线用户列表
  getOnlineUsers() {
    // 发送心跳，表示当前用户在线
    if (this.currentUser && this.goeasy && this.isConnected) {
      this.goeasy.pubsub.publish({
        channel: `${this.currentChannel}_users`,
        message: JSON.stringify({
          action: 'heartbeat',
          user: this.currentUser,
          timestamp: new Date().toISOString()
        }),
        onSuccess: () => {
          console.log('💓 心跳发送成功')
        },
        onFailed: (error) => {
          console.error('❌ 心跳发送失败:', error)
        }
      })
    }
  }

  // 监听消息
  onMessage(callback) {
    this.messageCallbacks.push(callback)
  }

  // 监听连接状态
  onStatusChange(callback) {
    this.statusCallbacks.push(callback)
  }

  // 监听用户列表变化
  onUserListChange(callback) {
    this.userCallbacks.push(callback)
  }

  // 通知消息接收
  notifyMessageReceived(message) {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message)
      } catch (error) {
        console.error('消息回调执行错误:', error)
      }
    })
  }

  // 通知状态变化
  notifyStatusChange(status, error = null) {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status, error)
      } catch (error) {
        console.error('状态回调执行错误:', error)
      }
    })
  }

  // 通知用户列表更新
  notifyUserListUpdate() {
    const users = Array.from(this.onlineUsers.values())
    this.userCallbacks.forEach(callback => {
      try {
        callback(users)
      } catch (error) {
        console.error('用户列表回调执行错误:', error)
      }
    })
  }

  // 获取当前用户
  getCurrentUser() {
    return this.currentUser
  }

  // 获取连接状态
  getConnectionStatus() {
    return this.isConnected
  }

  // 清理定时器
  cleanup() {
    this.messageCallbacks = []
    this.statusCallbacks = []
    this.userCallbacks = []
  }
}

// 创建单例实例
const chatRoom = new ChatRoom()

// 定期发送心跳
setInterval(() => {
  if (chatRoom.goeasy && chatRoom.currentUser && chatRoom.isConnected) {
    chatRoom.getOnlineUsers()
  }
}, 30000) // 30秒发送一次心跳

export default chatRoom
