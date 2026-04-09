import GoEasy from 'goeasy'

// GoEasy 配置
const CONFIG = {
  host: 'hangzhou.goeasy.io',
  appkey: 'BC-fb81bdd571b148f09c030da31d3e1ddf',
  modules: ['pubsub'] // 只使用发布订阅模块
}

// 游戏房间类 - 用于管理五子棋在线对战
class GameRoom {
  constructor() {
    this.goeasy = null
    this.currentUser = null
    this.isConnected = false
    this.channelName = 'gomoku-game-room'
    
    // 在线玩家列表
    this.onlinePlayers = new Map()
    
    // 当前游戏状态
    this.gameState = {
      isPlaying: false,      // 是否在游戏中
      opponent: null,         // 对手信息
      isMyTurn: false,        // 是否我的回合
      myColor: null,          // 我的棋子颜色 (1=黑, 2=白)
      roomId: null            // 游戏房间ID
    }
    
    // 回调函数
    this.callbacks = {
      onPlayerListUpdate: [],      // 玩家列表更新
      onInviteReceived: [],         // 收到邀请
      onInviteResponse: [],         // 邀请响应
      onGameStart: [],              // 游戏开始
      onMove: [],                   // 对手落子
      onGameEnd: [],                // 游戏结束
      onOpponentLeave: [],          // 对手离开
      onConnectionChange: []        // 连接状态变化
    }
    
    // 心跳定时器
    this.heartbeatTimer = null
  }

  // 初始化 GoEasy
  async initGoEasy() {
    // 如果已连接，直接返回
    if (this.goeasy && this.isConnected) {
      return Promise.resolve()
    }
    
    return new Promise((resolve, reject) => {
      try {
        // 获取 GoEasy 单例实例
        this.goeasy = GoEasy.getInstance(CONFIG)
        
        if (!this.goeasy) {
          throw new Error('GoEasy 实例获取失败')
        }
        
        if (!this.goeasy.pubsub) {
          throw new Error('pubsub 模块不可用')
        }
        
        console.log('🔧 初始化 GoEasy 游戏房间...')
        
        // 尝试连接
        // 注意：如果已经连接，onSuccess 会立即被调用
        this.goeasy.connect({
          onSuccess: () => {
            console.log('🎮 游戏房间 GoEasy 连接成功')
            this.isConnected = true
            this.notifyCallback('onConnectionChange', { connected: true })
            resolve()
          },
          onFailed: (error) => {
            console.error('❌ GoEasy 连接失败:', error)
            // 如果连接失败，检查是否已经连接
            // 某些情况下，已连接时调用 connect 可能返回错误，但实际已连接
            if (error.code === 408 || error.message?.includes('connected')) {
              console.log('🎮 GoEasy 已经连接，直接使用')
              this.isConnected = true
              this.notifyCallback('onConnectionChange', { connected: true })
              resolve()
            } else {
              this.isConnected = false
              this.notifyCallback('onConnectionChange', { connected: false, error })
              reject(error)
            }
          }
        })
        
      } catch (error) {
        console.error('GoEasy 初始化失败:', error)
        this.isConnected = false
        reject(error)
      }
    })
  }

  // 加入游戏房间
  async joinRoom(userInfo) {
    try {
      await this.initGoEasy()
      
      // 确保连接已建立
      if (!this.isConnected) {
        throw new Error('连接未建立')
      }
      
      this.currentUser = {
        id: userInfo.id || `player_${Date.now()}`,
        username: userInfo.username || `玩家${Math.floor(Math.random() * 1000)}`,
        avatar: userInfo.avatar || '🎮',
        status: 'idle', // idle: 空闲, playing: 游戏中
        joinTime: new Date().toISOString()
      }

      // 等待一小段时间确保连接稳定
      await new Promise(resolve => setTimeout(resolve, 100))

      // 订阅玩家列表频道
      this.subscribePlayerChannel()
      
      // 订阅邀请频道（私有频道）
      this.subscribeInviteChannel()
      
      // 订阅游戏频道（用于游戏中的通信）
      this.subscribeGameChannel()
      
      // 广播自己加入
      await this.broadcastPlayerJoin()
      
      // 启动心跳
      this.startHeartbeat()
      
      console.log('🚀 成功加入游戏房间:', this.currentUser.username)
      return this.currentUser
      
    } catch (error) {
      console.error('❌ 加入游戏房间失败:', error)
      throw error
    }
  }

