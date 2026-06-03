<template>
  <div class="color-harmony-container tool-page" :style="{ background: bgColor }" v-reveal="{ y: 12, duration: 0.36 }">
    <button @click="$router.back()" class="back-btn" v-reveal="{ y: 8, duration: 0.24 }">返回</button>
    <button class="bg-btn" @click="toggleBgColor" v-reveal="{ y: 8, duration: 0.24, delay: 0.02 }">
      {{ bgColor === defaultBg ? '深色模式' : '浅色模式' }}
    </button>
    
    <h2 v-reveal="{ y: 10, duration: 0.3, delay: 0.04 }">颜色和谐搭配工具</h2>
    
    <!-- 快速预设颜色 -->
    <div class="preset-section" v-reveal="{ y: 12, duration: 0.32, delay: 0.06 }">
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
    <div class="harmony-section" v-reveal="{ y: 12, duration: 0.32, delay: 0.08 }">
      <span class="section-label">配色方案：</span>
      <div class="harmony-buttons">
        <button @click="applyHarmony('complementary')" class="harmony-btn">互补色</button>
        <button @click="applyHarmony('analogous')" class="harmony-btn">类似色</button>
        <button @click="applyHarmony('triadic')" class="harmony-btn">三角色</button>
        <button @click="applyHarmony('tetradic')" class="harmony-btn">四分色</button>
        <button @click="applyHarmony('monochromatic')" class="harmony-btn">单色调</button>
      </div>
    </div>

    <div class="color-pickers" v-reveal="{ y: 12, duration: 0.32, delay: 0.1 }">
      <div v-for="(color, idx) in colors" :key="idx" class="color-picker-item" v-reveal="{ y: 8, duration: 0.24, scroll: true, start: 'top 95%' }">
        <input type="color" v-model="colors[idx]" @change="updateColorInfo(idx)" />
        <span class="color-hex" @click="copyColor(color)">{{ color.toUpperCase() }}</span>
        <button @click="removeColor(idx)" v-if="colors.length > 1" class="remove-btn">×</button>
      </div>
      <button @click="addColor" :disabled="colors.length >= 8" class="add-btn">+ 添加</button>
    </div>

    <div class="tips" v-reveal="{ y: 10, duration: 0.26, delay: 0.12 }">💡 提示：拖动色块调整位置，拖动右下角调整大小，双击色块快速改色</div>

    <div class="color-preview" ref="previewRef" v-reveal="{ y: 12, duration: 0.34, delay: 0.14 }">
      <div
        v-for="(color, idx) in colors"
        :key="'preview-' + idx"
        class="color-block"
        v-reveal="{ y: 10, duration: 0.22, scroll: true, start: 'top 95%' }"
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
import { ref, nextTick, watch, onUnmounted, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

const defaultBg = '#fff';
const darkBg = '#181818';
const bgColor = ref(defaultBg);

function toggleBgColor() {
  bgColor.value = bgColor.value === defaultBg ? darkBg : defaultBg;
}

// 预设常用颜色
const presetColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B500', '#FF69B4',
  '#20B2AA', '#FF6347', '#4169E1', '#32CD32', '#FF1493',
  '#00CED1', '#FF8C00', '#9370DB', '#3CB371', '#DC143C'
];

const colors = ref([
  getComputedStyle(document.documentElement).getPropertyValue('--button').trim() || '#409eff',
  getComputedStyle(document.documentElement).getPropertyValue('--button-hover').trim() || '#66b1ff'
]);

const activeBlockIndex = ref(null);
const colorInputRefs = ref([]);
const colorInputPos = ref({});
const previewRef = ref(null);

function setColorInputRef(el, idx) {
  if (el) colorInputRefs.value[idx] = el;
}

function getColorInputStyle(idx) {
  const pos = colorInputPos.value[idx];
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
  };
}

function addColor() {
  if (colors.value.length < 8) {
    colors.value.push("#cccccc");
    nextTick(() => {
      openColorPicker(colors.value.length - 1, null, true);
    });
  }
}

function addPresetColor(color) {
  if (colors.value.length < 8) {
    colors.value.push(color);
    ElMessage.success(`已添加颜色 ${color}`);
  } else {
    ElMessage.warning('最多支持8个颜色');
  }
}

function removeColor(idx) {
  if (colors.value.length > 1) {
    colors.value.splice(idx, 1);
    colorInputRefs.value.splice(idx, 1);
    delete colorInputPos.value[idx];
  }
}

