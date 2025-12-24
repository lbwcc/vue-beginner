<template>
  <div class="content">
    <button @click="$router.back()" class="back-btn"> 返回</button>
    <div class="gomoku-game">
      
      <div class="game-container">
        <div class="left-panel">
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
        </div>

        <div class="right-panel">
          <div class="control-buttons">
            <button @click="restart" class="control-btn restart-btn">
              <span class="btn-icon">🔄</span>
              <span>重新开始</span>
            </button>
            <button @click="undo" :disabled="!canUndo" class="control-btn undo-btn">
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

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

// 性能优化：缓存Canvas上下文和背景
let ctx = null
let backgroundCanvas = null
let backgroundCtx = null
let isDrawing = false

const canUndo = computed(() => moveHistory.value.length > 0 && !winner.value)
const isDraw = computed(() => moveHistory.value.length === boardSize * boardSize && !winner.value)

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

const drawBoard = () => {
  if (isDrawing) return
  isDrawing = true

  requestAnimationFrame(() => {
    if (!ctx) ctx = canvas.value.getContext('2d')

    // 绘制背景
    ctx.drawImage(backgroundCanvas, 0, 0)

    // 绘制棋子
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board.value[row][col] !== 0) {
          drawStone(ctx, row, col, board.value[row][col])
        }
      }
    }

    // 绘制最后落子标记
    if (lastMove.value) {
      const { row, col } = lastMove.value
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(padding + col * cellSize, padding + row * cellSize, cellSize / 2 - 4, 0, 2 * Math.PI)
      ctx.stroke()
    }

    // 绘制悬浮预览
    if (hoverRow.value >= 0 && hoverCol.value >= 0 && board.value[hoverRow.value][hoverCol.value] === 0 && !winner.value) {
      ctx.globalAlpha = 0.3
      drawStone(ctx, hoverRow.value, hoverCol.value, currentPlayer.value)
      ctx.globalAlpha = 1
    }

    isDrawing = false
  })
}

const drawStone = (ctx, row, col, player) => {
  const x = padding + col * cellSize
  const y = padding + row * cellSize
  const radius = cellSize / 2 - 3

  // 绘制阴影
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 5
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2

  if (player === 1) {
    // 黑棋 - 渐变效果
    const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, radius/10, x, y, radius)
    gradient.addColorStop(0, '#666')
    gradient.addColorStop(1, '#000')
    ctx.fillStyle = gradient
  } else {
    // 白棋 - 渐变效果
    const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, radius/10, x, y, radius)
    gradient.addColorStop(0, '#fff')
    gradient.addColorStop(1, '#ddd')
    ctx.fillStyle = gradient
  }

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // 绘制边框
  ctx.strokeStyle = player === 1 ? '#333' : '#aaa'
  ctx.lineWidth = 1
  ctx.stroke()
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
  if (winner.value) return
  
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

const handleClick = (event) => {
  if (winner.value || isDraw.value) return

  const { row, col } = getPosition(event)

  if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && board.value[row][col] === 0) {
    board.value[row][col] = currentPlayer.value
    moveHistory.value.push({ row, col, player: currentPlayer.value })
    lastMove.value = { row, col }
    
    playSound('place')
    
    if (checkWinner(row, col)) {
      winner.value = currentPlayer.value
      if (currentPlayer.value === 1) {
        blackWins.value++
      } else {
        whiteWins.value++
      }
      playSound('win')
    } else if (isDraw.value) {
      playSound('draw')
    } else {
      currentPlayer.value = currentPlayer.value === 1 ? 2 : 1
    }
    drawBoard()
  }
}

const handleTouch = (event) => {
  event.preventDefault()
  if (winner.value || isDraw.value) return
  
  const touch = event.touches[0]
  const rect = canvas.value.getBoundingClientRect()
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top
  
  // 计算缩放比例
  const scaleX = canvasWidth.value / rect.width
  const scaleY = canvasHeight.value / rect.height
  
  // 转换为canvas坐标
  const canvasX = x * scaleX
  const canvasY = y * scaleY
  
  const col = Math.round((canvasX - padding) / cellSize)
  const row = Math.round((canvasY - padding) / cellSize)

  if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && board.value[row][col] === 0) {
    board.value[row][col] = currentPlayer.value
    moveHistory.value.push({ row, col, player: currentPlayer.value })
    lastMove.value = { row, col }
    
    playSound('place')
    
    if (checkWinner(row, col)) {
      winner.value = currentPlayer.value
      if (currentPlayer.value === 1) {
        blackWins.value++
      } else {
        whiteWins.value++
      }
      playSound('win')
    } else if (isDraw.value) {
      playSound('draw')
    } else {
      currentPlayer.value = currentPlayer.value === 1 ? 2 : 1
    }
    drawBoard()
  }
}

const checkWinner = (row, col) => {
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
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board.value[r][c] === currentPlayer.value) {
      count++
      r += dx
      c += dy
    }
    // 负方向检查
    r = row - dx
    c = col - dy
    while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board.value[r][c] === currentPlayer.value) {
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
  if (moveHistory.value.length === 0) return
  
  const lastMove = moveHistory.value.pop()
  board.value[lastMove.row][lastMove.col] = 0
  currentPlayer.value = lastMove.player
  
  if (moveHistory.value.length > 0) {
    lastMove.value = moveHistory.value[moveHistory.value.length - 1]
  } else {
    lastMove.value = null
  }
  
  winner.value = null
  playSound('undo')
  drawBoard()
}

const restart = () => {
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
  }
}

onMounted(() => {
  initBackground()
  drawBoard()
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