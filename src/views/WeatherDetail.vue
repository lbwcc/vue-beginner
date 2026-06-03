<template>
  <AppShell
    title="天气详情"
    eyebrow="天气 / 预报 / 降雨"
    subtitle="保留原有滑动预报与分钟级降雨图逻辑，统一到全局页面设计系统。"
    active-section="weather"
  >
    <template #header-actions>
      <button class="shell-btn" @click="goBack">返回</button>
    </template>

    <div class="weather-page" v-reveal="{ y: 12, duration: 0.38 }">
      <div class="weather-detail">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="errorMsg" class="error">{{ errorMsg }}</div>
        <div v-else-if="weatherData" class="weather-content">
          <div class="weather-overview" :class="{ 'weather-overview-desktop': isDesktopView }" v-reveal="{ y: 14, duration: 0.44, delay: 0.04 }">
            <template v-if="isDesktopView">
              <div class="overview-panel overview-panel-primary">
                <div class="overview-icon-wrap">
                  <img
                    :src="iconUrl"
                    alt="now icon"
                    class="overview-icon"
                    width="48"
                    height="48"
                    v-if="iconUrl"
                  />
                </div>
                <div class="overview-body">
                  <div class="overview-temp">{{ weatherData?.now?.temp ?? "--" }}°C</div>
                  <div class="overview-meta">
                    <span class="overview-text">{{ weatherData?.now?.text ?? "--" }}</span>
                    <span class="overview-location" v-if="locationName">📍{{ locationName }}</span>
                  </div>
                  <div class="overview-extra" v-if="weatherData?.now">
                    <span v-if="weatherData.now.windDir">{{ weatherData.now.windDir }}</span>
                    <span v-if="weatherData.now.windScale">{{ weatherData.now.windScale }}级</span>
                  </div>
                </div>
              </div>

              <div class="overview-panel overview-panel-stats">
                <div class="overview-stat-card">
                  <span class="overview-stat-label">体感</span>
                  <span class="overview-stat-value">{{ weatherData?.now?.feelsLike ?? weatherData?.now?.temp ?? '--' }}°C</span>
                </div>
                <div class="overview-stat-card">
                  <span class="overview-stat-label">湿度</span>
                  <span class="overview-stat-value">{{ weatherData?.now?.humidity ?? '--' }}%</span>
                </div>
                <div class="overview-stat-card">
                  <span class="overview-stat-label">风力</span>
                  <span class="overview-stat-value">{{ weatherData?.now?.windScale ?? '--' }}级</span>
                </div>
                <div class="overview-stat-card">
                  <span class="overview-stat-label">能见度</span>
                  <span class="overview-stat-value">{{ weatherData?.now?.vis ?? '--' }}km</span>
                </div>
              </div>

              <div class="overview-panel overview-panel-progress">
                <div class="overview-badge">
                  <span class="badge-current">{{ currentDayIndex + 1 }}</span>
                  <span class="badge-sep">/</span>
                  <span class="badge-total">{{ forecastData ? forecastData.length : 0 }}</span>
                </div>
                <div class="overview-progress-copy">
                  <div class="overview-progress-title">本周预报</div>
                  <div class="badge-hint">两列日期轨道，点击任意日期直接切换</div>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="overview-icon-wrap">
                <img
                  :src="iconUrl"
                  alt="now icon"
                  class="overview-icon"
                  width="48"
                  height="48"
                  v-if="iconUrl"
                />
              </div>
              <div class="overview-body">
                <div class="overview-temp">{{ weatherData?.now?.temp ?? "--" }}°C</div>
                <div class="overview-meta">
                  <span class="overview-text">{{ weatherData?.now?.text ?? "--" }}</span>
                  <span class="overview-location" v-if="locationName">📍{{ locationName }}</span>
                </div>
                <div class="overview-extra" v-if="weatherData?.now">
                  <span v-if="weatherData.now.windDir">{{ weatherData.now.windDir }}</span>
                  <span v-if="weatherData.now.windScale">{{ weatherData.now.windScale }}级</span>
                  <span v-if="weatherData.now.humidity">湿度 {{ weatherData.now.humidity }}%</span>
                </div>
              </div>
              <div class="overview-badge">
                <span class="badge-current">{{ currentDayIndex + 1 }}</span>
                <span class="badge-sep">/</span>
                <span class="badge-total">{{ forecastData ? forecastData.length : 0 }}</span>
                <div class="badge-hint">左右滑动</div>
              </div>
            </template>
          </div>
          <!-- 未来天气预报 -->
          <div
            v-if="forecastData && forecastData.length > 0"
            class="forecast-section"
            v-reveal="{ y: 16, duration: 0.44, delay: 0.08 }"
          >
            <div v-if="isDesktopView" class="forecast-desktop-layout">
              <div class="forecast-desktop-rail">
                <button
                  v-for="item in forecastTimeline"
                  :key="item.key"
                  type="button"
                  class="forecast-rail-item"
                  :class="{ active: item.index === currentDayIndex }"
                  @click="selectForecastDay(item.index)"
                >
                  <div class="rail-day">{{ item.label }}</div>
                  <div class="rail-date">{{ item.shortDate }}</div>
                  <div class="rail-temp">{{ item.tempMax }}° / {{ item.tempMin }}°</div>
                </button>
              </div>

              <div class="forecast-desktop-panel">
                <div class="forecast-desktop-toolbar">
                  <!-- <div>
                    <div class="desktop-toolbar-label">当前预报</div>
                    <div class="desktop-toolbar-date">{{ formatDate(currentDayData?.fxDate) }}</div>
                  </div> -->
                  <!-- <div class="desktop-toolbar-actions">
                    <button
                      type="button"
                      class="desktop-nav-btn"
                      :disabled="!canGoPrev"
                      @click="goForecastPrev"
                    >
                      上一天
                    </button>
                    <button
                      type="button"
                      class="desktop-nav-btn primary"
                      :disabled="!canGoNext"
                      @click="goForecastNext"
                    >
                      下一天
                    </button>
                  </div> -->
                </div>

                <div class="forecast-desktop-content" v-if="currentDayData">
                  <div class="forecast-card forecast-card-desktop">
                    <div class="forecast-card-hero">
                      <div class="forecast-hero-main">
                        <img
                          :src="getWeatherIcon(currentDayData.iconDay)"
                          alt="day icon"
                          class="forecast-icon"
                          width="40"
                          height="40"
                        />
                        <div>
                          <div class="forecast-date desktop-date">{{ formatDate(currentDayData.fxDate) }}</div>
                          <div class="forecast-text desktop-text">{{ currentDayData.textDay }}</div>
                        </div>
                      </div>
                      <div class="forecast-temp desktop-temp">
                        {{ currentDayData.tempMax }}° / {{ currentDayData.tempMin }}°
                      </div>
                    </div>

                    <div class="forecast-details forecast-details-desktop">
                      <div class="detail-row">
                        <span>日出/日落</span>
                        <span>{{ currentDayData.sunrise }}/{{ currentDayData.sunset }}</span>
                      </div>
                      <div class="detail-row">
                        <span>月出/月落</span>
                        <span>{{ currentDayData.moonrise }}/{{ currentDayData.moonset }}</span>
                      </div>
                      <div class="detail-row">
                        <span>月相</span>
                        <span>{{ currentDayData.moonPhase }}</span>
                      </div>
                      <div class="detail-row">
                        <span>白天风向</span>
                        <span>{{ currentDayData.windDirDay }} {{ currentDayData.windScaleDay }}级</span>
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

                  <div class="forecast-desktop-sidebar">
                    <div v-if="isTodaySelected" class="minutely-section minutely-section-desktop">
                      <div class="minutely-header">
                        <h4>未来2小时降雨折线图</h4>
                        <span v-if="minutelySummary" class="minutely-summary">{{ minutelySummary }}</span>
                      </div>
                      <div v-if="minutelyLoading" class="minutely-loading">
                        分钟级天气加载中...
                      </div>
                      <div v-else-if="minutelyError" class="minutely-error">
                        {{ minutelyError }}
                      </div>
                      <div
                        v-else-if="hourlyRainData.length > 0"
                        class="hourly-rain-chart-wrap desktop-hourly-rain-chart-wrap"
                      >
                        <svg
                          :key="`hourly-rain-desktop-${rainChartAnimKey}`"
                          viewBox="0 0 320 170"
                          class="hourly-rain-chart chart-animate"
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
                              :style="{ animationDelay: `${point.idx * 55}ms` }"
                            />
                            <text
                              :x="point.x"
                              :y="point.y - 8"
                              class="hourly-rain-value"
                              :style="{ animationDelay: `${point.idx * 55 + 40}ms` }"
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

            <div
              v-else
              class="forecast-container"
              :class="{ animating: isAnimating }"
              @touchstart="handleTouchStart"
              @touchend="handleTouchEnd"
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
                        width="40"
                        height="40"
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
            <Transition name="minutely-slide">
            <div v-if="!isDesktopView && isTodaySelected" class="minutely-section" v-reveal="{ y: 14, duration: 0.38, scroll: true, start: 'top 92%' }">
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
                  :key="`hourly-rain-mobile-${rainChartAnimKey}`"
                  viewBox="0 0 320 170"
                  class="hourly-rain-chart chart-animate"
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
                      :style="{ animationDelay: `${point.idx * 55}ms` }"
                    />
                    <text
                      :x="point.x"
                      :y="point.y - 8"
                      class="hourly-rain-value"
                      :style="{ animationDelay: `${point.idx * 55 + 40}ms` }"
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
            </Transition>
          </div>
        </div>
      </div>
    </div>


  </AppShell>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import {
  getWeatherNow,
  getWeatherForecast,
  getWeatherMinutely5m,
} from "@/api/weatherApi";
import AppShell from "@/components/AppShell.vue";

