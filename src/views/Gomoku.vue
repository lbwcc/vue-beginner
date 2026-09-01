<template>
  <div ref="gomokuUiRoot" class="content tool-page">
    <button @click="$router.back()" class="back-btn"> 返回</button>
    <div class="gomoku-game">
      
      <div class="game-container">
        <!-- 左侧面板：游戏模式选择 / 在线玩家列表 -->
        <div class="left-panel" v-reveal="{ y: 14, duration: 0.34 }">
          <!-- 游戏模式选择 -->
          <div v-if="!isOnlineMode && !gameState.isPlaying" class="mode-selector">
            <div class="mode-title">选择游戏模式</div>
            <button @click="startLocalGame" class="mode-btn local-mode">
              <span class="mode-icon">🏠</span>
              <span>本地对战</span>
            </button>
            <button @click="showOnlineMode" class="mode-btn online-mode">
              <span class="mode-icon">🌐</span>
              <span>在线对战</span>
            </button>
          </div>

          <!-- 在线模式：连接状态 -->
          <div v-if="isOnlineMode && !isConnected" class="online-login">
            <div class="login-title">连接在线对战</div>
            <div class="login-subtitle" v-if="boundAccount">当前账号：{{ boundAccount.username }}</div>
            <div class="login-subtitle" v-else>请先在日历页面登录账号</div>
            <input
              v-model="username" 
              type="text" 
              placeholder="账号昵称自动带入" 
              class="username-input"
              @keyup.enter="joinGameRoom"
              :disabled="true"
            />
            <button @click="joinGameRoom" :disabled="!boundAccount" class="join-btn">
              <span>重新连接</span>
            </button>
            <button @click="cancelOnlineMode" class="cancel-btn">返回</button>
          </div>

          <!-- 互关好友列表（仅在线可邀请） -->
          <div v-if="isOnlineMode && isConnected && !gameState.isPlaying" class="online-players">
            <div class="players-header">
              <div class="players-title">
                <span class="title-icon">👥</span>
                <span>互关好友 (在线 {{ onlineFriendCount }}/{{ mutualFriends.length }})</span>
              </div>
              <div class="current-user-info">
                <div class="user-avatar">
                  <img v-if="currentUserAvatarUrl" :src="currentUserAvatarUrl" alt="avatar" />
                  <span v-else>{{ currentUserAvatarText }}</span>
                </div>
                <span class="user-name">{{ currentUserInfo?.username }}</span>
              </div>
            </div>
            
            <div class="players-list">
              <div v-if="loadingFriends" class="no-players">正在加载互关列表...</div>
              <div 
                v-for="player in friendPlayers" 
                :key="player.id"
                class="player-item"
                :class="{ playing: player.status === 'playing', offline: player.status === 'offline' }"
              >
                <div class="player-avatar">
                  <img v-if="player.avatarUrl" :src="player.avatarUrl" alt="avatar" />
                  <span v-else>{{ player.avatar }}</span>
                </div>
                <div class="player-details">
                  <div class="player-username">{{ player.username }}</div>
                  <div class="player-status">
                    {{ player.status === 'playing' ? '游戏中' : (player.status === 'offline' ? '离线' : '在线空闲') }}
                  </div>
                  <div class="player-record-line">
                    对战: {{ battleStats.byOpponent[String(player.id)]?.total || 0 }} 场 / 胜 {{ battleStats.byOpponent[String(player.id)]?.win || 0 }} / 负 {{ battleStats.byOpponent[String(player.id)]?.lose || 0 }}
                  </div>
                </div>
                <button 
                  v-if="player.status === 'idle' && !gameState.isPlaying"
                  @click="sendInvite(player)"
                  class="invite-btn"
                  :disabled="pendingInvite === player.id"
                >
                  {{ pendingInvite === player.id ? '邀请中...' : '邀请' }}
                </button>
                <span v-else-if="player.status === 'playing'" class="status-badge">游戏中</span>
                <span v-else class="status-badge offline">离线</span>
              </div>
              
              <div v-if="!loadingFriends && friendPlayers.length === 0" class="no-players">
                暂无互关好友
              </div>
            </div>

            <button @click="leaveGameRoom" class="leave-room-btn">退出在线对战</button>
          </div>

          <!-- 本地对战：玩家信息 -->
          <div v-if="!isOnlineMode" class="local-mode-panel">
            <div class="player-info" :class="{ active: currentPlayer === 1 && !winner }">
              <div class="player-stone black"></div>
              <div class="player-text">
                <div class="player-name">黑棋</div>
                <div class="player-wins">胜场: {{ blackWins }}</div>
              </div>
            </div>
            
            <div class="game-status">
              <div v-if="winner" class="winner-announce">
                <div class="trophy">🏆</div>
                <div>{{ winner === 1 ? '黑棋' : '白棋' }}获胜！</div>
              </div>
              <div v-else-if="isDraw" class="draw-announce">
                <div>平局！</div>
              </div>
              <div v-else class="current-turn">
                <div class="turn-indicator" :class="{ black: currentPlayer === 1, white: currentPlayer === 2 }"></div>
                <div>{{ currentPlayer === 1 ? '黑棋' : '白棋' }}回合</div>
              </div>
            </div>

            <div class="player-info" :class="{ active: currentPlayer === 2 && !winner }">
              <div class="player-stone white"></div>
              <div class="player-text">
                <div class="player-name">白棋</div>
                <div class="player-wins">胜场: {{ whiteWins }}</div>
              </div>
            </div>
          </div>

          <!-- 在线对战：对战信息 -->
          <div v-if="isOnlineMode && gameState.isPlaying" class="online-game-panel">
            <div class="player-info" :class="{ active: currentPlayer === 1 && !winner }">
              <div class="player-stone black"></div>
              <div class="player-text">
                <div class="player-name">
                  {{ gameState.myColor === 1 ? currentUserInfo?.username : gameState.opponent?.username }}
                  {{ gameState.myColor === 1 ? ' (你)' : '' }}
                </div>
              </div>
            </div>
            
            <div class="game-status">
              <div v-if="winner" class="winner-announce">
                <div class="trophy">🏆</div>
                <div>{{ getWinnerName() }}获胜！</div>
              </div>
              <div v-else-if="isDraw" class="draw-announce">
                <div>平局！</div>
              </div>
              <div v-else class="current-turn">
                <div class="turn-indicator" :class="{ black: currentPlayer === 1, white: currentPlayer === 2 }"></div>
                <div>{{ gameState.isMyTurn ? '你的回合' : '对手回合' }}</div>
              </div>
            </div>

            <div class="player-info" :class="{ active: currentPlayer === 2 && !winner }">
              <div class="player-stone white"></div>
              <div class="player-text">
                <div class="player-name">
                  {{ gameState.myColor === 2 ? currentUserInfo?.username : gameState.opponent?.username }}
                  {{ gameState.myColor === 2 ? ' (你)' : '' }}
                </div>
              </div>
            </div>

            <div class="battle-stats-panel">
              <div class="battle-stats-title">历史战绩</div>
              <div class="battle-stats-line">
                我的总战绩: {{ battleStats.total }} 场 / 胜 {{ battleStats.win }} / 负 {{ battleStats.lose }} / 平 {{ battleStats.draw }}
              </div>
              <div class="battle-stats-line">
                对阵 {{ gameState.opponent?.username || '对手' }}: {{ currentOpponentStats.total }} 场 / 胜 {{ currentOpponentStats.win }} / 负 {{ currentOpponentStats.lose }} / 平 {{ currentOpponentStats.draw }}
              </div>
            </div>

            <div class="game-controls">
              <button v-if="!winner" @click="surrenderGame" class="surrender-btn">
                <span class="btn-icon">🏳️</span>
                <span>认输</span>
              </button>
              
              <template v-if="winner">
                <button @click="rematch" class="rematch-btn" :disabled="pendingInvite === gameState.opponent?.id">
                  <span class="btn-icon">🔄</span>
                  <span>{{ pendingInvite === gameState.opponent?.id ? '邀请中...' : '再来一局' }}</span>
                </button>
                <button @click="backToLobby" class="back-lobby-btn">
                  <span class="btn-icon">🏠</span>
                  <span>返回好友列表</span>
                </button>
              </template>
            </div>
          </div>
        </div>

        <div class="board-container" v-reveal="{ y: 12, duration: 0.3, delay: 0.06 }">
          <canvas 
            ref="canvas" 
            :width="canvasWidth" 
            :height="canvasHeight" 
            @click="handleClick"
            @touchstart="handleTouch"
            @mousemove="handleMouseMove"
            @mouseleave="handleMouseLeave"
          />
          <div v-if="showWinFireworks" class="win-fireworks">
            <div
              v-for="burst in fireworkBursts"
              :key="burst.id"
              class="firework-burst"
              :style="{
                left: burst.left,
                top: burst.top,
                width: burst.size,
                height: burst.size,
                '--burst-color': burst.color,
                animationDelay: burst.delay
              }"
            ></div>
          </div>
          <div class="step-info" v-if="moveHistory.length > 0">
            步数: {{ moveHistory.length }}
          </div>
          <div class="rule-tip">
            新规则：非边缘落子后，中心田字格会顺时针旋转 90°
          </div>
        </div>

        <div class="right-panel" v-reveal="{ y: 14, duration: 0.34, delay: 0.1 }">
          <div class="control-buttons">
            <button 
              @click="restart" 
              class="control-btn restart-btn"
              :disabled="isOnlineMode && gameState.isPlaying"
              v-if="!isOnlineMode || (isOnlineMode && !gameState.isPlaying)"
            >
              <span class="btn-icon">🔄</span>
              <span>重新开始</span>
            </button>
            <button 
              @click="undo" 
              :disabled="!canUndo || (isOnlineMode && gameState.isPlaying)" 
              class="control-btn undo-btn"
              v-if="!gameState.isPlaying"
            >
              <span class="btn-icon">↩️</span>
              <span>悔棋</span>
            </button>
            <button @click="toggleSound" class="control-btn sound-btn">
              <span class="btn-icon">{{ soundEnabled ? '🔊' : '🔇' }}</span>
              <span>{{ soundEnabled ? '声音开' : '声音关' }}</span>
            </button>
          </div>

          <div class="move-history">
            <div class="history-title">棋谱记录</div>
            <div class="history-list">
              <div 
                v-for="(move, index) in moveHistory" 
                :key="index"
                class="history-item"
                :class="{ 
                  selected: index === moveHistory.length - 1,
                  black: move.player === 1,
                  white: move.player === 2
                }"
                @click="highlightMove(index)"
              >
                <span class="move-number">{{ index + 1 }}.</span>
                <span class="move-player">{{ move.player === 1 ? '⚫' : '⚪' }}</span>
                <span class="move-position">({{ move.row }}, {{ move.col }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import gameRoom from '@/utils/gameRoom'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchCurrentUserApi } from '@/api/authApi'
import { normalizeFileUrl } from '@/utils/fileUrl'
import { listUserFollowersApi, listUserFollowingApi } from '@/api/userApi'
import { getCurrentAccount, setAuthSession } from '@/utils/auth'
import { appendUserGameRecord, getUserGameRecords } from '@/utils/userGameRecords'


const router = useRouter()
const gomokuUiRoot = ref(null)

const canvas = ref(null)
const canvasWidth = ref(640)
const canvasHeight = ref(640)
const boardSize = 15
const padding = 20
const boardWidth = canvasWidth.value - padding * 2
const cellSize = boardWidth / (boardSize - 1)
const board = ref(Array(boardSize).fill().map(() => Array(boardSize).fill(0)))
const currentPlayer = ref(1) // 1 for black, 2 for white
const winner = ref(null)
const moveHistory = ref([])
const hoverRow = ref(-1)
const hoverCol = ref(-1)
const lastMove = ref(null)
const blackWins = ref(0)
const whiteWins = ref(0)
const soundEnabled = ref(true)
const winningLine = ref([])
const showWinFireworks = ref(false)
const fireworkBursts = ref([])

// 在线对战相关状态
const isOnlineMode = ref(false)
const isConnected = ref(false)
const username = ref('')
const boundAccount = ref(null)
const currentUserInfo = ref(null)
const onlinePlayers = ref([])
const mutualFriends = ref([])
const loadingFriends = ref(false)
const pendingInvite = ref(null)
const isSurrendering = ref(false) // 标记是否是自己主动认输
const hasRegisteredCallbacks = ref(false)
const onlineRecordSaved = ref(false)
const latestTouchAt = ref(0)
const battleStats = ref({
  total: 0,
  win: 0,
  lose: 0,
  draw: 0,
  byOpponent: {}
})
const gameState = ref({
  isPlaying: false,
  opponent: null,
  isMyTurn: false,
  myColor: null,
  roomId: null
})

const onlinePlayerMap = computed(() => {
  return onlinePlayers.value.reduce((map, item) => {
    map.set(String(item.id), item)
    return map
  }, new Map())
})

const onlinePlayerNameMap = computed(() => {
  return onlinePlayers.value.reduce((map, item) => {
    const name = String(item.username || '').trim()
    if (name) {
      map.set(name, item)
    }
    return map
  }, new Map())
})

const isLikelyImage = (text) => {
  if (!text) return false
  const t = String(text || '').trim()
  if (!t) return false
  if (/^(https?:)?\/\//i.test(t)) return true
  if (/^blob:|^data:/.test(t)) return true
  if (t.startsWith('/')) return true
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(t)) return true
  return false
}

const currentUserAvatarUrl = computed(() => {
  const candidate = currentUserInfo?.avatar || boundAccount?.avatar || ''
  return isLikelyImage(candidate) ? normalizeFileUrl(candidate) : ''
})

const currentUserAvatarText = computed(() => {
  const candidate = currentUserInfo?.avatar || boundAccount?.avatar || ''
  return isLikelyImage(candidate) ? '' : (candidate || '👤')
})

const friendPlayers = computed(() => {
  return mutualFriends.value.map((friend) => {
    const online = onlinePlayerMap.value.get(String(friend.id))
      || onlinePlayerNameMap.value.get(String(friend.username || '').trim())
    const status = online?.status || 'offline'
    const candidate = online?.avatar || friend.avatar || friend.avatarUrl || ''
    let avatarUrl = ''
    let avatarText = ''
    if (isLikelyImage(candidate)) {
      avatarUrl = normalizeFileUrl(candidate)
    } else {
      avatarText = candidate || '👤'
    }
    return {
      ...friend,
      avatar: avatarText,
      avatarUrl,
      status,
      online
    }
  })
})

const onlineFriendCount = computed(() => {
  return friendPlayers.value.filter((item) => item.status !== 'offline').length
})

const currentOpponentStats = computed(() => {
  const opponentId = gameState.value.opponent?.id
  if (opponentId == null) {
    return { total: 0, win: 0, lose: 0, draw: 0 }
  }
  return battleStats.value.byOpponent[String(opponentId)] || { total: 0, win: 0, lose: 0, draw: 0 }
})

const parsePayload = (payloadJson) => {
  if (!payloadJson) return null
  try {
    return JSON.parse(payloadJson)
  } catch (error) {
    return null
  }
}

const buildBattleStats = (records) => {
  const summary = {
    total: 0,
    win: 0,
    lose: 0,
    draw: 0,
    byOpponent: {}
  }

  ;(Array.isArray(records) ? records : []).forEach((record) => {
    const payload = parsePayload(record.payloadJson)
    if (!payload || payload.mode !== 'online') return

    const outcome = String(payload.outcome || '').toLowerCase()
    if (!['win', 'lose', 'draw'].includes(outcome)) return

    summary.total += 1
    summary[outcome] += 1

    const opponentKey = String(payload.opponentId || 'unknown')
    if (!summary.byOpponent[opponentKey]) {
      summary.byOpponent[opponentKey] = {
        total: 0,
        win: 0,
        lose: 0,
        draw: 0,
        opponentName: payload.opponentName || '未知对手'
      }
    }

    summary.byOpponent[opponentKey].total += 1
    summary.byOpponent[opponentKey][outcome] += 1
    if (payload.opponentName) {
      summary.byOpponent[opponentKey].opponentName = payload.opponentName
    }
  })

  return summary
}

const loadBattleStats = async () => {
  const records = await getUserGameRecords('gomoku', 300)
  battleStats.value = buildBattleStats(records)
}

const saveGomokuRecord = async ({ outcome, reason, mode = 'local' }) => {
  if (!boundAccount.value?.username) return

  if (mode === 'online' && onlineRecordSaved.value) return

  if (mode === 'online') {
    onlineRecordSaved.value = true
  }

  await appendUserGameRecord('gomoku', {
    mode,
    outcome,
    reason,
    moveCount: moveHistory.value.length,
    roomId: gameState.value.roomId || null,
    opponentId: gameState.value.opponent?.id || null,
    opponentName: gameState.value.opponent?.username || null
  })

  await loadBattleStats()
}

// 性能优化：缓存Canvas上下文和背景
let ctx = null
let backgroundCanvas = null
let backgroundCtx = null
let isDrawing = false
const rotationDuration = 280
const rotationAnimation = ref(null)
let animationFrameId = null
let fireworksTimer = null

const canUndo = computed(() => {
  return moveHistory.value.length > 0 && !winner.value && !gameState.value.isPlaying && !rotationAnimation.value
})
const isDraw = computed(() => moveHistory.value.length === boardSize * boardSize && !winner.value)

// 获取获胜者名称
const getWinnerName = () => {
  if (!winner.value) return ''
  const winnerColor = winner.value
  if (winnerColor === gameState.value.myColor) {
    return '你'
  } else {
    return gameState.value.opponent?.username || '对手'
  }
}

const createFireworkBursts = () => {
  const colors = ['#ffd166', '#ff6b6b', '#7dd3fc', '#c084fc', '#86efac', '#f9a8d4']
  return Array.from({ length: 9 }, (_, index) => ({
    id: `${Date.now()}_${index}`,
    left: `${12 + Math.random() * 76}%`,
    top: `${8 + Math.random() * 54}%`,
    size: `${72 + Math.random() * 48}px`,
    delay: `${(index * 0.12).toFixed(2)}s`,
    color: colors[index % colors.length]
  }))
}

const launchVictoryFireworks = () => {
  if (fireworksTimer) {
    clearTimeout(fireworksTimer)
  }

  fireworkBursts.value = createFireworkBursts()
  showWinFireworks.value = true

  fireworksTimer = setTimeout(() => {
    showWinFireworks.value = false
  }, 2600)
}

const clearWinEffects = () => {
  winningLine.value = []
  showWinFireworks.value = false
  fireworkBursts.value = []

  if (fireworksTimer) {
    clearTimeout(fireworksTimer)
    fireworksTimer = null
  }
}

// ========== 游戏模式选择 ==========
const startLocalGame = () => {
  isOnlineMode.value = false
  restart()
}

const showOnlineMode = () => {
  boundAccount.value = getCurrentAccount()
  if (!boundAccount.value?.username) {
    ElMessage.warning('请先在日历页面登录账号')
    return
  }

  username.value = boundAccount.value.username
  isOnlineMode.value = true
  joinGameRoom()
}

const cancelOnlineMode = () => {
  leaveGameRoom()
}

// ========== 在线对战功能 ==========
const loadMutualFriends = async () => {
  const currentUserId = Number(boundAccount.value?.id)
  if (!Number.isFinite(currentUserId) || currentUserId <= 0) return

  loadingFriends.value = true
  try {
    const [followingRes, followersRes] = await Promise.all([
      listUserFollowingApi(currentUserId),
      listUserFollowersApi(currentUserId)
    ])
    const following = Array.isArray(followingRes?.data?.data) ? followingRes.data.data : []
    const followers = Array.isArray(followersRes?.data?.data) ? followersRes.data.data : []
    const followerIdSet = new Set(
      followers
        .map((item) => Number(item?.id))
        .filter((id) => Number.isFinite(id) && id > 0)
    )

    mutualFriends.value = following
      .filter((item) => followerIdSet.has(Number(item?.id)))
      .map((item) => ({
        id: item.id,
        username: item.username,
        avatar: item.avatar || item.avatarUrl || '👤'
      }))
  } catch (error) {
    console.error('加载互关列表失败:', error)
    ElMessage.error('加载互关列表失败')
  } finally {
    loadingFriends.value = false
  }
}

const isNumericUserId = (value) => {
  if (value === null || value === undefined) return false
  const text = String(value).trim()
  if (!text) return false
  return /^\d+$/.test(text)
}

const ensureBoundAccount = async () => {
  const account = getCurrentAccount()
  if (!account?.username) {
    return null
  }

  if (isNumericUserId(account.id)) {
    return {
      ...account,
      id: Number(account.id)
    }
  }

  try {
    const meRes = await fetchCurrentUserApi()
    const me = meRes?.data?.data
    if (me?.username && isNumericUserId(me.id)) {
      setAuthSession({ token: null, user: { id: Number(me.id), username: me.username, avatar: me.avatar || account.avatar, avatarUrl: me.avatarUrl || account.avatarUrl || '' } })
      return getCurrentAccount()
    }
  } catch (error) {
    console.warn('刷新当前用户信息失败:', error)
  }

  return account
}

const registerGameRoomCallbacks = () => {
  if (hasRegisteredCallbacks.value) return

  gameRoom.setCallback('onPlayerListUpdate', handlePlayerListUpdate)
  gameRoom.setCallback('onInviteReceived', handleInviteReceived)
  gameRoom.setCallback('onInviteResponse', handleInviteResponse)
  gameRoom.setCallback('onGameStart', handleGameStart)
  gameRoom.setCallback('onMove', handleOpponentMove)
  gameRoom.setCallback('onGameEnd', handleGameEnd)
  gameRoom.setCallback('onOpponentLeave', handleOpponentLeave)

  hasRegisteredCallbacks.value = true
}

const joinGameRoom = async () => {
  boundAccount.value = await ensureBoundAccount()
  if (!boundAccount.value?.username) {
    ElMessage.warning('请先在日历页面登录账号')
    return
  }

  if (!isNumericUserId(boundAccount.value.id)) {
    ElMessage.warning('账号信息未同步完成，请重新登录后再试')
    return
  }
  
  try {
    registerGameRoomCallbacks()
    username.value = boundAccount.value.username
    currentUserInfo.value = await gameRoom.joinRoom({
      id: Number(boundAccount.value.id),
      username: boundAccount.value.username,
      avatar: boundAccount.value.avatar || '🎮'
    })
    
    isConnected.value = true
    await Promise.all([loadMutualFriends(), loadBattleStats()])
    ElMessage.success('在线对战已连接')
    
  } catch (error) {
    console.error('连接在线对战失败:', error)
    ElMessage.error('连接在线对战失败，请重试')
  }
}

const leaveGameRoom = () => {
  if (!isConnected.value) {
    doLeaveRoom()
    return
  }

  if (gameState.value.isPlaying) {
    ElMessageBox.confirm('你正在游戏中，确定要离开吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      doLeaveRoom()
    }).catch(() => {
      // 取消
    })
  } else {
    doLeaveRoom()
  }
}

