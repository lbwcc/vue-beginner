<template>
  <div class="color-harmony-container" :style="{ background: bgColor }">
    <button @click="$router.back()" class="back-btn">返回</button>
    <button class="bg-btn" @click="toggleBgColor">
      {{ bgColor === defaultBg ? '深色模式' : '浅色模式' }}
    </button>
    <h2>选择颜色</h2>
    <div class="color-pickers">
      <div v-for="(color, idx) in colors" :key="idx" class="color-picker-item">
        <input type="color" v-model="colors[idx]" />
        <button @click="removeColor(idx)" v-if="colors.length > 1">删除</button>
      </div>
      <button @click="addColor" :disabled="colors.length >= 6">添加颜色</button>
    </div>
    <div class="color-preview">
      <div
        v-for="(color, idx) in colors"
        :key="'preview-' + idx"
        class="color-block"
        :data-dragging="blockStates[idx]?.dragging ? 'true' : null"
        :data-resizing="blockStates[idx]?.resizing ? 'true' : null"
        :style="{
          background: color,
          left: blockStates[idx]?.x + 'px',
          top: blockStates[idx]?.y + 'px',
          width: blockStates[idx]?.width + 'px',
          height: blockStates[idx]?.height + 'px',
          zIndex: 10 + idx
        }"
        @mousedown="onBlockMouseDown(idx, $event)"
        @touchstart="onBlockTouchStart(idx, $event)"
      >
        {{ color }}
        <div class="resize-handle" @mousedown="onResizeMouseDown(idx, $event)" @touchstart="onResizeTouchStart(idx, $event)"></div>
        <input
          :ref="el => setColorInputRef(el, idx)"
          type="color"
          v-model="colors[idx]"
          :style="getColorInputStyle(idx)"
          @click.stop
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, reactive, watch, onUnmounted } from 'vue'

const defaultBg = '#fff'
const darkBg = '#181818'
const bgColor = ref(defaultBg)
function toggleBgColor() {
  bgColor.value = bgColor.value === defaultBg ? darkBg : defaultBg
}

const colors = ref([
  getComputedStyle(document.documentElement).getPropertyValue('--button').trim() || '#409eff',
  getComputedStyle(document.documentElement).getPropertyValue('--button-hover').trim() || '#66b1ff'
])
const colorInputRefs = ref([])
const colorInputPos = ref({})

function setColorInputRef(el, idx) {
  if (el) colorInputRefs.value[idx] = el
}

function getColorInputStyle(idx) {
  const pos = colorInputPos.value[idx]
  return {
    display: 'block',
    position: 'fixed',
    left: pos ? pos.x + 'px' : '-9999px',
    top: pos ? pos.y + 'px' : '-9999px',
    opacity: 0,
    width: '32px',
    height: '32px',
    zIndex: 9999,
    cursor: 'pointer',
    padding: 0,
    border: 'none',
    background: 'none',
    pointerEvents: 'auto',
  }
}

function addColor() {
  if (colors.value.length < 6) {
    colors.value.push("#cccccc")
    nextTick(() => {
      openColorPicker(colors.value.length - 1, null, true)
    })
  }
}
function removeColor(idx) {
  if (colors.value.length > 1) {
    colors.value.splice(idx, 1)
    colorInputRefs.value.splice(idx, 1)
    delete colorInputPos.value[idx]
  }
}
function openColorPicker(idx, event, force) {
  // force: 用于首次自动弹出
  if (event) {
    colorInputPos.value[idx] = {
      x: event.clientX,
      y: event.clientY
    }
  } else if (!colorInputPos.value[idx]) {
    // 没有位置时默认居中
    colorInputPos.value[idx] = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    }
  }
  nextTick(() => {
    // 先 blur 再 click，确保 input 能响应多次点击
    if (colorInputRefs.value[idx]) {
      colorInputRefs.value[idx].blur()
      setTimeout(() => {
        colorInputRefs.value[idx].click()
      }, force ? 100 : 0)
    }
  })
}

