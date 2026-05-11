<template>
  <div id="app">
    <router-view v-slot="{ Component }">
      <Suspense>
        <component :is="Component" />
        <template #fallback>
          <PageSkeleton :count="8" />
        </template>
      </Suspense>
    </router-view>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import PageSkeleton from '@/components/common/PageSkeleton.vue';
import { themes, applyTheme } from './utils/theme';
import { useAppStore } from '@/stores/app';

const appStore = useAppStore();

onMounted(() => {
  // 每次进入应用时随机应用一个主题
  const randomIndex = Math.floor(Math.random() * themes.length);
  const selectedTheme = themes[randomIndex];
  applyTheme(selectedTheme);
  appStore.setThemeKey(selectedTheme?.key || '');
});
</script>

<style lang="scss">
:root {
  --remark-text: #1976d2;
  --remark-empty: #bbb;
  --lunar-text: #888;
  --dialog-text: #222;
  --dialog-empty: #aaa;
  --main-text: #66462a;
  --bg-main: #f8f4ed;
  --header: #f9d770;
  --button: #ffe156;
  --button-text: #66462a;
  --button-hover: #f9d770;
  --button-active: #e9546b;
  --today-border: #e9546b;
  --today: #fff2e2;
  --marked: #ffe156;
  --marked-text: #b36d41;
  --holiday: #f8d0d6;
  --holiday-text: #e9546b;
  --holiday-border: #e9546b;
  --workday: #e9f1f6;
  --workday-text: #177cb0;
  --workday-border: #177cb0;
  --bg-cell: #f6e0b3;
  --enlarged: #fff2e2;
  --enlarged-border: #e9546b;
  --input-bg: #f8f4ed;
  --input-border: #f9d770;
  --input-focus: #e9546b;
  --remarked: #b2e5d6;
  --remarked-text: #1976d2;
  /* theme-friendly shadow variables */
  /* shadow variables store color only (used as: box-shadow: <offsets> var(--shadow)) */
  --shadow: rgba(23,124,176,0.07);
  --hover-shadow: rgba(23,124,176,0.10);
  --card-bg: var(--bg-cell, #fff);
  --app-bg-gradient: linear-gradient(180deg, var(--bg-main, #f8f4ed) 0%, var(--bg-cell, #f6e0b3) 100%);
  --app-surface: linear-gradient(180deg, var(--bg-main, #f8f4ed) 0%, var(--bg-cell, #f6e0b3) 100%);
  --app-surface-soft: linear-gradient(180deg, var(--bg-main, #f8f4ed) 0%, var(--today, #fff2e2) 100%);
  --app-border: var(--input-border, rgba(210, 190, 178, 0.95));
  --app-accent: var(--button-active, #e9546b);
  --app-accent-soft: var(--button-hover, #f9d770);
  --app-text-main: var(--main-text, #66462a);
  --app-text-sub: var(--marked-text, #8a8a8a);
  /* smooth transition for themeable properties */
  transition: background-color 0.4s ease, color 0.4s ease, box-shadow 0.4s ease;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: var(--main-text, #2c3e50);
  min-height: 100vh;
  /* 防止移动端缩放 */
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  /* 确保移动端可以滚动 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 防止布局偏移 */
  width: 100%;
  max-width: 100vw;
  margin: 0 auto;
  box-sizing: border-box;
  background: var(--app-bg-gradient);
}

/* 全局主题兜底，避免页面局部背景失效 */
#app .panel-card,
#app .game-container,
#app .profile-card,
#app .auth-form,
#app .feed-card,
#app .notify-item,
#app .feature-card,
#app .tool-card,
#app .game-card {
  background: var(--app-surface);
  border-color: var(--app-border);
  padding: 10px;
}

#app .section-title,
#app .hero-tag,
#app .notify-type,
#app .inline-link,
#app .edit-link {
  color: var(--app-accent) !important;
}

#app .time-text,
#app .meta-item,
#app .empty-tip,
#app .empty-feed,
#app .notify-time,
#app .notify-content,
#app .avatar-meta,
#app .switch-row {
  color: var(--app-text-sub) !important;
}

#app .primary-btn,
#app .submit-btn,
#app .shell-btn,
#app .el-button--primary {
  background: linear-gradient(135deg, var(--button, #ffe156), var(--app-accent)) !important;
  color: var(--button-text, #fff) !important;
}

#app .ghost-btn,
#app .avatar-clear-btn,
#app .notify-btn,
#app .profile-chip,
#app .tab-btn,
#app .category-chip,
#app .notify-tab {
  background: var(--app-surface-soft) !important;
  border-color: var(--app-border) !important;
}

/* 防止移动端输入框聚焦时自动缩放 */
input, textarea, select {
  font-size: 16px !important;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

/* Element Plus 输入框防缩放 */
.el-input__inner,
.el-textarea__inner,
.el-select__input {
  font-size: 16px !important;
}

/* 防止页面被选中，但允许滚动 */
* {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  /* 确保不阻止滚动 */
  touch-action: auto;
}

/* 防止双击缩放，但允许滚动 */
button, a, .clickable {
  touch-action: manipulation;
}

/* 允许输入框和文本区域被选中 */
input, textarea, .el-input__inner, .el-textarea__inner {
  -webkit-user-select: auto;
  -khtml-user-select: auto;
  -moz-user-select: auto;
  -ms-user-select: auto;
  user-select: auto;
}

/* 确保页面可以滚动 */
html, body {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 确保触摸滚动正常 */
  touch-action: auto;
  /* 防止移动端布局偏移 */
  width: 100%;
  max-width: 100vw;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
@media (max-width: 600px) {
  #app {
    font-size: 15px;
  }
  nav {
    padding: 12px;
  }
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
</style>
