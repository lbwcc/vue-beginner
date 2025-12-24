<template>
  <div class="home-container">
    <Weather />
    <Clock />
    
    <!-- 主题切换器 - 左上角嵌入 -->
    <div class="theme-switcher">
      <div class="theme-indicator">
        <span class="theme-color" :style="{ backgroundColor: currentTheme.colors['--button'] }"></span>
        <div class="theme-dropdown">
          <button class="theme-name-btn" @click="toggleDropdown" :class="{ active: showDropdown }">
            {{ currentTheme.name }}
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" v-show="showDropdown">
            <div
              v-for="theme in themes"
              :key="theme.key"
              class="dropdown-item"
              :class="{ active: theme.key === currentThemeKey }"
              @click="selectTheme(theme.key)"
            >
              <span class="item-color" :style="{ backgroundColor: theme.colors['--button'] }"></span>
              <span class="item-name">{{ theme.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <header>
      <!-- <h1 class="title"><router-link to="/">初级项目合集</router-link></h1> -->
    </header>
    <main>
      <div class="feature-list masonry">
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
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Weather from '@/components/Weather.vue'
import Clock from '@/components/Clock.vue'
import { themes, applyTheme } from '@/utils/theme'

const THEME_KEY = 'vue-calendar-theme-key'
const currentThemeKey = ref(themes[0].key)

// 下拉菜单状态
const showDropdown = ref(false)

// 当前主题计算属性
const currentTheme = computed(() => {
  return themes.find(t => t.key === currentThemeKey.value) || themes[0]
})

const switchTheme = (key) => {
  const theme = themes.find(t => t.key === key)
  if (theme) {
    applyTheme(theme)
    currentThemeKey.value = key
    localStorage.setItem(THEME_KEY, key)
  }
}

// 切换下拉菜单
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

// 选择主题（下拉菜单用）
const selectTheme = (key) => {
  switchTheme(key)
  showDropdown.value = false
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

  // 点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.theme-dropdown')
    if (dropdown && !dropdown.contains(e.target)) {
      showDropdown.value = false
    }
  })
})

const features = ref([
  { path: '/bintodec', title: '进制转换' },
  { path: '/border', title: '可变边框' },
  { path: '/calculator', title: '计算器🧮' },
  { path: '/booksFinder', title: '图书查询📚' },
  { path: '/echartsDemo', title: '数据可视化📊' },
  { path: '/snakeGame', title: '贪吃蛇🐍' },
  { path: '/tetris', title: '俄罗斯方块🟥' },
  { path: '/game2048', title: '2048游戏🎯' },
  { path: '/colorHarmony', title: '色块' },
  { path: '/calendar', title: '日历🗓️' },
  { path: '/fireworks', title: '烟花演示🎆' },
  // { path: '/chat', title: '💬 聊天室(Socket.IO)' },
  { path: '/goeasy-chat', title: 'lbw广场💬' },
  { path: '/lottery', title: '抽奖抽奖🎉' },
  { path: '/gomoku', title: '五子棋♟️' },
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
  justify-content: center; /* 垂直居中 */
  /* overflow: hidden; */ /* 移除以避免截断内容 */
  -webkit-overflow-scrolling: touch;
  transition: background-color 0.6s ease, color 0.6s ease;
  max-width: 1400px; /* 限制最大宽度 */
  margin: 0 auto; /* 居中对齐 */
}

.title {
  text-align: center;
  margin: 30px 0 10px 0;
  font-size: 2.2rem;
  font-weight: bold;
  color: var(--main-text, #222);
}

/* 主题切换器 - 左上角嵌入样式 */
.theme-switcher {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 10;
  transition: all 0.3s ease;
}

.theme-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--main-text, #333);
}

.theme-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.theme-color:hover {
  transform: scale(1.2);
}

.theme-name {
  white-space: nowrap;
}

.theme-dropdown {
  position: relative;
}

.theme-name-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--main-text, #333);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.theme-name-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.theme-name-btn.active {
  background: rgba(0, 0, 0, 0.1);
}

