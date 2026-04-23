<template>
  <div class="content">
    <button @click="$router.back()" class="back-btn">返回</button>
    <div class="snake-game">
      <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight" :style="canvasStyle" />
      <div v-if="gameOver" class="game-over">
        游戏结束！分数：{{ score }}
        <button @click="restart">重新开始</button>
      </div>
      <Fireworks v-if="showFireworks" ref="fireworksRef" />
    </div>
    <div class="rank-board-bottom">
      <h3>分数排行榜</h3>
      <ol>
        <li v-for="(item, idx) in rankList" :key="`${item.createdAt}-${idx}`">
          第{{ idx + 1 }}名：{{ item.ownerUsername || '游客' }} · {{ item.score }} 分
        </li>
      </ol>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { getThemeBlockColors } from '@/utils/theme';
import Fireworks from '@/components/FireworksOptimized.vue';
import { appendGameScoreRecord, getGameLeaderboard } from '@/utils/userGameRecords';

// 响应式 canvas 尺寸
const cellSize = 20;
const cols = 400 / cellSize;
const rows = 400 / cellSize;
const minCanvasSize = 1;
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

let THEME_COLORS = getThemeBlockColors();

function getInterval() {
  // 基础速度120ms，分数每增加10，速度提升10ms，最低40ms
  return Math.max(40, 120 - Math.floor(score.value / 10) * 10);
}

function updateCanvasSize() {
  // 以屏幕宽高为准，最大400px，最小200px，且不超出屏幕
  const size = Math.max(minCanvasSize, Math.min(Math.min(window.innerWidth, window.innerHeight), maxCanvasSize));
  canvasWidth.value = size;
  canvasHeight.value = size;
}

// 新增：动画相关状态
let animating = false;
let animationStart = 0;
let animationDuration = 80; // ms，越小越快
let prevSnake = null;
let prevDirection = null;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpWrap(a, b, t, max, isY = false) {
  // 普通插值
  if (Math.abs(b - a) <= 1) return lerp(a, b, t);
  // 向上穿墙（y: 0 -> max-1）
  if (isY && a === 0 && b === max - 1) {
    // t=0时在0，t=1时在max-1，动画向上冒出
    return (a - t + max) % max;
  }
  // 向下穿墙（y: max-1 -> 0）
  if (isY && a === max - 1 && b === 0) {
    // t=0时在max-1，t=1时在0，动画向下冒出
    return (a + t) % max;
  }
  // 横向穿墙
  if (!isY && a === 0 && b === max - 1) return (lerp(a - 1, a, t) + max) % max;
  if (!isY && a === max - 1 && b === 0) return lerp(a, max, t) % max;
  // 其他情况
  return lerp(a, b, t);
}

