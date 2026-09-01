<template>
  <div ref="tetrisUiRoot" class="tetris-container tool-page" :class="{ 'mobile-landscape': isMobileLandscape }">
    <div class="tetris-info" v-reveal="{ y: 14, duration: 0.32 }">
      <div>分数：{{ score }}</div>
      <div>状态：{{ isGameOver ? '游戏结束' : (isPaused ? '暂停' : '进行中') }}</div>

      <section class="tetris-fold-card" v-reveal="{ y: 12, duration: 0.28, delay: 0.05 }">
        <button class="tetris-fold-toggle" type="button" @click="controlCollapsed = !controlCollapsed">
          <span>🎮 操作</span>
          <span>{{ controlCollapsed ? '展开' : '收起' }}</span>
        </button>
        <div v-show="!controlCollapsed" class="tetris-fold-body">
          <div class="tetris-btn-group">
            <button @click="startGame" v-if="!isStarted || isGameOver">开始</button>
            <button @click="pauseGame" v-if="isStarted && !isPaused && !isGameOver">暂停</button>
            <button @click="resumeGame" v-if="isPaused && !isGameOver">继续</button>
            <button @click="restartGame" v-if="isStarted">重开</button>
            <button @click="$router.back()" class="back-btn">返回</button>
          </div>
        </div>
      </section>

      <section class="tetris-fold-card" v-reveal="{ y: 12, duration: 0.28, delay: 0.09 }">
        <button class="tetris-fold-toggle" type="button" @click="rankCollapsed = !rankCollapsed">
          <span>🏆 排行榜</span>
          <span>{{ rankCollapsed ? '展开' : '收起' }}</span>
        </button>
        <div v-show="!rankCollapsed" class="tetris-fold-body tetris-rank-board">
          <ol>
            <li v-for="(item, idx) in rankList" :key="`${item.createdAt}-${idx}`">
              <span class="rank-index">第{{ idx + 1 }}名：</span><span class="rank-score">{{ item.ownerUsername || '游客' }} · {{ item.score }} 分</span>
            </li>
          </ol>
        </div>
      </section>
    </div>
    <div class="tetris-board" :style="boardStyle" v-reveal="{ y: 10, duration: 0.26, delay: 0.08 }">
      <div v-for="(row, y) in displayBoard" :key="y" class="tetris-row"
        :class="{ clearing: clearingRows.includes(y), 'fall-shake': fallShakeRows.includes(y) }">
        <div v-for="(cell, x) in row" :key="x" class="tetris-cell"
          :class="{ active: cell.active, filled: !cell.active && cell.color }"
          :style="cell.color ? { background: cell.color, borderColor: cell.color } : {}">
        </div>
      </div>
    </div>
    <FireworksOptimized v-if="showFireworks" ref="fireworks" />
  </div>
</template>
<script>
import { getThemeBlockColors } from '@/utils/theme';
import FireworksOptimized from '@/components/FireworksOptimized.vue';
import { appendGameScoreRecord, getGameLeaderboard } from '@/utils/userGameRecords';


const COLS = 10;
const ROWS = 20;
const SHAPES = [
  // I
  [
    [0,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
    [0,0,0,0]
  ],
  // J
  [
    [1,0,0],
    [1,1,1],
    [0,0,0]
  ],
  // L
  [
    [0,0,1],
    [1,1,1],
    [0,0,0]
  ],
  // O
  [
    [1,1],
    [1,1]
  ],
  // S
  [
    [0,1,1],
    [1,1,0],
    [0,0,0]
  ],
  // T
  [
    [0,1,0],
    [1,1,1],
    [0,0,0]
  ],
  // Z
  [
    [1,1,0],
    [0,1,1],
    [0,0,0]
  ]
];

let THEME_COLORS = getThemeBlockColors();

function getRandomShape() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  // 深拷贝
  return shape.map(row => row.slice());
}

function getRandomColorIndex() {
  return Math.floor(Math.random() * THEME_COLORS.length);
}

