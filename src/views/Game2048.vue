<template>
  <div class="content tool-page" :class="{ 'landscape-mobile': isMobileLandscape }" v-reveal="{ y: 12, duration: 0.36 }">
    <button @click="$router.back()" class="back-btn" v-reveal="{ y: 8, duration: 0.24 }">返回</button>
    <div class="game-2048" v-reveal="{ y: 12, duration: 0.34, delay: 0.06 }">
      <div class="game-header" v-reveal="{ y: 10, duration: 0.28, delay: 0.08 }">
        <h1>2048</h1>
        <div class="score-container">
          <div class="score-box">
            <div class="score-label">分数</div>
            <div class="score-value">{{ score }}</div>
          </div>
          <div class="score-box">
            <div class="score-label">最高分</div>
            <div class="score-value">{{ bestScore }}</div>
          </div>
        </div>
      </div>

      <div class="fold-panels" v-reveal="{ y: 10, duration: 0.28, delay: 0.1 }">
        <section class="fold-card" v-reveal="{ y: 10, duration: 0.26, scroll: true, start: 'top 95%' }">
          <button class="fold-toggle" type="button" @click="controlsCollapsed = !controlsCollapsed">
            <span>🎮 操作</span>
            <span>{{ controlsCollapsed ? '展开' : '收起' }}</span>
          </button>
          <div v-show="!controlsCollapsed" class="fold-body game-info">
            <p class="desktop-hint">
              使用方向键 <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd>
              <kbd>→</kbd> 移动方块！
            </p>
            <p class="mobile-hint">
              👆 滑动屏幕移动方块！
            </p>
            <button @click="toggleAudio" class="audio-btn">
              {{ audioEnabled ? '音效: 开' : '音效: 关' }}
            </button>
            <button @click="restart" class="restart-btn">重新开始</button>
          </div>
        </section>

        <section class="fold-card" v-reveal="{ y: 10, duration: 0.26, scroll: true, start: 'top 95%' }">
          <button class="fold-toggle" type="button" @click="rankCollapsed = !rankCollapsed">
            <span>🏆 排行榜</span>
            <span>{{ rankCollapsed ? '展开' : '收起' }}</span>
          </button>
          <div v-show="!rankCollapsed" class="fold-body rank-board">
            <ol>
              <li v-for="(item, idx) in rankList" :key="`${item.createdAt}-${idx}`">
                第{{ idx + 1 }}名：{{ item.ownerUsername || '游客' }} · {{ item.score }} 分
              </li>
            </ol>
          </div>
        </section>
      </div>

      <div class="game-container" ref="gameContainer" :style="gameContainerStyle" v-reveal="{ y: 12, duration: 0.3, delay: 0.12 }">
        <div class="grid-container">
          <div v-for="i in 16" :key="'cell-' + i" class="grid-cell"></div>
        </div>

        <div class="tile-container">
          <div
            v-for="tile in tiles"
            :key="tile.id"
            :class="[
              'tile',
              `tile-${tile.value}`,
              `tile-position-${tile.row}-${tile.col}`,
              tile.isNew ? 'tile-new' : '',
              tile.isMerged ? 'tile-merged' : '',
            ]"
            :style="{
              backgroundColor: getTileColor(tile.value),
              color: tile.value <= 4 ? '#776e65' : '#f9f6f2'
            }"
          >
            <div class="tile-inner">{{ tile.value }}</div>
          </div>
        </div>

        <div v-if="gameOver" class="game-message" v-reveal="{ y: 10, duration: 0.24 }">
          <div class="message-container">
            <h2>游戏结束！</h2>
            <p>最终分数: {{ score }}</p>
            <button @click="restart" class="try-again-btn">再试一次</button>
          </div>
        </div>

        <div v-if="gameWon && !keepPlaying" class="game-message game-won" v-reveal="{ y: 10, duration: 0.24 }">
          <div class="message-container">
            <h2>恭喜你赢了！🎉</h2>
            <p>你达到了 2048！</p>
            <button @click="keepPlaying = true" class="continue-btn">
              继续游戏
            </button>
            <button @click="restart" class="try-again-btn">重新开始</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { getThemeBlockColors } from '@/utils/theme';