  // 离开游戏房间
  disconnect() {
    if (this.currentUser) {
      this.broadcastPlayerLeave()
    }
    
    // 停止心跳
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    
    // 断开连接
    if (this.goeasy && this.isConnected) {
      this.goeasy.disconnect({
        onSuccess: () => {
          console.log('✅ 游戏房间断开连接')
        }
      })
    }
    
    this.currentUser = null
    this.isConnected = false
    this.onlinePlayers.clear()
    this.resetGameState(true) // 断开连接时取消订阅
  }

  // 订阅玩家列表频道
  subscribePlayerChannel() {
    if (!this.isConnected || !this.goeasy) {
      console.error('GoEasy 未连接，无法订阅频道')
      return
    }
    
    this.goeasy.pubsub.subscribe({
      channel: `${this.channelName}_players`,
      onMessage: (message) => {
        try {
          const data = JSON.parse(message.content)
          this.handlePlayerMessage(data)
        } catch (error) {
          console.error('解析玩家消息失败:', error)
        }
      },
      onSuccess: () => {
        console.log('📻 订阅玩家列表频道成功')
      },
      onFailed: (error) => {
        console.error('❌ 订阅玩家列表频道失败:', error)
      }
    })
  }

  // 订阅邀请频道（私有频道）
  subscribeInviteChannel() {
    if (!this.isConnected || !this.goeasy) {
      console.error('GoEasy 未连接，无法订阅频道')
      return
    }
    
    this.goeasy.pubsub.subscribe({
      channel: `${this.channelName}_invite_${this.currentUser.id}`,
      onMessage: (message) => {
        try {
          const data = JSON.parse(message.content)
          this.handleInviteMessage(data)
        } catch (error) {
          console.error('解析邀请消息失败:', error)
        }
      },
      onSuccess: () => {
        console.log('📻 订阅邀请频道成功')
      },
      onFailed: (error) => {
        console.error('❌ 订阅邀请频道失败:', error)
      }
    })
  }

  // 订阅游戏频道
  subscribeGameChannel() {
    // 游戏频道会在开始游戏时动态订阅
    console.log('游戏频道准备就绪')
  }

  // 处理玩家消息
  handlePlayerMessage(data) {
    switch (data.type) {
      case 'join':
        // 有玩家加入
        if (data.player.id !== this.currentUser.id) {
          this.onlinePlayers.set(data.player.id, data.player)
          console.log('👥 玩家加入:', data.player.username)
          
          // 回复自己的状态（让新加入的玩家知道我在线）
          setTimeout(() => {
            this.broadcastPlayerStatus()
          }, 500)
        }
        this.notifyCallback('onPlayerListUpdate', Array.from(this.onlinePlayers.values()))
        break
        
      case 'leave':
        // 有玩家离开
        if (data.playerId !== this.currentUser.id) {
          this.onlinePlayers.delete(data.playerId)
          console.log('👋 玩家离开:', data.playerId)
          
          // 如果离开的是对手，结束游戏并取消订阅
          if (this.gameState.opponent && this.gameState.opponent.id === data.playerId) {
            this.notifyCallback('onOpponentLeave', data)
            this.resetGameState(true) // 对手离开时取消订阅
          }
        }
        this.notifyCallback('onPlayerListUpdate', Array.from(this.onlinePlayers.values()))
        break
        
      case 'status':
        // 玩家状态更新
        if (data.player.id !== this.currentUser.id) {
          this.onlinePlayers.set(data.player.id, data.player)
        }
        this.notifyCallback('onPlayerListUpdate', Array.from(this.onlinePlayers.values()))
        break
        
      case 'heartbeat':
        // 心跳消息
        if (data.player.id !== this.currentUser.id) {
          this.onlinePlayers.set(data.player.id, data.player)
        }
        break
    }
  }

  // 处理邀请消息
  handleInviteMessage(data) {
    switch (data.type) {
      case 'invite':
        // 收到对战邀请
        console.log('📧 收到对战邀请:', data.from.username)
        this.notifyCallback('onInviteReceived', data)
        break
        
      case 'accept':
        // 对方接受邀请
        console.log('✅ 对方接受邀请:', data.from.username)
        this.notifyCallback('onInviteResponse', { accepted: true, player: data.from, roomId: data.roomId })
        
        // 作为邀请方，我是黑棋先手
        this.startGame(data.from, data.roomId, 1)
        break
        
      case 'reject':
        // 对方拒绝邀请
        console.log('❌ 对方拒绝邀请:', data.from.username)
        this.notifyCallback('onInviteResponse', { accepted: false, player: data.from })
        break
    }
  }

