<template>
  <div class="color-harmony-container">
    <button @click="$router.back()" class="back-btn">返回</button>
    <h2>色彩和谐搭配</h2>
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
    <div class="tips">
      <p>可选择多种颜色，预览和谐搭配效果。建议选择2-6种颜色。</p>
      <p style="color:#888;font-size:0.92em;">提示：点击色块也可以重新选择颜色</p>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const colors = ref(["#409eff", "#67c23a"])
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
.color-harmony-container {
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  padding: 32px 24px 24px 24px;
}
.color-pickers {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}
.color-picker-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.color-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}
.color-block {
  width: 65px;
  height: 65px;
  border-radius: 8px;
  border: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 0.9rem;
  color: #333;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  padding-left: 18px;
  position: relative;
}
.tips {
  color: #888;
  font-size: 0.95rem;
}
.back-btn {
  margin: 16px 0;
  padding: 6px 18px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}
.back-btn:hover {
  background: #66b1ff;
}
</style>
