<template>
  <div class="tetris-container">
    <div class="tetris-info">
      <div>分数：{{ score }}</div>
      <div>状态：{{ isGameOver ? '游戏结束' : (isPaused ? '暂停' : '进行中') }}</div>
      <button @click="startGame" v-if="!isStarted || isGameOver">开始</button>
      <button @click="pauseGame" v-if="isStarted && !isPaused && !isGameOver">暂停</button>
      <button @click="resumeGame" v-if="isPaused && !isGameOver">继续</button>
      <button @click="restartGame" v-if="isStarted">重开</button>
    </div>
    <div class="tetris-board">
      <div v-for="(row, y) in displayBoard" :key="y" class="tetris-row">
        <div v-for="(cell, x) in row" :key="x" class="tetris-cell"
          :style="cell ? { background: cell, borderColor: cell } : {}">
        </div>
      </div>
    </div>
  </div>
</template>
<script>
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

const MORANDI_COLORS = [
  '#B7AFA3', // 莫兰迪灰
  '#A7A69D', // 莫兰迪绿灰
  '#C1B7A3', // 莫兰迪米
  '#A3A7B7', // 莫兰迪蓝灰
  '#B7A3A7', // 莫兰迪粉灰
  '#B7B3A3', // 莫兰迪黄灰
  '#A3B7B3', // 莫兰迪青灰
  '#B7A3B3', // 莫兰迪紫灰
  '#A3B3B7', // 莫兰迪蓝绿
  '#B3B7A3'  // 莫兰迪橄榄
];

function getRandomShape() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  // 深拷贝
  return shape.map(row => row.slice());
}

export default {
  name: 'Tetris',
  data() {
    return {
      board: [], // 存颜色字符串或 null
      current: null,
      currentX: 0,
      currentY: 0,
      currentColor: '',
      timer: null,
      interval: 500,
      isStarted: false,
      isPaused: false,
      isGameOver: false,
      score: 0,
    };
  },
  computed: {
    displayBoard() {
      // 渲染用：固定块为颜色字符串，活动块为 currentColor
      let temp = this.board.map(row => row.slice());
      if (this.current) {
        for (let y = 0; y < this.current.length; y++) {
          for (let x = 0; x < this.current[y].length; x++) {
            if (this.current[y][x]) {
              let px = this.currentX + x;
              let py = this.currentY + y;
              if (py >= 0 && py < temp.length && px >= 0 && px < temp[0].length) {
                temp[py][px] = this.currentColor || '#B7AFA3';
              }
            }
          }
        }
      }
      return temp;
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKey);
    this.resetBoard();
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
      });
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
              this.handleKey({ key: 'ArrowDown' });
              moved = true;
            }
          }
        }
      });
      board.addEventListener('touchend', e => {
        if (!moved) {
          // 轻点旋转
          this.handleKey({ key: 'ArrowUp' });
        }
      });
    }
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKey);
    this.stopTimer();
  },
  methods: {
    resetBoard() {
      this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
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
      this.currentColor = MORANDI_COLORS[Math.floor(Math.random() * MORANDI_COLORS.length)];
      if (!this.isValid(this.currentX, this.currentY, this.current)) {
        this.isGameOver = true;
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
    clearLines() {
      let lines = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (this.board[y].every(cell => cell)) {
          this.board.splice(y, 1);
          this.board.unshift(Array(COLS).fill(null));
          lines++;
          y++;
        }
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
        // 到底后才 merge
        this.tick();
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
  display: flex;
  flex-direction: row;
  gap: 24px;
  margin: 32px auto;
  width: max-content;
  max-width: 100vw;
}
@media (max-width: 600px) {
  .tetris-container {
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin: 8px auto;
    width: 100vw;
  }
  .tetris-board {
    width: 96vw;
    height: 192vw;
    max-width: 320px;
    max-height: 640px;
  }
  .tetris-row {
    height: calc(192vw / 20);
  }
  .tetris-cell {
    width: calc(96vw / 10);
    height: calc(192vw / 20);
  }
}
.tetris-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: flex-start;
}
.tetris-board {
  display: flex;
  flex-direction: column;
  background: #222;
  border: 4px solid #444;
  border-radius: 8px;
  box-shadow: 0 2px 8px #0006;
  width: 240px;
  height: 480px;
}
.tetris-row {
  display: flex;
  flex-direction: row;
  height: 24px;
}
.tetris-cell {
  width: 24px;
  height: 24px;
  border: 1px solid #333;
  background: #222;
  box-sizing: border-box;
}
.tetris-cell.filled {
  background: #4dd0e1;
  border: 1px solid #00bcd4;
}
.tetris-cell.active {
  background: #ffb300;
  border: 1px solid #ff9800;
}
</style>