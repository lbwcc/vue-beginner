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
  <div id="main">
    <h1>echarts的使用</h1>
    <div id="demo" style="height: 50vw; max-width: 500px; width: 100%"></div>
  </div>
</template>

<style>
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
</style>