function draw(interp = 1) {
  if (!canvas.value) return; // 防御性处理，canvas 未挂载时不执行
  const ctx = canvas.value.getContext('2d');
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  const scaleX = canvasWidth.value / cols;
  const scaleY = canvasHeight.value / rows;
  // 画蛇
  let snakeToDraw = snake.value;
  let directionToDraw = direction.value;
  if (animating && prevSnake && prevSnake.length === snake.value.length) {
    snakeToDraw = snake.value.map((seg, i) => {
      const from = prevSnake[i];
      return {
        x: lerpWrap(from.x, seg.x, interp, cols, false),
        y: lerpWrap(from.y, seg.y, interp, rows, true)
      };
    });
    directionToDraw = prevDirection;
  }
  const head = snakeToDraw[0];
  // 画蛇身（扁平化：纯色矩形）
  for (let i = snakeToDraw.length - 1; i >= 1; i--) {
    const seg = snakeToDraw[i];
    ctx.fillStyle = THEME_COLORS[1] || '#6abf69';
    ctx.fillRect(seg.x * scaleX + scaleX * 0.1, seg.y * scaleY + scaleY * 0.1, scaleX * 0.8, scaleY * 0.8);
  }
  // 画蛇头（扁平化：纯色方块）
  ctx.save();
  ctx.fillStyle = THEME_COLORS[0] || 'green';
  ctx.fillRect(head.x * scaleX + scaleX * 0.1, head.y * scaleY + scaleY * 0.1, scaleX * 0.8, scaleY * 0.8);
  // 画蛇头眼睛（扁平化：黑白小方块）
  let eyeOffsetX = 0, eyeOffsetY = 0;
  if (directionToDraw === 'right') eyeOffsetX = 0.25, eyeOffsetY = -0.18;
  else if (directionToDraw === 'left') eyeOffsetX = -0.25, eyeOffsetY = -0.18;
  else if (directionToDraw === 'up') eyeOffsetY = -0.25, eyeOffsetX = 0.18;
  else if (directionToDraw === 'down') eyeOffsetY = 0.25, eyeOffsetX = 0.18;
  const headX = (head.x + 0.5) * scaleX;
  const headY = (head.y + 0.5) * scaleY;
  const headR = Math.min(scaleX, scaleY) * 0.45;
  for (let i = -1; i <= 1; i += 2) {
    // 眼白
    ctx.fillStyle = '#fff';
    ctx.fillRect(
      headX + eyeOffsetX * headR * 1.1 * i - headR * 0.13,
      headY + eyeOffsetY * headR * 1.1 * i - headR * 0.13,
      headR * 0.26,
      headR * 0.26
    );
    // 眼珠
    ctx.fillStyle = '#222';
    ctx.fillRect(
      headX + eyeOffsetX * headR * 1.1 * i - headR * 0.065,
      headY + eyeOffsetY * headR * 1.1 * i - headR * 0.065,
      headR * 0.13,
      headR * 0.13
    );
  }
  // 方块嘴巴（简单横线）
  ctx.strokeStyle = '#333';
  ctx.lineWidth = headR * 0.09;
  ctx.beginPath();
  ctx.moveTo(headX - headR * 0.18, headY + headR * 0.22);
  ctx.lineTo(headX + headR * 0.18, headY + headR * 0.22);
  ctx.stroke();
  ctx.restore();
  // 画食物（扁平化：纯色圆形，特殊果实加阴影）
  ctx.save();
  const foodX = (food.value.x + 0.5) * scaleX;
  const foodY = (food.value.y + 0.5) * scaleY;
  const foodR = Math.min(scaleX, scaleY) * 0.35;
  if (food.value.type.score > 1) {
    ctx.shadowColor = food.value.type.color;
    ctx.shadowBlur = 16;
  }
  ctx.beginPath();
  ctx.arc(foodX, foodY, foodR, 0, Math.PI * 2);
  ctx.fillStyle = food.value.type.color;
  ctx.fill();
  ctx.restore();
}

function move() {
  if (gameOver.value || animating) return;
  prevSnake = snake.value.map(seg => ({ ...seg }));
  prevDirection = direction.value;
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
    void addScoreToRank(score.value);
    clearInterval(timer);
    return;
  }

  snake.value.unshift(head);
  // 吃到食物
  if (head.x === food.value.x && head.y === food.value.y) {
    score.value += food.value.type.score;
    placeFood();
    clearInterval(timer);
    timer = setInterval(move, getInterval());
  } else {
    snake.value.pop();
  }
  // 启动动画
  animating = true;
  animationStart = performance.now();
  requestAnimationFrame(animateMove);
}

