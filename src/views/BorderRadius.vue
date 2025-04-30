<script setup>
import { ref, computed } from 'vue'

const topleft = ref(20)
const topright = ref(20)
const bottomleft = ref(20)
const bottomright = ref(20)

function formatTooltip(val) {
  return val + '%'
}

const varCss = computed(() => ({
  '--topleft': topleft.value + '%',
  '--topright': topright.value + '%',
  '--bottomleft': bottomleft.value + '%',
  '--bottomright': bottomright.value + '%',
}))
</script>

<template>
  <div id="main" :style="varCss">
    <div id="content">
      <div class="slider-row">左上:<el-slider :format-tooltip="formatTooltip" v-model="topleft"></el-slider></div>
      <div class="slider-row">右上:<el-slider :format-tooltip="formatTooltip" v-model="topright"></el-slider></div>
      <div class="slider-row">右下:<el-slider :format-tooltip="formatTooltip" v-model="bottomright"></el-slider></div>
      <div class="slider-row">左下:<el-slider :format-tooltip="formatTooltip" v-model="bottomleft"></el-slider></div>
    </div>
  </div>
</template>

<style lang="less" scoped>
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
  background-color: cadetblue;
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
    width: 100vw;
    max-width: 100vw;
    min-height: 180px;
    max-height: 70vw;
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
</style>