<template>
  <div class="echarts-container">
    <div class="header">
      <button @click="$router.back()" class="back-btn">
        <span>← 返回</span>
      </button>
      <h1>ECharts 可视化演示</h1>
    </div>
    
    <el-tabs class="charts-tabs" type="border-card">
      <el-tab-pane label="饼图示例">
        <div class="chart-wrapper">
          <div id="demo" class="chart-box"></div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="中国地图">
        <div class="chart-wrapper">
          <div id="map" class="chart-box"></div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import * as Echarts5 from "echarts";

const chartDemo = ref(null);
let chartInstance = null;

function handleResize() {
  if (chartInstance) {
    chartInstance.resize();
  }
}

onMounted(() => {
  let mapDom = document.getElementById("map");
  let mapOption = {
    series: [
      {
        type: "map",
        map: "china",
        roam: true,
        label: {
          show: true,
          color: "#000",
        },
        itemStyle: {
          borderColor: "#111",
          borderWidth: 1,
          areaColor: "#ccc",
        },
        emphasis: {
          label: {
            show: true,
            color: "#fff",
          },
          itemStyle: {
            areaColor: "#f00",
          },
        },
      },
    ],
  };
  const fetchMap = async () => {
    try {
      // 从在线资源获取中国地图 GeoJSON 数据
      const response = await fetch(
        "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
      );
      const chinaJson = await response.json();
      // 注册地图
      Echarts5.registerMap("china", chinaJson);
      // 创建并设置地图实例
      let mapInstance = Echarts5.init(mapDom);
      mapInstance.setOption(mapOption);
    } catch (error) {
      console.error("加载地图数据失败:", error);
    }
  };
  fetchMap();
  let demoDom = document.getElementById("demo");
  let chartDemOption = {
    series: [
      {
        type: "pie",
        color: ["yellow", "red", "orange"],
        data: [
          { name: "banana", value: 40 },
          { name: "apple", value: 30 },
          { name: "orange", value: 30 },
        ],
        radius: "60%",
      },
    ],
  };
  chartInstance = Echarts5.init(demoDom);
  chartInstance.setOption(chartDemOption);
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  if (chartInstance) {
    chartInstance.dispose();
  }
});
</script>

<style scoped>
.echarts-container {
  height: calc(100vh - 40px);
  background: var(--bg-main, #f5f7fa);
  padding: 20px;
}

.header {
  max-width: 1200px;
  margin: 0 auto 24px;
}

.header h1 {
  margin: 16px 0;
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary, #303133);
}

.back-btn {
  padding: 10px 20px;
  background: var(--button, #409eff);
  color: var(--button-text, #fff);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
}

.back-btn:hover {
  background: var(--button-hover, #66b1ff);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(64, 158, 255, 0.4);
}

.back-btn span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.charts-tabs {
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.chart-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  min-height: 500px;
}

.chart-box {
  width: 1000px;
  height: 500px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  
  .header h1 {
    font-size: 22px;
  }
  
  .chart-wrapper {
    padding: 12px;
    min-height: 400px;
  }
  
  .chart-box {
    height: 400px;
  }
}

@media (max-width: 480px) {
  .header h1 {
    font-size: 18px;
  }
  
  .chart-wrapper {
    min-height: 320px;
  }
  
  .chart-box {
    height: 320px;
  }
}
</style>