const doLeaveRoom = () => {
  gameRoom.disconnect()
  isConnected.value = false
  isOnlineMode.value = false
  currentUserInfo.value = null
  onlinePlayers.value = []
  mutualFriends.value = []
  pendingInvite.value = null
  isSurrendering.value = false
  onlineRecordSaved.value = false
  gameState.value = {
    isPlaying: false,
    opponent: null,
    isMyTurn: false,
    myColor: null,
    roomId: null
  }
  clearWinEffects()
  ElMessage.info('已退出在线对战')
}

// 处理玩家列表更新
const handlePlayerListUpdate = (players) => {
  onlinePlayers.value = players
}

// 处理收到邀请
const handleInviteReceived = (data) => {
  ElMessageBox.confirm(
    `${data.from.username} 邀请你进行对战，是否接受？`,
    '对战邀请',
    {
      confirmButtonText: '接受',
      cancelButtonText: '拒绝',
      type: 'info'
    }
  ).then(() => {
    gameRoom.acceptInvite(data)
  }).catch(() => {
    gameRoom.rejectInvite(data)
    ElMessage.info('已拒绝对战邀请')
  })
}

// 处理邀请响应
const handleInviteResponse = (data) => {
  pendingInvite.value = null
  
  if (data.accepted) {
    ElMessage.success(`${data.player.username} 接受了你的邀请`)
  } else {
    ElMessage.info(`${data.player.username} 拒绝了你的邀请`)
  }
}

