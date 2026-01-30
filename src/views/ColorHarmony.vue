<template>
  <div class="color-harmony-container" :style="{ background: bgColor }">
    <button @click="$router.back()" class="back-btn">返回</button>
    <button class="bg-btn" @click="toggleBgColor">
      {{ bgColor === defaultBg ? '深色模式' : '浅色模式' }}
    </button>
    
    <h2>颜色和谐搭配工具</h2>
    
    <!-- 快速预设颜色 -->
    <div class="preset-section">
      <span class="section-label">快速选择：</span>
      <div class="preset-colors">
        <div 
          v-for="preset in presetColors" 
          :key="preset"
          class="preset-color"
          :style="{ background: preset }"
          :title="preset"
          @click="addPresetColor(preset)"
        ></div>
      </div>
    </div>

    <!-- 配色方案推荐 -->
    <div class="harmony-section">
      <span class="section-label">配色方案：</span>
      <div class="harmony-buttons">
        <button @click="applyHarmony('complementary')" class="harmony-btn">互补色</button>
        <button @click="applyHarmony('analogous')" class="harmony-btn">类似色</button>
        <button @click="applyHarmony('triadic')" class="harmony-btn">三角色</button>
        <button @click="applyHarmony('tetradic')" class="harmony-btn">四分色</button>
        <button @click="applyHarmony('monochromatic')" class="harmony-btn">单色调</button>
      </div>
    </div>

    <div class="color-pickers">
      <div v-for="(color, idx) in colors" :key="idx" class="color-picker-item">
        <input type="color" v-model="colors[idx]" @change="updateColorInfo(idx)" />
        <span class="color-hex" @click="copyColor(color)">{{ color.toUpperCase() }}</span>
        <button @click="removeColor(idx)" v-if="colors.length > 1" class="remove-btn">×</button>
      </div>
      <button @click="addColor" :disabled="colors.length >= 8" class="add-btn">+ 添加</button>
    </div>
    <div class="tips">💡 提示：拖动色块调整位置，拖动右下角调整大小，双击色块快速改色</div>

    <div class="color-preview" ref="previewRef">
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
          zIndex: activeBlockIndex === idx ? 100 : 10 + idx,
          color: getTextColor(color)
        }"
        @mousedown="onBlockMouseDown(idx, $event)"
        @touchstart="onBlockTouchStart(idx, $event)"
        @dblclick="quickEditColor(idx, $event)"
      >
        <div class="block-info">
          <div class="block-color-hex">{{ color.toUpperCase() }}</div>
          <div class="block-color-rgb">{{ hexToRgb(color) }}</div>
        </div>
        <div class="resize-handle" @mousedown="onResizeMouseDown(idx, $event)" @touchstart="onResizeTouchStart(idx, $event)"></div>
        <input
          :ref="el => setColorInputRef(el, idx)"
          type="color"
          v-model="colors[idx]"
          :style="getColorInputStyle(idx)"
          @click.stop
          @change="updateColorInfo(idx)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, reactive, watch, onUnmounted, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const defaultBg = '#fff'
const darkBg = '#181818'
const bgColor = ref(defaultBg)
function toggleBgColor() {
  bgColor.value = bgColor.value === defaultBg ? darkBg : defaultBg
}

// 预设常用颜色
const presetColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B500', '#FF69B4',
  '#20B2AA', '#FF6347', '#4169E1', '#32CD32', '#FF1493',
  '#00CED1', '#FF8C00', '#9370DB', '#3CB371', '#DC143C'
]

const colors = ref([
  getComputedStyle(document.documentElement).getPropertyValue('--button').trim() || '#409eff',
  getComputedStyle(document.documentElement).getPropertyValue('--button-hover').trim() || '#66b1ff'
])

const activeBlockIndex = ref(null)
const colorInputRefs = ref([])
const colorInputPos = ref({})

// preview container ref 用于计算拖动/缩放边界
const previewRef = ref(null)

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
    height: '32px',8) {
    colors.value.push("#cccccc")
    nextTick(() => {
      openColorPicker(colors.value.length - 1, null, true)
    })
  }
}