// 城市名到城市代码映射
const cityCodeMap = {
  '北京': '101010100',
  'beijing': '101010100',
  '上海': '101020100',
  'shanghai': '101020100',
  '广州': '101280101',
  'guangzhou': '101280101',
  '深圳': '101280601',
  'shenzhen': '101280601',
  '杭州': '101210101',
  'hangzhou': '101210101',
  '成都': '101270101',
  'chengdu': '101270101',
  '武汉': '101200101',
  'wuhan': '101200101',
  '西安': '101110101',
  'xian': '101110101',
}

function getCityCode(location) {
  if (!location) return '101010100' // 默认北京
  // 如果是经纬度格式（包含逗号），直接返回
  if (location.includes(',')) return location
  // 如果是数字代码，直接返回
  if (/^\d+$/.test(location)) return location
  // 查映射表
  return cityCodeMap[location.toLowerCase()] || cityCodeMap[location] || '101010100'
}

const router = useRouter();
const weatherData = ref(null);
const forecastData = ref(null);
const loading = ref(true);
const errorMsg = ref("");
const currentDayIndex = ref(0);
const isDesktopView = ref(false);
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
let slideTimeout = null; // 防抖定时器
const locationName = ref('') // 当前地名
const rainChartAnimKey = ref(0);

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