// 发送邀请
const sendInvite = async (player, options = {}) => {
  const { force = false } = options

  if (!player || player.status === 'offline') {
    ElMessage.warning('该好友当前不在线')
    return
  }

  if (player.status === 'playing' && !force) {
    ElMessage.info('该好友正在游戏中')
    return
  }

  try {
    pendingInvite.value = player.id
    await gameRoom.sendInvite(player)
    ElMessage.info(`已向 ${player.username} 发送邀请`)
    
    // 30秒后清除待邀请状态
    setTimeout(() => {
      if (pendingInvite.value === player.id) {
        pendingInvite.value = null
      }
    }, 30000)
    
  } catch (error) {
    console.error('发送邀请失败:', error)
    ElMessage.error(error.message || '发送邀请失败')
    pendingInvite.value = null
  }
}

// 处理游戏开始
const handleGameStart = (data) => {
  gameState.value = gameRoom.getGameState()
  onlineRecordSaved.value = false
  
  // 重置棋盘
  stopRotationAnimation()
  board.value = Array(boardSize).fill().map(() => Array(boardSize).fill(0))
  moveHistory.value = []
  lastMove.value = null
  winner.value = null
  hoverRow.value = -1
  hoverCol.value = -1
  isSurrendering.value = false
  clearWinEffects()
  
  // 设置当前玩家（黑棋先手）
  currentPlayer.value = 1
  
  drawBoard()
  
  ElMessage({
    message: `游戏开始！你是${data.myColor === 1 ? '黑棋（先手）' : '白棋（后手）'}`,
    type: 'success',
    duration: 3000
  })
  
  playSound('place')
}