const defaultBlockSize = { width: 60, height: 60 }
const blockMargin = 20
const blocksPerRow = 3
function getBlockInitPos(idx) {
  const row = Math.floor(idx / blocksPerRow)
  const col = idx % blocksPerRow
  // 居中排列
  const containerWidth = 400 // 可根据实际容器宽度调整
  const totalBlockWidth = blocksPerRow * defaultBlockSize.width + (blocksPerRow - 1) * blockMargin
  const startX = Math.max(40, (containerWidth - totalBlockWidth) / 2)
  return {
    x: startX + col * (defaultBlockSize.width + blockMargin),
    y: 180 + row * (defaultBlockSize.height + blockMargin),
    width: defaultBlockSize.width,
    height: defaultBlockSize.height
  }
}
const blockStates = ref(colors.value.map((color, idx) => getBlockInitPos(idx)))

// 保持 blockStates 与 colors 数组同步
function syncBlockStates() {
  while (blockStates.value.length < colors.value.length) {
    blockStates.value.push(getBlockInitPos(blockStates.value.length))
  }
  while (blockStates.value.length > colors.value.length) {
    blockStates.value.pop()
  }
}

// 拖动和缩放逻辑
const dragState = ref({ idx: null, offset: { x: 0, y: 0 } })
const resizeState = ref({ idx: null, start: { x: 0, y: 0, width: 0, height: 0 } })

function onBlockMouseDown(idx, e) {
  if (e.target.classList.contains('resize-handle')) return
  e.preventDefault()
  dragState.value.idx = idx
  dragState.value.offset = {
    x: e.clientX - blockStates.value[idx].x,
    y: e.clientY - blockStates.value[idx].y
  }
  window.addEventListener('mousemove', onBlockMouseMove, { passive: false })
  window.addEventListener('mouseup', onBlockMouseUp, { passive: false })
}
function onBlockMouseMove(e) {
  const idx = dragState.value.idx
  if (idx !== null) {
    let newX = e.clientX - dragState.value.offset.x
    let newY = e.clientY - dragState.value.offset.y
    // 限制边界
    const block = blockStates.value[idx]
    newX = Math.max(0, Math.min(newX, window.innerWidth - block.width))
    newY = Math.max(0, Math.min(newY, window.innerHeight - block.height))
    blockStates.value[idx].x = newX
    blockStates.value[idx].y = newY
    blockStates.value[idx].dragging = true
  }
}
function onBlockMouseUp() {
  const idx = dragState.value.idx
  if (idx !== null) blockStates.value[idx].dragging = false
  dragState.value.idx = null
  window.removeEventListener('mousemove', onBlockMouseMove, { passive: false })
  window.removeEventListener('mouseup', onBlockMouseUp, { passive: false })
}

function onResizeMouseDown(idx, e) {
  e.stopPropagation()
  e.preventDefault()
  resizeState.value.idx = idx
  resizeState.value.start = {
    x: e.clientX,
    y: e.clientY,
    width: blockStates.value[idx].width,
    height: blockStates.value[idx].height
  }
  window.addEventListener('mousemove', onResizeMouseMove, { passive: false })
  window.addEventListener('mouseup', onResizeMouseUp, { passive: false })
}
function onResizeMouseMove(e) {
  const idx = resizeState.value.idx
  if (idx !== null) {
    const dx = e.clientX - resizeState.value.start.x
    const dy = e.clientY - resizeState.value.start.y
    let newWidth = Math.max(32, resizeState.value.start.width + dx)
    let newHeight = Math.max(32, resizeState.value.start.height + dy)
    // 限制最大宽高不超出屏幕
    const block = blockStates.value[idx]
    newWidth = Math.min(newWidth, window.innerWidth - block.x)
    newHeight = Math.min(newHeight, window.innerHeight - block.y)
    blockStates.value[idx].width = newWidth
    blockStates.value[idx].height = newHeight
    blockStates.value[idx].resizing = true
  }
}
function onResizeMouseUp() {
  const idx = resizeState.value.idx
  if (idx !== null) blockStates.value[idx].resizing = false
  resizeState.value.idx = null
  window.removeEventListener('mousemove', onResizeMouseMove, { passive: false })
  window.removeEventListener('mouseup', onResizeMouseUp, { passive: false })
}

