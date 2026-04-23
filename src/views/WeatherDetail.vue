<template>
  <AppShell
    title="天气详情"
    eyebrow="天气 / 预报 / 降雨"
    subtitle="保留原有滑动预报与分钟级降雨图逻辑，统一到当前暖色壳层。"
    active-section="weather"
  >
    <template #header-actions>
      <button class="shell-btn" @click="goBack">返回</button>
    </template>

    <div class="weather-page">
      <div class="weather-detail">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="errorMsg" class="error">{{ errorMsg }}</div>
        <div v-else-if="weatherData" class="weather-content">
          <div class="weather-overview">
            <div class="overview-main">
              <img
                :src="iconUrl"
                alt="now icon"
                class="overview-icon"
                v-if="iconUrl"
              />
              <div>
                <div class="overview-temp">
                  {{ weatherData?.now?.temp ?? "--" }}°C
                </div>
                <div class="overview-text">
                  {{ weatherData?.now?.text ?? "--" }}
                </div>
              </div>
            </div>
            <div class="overview-index">
              {{ currentDayIndex + 1 }} /
              {{ forecastData ? forecastData.length : 0 }}
            </div>
          </div>
          <!-- 未来天气预报 -->
          <div
            v-if="forecastData && forecastData.length > 0"
            class="forecast-section"
          >
            <div
              class="forecast-container"
              :class="{ animating: isAnimating }"
              @touchstart="handleTouchStart"
              @touchend="handleTouchEnd"
              @mousedown="handleMouseDown"
              @mousemove="handleMouseMove"
              @mouseup="handleMouseUp"
            >
              <transition
                :name="
                  slideDirection === 'left'
                    ? 'card-slide-left'
                    : 'card-slide-right'
                "
                mode="out-in"
              >
                <div
                  class="forecast-card"
                  v-if="currentDayData"
                  :key="currentDayIndex"
                >
                  <div class="forecast-date">
                    {{ formatDate(currentDayData.fxDate) }}
                  </div>
                  <div class="forecast-main">
                    <div class="day-weather">
                      <img
                        :src="getWeatherIcon(currentDayData.iconDay)"
                        alt="day icon"
                        class="forecast-icon"
                      />
                      <div class="forecast-text">
                        {{ currentDayData.textDay }}
                      </div>
                      <div class="forecast-temp">
                        {{ currentDayData.tempMax }}°/{{
                          currentDayData.tempMin
                        }}°
                      </div>
                    </div>
                  </div>

                  <!-- 详细信息 -->
                  <div class="forecast-details">
                    <div class="detail-row">
                      <span>日出/日落</span>
                      <span
                        >{{ currentDayData.sunrise }}/{{
                          currentDayData.sunset
                        }}</span
                      >
                    </div>
                    <div class="detail-row">
                      <span>月出/月落</span>
                      <span
                        >{{ currentDayData.moonrise }}/{{
                          currentDayData.moonset
                        }}</span
                      >
                    </div>
                    <div class="detail-row">
                      <span>月相</span>
                      <span>{{ currentDayData.moonPhase }}</span>
                    </div>
                    <div class="detail-row">
                      <span>白天风向</span>
                      <span
                        >{{ currentDayData.windDirDay }}
                        {{ currentDayData.windScaleDay }}级</span
                      >
                    </div>
                    <div class="detail-row">
                      <span>湿度</span>
                      <span>{{ currentDayData.humidity }}%</span>
                    </div>
                    <div class="detail-row">
                      <span>降水量</span>
                      <span>{{ currentDayData.precip }}mm</span>
                    </div>
                    <div class="detail-row">
                      <span>气压</span>
                      <span>{{ currentDayData.pressure }}hPa</span>
                    </div>
                    <div class="detail-row">
                      <span>能见度</span>
                      <span>{{ currentDayData.vis }}km</span>
                    </div>
                    <div class="detail-row">
                      <span>云量</span>
                      <span>{{ currentDayData.cloud }}%</span>
                    </div>
                    <div class="detail-row">
                      <span>UV指数</span>
                      <span>{{ currentDayData.uvIndex }}</span>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
            <!-- <div class="rain-chart-section" v-if="rainChartData.length > 0">
                    <h4>未来降雨量（mm）</h4>
                    <div class="rain-chart-wrap">
                        <svg viewBox="0 0 320 160" class="rain-chart-svg" preserveAspectRatio="none">
                            <line x1="24" y1="136" x2="308" y2="136" class="chart-axis" />
                            <line x1="24" y1="20" x2="24" y2="136" class="chart-axis" />
                            <polyline :points="rainPolylinePoints" class="rain-line" />
                            <g v-for="point in rainChartPoints" :key="point.key">
                                <circle :cx="point.x" :cy="point.y" r="3" class="rain-dot" />
                                <text :x="point.x" :y="point.y - 8" class="rain-value">{{ point.value }}</text>
                                <text :x="point.x" y="150" class="rain-date">{{ point.label }}</text>
                            </g>
                        </svg>
                    </div>
                </div> -->
            <div v-if="isTodaySelected" class="minutely-section">
              <div class="minutely-header">
                <h4>未来2小时降雨折线图（每10分钟）</h4>
                <span v-if="minutelySummary" class="minutely-summary">{{
                  minutelySummary
                }}</span>
              </div>
              <div v-if="minutelyLoading" class="minutely-loading">
                分钟级天气加载中...
              </div>
              <div v-else-if="minutelyError" class="minutely-error">
                {{ minutelyError }}
              </div>
              <div
                v-else-if="hourlyRainData.length > 0"
                class="hourly-rain-chart-wrap"
              >
                <svg
                  viewBox="0 0 320 170"
                  class="hourly-rain-chart"
                  preserveAspectRatio="none"
                >
                  <line x1="24" y1="144" x2="308" y2="144" class="chart-axis" />
                  <line x1="24" y1="16" x2="24" y2="144" class="chart-axis" />
                  <polyline
                    :points="hourlyRainPolylinePoints"
                    class="hourly-rain-line"
                  />
                  <g v-for="point in hourlyRainPoints" :key="point.key">
                    <circle
                      :cx="point.x"
                      :cy="point.y"
                      r="3"
                      class="hourly-rain-dot"
                    />
                    <text
                      :x="point.x"
                      :y="point.y - 8"
                      class="hourly-rain-value"
                    >
                      {{ point.value }}
                    </text>
                    <text :x="point.x" y="160" class="hourly-rain-label">
                      {{ point.label }}
                    </text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #aside>
      <section class="weather-side-card">
        <div class="side-title">今日状态</div>
        <div class="side-value">{{ weatherData?.now?.temp ?? "--" }}°C</div>
        <p class="side-text">{{ weatherData?.now?.text ?? "暂无天气描述" }}</p>
      </section>
      <section class="weather-side-card">
        <div class="side-title">预报进度</div>
        <div class="side-value">
          {{ currentDayIndex + 1 }} /
          {{ forecastData ? forecastData.length : 0 }}
        </div>
        <p class="side-text">左右滑动切换日期，查看日级与分钟级降雨信息。</p>
      </section>
    </template>
  </AppShell>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import {
  getWeatherNow,
  getWeatherForecast,
  getWeatherMinutely5m,
} from "@/api/weatherApi";
import AppShell from "@/components/AppShell.vue";