import { appendGameScoreRecord, getGameLeaderboard } from '@/utils/userGameRecords';

const GRID_SIZE = 4;
const BEST_SCORE_KEY = "game2048-best-score";
const AUDIO_ENABLED_KEY = "game2048-audio-enabled";

// 游戏状态
const score = ref(0);
const bestScore = ref(0);
const gameOver = ref(false);
const gameWon = ref(false);
const keepPlaying = ref(false);
const tiles = ref([]);
const rankList = ref([]);
const scoreRecorded = ref(false);
let nextTileId = 0;

// 游戏容器引用（用于触摸事件）
const gameContainer = ref(null);

// 触摸事件状态
const touchStartX = ref(0);
const touchStartY = ref(0);
const touchEndX = ref(0);
const touchEndY = ref(0);

const isMobileLandscape = ref(false);
const controlsCollapsed = ref(false);
const rankCollapsed = ref(false);
const boardSize = ref(550);
const audioEnabled = ref(true);
let audioCtx = null;

const gameContainerStyle = computed(() => ({
  width: `${boardSize.value}px`,
  maxWidth: '100%',
}));

function updateLayoutState() {
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const landscape = viewportWidth > viewportHeight;
  const mobile = viewportWidth <= 920;
  isMobileLandscape.value = mobile && landscape;

  if (isMobileLandscape.value) {
    controlsCollapsed.value = true;
    rankCollapsed.value = true;
    boardSize.value = Math.floor(Math.max(260, Math.min(viewportWidth - 18, viewportHeight - 120, 620)));
  } else {
    controlsCollapsed.value = false;
    rankCollapsed.value = false;
    boardSize.value = Math.floor(Math.max(280, Math.min(viewportWidth - 36, 550)));
  }
}

// 主题色
const themeColors = ref([]);

// 初始化网格（4x4）
const grid = ref(
  Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null))
);

// 加载最高分
onMounted(() => {
  const saved = localStorage.getItem(BEST_SCORE_KEY);
  if (saved) {
    bestScore.value = parseInt(saved);
  }
  const savedAudioEnabled = localStorage.getItem(AUDIO_ENABLED_KEY);
  if (savedAudioEnabled === '0') {
    audioEnabled.value = false;
  }
  
  // 获取主题色
  themeColors.value = getThemeBlockColors();
  getGameLeaderboard('game2048', 10).then((records) => {
    rankList.value = records;
  });
  
  initGame();
  updateLayoutState();
  window.addEventListener("keydown", handleKeyPress);
  window.addEventListener('resize', updateLayoutState);
  window.addEventListener('orientationchange', updateLayoutState);
  window.visualViewport?.addEventListener('resize', updateLayoutState);
  
  // 添加触摸事件监听
  if (gameContainer.value) {
    gameContainer.value.addEventListener('touchstart', handleTouchStart, { passive: false });
    gameContainer.value.addEventListener('touchmove', handleTouchMove, { passive: false });
    gameContainer.value.addEventListener('touchend', handleTouchEnd, { passive: false });
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyPress);
  window.removeEventListener('resize', updateLayoutState);
  window.removeEventListener('orientationchange', updateLayoutState);
  window.visualViewport?.removeEventListener('resize', updateLayoutState);
  
  // 移除触摸事件监听
  if (gameContainer.value) {
    gameContainer.value.removeEventListener('touchstart', handleTouchStart);
    gameContainer.value.removeEventListener('touchmove', handleTouchMove);
    gameContainer.value.removeEventListener('touchend', handleTouchEnd);
  }

  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
});

function ensureAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