function copyColor(color) {
  navigator.clipboard.writeText(color).then(() => {
    ElMessage.success(`已复制 ${color}`);
  });
}

function quickEditColor(idx, e) {
  openColorPicker(idx, e);
}

function updateColorInfo(idx) {
  // 颜色更新后可以做一些处理
}

function openColorPicker(idx, event, force) {
  if (event) {
    colorInputPos.value[idx] = {
      x: event.clientX,
      y: event.clientY
    };
  } else if (!colorInputPos.value[idx]) {
    colorInputPos.value[idx] = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
  }
  nextTick(() => {
    if (colorInputRefs.value[idx]) {
      colorInputRefs.value[idx].blur();
      setTimeout(() => {
        colorInputRefs.value[idx].click();
      }, force ? 100 : 0);
    }
  });
}

// 色块初始化
const defaultBlockSize = { width: 80, height: 80 };
const blockMargin = 28;
const blocksPerRow = 4;

function getBlockInitPos(idx) {
  const row = Math.floor(idx / blocksPerRow);
  const col = idx % blocksPerRow;
  const containerWidth = Math.min(760, window.innerWidth - 80);
  const totalBlockWidth = blocksPerRow * defaultBlockSize.width + (blocksPerRow - 1) * blockMargin;
  const startX = Math.max(40, (containerWidth - totalBlockWidth) / 2);
  return {
    x: startX + col * (defaultBlockSize.width + blockMargin),
    y: 180 + row * (defaultBlockSize.height + blockMargin),
    width: defaultBlockSize.width,
    height: defaultBlockSize.height
  };
}

const blockStates = ref(colors.value.map((color, idx) => getBlockInitPos(idx)));

function syncBlockStates() {
  while (blockStates.value.length < colors.value.length) {
    blockStates.value.push(getBlockInitPos(blockStates.value.length));
  }
  while (blockStates.value.length > colors.value.length) {
    blockStates.value.pop();
  }
}

// 拖动和缩放逻辑
const dragState = ref({ idx: null, offset: { x: 0, y: 0 } });
const resizeState = ref({ idx: null, start: { x: 0, y: 0, width: 0, height: 0 } });

function onBlockMouseDown(idx, e) {
  if (e.target.classList.contains('resize-handle')) return;
  e.preventDefault();
  activeBlockIndex.value = idx;
  dragState.value.idx = idx;
  const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { left: 0, top: 0 };
  dragState.value.offset = {
    x: e.clientX - (rect.left + blockStates.value[idx].x),
    y: e.clientY - (rect.top + blockStates.value[idx].y)
  };
  window.addEventListener('mousemove', onBlockMouseMove, { passive: false });
  window.addEventListener('mouseup', onBlockMouseUp, { passive: false });
}

function onBlockMouseMove(e) {
  const idx = dragState.value.idx;
  if (idx !== null) {
    const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    let newX = e.clientX - rect.left - dragState.value.offset.x;
    let newY = e.clientY - rect.top - dragState.value.offset.y;
    const block = blockStates.value[idx];
    newX = Math.max(0, Math.min(newX, rect.width - block.width));
    newY = Math.max(0, Math.min(newY, rect.height - block.height));
    blockStates.value[idx].x = newX;
    blockStates.value[idx].y = newY;
    blockStates.value[idx].dragging = true;
  }
}

function onBlockMouseUp() {
  const idx = dragState.value.idx;
  if (idx !== null) blockStates.value[idx].dragging = false;
  dragState.value.idx = null;
  window.removeEventListener('mousemove', onBlockMouseMove, { passive: false });
  window.removeEventListener('mouseup', onBlockMouseUp, { passive: false });
}

function onResizeMouseDown(idx, e) {
  e.stopPropagation();
  e.preventDefault();
  resizeState.value.idx = idx;
  resizeState.value.start = {
    x: e.clientX,
    y: e.clientY,
    width: blockStates.value[idx].width,
    height: blockStates.value[idx].height
  };
  window.addEventListener('mousemove', onResizeMouseMove, { passive: false });
  window.addEventListener('mouseup', onResizeMouseUp, { passive: false });
}