.dropdown-arrow {
  font-size: 10px;
  transition: transform 0.3s ease;
}

.theme-name-btn.active .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-width: 140px;
  z-index: 1000;
  margin-top: 4px;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.dropdown-item.active {
  background: var(--button, #409eff);
  color: white;
}

.dropdown-item.active:hover {
  background: var(--button-hover, #337ecc);
}

.item-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
}

.theme-select :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  box-shadow: none;
  transition: all 0.3s ease;
}

.theme-select :deep(.el-input__wrapper:hover) {
  border-color: var(--button, #409eff);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.theme-select :deep(.el-input__wrapper.is-focus) {
  border-color: var(--button, #409eff);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}


/* 瀑布流布局：使用 CSS columns 实现简单 masonry（无 JS） */
.feature-list {
  column-count: 2; /* 默认两列 */
  column-gap: 20px; /* 列间距 */
  padding: 20px 12px 30px 12px; /* 增加顶部padding */
  margin: 0 auto; /* 居中对齐 */
  max-width: 1200px; /* 限制最大宽度 */
  /* 避免子元素被 column 打断时出现问题 */
  -webkit-column-break-inside: avoid;
  -moz-column-break-inside: avoid;
  break-inside: avoid;
}

.feature-item {
  display: inline-block; /* 关键：在 column 中以 inline-block 流动 */
  width: 50%;
  background: var(--bg-cell, #fff);
  border-radius: 12px;
  /* use theme shadow variables so shadow color follows theme */
  box-shadow: 0 2px 8px var(--shadow, rgba(0,0,0,0.07));
  padding: 18px 12px; /* 减小内边距以便在窄列中显示更好 */
  margin: 0 0 18px; /* 底部间距，控制瀑布流的垂直间隔 */
  font-size: 1.02rem;
  font-weight: 500;
  cursor: pointer;
  transition: box-shadow 0.36s ease, transform 0.18s ease, background-color 0.36s ease, color 0.36s ease;
  text-align: center;
  user-select: none;
  color: var(--main-text, #222);
  -webkit-column-break-inside: avoid;
  -moz-column-break-inside: avoid;
  break-inside: avoid;
}

.feature-item:hover {
  box-shadow: 0 4px 16px var(--hover-shadow, rgba(0,0,0,0.13));
  transform: translateY(-2px) scale(1.02);
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

/* PC端响应式优化 */
@media (min-width: 768px) {
  .feature-list {
    column-count: 3; /* 平板及以上三列 */
    padding: 0 20px 30px 20px; /* 增加左右padding */
  }
}

@media (min-width: 1024px) {
  .feature-list {
    column-count: 4; /* 大屏幕四列 */
    padding: 0 30px 30px 30px; /* 进一步增加左右padding */
  }
}

@media (max-width: 600px) {
  .home-container {
    justify-content: flex-start; /* 移动端不垂直居中 */
  }
  
  .title {
    font-size: 1.3rem;
    margin: 18px 0 8px 0;
  }
  
  .theme-switcher {
    position: relative;
    top: auto;
    left: auto;
    margin: 10px;
    padding: 6px 12px;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .theme-indicator {
    font-size: 13px;
  }
  
  .theme-color {
    width: 10px;
    height: 10px;
  }
  
  .theme-name-btn {
    font-size: 13px;
    padding: 3px 6px;
  }
  
  .dropdown-menu {
    min-width: 120px;
  }
  
  .dropdown-item {
    padding: 8px 10px;
  }
  
  .item-name {
    font-size: 13px;
  }
  
  .feature-list {
    column-count: 2; /* 移动端单列 */
    column-gap: 14px;
    margin: 18px 0 10px 0;
    padding: 0 4vw 0 4vw; /* 移动端左右适配屏幕 */
  }
  .feature-item {
    display: block;
    width: 100%;
    margin-bottom: 14px;
    padding: 18px 0;
    font-size: 1rem;
  }
}
</style>