const finishMove = async (row, col, playerColor, { isRemote = false } = {}) => {
  const previousBoard = cloneBoardState(board.value)
  const preparedBoard = cloneBoardState(board.value)
  preparedBoard[row][col] = playerColor

  const rotationResult = applyRotationRule(preparedBoard, row, col)

  board.value = rotationResult.board
  moveHistory.value.push({
    row,
    col,
    player: playerColor,
    snapshot: previousBoard,
    rotated: rotationResult.rotated
  })
  lastMove.value = { row, col }
  hoverRow.value = -1
  hoverCol.value = -1

  if (!isRemote && gameState.value.isPlaying) {
    gameState.value.isMyTurn = false
    try {
      await gameRoom.sendMove({ row, col, player: playerColor })
    } catch (error) {
      gameState.value.isMyTurn = true
      board.value = previousBoard
      moveHistory.value.pop()
      lastMove.value = moveHistory.value.length > 0
        ? {
            row: moveHistory.value[moveHistory.value.length - 1].row,
            col: moveHistory.value[moveHistory.value.length - 1].col
          }
        : null
      stopRotationAnimation()
      drawBoard()
      throw error
    }
  }

  playSound('place')
  await animateRotation(rotationResult.animation)

  const winnerInfo = getBoardWinner(playerColor)

  if (winnerInfo.player) {
    winner.value = winnerInfo.player
    winningLine.value = winnerInfo.line
    launchVictoryFireworks()

    if (!gameState.value.isPlaying) {
      if (winnerInfo.player === 1) {
        blackWins.value++
      } else {
        whiteWins.value++
      }
      saveGomokuRecord({
        mode: 'local',
        outcome: winnerInfo.player === 1 ? 'black-win' : 'white-win',
        reason: 'win'
      })
    } else {
      const iWon = winnerInfo.player === gameState.value.myColor
      saveGomokuRecord({
        mode: 'online',
        outcome: iWon ? 'win' : 'lose',
        reason: 'win'
      })

      if (!isRemote) {
        setTimeout(() => {
          ElMessage({
            message: iWon ? '你获胜了！' : '对手获胜！',
            type: iWon ? 'success' : 'info',
            duration: 2000
          })
          gameRoom.sendGameEnd({
            winner: winnerInfo.player === gameState.value.myColor
              ? currentUserInfo.value?.id
              : gameState.value.opponent?.id,
            reason: 'win',
            moveCount: moveHistory.value.length
          })
        }, 200)
      } else {
        ElMessage({
          message: iWon ? '你获胜了！' : '对手获胜！',
          type: iWon ? 'success' : 'info',
          duration: 2000
        })
      }
    }

    playSound('win')
  } else if (isDraw.value) {
    playSound('draw')
    saveGomokuRecord({
      mode: gameState.value.isPlaying ? 'online' : 'local',
      outcome: 'draw',
      reason: 'draw'
    })

    if (gameState.value.isPlaying && !isRemote) {
      ElMessage.info('平局！')
      gameRoom.sendGameEnd({
        winner: null,
        reason: 'draw',
        moveCount: moveHistory.value.length
      })
    }
  } else if (gameState.value.isPlaying) {
    currentPlayer.value = isRemote ? gameState.value.myColor : (playerColor === 1 ? 2 : 1)
  } else {
    currentPlayer.value = playerColor === 1 ? 2 : 1
  }

  drawBoard()
}

// 处理对手落子
const handleOpponentMove = async (move) => {
  const { row, col } = move

  if (board.value[row][col] !== 0) {
    console.error('位置已有棋子')
    return
  }

  const opponentColor = gameState.value.myColor === 1 ? 2 : 1
  await finishMove(row, col, opponentColor, { isRemote: true })
  gameState.value.isMyTurn = true
}

