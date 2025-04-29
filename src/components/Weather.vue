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
import { getWeatherNow } from '@/api/weatherApi'

const weatherData = ref(null)
const errorMsg = ref('')

const weatherText = computed(() => weatherData.value?.now?.text || '--')
const temperature = computed(() => weatherData.value?.now?.temp || '--')
const iconUrl = computed(() => {
  const icon = weatherData.value?.now?.icon
  // 使用和风天气官方SVG图标
  return icon ? `https://icons.qweather.com/assets/icons/${icon}.svg` : ''
})

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
            // 定位失败，返回默认城市
            resolve('beijing')
          },
          { timeout: 5000 }
        )
      })
    } else {
      // 不支持定位，返回默认城市
      return 'beijing'
    }
  }

  const location = await getLocation()
  try {
    const res = await getWeatherNow(location)
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

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function onMouseDown(e) {
  e.preventDefault()
  dragging = true
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
}

// 移动端 touch 拖动
function onTouchStart(e) {
  e.preventDefault()
  dragging = true
  const widget = widgetRef.value
  const rect = widget.getBoundingClientRect()
  const touch = e.touches[0]
  offsetX = touch.clientX - rect.left
  offsetY = touch.clientY - rect.top
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd)
}

function onTouchMove(e) {
  e.preventDefault()
  if (!dragging) return
  const widget = widgetRef.value
  const w = widget.offsetWidth
  const h = widget.offsetHeight
  const winW = window.innerWidth
  const winH = window.innerHeight
  const touch = e.touches[0]
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
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255,255,255,0.85);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  z-index: 100;
  cursor: move;
  user-select: none;
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
  color: #333;
}
.weather-temp {
  font-size: 18px;
  font-weight: bold;
  color: #007aff;
}
.weather-error {
  color: #ff4d4f;
  font-size: 14px;
  margin-top: 8px;
}
</style>
