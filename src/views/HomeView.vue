<template>
  <div class="home-container">
    <Weather />
    <Clock />
    
    <header>
      <!-- <h1 class="title"><router-link to="/">初级项目合集</router-link></h1> -->
    </header>
    <div class="theme-switcher">
      <span>主题切换：</span>
      <el-select v-model="currentThemeKey" @change="onThemeSelect" class="theme-select" style="width: 160px">
        <el-option
          v-for="theme in themes"
          :key="theme.key"
          :label="theme.name"
          :value="theme.key"
        />
      </el-select>
    </div>
    <main>
      <div class="feature-list">
        <div
          v-for="item in features"
          :key="item.path"
          class="feature-item"
          @click="goTo(item.path)"
        >
          <span class="feature-title">{{ item.title }}</span>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Weather from '@/components/Weather.vue'
import Clock from '@/components/Clock.vue'
import { themes, applyTheme } from '@/utils/theme'
import { ElSelect, ElOption } from 'element-plus'

const THEME_KEY = 'vue-calendar-theme-key'
const currentThemeKey = ref(themes[0].key)

const switchTheme = (key) => {
  const theme = themes.find(t => t.key === key)
  if (theme) {
    applyTheme(theme)
    currentThemeKey.value = key
    localStorage.setItem(THEME_KEY, key)
  }
}

onMounted(() => {
  const saved = localStorage.getItem(THEME_KEY)
  const theme = themes.find(t => t.key === saved)
  if (theme) {
    applyTheme(theme)
    currentThemeKey.value = theme.key
  } else {
    applyTheme(themes[0])
    currentThemeKey.value = themes[0].key
  }
})

const features = ref([
  { path: '/bintodec', title: '二转十进制' },
  { path: '/border', title: '可变边框' },
  { path: '/calculator', title: '计算器' },
  { path: '/booksFinder', title: '图书查询' },
  { path: '/echartsDemo', title: '数据可视化' },
  { path: '/snakeGame', title: '贪吃蛇' },
  { path: '/tetris', title: '俄罗斯方块' },
  { path: '/colorHarmony', title: '色块' },
  { path: '/calendar', title: '日历' },
  { path: '/fireworks', title: '🎆 烟花演示' },
  // { path: '/chat', title: '💬 聊天室(Socket.IO)' },
  { path: '/goeasy-chat', title: 'lbw广场💬' },
])

const router = useRouter()
const route = useRoute()

function goTo(url) {
  if (route.path !== url) {
    router.push(url)
  }
}

const onThemeSelect = (val) => {
  switchTheme(val)
}
</script>

<style scoped>
html {
  transition: background 1.5s, color 1.5s;
}
:root {
  transition: background 1.5s, color 1.5s;
}
.home-container {
  min-height: 98vh;
  background: var(--bg-main, #f7f8fa);
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  transition: background 0.8s, color 0.8s;
}

.title {
  text-align: center;
  margin: 30px 0 10px 0;
  font-size: 2.2rem;
  font-weight: bold;
  color: var(--main-text, #222);
}

.theme-switcher {
  text-align: center;
  margin: 20px 0;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); /* 最小宽度调小，自动换行 */
  gap: 20px;
  height: auto;
  padding: 0 10px 30px 10px;
  align-items: stretch;
  margin: 0 0 20px 0;
  word-break: break-word;
}

.feature-item {
  background: var(--bg-cell, #fff);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  padding: 32px 18px; /* 左右内边距减小 */
  font-size: 1.18rem;
  font-weight: 500;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s, background 0.8s, color 0.8s;
  min-width: 120px; /* 最小宽度减小，便于自适应 */
  text-align: center;
  user-select: none;
  color: var(--main-text, #222);
}

.feature-item:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.13);
  transform: translateY(-2px) scale(1.03);
  color: var(--button, #409eff);
}

.feature-title {
  letter-spacing: 1px;
}

/* 添加主题下拉列表 hover 字体为主题色 */
.theme-select .el-select-dropdown__item:hover,
.theme-select .el-select-dropdown__item.selected {
  color: var(--button, #409eff) !important;
}

/* 兼容 element-plus 2.x/1.x 可能的类名变化 */
.theme-select .el-select-dropdown__item.is-hovering {
  color: var(--button, #409eff) !important;
}

@media (max-width: 600px) {
  .title {
    font-size: 1.3rem;
    margin: 18px 0 8px 0;
  }
  .theme-switcher {
    font-size: 0.9rem;
  }
  .feature-list {
    grid-template-columns: 1fr;
    gap: 14px;
    margin: 18px 0 10px 0;
    align-items: center;
    padding: 0 4vw 0 4vw; /* 移动端左右适配屏幕 */
  }
  .feature-item {
    min-width: 80vw;
    padding: 18px 0;
    font-size: 1rem;
  }
}
</style>