// 处理游戏结束
const handleGameEnd = (result) => {
  if (!moveHistory.value.length && !result?.reason) {
    gameState.value = gameRoom.getGameState()
    return
  }

  if (result.reason === 'surrender') {
    // 通过比较 winner 来判断是谁认输
    if (result.winner === currentUserInfo.value?.id) {
      // 对手认输，自己赢了
      ElMessage.success('对手认输，你获胜了！')
      winner.value = gameState.value.myColor
      winningLine.value = []
      launchVictoryFireworks()
      playSound('win')
      saveGomokuRecord({
        mode: 'online',
        outcome: 'win',
        reason: 'opponent-surrender'
      })
    } else {
      // 自己认输，对手赢了（消息已在 surrenderGame 中显示）
      winner.value = gameState.value.myColor === 1 ? 2 : 1
      saveGomokuRecord({
        mode: 'online',
        outcome: 'lose',
        reason: 'self-surrender'
      })
    }
    isSurrendering.value = false
  } else if (result.reason === 'win') {
    // 已在 handleOpponentMove 中处理
  } else if (result.reason === 'draw') {
    // 平局
  }
  
  gameState.value = gameRoom.getGameState()
  gameState.value.isMyTurn = false
}

// 处理对手离开
const handleOpponentLeave = () => {
  ElMessage.warning('对手已离开游戏')
  winner.value = gameState.value.myColor // 判你获胜
  winningLine.value = []
  launchVictoryFireworks()
  playSound('win')
  saveGomokuRecord({
    mode: 'online',
    outcome: 'win',
    reason: 'opponent-left'
  })
  gameState.value.isMyTurn = false
}

// 认输
const surrenderGame = () => {
  ElMessageBox.confirm('确定要认输吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      isSurrendering.value = true
      await gameRoom.surrender()
      ElMessage.info('你认输了')
    } catch (error) {
      console.error('认输失败:', error)
      ElMessage.error('认输失败，请重试')
      isSurrendering.value = false
    }
  }).catch(() => {
    // 取消
  })
}

// 再来一局
const rematch = async () => {
  if (!gameState.value.opponent) {
    ElMessage.warning('对手信息不存在')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `向 ${gameState.value.opponent.username || '对手'} 发起“再来一局”邀请？`,
      '再来一局',
      {
        confirmButtonText: '发起邀请',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    await sendInvite(gameState.value.opponent, { force: true })
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('发送再战邀请失败:', error)
      ElMessage.error('发送邀请失败')
    }
  }
}

// 返回大厅
const backToLobby = () => {
  // 清理游戏频道并重置状态
  gameRoom.clearGameChannel()
  
  // 重置本地游戏界面
  stopRotationAnimation()
  board.value = Array(boardSize).fill().map(() => Array(boardSize).fill(0))
  moveHistory.value = []
  lastMove.value = null
  winner.value = null
  hoverRow.value = -1
  hoverCol.value = -1
  currentPlayer.value = 1
  isSurrendering.value = false
  onlineRecordSaved.value = false
  clearWinEffects()
  
  // 同步游戏状态（会触发界面切换到玩家列表）
  gameState.value = gameRoom.getGameState()
  
  drawBoard()
  ElMessage.success('已结束当前对局')
}

// ========== 原有游戏逻辑 ==========

// 性能优化：初始化背景Canvas
const initBackground = () => {
  backgroundCanvas = document.createElement('canvas')
  backgroundCanvas.width = canvasWidth.value
  backgroundCanvas.height = canvasHeight.value
  backgroundCtx = backgroundCanvas.getContext('2d')

  // 绘制背景
  const gradient = backgroundCtx.createLinearGradient(0, 0, canvasWidth.value, canvasHeight.value)
  gradient.addColorStop(0, '#dcb35c')
  gradient.addColorStop(1, '#c9a854')
  backgroundCtx.fillStyle = gradient
  backgroundCtx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)

  // 绘制边框
  backgroundCtx.strokeStyle = '#8b7355'
  backgroundCtx.lineWidth = 3
  backgroundCtx.strokeRect(padding - 10, padding - 10, boardWidth + 20, boardWidth + 20)

  // 绘制网格
  backgroundCtx.strokeStyle = '#000'
  backgroundCtx.lineWidth = 1
  for (let i = 0; i < boardSize; i++) {
    // 垂直线
    backgroundCtx.beginPath()
    backgroundCtx.moveTo(padding + i * cellSize, padding)
    backgroundCtx.lineTo(padding + i * cellSize, padding + boardWidth)
    backgroundCtx.stroke()

    // 水平线
    backgroundCtx.beginPath()
    backgroundCtx.moveTo(padding, padding + i * cellSize)
    backgroundCtx.lineTo(padding + boardWidth, padding + i * cellSize)
    backgroundCtx.stroke()
  }

  // 绘制星位
  const starPoints = [
    [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
  ]
  backgroundCtx.fillStyle = '#000'
  starPoints.forEach(([row, col]) => {
    backgroundCtx.beginPath()
    backgroundCtx.arc(padding + col * cellSize, padding + row * cellSize, 4, 0, 2 * Math.PI)
    backgroundCtx.fill()
  })
}

const stopRotationAnimation = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  rotationAnimation.value = null
}

const cloneBoardState = (sourceBoard = board.value) => sourceBoard.map(row => [...row])

const canRotateArea = (centerRow, centerCol) => {
  return centerRow > 0 && centerRow < boardSize - 1 && centerCol > 0 && centerCol < boardSize - 1
}

const applyRotationRule = (sourceBoard, centerRow, centerCol) => {
  const nextBoard = cloneBoardState(sourceBoard)

  if (!canRotateArea(centerRow, centerCol)) {
    return {
      board: nextBoard,
      rotated: false,
      animation: null
    }
  }

  const originalBoard = cloneBoardState(sourceBoard)
  const animatedCells = []

  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      const sourceRow = centerRow + rowOffset
      const sourceCol = centerCol + colOffset
      const targetRow = centerRow + colOffset
      const targetCol = centerCol - rowOffset

      nextBoard[targetRow][targetCol] = originalBoard[sourceRow][sourceCol]
      animatedCells.push({
        row: sourceRow,
        col: sourceCol,
        player: originalBoard[sourceRow][sourceCol]
      })
    }
  }

  return {
    board: nextBoard,
    rotated: true,
    animation: {
      centerRow,
      centerCol,
      progress: 0,
      cells: animatedCells
    }
  }
}

const getWinningLine = (row, col, playerColor = null) => {
  const color = playerColor || currentPlayer.value
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ]

  for (const [dx, dy] of directions) {
    const line = [{ row, col }]

    let r = row + dx
    let c = col + dy
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board.value[r][c] === color) {
      line.push({ row: r, col: c })
      r += dx
      c += dy
    }

    r = row - dx
    c = col - dy
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board.value[r][c] === color) {
      line.unshift({ row: r, col: c })
      r -= dx
      c -= dy
    }

    if (line.length >= 5) {
      return line
    }
  }

  return []
}

const getBoardWinner = (priorityPlayer = null) => {
  const playersToCheck = priorityPlayer
    ? [priorityPlayer, priorityPlayer === 1 ? 2 : 1]
    : [1, 2]

  for (const player of playersToCheck) {
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board.value[row][col] === player) {
          const line = getWinningLine(row, col, player)
          if (line.length >= 5) {
            return { player, line }
          }
        }
      }
    }
  }

  return { player: null, line: [] }
}