const router = useRouter();
const weatherData = ref(null);
const forecastData = ref(null);
const loading = ref(true);
const errorMsg = ref("");
const currentDayIndex = ref(0);
const minutelyData = ref([]);
const minutelySummary = ref("");
const minutelyLoading = ref(false);
const minutelyError = ref("");
const touchStartX = ref(0);
const touchEndX = ref(0);
const touchStartY = ref(0);
const touchEndY = ref(0);
const slideDirection = ref(""); // 跟踪滑动方向
const isAnimating = ref(false); // 动画状态跟踪
const isDragging = ref(false); // 鼠标拖动状态
let slideTimeout = null; // 防抖定时器

const iconUrl = computed(() => {
  const icon = weatherData.value?.now?.icon;
  return icon ? `https://icons.qweather.com/assets/icons/${icon}.svg` : "";
});

const currentDayData = computed(() => {
  if (!forecastData.value || forecastData.value.length === 0) {
    return null;
  }
  const index = currentDayIndex.value;
  if (index < 0 || index >= forecastData.value.length) {
    return null;
  }
  return forecastData.value[index];
});

const rainChartData = computed(() => {
  if (!forecastData.value || forecastData.value.length === 0) {
    return [];
  }
  return forecastData.value.map((item) => {
    const date = new Date(item.fxDate);
    return {
      key: item.fxDate,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      value: Number(item.precip) || 0,
    };
  });
});