// 移动端 touch 拖动支持
function onBlockTouchStart(idx, e) {
  if (e.target.classList.contains('resize-handle')) return
  e.preventDefault()
  const touch = e.touches[0]
  dragState.value.idx = idx
  dragState.value.offset = {
    x: touch.clientX - blockStates.value[idx].x,
    y: touch.clientY - blockStates.value[idx].y
  }
  window.addEventListener('touchmove', onBlockTouchMove, { passive: false })
  window.addEventListener('touchend', onBlockTouchEnd, { passive: false })
}
function onBlockTouchMove(e) {
  const idx = dragState.value.idx
  if (idx !== null) {
    const touch = e.touches[0]
    let newX = touch.clientX - dragState.value.offset.x
    let newY = touch.clientY - dragState.value.offset.y
    const block = blockStates.value[idx]
    newX = Math.max(0, Math.min(newX, window.innerWidth - block.width))
    newY = Math.max(0, Math.min(newY, window.innerHeight - block.height))
    blockStates.value[idx].x = newX
    blockStates.value[idx].y = newY
    blockStates.value[idx].dragging = true
  }
}
function onBlockTouchEnd() {
  const idx = dragState.value.idx
  if (idx !== null) blockStates.value[idx].dragging = false
  dragState.value.idx = null
  window.removeEventListener('touchmove', onBlockTouchMove, { passive: false })
  window.removeEventListener('touchend', onBlockTouchEnd, { passive: false })
}
function onResizeTouchStart(idx, e) {
  e.stopPropagation()
  e.preventDefault()
  const touch = e.touches[0]
  resizeState.value.idx = idx
  resizeState.value.start = {
    x: touch.clientX,
    y: touch.clientY,
    width: blockStates.value[idx].width,
    height: blockStates.value[idx].height
  }
  window.addEventListener('touchmove', onResizeTouchMove, { passive: false })
  window.addEventListener('touchend', onResizeTouchEnd, { passive: false })
}
function onResizeTouchMove(e) {
  const idx = resizeState.value.idx
  if (idx !== null) {
    const touch = e.touches[0]
    const dx = touch.clientX - resizeState.value.start.x
    const dy = touch.clientY - resizeState.value.start.y
    let newWidth = Math.max(32, resizeState.value.start.width + dx)
    let newHeight = Math.max(32, resizeState.value.start.height + dy)
    const block = blockStates.value[idx]
    newWidth = Math.min(newWidth, window.innerWidth - block.x)
    newHeight = Math.min(newHeight, window.innerHeight - block.y)
    blockStates.value[idx].width = newWidth
    blockStates.value[idx].height = newHeight
    blockStates.value[idx].resizing = true
  }
}
function onResizeTouchEnd() {
  const idx = resizeState.value.idx
  if (idx !== null) blockStates.value[idx].resizing = false
  resizeState.value.idx = null
  window.removeEventListener('touchmove', onResizeTouchMove, { passive: false })
  window.removeEventListener('touchend', onResizeTouchEnd, { passive: false })
}

// 防止组件卸载后事件未解绑
onUnmounted(() => {
  window.removeEventListener('mousemove', onBlockMouseMove)
  window.removeEventListener('mouseup', onBlockMouseUp)
  window.removeEventListener('mousemove', onResizeMouseMove)
  window.removeEventListener('mouseup', onResizeMouseUp)
  window.removeEventListener('touchmove', onBlockTouchMove)
  window.removeEventListener('touchend', onBlockTouchEnd)
  window.removeEventListener('touchmove', onResizeTouchMove)
  window.removeEventListener('touchend', onResizeTouchEnd)
})

// 监听 colors 变化同步 blockStates
watch(colors, syncBlockStates, { deep: true })
</script>

