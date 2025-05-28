<template>
  <div class="color-harmony-container" :style="{ background: bgColor }">
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
        :style="{ background: color }"
        @click="openColorPicker(idx, $event)"
        style="cursor:pointer; position:relative;"
      >
        {{ color }}
        <input
          :ref="el => setColorInputRef(el, idx)"
          type="color"
          v-model="colors[idx]"
          :style="getColorInputStyle(idx)"
          @click.stop
        />
      </div>
    </div>
    <button @click="$router.back()" class="back-btn bottom-btn">返回</button>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

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
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 18px;
  justify-content: flex-start;
}
.color-block {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 1.5px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.92rem;
  color: #333;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  padding: 0;
  margin: 0;
  position: relative;
  transition: box-shadow 0.18s, border 0.18s;
  word-break: break-all;
  background: #fff;
}
.tips {
  color: #888;
  font-size: 0.95rem;
}
.back-btn {
  margin: 16px 0;
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
.bottom-btn {
  display: block;
  width: 100%;
  margin: 32px auto 0 auto;
  position: static;
  font-size: 1.08rem;
  letter-spacing: 2px;
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