function onResizeMouseMove(e) {
  const idx = resizeState.value.idx;
  if (idx !== null) {
    const dx = e.clientX - resizeState.value.start.x;
    const dy = e.clientY - resizeState.value.start.y;
    let newWidth = Math.max(32, resizeState.value.start.width + dx);
    let newHeight = Math.max(32, resizeState.value.start.height + dy);
    const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const block = blockStates.value[idx];
    newWidth = Math.min(newWidth, rect.width - block.x);
    newHeight = Math.min(newHeight, rect.height - block.y);
    blockStates.value[idx].width = newWidth;
    blockStates.value[idx].height = newHeight;
    blockStates.value[idx].resizing = true;
  }
}

function onResizeMouseUp() {
  const idx = resizeState.value.idx;
  if (idx !== null) blockStates.value[idx].resizing = false;
  resizeState.value.idx = null;
  window.removeEventListener('mousemove', onResizeMouseMove, { passive: false });
  window.removeEventListener('mouseup', onResizeMouseUp, { passive: false });
}

// 移动端触摸支持
function onBlockTouchStart(idx, e) {
  if (e.target.classList.contains('resize-handle')) return;
  e.preventDefault();
  const touch = e.touches[0];
  dragState.value.idx = idx;
  const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { left: 0, top: 0 };
  dragState.value.offset = {
    x: touch.clientX - (rect.left + blockStates.value[idx].x),
    y: touch.clientY - (rect.top + blockStates.value[idx].y)
  };
  window.addEventListener('touchmove', onBlockTouchMove, { passive: false });
  window.addEventListener('touchend', onBlockTouchEnd, { passive: false });
}

function onBlockTouchMove(e) {
  const idx = dragState.value.idx;
  if (idx !== null) {
    const touch = e.touches[0];
    const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    let newX = touch.clientX - rect.left - dragState.value.offset.x;
    let newY = touch.clientY - rect.top - dragState.value.offset.y;
    const block = blockStates.value[idx];
    newX = Math.max(0, Math.min(newX, rect.width - block.width));
    newY = Math.max(0, Math.min(newY, rect.height - block.height));
    blockStates.value[idx].x = newX;
    blockStates.value[idx].y = newY;
    blockStates.value[idx].dragging = true;
  }
}

function onBlockTouchEnd() {
  const idx = dragState.value.idx;
  if (idx !== null) blockStates.value[idx].dragging = false;
  dragState.value.idx = null;
  window.removeEventListener('touchmove', onBlockTouchMove, { passive: false });
  window.removeEventListener('touchend', onBlockTouchEnd, { passive: false });
}

function onResizeTouchStart(idx, e) {
  e.stopPropagation();
  e.preventDefault();
  const touch = e.touches[0];
  resizeState.value.idx = idx;
  resizeState.value.start = {
    x: touch.clientX,
    y: touch.clientY,
    width: blockStates.value[idx].width,
    height: blockStates.value[idx].height
  };
  window.addEventListener('touchmove', onResizeTouchMove, { passive: false });
  window.addEventListener('touchend', onResizeTouchEnd, { passive: false });
}

function onResizeTouchMove(e) {
  const idx = resizeState.value.idx;
  if (idx !== null) {
    const touch = e.touches[0];
    const dx = touch.clientX - resizeState.value.start.x;
    const dy = touch.clientY - resizeState.value.start.y;
    let newWidth = Math.max(32, resizeState.value.start.width + dx);
    let newHeight = Math.max(32, resizeState.value.start.height + dy);
    const rect = previewRef.value ? previewRef.value.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const block = blockStates.value[idx];
    newWidth = Math.min(newWidth, rect.width - block.x);
    newHeight = Math.min(newHeight, rect.height - block.y);
    blockStates.value[idx].width = newWidth;
    blockStates.value[idx].height = newHeight;
    blockStates.value[idx].resizing = true;
  }
}

function onResizeTouchEnd() {
  const idx = resizeState.value.idx;
  if (idx !== null) blockStates.value[idx].resizing = false;
  resizeState.value.idx = null;
  window.removeEventListener('touchmove', onResizeTouchMove, { passive: false });
  window.removeEventListener('touchend', onResizeTouchEnd, { passive: false });
}