<style scoped>
/* 容器自适应宽度，移动端更窄 */
.color-harmony-container {
  margin: 48px auto 32px auto;
  /* background: var(--bg-cell, #fff);  // 移除app背景色 */
  border-radius: 16px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.10);
  padding: 32px 18px 32px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 18px;
  position: relative;
}
/* 颜色选择器区域响应式排列 */
.color-pickers {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}
.color-picker-item {
  display: flex;
  align-items: center;
  margin-bottom: 0;
}
/* 色块横向排列，自动换行，间距更大 */
.color-preview {
  /* 让色块绝对定位在容器内 */
  position: relative;
  min-height: 180px;
  width: 100%;
  /* 移除 display:flex 和 gap，避免和绝对定位冲突 */
  display: block;
  gap: 0;
  margin-bottom: 18px;
}
.color-block {
  /* 绝对定位 */
  position: absolute;
  user-select: none;
  border-radius: 8px;
  border: 1.5px solid #e0e0e0;
  /* 拖动/缩放时高亮 */
}
.color-block[data-dragging="true"],
.color-block[data-resizing="true"] {
  border: 2.5px solid #409eff;
  box-shadow: 0 0 0 2px #409eff33;
}
.resize-handle {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 16px;
  height: 16px;
  background: rgba(0,0,0,0.12);
  border-radius: 3px;
  cursor: se-resize;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
}
.resize-handle::after {
  content: '';
  display: block;
  width: 10px;
  height: 10px;
  border-right: 2px solid #888;
  border-bottom: 2px solid #888;
  border-radius: 2px;
  margin: 2px;
}
.tips {
  color: #888;
  font-size: 0.95rem;
}
.back-btn {
  position: absolute;
  top: 24px;
  left: 24px;
  margin: 0;
  width: auto;
  min-width: 80px;
  display: inline-block;
  /* 保持原有样式 */
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
.color-pickers button,
.color-picker-item button {
  background: var(--button, #409eff);
  color: var(--button-text, #fff);
  border: none;
  border-radius: 6px;
  padding: 6px 16px;
  margin-left: 8px;
  font-size: 0.98rem;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  outline: none;
}
.color-pickers button:disabled {
  background: #e4e7ed;
  color: #aaa;
  cursor: not-allowed;
  box-shadow: none;
}
.color-pickers button:hover:not(:disabled),
.color-picker-item button:hover:not(:disabled) {
  background: var(--button-hover, #66b1ff);
}
.color-picker-item button {
  padding: 4px 12px;
  font-size: 0.95rem;
  margin-left: 6px;
  background: #f56c6c;
  color: #fff;
  border-radius: 6px;
  transition: background 0.18s;
}
.color-picker-item button:hover {
  background: #e64545;
}
.color-picker-item input[type="color"] {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  cursor: pointer;
  margin-right: 4px;
  transition: box-shadow 0.18s, border 0.18s;
  outline: none;
  padding: 0;
}
.color-picker-item input[type="color"]:hover {
  box-shadow: 0 2px 8px rgba(64,158,255,0.18);
  border: 1.5px solid var(--button, #409eff);
}
.color-picker-item input[type="color"]:focus {
  box-shadow: 0 2px 8px rgba(64,158,255,0.18);
  border: 1.5px solid var(--button, #409eff);
}
.bg-btn {
  margin-bottom: 18px;
  align-self: flex-end;
  background: var(--button, #409eff);
  color: var(--button-text, #fff);
  border: none;
  border-radius: 6px;
  padding: 6px 18px;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: background 0.18s, color 0.18s;
}
.bg-btn:hover {
  background: var(--button-hover, #66b1ff);
}

@media (max-width: 600px) {
  .color-harmony-container {
    max-width: 98vw;
    padding: 18px 4vw 24px 4vw;
    min-height: 340px;
  }
  .color-preview {
    gap: 12px;
    justify-content: space-between;
  }
  .color-block {
    width: calc((100% - 12px) / 2);
    min-width: 90px;
    max-width: 140px;
    height: 48px;
    font-size: 0.88rem;
    margin: 0;
  }
  .color-pickers {
    gap: 6px;
  }
  .color-picker-item input[type="color"] {
    width: 28px;
    height: 28px;
    margin-right: 2px;
  }
  .color-pickers button,
  .color-picker-item button {
    padding: 4px 10px;
    font-size: 0.92rem;
  }
}
@media (min-width: 601px) and (max-width: 900px) {
  .color-harmony-container {
    max-width: 90vw;
    padding: 24px 6vw 28px 6vw;
  }
  .color-block {
    width: 120px;
    height: 54px;
    font-size: 0.92rem;
  }
}
</style>
