<template>
  <div class="content tool-page" :class="{ landscape: isMobileLandscape }" v-reveal="{ y: 12, duration: 0.36 }">
    <button @click="$router.back()" class="back-btn" v-reveal="{ y: 8, duration: 0.24 }">返回</button>
    <div class="score-strip" v-reveal="{ y: 8, duration: 0.22 }">当前分数：{{ score }}</div>
    <div class="snake-game" v-reveal="{ y: 12, duration: 0.3, delay: 0.04 }">
      <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight" :style="canvasStyle" v-reveal="{ y: 8, duration: 0.2 }" />
      <div v-if="gameOver" class="game-over" v-reveal="{ y: 8, duration: 0.24 }">
        游戏结束！分数：{{ score }}
        <button @click="restart">重新开始</button>
      </div>
      <Fireworks v-if="showFireworks" ref="fireworksRef" />
    </div>
    <div class="fold-panels" v-reveal="{ y: 10, duration: 0.28, delay: 0.06 }">
      <section class="fold-card" v-reveal="{ y: 10, duration: 0.22, scroll: true, start: 'top 96%' }">
        <button
          class="fold-toggle"
          type="button"
          :aria-expanded="String(!controlsCollapsed)"
          @click="controlsCollapsed = !controlsCollapsed"
        >
          <span>🎮 操作</span>
          <span>{{ controlsCollapsed ? '展开' : '收起' }}</span>
        </button>
        <div v-show="!controlsCollapsed" class="fold-body control-body">
          <p>电脑：方向键控制移动</p>
          <p>手机：在棋盘上滑动控制方向</p>
          <button class="control-restart" type="button" @click="restart">重新开始</button>
        </div>
      </section>

      <section class="fold-card" v-reveal="{ y: 10, duration: 0.22, scroll: true, start: 'top 96%' }">
        <button
          class="fold-toggle"
          type="button"
          :aria-expanded="String(!rankCollapsed)"
          @click="rankCollapsed = !rankCollapsed"
        >
          <span>🏆 排行榜</span>
          <span>{{ rankCollapsed ? '展开' : '收起' }}</span>
        </button>
        <div v-show="!rankCollapsed" class="fold-body rank-board-bottom">
          <ol>
            <li v-for="(item, idx) in rankList" :key="`${item.createdAt}-${idx}`">
              <span class="rank-badge">{{ idx + 1 }}</span>
              <span class="rank-user">{{ item.ownerUsername || '游客' }}</span>
              <span class="rank-score">{{ item.score }} 分</span>
            </li>
          </ol>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { getThemeBlockColors } from '@/utils/theme';
import Fireworks from '@/components/FireworksOptimized.vue';
import { appendGameScoreRecord, getGameLeaderboard } from '@/utils/userGameRecords';

// 响应式 canvas 尺寸
const cellSize = 20;
const cols = 400 / cellSize;
const rows = 400 / cellSize;
const minCanvasSize = 220;
const maxCanvasSize = 520;
const gameKey = 'snake';

const canvasWidth = ref(maxCanvasSize);
const canvasHeight = ref(maxCanvasSize);
const isMobileLandscape = ref(false);
const controlsCollapsed = ref(false);
const rankCollapsed = ref(false);

const canvas = ref(null);
const snake = ref([
  { x: 5, y: 5 },
]);
const direction = ref('right');
const foodTypes = [
  { score: 1 },
  { score: 3 },
  { score: 5 },
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
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const isLandscape = viewportWidth > viewportHeight;
  const isMobile = viewportWidth <= 900;
  isMobileLandscape.value = isMobile && isLandscape;

  const horizontalPadding = isMobileLandscape.value ? 10 : (isMobile ? 16 : 32);
  const availableByWidth = viewportWidth - horizontalPadding;
  const reservedHeight = isMobileLandscape.value ? 110 : 280;
  const availableByHeight = viewportHeight - reservedHeight;
  const minSize = isMobileLandscape.value ? 160 : (isMobile ? 170 : minCanvasSize);
  const nextSize = Math.floor(Math.max(minSize, Math.min(availableByWidth, availableByHeight, maxCanvasSize)));

  if (isMobileLandscape.value) {
    controlsCollapsed.value = true;
    rankCollapsed.value = true;
  } else {
    controlsCollapsed.value = false;
    rankCollapsed.value = false;
  }

  if (nextSize !== canvasWidth.value || nextSize !== canvasHeight.value) {
    canvasWidth.value = nextSize;
    canvasHeight.value = nextSize;
    draw();
  }
}

// 新增：动画相关状态
let animating = false;
let animationStart = 0;
let animationDuration = 80; // ms，越小越快
let prevSnake = null;
let prevDirection = null;

