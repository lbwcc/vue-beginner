<template>
  <div class="snake-game">
    <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight" :style="canvasStyle" />
    <div v-if="gameOver" class="game-over">
      游戏结束！分数：{{ score }}
      <button @click="restart">重新开始</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

// 响应式 canvas 尺寸
const cellSize = 20;
const cols = 400 / cellSize;
const rows = 400 / cellSize;
const minCanvasSize = 200;
const maxCanvasSize = 400;

const canvasWidth = ref(maxCanvasSize);
const canvasHeight = ref(maxCanvasSize);

const canvas = ref(null);
const snake = ref([
  { x: 5, y: 5 },
]);
const direction = ref('right');
const foodTypes = [
  { score: 1, color: 'red' },
  { score: 3, color: 'gold' },
  { score: 5, color: 'blue' },
];
const food = ref({ x: 10, y: 10, type: foodTypes[0] });
const gameOver = ref(false);
const score = ref(0);
let timer = null;

function getInterval() {
  // 基础速度120ms，分数每增加10，速度提升10ms，最低40ms
  return Math.max(40, 120 - Math.floor(score.value / 10) * 10);
}

function updateCanvasSize() {
  // 以屏幕宽度为准，最大400px，最小200px
  const size = Math.max(minCanvasSize, Math.min(window.innerWidth, maxCanvasSize));
  canvasWidth.value = size;
  canvasHeight.value = size;
}

function draw() {
  const ctx = canvas.value.getContext('2d');
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  const scaleX = canvasWidth.value / cols;
  const scaleY = canvasHeight.value / rows;
  // 画蛇
  ctx.fillStyle = 'green';
  snake.value.forEach(seg => {
    ctx.fillRect(seg.x * scaleX, seg.y * scaleY, scaleX, scaleY);
  });
  // 画食物
  ctx.fillStyle = food.value.type.color;
  ctx.fillRect(food.value.x * scaleX, food.value.y * scaleY, scaleX, scaleY);
}

function move() {
  if (gameOver.value) return;
  const head = { ...snake.value[0] };
  if (direction.value === 'right') head.x++;
  else if (direction.value === 'left') head.x--;
  else if (direction.value === 'up') head.y--;
  else if (direction.value === 'down') head.y++;

  // 穿墙处理
  if (head.x < 0) head.x = cols - 1;
  if (head.x >= cols) head.x = 0;
  if (head.y < 0) head.y = rows - 1;
  if (head.y >= rows) head.y = 0;

  // 撞自己
  if (snake.value.some(seg => seg.x === head.x && seg.y === head.y)) {
    gameOver.value = true;
    clearInterval(timer);
    return;
  }

  snake.value.unshift(head);
  // 吃到食物
  if (head.x === food.value.x && head.y === food.value.y) {
    score.value += food.value.type.score;
    placeFood();
    // 分数变化后，重设速度
    clearInterval(timer);
    timer = setInterval(move, getInterval());
  } else {
    snake.value.pop();
  }
  draw();
}

function placeFood() {
  let newFood;
  do {
    newFood = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
      type: foodTypes[Math.floor(Math.random() * foodTypes.length)]
    };
  } while (snake.value.some(seg => seg.x === newFood.x && seg.y === newFood.y));
  food.value = newFood;
}

function keydown(e) {
  if (e.key === 'ArrowUp' && direction.value !== 'down') direction.value = 'up';
  else if (e.key === 'ArrowDown' && direction.value !== 'up') direction.value = 'down';
  else if (e.key === 'ArrowLeft' && direction.value !== 'right') direction.value = 'left';
  else if (e.key === 'ArrowRight' && direction.value !== 'left') direction.value = 'right';
}

// 触摸滑动支持
let touchStartX = 0;
let touchStartY = 0;
function handleTouchStart(e) {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}
function handleTouchEnd(e) {
  if (e.changedTouches.length === 1) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && direction.value !== 'left') direction.value = 'right';
      else if (dx < -20 && direction.value !== 'right') direction.value = 'left';
    } else {
      if (dy > 20 && direction.value !== 'up') direction.value = 'down';
      else if (dy < -20 && direction.value !== 'down') direction.value = 'up';
    }
  }
}

function restart() {
  snake.value = [{ x: 5, y: 5 }];
  direction.value = 'right';
  score.value = 0;
  gameOver.value = false;
  placeFood();
  draw();
  clearInterval(timer);
  timer = setInterval(move, getInterval());
}

onMounted(() => {
  updateCanvasSize();
  draw();
  window.addEventListener('resize', updateCanvasSize);
  window.addEventListener('keydown', keydown);
  // 触摸事件
  canvas.value.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.value.addEventListener('touchend', handleTouchEnd, { passive: false });
  timer = setInterval(move, getInterval());
});

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize);
  window.removeEventListener('keydown', keydown);
  if (canvas.value) {
    canvas.value.removeEventListener('touchstart', handleTouchStart);
    canvas.value.removeEventListener('touchend', handleTouchEnd);
  }
  clearInterval(timer);
});
</script>

<style scoped>
.snake-game {
  position: relative;
  width: 100vw;
  max-width: 400px;
  min-width: 200px;
  margin: 0 auto;
  padding-top: 8vw;
  box-sizing: border-box;
}
canvas {
  border: 1.5px solid #333;
  background: #fafafa;
  width: 100%;
  height: auto;
  display: block;
  touch-action: none;
  border-radius: 1.2rem;
}
.game-over {
  position: absolute;
  top: 40%;
  left: 0;
  width: 100%;
  text-align: center;
  background: rgba(255,255,255,0.85);
  font-size: 1.3rem;
  padding: 1.5rem 0.5rem;
  border-radius: 1rem;
}
button {
  font-size: 1.1rem;
  padding: 0.8rem 1.5rem;
  margin-top: 1.2rem;
  border-radius: 0.7rem;
  border: none;
  background: #4caf50;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
@media (max-width: 500px) {
  .snake-game {
    padding-top: 2vw;
  }
  .game-over {
    font-size: 1.1rem;
    padding: 1rem 0.2rem;
  }
  button {
    font-size: 1rem;
    padding: 0.7rem 1.1rem;
  }
}
</style>
