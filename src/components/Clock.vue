<template>
  <div
    class="clock-container"
    :class="{ embedded: embedded }"
    :style="containerStyle"
    @mousedown="startDrag"
    @touchstart="startDrag"
    @click="onClockClick"
  >
    <span v-if="mode === 'digital'" class="clock-time">{{ time }}</span>
    <div v-else class="analog-clock">
      <div class="hand hour" :style="hourHandStyle"></div>
      <div class="hand minute" :style="minuteHandStyle"></div>
      <div class="hand second" :style="secondHandStyle"></div>
      <div class="center-dot"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
})

const time = ref('')
let timer = null
const mode = ref('digital')

// 拖拽相关
const pos = ref({ x: 0, y: 0 }) // 默认位置改为0,0
const dragging = ref(false)
const offset = ref({ x: 0, y: 0 })

const containerStyle = computed(() => ({
  position: props.embedded ? 'static' : 'fixed',
  top: props.embedded ? 'auto' : '32px',
  left: props.embedded ? 'auto' : '50%',
  transform: props.embedded ? 'none' : 'translateX(-50%)',
  cursor: props.embedded ? 'pointer' : (dragging.value ? 'grabbing' : 'grab'),
  userSelect: 'none',
  zIndex: 100,
  borderRadius: '8px',
  padding: props.embedded ? '7px 18px' : '8px 16px',
  minWidth: props.embedded ? '96px' : '120px',
  minHeight: props.embedded ? '40px' : '48px',
  fontSize: props.embedded ? '16px' : '18px',
  color: '#333',
}))

function startDrag(e) {
  if (props.embedded) return
  e.stopPropagation();
  dragging.value = true
  const event = e.type === 'touchstart' ? e.touches[0] : e
  offset.value = {
    x: event.clientX - pos.value.x,
    y: event.clientY - pos.value.y,
  }
  window.addEventListener('mousemove', onDrag, { passive: false })
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('touchend', stopDrag)
}
// 合并拖拽和标记拖动逻辑
let dragMoved = false
function onDrag(e) {
  if (!dragging.value) return
  dragMoved = true
  e.preventDefault && e.preventDefault();
  const event = e.type.startsWith('touch') ? e.touches[0] : e
  let x = event.clientX - offset.value.x
  let y = event.clientY - offset.value.y
  // 限制边界
  // 仅在绝对定位时需要，嵌入式可省略
  pos.value = { x, y }
}
function stopDrag() {
  dragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', stopDrag)
}

// 模式切换：点击本体切换，拖动时不切换
function onClockClick() {
  if (!dragging.value && !dragMoved) {
    mode.value = mode.value === 'digital' ? 'analog' : 'digital'
  }
  dragMoved = false
}

// 指针模式相关
const nowDate = ref(new Date())
const hourHandStyle = computed(() => ({
  transform: `rotate(${((nowDate.value.getHours()%12) * 30 + nowDate.value.getMinutes() * 0.5)}deg)`
}))
const minuteHandStyle = computed(() => ({
  transform: `rotate(${nowDate.value.getMinutes() * 6}deg)`
}))
const secondHandStyle = computed(() => ({
  transform: `rotate(${nowDate.value.getSeconds() * 6}deg)`
}))

function updateTime() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  time.value = `${h}:${m}:${s}`
  nowDate.value = now
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})
onUnmounted(() => {
  clearInterval(timer)
  stopDrag()
})
</script>

<style scoped>
.clock-container {
  /* 悬浮组件样式已在computed中定义 */
}
.clock-container.embedded {
  display: flex;
  align-items: center;
  justify-content: center;
}

.clock-container.embedded .clock-time {
  margin: 0;
}

.clock-container.embedded .analog-clock {
  width: 36px;
  height: 36px;
  margin: 0;
}

.clock-container.embedded .hand.hour {
  height: 10px;
  width: 3px;
}

.clock-container.embedded .hand.minute {
  height: 14px;
  width: 2px;
}

.clock-container.embedded .hand.second {
  height: 16px;
  width: 1px;
}

.clock-container.embedded .center-dot {
  width: 5px;
  height: 5px;
}
@media (max-width: 600px) {
  .clock-container {
    top: 12px !important;
    padding: 6px 8px !important;
  }
}
.mode-btn {
  display: none;
}
.analog-clock {
  width: 80px;
  height: 80px;
  border: 2px solid #333;
  border-radius: 50%;
  position: relative;
  margin: 16px 0 8px auto;
  background: #fff;
}
.hand {
  position: absolute;
  left: 50%;
  bottom: 50%;
  transform-origin: bottom center;
  background: #333;
  border-radius: 2px;
}
.hand.hour {
  width: 6px;
  height: 24px;
  background: #333;
  z-index: 3;
}
.hand.minute {
  width: 4px;
  height: 32px;
  background: #666;
  z-index: 2;
}
.hand.second {
  width: 2px;
  height: 36px;
  background: #e33;
  z-index: 1;
}
.center-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  background: #333;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}
.clock-time {
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
  display: block;
  text-align: center;
  margin: 24px 0 8px 0;
}
</style>