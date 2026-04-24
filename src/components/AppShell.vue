<template>
  <div class="app-shell">
    <aside class="shell-sidebar">
      <div class="brand-block" @click="goHome">
        <div class="brand-mark">LB</div>
        <div>
          <div class="brand-name">LBBBB</div>
          <!-- <div class="brand-sub">温润的社区工作台</div> -->
        </div>
      </div>

      <div class="nav-group">
        <button
          v-for="item in primaryNav"
          :key="item.path"
          class="nav-item"
          :class="{ active: isActive(item) }"
          type="button"
          @click="goPath(item.path)"
        >
          <component :is="item.icon" class="nav-icon" />
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div class="nav-group compact">
        <button
          v-for="item in secondaryNav"
          :key="item.path"
          class="nav-item subtle"
          :class="{ active: isActive(item) }"
          type="button"
          @click="goPath(item.path)"
        >
          <component :is="item.icon" class="nav-icon" />
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div class="sidebar-footer">
        <slot name="sidebar-footer">
          <!-- <div class="status-card">
            <div class="status-title">今日节奏</div>
            <div class="status-text">把社区、日历和小工具放在同一套界面里。</div>
          </div> -->
        </slot>
      </div>
    </aside>

    <div class="shell-panel">
      <header class="shell-header">
        <div>
          <!-- <p v-if="eyebrow" class="header-eyebrow">{{ eyebrow }}</p>
          <h1 class="header-title">{{ title }}</h1>
          <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p> -->
        </div>

        <div class="header-extra">
          <slot name="header-actions" />
        </div>
      </header>

      <div class="shell-content" :class="{ 'has-aside': hasAside }">
        <main class="shell-main">
          <slot />
        </main>
        <aside v-if="hasAside" class="shell-aside">
          <slot name="aside" />
        </aside>
      </div>
    </div>

    <nav class="mobile-bottom-nav">
      <button
        v-for="item in bottomNav"
        :key="item.path"
        class="mobile-nav-item"
        :class="{ active: isActive(item), 'mobile-nav-compose': item.isCompose }"
        type="button"
        @click="goPath(item.path)"
      >
        <component :is="item.icon" class="mobile-nav-icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Compass,
  HomeFilled,
  MostlyCloudy,
  Plus,
  Setting,
  Trophy,
  User,
} from '@element-plus/icons-vue'
import { isFrontendAdmin } from '@/utils/auth'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  eyebrow: {
    type: String,
    default: '',
  },
  activeSection: {
    type: String,
    default: '',
  },
})

const slots = useSlots()
const route = useRoute()
const router = useRouter()

const primaryNav = [
  { key: 'forum', label: '社区广场', path: '/forum-square', icon: HomeFilled },
  { key: 'game', label: '游戏', path: '/games', icon: Trophy },
  { key: 'weather', label: '天气', path: '/weather-detail', icon: MostlyCloudy },
]

const secondaryNav = computed(() => {
  const items = [
    { key: 'tools', label: '小工具', path: '/tools', icon: Compass },
    { key: 'profile', label: '个人中心', path: '/profile', icon: User },
  ]
  if (isFrontendAdmin()) {
    items.push({ key: 'admin', label: '用户管理', path: '/user-admin', icon: Setting })
  }
  return items
})

const bottomNav = computed(() => {
  const items = [
    { key: 'forum', label: '广场', path: '/forum-square', icon: HomeFilled },
    { key: 'game', label: '游戏', path: '/games', icon: Trophy },
    { key: 'compose', label: '发布', path: '/forum-square/compose', icon: Plus, isCompose: true },
    { key: 'tools', label: '工具', path: '/tools', icon: Compass },
    { key: 'profile', label: '我的', path: '/profile', icon: User },
  ]
  // if (isFrontendAdmin()) {
  //   items.push({ key: 'admin', label: '管理', path: '/user-admin', icon: Setting })
  // } 
  return items
})

const hasAside = computed(() => Boolean(slots.aside))

const isActive = (item) => {
  if (props.activeSection && item.key === props.activeSection) {
    return true
  }
  return route.path === item.path || route.path.startsWith(`${item.path}/`)
}

const goPath = (path) => {
  if (!path || route.path === path) {
    return
  }
  router.push(path)
}