function animateMove(now) {
  // 优化：只在动画未结束时 requestAnimationFrame，结束后只 draw(1) 一次
  const t = Math.min(1, (now - animationStart) / animationDuration);
  draw(t);
  if (t < 1) {
    requestAnimationFrame(animateMove);
  } else {
    animating = false;
    // 只在动画结束时再补一次最终帧
    if (t !== 1) draw(1);
  }
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

const router = useRouter();
function goBack() {
  router.back();
}

// 排行榜相关
const rankList = ref([]);

function loadRankList() {
  getGameLeaderboard('snake', 10).then((records) => {
    rankList.value = records;
  });
}

const showFireworks = ref(false);
const fireworksRef = ref(null);

async function addScoreToRank(score) {
  const result = await appendGameScoreRecord('snake', score, {
    mode: 'single',
    game: 'snake'
  }, 10);
  rankList.value = result.leaderboard;
  // 判断是否破纪录，自动播放烟花
  if (result.isTopRecord) {
    showFireworks.value = true;
    nextTick(() => {
      if (fireworksRef.value && fireworksRef.value.startFireworksShow) {
        fireworksRef.value.startFireworksShow(5000);
      }
      setTimeout(() => { showFireworks.value = false; }, 5200);
    });
  }
}

// 监听主题变化
onMounted(() => {
  loadRankList();
  updateCanvasSize();
  draw();
  window.addEventListener('resize', updateCanvasSize);
  window.addEventListener('keydown', keydown);
  // 触摸事件
  canvas.value.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.value.addEventListener('touchend', handleTouchEnd, { passive: false });
  timer = setInterval(move, getInterval());

  const observer = new MutationObserver(() => {
    THEME_COLORS = getThemeBlockColors();
    draw();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  // 保存 observer 以便卸载
  window._snakeThemeObserver = observer;
});

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize);
  window.removeEventListener('keydown', keydown);
  if (canvas.value) {
    canvas.value.removeEventListener('touchstart', handleTouchStart);
    canvas.value.removeEventListener('touchend', handleTouchEnd);
  }
  clearInterval(timer);
  if (window._snakeThemeObserver) window._snakeThemeObserver.disconnect();
});
</script>

<style scoped>
.content {
  min-height: 98vh;
  background: var(--bg-main, #f7f8fa);
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  /* 禁止左右滚动 */
}

.snake-game {
  position: relative;
  width: 95%;
  height: 95%;
  max-width: 400px;
  max-height: 400px;
  min-width: 200px;
  min-height: 200px;
  margin: 0 auto;
  aspect-ratio: 1/1;
  box-sizing: border-box;
  /* background: var(--bg-cell, #fff); */
}

canvas {
  border: 1.5px solid #333;
  background: #fafafa;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  border-radius: 1.2rem;
  max-width: 100vw;
  max-height: 100vh;
}

.game-over {
  position: absolute;
  top: 40%;
  left: 0;
  width: 100%;
  text-align: center;
  background: rgba(255, 255, 255, 0.85);
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
  background: var(--button, #4caf50);
  color: var(--button-text, #fff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.back-btn {
  margin: 16px;
  padding: 6px 18px;
  background: var(--button, #409eff);
  color: var(--button-text, #fff);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.back-btn:hover {
  background: var(--button-hover, #66b1ff);
}

.rank-board,
.rank-board-bottom {
  /* 统一样式，便于后续维护 */
  background: rgba(255,255,255,0.92);
  border-radius: 0.7rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 0.7rem 0.7rem 0.7rem 1.1rem;
  font-size: 1rem;
  margin: 0 auto;
  max-width: 400px;
}
.rank-board-bottom {
  position: static;
  width: 100%;
  margin: 2.2rem auto 0 auto;
  text-align: left;
  box-sizing: border-box;
  padding: 1.1rem 1.2rem 1.1rem 1.2rem;
  max-width: 400px;
}
.rank-board-bottom h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.08rem;
  color: #409eff;
}
.rank-board-bottom ol {
  margin: 0;
  padding-left: 1.1em;
}
.rank-board-bottom li {
  margin-bottom: 0.2em;
  font-size: 0.98em;
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
  .rank-board-bottom {
    font-size: 0.85rem;
    padding: 0.7rem 0.5rem 0.7rem 0.5rem;
    max-width: 98vw;
    margin-top: 1.2rem;
  }
  .rank-board-bottom h3 {
    font-size: 0.92rem;
  }
}
</style>