const forecastTimeline = computed(() => {
  if (!forecastData.value || forecastData.value.length === 0) {
    return [];
  }
  return forecastData.value.map((item, index) => {
    const date = new Date(item.fxDate);
    return {
      ...item,
      index,
      key: `${item.fxDate}-${index}`,
      label: formatDate(item.fxDate),
      shortDate: `${date.getMonth() + 1}/${date.getDate()}`,
    };
  });
});

const canGoPrev = computed(() => currentDayIndex.value > 0);
const canGoNext = computed(() => {
  if (!forecastData.value || forecastData.value.length === 0) {
    return false;
  }
  return currentDayIndex.value < forecastData.value.length - 1;
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
      idx: index,
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

watch(hourlyRainPolylinePoints, (points) => {
  if (points) {
    rainChartAnimKey.value += 1;
  }
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
  if (event.cancelable) {
    event.preventDefault(); // 阻止默认触摸行为
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

function selectForecastDay(index) {
  if (!forecastData.value || index < 0 || index >= forecastData.value.length) {
    return;
  }
  currentDayIndex.value = index;
}

function goForecastPrev() {
  if (!canGoPrev.value) {
    return;
  }
  currentDayIndex.value -= 1;
}

function goForecastNext() {
  if (!canGoNext.value) {
    return;
  }
  currentDayIndex.value += 1;
}

function updateViewportMode() {
  if (typeof window === "undefined") {
    return;
  }
  isDesktopView.value = window.innerWidth > 768;
}

// WGS-84转GCJ-02
function wgs84ToGcj02(lng, lat) {
  const PI = Math.PI;
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }
  function transformLng(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  }
  function outOfChina(lng, lat) {
    return (lng < 72.004 || lng > 137.8347) || (lat < 0.8293 || lat > 55.8271);
  }
  if (outOfChina(lng, lat)) return [lng, lat];
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  let radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  let sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
  return [lng + dLng, lat + dLat];
}

// 逆地理编码（高德API）
async function fetchLocationName(lng, lat) {
  const key = String(import.meta.env.VITE_AMAP_API_KEY || import.meta.env.VITE_AMAP_KEY || '').trim();
  if (!key) {
    console.error('高德API密钥未配置，请检查环境变量 VITE_AMAP_API_KEY');
    locationName.value = '未知位置';
    return;
  }
  try {
    const res = await fetch(`https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${key}&radius=1000&extensions=base`);
    const data = await res.json();
    if (data.status === '1' && data.regeocode) {
      const comp = data.regeocode.addressComponent;
      locationName.value = comp.district || comp.city || comp.province || '未知位置';
    } else {
      console.error('高德逆地理编码失败', data);
      locationName.value = '未知位置';
    }
  } catch (error) {
    console.error('高德逆地理编码请求异常', error);
    locationName.value = '未知位置';
  }
}

async function fetchWeatherDetail() {
  loading.value = true;
  try {
    // 获取当前位置或使用默认城市代码
    let location = "101010100";
    if (navigator.geolocation) {
      location = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            // 转GCJ-02
            const [gcjLng, gcjLat] = wgs84ToGcj02(longitude, latitude)
            fetchLocationName(gcjLng, gcjLat)
            resolve(`${gcjLng},${gcjLat}`);
          },
          () => { locationName.value = '北京'; resolve("101010100") },
          { timeout: 5000 },
        );
      });
    } else {
      locationName.value = '北京';
    }

    // 转换为城市代码
    const cityCode = getCityCode(location);

    // 获取当前天气
    const nowRes = await getWeatherNow(cityCode);
    weatherData.value = nowRes.data;

    // 获取未来天气预报（默认7天）
    const forecastRes = await getWeatherForecast(cityCode, "7d");
    forecastData.value = forecastRes.data.daily;

    await fetchMinutely(cityCode);

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
  updateViewportMode();
  fetchWeatherDetail();
  window.addEventListener("resize", updateViewportMode);
});