const easeInOutCubic = (progress) => {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2
}

const animateRotation = (animationData) => {
  return new Promise((resolve) => {
    if (!animationData) {
      stopRotationAnimation()
      drawBoard()
      resolve()
      return
    }

    stopRotationAnimation()
    const startTime = performance.now()

    const step = (now) => {
      const rawProgress = Math.min((now - startTime) / rotationDuration, 1)
      rotationAnimation.value = {
        ...animationData,
        progress: easeInOutCubic(rawProgress)
      }
      drawBoard()

      if (rawProgress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        stopRotationAnimation()
        drawBoard()
        resolve()
      }
    }

    rotationAnimation.value = {
      ...animationData,
      progress: 0
    }
    drawBoard()
    animationFrameId = requestAnimationFrame(step)
  })
}

const drawRotationAnimation = (ctx, animation) => {
  const centerX = padding + animation.centerCol * cellSize
  const centerY = padding + animation.centerRow * cellSize
  const angle = animation.progress * (Math.PI / 2)
  const frameSize = cellSize * 3 - 10

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(angle)
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)'
  ctx.lineWidth = 3
  ctx.setLineDash([10, 6])
  ctx.strokeRect(-frameSize / 2, -frameSize / 2, frameSize, frameSize)
  ctx.restore()
  ctx.setLineDash([])

  animation.cells.forEach((cell) => {
    if (cell.player === 0) return

    const sourceX = padding + cell.col * cellSize
    const sourceY = padding + cell.row * cellSize
    const offsetX = sourceX - centerX
    const offsetY = sourceY - centerY
    const rotatedX = centerX + offsetX * Math.cos(angle) - offsetY * Math.sin(angle)
    const rotatedY = centerY + offsetX * Math.sin(angle) + offsetY * Math.cos(angle)
    const pulseScale = 1 + 0.05 * Math.sin(animation.progress * Math.PI)

    drawStoneAt(ctx, rotatedX, rotatedY, cell.player, pulseScale)
  })
}

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

const drawWinningHighlight = (ctx, line) => {
  if (!line || line.length < 5) return

  ctx.save()
  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = 3
  ctx.shadowColor = 'rgba(255, 215, 0, 0.65)'
  ctx.shadowBlur = 14
  ctx.fillStyle = 'rgba(255, 215, 0, 0.08)'

  line.forEach(({ row, col }) => {
    const x = padding + col * cellSize - cellSize / 2 + 5
    const y = padding + row * cellSize - cellSize / 2 + 5
    const size = cellSize - 10

    drawRoundedRect(ctx, x, y, size, size, 10)
    ctx.fill()
    ctx.stroke()
  })

  ctx.beginPath()
  line.forEach(({ row, col }, index) => {
    const x = padding + col * cellSize
    const y = padding + row * cellSize
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.55)'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 5])
  ctx.stroke()
  ctx.restore()
}

const drawBoard = () => {
  if (isDrawing || !canvas.value || !backgroundCanvas) return
  isDrawing = true

  requestAnimationFrame(() => {
    if (!canvas.value) {
      isDrawing = false
      return
    }

    if (!ctx) ctx = canvas.value.getContext('2d')
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
    ctx.drawImage(backgroundCanvas, 0, 0)

    const activeRotation = rotationAnimation.value

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board.value[row][col] !== 0) {
          if (
            activeRotation &&
            Math.abs(row - activeRotation.centerRow) <= 1 &&
            Math.abs(col - activeRotation.centerCol) <= 1
          ) {
            continue
          }
          drawStone(ctx, row, col, board.value[row][col])
        }
      }
    }

    if (activeRotation) {
      drawRotationAnimation(ctx, activeRotation)
    }

    if (!activeRotation && winningLine.value.length >= 5) {
      drawWinningHighlight(ctx, winningLine.value)
    }

    if (lastMove.value) {
      const { row, col } = lastMove.value
      ctx.save()
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(padding + col * cellSize, padding + row * cellSize, cellSize / 2 - 4, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.restore()
    }

    if (
      !activeRotation &&
      hoverRow.value >= 0 &&
      hoverCol.value >= 0 &&
      board.value[hoverRow.value][hoverCol.value] === 0 &&
      !winner.value
    ) {
      ctx.globalAlpha = 0.3
      drawStone(ctx, hoverRow.value, hoverCol.value, currentPlayer.value)
      ctx.globalAlpha = 1
    }

    isDrawing = false
  })
}

const drawStoneAt = (ctx, x, y, player, scale = 1) => {
  const radius = (cellSize / 2 - 3) * scale

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 5
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2

  if (player === 1) {
    const gradient = ctx.createRadialGradient(x - radius / 3, y - radius / 3, radius / 10, x, y, radius)
    gradient.addColorStop(0, '#666')
    gradient.addColorStop(1, '#000')
    ctx.fillStyle = gradient
  } else {
    const gradient = ctx.createRadialGradient(x - radius / 3, y - radius / 3, radius / 10, x, y, radius)
    gradient.addColorStop(0, '#fff')
    gradient.addColorStop(1, '#ddd')
    ctx.fillStyle = gradient
  }

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.fill()

  ctx.strokeStyle = player === 1 ? '#333' : '#aaa'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

const drawStone = (ctx, row, col, player, scale = 1) => {
  const x = padding + col * cellSize
  const y = padding + row * cellSize
  drawStoneAt(ctx, x, y, player, scale)
}

const getPosition = (event, snapMultiplier = 0.45) => {
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // 计算缩放比例
  const scaleX = canvasWidth.value / rect.width
  const scaleY = canvasHeight.value / rect.height
  
  // 转换为canvas坐标
  const canvasX = x * scaleX
  const canvasY = y * scaleY
  
  const col = Math.round((canvasX - padding) / cellSize)
  const row = Math.round((canvasY - padding) / cellSize)

  if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
    return { row: -1, col: -1 }
  }

  const centerX = padding + col * cellSize
  const centerY = padding + row * cellSize
  const distance = Math.hypot(canvasX - centerX, canvasY - centerY)
  const threshold = cellSize * snapMultiplier

  if (distance > threshold) {
    return { row: -1, col: -1 }
  }

  return { row, col }
}

const handleMouseMove = (event) => {
  if (winner.value || rotationAnimation.value) return
  
  const { row, col } = getPosition(event)
  
  if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
    if (hoverRow.value !== row || hoverCol.value !== col) {
      hoverRow.value = row
      hoverCol.value = col
      drawBoard()
    }
  } else {
    if (hoverRow.value !== -1 || hoverCol.value !== -1) {
      hoverRow.value = -1
      hoverCol.value = -1
      drawBoard()
    }
  }
}

const handleMouseLeave = () => {
  hoverRow.value = -1
  hoverCol.value = -1
  drawBoard()
}

const tryPlaceStone = async (row, col) => {
  if (row < 0 || row >= boardSize || col < 0 || col >= boardSize || board.value[row][col] !== 0) {
    return
  }

  const playerColor = gameState.value.isPlaying ? gameState.value.myColor : currentPlayer.value

  try {
    await finishMove(row, col, playerColor)
  } catch (error) {
    console.error('发送落子消息失败:', error)
    ElMessage.error('落子失败，请重试')
  }
}

const handleClick = async (event) => {
  if (Date.now() - latestTouchAt.value < 380) {
    return
  }

  if (winner.value || isDraw.value || rotationAnimation.value) return

  if (gameState.value.isPlaying && !gameState.value.isMyTurn) {
    ElMessage.warning('还没轮到你')
    return
  }

  const { row, col } = getPosition(event, 0.45)
  await tryPlaceStone(row, col)
}

