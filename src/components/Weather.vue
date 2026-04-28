<template>
  <div class="weather-widget" ref="widgetRef">
    <div class="weather-info">
      <div class="weather-main">
        <span class="weather-icon">
          <img :src="iconUrl" alt="weather icon" v-if="iconUrl" />
        </span>
        <span class="weather-text">{{ weatherText }}</span>
      </div>
      <div class="weather-temp">{{ temperature }}°C</div>
    </div>
    <div v-if="errorMsg" class="weather-error">{{ errorMsg }}</div>
  </div>
</template>

<script setup>

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getWeatherNow } from '@/api/weatherApi'

const router = useRouter()

const weatherData = ref(null)
const errorMsg = ref('')

const weatherText = computed(() => weatherData.value?.now?.text || '--')
const temperature = computed(() => weatherData.value?.now?.temp || '--')
const iconUrl = computed(() => {
  const icon = weatherData.value?.now?.icon
  // 使用和风天气官方SVG图标
  return icon ? `https://icons.qweather.com/assets/icons/${icon}.svg` : ''
})

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

function goToDetail() {
  router.push('/weather-detail')
}

onMounted(async () => {
  // 获取location参数，适配PC、安卓、iOS
  async function getLocation() {
    // 优先使用浏览器地理定位
    if (navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude, longitude } = pos.coords
            resolve(`${longitude},${latitude}`)
          },
          () => {
            // 定位失败，返回默认城市代码
            resolve('101010100')
          },
          { timeout: 5000 }
        )
      })
    } else {
      // 不支持定位，返回默认城市代码
      return '101010100'
    }
  }

  const location = await getLocation()
  const cityCode = getCityCode(location)
  try {
    const res = await getWeatherNow(cityCode)
    weatherData.value = res.data
    console.log(weatherData.value);
    errorMsg.value = ''
  } catch (e) {
    weatherData.value = null
    errorMsg.value = '天气信息获取失败，请检查API Key和接口权限。'
  }
})

const widgetRef = ref(null)
let offsetX = 0
let offsetY = 0
let dragging = false
let isDragging = false
let startX = 0
let startY = 0

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function removeTransformAndSetPixelPosition() {
  const widget = widgetRef.value
  if (!widget) return
  // 只在初始有transform时处理
  const style = window.getComputedStyle(widget)
  if (style.transform !== 'none') {
    // 获取当前left、bottom
    const rect = widget.getBoundingClientRect()
    const winW = window.innerWidth
    const left = rect.left
    const top = rect.top
    widget.style.left = left + 'px'
    widget.style.top = top + 'px'
    widget.style.right = 'auto'
    widget.style.bottom = 'auto'
    widget.style.transform = 'none'
    widget.style.position = 'absolute'
  }
}

function onMouseDown(e) {
  e.preventDefault()
  removeTransformAndSetPixelPosition()
  dragging = true
  isDragging = false
  startX = e.clientX
  startY = e.clientY
  const widget = widgetRef.value
  const rect = widget.getBoundingClientRect()
  offsetX = e.clientX - rect.left
  offsetY = e.clientY - rect.top
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e) {
  e.preventDefault()
  if (!dragging) return
  const deltaX = Math.abs(e.clientX - startX)
  const deltaY = Math.abs(e.clientY - startY)
  if (deltaX > 10 || deltaY > 10) {
    isDragging = true
  }
  const widget = widgetRef.value
  const w = widget.offsetWidth
  const h = widget.offsetHeight
  const winW = window.innerWidth
  const winH = window.innerHeight
  let left = clamp(e.clientX - offsetX, 0, winW - w)
  let top = clamp(e.clientY - offsetY, 0, winH - h)
  widget.style.left = left + 'px'
  widget.style.top = top + 'px'
  widget.style.right = 'auto'
  widget.style.position = 'absolute'
}

function onMouseUp() {
  dragging = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  if (!isDragging) {
    goToDetail()
  }
}

// 移动端 touch 拖动
function onTouchStart(e) {
  e.preventDefault()
  removeTransformAndSetPixelPosition()
  dragging = true
  isDragging = false
  const touch = e.touches[0]
  startX = touch.clientX
  startY = touch.clientY
  const widget = widgetRef.value
  const rect = widget.getBoundingClientRect()
  offsetX = touch.clientX - rect.left
  offsetY = touch.clientY - rect.top
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd)
}

function onTouchMove(e) {
  e.preventDefault()
  if (!dragging) return
  const touch = e.touches[0]
  const deltaX = Math.abs(touch.clientX - startX)
  const deltaY = Math.abs(touch.clientY - startY)
  if (deltaX > 10 || deltaY > 10) {
    isDragging = true
  }
  const widget = widgetRef.value
  const w = widget.offsetWidth
  const h = widget.offsetHeight
  const winW = window.innerWidth
  const winH = window.innerHeight
  let left = clamp(touch.clientX - offsetX, 0, winW - w)
  let top = clamp(touch.clientY - offsetY, 0, winH - h)
  widget.style.left = left + 'px'
  widget.style.top = top + 'px'
  widget.style.right = 'auto'
  widget.style.position = 'absolute'
}

function onTouchEnd() {
  dragging = false
  document.removeEventListener('touchmove', onTouchMove, { passive: false })
  document.removeEventListener('touchend', onTouchEnd)
  if (!isDragging) {
    goToDetail()
  }
}

onMounted(() => {
  if (widgetRef.value) {
    widgetRef.value.addEventListener('mousedown', onMouseDown)
    widgetRef.value.addEventListener('touchstart', onTouchStart, { passive: false })
  }
})
onBeforeUnmount(() => {
  if (widgetRef.value) {
    widgetRef.value.removeEventListener('mousedown', onMouseDown)
    widgetRef.value.removeEventListener('touchstart', onTouchStart)
  }
})
</script>

<style scoped>
.weather-widget {
  /* 初始位置优化：右上角，适配不同屏幕 */
  position: fixed;
  top: 32px;
  right: 32px;
  left: auto;
  bottom: auto;
  transform: none;
  background: rgba(255,255,255,0.85);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  z-index: 100;
  cursor: move;
  user-select: none;
  color: var(--main-text, #333);
}
@media (max-width: 600px) {
  .weather-widget {
    top: 12px;
    right: 8px;
    padding: 6px 8px;
  }
}
.weather-info {
  display: flex;
  align-items: center;
}
.weather-main {
  display: flex;
  align-items: center;
  margin-right: 12px;
}
.weather-icon img {
  width: 32px;
  height: 32px;
  margin-right: 6px;
}
.weather-text {
  font-size: 16px;
  color: var(--main-text, #333);
}
.weather-temp {
  font-size: 18px;
  font-weight: bold;
  color: var(--button, #007aff);
}
.weather-error {
  color: #ff4d4f;
  font-size: 14px;
  margin-top: 8px;
}
</style>