const rainMax = computed(() => {
  if (rainChartData.value.length === 0) {
    return 1;
  }
  const max = Math.max(...rainChartData.value.map((item) => item.value));
  return max > 0 ? max : 1;
});

const rainChartPoints = computed(() => {
  if (rainChartData.value.length === 0) {
    return [];
  }

  const left = 24;
  const right = 308;
  const top = 20;
  const bottom = 136;
  const width = right - left;
  const height = bottom - top;
  const length = rainChartData.value.length;
  const stepX = length > 1 ? width / (length - 1) : 0;

  return rainChartData.value.map((item, index) => {
    const x = left + stepX * index;
    const y = bottom - (item.value / rainMax.value) * height;
    return {
      ...item,
      x,
      y,
    };
  });
});

const rainPolylinePoints = computed(() => {
  if (rainChartPoints.value.length === 0) {
    return "";
  }
  return rainChartPoints.value
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
});

const isTodaySelected = computed(() => {
  const currentDate = currentDayData.value?.fxDate;
  if (!currentDate) return false;
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return currentDate === `${y}-${m}-${d}`;
});

const displayedMinutely = computed(() => {
  return minutelyData.value.slice(0, 24);
});

const hourlyRainData = computed(() => {
  if (displayedMinutely.value.length === 0) {
    return [];
  }

  const tenMinuteBuckets = new Map();
  displayedMinutely.value.forEach((item) => {
    if (!item.fxTime) {
      return;
    }
    const date = new Date(item.fxTime);
    const roundedMinute = Math.floor(date.getMinutes() / 10) * 10;
    const bucketLabel = `${String(date.getHours()).padStart(2, "0")}:${String(roundedMinute).padStart(2, "0")}`;
    const precip = Number(item.precip) || 0;
    tenMinuteBuckets.set(
      bucketLabel,
      (tenMinuteBuckets.get(bucketLabel) || 0) + precip,
    );
  });

  return Array.from(tenMinuteBuckets.entries()).map(
    ([label, value], index) => ({
      key: `${label}-${index}`,
      label,
      value: Number(value.toFixed(2)),
    }),
  );
});

const hourlyRainMax = computed(() => {
  if (hourlyRainData.value.length === 0) {
    return 1;
  }
  const max = Math.max(...hourlyRainData.value.map((item) => item.value));
  return max > 0 ? max : 1;
});

const hourlyRainPoints = computed(() => {
  if (hourlyRainData.value.length === 0) {
    return [];
  }

  const left = 24;
  const right = 308;
  const top = 16;
  const bottom = 144;
  const width = right - left;
  const height = bottom - top;
  const length = hourlyRainData.value.length;
  const stepX = length > 1 ? width / (length - 1) : 0;

  return hourlyRainData.value.map((item, index) => {
    const x = left + stepX * index;
    const y = bottom - (item.value / hourlyRainMax.value) * height;
    return {
      ...item,
      x,
      y,
    };
  });
});