const snakeStyleOptions = [
  { label: '经典方块', value: 'classic' },
  { label: '霓虹科技', value: 'neon' },
  { label: '青瓷圆角', value: 'jade' },
];

const foodStyleOptions = [
  { label: '水果圆点', value: 'fruit' },
  { label: '像素方块', value: 'pixel' },
  { label: '水晶菱形', value: 'gem' },
];

const sceneStyleOptions = [
  { label: '轻网格', value: 'grid' },
  { label: '夜光赛博', value: 'night' },
  { label: '森系棋盘', value: 'forest' },
];

const defaultVisualConfig = Object.freeze({
  snakeStyle: 'classic',
  foodStyle: 'fruit',
  sceneStyle: 'grid',
});

const visualConfig = ref({ ...defaultVisualConfig });

const scenePalette = computed(() => {
  if (visualConfig.value.sceneStyle === 'night') {
    return {
      bgStart: '#020617',
      bgEnd: '#0f172a',
      line: 'rgba(56, 189, 248, 0.16)',
      border: '#22d3ee',
      overlay: 'rgba(15, 23, 42, 0.85)',
    };
  }
  if (visualConfig.value.sceneStyle === 'forest') {
    return {
      bgStart: '#f2fce2',
      bgEnd: '#d9f3bf',
      line: 'rgba(52, 122, 83, 0.2)',
      border: '#2f855a',
      overlay: 'rgba(255, 255, 255, 0.82)',
    };
  }
  return {
    bgStart: '#f8fbff',
    bgEnd: '#e6f1ff',
    line: 'rgba(38, 132, 255, 0.1)',
    border: '#4f86c6',
    overlay: 'rgba(255, 255, 255, 0.88)',
  };
});

const canvasStyle = computed(() => ({
  borderColor: scenePalette.value.border,
  boxShadow: visualConfig.value.sceneStyle === 'night'
    ? '0 0 20px rgba(56, 189, 248, 0.25)'
    : '0 10px 24px rgba(31, 41, 55, 0.15)',
}));

function getSnakePalette() {
  if (visualConfig.value.snakeStyle === 'neon') {
    return {
      head: '#22d3ee',
      body: '#0ea5e9',
      eyeWhite: '#e0f2fe',
      eyePupil: '#0f172a',
      mouth: '#67e8f9',
      round: true,
      glow: true,
    };
  }
  if (visualConfig.value.snakeStyle === 'jade') {
    return {
      head: '#2f855a',
      body: '#68d391',
      eyeWhite: '#f7fafc',
      eyePupil: '#1a202c',
      mouth: '#22543d',
      round: true,
      glow: false,
    };
  }
  return {
    head: THEME_COLORS[0] || '#2f9e44',
    body: THEME_COLORS[1] || '#69db7c',
    eyeWhite: '#ffffff',
    eyePupil: '#222222',
    mouth: '#333333',
    round: false,
    glow: false,
  };
}

function getFoodColorByScore(scoreValue) {
  if (visualConfig.value?.foodStyle === 'pixel') {
    if (scoreValue >= 5) return '#4c6ef5';
    if (scoreValue >= 3) return '#fab005';
    return '#e03131';
  }
  if (visualConfig.value?.foodStyle === 'gem') {
    if (scoreValue >= 5) return '#7c3aed';
    if (scoreValue >= 3) return '#2563eb';
    return '#db2777';
  }
  if (scoreValue >= 5) return '#2563eb';
  if (scoreValue >= 3) return '#f59e0b';
  return '#ef4444';
}

function drawRoundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, scaleX, scaleY) {
  const palette = scenePalette.value;
  const gradient = ctx.createLinearGradient(0, 0, canvasWidth.value, canvasHeight.value);
  gradient.addColorStop(0, palette.bgStart);
  gradient.addColorStop(1, palette.bgEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);

  if (visualConfig.value.sceneStyle === 'forest') {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
        }
      }
    }
  }

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  for (let x = 1; x < cols; x++) {
    const px = x * scaleX;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvasHeight.value);
    ctx.stroke();
  }
  for (let y = 1; y < rows; y++) {
    const py = y * scaleY;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(canvasWidth.value, py);
    ctx.stroke();
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpWrap(a, b, t, max, isY = false) {
  if (Math.abs(b - a) <= 1) return lerp(a, b, t);
  if (isY && a === 0 && b === max - 1) return (a - t + max) % max;
  if (isY && a === max - 1 && b === 0) return (a + t) % max;
  if (!isY && a === 0 && b === max - 1) return (lerp(a - 1, a, t) + max) % max;
  if (!isY && a === max - 1 && b === 0) return lerp(a, max, t) % max;
  return lerp(a, b, t);
}

function draw(interp = 1) {
  if (!canvas.value) return; // 防御性处理，canvas 未挂载时不执行
  const ctx = canvas.value.getContext('2d');
  const scaleX = canvasWidth.value / cols;
  const scaleY = canvasHeight.value / rows;
  drawBackground(ctx, scaleX, scaleY);
  const snakePalette = getSnakePalette();

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
  const headCenterX = (head.x + 0.5) * scaleX;
  const headCenterY = (head.y + 0.5) * scaleY;

  // 画蛇身（扁平化：纯色矩形）
  for (let i = snakeToDraw.length - 1; i >= 1; i--) {
    const seg = snakeToDraw[i];
    const x = seg.x * scaleX + scaleX * 0.1;
    const y = seg.y * scaleY + scaleY * 0.1;
    const w = scaleX * 0.8;
    const h = scaleY * 0.8;
    if (snakePalette.glow) {
      ctx.shadowColor = snakePalette.body;
      ctx.shadowBlur = 8;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = snakePalette.body;
    if (snakePalette.round) {
      drawRoundedRect(ctx, x, y, w, h, Math.min(w, h) * 0.22);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }
  }

  // 画蛇头，支持默认样式 / Emoji / 图片
  // 画蛇头
  ctx.save();
  const hx = head.x * scaleX + scaleX * 0.08;
  const hy = head.y * scaleY + scaleY * 0.08;
  const hw = scaleX * 0.84;
  const hh = scaleY * 0.84;
  if (snakePalette.glow) {
    ctx.shadowColor = snakePalette.head;
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = snakePalette.head;
  if (snakePalette.round) {
    drawRoundedRect(ctx, hx, hy, hw, hh, Math.min(hw, hh) * 0.26);
    ctx.fill();
  } else {
    ctx.fillRect(hx, hy, hw, hh);
  }
  let eyeOffsetX = 0, eyeOffsetY = 0;
  if (directionToDraw === 'right') eyeOffsetX = 0.25, eyeOffsetY = -0.18;
  else if (directionToDraw === 'left') eyeOffsetX = -0.25, eyeOffsetY = -0.18;
  else if (directionToDraw === 'up') eyeOffsetY = -0.25, eyeOffsetX = 0.18;
  else if (directionToDraw === 'down') eyeOffsetY = 0.25, eyeOffsetX = 0.18;
  const headX = headCenterX;
  const headY = headCenterY;
  const headR = Math.min(scaleX, scaleY) * 0.45;
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillStyle = snakePalette.eyeWhite;
    ctx.fillRect(
      headX + eyeOffsetX * headR * 1.1 * i - headR * 0.13,
      headY + eyeOffsetY * headR * 1.1 * i - headR * 0.13,
      headR * 0.26,
      headR * 0.26
    );
    ctx.fillStyle = snakePalette.eyePupil;
    ctx.fillRect(
      headX + eyeOffsetX * headR * 1.1 * i - headR * 0.065,
      headY + eyeOffsetY * headR * 1.1 * i - headR * 0.065,
      headR * 0.13,
      headR * 0.13
    );
  }
  ctx.strokeStyle = snakePalette.mouth;
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
  const foodColor = getFoodColorByScore(food.value.type.score);
  if (food.value.type.score > 1 || visualConfig.value?.foodStyle !== 'pixel') {
    ctx.shadowColor = foodColor;
    ctx.shadowBlur = 14;
  }
  if (visualConfig.value?.foodStyle === 'pixel') {
    ctx.fillStyle = foodColor;
    ctx.fillRect(foodX - foodR, foodY - foodR, foodR * 2, foodR * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(foodX - foodR * 0.7, foodY - foodR * 0.7, foodR * 0.65, foodR * 0.65);
  } else if (visualConfig.value.foodStyle === 'gem') {
    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.moveTo(foodX, foodY - foodR * 1.1);
    ctx.lineTo(foodX + foodR, foodY);
    ctx.lineTo(foodX, foodY + foodR * 1.1);
    ctx.lineTo(foodX - foodR, foodY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodR, 0, Math.PI * 2);
    ctx.fillStyle = foodColor;
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(foodX - foodR * 0.33, foodY - foodR * 0.33, foodR * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
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

// 排行榜相关
const rankList = ref([]);

function loadRankList() {
  getGameLeaderboard(gameKey, 10).then((records) => {
    rankList.value = records;
  });
}

const showFireworks = ref(false);
const fireworksRef = ref(null);

async function addScoreToRank(score) {
  const result = await appendGameScoreRecord(gameKey, score, {
    mode: 'single',
    game: gameKey
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
  window.addEventListener('orientationchange', updateCanvasSize);
  window.visualViewport?.addEventListener('resize', updateCanvasSize);
  window.visualViewport?.addEventListener('scroll', updateCanvasSize);
  window.addEventListener('keydown', keydown);
  // 触摸事件
  if (canvas.value) {
    canvas.value.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.value.addEventListener('touchend', handleTouchEnd, { passive: false });
  }
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
  window.removeEventListener('orientationchange', updateCanvasSize);
  window.visualViewport?.removeEventListener('resize', updateCanvasSize);
  window.visualViewport?.removeEventListener('scroll', updateCanvasSize);
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
  min-height: 100dvh;
  background: var(--bg-main, #f7f8fa);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
}

.back-btn {
  align-self: flex-start;
  margin: 14px 16px 0;
  padding: 5px 16px;
  background: var(--button, #409eff);
  color: var(--button-text, #fff);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}

.back-btn:hover {
  background: var(--button-hover, #66b1ff);
}

.score-strip {
  width: min(520px, calc(100vw - 32px));
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 0.7rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e4ecf7;
  color: #1e3a8a;
  font-size: 0.94rem;
  font-weight: 700;
}

.snake-game {
  position: relative;
  margin: 16px auto 0;
  flex-shrink: 0;
}

canvas {
  display: block;
  border: 2px solid #4f86c6;
  border-radius: 1rem;
  background: transparent;
  touch-action: none;
  box-shadow: 0 8px 28px rgba(31, 41, 55, 0.13);
}

.game-over {
  position: absolute;
  top: 40%;
  left: 0;
  width: 100%;
  text-align: center;
  background: v-bind('scenePalette.overlay');
  font-size: 1.25rem;
  font-weight: 600;
  padding: 1.4rem 0.5rem;
  border-radius: 0.9rem;
}

.game-over button {
  display: block;
  margin: 1rem auto 0;
  font-size: 1rem;
  padding: 0.6rem 1.6rem;
  border-radius: 0.6rem;
  border: none;
  background: var(--button, #4caf50);
  color: var(--button-text, #fff);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.fold-panels {
  width: min(520px, calc(100vw - 32px));
  margin: 14px auto 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fold-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #dde8f5;
  border-radius: 1rem;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.fold-toggle {
  width: 100%;
  border: none;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.92rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
}

.fold-body {
  padding: 0.75rem 1rem 0.95rem;
  box-sizing: border-box;
}

.control-body p {
  margin: 0 0 6px;
  color: #334155;
  font-size: 0.88rem;
}

.control-restart {
  margin-top: 6px;
  border: none;
  border-radius: 0.55rem;
  background: #2563eb;
  color: #fff;
  padding: 6px 12px;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
}

.rank-board-bottom ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rank-board-bottom li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 0.55rem;
  background: #f1f5fd;
  font-size: 0.93rem;
}

.rank-board-bottom li:nth-child(1) {
  background: linear-gradient(90deg, #fef9e7, #fde68a44);
  border: 1px solid #f59e0b44;
}

.rank-board-bottom li:nth-child(2) {
  background: linear-gradient(90deg, #f0f4ff, #c7d2fe44);
  border: 1px solid #818cf844;
}

.rank-board-bottom li:nth-child(3) {
  background: linear-gradient(90deg, #fdf4f0, #fca58044);
  border: 1px solid #fb923c44;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

li:nth-child(1) .rank-badge { background: #f59e0b; }
li:nth-child(2) .rank-badge { background: #6366f1; }
li:nth-child(3) .rank-badge { background: #f97316; }

.rank-user {
  flex: 1;
  color: #334155;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-score {
  color: #1d4ed8;
  font-weight: 700;
  font-size: 0.92rem;
  white-space: nowrap;
}

.content.landscape {
  padding-bottom: 10px;
}

.content.landscape .back-btn {
  margin-top: 6px;
}

.content.landscape .score-strip {
  margin-top: 4px;
  font-size: 0.86rem;
  padding: 6px 10px;
}

.content.landscape .snake-game {
  margin-top: 8px;
}

.content.landscape .fold-panels {
  width: min(640px, calc(100vw - 16px));
  margin-top: 8px;
  gap: 6px;
}

.content.landscape .fold-toggle {
  padding: 8px 10px;
  font-size: 0.84rem;
}

@media (max-width: 480px) {
  .snake-game {
    margin-top: 10px;
  }

  .score-strip {
    width: calc(100vw - 20px);
    font-size: 0.88rem;
  }

  .fold-panels {
    width: calc(100vw - 20px);
    margin-top: 10px;
  }

  .fold-body {
    padding: 0.7rem 0.8rem 0.85rem;
  }

  .rank-board-bottom li {
    font-size: 0.85rem;
    padding: 5px 8px;
  }
}
</style>