// 颜色转换和计算工具函数
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `RGB(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
    : 'RGB(0, 0, 0)';
}

function hexToHsl(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function getTextColor(bgColor) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(bgColor);
  if (!result) return '#000';
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}

// 配色方案生成
function applyHarmony(type) {
  if (colors.value.length === 0) {
    colors.value.push('#409eff');
  }
  
  const baseColor = colors.value[0];
  const hsl = hexToHsl(baseColor);
  let newColors = [baseColor];
  
  switch (type) {
    case 'complementary':
      newColors.push(hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l));
      break;
    case 'analogous':
      newColors.push(
        hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l)
      );
      break;
    case 'triadic':
      newColors.push(
        hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)
      );
      break;
    case 'tetradic':
      newColors.push(
        hslToHex((hsl.h + 90) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h + 270) % 360, hsl.s, hsl.l)
      );
      break;
    case 'monochromatic':
      newColors.push(
        hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 20, 90)),
        hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 20, 10)),
        hslToHex(hsl.h, Math.max(hsl.s - 20, 20), hsl.l)
      );
      break;
  }
  
  colors.value = newColors.slice(0, 8);
  const typeNames = {
    'complementary': '互补',
    'analogous': '类似',
    'triadic': '三角',
    'tetradic': '四分',
    'monochromatic': '单色调'
  };
  ElMessage.success(`已应用${typeNames[type]}配色方案`);
}

// 键盘快捷键
function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    addColor();
  }
  if (e.key === 'Delete' && colors.value.length > 1) {
    removeColor(colors.value.length - 1);
  }
}

// 生命周期钩子
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('mousemove', onBlockMouseMove);
  window.removeEventListener('mouseup', onBlockMouseUp);
  window.removeEventListener('mousemove', onResizeMouseMove);
  window.removeEventListener('mouseup', onResizeMouseUp);
  window.removeEventListener('touchmove', onBlockTouchMove);
  window.removeEventListener('touchend', onBlockTouchEnd);
  window.removeEventListener('touchmove', onResizeTouchMove);
  window.removeEventListener('touchend', onResizeTouchEnd);
});

// 监听 colors 变化同步 blockStates
watch(colors, syncBlockStates, { deep: true });
</script>

<style scoped>
.color-harmony-container {
  margin: 48px auto 32px auto;
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

.preset-section,
.harmony-section {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.section-label {
  font-weight: 600;
  font-size: 1rem;
  color: inherit;
  white-space: nowrap;
}

.preset-colors {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.preset-color {
  width: 36px;
  height: 36px;
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
  flex-wrap: wrap;
  flex: 1;
}

.harmony-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.harmony-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

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

.color-picker-item:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}

.color-hex {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(0,0,0,0.05);
  transition: all 0.2s ease;
  user-select: none;
}

.color-hex:hover {
  background: rgba(64,158,255,0.1);
  color: #409eff;
}

.add-btn {
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
  transform: none;
}

.remove-btn {
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
  box-shadow: 0 4px 8px rgba(230,69,69,0.4);
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

.color-block:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  transform: translateY(-2px);
}

.color-block[data-dragging="true"],
.color-block[data-resizing="true"] {
  border: 3px solid #409eff;
  box-shadow: 0 8px 32px rgba(64,158,255,0.4), 0 0 0 3px rgba(64,158,255,0.2);
  cursor: grabbing;
}

.block-info {
  text-align: center;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.block-color-hex {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.block-color-rgb {
  font-size: 0.85rem;
  opacity: 0.9;
}

.resize-handle {
  position: absolute;
  right: 4px;
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
  pointer-events: none;
}

.tips {
  color: #666;
  font-size: 0.95rem;
  padding: 12px 16px;
  background: rgba(64,158,255,0.08);
  border-radius: 8px;
  border-left: 4px solid #409eff;
  width: 100%;
  box-sizing: border-box;
}

.back-btn {
  position: absolute;
  top: 24px;
  left: 24px;
  margin: 0;
  width: auto;
  min-width: 80px;
  display: inline-block;
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

.color-picker-item input[type="color"] {
  width: 40px;
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
  border-radius: 5px;
}

@media (max-width: 600px) {
  .color-harmony-container {
    max-width: 98vw;
    padding: 18px 4vw 24px 4vw;
    min-height: 340px;
  }
  
  .color-preview {
    min-height: 300px;
  }
  
  .preset-color {
    width: 30px;
    height: 30px;
  }
  
  .harmony-btn {
    padding: 6px 12px;
    font-size: 0.85rem;
  }
  
  .color-picker-item input[type="color"] {
    width: 32px;
    height: 32px;
  }
}

@media (min-width: 601px) and (max-width: 900px) {
  .color-harmony-container {
    max-width: 90vw;
    padding: 24px 6vw 28px 6vw;
  }
}
</style>
