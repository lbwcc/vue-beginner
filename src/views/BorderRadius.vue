<script setup>
import { ref, computed, watch } from 'vue'

const topleft = ref(20)
const topright = ref(20)
const bottomleft = ref(20)
const bottomright = ref(20)
// 是否联动四角
const linked = ref(true)

function formatTooltip(val) {
  return val + '%'
}

const varCss = computed(() => ({
  '--topleft': topleft.value + '%',
  '--topright': topright.value + '%',
  '--bottomleft': bottomleft.value + '%',
  '--bottomright': bottomright.value + '%',
}))

// 避免递归触发的更新锁
let updating = false
watch(
  () => [topleft.value, topright.value, bottomleft.value, bottomright.value],
  (newVals, oldVals) => {
    if (!linked.value || updating) return
    const idx = newVals.findIndex((v, i) => v !== oldVals[i])
    if (idx === -1) return
    const val = newVals[idx]
    updating = true
    topleft.value = val
    topright.value = val
    bottomleft.value = val
    bottomright.value = val
    updating = false
  }
)
</script>

<template>
  <div class="content tool-page" v-reveal="{ y: 12, duration: 0.36 }">
    <button @click="$router.back()" class="back-btn" v-reveal="{ y: 8, duration: 0.26 }">返回</button>
    <div id="main" :style="varCss" v-reveal="{ y: 12, duration: 0.34, delay: 0.08 }">
      <div id="content" v-reveal="{ y: 10, duration: 0.3, delay: 0.12 }">
            <div class="control-row" style="width:100%;display:flex;align-items:center;justify-content:center;margin-bottom:8px;">
              <el-switch v-model="linked" active-text="四角联动" inactive-text="四角独立"></el-switch>
            </div>
            <div class="slider-row">左上:<el-slider :format-tooltip="formatTooltip" v-model="topleft"></el-slider></div>
            <div class="slider-row">右上:<el-slider :format-tooltip="formatTooltip" v-model="topright"></el-slider></div>
            <div class="slider-row">右下:<el-slider :format-tooltip="formatTooltip" v-model="bottomright"></el-slider></div>
            <div class="slider-row">左下:<el-slider :format-tooltip="formatTooltip" v-model="bottomleft"></el-slider></div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.content {
  min-height: 98vh;
  background: var(--bg-main, #f7f8fa);
  display: flex;
  flex-direction: column;
  overflow-x: hidden; /* 禁止左右滚动 */
}
body {
  overflow-x: hidden;
}
#main {
  width: 100%;
  max-width: 100%;
  max-height: 60vw;
  min-width: 260px;
  min-height: 260px;
  margin: 0 auto;
  background-color: var(--bg-cell, cadetblue);
  border-radius: var(--topleft) var(--topright) var(--bottomright) var(--bottomleft);
  transition: border-radius 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
#content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
  padding: 10px 0;
}
.slider-row {
  width: 100%;
  margin: 10px 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
}
.deep .el-input__inner {
  margin-top: 20px;
  width: 100%;
  min-width: 120px;
  height: 40px;
}
.deep .el-slider__runway {
  width: 100%;
  min-width: 120px;
  max-width: 300px;
}

@media (max-width: 600px) {
  #main {
    width: 90vw;
    max-width: 100vw;
    min-height: 180px;
    max-height: 100vw;
  }
  #content {
    padding: 4vw 0;
  }
  .slider-row {
    max-width: 95vw;
    font-size: 0.95rem;
  }
  .deep .el-slider__runway {
    max-width: 90vw;
  }
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
</style>