function ensureAudioUnlocked() {
  if (!audioEnabled.value) {
    return;
  }
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

function playTone({ freq = 440, duration = 0.08, volume = 0.08, type = 'sine', when = 0 }) {
  if (!audioEnabled.value) {
    return;
  }
  const ctx = ensureAudioContext();
  if (!ctx || ctx.state !== 'running') {
    return;
  }
  const now = ctx.currentTime + when;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playMoveSound() {
  playTone({ freq: 240, duration: 0.05, volume: 0.05, type: 'triangle' });
}

function playMergeSound() {
  playTone({ freq: 392, duration: 0.08, volume: 0.07, type: 'triangle' });
  playTone({ freq: 523.25, duration: 0.1, volume: 0.06, type: 'triangle', when: 0.04 });
}

function playWinSound() {
  playTone({ freq: 523.25, duration: 0.09, volume: 0.08, type: 'sine' });
  playTone({ freq: 659.25, duration: 0.11, volume: 0.08, type: 'sine', when: 0.09 });
  playTone({ freq: 783.99, duration: 0.14, volume: 0.08, type: 'sine', when: 0.18 });
}

function playLoseSound() {
  playTone({ freq: 220, duration: 0.14, volume: 0.07, type: 'sawtooth' });
  playTone({ freq: 164.81, duration: 0.18, volume: 0.06, type: 'sawtooth', when: 0.08 });
}

function toggleAudio() {
  audioEnabled.value = !audioEnabled.value;
  localStorage.setItem(AUDIO_ENABLED_KEY, audioEnabled.value ? '1' : '0');
  if (audioEnabled.value) {
    ensureAudioUnlocked();
    playTone({ freq: 660, duration: 0.06, volume: 0.05, type: 'triangle' });
  }
}

// 初始化游戏
function initGame() {
  grid.value = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));
  tiles.value = [];
  score.value = 0;
  gameOver.value = false;
  gameWon.value = false;
  keepPlaying.value = false;
  scoreRecorded.value = false;
  nextTileId = 0;

  // 添加两个初始方块
  addRandomTile();
  addRandomTile();
}

// 重新开始
function restart() {
  ensureAudioUnlocked();
  if (audioEnabled.value) {
    playTone({ freq: 330, duration: 0.06, volume: 0.05, type: 'triangle' });
  }
  initGame();
}

// 创建新方块
function createTile(row, col, value) {
  return {
    id: nextTileId++,
    row,
    col,
    value,
    isNew: true,
    isMerged: false,
  };
}

// 在随机空位置添加方块
function addRandomTile() {
  const emptyCells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid.value[r][c]) {
        emptyCells.push({ row: r, col: c });
      }
    }
  }

  if (emptyCells.length > 0) {
    const { row, col } =
      emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const tile = createTile(row, col, value);
    tiles.value.push(tile);
    grid.value[row][col] = tile;
  }
}

// 键盘事件处理
function handleKeyPress(event) {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    ensureAudioUnlocked();
  }
  if (
    gameOver.value &&
    !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
  ) {
    return;
  }

  if (gameWon.value && !keepPlaying.value) {
    return;
  }

  let moved = false;

  switch (event.key) {
    case "ArrowUp":
      event.preventDefault();
      moved = move("up");
      break;
    case "ArrowDown":
      event.preventDefault();
      moved = move("down");
      break;
    case "ArrowLeft":
      event.preventDefault();
      moved = move("left");
      break;
    case "ArrowRight":
      event.preventDefault();
      moved = move("right");
      break;
  }

  if (moved) {
    // 清除动画标记
    setTimeout(() => {
      tiles.value.forEach((tile) => {
        tile.isNew = false;
        tile.isMerged = false;
      });
    }, 200);

    addRandomTile();
    checkGameState();
  }
}

