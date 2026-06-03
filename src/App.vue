<template>
  <div id="app">
    <router-view v-slot="{ Component, route }">
      <Suspense>
        <Transition name="route-fade" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
        <template #fallback>
          <PageSkeleton :count="8" />
        </template>
      </Suspense>
    </router-view>
    <!-- 全局 Live2D 宠物，固定显示在页面右下角 -->
    <Live2DPet />
  </div>
</template>

<script setup>
import PageSkeleton from '@/components/common/PageSkeleton.vue'
import Live2DPet from '@/components/Live2DPet.vue'
</script>

<style lang="scss">
:root {
  --primary: #0066cc;
  --primary-focus: #0071e3;
  --primary-on-dark: #2997ff;
  --ink: #1d1d1f;
  --ink-muted: #6e6e73;
  --ink-soft: #86868b;
  --canvas: #ffffff;
  --canvas-parchment: #f5f5f7;
  --surface-tile: #272729;
  --surface-black: #000000;
  --hairline: #e0e0e0;
  --divider-soft: #f0f0f0;
  --card-shadow: rgba(0, 0, 0, 0.08);
  --product-shadow: rgba(0, 0, 0, 0.22);

  --button: var(--primary);
  --button-hover: var(--primary-focus);
  --button-active: var(--primary);
  --button-text: #ffffff;
  --main-text: var(--ink);
  --marked-text: var(--ink-muted);
  --remark-empty: var(--ink-soft);
  --bg-main: var(--canvas);
  --bg-cell: var(--canvas-parchment);
  --today: var(--canvas-parchment);
  --today-border: var(--hairline);
  --input-bg: var(--canvas);
  --input-border: var(--hairline);
  --input-focus: var(--primary-focus);
  --shadow: rgba(0, 0, 0, 0.08);
  --hover-shadow: rgba(0, 102, 204, 0.2);

  --el-color-primary: var(--primary);
  --el-color-primary-light-3: var(--primary-focus);
  --el-color-primary-dark-2: #0058b0;
  --el-text-color-primary: var(--ink);
  --el-bg-color: var(--canvas);
  --el-border-color: var(--hairline);
  --el-input-bg-color: var(--canvas);
}

#app {
  font-family: 'SF Pro Text', 'SF Pro Display', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--ink);
  min-height: 100vh;
  -webkit-text-size-adjust: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  max-width: 100vw;
  margin: 0 auto;
  box-sizing: border-box;
  background: var(--canvas-parchment);
}

.route-fade-enter-active,
.route-fade-leave-active {
  transition: opacity 0.26s ease, transform 0.26s ease, filter 0.26s ease;
}

.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
  filter: blur(4px);
}

@media (prefers-reduced-motion: reduce) {
  .route-fade-enter-active,
  .route-fade-leave-active {
    transition: none;
  }
}

#app .panel-card,
#app .game-container,
#app .profile-card,
#app .auth-form,
#app .feed-card,
#app .notify-item,
#app .feature-card,
#app .tool-card,
#app .game-card {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: 18px;
  box-shadow: 0 8px 26px var(--card-shadow);
}

#app .section-title,
#app .hero-tag,
#app .notify-type,
#app .inline-link,
#app .edit-link {
  color: var(--primary) !important;
}

#app .time-text,
#app .meta-item,
#app .empty-tip,
#app .empty-feed,
#app .notify-time,
#app .notify-content,
#app .avatar-meta,
#app .switch-row {
  color: var(--ink-muted) !important;
}

#app .primary-btn,
#app .submit-btn,
#app .shell-btn,
#app .el-button--primary {
  background: var(--primary) !important;
  color: #fff !important;
  // border-radius: 9999px !important;
  border: 1px solid transparent !important;
}

#app .ghost-btn,
#app .avatar-clear-btn,
#app .notify-btn,
#app .profile-chip,
#app .tab-btn,
#app .category-chip,
#app .notify-tab {
  background: var(--canvas) !important;
  border: 1px solid var(--hairline) !important;
  color: var(--ink) !important;
}

input,
textarea,
select {
  font-size: 16px !important;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.el-input__inner,
.el-textarea__inner,
.el-select__input {
  font-size: 16px !important;
}

* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

a {
  color: var(--primary);
  text-decoration: none;
}

a:hover {
  color: var(--primary-focus);
}

.el-input__wrapper,
.el-select__wrapper,
.el-textarea__inner {
  // border-radius: 9999px !important;
  border: 1px solid var(--hairline) !important;
  box-shadow: none !important;
}

.el-input__wrapper.is-focus,
.el-select__wrapper.is-focused,
.el-textarea__inner:focus {
  box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.22) !important;
  border-color: var(--primary-focus) !important;
}

@media (max-width: 768px) {
  #app .panel-card,
  #app .game-container,
  #app .profile-card,
  #app .auth-form,
  #app .feed-card,
  #app .notify-item,
  #app .feature-card,
  #app .tool-card,
  #app .game-card {
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

@media (max-width: 600px) {
  #app {
    font-size: 15px;
  }
}
</style>
