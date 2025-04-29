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
const baseSize = 400;
const cellSize = 20;
const cols = baseSize / cellSize;
const rows = baseSize / cellSize;

const canvas = ref(null);
const snake = ref([
  { x: 5, y: 5 },
]);
const direction = ref('right');
const food = ref({ x: 10, y: 10 });
const gameOver = ref(false);
const score = ref(0);
let timer = null;

// 适配移动端，canvas 宽高自适应
const canvasWidth = ref(baseSize);
const canvasHeight = ref(baseSize);
const canvasStyle = computed(() => ({
  width: '100%',
  height: 'auto',
  maxWidth: '100vw',
  maxHeight: '100vw',
  display: 'block',
  touchAction: 'none',
}));

function updateCanvasSize() {
  // 以屏幕宽度为准，最大 400px
  const size = Math.min(window.innerWidth, 400);
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
  ctx.fillStyle = 'red';
  ctx.fillRect(food.value.x * scaleX, food.value.y * scaleY, scaleX, scaleY);
}

function move() {
  if (gameOver.value) return;
  const head = { ...snake.value[0] };
  if (direction.value === 'right') head.x++;
  else if (direction.value === 'left') head.x--;
  else if (direction.value === 'up') head.y--;
  else if (direction.value === 'down') head.y++;

  // 撞墙或撞自己
  if (
    head.x < 0 || head.x >= cols ||
    head.y < 0 || head.y >= rows ||
    snake.value.some(seg => seg.x === head.x && seg.y === head.y)
  ) {
    gameOver.value = true;
    clearInterval(timer);
    return;
  }

  snake.value.unshift(head);
  // 吃到食物
  if (head.x === food.value.x && head.y === food.value.y) {
    score.value++;
    placeFood();
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
  timer = setInterval(move, 120);
}

onMounted(() => {
  updateCanvasSize();
  draw();
  window.addEventListener('resize', updateCanvasSize);
  window.addEventListener('keydown', keydown);
  // 触摸事件
  canvas.value.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.value.addEventListener('touchend', handleTouchEnd, { passive: false });
  timer = setInterval(move, 120);
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
  margin: 0 auto;
  padding-top: 10vw;
  box-sizing: border-box;
}
canvas {
  border: 1px solid #333;
  background: #fafafa;
  width: 100%;
  height: auto;
  display: block;
  touch-action: none;
}
.game-over {
  position: absolute;
  top: 40%;
  left: 0;
  width: 100%;
  text-align: center;
  background: rgba(255,255,255,0.8);
  font-size: 1.2rem;
  padding: 1.2rem 0;
}
button {
  font-size: 1rem;
  padding: 0.6rem 1.2rem;
  margin-top: 1rem;
  border-radius: 0.5rem;
  border: none;
  background: #4caf50;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
</style>