// 移动方块
function move(direction) {
  let moved = false;
  let mergedInThisMove = false;
  let wonInThisMove = false;
  const newGrid = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));
  const merged = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(false));

  const traversals = buildTraversals(direction);

  // 准备移动
  tiles.value.forEach((tile) => {
    grid.value[tile.row][tile.col] = null;
  });

  // 遍历并移动
  traversals.row.forEach((row) => {
    traversals.col.forEach((col) => {
      const tile = findTileAt(row, col);
      if (tile) {
        const positions = findFarthestPosition(row, col, direction, newGrid);
        const next = newGrid[positions.next.row]?.[positions.next.col];

        // 可以合并
        if (
          next &&
          next.value === tile.value &&
          !merged[positions.next.row][positions.next.col]
        ) {
          const mergedTile = createTile(
            positions.next.row,
            positions.next.col,
            tile.value * 2
          );
          mergedTile.isNew = false;
          mergedTile.isMerged = true;

          // 移除旧方块
          tiles.value = tiles.value.filter(
            (t) => t.id !== tile.id && t.id !== next.id
          );
          tiles.value.push(mergedTile);

          newGrid[positions.next.row][positions.next.col] = mergedTile;
          merged[positions.next.row][positions.next.col] = true;

          score.value += mergedTile.value;
          mergedInThisMove = true;

          if (mergedTile.value === 2048) {
            if (!gameWon.value) {
              wonInThisMove = true;
            }
            gameWon.value = true;
          }

          moved = true;
        } else {
          // 移动到最远位置
          if (
            tile.row !== positions.farthest.row ||
            tile.col !== positions.farthest.col
          ) {
            moved = true;
          }
          tile.row = positions.farthest.row;
          tile.col = positions.farthest.col;
          tile.isNew = false;
          newGrid[tile.row][tile.col] = tile;
        }
      }
    });
  });

  grid.value = newGrid;

  // 更新最高分
  if (score.value > bestScore.value) {
    bestScore.value = score.value;
    localStorage.setItem(BEST_SCORE_KEY, bestScore.value.toString());
  }

  if (moved) {
    if (wonInThisMove) {
      playWinSound();
    } else if (mergedInThisMove) {
      playMergeSound();
    } else {
      playMoveSound();
    }
  }

  return moved;
}

// 构建遍历顺序
function buildTraversals(direction) {
  const traversals = {
    row: [],
    col: [],
  };

  for (let i = 0; i < GRID_SIZE; i++) {
    traversals.row.push(i);
    traversals.col.push(i);
  }

  if (direction === "down") {
    traversals.row.reverse();
  }
  if (direction === "right") {
    traversals.col.reverse();
  }

  return traversals;
}

// 查找指定位置的方块
function findTileAt(row, col) {
  return tiles.value.find((tile) => tile.row === row && tile.col === col);
}

// 查找最远可移动位置
function findFarthestPosition(row, col, direction, currentGrid) {
  let previous = { row, col };
  const vector = getVector(direction);

  do {
    previous = { row, col };
    row += vector.row;
    col += vector.col;
  } while (
    row >= 0 &&
    row < GRID_SIZE &&
    col >= 0 &&
    col < GRID_SIZE &&
    !currentGrid[row][col]
  );

  return {
    farthest: previous,
    next: { row, col },
  };
}

// 获取方向向量
function getVector(direction) {
  const map = {
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
  };
  return map[direction];
}

// 检查游戏状态
function checkGameState() {
  if (!movesAvailable()) {
    if (!gameOver.value) {
      playLoseSound();
    }
    gameOver.value = true;
    recordGameOverScore();
  }
}

async function recordGameOverScore() {
  if (scoreRecorded.value) return;
  scoreRecorded.value = true;
  const result = await appendGameScoreRecord('game2048', score.value, {
    mode: 'single',
    game: 'game2048',
    maxTile: Math.max(...tiles.value.map((tile) => Number(tile.value) || 0), 0)
  }, 10);
  rankList.value = result.leaderboard;
}