  // 广播玩家加入
  broadcastPlayerJoin() {
    return this.publish(`${this.channelName}_players`, {
      type: 'join',
      player: this.currentUser
    })
  }

  // 广播玩家离开
  broadcastPlayerLeave() {
    return this.publish(`${this.channelName}_players`, {
      type: 'leave',
      playerId: this.currentUser.id
    })
  }

  // 广播玩家状态
  broadcastPlayerStatus() {
    return this.publish(`${this.channelName}_players`, {
      type: 'status',
      player: this.currentUser
    })
  }

  // 发送心跳
  sendHeartbeat() {
    if (!this.isConnected || !this.currentUser) return
    
    this.publish(`${this.channelName}_players`, {
      type: 'heartbeat',
      player: this.currentUser
    })
  }

  // 启动心跳
  startHeartbeat() {
    // 每10秒发送一次心跳
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
      
      // 清理超时的玩家（30秒没有心跳）
      const now = Date.now()
      for (const [playerId, player] of this.onlinePlayers.entries()) {
        const lastUpdate = new Date(player.joinTime).getTime()
        if (now - lastUpdate > 30000) {
          this.onlinePlayers.delete(playerId)
          this.notifyCallback('onPlayerListUpdate', Array.from(this.onlinePlayers.values()))
        }
      }
    }, 10000)
  }

  // 发送对战邀请
  async sendInvite(targetPlayer) {
    if (!this.isConnected || !this.currentUser) {
      throw new Error('未连接到服务器')
    }
    
    if (this.gameState.isPlaying) {
      throw new Error('您正在游戏中')
    }
    
    if (targetPlayer.status === 'playing') {
      throw new Error('对方正在游戏中')
    }
    
    // 生成房间ID
    const roomId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 发送邀请到对方的私有频道
    return this.publish(`${this.channelName}_invite_${targetPlayer.id}`, {
      type: 'invite',
      from: this.currentUser,
      roomId: roomId,
      timestamp: new Date().toISOString()
    })
  }

  // 接受对战邀请
  async acceptInvite(inviteData) {
    if (this.gameState.isPlaying) {
      throw new Error('您正在游戏中')
    }
    
    // 发送接受消息到邀请方
    await this.publish(`${this.channelName}_invite_${inviteData.from.id}`, {
      type: 'accept',
      from: this.currentUser,
      roomId: inviteData.roomId,
      timestamp: new Date().toISOString()
    })
    
    // 作为被邀请方，我是白棋后手
    this.startGame(inviteData.from, inviteData.roomId, 2)
  }

  // 拒绝对战邀请
  async rejectInvite(inviteData) {
    // 发送拒绝消息到邀请方
    return this.publish(`${this.channelName}_invite_${inviteData.from.id}`, {
      type: 'reject',
      from: this.currentUser,
      timestamp: new Date().toISOString()
    })
  }

  // 开始游戏
  startGame(opponent, roomId, myColor) {
    // 如果roomId相同，说明是再来一局，保持现有订阅
    const isRematch = this.gameState.roomId === roomId
    
    this.gameState = {
      isPlaying: true,
      opponent: opponent,
      isMyTurn: myColor === 1, // 黑棋先手
      myColor: myColor,
      roomId: roomId
    }
    
    // 更新自己的状态为游戏中
    this.currentUser.status = 'playing'
    this.broadcastPlayerStatus()
    
    // 只在新游戏时订阅，再来一局时使用现有订阅
    if (!isRematch) {
      // 订阅游戏房间频道
      this.goeasy.pubsub.subscribe({
        channel: `${this.channelName}_game_${roomId}`,
        onMessage: (message) => {
          try {
            const data = JSON.parse(message.content)
            this.handleGameMessage(data)
          } catch (error) {
            console.error('解析游戏消息失败:', error)
          }
        },
        onSuccess: () => {
          console.log('🎮 订阅游戏频道成功:', roomId)
        },
        onFailed: (error) => {
          console.error('❌ 订阅游戏频道失败:', error)
        }
      })
    } else {
      console.log('🔄 复用现有游戏频道:', roomId)
    }
    
    console.log('🎮 游戏开始! 对手:', opponent.username, '我的颜色:', myColor === 1 ? '黑棋' : '白棋')
    this.notifyCallback('onGameStart', {
      opponent: opponent,
      myColor: myColor,
      isMyTurn: myColor === 1
    })
  }

  // 处理游戏消息
  handleGameMessage(data) {
    switch (data.type) {
      case 'move':
        // 对手落子
        if (data.from.id !== this.currentUser.id) {
          console.log('📍 对手落子:', data.move)
          this.gameState.isMyTurn = true
          this.notifyCallback('onMove', data.move)
        }
        break
        
      case 'end':
        // 游戏结束
        console.log('🏁 游戏结束:', data.result)
        this.notifyCallback('onGameEnd', data.result)
        this.resetGameState()
        break
        
      case 'surrender':
        // 对手认输（忽略自己发送的认输消息）
        if (data.from.id !== this.currentUser.id) {
          console.log('🏳️ 对手认输')
          this.notifyCallback('onGameEnd', { 
            winner: this.currentUser.id, 
            reason: 'surrender' 
          })
          this.resetGameState()
        }
        break
    }
  }

  // 发送落子消息
  async sendMove(move) {
    if (!this.gameState.isPlaying) {
      throw new Error('游戏未开始')
    }
    
    if (!this.gameState.isMyTurn) {
      throw new Error('还没轮到你')
    }
    
    this.gameState.isMyTurn = false
    
    return this.publish(`${this.channelName}_game_${this.gameState.roomId}`, {
      type: 'move',
      from: this.currentUser,
      move: move,
      timestamp: new Date().toISOString()
    })
  }

  // 发送游戏结束消息
  async sendGameEnd(result) {
    if (!this.gameState.isPlaying) return
    
    await this.publish(`${this.channelName}_game_${this.gameState.roomId}`, {
      type: 'end',
      from: this.currentUser,
      result: result,
      timestamp: new Date().toISOString()
    })
    
    this.resetGameState()
  }

  // 认输
  async surrender() {
    if (!this.gameState.isPlaying) {
      throw new Error('游戏未开始')
    }
    
    await this.publish(`${this.channelName}_game_${this.gameState.roomId}`, {
      type: 'surrender',
      from: this.currentUser,
      timestamp: new Date().toISOString()
    })
    
    this.notifyCallback('onGameEnd', { 
      winner: this.gameState.opponent.id, 
      reason: 'surrender' 
    })
    this.resetGameState()
  }

  // 重置游戏状态
  resetGameState(unsubscribe = false) {
    // 只在明确要求时才取消订阅游戏频道
    if (unsubscribe && this.gameState.roomId) {
      this.goeasy.pubsub.unsubscribe({
        channel: `${this.channelName}_game_${this.gameState.roomId}`,
        onSuccess: () => {
          console.log('📻 取消订阅游戏频道')
        }
      })
    }
    
    // 保存roomId用于可能的重新对战
    const savedRoomId = this.gameState.roomId
    const savedOpponent = this.gameState.opponent
    
    this.gameState = {
      isPlaying: false,
      opponent: unsubscribe ? null : savedOpponent, // 游戏结束时保留对手信息
      isMyTurn: false,
      myColor: null,
      roomId: unsubscribe ? null : savedRoomId // 游戏结束时保留roomId
    }
    
    // 更新状态为空闲
    if (this.currentUser) {
      this.currentUser.status = 'idle'
      this.broadcastPlayerStatus()
    }
  }
  
  // 清理游戏频道（返回大厅时使用）
  clearGameChannel() {
    if (this.gameState.roomId) {
      this.goeasy.pubsub.unsubscribe({
        channel: `${this.channelName}_game_${this.gameState.roomId}`,
        onSuccess: () => {
          console.log('📻 清理游戏频道')
        }
      })
    }
    
    this.gameState = {
      isPlaying: false,
      opponent: null,
      isMyTurn: false,
      myColor: null,
      roomId: null
    }
  }

  // 发布消息
  publish(channel, data) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.goeasy) {
        reject(new Error('未连接到服务器'))
        return
      }
      
      this.goeasy.pubsub.publish({
        channel: channel,
        message: JSON.stringify(data),
        onSuccess: () => {
          resolve()
        },
        onFailed: (error) => {
          console.error('❌ 发送消息失败:', error)
          reject(error)
        }
      })
    })
  }

  // 注册回调
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback)
    }
  }

  // 注销回调
  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback)
    }
  }

  // 通知回调
  notifyCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`回调执行失败 [${event}]:`, error)
        }
      })
    }
  }

  // 获取在线玩家列表
  getOnlinePlayers() {
    return Array.from(this.onlinePlayers.values()).filter(
      player => player.id !== this.currentUser?.id
    )
  }

  // 获取当前用户
  getCurrentUser() {
    return this.currentUser
  }

  // 获取游戏状态
  getGameState() {
    return this.gameState
  }
}

// 创建单例实例
const gameRoom = new GameRoom()

export default gameRoom