function addPresetColor(color) {
  if (colors.value.length < 8) {
    colors.value.push(color)
    ElMessage.success(`已添加颜色 ${color}`)
  } else {
    ElMessage.warning('最多支持8个颜色')
  }
}

function removeColor(idx) {
  if (colors.value.length > 1) {
    colors.value.splice(idx, 1)
    colorInputRefs.value.splice(idx, 1)
    delete colorInputPos.value[idx]
  }
}

function copyColor(color) {
  navigator.clipboard.writeText(color).then(() => {
    ElMessage.success(`已复制 ${color}`)
  })
}

function quickEditColor(idx, e) {
  openColorPicker(idx, e)
}

function updateColorInfo(idx) {
  // 颜色更新后可以做一些处理 colors.value.push("#cccccc")
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

const defaultBlockSize = { width: 80, height: 80 }
const blockMargin = 28
coactiveBlockIndex.value = idx
  nst blocksPerRow = 4
function getBlockInitPos(idx) {
  const row = Math.floor(idx / blocksPerRow)
  const col = idx % blocksPerRow
  // 居中排列
  // 使用更宽的初始容器宽度以便色块有更多初始拖动空间
  const containerWidth = Math.min(760, window.innerWidth - 80)
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
  // 计算相对于 preview 容器的偏移
  const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { left: 0, top: 0 }
  dragState.value.offset = {
    x: e.clientX - (rect.left + blockStates.value[idx].x),
    y: e.clientY - (rect.top + blockStates.value[idx].y)
  }
  window.addEventListener('mousemove', onBlockMouseMove, { passive: false })
  window.addEventListener('mouseup', onBlockMouseUp, { passive: false })
}
function onBlockMouseMove(e) {
  const idx = dragState.value.idx
  if (idx !== null) {
    const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
    let newX = e.clientX - rect.left - dragState.value.offset.x
    let newY = e.clientY - rect.top - dragState.value.offset.y
    // 限制边界到 preview 容器
    const block = blockStates.value[idx]
    newX = Math.max(0, Math.min(newX, rect.width - block.width))
    newY = Math.max(0, Math.min(newY, rect.height - block.height))
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
  const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight }
  const block = blockStates.value[idx]
  newWidth = Math.min(newWidth, rect.width - block.x)
  newHeight = Math.min(newHeight, rect.height - block.y)
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
  const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { left: 0, top: 0 }
  dragState.value.offset = {
    x: touch.clientX - (rect.left + blockStates.value[idx].x),
    y: touch.clientY - (rect.top + blockStates.value[idx].y)
  }
  window.addEventListener('touchmove', onBlockTouchMove, { passive: false })
  window.addEventListener('touchend', onBlockTouchEnd, { passive: false })
}
function onBlockTouchMove(e) {
  const idx = dragState.value.idx
  if (idx !== null) {
    const touch = e.touches[0]
    const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
    let newX = touch.clientX - rect.left - dragState.value.offset.x
    let newY = touch.clientY - rect.top - dragState.value.offset.y
    const block = blockStates.value[idx]
    newX = Math.max(0, Math.min(newX, rect.width - block.width))
    newY = Math.max(0, Math.min(newY, rect.height - block.height))
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

// 颜色转换和计算工具函数
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result 
    ? `RGB(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
  border-radius: 16px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.10);
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 20px;
  position: relative;
  max-width: 1200px;
  transition: background 0.3s ease;
}

h2 {
  margin: 0;
  font-size: 1.8rem;
  color: inherit;
}

.preset-section, .harmony-section {
  width: 100%;
  display: flex;
.color-pickers {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: flex-start;
  padding: 16px;
  background: rgba(0,0,0,0.02);
  border-radius: 12px;
}

.color-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.8);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.2s ease;
}

.color-preview {
  position: relative;
  min-height: 400px;
  width: 100%;
  display: block;
  background: rgba(0,0,0,0.02);
  border-radius: 12px;
  padding: 20px;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.05);
}

.color-block {
  position: absolute;
  user-select: none;
  border-radius: 12px;
  border: 2px solid rgba(255,255,255,0.5);
  cursor: move;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  overflow: hidden;
}

.color-bl4px;
  bottom: 4px;
  width: 20px;
  height: 20px;
  background: rgba(255,255,255,0.3);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  cursor: se-resize;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.resize-handle:hover {
  background: rgba(64,158,255,0.5);
  transform: scale(1.1);
}

.resize-handle::after {
  content: '⇲';
  font-size: 14px;
  color: rgba(0,0,0,0.6);
}
666;
  font-size: 0.95rem;
  padding: 12px 16px;
  background: rgba(64,158,255,0.08);
  border-radius: 8px;
  border-left: 4px solid #409eff;
  width: 100%;
  box-sizing: border-box
  font-size: 0.85rem;
  opacity: 0.9
  padding: 8px 20px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(56,239,125,0.4);
}

.add-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.preset-color:hover {
  transform: scale(1.15);
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64,158,255,0.3);
}

.harmony-buttons {
  display: flex;
  gap: 8px;
 remove-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  background: #f56c6c;
  color: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(245,108,108,0.3);
}

.remove-btn:hover {
  background: #e64545;
  transform: rotate(90deg) scale(1.1);
  box-shadow: 0 4px 8px rgba(230,69,69,0.4)
  
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0
  } else if (60 <= h && h < 120) {
    r = x40px;
  height: 40px;
  border: 3px solid #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.color-picker-item input[type="color"]:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(64,158,255,0.3);
  border-color: #409eff;
}

.color-picker-item input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker-item input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 5px
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(bgColor)
  if (!result) return '#000'
  
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000' : '#fff'
}

// 配色方案生成
function applyHarmony(type) {
  if (colors.value.length === 0) {
    colors.value.push('#409eff')
  }
  
  const baseColor = colors.value[0]
  const hsl = hexToHsl(baseColor)
  let newColors = [baseColor]
  
  switch (type) {
    case 'complementary': // 互补色
      newColors.push(hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l))
      break
    case 'analogous': // 类似色
      newColors.push(
        hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l)
      )
      break
    case 'triadic': // 三角色
      newColors.push(
        hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)
      )
      break
    case 'tetradic': // 四分色
      newColors.push(
        hslToHex((hsl.h + 90) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h + 270) % 360, hsl.s, hsl.l)
      )
      break
    case 'monochromatic': // 单色调
      newColors.push(
        hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 20, 90)),
        hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 20, 10)),
        hslToHex(hsl.h, Math.max(hsl.s - 20, 20), hsl.l)
      )
      break
  }
  
  colors.value = newColors.slice(0, 8)
  ElMessage.success(`已应用${type === 'complementary' ? '互补' : type === 'analogous' ? '类似' : type === 'triadic' ? '三角' : type === 'tetradic' ? '四分' : '单色调'}配色方案`)
}

// 键盘快捷键
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e) {
  // Ctrl/Cmd + N: 添加新颜色
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    addColor()
  }
  // Delete: 删除最后一个颜色
  if (e.key === 'Delete' && colors.value.length > 1) {
    removeColor(colors.value.length - 1)
  }
}
    const touch = e.touches[0]
    const dx = touch.clientX - resizeState.value.start.x
    const dy = touch.clientY - resizeState.value.start.y
    let newWidth = Math.max(32, resizeState.value.start.width + dx)
    let newHeight = Math.max(32, resizeState.value.start.height + dy)
  const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight }
  const block = blockStates.value[idx]
  newWidth = Math.min(newWidth, rect.width - block.x)
  newHeight = Math.min(newHeight, rect.height - block.y)
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
/* 颜色选择器区域响应式排列：横向流式布局，支持换行，移动端回退为两列/单列 */
.color-pickers {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: flex-start;
}
.color-picker-item {
  display: flex;
  align-items: center;
  margin-bottom: 0;
  /* 每个项尽量横向收缩，占用合理宽度 */
  flex: 0 1 180px; /* 基准宽度，可响应缩放 */
  box-sizing: border-box;
  gap: 8px;
}
.color-pickers > button {
  /* 添加按钮作为一个独立项，尽量靠行尾显示 */
  flex: 0 0 auto;
  align-self: flex-start;
}
/* 色块横向排列，自动换行，间距更大 */
.color-preview {
  /* 让色块绝对定位在容器内 */
  position: relative;
  min-height: 320px;
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
  /* decorative mark should not intercept pointer events */
  pointer-events: none;
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
