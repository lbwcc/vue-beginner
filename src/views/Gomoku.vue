<template>
  <div class="content">
    <button @click="$router.back()" class="back-btn"> 返回</button>
    <div class="gomoku-game">
      
      <div class="game-container">
        <!-- 左侧面板：游戏模式选择 / 在线玩家列表 -->
        <div class="left-panel">
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

          <!-- 在线模式：登录表单 -->
          <div v-if="isOnlineMode && !isConnected" class="online-login">
            <div class="login-title">加入游戏大厅</div>
            <input
              v-model="username" 
              type="text" 
              placeholder="输入你的昵称" 
              class="username-input"
              @keyup.enter="joinGameRoom"
            />
            <button @click="joinGameRoom" :disabled="!username.trim()" class="join-btn">
              <span>进入大厅</span>
            </button>
            <button @click="cancelOnlineMode" class="cancel-btn">返回</button>
          </div>

          <!-- 在线玩家列表 -->
          <div v-if="isOnlineMode && isConnected && !gameState.isPlaying" class="online-players">
            <div class="players-header">
              <div class="players-title">
                <span class="title-icon">👥</span>
                <span>在线玩家 ({{ onlinePlayers.length }})</span>
              </div>
              <div class="current-user-info">
                <span class="user-avatar">{{ currentUserInfo?.avatar }}</span>
                <span class="user-name">{{ currentUserInfo?.username }}</span>
              </div>
            </div>
            
            <div class="players-list">
              <div 
                v-for="player in onlinePlayers" 
                :key="player.id"
                class="player-item"
                :class="{ playing: player.status === 'playing' }"
              >
                <div class="player-avatar">{{ player.avatar }}</div>
                <div class="player-details">
                  <div class="player-username">{{ player.username }}</div>
                  <div class="player-status">
                    {{ player.status === 'playing' ? '游戏中' : '空闲' }}
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
              </div>
              
              <div v-if="onlinePlayers.length === 0" class="no-players">
                暂无其他玩家在线
              </div>
            </div>

            <button @click="leaveGameRoom" class="leave-room-btn">离开大厅</button>
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
                  <span>返回大厅</span>
                </button>
              </template>
            </div>
          </div>
        </div>

        <div class="board-container">
          <canvas 
            ref="canvas" 
            :width="canvasWidth" 
            :height="canvasHeight" 
            @click="handleClick"
            @touchstart="handleTouch"
            @mousemove="handleMouseMove"
            @mouseleave="handleMouseLeave"
          />
          <div class="step-info" v-if="moveHistory.length > 0">
            步数: {{ moveHistory.length }}
          </div>
          <div class="rule-tip">
            新规则：非边缘落子后，中心田字格会顺时针旋转 90°
          </div>
        </div>

        <div class="right-panel">
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

const router = useRouter()
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

// 在线对战相关状态
const isOnlineMode = ref(false)
const isConnected = ref(false)
const username = ref('')
const currentUserInfo = ref(null)
const onlinePlayers = ref([])
const pendingInvite = ref(null)
const isSurrendering = ref(false) // 标记是否是自己主动认输
const gameState = ref({
  isPlaying: false,
  opponent: null,
  isMyTurn: false,
  myColor: null,
  roomId: null
})

// 性能优化：缓存Canvas上下文和背景
let ctx = null
let backgroundCanvas = null
let backgroundCtx = null
let isDrawing = false
const rotationDuration = 280
const rotationAnimation = ref(null)
let animationFrameId = null

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

// ========== 游戏模式选择 ==========
const startLocalGame = () => {
  isOnlineMode.value = false
  restart()
}

const showOnlineMode = () => {
  isOnlineMode.value = true
}

const cancelOnlineMode = () => {
  isOnlineMode.value = false
}

// ========== 在线对战功能 ==========
const joinGameRoom = async () => {
  if (!username.value.trim()) {
    ElMessage.warning('请输入昵称')
    return
  }
  
  try {
    currentUserInfo.value = await gameRoom.joinRoom({
      username: username.value.trim(),
      avatar: '🎮'
    })
    
    isConnected.value = true
    ElMessage.success('成功加入游戏大厅')
    
    // 注册回调
    gameRoom.on('onPlayerListUpdate', handlePlayerListUpdate)
    gameRoom.on('onInviteReceived', handleInviteReceived)
    gameRoom.on('onInviteResponse', handleInviteResponse)
    gameRoom.on('onGameStart', handleGameStart)
    gameRoom.on('onMove', handleOpponentMove)
    gameRoom.on('onGameEnd', handleGameEnd)
    gameRoom.on('onOpponentLeave', handleOpponentLeave)
    
  } catch (error) {
    console.error('加入游戏大厅失败:', error)
    ElMessage.error('加入游戏大厅失败，请重试')
  }
}