// 检查是否还有可用移动
function movesAvailable() {
  // 检查是否有空格
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid.value[r][c]) {
        return true;
      }
    }
  }

  // 检查是否有可合并的方块
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid.value[r][c];
      if (tile) {
        // 检查右边
        if (c < GRID_SIZE - 1 && grid.value[r][c + 1]?.value === tile.value) {
          return true;
        }
        // 检查下边
        if (r < GRID_SIZE - 1 && grid.value[r + 1][c]?.value === tile.value) {
          return true;
        }
      }
    }
  }

  return false;
}

// 触摸开始
function handleTouchStart(event) {
  if (event.touches.length > 1) return; // 只处理单指触摸
  ensureAudioUnlocked();
  touchStartX.value = event.touches[0].clientX;
  touchStartY.value = event.touches[0].clientY;
}

// 触摸移动
function handleTouchMove(event) {
  event.preventDefault(); // 防止页面滚动
}

// 触摸结束
function handleTouchEnd(event) {
  if (!event.changedTouches || event.changedTouches.length === 0) return;
  
  touchEndX.value = event.changedTouches[0].clientX;
  touchEndY.value = event.changedTouches[0].clientY;
  
  handleSwipe();
}

// 处理滑动手势
function handleSwipe() {
  const deltaX = touchEndX.value - touchStartX.value;
  const deltaY = touchEndY.value - touchStartY.value;
  const minSwipeDistance = 30; // 最小滑动距离
  
  if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
    return; // 滑动距离太短
  }
  
  if (gameOver.value || (gameWon.value && !keepPlaying.value)) {
    return;
  }
  
  let moved = false;
  
  // 判断滑动方向（优先响应滑动距离更大的方向）
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // 左右滑动
    if (deltaX > 0) {
      moved = move('right');
    } else {
      moved = move('left');
    }
  } else {
    // 上下滑动
    if (deltaY > 0) {
      moved = move('down');
    } else {
      moved = move('up');
    }
  }
  
  if (moved) {
    setTimeout(() => {
      tiles.value.forEach((tile) => {
        tile.isNew = false;
        tile.isMerged = false;
      });
    }, 200);
    
    addRandomTile();
    checkGameState();
  }
}

// 获取方块颜色（基于主题）
function getTileColor(value) {
  const colors = themeColors.value;
  if (colors.length === 0) return '#cdc1b4'; // 默认颜色
  
  const colorMap = {
    2: '#eee4da',    // 最浅米色
    4: '#ede0c8',    // 浅米色
    8: '#f2b179',    // 浅橙色
    16: '#f59563',   // 中橙色
    32: '#f67c5f',   // 深橙色
    64: '#f65e3b',   // 橙红色
    128: '#edcf72',  // 金黄色
    256: '#edcc61',  // 深金黄色
    512: '#edc850',  // 更深金黄色
    1024: '#edc53f', // 橙黄色
    2048: '#edc22e', // 深橙黄色
    4096: '#8b4513', // 深棕色
    8192: '#654321', // 最深棕色
  };
  
  return colorMap[value] || '#3c3a32';
}
</script>

<style scoped>
.content {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
}

.back-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  color: #776e65;
  transition: all 0.3s;
  z-index: 100;
}