const handleTouch = async (event) => {
  latestTouchAt.value = Date.now()
  event.preventDefault()
  if (winner.value || isDraw.value || rotationAnimation.value) return

  if (gameState.value.isPlaying && !gameState.value.isMyTurn) {
    ElMessage.warning('还没轮到你')
    return
  }

  const touch = event.touches[0]
  const { row, col } = getPosition({
    clientX: touch.clientX,
    clientY: touch.clientY
  }, 0.65)

  await tryPlaceStone(row, col)
}

const checkWinner = (row, col, playerColor = null) => {
  return getWinningLine(row, col, playerColor).length >= 5
}

const undo = () => {
  if (moveHistory.value.length === 0 || rotationAnimation.value) return

  const previousMove = moveHistory.value.pop()
  board.value = cloneBoardState(previousMove.snapshot)
  currentPlayer.value = previousMove.player

  if (moveHistory.value.length > 0) {
    lastMove.value = {
      row: moveHistory.value[moveHistory.value.length - 1].row,
      col: moveHistory.value[moveHistory.value.length - 1].col
    }
  } else {
    lastMove.value = null
  }

  winner.value = null
  hoverRow.value = -1
  hoverCol.value = -1
  clearWinEffects()
  stopRotationAnimation()
  playSound('undo')
  drawBoard()
}

const restart = () => {
  stopRotationAnimation()
  board.value = Array(boardSize).fill().map(() => Array(boardSize).fill(0))
  currentPlayer.value = 1
  winner.value = null
  moveHistory.value = []
  lastMove.value = null
  hoverRow.value = -1
  hoverCol.value = -1
  clearWinEffects()
  drawBoard()
}

const highlightMove = (index) => {
  if (index >= 0 && index < moveHistory.value.length) {
    lastMove.value = moveHistory.value[index]
    drawBoard()
  }
}

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
}

// 性能优化：缓存AudioContext
let audioContext = null

const playSound = (type) => {
  if (!soundEnabled.value) return
  
  // 重用 AudioContext
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  switch (type) {
    case 'place':
      oscillator.frequency.value = 800
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
      break
    case 'win':
      oscillator.frequency.value = 1000
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
      break
    case 'draw':
      oscillator.frequency.value = 500
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
      break
    case 'undo':
      oscillator.frequency.value = 600
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
      break
    case 'lose':
      oscillator.frequency.value = 400
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4)
      break
  }
}

onMounted(() => {
  boundAccount.value = getCurrentAccount()
  if (boundAccount.value?.username) {
    username.value = boundAccount.value.username
    loadBattleStats()
  }

  initBackground()
  drawBoard()


})

onBeforeUnmount(() => {
  clearWinEffects()
  stopRotationAnimation()

  // 清理在线连接
  if (isConnected.value) {
    gameRoom.disconnect()
  }


})
</script>

<style scoped>
.content {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 防止左右晃动 */
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
}

.back-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  margin-bottom: 0;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  /* 防止按钮宽度变化 */
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 1);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.back-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.gomoku-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 防止内容溢出视口 */
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  /* 为固定按钮留出空间 */
  padding-top: 20px;
}

.game-title {
  color: white;
  font-size: 48px;
  margin-bottom: 30px;
  text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 20px;
  /* 防止文本换行 */
  white-space: nowrap;
  text-align: center;
}

.title-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.game-container {
  display: flex;
  gap: 30px;
  align-items: flex-start;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.12)) !important;
  border: 1px solid rgba(255, 255, 255, 0.28);
  padding: 30px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.24);
  /* 防止容器宽度变化 */
  width: 100%;
  max-width: 1200px;
  box-sizing: border-box;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 30px;
  min-width: 200px;
}