const leaveGameRoom = () => {
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
  onlinePlayers.value = []
  pendingInvite.value = null
  isSurrendering.value = false
  gameState.value = {
    isPlaying: false,
    opponent: null,
    isMyTurn: false,
    myColor: null,
    roomId: null
  }
  ElMessage.info('已离开游戏大厅')
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
const sendInvite = async (player) => {
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
  
  // 重置棋盘
  stopRotationAnimation()
  board.value = Array(boardSize).fill().map(() => Array(boardSize).fill(0))
  moveHistory.value = []
  lastMove.value = null
  winner.value = null
  hoverRow.value = -1
  hoverCol.value = -1
  isSurrendering.value = false
  
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
    try {
      await gameRoom.sendMove({ row, col, player: playerColor })
    } catch (error) {
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

  const resolvedWinner = getBoardWinner(playerColor)

  if (resolvedWinner) {
    winner.value = resolvedWinner

    if (!gameState.value.isPlaying) {
      if (resolvedWinner === 1) {
        blackWins.value++
      } else {
        whiteWins.value++
      }
    } else {
      const iWon = resolvedWinner === gameState.value.myColor
      setTimeout(() => {
        ElMessage({
          message: iWon ? '你获胜了！' : '对手获胜！',
          type: iWon ? 'success' : 'info',
          duration: 2000
        })
        gameRoom.sendGameEnd({
          winner: iWon ? currentUserInfo.value?.id : gameState.value.opponent?.id,
          reason: 'win'
        })
      }, 200)
    }

    playSound('win')
  } else if (isDraw.value) {
    playSound('draw')

    if (gameState.value.isPlaying) {
      ElMessage.info('平局！')
      gameRoom.sendGameEnd({
        winner: null,
        reason: 'draw'
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
}

// 处理游戏结束
const handleGameEnd = (result) => {
  if (result.reason === 'surrender') {
    // 通过比较 winner 来判断是谁认输
    if (result.winner === currentUserInfo.value?.id) {
      // 对手认输，自己赢了
      ElMessage.success('对手认输，你获胜了！')
      winner.value = gameState.value.myColor
      playSound('win')
    } else {
      // 自己认输，对手赢了（消息已在 surrenderGame 中显示）
      winner.value = gameState.value.myColor === 1 ? 2 : 1
    }
    isSurrendering.value = false
  } else if (result.reason === 'win') {
    // 已在 handleOpponentMove 中处理
  } else if (result.reason === 'draw') {
    // 平局
  }
  
  gameState.value = gameRoom.getGameState()
}

// 处理对手离开
const handleOpponentLeave = () => {
  ElMessage.warning('对手已离开游戏')
  winner.value = gameState.value.myColor // 判你获胜
  playSound('win')
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
    await sendInvite(gameState.value.opponent)
  } catch (error) {
    console.error('发送再战邀请失败:', error)
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
  
  // 同步游戏状态（会触发界面切换到玩家列表）
  gameState.value = gameRoom.getGameState()
  
  drawBoard()
  ElMessage.success('已返回游戏大厅')
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

const getBoardWinner = (priorityPlayer = null) => {
  const playersToCheck = priorityPlayer
    ? [priorityPlayer, priorityPlayer === 1 ? 2 : 1]
    : [1, 2]

  for (const player of playersToCheck) {
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board.value[row][col] === player && checkWinner(row, col, player)) {
          return player
        }
      }
    }
  }

  return null
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

const getPosition = (event) => {
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
  if (winner.value || isDraw.value || rotationAnimation.value) return

  if (gameState.value.isPlaying && !gameState.value.isMyTurn) {
    ElMessage.warning('还没轮到你')
    return
  }

  const { row, col } = getPosition(event)
  await tryPlaceStone(row, col)
}

const handleTouch = async (event) => {
  event.preventDefault()
  if (winner.value || isDraw.value || rotationAnimation.value) return

  if (gameState.value.isPlaying && !gameState.value.isMyTurn) {
    ElMessage.warning('还没轮到你')
    return
  }

  const touch = event.touches[0]
  const rect = canvas.value.getBoundingClientRect()
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top

  const scaleX = canvasWidth.value / rect.width
  const scaleY = canvasHeight.value / rect.height
  const canvasX = x * scaleX
  const canvasY = y * scaleY

  const col = Math.round((canvasX - padding) / cellSize)
  const row = Math.round((canvasY - padding) / cellSize)

  await tryPlaceStone(row, col)
}

const checkWinner = (row, col, playerColor = null) => {
  const color = playerColor || currentPlayer.value
  const directions = [
    [0, 1],   // 横向
    [1, 0],   // 纵向
    [1, 1],   // 斜向 \
    [1, -1]   // 斜向 /
  ]

  for (const [dx, dy] of directions) {
    let count = 1
    // 正方向检查
    let r = row + dx
    let c = col + dy
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board.value[r][c] === color) {
      count++
      r += dx
      c += dy
    }
    // 负方向检查
    r = row - dx
    c = col - dy
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board.value[r][c] === color) {
      count++
      r -= dx
      c -= dy
    }
    if (count >= 5) {
      return true
    }
  }
  return false
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
  initBackground()
  drawBoard()
})

onBeforeUnmount(() => {
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
  background: rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
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

.user-name {
  font-weight: bold;
}

.players-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 15px;
}

.player-item {
  background: rgba(255, 255, 255, 0.15);
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.player-item:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateX(5px);
}

.player-item.playing {
  opacity: 0.6;
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

.invite-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 12px;
  white-space: nowrap;
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
  background: rgba(255, 255, 255, 0.1);
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
    max-width: 400px;
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
    max-width: 340px;
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