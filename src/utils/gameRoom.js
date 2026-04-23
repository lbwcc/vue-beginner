import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'

const wsEndpoint = () => {
  const backendOrigin = String(import.meta.env.VITE_BACKEND_ORIGIN || '').trim().replace(/\/+$/, '')
  if (backendOrigin) {
    return `${backendOrigin}/lb-api/ws`
  }
  if (typeof window === 'undefined') {
    return '/lb-api/ws'
  }
  return `${window.location.origin}/lb-api/ws`
}

class GameRoom {
  constructor() {
    this.client = null
    this.currentUser = null
    this.isConnected = false
    this.onlinePlayers = new Map()
    this.playerSub = null
    this.userSub = null
    this.roomSub = null
    this.gameState = {
      isPlaying: false,
      opponent: null,
      isMyTurn: false,
      myColor: null,
      roomId: null,
    }
    this.callbacks = {
      onPlayerListUpdate: [],
      onInviteReceived: [],
      onInviteResponse: [],
      onGameStart: [],
      onMove: [],
      onGameEnd: [],
      onOpponentLeave: [],
      onConnectionChange: [],
    }
  }

  async initSocket() {
    if (this.client && this.isConnected) return

    await new Promise((resolve, reject) => {
      let settled = false
      const done = (fn) => (payload) => {
        if (settled) return
        settled = true
        fn(payload)
      }

      const resolveOnce = done(resolve)
      const rejectOnce = done(reject)

      const client = new Client({
        webSocketFactory: () => new SockJS(wsEndpoint()),
        reconnectDelay: 3000,
        onConnect: () => {
          this.client = client
          this.isConnected = true
          this.subscribePlayers()
          this.notifyCallback('onConnectionChange', { connected: true })
          resolveOnce()
        },
        onStompError: (frame) => {
          this.isConnected = false
          const message = frame?.headers?.message || 'STOMP 连接失败'
          const error = new Error(message)
          this.notifyCallback('onConnectionChange', { connected: false, error })
          rejectOnce(error)
        },
        onWebSocketError: () => {
          this.isConnected = false
          const error = new Error('WebSocket 连接失败，请确认 Java 服务已启动')
          this.notifyCallback('onConnectionChange', { connected: false, error })
          rejectOnce(error)
        },
        onWebSocketClose: () => {
          this.isConnected = false
          this.notifyCallback('onConnectionChange', { connected: false })
          this.onlinePlayers.clear()
          this.notifyCallback('onPlayerListUpdate', [])
          this.unsubscribeRoom()
          this.resetGameState()
        },
      })

      client.activate()

      setTimeout(() => {
        if (settled) return
        rejectOnce(new Error('连接在线对战超时，请检查 Java 服务状态'))
      }, 20000)
    })
  }

  subscribePlayers() {
    if (!this.client || this.playerSub) return

    this.playerSub = this.client.subscribe('/topic/gomoku/players', (frame) => {
      let players = []
      try {
        players = JSON.parse(frame.body || '[]')
      } catch {
        players = []
      }

      this.onlinePlayers.clear()
      ;(Array.isArray(players) ? players : []).forEach((player) => {
        this.onlinePlayers.set(String(player.id), player)
      })
      this.notifyCallback('onPlayerListUpdate', this.getVisiblePlayers())
    })
  }

  subscribeUserChannel() {
    if (!this.client || !this.currentUser?.id) return

    if (this.userSub) {
      this.userSub.unsubscribe()
      this.userSub = null
    }

    this.userSub = this.client.subscribe(`/topic/gomoku/user.${this.currentUser.id}`, (frame) => {
      let payload = null
      try {
        payload = JSON.parse(frame.body || '{}')
      } catch {
        payload = null
      }

      if (!payload || !payload.type) return

      if (payload.type === 'invite') {
        this.notifyCallback('onInviteReceived', payload)
        return
      }

      if (payload.type === 'invite-response') {
        this.notifyCallback('onInviteResponse', payload)
        return
      }

      if (payload.type === 'game-start') {
        this.gameState = {
          isPlaying: true,
          opponent: payload.opponent,
          isMyTurn: payload.myColor === 1,
          myColor: payload.myColor,
          roomId: payload.roomId,
        }
        this.subscribeRoom(payload.roomId)
        this.notifyCallback('onGameStart', payload)
      }
    })
  }

  subscribeRoom(roomId) {
    if (!this.client || !roomId) return

    this.unsubscribeRoom()
    this.roomSub = this.client.subscribe(`/topic/gomoku/room.${roomId}`, (frame) => {
      let payload = null
      try {
        payload = JSON.parse(frame.body || '{}')
      } catch {
        payload = null
      }

      if (!payload || !payload.type) return

      if (payload.type === 'move') {
        const selfId = String(this.currentUser?.id)
        const moverId = String(payload.playerId ?? '')
        const isSelfMove = moverId && selfId && moverId === selfId

        this.gameState.isMyTurn = !isSelfMove
        if (!isSelfMove) {
          this.notifyCallback('onMove', payload)
        }
        return
      }

      if (payload.type === 'game-end') {
        this.notifyCallback('onGameEnd', payload)
        this.unsubscribeRoom()
        this.resetGameState()
        return
      }

      if (payload.type === 'opponent-left') {
        this.notifyCallback('onOpponentLeave', payload)
        this.unsubscribeRoom()
        this.resetGameState()
      }
    })
  }