/* 游戏模式选择 */
.mode-selector {
  background: rgba(255, 255, 255, 0.1);
  padding: 25px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.mode-title {
  color: white;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.mode-btn {
  width: 100%;
  padding: 15px;
  margin-bottom: 15px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.local-mode {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.local-mode:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.online-mode {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.online-mode:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(240, 147, 251, 0.4);
}

.mode-icon {
  font-size: 24px;
}

/* 在线登录表单 */
.online-login {
  background: rgba(255, 255, 255, 0.1);
  padding: 25px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.login-title {
  color: white;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.login-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  margin-bottom: 10px;
}

.username-input {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  box-sizing: border-box;
  outline: none;
  transition: all 0.3s ease;
}

.username-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
}

.join-btn,
.cancel-btn,
.leave-room-btn {
  width: 100%;
  padding: 12px;
  margin-bottom: 10px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.join-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.join-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn,
.leave-room-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.cancel-btn:hover,
.leave-room-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 在线玩家列表 */
.online-players {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.players-header {
  margin-bottom: 15px;
}

.players-title {
  color: white;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.title-icon {
  font-size: 24px;
}

.current-user-info {
  background: rgba(255, 255, 255, 0.15);
  padding: 10px;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  font-size: 20px;
}

.user-avatar img,
.player-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

.user-name {
  font-weight: bold;
}

.players-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 15px;
}

.player-item {
  background: rgba(255, 255, 255, 0.15) !important;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.player-item:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  transform: translateX(5px);
}

.player-item.playing {
  opacity: 0.6;
}

.player-item.offline {
  opacity: 0.45;
}

.player-avatar {
  font-size: 32px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-details {
  flex: 1;
  color: white;
}

.player-username {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.player-status {
  font-size: 12px;
  opacity: 0.8;
}

.player-record-line {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 2px;
}

.invite-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.invite-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
}

.invite-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2) !important;
  color: white;
  font-size: 12px;
  white-space: nowrap;
}

.status-badge.offline {
  background: rgba(107, 114, 128, 0.45) !important;
}

.no-players {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  padding: 30px;
  font-size: 14px;
}

/* 本地模式面板 */
.local-mode-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 在线游戏面板 */
.online-game-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.battle-stats-panel {
  background: rgba(255, 255, 255, 0.12) !important;
  border-radius: 12px;
  padding: 14px;
  color: white;
}

.battle-stats-title {
  font-weight: bold;
  margin-bottom: 8px;
}

.battle-stats-line {
  font-size: 13px;
  line-height: 1.6;
}

.game-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.surrender-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #f5576c 0%, #c23757 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.surrender-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
}

.rematch-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.rematch-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.rematch-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.back-lobby-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.back-lobby-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(56, 239, 125, 0.4);
}

.player-info {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
  border: 3px solid transparent;
}

.player-info.active {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.2);
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
}

.player-stone {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.player-stone.black {
  background: radial-gradient(circle at 30% 30%, #666, #000);
}

.player-stone.white {
  background: radial-gradient(circle at 30% 30%, #fff, #ddd);
}

.player-text {
  color: white;
  flex: 1;
}

.player-name {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 5px;
}

.player-wins {
  font-size: 14px;
  opacity: 0.8;
}

.game-status {
  background: rgba(255, 255, 255, 0.15);
  padding: 25px;
  border-radius: 15px;
  text-align: center;
  color: white;
  font-size: 18px;
  font-weight: bold;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.winner-announce {
  color: #ffd700;
}

.trophy {
  font-size: 48px;
  margin-bottom: 10px;
}

.draw-announce {
  font-size: 24px;
  color: #ffd700;
}

.current-turn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.turn-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.turn-indicator.black {
  background: radial-gradient(circle at 30% 30%, #666, #000);
}

.turn-indicator.white {
  background: radial-gradient(circle at 30% 30%, #fff, #ddd);
}

.board-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

canvas {
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.win-fireworks {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 3;
  border-radius: 10px;
}

.firework-burst {
  position: absolute;
  transform: translate(-50%, -50%) scale(0.2);
  border-radius: 50%;
  color: var(--burst-color);
  opacity: 0;
  filter: drop-shadow(0 0 10px var(--burst-color));
  animation: firework-burst 1.2s ease-out forwards;
}

.firework-burst::before,
.firework-burst::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.firework-burst::before {
  background:
    radial-gradient(circle, currentColor 0 10%, transparent 11%) 50% 0/12% 12% no-repeat,
    radial-gradient(circle, currentColor 0 10%, transparent 11%) 100% 50%/12% 12% no-repeat,
    radial-gradient(circle, currentColor 0 10%, transparent 11%) 50% 100%/12% 12% no-repeat,
    radial-gradient(circle, currentColor 0 10%, transparent 11%) 0 50%/12% 12% no-repeat,
    radial-gradient(circle, currentColor 0 9%, transparent 10%) 18% 18%/10% 10% no-repeat,
    radial-gradient(circle, currentColor 0 9%, transparent 10%) 82% 18%/10% 10% no-repeat,
    radial-gradient(circle, currentColor 0 9%, transparent 10%) 82% 82%/10% 10% no-repeat,
    radial-gradient(circle, currentColor 0 9%, transparent 10%) 18% 82%/10% 10% no-repeat;
}

.firework-burst::after {
  inset: 18%;
  background: radial-gradient(circle, rgba(255,255,255,0.95) 0 20%, transparent 45%);
  animation: firework-flash 1.2s ease-out forwards;
}

@keyframes firework-burst {
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 0;
  }
}

@keyframes firework-flash {
  0% {
    transform: scale(0.2);
    opacity: 0.95;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

.step-info {
  margin-top: 15px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 20px;
  font-weight: bold;
  backdrop-filter: blur(5px);
}

.rule-tip {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.14);
  border-left: 4px solid #ffd700;
  border-radius: 12px;
  color: white;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  backdrop-filter: blur(6px);
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 250px;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-btn {
  padding: 15px 20px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
  color: white;
}

.restart-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.restart-btn:hover {
  opacity: 0.9;
}

.undo-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.undo-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.undo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sound-btn {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.sound-btn:hover {
  opacity: 0.9;
}

.btn-icon {
  font-size: 20px;
}

.move-history {
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 15px;
  padding: 20px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.history-title {
  color: white;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
  text-align: center;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

.history-list {
  overflow-y: auto;
  flex: 1;
}

.history-list::-webkit-scrollbar {
  width: 8px;
}

.history-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.history-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.history-item {
  padding: 10px 15px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.history-item.selected {
  background: rgba(255, 215, 0, 0.3);
  border: 2px solid #ffd700;
}

.history-item.black {
  border-left: 4px solid #333;
}

.history-item.white {
  border-left: 4px solid #fff;
}

.move-number {
  font-weight: bold;
  min-width: 30px;
}

.move-player {
  font-size: 18px;
}

.move-position {
  opacity: 0.8;
  font-size: 14px;
}

@media (max-width: 1200px) {
  .game-container {
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    max-width: 640px;
  }

  .left-panel {
    flex-direction: row;
    justify-content: space-between;
    gap: 15px;
  }

  .game-status {
    order: -1;
    width: 100%;
    margin-bottom: 20px;
  }
}

@media (max-width: 1200px) {
  .game-container {
    flex-direction: column;
    align-items: center;
    padding: 20px;
    /* 确保容器宽度稳定 */
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    max-width: 640px;
    box-sizing: border-box;
  }

  .left-panel {
    flex-direction: row;
    justify-content: space-between;
    gap: 15px;
  }

  .game-status {
    order: -1;
    width: 100%;
    margin-bottom: 20px;
    box-sizing: border-box;
  }
}

@media (max-width: 768px) {
  .content {
    padding: 10px;
    min-height: auto;
    /* 防止视口宽度变化 */
    width: 100vw;
    max-width: 100vw;
    box-sizing: border-box;
  }

  .game-title {
    font-size: 28px;
    margin-bottom: 15px;
    gap: 10px;
    /* 防止换行 */
    flex-wrap: nowrap;
    justify-content: center;
  }

  .title-icon {
    font-size: 24px;
  }

  .game-container {
    padding: 15px;
    gap: 15px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .left-panel {
    flex-direction: column;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .player-info {
    padding: 15px;
    /* 防止内容溢出 */
    min-width: 0;
    flex: 1;
    box-sizing: border-box;
  }

  .player-stone {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
  }

  .player-name {
    font-size: 18px;
    /* 防止文本溢出 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .player-wins {
    font-size: 13px;
  }

  .game-status {
    padding: 15px;
    font-size: 16px;
    min-height: 70px;
    width: 100%;
    box-sizing: border-box;
  }

  .trophy {
    font-size: 36px;
  }

  .board-container {
    width: 100%;
    max-width: min(96vw, 540px);
    /* 防止canvas尺寸变化 */
    aspect-ratio: 1;
    box-sizing: border-box;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none; /* 只在 canvas 上禁用触摸滚动 */
    /* 确保canvas不会超出容器 */
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .step-info {
    font-size: 14px;
    padding: 8px 16px;
    /* 防止换行 */
    white-space: nowrap;
  }

  .control-btn {
    padding: 12px 16px;
    font-size: 14px;
    /* 防止按钮宽度变化 */
    white-space: nowrap;
    flex-shrink: 0;
  }

  .btn-icon {
    font-size: 18px;
  }

  .right-panel {
    width: 100%;
    box-sizing: border-box;
  }

  .move-history {
    max-height: 250px;
    padding: 15px;
    /* 防止内容溢出 */
    width: 100%;
    box-sizing: border-box;
  }

  .history-title {
    font-size: 16px;
  }

  .history-item {
    padding: 8px 12px;
    font-size: 14px;
    /* 防止文本溢出 */
    min-width: 0;
    box-sizing: border-box;
  }

  .move-player {
    font-size: 16px;
    flex-shrink: 0;
  }

  /* 返回按钮移动端优化 */
  .back-btn {
    top: 10px;
    left: 10px;
    padding: 10px 16px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .game-title {
    font-size: 24px;
    /* 确保标题不会换行 */
    flex-direction: column;
    gap: 10px;
  }

  .title-icon {
    font-size: 20px;
  }

  .board-container {
    max-width: min(98vw, 440px);
    /* 保持正方形比例 */
    aspect-ratio: 1;
  }

  .player-info {
    padding: 12px;
    /* 防止内容压缩 */
    min-width: 120px;
  }

  .player-stone {
    width: 35px;
    height: 35px;
  }

  .player-name {
    font-size: 16px;
    /* 防止文本过长 */
    max-width: 80px;
  }

  .control-buttons {
    gap: 10px;
    /* 确保按钮布局稳定 */
    flex-wrap: wrap;
    justify-content: center;
  }

  .control-btn {
    padding: 10px 14px;
    font-size: 13px;
    /* 防止按钮换行 */
    white-space: nowrap;
    min-width: 100px;
  }

  /* 确保历史记录列表不会导致滚动条 */
  .history-list {
    max-height: 200px;
  }

  /* 返回按钮移动端优化 */
  .back-btn {
    top: 10px;
    left: 10px;
    padding: 10px 16px;
    font-size: 14px;
  }
}
</style>