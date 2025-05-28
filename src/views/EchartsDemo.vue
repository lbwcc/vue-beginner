<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as Echarts5 from "echarts"

const chartDemo = ref(null)
let chartInstance = null

function handleResize() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(() => {
  let demoDom = document.getElementById("demo")
  let chartDemOption = {
    series: [
      {
        type: "pie",
        color: ['yellow','red','orange'],
        data: [
          { name: "banana", value: 40 },
          { name: "apple", value: 30 },
          { name: "orange", value: 30 },
        ],
        radius:'60%'
      },
    ],
  }
  chartInstance = Echarts5.init(demoDom)
  chartInstance.setOption(chartDemOption)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>

<template>
  <div id="main content">
    <button @click="$router.back()" class="back-btn">返回</button>
    <h1>echarts的使用</h1>
    <div id="demo" style="height: 50vw; max-width: 500px; width: 100%"></div>
  </div>
</template>

<style>
.content {
  min-height: 98vh;
  background: var(--bg-main, #f7f8fa);
  display: flex;
  flex-direction: column;
  overflow-x: hidden; /* 禁止左右滚动 */
}
#main {
  display: flex;
  flex-direction: column;
  align-items: center;
}
#demo {
  width: 100%;
  max-width: 500px;
  height: 50vw;
  min-height: 300px;
}
@media (max-width: 600px) {
  #demo {
    height: 60vw;
    min-height: 200px;
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