.back-btn:hover {
  background: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.game-2048 {
  max-width: 600px;
  margin: 60px auto 0;
  padding: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.game-header h1 {
  margin: 0;
  font-size: 48px;
  font-weight: bold;
  color: #776e65;
}

.score-container {
  display: flex;
  gap: 10px;
}

.score-box {
  background: #bbada0;
  padding: 10px 20px;
  border-radius: 8px;
  text-align: center;
  min-width: 80px;
}

.score-label {
  font-size: 12px;
  color: #eee4da;
  text-transform: uppercase;
  font-weight: bold;
}

.score-value {
  font-size: 24px;
  font-weight: bold;
  color: white;
}

.game-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  padding: 10px 12px;
  background: #f9f6f2;
  border-radius: 8px;
}

.fold-panels {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.fold-card {
  border-radius: 10px;
  border: 1px solid #e8dfd4;
  background: #fffdf9;
  overflow: hidden;
}

.fold-toggle {
  width: 100%;
  border: none;
  background: #f1ebe3;
  color: #776e65;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
}

.fold-body {
  padding: 8px 10px 10px;
}

.rank-board {
  margin: 0;
  padding: 0;
  background: transparent;
  border-radius: 0;
}

.rank-board h3 {
  margin: 0 0 10px;
  color: #776e65;
  font-size: 16px;
}

.rank-board ol {
  margin: 0;
  padding-left: 18px;
}

.rank-board li {
  color: #776e65;
  margin: 4px 0;
}

.game-info p {
  margin: 0;
  color: #776e65;
  font-size: 14px;
}

.mobile-hint {
  display: none;
}

.game-info kbd {
  display: inline-block;
  padding: 3px 8px;
  margin: 0 2px;
  background: #8f7a66;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.restart-btn {
  padding: 10px 20px;
  background: #8f7a66;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
}

.audio-btn {
  padding: 10px 14px;
  background: #5b8a72;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s;
}

.audio-btn:hover {
  background: #6aa284;
  transform: translateY(-2px);
}

.restart-btn:hover {
  background: #9f8a76;
  transform: translateY(-2px);
}

.game-container {
  position: relative;
  width: 100%;
  max-width: 550px;
  margin: 0 auto;
  background: #bbada0;
  border-radius: 12px;
  padding: 18px;
  aspect-ratio: 1;
}

.content.landscape-mobile {
  padding: 8px;
}

.content.landscape-mobile .back-btn {
  top: 8px;
  left: 8px;
  padding: 6px 12px;
  font-size: 13px;
}

.content.landscape-mobile .game-2048 {
  margin-top: 34px;
  padding: 10px;
  max-width: min(100vw - 16px, 760px);
}

.content.landscape-mobile .game-header {
  margin-bottom: 8px;
}

.content.landscape-mobile .game-header h1 {
  font-size: 30px;
}

.content.landscape-mobile .score-box {
  padding: 6px 12px;
}

.content.landscape-mobile .score-value {
  font-size: 18px;
}

.content.landscape-mobile .fold-panels {
  margin-bottom: 8px;
  gap: 6px;
}

.grid-container {
  position: absolute;
  top: 18px;
  left: 18px;
  right: 18px;
  bottom: 18px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 18px;
}

.grid-cell {
  background: rgba(238, 228, 218, 0.35);
  border-radius: 8px;
}

.tile-container {
  position: absolute;
  top: 18px;
  left: 18px;
  right: 18px;
  bottom: 18px;
}

.tile {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  font-size: 42px;
  font-weight: bold;
  transition: all 0.15s ease-in-out;
  width: calc((100% - 54px) / 4);
  height: calc((100% - 54px) / 4);
}

.tile-inner {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

/* 方块位置 */
.tile-position-0-0 {
  top: 0;
  left: 0;
}
.tile-position-0-1 {
  top: 0;
  left: calc((100% - 54px) / 4 + 18px);
}
.tile-position-0-2 {
  top: 0;
  left: calc((100% - 54px) / 4 * 2 + 36px);
}
.tile-position-0-3 {
  top: 0;
  left: calc((100% - 54px) / 4 * 3 + 54px);
}

.tile-position-1-0 {
  top: calc((100% - 54px) / 4 + 18px);
  left: 0;
}
.tile-position-1-1 {
  top: calc((100% - 54px) / 4 + 18px);
  left: calc((100% - 54px) / 4 + 18px);
}
.tile-position-1-2 {
  top: calc((100% - 54px) / 4 + 18px);
  left: calc((100% - 54px) / 4 * 2 + 36px);
}
.tile-position-1-3 {
  top: calc((100% - 54px) / 4 + 18px);
  left: calc((100% - 54px) / 4 * 3 + 54px);
}

.tile-position-2-0 {
  top: calc((100% - 54px) / 4 * 2 + 36px);
  left: 0;
}
.tile-position-2-1 {
  top: calc((100% - 54px) / 4 * 2 + 36px);
  left: calc((100% - 54px) / 4 + 18px);
}
.tile-position-2-2 {
  top: calc((100% - 54px) / 4 * 2 + 36px);
  left: calc((100% - 54px) / 4 * 2 + 36px);
}
.tile-position-2-3 {
  top: calc((100% - 54px) / 4 * 2 + 36px);
  left: calc((100% - 54px) / 4 * 3 + 54px);
}

.tile-position-3-0 {
  top: calc((100% - 54px) / 4 * 3 + 54px);
  left: 0;
}
.tile-position-3-1 {
  top: calc((100% - 54px) / 4 * 3 + 54px);
  left: calc((100% - 54px) / 4 + 18px);
}
.tile-position-3-2 {
  top: calc((100% - 54px) / 4 * 3 + 54px);
  left: calc((100% - 54px) / 4 * 2 + 36px);
}
.tile-position-3-3 {
  top: calc((100% - 54px) / 4 * 3 + 54px);
  left: calc((100% - 54px) / 4 * 3 + 54px);
}

/* 方块颜色 */
.tile-2 {
  background: #eee4da;
  color: #776e65;
}
.tile-4 {
  background: #ede0c8;
  color: #776e65;
}
.tile-8 {
  background: #f2b179;
  color: #f9f6f2;
}
.tile-16 {
  background: #f59563;
  color: #f9f6f2;
}
.tile-32 {
  background: #f67c5f;
  color: #f9f6f2;
}
.tile-64 {
  background: #f65e3b;
  color: #f9f6f2;
}
.tile-128 {
  background: #edcf72;
  color: #f9f6f2;
  font-size: 36px;
}
.tile-256 {
  background: #edcc61;
  color: #f9f6f2;
  font-size: 36px;
}
.tile-512 {
  background: #edc850;
  color: #f9f6f2;
  font-size: 36px;
}
.tile-1024 {
  background: #edc53f;
  color: #f9f6f2;
  font-size: 32px;
}
.tile-2048 {
  background: #edc22e;
  color: #f9f6f2;
  font-size: 32px;
}
.tile-4096 {
  background: #8b4513;
  color: #f9f6f2;
  font-size: 28px;
}
.tile-8192 {
  background: #654321;
  color: #f9f6f2;
  font-size: 28px;
}

/* 动画 */
.tile-new {
  animation: appear 0.2s ease-in-out;
}

.tile-merged {
  animation: pop 0.2s ease-in-out;
}

@keyframes appear {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* 游戏结束提示 */
.game-message {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(238, 228, 218, 0.9);
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  animation: fadeIn 0.3s;
}

.game-won {
  background: rgba(237, 194, 46, 0.95);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.message-container {
  text-align: center;
  padding: 30px;
}

.message-container h2 {
  margin: 0 0 20px 0;
  font-size: 48px;
  color: #776e65;
}

.message-container p {
  margin: 0 0 30px 0;
  font-size: 20px;
  color: #776e65;
}

.try-again-btn,
.continue-btn {
  margin: 0 10px;
  padding: 15px 30px;
  background: #8f7a66;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s;
}

.try-again-btn:hover,
.continue-btn:hover {
  background: #9f8a76;
  transform: translateY(-2px);
}

/* 响应式设计 */
@media (max-width: 600px) {
  .content {
    height: 100%;
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .back-btn {
    top: 10px;
    left: 10px;
    padding: 8px 15px;
    font-size: 14px;
  }

  .game-2048 {
    padding: 15px;
    margin: 40px auto 20px;
    width: calc(100% - 20px);
    max-width: 500px;
    box-sizing: border-box;
  }

  .fold-panels {
    margin-bottom: 10px;
  }

  .fold-toggle {
    font-size: 13px;
    padding: 8px 10px;
  }

  .game-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }

  .game-header h1 {
    font-size: 32px;
  }

  .score-container {
    width: 100%;
    justify-content: space-between;
  }

  .score-box {
    padding: 8px 15px;
    min-width: 60px;
    flex: 1;
  }

  .score-label {
    font-size: 10px;
  }

  .score-value {
    font-size: 18px;
  }

  .game-info {
    flex-direction: column;
    gap: 10px;
    text-align: center;
    padding: 12px;
  }

  .desktop-hint {
    display: none;
  }

  .mobile-hint {
    display: block !important;
    font-size: 16px;
  }

  .restart-btn {
    width: 100%;
    padding: 12px 20px;
  }

  .game-container {
    max-width: 100%;
    padding: 8px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
    touch-action: none; /* 禁用默认触摸行为 */
    user-select: none; /* 防止选中文字 */
  }

  .grid-container,
  .tile-container {
    top: 8px;
    left: 8px;
    right: 8px;
    bottom: 8px;
  }

  .grid-container {
    gap: 8px;
  }

  .tile {
    font-size: 28px;
    width: calc((100% - 24px) / 4);
    height: calc((100% - 24px) / 4);
  }

  /* 更新移动端方块位置 */
  .tile-position-0-0 { top: 0; left: 0; }
  .tile-position-0-1 { top: 0; left: calc((100% - 24px) / 4 + 8px); }
  .tile-position-0-2 { top: 0; left: calc((100% - 24px) / 4 * 2 + 16px); }
  .tile-position-0-3 { top: 0; left: calc((100% - 24px) / 4 * 3 + 24px); }

  .tile-position-1-0 { top: calc((100% - 24px) / 4 + 8px); left: 0; }
  .tile-position-1-1 { top: calc((100% - 24px) / 4 + 8px); left: calc((100% - 24px) / 4 + 8px); }
  .tile-position-1-2 { top: calc((100% - 24px) / 4 + 8px); left: calc((100% - 24px) / 4 * 2 + 16px); }
  .tile-position-1-3 { top: calc((100% - 24px) / 4 + 8px); left: calc((100% - 24px) / 4 * 3 + 24px); }

  .tile-position-2-0 { top: calc((100% - 24px) / 4 * 2 + 16px); left: 0; }
  .tile-position-2-1 { top: calc((100% - 24px) / 4 * 2 + 16px); left: calc((100% - 24px) / 4 + 8px); }
  .tile-position-2-2 { top: calc((100% - 24px) / 4 * 2 + 16px); left: calc((100% - 24px) / 4 * 2 + 16px); }
  .tile-position-2-3 { top: calc((100% - 24px) / 4 * 2 + 16px); left: calc((100% - 24px) / 4 * 3 + 24px); }

  .tile-position-3-0 { top: calc((100% - 24px) / 4 * 3 + 24px); left: 0; }
  .tile-position-3-1 { top: calc((100% - 24px) / 4 * 3 + 24px); left: calc((100% - 24px) / 4 + 8px); }
  .tile-position-3-2 { top: calc((100% - 24px) / 4 * 3 + 24px); left: calc((100% - 24px) / 4 * 2 + 16px); }
  .tile-position-3-3 { top: calc((100% - 24px) / 4 * 3 + 24px); left: calc((100% - 24px) / 4 * 3 + 24px); }

  .tile-128,
  .tile-256,
  .tile-512 {
    font-size: 22px;
  }

  .tile-1024,
  .tile-2048 {
    font-size: 20px;
  }

  .tile-4096,
  .tile-8192 {
    font-size: 18px;
  }

  .message-container {
    padding: 20px;
  }

  .message-container h2 {
    font-size: 32px;
  }

  .message-container p {
    font-size: 16px;
    margin-bottom: 20px;
  }

  .try-again-btn,
  .continue-btn {
    display: block;
    width: 100%;
    margin: 10px 0;
    padding: 12px 20px;
  }
}
</style>