// 组件卸载时清理定时器和事件监听器
onUnmounted(() => {
  if (slideTimeout) {
    clearTimeout(slideTimeout);
    slideTimeout = null;
  }
  window.removeEventListener("resize", updateViewportMode);
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
  min-height: 420px;
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
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding: 16px 18px;
  border-radius: 20px;
  background: linear-gradient(
    135deg,
    rgba(255, 248, 243, 0.99) 0%,
    rgba(255, 255, 255, 0.99) 100%
  );
  border: 1px solid rgba(224, 210, 199, 0.85);
  box-shadow: 0 2px 12px rgba(181, 100, 60, 0.07);
}

.weather-overview-desktop {
  display: grid;
  grid-template-columns: minmax(320px, 1.25fr) minmax(280px, 1fr) minmax(220px, 0.7fr);
  gap: 16px;
  align-items: stretch;
}

.overview-panel {
  min-width: 0;
  box-sizing: border-box;
}

.overview-panel-primary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-right: 12px;
}

.overview-panel-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.overview-panel-progress {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(181, 84, 59, 0.06);
}

.overview-stat-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-height: 82px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(224, 210, 199, 0.72);
  box-sizing: border-box;
}

.overview-stat-label {
  color: #ab765f;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.overview-stat-value {
  color: #2f2623;
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1;
}

.overview-progress-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.overview-progress-title {
  color: #2f2623;
  font-size: 1rem;
  font-weight: 700;
}