const hourlyRainPolylinePoints = computed(() => {
  if (hourlyRainPoints.value.length === 0) {
    return "";
  }
  return hourlyRainPoints.value
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
});

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  if (date.toDateString() === today.toDateString()) {
    return "今天";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "明天";
  } else if (date.toDateString() === dayAfterTomorrow.toDateString()) {
    return "后天";
  } else {
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  }
}

function getWeatherIcon(iconCode) {
  return `https://icons.qweather.com/assets/icons/${iconCode}.svg`;
}

function formatMinutelyTime(dateTime) {
  if (!dateTime) return "--:--";
  const date = new Date(dateTime);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function handleTouchStart(event) {
  touchStartX.value = event.touches[0].clientX;
  touchStartY.value = event.touches[0].clientY;
  // 移除 event.preventDefault() 以允许垂直滚动
}

function handleTouchEnd(event) {
  // 如果正在动画中，忽略新的触摸事件
  if (isAnimating.value) {
    return;
  }

  touchEndX.value = event.changedTouches[0].clientX;
  touchEndY.value = event.changedTouches[0].clientY;
  const diffX = touchStartX.value - touchEndX.value;
  const diffY = touchStartY.value - touchEndY.value;

  // 如果垂直滑动距离大于水平滑动距离，允许默认滚动行为
  if (Math.abs(diffY) > Math.abs(diffX)) {
    return;
  }

  // 滑动距离大于50px才触发切换
  if (
    Math.abs(diffX) > 50 &&
    forecastData.value &&
    forecastData.value.length > 0
  ) {
    if (diffX > 0 && currentDayIndex.value < forecastData.value.length - 1) {
      // 向左滑动，显示下一天
      performSlide("left");
    } else if (diffX < 0 && currentDayIndex.value > 0) {
      // 向右滑动，显示前一天
      performSlide("right");
    }
  }
  event.preventDefault(); // 阻止默认触摸行为
}

// 鼠标事件处理函数
function handleMouseDown(event) {
  if (isAnimating.value) return;
  isDragging.value = true;
  touchStartX.value = event.clientX;
  touchStartY.value = event.clientY;
  // 移除 event.preventDefault() 以允许垂直滚动
}

function handleMouseMove(event) {
  if (!isDragging.value) return;
  // 可以在这里添加拖动反馈，但暂时不需要
}

function handleMouseUp(event) {
  if (!isDragging.value) return;
  isDragging.value = false;
  touchEndX.value = event.clientX;
  touchEndY.value = event.clientY;
  const diffX = touchStartX.value - touchEndX.value;
  const diffY = touchStartY.value - touchEndY.value;

  // 如果垂直滑动距离大于水平滑动距离，允许默认滚动行为
  if (Math.abs(diffY) > Math.abs(diffX)) {
    return;
  }

  // 滑动距离大于50px才触发切换
  if (
    Math.abs(diffX) > 50 &&
    forecastData.value &&
    forecastData.value.length > 0
  ) {
    if (diffX > 0 && currentDayIndex.value < forecastData.value.length - 1) {
      performSlide("left");
    } else if (diffX < 0 && currentDayIndex.value > 0) {
      performSlide("right");
    }
  }
}

// 执行滑动操作
function performSlide(direction) {
  // 清除之前的定时器
  if (slideTimeout) {
    clearTimeout(slideTimeout);
  }

  isAnimating.value = true;
  slideDirection.value = direction;

  if (direction === "left") {
    currentDayIndex.value++;
  } else {
    currentDayIndex.value--;
  }

  // 动画完成后重置状态
  slideTimeout = setTimeout(() => {
    isAnimating.value = false;
    slideDirection.value = "";
    slideTimeout = null;
  }, 500); // 稍微长于动画时间450ms
}

async function fetchWeatherDetail() {
  loading.value = true;
  try {
    // 获取当前位置或使用默认城市
    let location = "beijing";
    if (navigator.geolocation) {
      location = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            resolve(`${longitude},${latitude}`);
          },
          () => resolve("beijing"),
          { timeout: 5000 },
        );
      });
    }

    // 获取当前天气
    const nowRes = await getWeatherNow(location);
    weatherData.value = nowRes.data;

    // 获取未来天气预报（默认7天）
    const forecastRes = await getWeatherForecast(location, "7d");
    forecastData.value = forecastRes.data.daily;

    await fetchMinutely(location);

    // 重置当前天数索引，确保不超过新数据的范围
    if (forecastData.value && forecastData.value.length > 0) {
      currentDayIndex.value = 0;
    }

    errorMsg.value = "";
  } catch (e) {
    errorMsg.value = "获取天气详情失败";
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function fetchMinutely(location) {
  minutelyLoading.value = true;
  try {
    const minutelyRes = await getWeatherMinutely5m(location);
    minutelyData.value = minutelyRes.data?.minutely || [];
    minutelySummary.value = minutelyRes.data?.summary || "";
    minutelyError.value = "";
  } catch (e) {
    minutelyData.value = [];
    minutelySummary.value = "";
    minutelyError.value = "分钟级天气获取失败";
  } finally {
    minutelyLoading.value = false;
  }
}

function goBack() {
  router.back();
}

onMounted(() => {
  fetchWeatherDetail();
  // 添加全局鼠标事件监听器
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
});

// 组件卸载时清理定时器和事件监听器
onUnmounted(() => {
  if (slideTimeout) {
    clearTimeout(slideTimeout);
    slideTimeout = null;
  }
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
});
</script>

<style scoped>
.weather-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shell-btn {
  min-height: 42px;
  border: 0;
  border-radius: 14px;
  padding: 0 16px;
  background: linear-gradient(135deg, #e58a6a, #d56a4f);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.weather-side-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(210, 190, 178, 0.95);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 253, 0.98),
    rgba(252, 248, 244, 0.98)
  );
  box-shadow: 0 22px 55px rgba(166, 139, 117, 0.12);
}

.side-title {
  color: #cb684d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.side-value {
  margin-top: 12px;
  color: #372d29;
  font-size: 30px;
  font-weight: 800;
}

.side-text {
  margin: 8px 0 0;
  color: #695b54;
  line-height: 1.75;
}

.weather-detail {
  position: relative;
  padding: 16px;
  max-width: 940px;
  margin: 0 auto;
  background: linear-gradient(
    180deg,
    rgba(255, 252, 248, 0.92),
    rgba(247, 242, 237, 0.96)
  );
  border: 1px solid rgba(215, 198, 187, 0.92);
  border-radius: 24px;
  box-shadow: 0 20px 48px rgba(166, 139, 117, 0.12);
  min-height: auto;
  color: #2f2623;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.weather-detail h1 {
  text-align: center;
  margin-bottom: 20px;
  color: var(--main-text, white);
  font-size: 2.2rem;
  font-weight: 300;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  font-size: 16px;
}

.error {
  color: #ff4d4f;
}

.weather-content {
  border-radius: 20px;
  padding: 18px;
  flex: 1;
}

.weather-overview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  background: linear-gradient(
    180deg,
    rgba(255, 250, 246, 0.98),
    rgba(255, 255, 255, 0.98)
  );
  border: 1px solid rgba(224, 210, 199, 0.92);
}