const goHome = () => {
  goPath('/forum-square')
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 20px;
  padding: 16px;
  background:
    radial-gradient(circle at top left, var(--today, rgba(255, 208, 198, 0.72)), transparent 34%),
    radial-gradient(circle at bottom right, var(--marked, rgba(185, 217, 243, 0.7)), transparent 26%),
    linear-gradient(180deg, var(--bg-main, #fff8f3) 0%, var(--today, #f7f6f2) 52%, var(--bg-cell, #f4f8fb) 100%);
  box-sizing: border-box;
}

.shell-sidebar,
.shell-panel,
.status-card,
.shell-aside :deep(.panel-card) {
  box-shadow: 0 24px 70px rgba(166, 139, 117, 0.12);
}

.shell-sidebar,
.shell-panel {
  background: linear-gradient(180deg, var(--bg-main, #fffcf8), var(--today, #fff7f2));
  border: 1px solid var(--input-border, rgba(219, 205, 191, 0.7));
  backdrop-filter: blur(18px);
}

.shell-sidebar {
  border-radius: 28px;
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
}

.brand-mark {
  width: 50px;
  height: 50px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--button, #ef8d6c), var(--button-active, #d45c45));
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  box-shadow: 0 14px 28px rgba(212, 92, 69, 0.28);
}

.brand-name {
  color: var(--main-text, #3b2f2b);
  font-size: 22px;
  font-weight: 800;
}

.brand-sub {
  margin-top: 4px;
  color: #8f7d74;
  font-size: 13px;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-group.compact {
  margin-top: 8px;
  padding-top: 18px;
  border-top: 1px solid rgba(222, 212, 202, 0.8);
}

.nav-item {
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 16px;
  color: var(--main-text, #665650);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.nav-item:hover,
.nav-item.active {
  background: linear-gradient(135deg, var(--today, rgba(255, 232, 221, 0.92)), var(--bg-main, rgba(255, 249, 243, 0.95)));
  color: var(--button-active, #cb5e42);
  transform: translateX(2px);
}

.nav-item.subtle {
  color: #82716a;
}

.nav-icon {
  width: 18px;
  height: 18px;
}

.sidebar-footer {
  margin-top: auto;
}

.status-card {
  padding: 16px;
  border-radius: 22px;
  background: linear-gradient(160deg, #fff1e8, #f8fbff);
  border: 1px solid rgba(223, 205, 193, 0.7);
}

.status-title {
  color: #7f5a49;
  font-weight: 700;
}

.status-text {
  margin-top: 8px;
  color: #8f7d74;
  font-size: 13px;
  line-height: 1.6;
}

.shell-panel {
  border-radius: 32px;
  padding: 22px;
  min-width: 0;
}

.shell-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.header-eyebrow {
  margin: 0 0 6px;
  color: #c96b4f;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.header-title {
  margin: 0;
  color: #342b28;
  font-size: clamp(27px, 3vw, 36px);
  line-height: 1.05;
}

.header-subtitle {
  margin: 8px 0 0;
  max-width: 560px;
  color: #8b7b73;
  font-size: 15px;
  line-height: 1.7;
}

.header-extra {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.shell-content {
  display: block;
}

.shell-content.has-aside {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.shell-main,
.shell-aside {
  min-width: 0;
}

.shell-aside {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.mobile-bottom-nav {
  display: none;
}

@media (max-width: 1100px) {
  .app-shell {
    grid-template-columns: 1fr;
    padding: 12px 12px 84px;
  }

  .shell-sidebar {
    display: none;
  }

  .shell-panel {
    border-radius: 22px;
    padding: 16px;
  }

  .shell-content.has-aside {
    grid-template-columns: 1fr;
  }

  .mobile-bottom-nav {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 10px;
    z-index: 40;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    padding: 9px;
    border-radius: 20px;
    background: rgba(255, 252, 248, 0.95);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(219, 205, 191, 0.7);
    box-shadow: 0 24px 60px rgba(166, 139, 117, 0.2);
  }

  .mobile-nav-item {
    border: 0;
    background: transparent;
    border-radius: 16px;
    min-height: 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: #8a7c74;
    font-size: 11px;
    font-weight: 700;
  }

  .mobile-nav-item.active {
    background: linear-gradient(135deg, var(--today, #ffe6db), var(--bg-main, #fff7f2));
    color: var(--button-active, #c95d42);
  }

  .mobile-nav-item.mobile-nav-compose {
    margin-top: -24px;
    min-height: 62px;
    border-radius: 18px;
    background: linear-gradient(135deg, var(--button, #ef8d6c), var(--button-active, #d45c45));
    color: #fff;
    box-shadow: 0 14px 28px rgba(212, 92, 69, 0.32);
  }

  .mobile-nav-item.mobile-nav-compose .mobile-nav-icon {
    width: 20px;
    height: 20px;
  }

  .mobile-nav-item.mobile-nav-compose.active {
    background: linear-gradient(135deg, var(--button-active, #d45c45), #b54531);
    color: #fff;
  }

  .mobile-nav-icon {
    width: 17px;
    height: 17px;
  }
}

@media (max-width: 640px) {
  .app-shell {
    gap: 12px;
    padding: 8px 8px 82px;
  }

  .shell-panel {
    border-radius: 18px;
    padding: 14px;
    border: none;
    background: none;
  }

  .shell-header {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 16px;
  }

  .header-title {
    font-size: 26px;
  }

  .header-subtitle {
    font-size: 14px;
    line-height: 1.6;
  }
}
</style>