  unsubscribeRoom() {
    if (this.roomSub) {
      this.roomSub.unsubscribe()
      this.roomSub = null
    }
  }

  publish(destination, body) {
    if (!this.client || !this.isConnected) {
      throw new Error('尚未连接在线对战服务')
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body || {}),
    })
  }

  async joinRoom(userInfo) {
    await this.initSocket()

    this.currentUser = {
      id: userInfo.id || `player_${Date.now()}`,
      username: userInfo.username || `玩家${Math.floor(Math.random() * 1000)}`,
      avatar: userInfo.avatar || '🎮',
      status: 'idle',
      joinTime: new Date().toISOString(),
    }

    this.subscribeUserChannel()
    this.publish('/app/gomoku/join', this.currentUser)

    return this.currentUser
  }

  disconnect() {
    if (this.client && this.isConnected && this.currentUser) {
      try {
        this.publish('/app/gomoku/leave-lobby', { userId: this.currentUser.id })
      } catch {
        // ignore
      }
    }

    if (this.roomSub) {
      this.roomSub.unsubscribe()
      this.roomSub = null
    }
    if (this.userSub) {
      this.userSub.unsubscribe()
      this.userSub = null
    }
    if (this.playerSub) {
      this.playerSub.unsubscribe()
      this.playerSub = null
    }

    if (this.client) {
      this.client.deactivate()
      this.client = null
    }

    this.isConnected = false
    this.currentUser = null
    this.onlinePlayers.clear()
    this.resetGameState()
  }

  async sendInvite(player) {
    if (!this.currentUser) {
      throw new Error('尚未连接在线对战服务')
    }
    if (this.gameState.isPlaying) {
      throw new Error('当前正在游戏中，无法发起邀请')
    }

    const roomId = `gomoku_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.publish('/app/gomoku/invite', {
      toPlayerId: player.id,
      from: this.currentUser,
      roomId,
    })
  }

  acceptInvite(data) {
    if (!this.currentUser) return

    this.publish('/app/gomoku/invite-response', {
      toPlayerId: data.from.id,
      accepted: true,
      roomId: data.roomId,
      player: this.currentUser,
    })
  }

  rejectInvite(data) {
    if (!this.currentUser) return

    this.publish('/app/gomoku/invite-response', {
      toPlayerId: data.from.id,
      accepted: false,
      roomId: data.roomId,
      player: this.currentUser,
    })
  }

  async sendMove(move) {
    if (!this.gameState.roomId) {
      throw new Error('当前不在对局中')
    }

    this.gameState.isMyTurn = false
    this.publish('/app/gomoku/move', {
      ...move,
      roomId: this.gameState.roomId,
    })
  }

  sendGameEnd(result) {
    if (!this.gameState.roomId) return

    this.publish('/app/gomoku/game-end', {
      ...result,
      roomId: this.gameState.roomId,
    })
  }

  async surrender() {
    if (!this.gameState.roomId || !this.currentUser) {
      throw new Error('当前不在对局中')
    }

    this.publish('/app/gomoku/surrender', {
      roomId: this.gameState.roomId,
      playerId: this.currentUser.id,
    })
  }

  clearGameChannel() {
    if (this.gameState.roomId && this.currentUser) {
      this.publish('/app/gomoku/leave-game', {
        roomId: this.gameState.roomId,
        playerId: this.currentUser.id,
      })
    }

    this.unsubscribeRoom()
    this.resetGameState()
  }

  getGameState() {
    return { ...this.gameState }
  }

  resetGameState() {
    this.gameState = {
      isPlaying: false,
      opponent: null,
      isMyTurn: false,
      myColor: null,
      roomId: null,
    }
  }

  on(eventName, callback) {
    if (!this.callbacks[eventName]) return
    this.callbacks[eventName].push(callback)
  }

  setCallback(eventName, callback) {
    if (!this.callbacks[eventName]) return
    this.callbacks[eventName] = [callback]
  }

  clearCallbacks() {
    Object.keys(this.callbacks).forEach((eventName) => {
      this.callbacks[eventName] = []
    })
  }

  notifyCallback(eventName, payload) {
    const handlers = this.callbacks[eventName] || []
    handlers.forEach((handler) => {
      try {
        handler(payload)
      } catch (error) {
        console.error(`[gameRoom] ${eventName} callback error:`, error)
      }
    })
  }

  getVisiblePlayers() {
    return Array.from(this.onlinePlayers.values()).filter((player) => String(player.id) !== String(this.currentUser?.id))
  }
}

const gameRoom = new GameRoom()

export default gameRoom