export default {
  name: 'Tetris',
  components: {
    FireworksOptimized,
  },
  data() {
    return {
      board: [], // 存颜色索引（数字）或 null
      current: null,
      currentX: 0,
      currentY: 0,
      currentColor: null, // 存索引
      timer: null,
      interval: 500,
      isStarted: false,
      isPaused: false,
      isGameOver: false,
      score: 0,
      themeVersion: 0, // 用于强制刷新
      clearingRows: [], // 正在消除的行索引
      fallShakeRows: [], // 消除后下落的行索引
      // 新增排行榜相关
      rankList: [],
      showFireworks: false,
      isMobileLandscape: false,
      controlCollapsed: false,
      rankCollapsed: false,
      boardCellSize: 24,
    };
  },
  computed: {
    boardStyle() {
      return {
        '--cell-size': `${this.boardCellSize}px`,
      };
    },
    displayBoard() {
      this.themeVersion;
      // 渲染用：固定块为颜色索引，活动块为 currentColor
      let temp = this.board.map(row => row.slice());
      let activeCells = [];
      if (this.current) {
        for (let y = 0; y < this.current.length; y++) {
          for (let x = 0; x < this.current[y].length; x++) {
            if (this.current[y][x]) {
              let px = this.currentX + x;
              let py = this.currentY + y;
              if (py >= 0 && py < temp.length && px >= 0 && px < temp[0].length) {
                temp[py][px] = { color: this.currentColor, active: true };
                activeCells.push(py + '-' + px);
              }
            }
          }
        }
      }
      // 用颜色索引查 THEME_COLORS，返回对象：{ color, active }
      return temp.map((row, y) => row.map((cell, x) => {
        if (cell && typeof cell === 'object' && cell.active) {
          return { color: THEME_COLORS[cell.color], active: true };
        } else if (typeof cell === 'number') {
          return { color: THEME_COLORS[cell], active: false };
        } else {
          return { color: null, active: false };
        }
      }));
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKey);
    window.addEventListener('resize', this.updateLayoutState);
    window.addEventListener('orientationchange', this.updateLayoutState);
    window.visualViewport?.addEventListener('resize', this.updateLayoutState);
    this.resetBoard();
    this.loadRankList();
    this.updateLayoutState();
    // 监听主题变化
    const observer = new MutationObserver(() => {
      THEME_COLORS = getThemeBlockColors();
      this.themeVersion++;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    this._themeObserver = observer;
    // 触摸事件
    const board = this.$el.querySelector('.tetris-board');
    let startX = 0, startY = 0, moved = false;
    if (board) {
      board.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          moved = false;
        }
        // 阻止页面整体滚动
        e.preventDefault && e.preventDefault();
      }, { passive: false });
      board.addEventListener('touchmove', e => {
        if (!this.isStarted || this.isPaused || this.isGameOver) return;
        if (e.touches.length === 1) {
          const dx = e.touches[0].clientX - startX;
          const dy = e.touches[0].clientY - startY;
          if (Math.abs(dx) > 30 && !moved) {
            if (dx > 0) {
              this.handleKey({ key: 'ArrowRight' });
            } else {
              this.handleKey({ key: 'ArrowLeft' });
            }
            moved = true;
          } else if (Math.abs(dy) > 30 && !moved) {
            if (dy > 0) {
              this.handleKey({ key: ' ' });
              moved = true;
            }
          }
        }
        // 阻止页面整体滚动
        e.preventDefault && e.preventDefault();
      }, { passive: false });
      board.addEventListener('touchend', e => {
        if (!moved) {
          this.handleKey({ key: 'ArrowUp' });
        }
        // 阻止页面整体滚动
        e.preventDefault && e.preventDefault();
      }, { passive: false });
    }


  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKey);
    window.removeEventListener('resize', this.updateLayoutState);
    window.removeEventListener('orientationchange', this.updateLayoutState);
    window.visualViewport?.removeEventListener('resize', this.updateLayoutState);
    this.stopTimer();
    if (this._themeObserver) this._themeObserver.disconnect();

  },
  methods: {
    updateLayoutState() {
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      this.isMobileLandscape = viewportWidth <= 900 && viewportWidth > viewportHeight;

      if (this.isMobileLandscape) {
        this.controlCollapsed = true;
        this.rankCollapsed = true;
      } else {
        this.controlCollapsed = false;
        this.rankCollapsed = false;
      }

      const maxCellByWidth = Math.floor((viewportWidth - 24) / COLS);
      const maxCellByHeight = Math.floor((viewportHeight - (this.isMobileLandscape ? 140 : 220)) / ROWS);
      this.boardCellSize = Math.max(14, Math.min(34, maxCellByWidth, maxCellByHeight));
    },
    resetBoard() {
      this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    },
    // 排行榜相关
    loadRankList() {
      getGameLeaderboard('tetris', 10).then((records) => {
        this.rankList = records;
      });
    },
    async addScoreToRank(score) {
      const result = await appendGameScoreRecord('tetris', score, {
        mode: 'single',
        game: 'tetris'
      }, 10);
      this.rankList = result.leaderboard;
      return result;
    },
    startGame() {
      this.resetBoard();
      this.score = 0;
      this.isStarted = true;
      this.isPaused = false;
      this.isGameOver = false;
      this.spawn();
      this.startTimer();
    },
    pauseGame() {
      this.isPaused = true;
      this.stopTimer();
    },
    resumeGame() {
      this.isPaused = false;
      this.startTimer();
    },
    restartGame() {
      this.startGame();
    },
    startTimer() {
      this.stopTimer();
      this.timer = setInterval(this.tick, this.interval);
    },
    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    spawn() {
      this.current = getRandomShape();
      this.currentY = 0;
      this.currentX = Math.floor((COLS - this.current[0].length) / 2);
      this.currentColor = Math.floor(Math.random() * THEME_COLORS.length);
      if (!this.isValid(this.currentX, this.currentY, this.current)) {
        this.isGameOver = true;
        this.addScoreToRank(this.score).then((result) => {
          if (result?.isTopRecord) {
            this.showFireworks = true;
            this.$nextTick(() => {
              this.$refs.fireworks && this.$refs.fireworks.startFireworksShow(5000);
              setTimeout(() => { this.showFireworks = false; }, 5200);
            });
          }
        });
        this.stopTimer();
      }
    },
    merge() {
      for (let y = 0; y < this.current.length; y++) {
        for (let x = 0; x < this.current[y].length; x++) {
          if (this.current[y][x]) {
            this.board[this.currentY + y][this.currentX + x] = this.currentColor;
          }
        }
      }
    },
    isValid(nx, ny, shape) {
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            let px = nx + x;
            let py = ny + y;
            if (px < 0 || px >= COLS || py < 0 || py >= ROWS) return false;
            if (this.board[py][px]) return false;
          }
        }
      }
      return true;
    },
    tick() {
      if (this.isPaused || this.isGameOver) return;
      if (this.isValid(this.currentX, this.currentY + 1, this.current)) {
        this.currentY++;
      } else {
        this.merge();
        this.clearLines();
        this.spawn();
      }
    },
    async clearLines(extraShakeRows = []) {
      let lines = 0;
      let toClear = [];
      for (let y = ROWS - 1; y >= 0; y--) {
        if (this.board[y].every(cell => cell !== null)) {
          toClear.push(y);
        }
      }
      if (toClear.length > 0) {
        this.clearingRows = toClear;
        await new Promise(resolve => setTimeout(resolve, 350));
        // 新方案：一次性重建 board，彻底避免错位
        let fallRows = [];
        const toClearSet = new Set(toClear);
        const newBoard = this.board.filter((row, idx) => !toClearSet.has(idx));
        lines = toClear.length;
        while (newBoard.length < ROWS) {
          newBoard.unshift(Array(COLS).fill(null));
        }
        // 计算哪些行需要震动（被消除行之上的所有非空行）
        let minCleared = Math.min(...toClear);
        for (let y = 0; y < minCleared; y++) {
          if (newBoard[y].some(cell => cell !== null)) {
            fallRows.push(y);
          }
        }
        this.board = newBoard;
        this.clearingRows = [];
        this.fallShakeRows = fallRows;
        await new Promise(resolve => setTimeout(resolve, 220));
        this.fallShakeRows = [];
      } else if (extraShakeRows.length > 0) {
        // 没有消除，但需要震动（如快速落地）
        this.fallShakeRows = Array.from(new Set(extraShakeRows));
        await new Promise(resolve => setTimeout(resolve, 220));
        this.fallShakeRows = [];
      }
      if (lines > 0) {
        this.score += lines * 100;
      }
    },
    handleKey(e) {
      if (!this.isStarted || this.isPaused || this.isGameOver) return;
      if (!this.current) return;
      // 阻止方向键和空格键的默认行为（如页面滚动）
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) {
        e.preventDefault && e.preventDefault();
        e.stopPropagation && e.stopPropagation();
      }
      if (e.key === 'ArrowLeft') {
        if (this.isValid(this.currentX - 1, this.currentY, this.current)) {
          this.currentX--;
        }
      } else if (e.key === 'ArrowRight') {
        if (this.isValid(this.currentX + 1, this.currentY, this.current)) {
          this.currentX++;
        }
      } else if (e.key === 'ArrowDown') {
        // 只移动，不写入 board
        if (this.isValid(this.currentX, this.currentY + 1, this.current)) {
          this.currentY++;
        }
      } else if (e.key === 'ArrowUp') {
        // 旋转
        const rotated = this.rotate(this.current);
        if (this.isValid(this.currentX, this.currentY, rotated)) {
          this.current = rotated;
        }
      } else if (e.key === ' ') {
        // 空格快速下落到底
        while (this.isValid(this.currentX, this.currentY + 1, this.current)) {
          this.currentY++;
        }
        // 记录当前方块所在行
        let rows = [];
        for (let y = 0; y < this.current.length; y++) {
          for (let x = 0; x < this.current[y].length; x++) {
            if (this.current[y][x]) {
              let py = this.currentY + y;
              if (py >= 0 && py < ROWS) rows.push(py);
            }
          }
        }
        // 到底后才 merge
        this.merge();
        this.clearLines(rows);
        this.spawn();
      }
    },
    rotate(shape) {
      // 顺时针旋转
      const N = shape.length;
      let ret = Array.from({ length: N }, () => Array(N).fill(0));
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          ret[x][N - 1 - y] = shape[y][x];
        }
      }
      return ret;
    },
  }
};
</script>
<style scoped>

