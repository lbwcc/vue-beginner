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
  { path: '/bintodec', title: '进制转换' },
  { path: '/border', title: '可变边框' },
  { path: '/calculator', title: '计算器🧮' },
  { path: '/booksFinder', title: '图书查询📚' },
  { path: '/echartsDemo', title: '数据可视化📊' },
  { path: '/snakeGame', title: '贪吃蛇🐍' },
  { path: '/tetris', title: '俄罗斯方块🟥' },
  { path: '/colorHarmony', title: '色块' },
  { path: '/calendar', title: '日历🗓️' },
  { path: '/fireworks', title: '烟花演示🎆' },
  // { path: '/chat', title: '💬 聊天室(Socket.IO)' },
  { path: '/goeasy-chat', title: 'lbw广场💬' },
  { path: '/lottery', title: '抽奖抽奖🎉' },
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
  transition: background-color 0.6s ease, color 0.6s ease;
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


/* 瀑布流布局：使用 CSS columns 实现简单 masonry（无 JS） */
.feature-list {
  column-count: 2; /* 固定两列 */
  column-gap: 20px; /* 列间距 */
  padding: 0 12px 30px 12px;
  margin: 0 0 20px 0;
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

@media (max-width: 600px) {
  .title {
    font-size: 1.3rem;
    margin: 18px 0 8px 0;
  }
  .theme-switcher {
    font-size: 0.9rem;
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