.overview-icon-wrap {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 236, 220, 0.55);
  border-radius: 16px;
  /* 始终占据固定空间，防止图片加载时 CLS */
  contain: layout;
}

.overview-icon {
  width: 48px;
  height: 48px;
  display: block;
}

.overview-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview-temp {
  font-size: 2rem;
  font-weight: 800;
  color: #2f2623;
  line-height: 1;
  letter-spacing: -0.5px;
}

.overview-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.overview-text {
  color: #695b54;
  font-size: 0.9rem;
  font-weight: 500;
}

.overview-location {
  font-size: 0.82rem;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.overview-extra {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.78rem;
  color: #a08070;
}

.overview-extra span:not(:last-child)::after {
  content: '·';
  margin-left: 8px;
  color: #d4c0b0;
}

.overview-badge {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 8px 10px;
  background: rgba(181, 84, 59, 0.08);
  border-radius: 14px;
  gap: 2px;
  box-sizing: border-box;
}

.badge-current {
  font-size: 1.4rem;
  font-weight: 800;
  color: #b7543b;
  line-height: 1;
}

.badge-sep {
  font-size: 0.75rem;
  color: #c8a090;
  line-height: 1;
}

.badge-total {
  font-size: 1rem;
  font-weight: 600;
  color: #c47a62;
  line-height: 1;
}

.badge-hint {
  margin-top: 4px;
  font-size: 0.65rem;
  color: #c8a090;
  white-space: nowrap;
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

.forecast-desktop-layout {
  display: grid;
  grid-template-columns: minmax(316px, 336px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.forecast-desktop-rail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  position: sticky;
  top: 0;
  min-width: 0;
}

.forecast-rail-item {
  border: 1px solid rgba(224, 210, 199, 0.92);
  background: linear-gradient(180deg, rgba(255, 252, 249, 0.98), rgba(255, 255, 255, 0.98));
  border-radius: 18px;
  min-width: 0;
  padding: 12px 12px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  box-shadow: 0 10px 22px rgba(166, 139, 117, 0.08);
  box-sizing: border-box;
  overflow: hidden;
}

.forecast-rail-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 26px rgba(166, 139, 117, 0.12);
}

.forecast-rail-item.active {
  border-color: rgba(212, 92, 69, 0.42);
  background: linear-gradient(180deg, rgba(255, 242, 236, 0.98), rgba(255, 250, 247, 0.98));
}

.rail-day {
  color: #2f2623;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.25;
}

.rail-date,
.rail-temp {
  margin-top: 4px;
  color: #8a7469;
  font-size: 0.78rem;
  line-height: 1.3;
}

.forecast-desktop-panel {
  min-width: 0;
}

.forecast-desktop-content {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.9fr);
  gap: 18px;
  align-items: start;
}

.forecast-desktop-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.desktop-toolbar-label {
  color: #c47a62;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.desktop-toolbar-date {
  margin-top: 4px;
  color: #2f2623;
  font-size: 1.35rem;
  font-weight: 800;
}

.desktop-toolbar-actions {
  display: flex;
  gap: 10px;
}

.desktop-nav-btn {
  min-width: 92px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(212, 92, 69, 0.2);
  background: rgba(255, 255, 255, 0.88);
  color: #8c5a4a;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.desktop-nav-btn.primary {
  background: linear-gradient(135deg, #e58a6a, #d56a4f);
  color: #fff;
  border-color: transparent;
}

.desktop-nav-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.forecast-card-desktop {
  max-width: none;
  /* min-height: 100%; */
}

.forecast-card-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid rgba(224, 210, 199, 0.7);
}

.forecast-hero-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.desktop-date {
  margin-bottom: 6px;
  text-align: left;
}

.desktop-text {
  font-size: 1rem;
}

.desktop-temp {
  font-size: 1.45rem;
  font-weight: 800;
  white-space: nowrap;
}

.forecast-details-desktop {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 18px;
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.forecast-desktop-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.minutely-section-desktop {
  margin-top: 0;
  min-height: 100%;
}

.desktop-hourly-rain-chart-wrap {
  height: 220px;
}

@media (max-width: 1200px) {
  .weather-overview-desktop {
    grid-template-columns: 1fr;
  }

  .overview-panel-progress {
    flex-direction: row;
    align-items: center;
  }

  .forecast-desktop-content {
    grid-template-columns: 1fr;
  }

  .forecast-desktop-layout {
    grid-template-columns: 1fr;
  }

  .forecast-desktop-rail {
    position: static;
  }
}

@media (min-width: 769px) {
  .weather-detail {
    max-width: 1240px;
  }
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
  overflow: hidden;
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
  display: block;
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

.chart-animate .hourly-rain-line {
  stroke-dasharray: 420;
  stroke-dashoffset: 420;
  animation: hourly-line-draw 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.chart-animate .hourly-rain-dot,
.chart-animate .hourly-rain-value,
.chart-animate .hourly-rain-label {
  opacity: 0;
  animation: hourly-node-fade 0.3s ease-out forwards;
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

@keyframes hourly-line-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes hourly-node-fade {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  .forecast-desktop-layout {
    display: none;
  }

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
    gap: 10px;
    padding: 12px 14px;
  }
  .overview-icon-wrap {
    width: 52px;
    height: 52px;
    border-radius: 12px;
  }
  .overview-icon {
    width: 38px;
    height: 38px;
  }
  .overview-temp {
    font-size: 1.6rem;
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

  .overview-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 10px;
  }
  .overview-icon {
    width: 32px;
    height: 32px;
  }
  .overview-temp {
    font-size: 1.35rem;
  }
  .overview-extra {
    display: none;
  }

  .overview-text,
  .minutely-summary,
  .detail-row span,
  .side-text {
    font-size: 13px;
    line-height: 1.65;
  }

  .forecast-container {
    min-height: 320px;
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
    gap: 10px;
    padding: 12px 14px;
  }
  .overview-icon-wrap {
    width: 50px;
    height: 50px;
  }
  .overview-icon {
    width: 36px;
    height: 36px;
  }
  .overview-temp {
    font-size: 1.5rem;
  }
  .overview-location {
    max-width: 110px;
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

/* 离场时脱离文档流，防止容器高度塌缩 */
.card-slide-left-leave-active,
.card-slide-right-leave-active {
  position: absolute;
  width: calc(100% - 44px);
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

/* 降雨图区块展开/收起动画 */
.minutely-slide-enter-active,
.minutely-slide-leave-active {
  transition: max-height 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              opacity 0.3s ease;
  overflow: hidden;
  max-height: 500px;
}

.minutely-slide-enter-from,
.minutely-slide-leave-to {
  max-height: 0;
  opacity: 0;
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

/* Apple-style page refinement overrides */
.shell-btn {
  background: var(--primary, #0066cc);
  color: #fff;
  border-radius: 9999px;
}

.weather-detail,
.weather-side-card,
.forecast-card,
.forecast-rail-item,
.minutely-section,
.overview-stat-card,
.detail-item,
.rain-chart-section {
  background: #fff;
  border: 1px solid var(--hairline, #e0e0e0);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.weather-overview {
  background: linear-gradient(135deg, #ffffff 0%, #f5f5f7 100%);
  border: 1px solid var(--hairline, #e0e0e0);
  box-shadow: none;
}

.side-title,
.overview-stat-label,
.desktop-toolbar-label,
.forecast-date,
.forecast-temp,
.badge-current {
  color: var(--primary, #0066cc);
}

.side-value,
.overview-stat-value,
.overview-progress-title,
.overview-temp,
.rail-day,
.desktop-toolbar-date,
.detail-row span:last-child,
.forecast-section h3 {
  color: var(--ink, #1d1d1f);
}

.side-text,
.overview-text,
.overview-extra,
.overview-location,
.badge-hint,
.rail-date,
.rail-temp,
.forecast-text,
.detail-row span:first-child,
.minutely-summary,
.minutely-loading,
.minutely-error {
  color: var(--ink-muted, #6e6e73);
}

.overview-panel-progress,
.overview-badge {
  background: #f5f5f7;
}

.forecast-rail-item.active {
  border-color: var(--primary, #0066cc);
  background: #f5f5f7;
}

.desktop-nav-btn {
  border-color: var(--hairline, #e0e0e0);
  background: #fff;
  color: var(--ink, #1d1d1f);
}

.desktop-nav-btn.primary {
  background: var(--primary, #0066cc);
  color: #fff;
}

.hourly-rain-line,
.hourly-rain-dot,
.rain-line,
.rain-dot {
  stroke: var(--primary, #0066cc);
  fill: var(--primary, #0066cc);
}

.error {
  color: #c53535;
}

/* Second-pass micro-polish */
.weather-page {
  gap: 20px;
}

.weather-detail {
  padding: 20px;
  border-radius: 20px;
}

.weather-content {
  padding: 20px;
}

.weather-overview {
  margin-bottom: 20px;
  border-radius: 18px;
}

.overview-temp {
  font-size: clamp(1.9rem, 2.6vw, 2.4rem);
}

.overview-stat-card {
  border-radius: 12px;
  min-height: 78px;
}

.forecast-desktop-layout {
  gap: 20px;
}

.forecast-desktop-rail {
  gap: 12px;
}

.forecast-rail-item {
  border-radius: 14px;
  padding: 12px 14px;
}

.forecast-card {
  border-radius: 18px;
  padding: 20px;
}

.detail-row {
  padding: 9px 0;
}

.detail-row span:first-child {
  font-size: 13px;
}

.detail-row span:last-child {
  font-size: 13px;
}

.minutely-section {
  border-radius: 14px;
  padding: 16px;
}

.hourly-rain-chart-wrap {
  height: 196px;
}

@media (max-width: 1200px) {
  .weather-detail {
    padding: 16px;
  }

  .weather-content {
    padding: 16px;
  }
}

@media (max-width: 768px) {
  .weather-page {
    gap: 14px;
  }

  .weather-detail {
    padding: 12px;
    border-radius: 16px;
  }

  .weather-content {
    padding: 14px;
  }

  .weather-overview {
    border-radius: 14px;
    margin-bottom: 14px;
  }

  .overview-stat-card {
    min-height: 66px;
    padding: 10px 12px;
  }

  .forecast-card,
  .minutely-section,
  .rain-chart-section {
    border-radius: 14px;
    padding: 14px;
  }
}

@media (max-width: 640px) {
  .shell-btn {
    width: auto;
    min-height: 40px;
    height: 40px;
    padding: 0 14px;
  }

  .hourly-rain-chart-wrap {
    height: 172px;
  }

  .detail-row {
    gap: 8px;
  }
}

/* Third-pass alignment acceptance */
.shell-btn,
.forecast-rail-item,
.desktop-nav-btn {
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.shell-btn:hover:not(:disabled),
.forecast-rail-item:hover,
.desktop-nav-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.shell-btn:focus-visible,
.forecast-rail-item:focus-visible,
.desktop-nav-btn:focus-visible {
  outline: 2px solid rgba(0, 113, 227, 0.35);
  outline-offset: 2px;
}

.shell-btn:disabled,
.desktop-nav-btn:disabled {
  opacity: 0.55;
  transform: none;
}

.weather-detail {
  width: 100%;
}

.forecast-desktop-content {
  gap: 20px;
}

.forecast-rail-item {
  min-height: 92px;
}

.rail-day {
  font-size: 14px;
}

.rail-date,
.rail-temp {
  font-size: 12px;
}

.forecast-card-hero {
  padding-bottom: 14px;
  margin-bottom: 14px;
}

.minutely-header h4 {
  font-size: 15px;
}

@media (max-width: 1024px) {
  .weather-detail {
    border-radius: 16px;
  }

  .forecast-rail-item {
    min-height: 80px;
  }

  .overview-stat-label {
    font-size: 11px;
  }

  .overview-stat-value {
    font-size: 17px;
  }
}

@media (max-width: 640px) {
  .shell-btn {
    font-size: 13px;
    min-height: 36px;
    height: 36px;
  }

  .weather-detail,
  .weather-content,
  .forecast-card,
  .minutely-section {
    border-radius: 12px;
  }

  .minutely-header h4 {
    font-size: 14px;
  }
}
</style>