.tetris-container {
  min-height: 98vh;
  background: var(--bg-main, #f7f8fa);
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  gap: 48px;
  overflow-x: hidden;
  padding: 40px 0 0 0;
}
@media (max-width: 900px) {
  .tetris-container {
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin: 0 auto;
    width: 100%;
    min-height: 100%;
    justify-content: center;
    padding: 0;
  }
}
.tetris-info {
  min-width: 180px;
  max-width: 260px;
  background: var(--bg-cell, #fff);
  border-radius: 12px;
  box-shadow: 0 2px 12px #0001;
  padding: 20px 18px 16px;
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

.tetris-fold-card {
  border-radius: 10px;
  border: 1px solid #e4ecf7;
  background: #f8fbff;
  overflow: hidden;
}

.tetris-fold-toggle {
  width: 100%;
  border: none;
  background: #ecf4ff;
  color: #1e40af;
  font-size: 0.9rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  cursor: pointer;
}

.tetris-fold-body {
  padding: 8px;
}

@media (max-width: 900px) {
  .tetris-info {
    max-width: 100vw;
    min-width: 0;
    width: 100%;
    box-shadow: none;
    border-radius: 0;
    padding: 10px 8px;
    margin-top: 0;
    align-items: stretch;
    gap: 8px;
  }
}
.tetris-board {
  --cell-size: 24px;
  display: flex;
  flex-direction: column;
  background: var(--bg-cell, #fff);
  border: 4px solid #444;
  border-radius: 8px;
  box-shadow: 0 2px 8px #0006;
  width: calc(var(--cell-size) * 10);
  height: calc(var(--cell-size) * 20);
  min-width: calc(var(--cell-size) * 10);
  min-height: calc(var(--cell-size) * 20);
}
.tetris-row {
  display: flex;
  flex-direction: row;
  height: var(--cell-size);
}
.tetris-row.clearing {
  animation: tetris-row-clear 0.35s linear;
}
@keyframes tetris-row-clear {
  0% { opacity: 1; transform: scaleY(1); }
  60% { opacity: 0.2; transform: scaleY(0.2); }
  100% { opacity: 0; transform: scaleY(0); }
}
.tetris-row.fall-shake {
  animation: tetris-row-fall-shake 0.22s cubic-bezier(.36, .07, .19, .97) 1;
}
@keyframes tetris-row-fall-shake {
  0% { transform: translateY(-6px); }
  30% { transform: translateY(2px); }
  60% { transform: translateY(-2px); }
  80% { transform: translateY(1px); }
  100% { transform: translateY(0); }
}
.tetris-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  border: 1px solid #333;
  background: #222;
  box-sizing: border-box;
}
.tetris-cell.filled {
  /* 固定块也用活动块的立体渐变和阴影样式 */
  background: linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 30%, var(--cell-main, #ffd54f) 70%, rgba(0,0,0,0.15) 100%), var(--cell-main, #ffd54f);
  border: 2px solid #fffbe7;
  box-shadow: 0 2px 8px 0 #0004, 0 0 0 2px rgba(255,255,255,0.3) inset;
  position: relative;
}
.tetris-cell.filled::after {
  content: '';
  display: block;
  position: absolute;
  left: 3px; top: 3px; right: 3px; height: 7px;
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(90deg, rgba(255,255,255,0.7), rgba(255,255,255,0.1));
  pointer-events: none;
}
.tetris-cell.active {
  /* 立体渐变背景 */
  background: linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 30%, var(--cell-main, #ffd54f) 70%, rgba(0,0,0,0.15) 100%), var(--cell-main, #ffd54f);
  border: 2px solid #fffbe7;
  box-shadow: 0 2px 8px 0 #0004, 0 0 0 2px rgba(255,255,255,0.3) inset;
  position: relative;
}
.tetris-cell.active::after {
  content: '';
  display: block;
  position: absolute;
  left: 3px; top: 3px; right: 3px; height: 7px;
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(90deg, rgba(255,255,255,0.7), rgba(255,255,255,0.1));
  pointer-events: none;
}
button {
  padding: 8px 24px;
  margin: 6px 0;
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  background: var(--button, linear-gradient(90deg, #ffe082 0%, #ffd54f 100%));
  color: var(--button-text, #7c5700);
  box-shadow: 0 2px 8px #0002, 0 1px 0 #fff8 inset;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
}
button:hover, button:focus {
  background: var(--button-hover, linear-gradient(90deg, #ffd54f 0%, #ffecb3 100%));
  box-shadow: 0 4px 16px #0003, 0 2px 0 #fff8 inset;
  transform: translateY(-2px) scale(1.04);
}
button:active {
  background: var(--button, linear-gradient(90deg, #ffe082 0%, #ffd54f 100%));
  box-shadow: 0 1px 2px #0002 inset;
  transform: scale(0.98);
}
.back-btn {
  margin: 0;
  padding: 8px 24px;
  background: var(--button, linear-gradient(90deg, #ffe082 0%, #ffd54f 100%));
  color: var(--button-text, #7c5700);
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  box-shadow: 0 2px 8px #0002, 0 1px 0 #fff8 inset;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
}
.back-btn:hover, .back-btn:focus {
  background: var(--button-hover, linear-gradient(90deg, #ffd54f 0%, #ffecb3 100%));
  box-shadow: 0 4px 16px #0003, 0 2px 0 #fff8 inset;
  transform: translateY(-2px) scale(1.04);
}
.back-btn:active {
  background: var(--button, linear-gradient(90deg, #ffe082 0%, #ffd54f 100%));
  box-shadow: 0 1px 2px #0002 inset;
  transform: scale(0.98);
}
.tetris-rank-board {
  width: 100%;
  max-height: 220px;
  overflow-y: auto;
  margin-top: 0;
  background: rgba(255,255,255,0.92);
  border-radius: 0.7rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 0.6rem 0.7rem;
  font-size: 0.95rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.tetris-rank-board ol {
  margin: 0;
  padding-left: 1.1em;
  width: 100%;
}
.tetris-rank-board li {
  margin-bottom: 0.2em;
  font-size: 0.98em;
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 1.7em;
}
.rank-index {
  display: inline-block;
  min-width: 4.5em;
  text-align: right;
  color: #888;
}
.rank-score {
  display: inline-block;
  margin-left: 0.5em;
  color: #222;
  font-weight: bold;
}
@media (max-width: 900px) {
  .tetris-rank-board {
    font-size: 0.85rem;
    padding: 0.4rem 0.5rem;
    margin-top: 0;
    align-items: stretch;
    max-height: 160px;
  }
  .tetris-rank-board li {
    min-height: 1.3em;
  }
}

.tetris-container.mobile-landscape {
  gap: 8px;
  padding-top: 4px;
}

.tetris-container.mobile-landscape .tetris-info {
  width: calc(100vw - 12px);
  max-width: 680px;
  margin-top: 2px;
  padding: 8px;
  gap: 6px;
}

.tetris-container.mobile-landscape .tetris-fold-toggle {
  font-size: 0.82rem;
  padding: 6px 8px;
}
</style>