.overview-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.overview-icon {
  width: 40px;
  height: 40px;
}

.overview-temp {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2f2623;
}

.overview-text {
  color: #695b54;
  font-size: 0.95rem;
}

.overview-index {
  font-weight: 700;
  color: #b7543b;
}

.current-weather h2 {
  margin-bottom: 15px;
  color: var(--main-text, #333);
  text-align: center;
  font-size: 1.6rem;
  font-weight: 500;
}

.weather-main {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}

.weather-icon {
  width: 70px;
  height: 70px;
  margin-right: 15px;
}

.weather-info {
  text-align: center;
}

.temperature {
  font-size: 3.5rem;
  font-weight: bold;
  color: var(--button-active, #ff6b6b);
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.weather-text {
  font-size: 1.3rem;
  color: var(--main-text, #666);
  font-weight: 500;
}

.weather-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-cell, rgba(255, 255, 255, 0.9));
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.detail-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.detail-item span:first-child {
  color: var(--main-text, #666);
}

.detail-item span:last-child {
  font-weight: bold;
  color: var(--main-text, #333);
}

.back-btn {
  margin: 0;
  background: var(--button, linear-gradient(90deg, #ffe082 0%, #ffd54f 100%));
  color: var(--button-text, #7c5700);
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  box-shadow:
    0 2px 8px #0002,
    0 1px 0 #fff8 inset;
  cursor: pointer;
  width: 100%;
  transition:
    background 0.2s,
    box-shadow 0.2s,
    transform 0.1s;
  flex-shrink: 0;
  margin-bottom: 20px;
}

.back-btn:hover {
  background: var(--button-hover, rgba(255, 255, 255, 0.3));
  border-color: var(--input-focus, rgba(255, 255, 255, 0.5));
  transform: scale(1.05);
}

.forecast-section {
  margin-top: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.forecast-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
}

.forecast-section h3 {
  margin: 0;
  color: var(--main-text, white);
  font-size: 1.6rem;
  font-weight: 400;
}

.forecast-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.forecast-selector label {
  font-size: 16px;
  color: var(--main-text, rgba(255, 255, 255, 0.9));
  font-weight: 500;
}

.forecast-selector select {
  padding: 10px 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: var(--input-bg, rgba(255, 255, 255, 0.9));
  color: var(--main-text, #333);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.forecast-selector select:hover {
  border-color: var(--input-focus, rgba(255, 255, 255, 0.5));
  background: var(--bg-cell, rgba(255, 255, 255, 1));
}

.forecast-selector select:focus {
  outline: none;
  border-color: var(--input-focus, #ff6b6b);
  box-shadow: 0 0 0 3px var(--input-focus, rgba(255, 107, 107, 0.2));
}

.day-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 20px;
  background: var(--bg-cell, rgba(255, 255, 255, 0.9));
  border-radius: 25px;
  color: var(--main-text, #333);
  font-weight: 500;
  font-size: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.forecast-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.forecast-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 360px;
  position: relative;
  touch-action: none; /* 禁用默认触摸行为 */
}

.forecast-card {
  background: linear-gradient(
    180deg,
    rgba(255, 252, 249, 0.98),
    rgba(255, 255, 255, 0.98)
  );
  border: 1px solid rgba(224, 210, 199, 0.92);
  border-radius: 22px;
  padding: 22px;
  width: 100%;
  max-width: 400px;
  will-change: transform, opacity;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow: 0 16px 32px rgba(166, 139, 117, 0.12);
  transition: box-shadow 0.3s ease;
}

.forecast-card:hover {
  box-shadow: 0 18px 36px rgba(166, 139, 117, 0.16);
}

.forecast-item {
  background: var(--bg-cell, rgba(255, 255, 255, 0.95));
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 18px;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.forecast-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.forecast-date {
  font-size: 1.1rem;
  font-weight: bold;
  color: #b7543b;
  margin-bottom: 12px;
  text-align: center;
}

.forecast-main {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.day-weather,
.night-weather {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.forecast-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 5px;
}

.forecast-text {
  font-size: 14px;
  color: #695b54;
  margin-bottom: 5px;
}

.forecast-temp {
  font-size: 1.1rem;
  font-weight: bold;
  color: #b7543b;
}

.forecast-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--input-border, #eee);
}

.rain-chart-section {
  margin: 16px 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--bg-cell, rgba(255, 255, 255, 0.9));
}

.rain-chart-section h4 {
  margin: 0 0 10px;
  font-size: 15px;
  color: var(--main-text, #1f2937);
}

.rain-chart-wrap {
  width: 100%;
  height: 170px;
}

.rain-chart-svg {
  width: 100%;
  height: 100%;
}

.chart-axis {
  stroke: rgba(100, 116, 139, 0.45);
  stroke-width: 1;
}

.rain-line {
  fill: none;
  stroke: #2b6cb0;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.rain-dot {
  fill: #2b6cb0;
}

.rain-value {
  fill: var(--main-text, #1f2937);
  font-size: 9px;
  text-anchor: middle;
}

.rain-date {
  fill: var(--main-text, #374151);
  font-size: 9px;
  text-anchor: middle;
}

.minutely-section {
  margin-top: 14px;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(
    180deg,
    rgba(255, 250, 246, 0.98),
    rgba(255, 255, 255, 0.98)
  );
  border: 1px solid rgba(224, 210, 199, 0.92);
}

.minutely-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.minutely-header h4 {
  margin: 0;
  font-size: 0.98rem;
  color: var(--main-text, #333);
}

.minutely-summary {
  font-size: 0.86rem;
  color: #695b54;
}

.hourly-rain-chart-wrap {
  width: 100%;
  height: 182px;
}

.hourly-rain-chart {
  width: 100%;
  height: 100%;
}

.hourly-rain-line {
  fill: none;
  stroke: #1d4ed8;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hourly-rain-dot {
  fill: #1d4ed8;
}

.hourly-rain-value {
  fill: var(--main-text, #1f2937);
  font-size: 9px;
  text-anchor: middle;
}

.hourly-rain-label {
  fill: var(--main-text, #475569);
  font-size: 9px;
  text-anchor: middle;
}

.minutely-loading,
.minutely-error {
  font-size: 0.9rem;
  color: #695b54;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--input-border, #f5f5f5);
}

.detail-row span:first-child {
  color: #695b54;
  font-size: 14px;
}

.detail-row span:last-child {
  font-weight: bold;
  color: #2f2623;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .weather-page {
    gap: 12px;
  }

  .weather-detail {
    padding: 12px;
    border-radius: 18px;
  }

  .weather-detail h1 {
    font-size: 1.8rem;
    margin-bottom: 15px;
  }

  .temperature {
    font-size: 2.8rem;
  }

  .weather-main {
    flex-direction: column;
    text-align: center;
    margin-bottom: 12px;
  }

  .weather-icon {
    margin-right: 0;
    margin-bottom: 12px;
    width: 65px;
    height: 65px;
  }

  .weather-details {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .forecast-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .forecast-main {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 10px;
    padding-bottom: 10px;
  }

  .day-weather {
    border-right: none;
    border-bottom: 1px solid #eee;
    padding-right: 0;
    padding-bottom: 12px;
  }

  .forecast-details {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .forecast-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .weather-overview {
    flex-direction: column;
    align-items: flex-start;
  }

  .minutely-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 小屏幕优化 */
@media (max-width: 480px) {
  .weather-detail {
    padding: 8px;
    margin: 8px;
    border-radius: 8px;
  }
  .weather-content {
    padding: 14px;
    font-size: 1.6rem;
    margin-bottom: 15px;
  }

  .overview-main {
    gap: 8px;
  }

  .overview-temp {
    font-size: 1.18rem;
  }

  .overview-text,
  .minutely-summary,
  .detail-row span,
  .side-text {
    font-size: 13px;
    line-height: 1.65;
  }

  .forecast-container {
    min-height: 0;
  }

  .forecast-card {
    padding: 16px;
    border-radius: 18px;
  }

  .forecast-date {
    font-size: 1rem;
  }

  .hourly-rain-chart-wrap {
    height: 168px;
  }

  .weather-side-card {
    padding: 16px;
    border-radius: 18px;
  }
}

@media (max-width: 640px) {
  .weather-overview {
    flex-direction: column;
    gap: 10px;
  }

  .overview-index {
    align-self: flex-start;
  }

  .forecast-card,
  .minutely-section {
    padding: 14px;
  }

  .detail-row {
    padding: 8px 0;
    gap: 12px;
  }

  .detail-row span:last-child {
    text-align: right;
  }

  .shell-btn {
    width: 100%;
    justify-content: center;

    height: 55px;
  }

  .detail-item {
    padding: 12px;
    font-size: 13px;
  }

  .back-btn {
    top: 8px;
    left: 8px;
    padding: 8px 16px;
    font-size: 13px;
  }

  .forecast-section h3 {
    font-size: 1.4rem;
  }

  .forecast-item {
    padding: 16px;
    border-radius: 12px;
  }

  .forecast-date {
    font-size: 1rem;
    margin-bottom: 10px;
  }

  .forecast-icon {
    width: 32px;
    height: 32px;
  }

  .forecast-text {
    font-size: 13px;
  }

  .forecast-temp {
    font-size: 1rem;
  }

  .detail-row {
    font-size: 13px;
  }

  .forecast-selector select {
    padding: 8px 12px;
    font-size: 13px;
  }

  .forecast-selector label {
    font-size: 14px;
  }

  .forecast-list {
    grid-template-columns: 1fr;
  }
}

/* 超小屏幕优化 */
@media (max-width: 360px) {
  .weather-detail h1 {
    font-size: 1.4rem;
  }

  .temperature {
    font-size: 1.8rem;
  }

  .weather-content {
    padding: 12px;
  }

  .detail-item {
    padding: 10px;
    font-size: 12px;
  }

  .forecast-item {
    padding: 12px;
  }
}

/* 移动端优化 */
@media (max-width: 480px) {
  .forecast-card {
    padding: 15px;
  }

  .forecast-details {
    gap: 6px;
  }
}

/* 卡片切换动画 */
.card-slide-left-enter-active,
.card-slide-left-leave-active,
.card-slide-right-enter-active,
.card-slide-right-leave-active {
  transition: all 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  pointer-events: none; /* 动画期间禁用指针事件 */
}

/* 向左滑动动画（显示下一天） */
.card-slide-left-enter-from {
  opacity: 0;
  transform: translateX(120%) scale(0.85) rotateY(20deg);
  z-index: 1;
}

.card-slide-left-enter-to {
  opacity: 1;
  transform: translateX(0) scale(1) rotateY(0deg);
  z-index: 2;
}

.card-slide-left-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1) rotateY(0deg);
  z-index: 2;
}

.card-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-120%) scale(0.85) rotateY(-20deg);
  z-index: 1;
}

/* 向右滑动动画（显示前一天）- 新卡片从左边进入 */
.card-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-120%) scale(0.85) rotateY(-20deg);
  z-index: 1;
}

.card-slide-right-enter-to {
  opacity: 1;
  transform: translateX(0) scale(1) rotateY(0deg);
  z-index: 2;
}

.card-slide-right-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1) rotateY(0deg);
  z-index: 2;
}

.card-slide-right-leave-to {
  opacity: 0;
  transform: translateX(120%) scale(0.85) rotateY(20deg);
  z-index: 1;
}

/* 动画完成后恢复指针事件 */
.card-slide-left-enter-active:not(.card-slide-left-enter-from):not(
    .card-slide-left-enter-to
  ),
.card-slide-left-leave-active:not(.card-slide-left-leave-from):not(
    .card-slide-left-leave-to
  ),
.card-slide-right-enter-active:not(.card-slide-right-enter-from):not(
    .card-slide-right-enter-to
  ),
.card-slide-right-leave-active:not(.card-slide-right-leave-from):not(
    .card-slide-right-leave-to
  ) {
  pointer-events: auto;
}

/* 优化动画性能 */
.forecast-card {
  will-change: transform, opacity;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}

/* 动画状态样式 */
.forecast-container.animating {
  pointer-events: none; /* 动画期间禁用所有交互 */
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.05) 0%,
    transparent 70%
  );
  transition: background 0.3s ease;
}

.forecast-container:not(.animating) {
  background: transparent;
  transition: background 0.3s ease;
}

.forecast-container.animating .forecast-card {
  user-select: none; /* 防止文本选择 */
}
</style>
