<template>
  <div ref="shellRoot" class="app-shell">
    <header class="global-nav">
      <button class="brand-block" type="button" @click="goHome">
        <div class="brand-mark">LB</div>
        <span class="brand-name">LBBBB</span>
      </button>

      <nav class="global-nav-links" aria-label="主导航">
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
      </nav>

      <nav class="global-nav-links secondary" aria-label="次级导航">
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
      </nav>
    </header>

    <div class="shell-panel">
      <header class="sub-nav" v-reveal="{ y: 12, duration: 0.42, delay: 0.08 }">
        <div class="header-meta" v-if="title || subtitle || eyebrow">
          <p v-if="eyebrow" class="header-eyebrow">{{ eyebrow }}</p>
          <h1 v-if="title" class="header-title">{{ title }}</h1>
          <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
        </div>

        <div class="header-extra">
          <slot name="header-actions" />
        </div>
      </header>

      <div class="shell-content" :class="{ 'has-aside': hasAside }" v-reveal="{ y: 18, duration: 0.5, delay: 0.12 }">
        <main class="shell-main">
          <slot />
        </main>
        <aside v-if="hasAside" class="shell-aside">
          <slot name="aside" />
        </aside>
      </div>

      <footer v-if="$slots['sidebar-footer']" class="shell-footnote">
        <slot name="sidebar-footer" />
      </footer>
    </div>

    <nav class="mobile-bottom-nav" v-reveal="{ y: 22, duration: 0.4, delay: 0.16 }">
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
import { computed, onMounted, onUnmounted, ref, useSlots } from 'vue'
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
import { gsap, prefersReducedMotion } from '@/plugins/gsapMotion'

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
const shellRoot = ref(null)
let shellMotionCtx = null

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

onMounted(() => {
  if (prefersReducedMotion() || !shellRoot.value) {
    return
  }

  shellMotionCtx = gsap.context(() => {
    gsap.timeline({ defaults: { ease: 'power2.out' } })
      .from('.global-nav', { autoAlpha: 0, y: -16, duration: 0.34 })
      .from('.shell-panel', { autoAlpha: 0, y: 20, duration: 0.48 }, '-=0.12')

    gsap.from('.global-nav .nav-item', {
      autoAlpha: 0,
      y: -8,
      duration: 0.28,
      stagger: 0.035,
      delay: 0.1,
      ease: 'power2.out',
    })

    gsap.from('.mobile-bottom-nav .mobile-nav-item', {
      autoAlpha: 0,
      y: 12,
      duration: 0.25,
      stagger: 0.03,
      delay: 0.1,
      ease: 'power2.out',
    })
  }, shellRoot.value)
})

onUnmounted(() => {
  shellMotionCtx?.revert()
  shellMotionCtx = null
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 0 0 88px;
  background: linear-gradient(180deg, #ffffff 0%, #f5f5f7 100%);
  box-sizing: border-box;
}

.global-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 24px;
  background: rgba(0, 0, 0, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: saturate(180%) blur(16px);
}

.brand-block {
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #f5f5f7;
  cursor: pointer;
}

.brand-mark {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: #f5f5f7;
  color: #000;
  font-size: 11px;
  font-weight: 700;
}

.brand-name {
  font-size: 12px;
  line-height: 1;
  color: #fff;
  opacity: 0.9;
}

.global-nav-links {
  display: flex;
  align-items: center;
  gap: 2px;
}

.global-nav-links.secondary {
  margin-left: auto;
}

.nav-item {
  border: 1px solid transparent;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 9999px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  letter-spacing: -0.12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.nav-item:hover,
.nav-item.active {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.nav-item.subtle {
  color: rgba(255, 255, 255, 0.65);
}

.nav-icon {
  width: 14px;
  height: 14px;
}

.shell-panel {
  width: min(1440px, 100% - 24px);
  margin: 14px auto 0;
  border: 1px solid #e0e0e0;
  background: #fff;
  border-radius: 0;
}

.sub-nav {
  min-height: 52px;
  padding: 8px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: rgba(245, 245, 247, 0.82);
  border-bottom: 1px solid #e0e0e0;
  backdrop-filter: saturate(160%) blur(12px);
}

.header-eyebrow {
  margin: 0;
  color: #6e6e73;
  font-size: 12px;
  letter-spacing: -0.12px;
}

.header-title {
  margin: 0;
  color: #1d1d1f;
  font-size: clamp(24px, 2.2vw, 34px);
  line-height: 1.1;
  letter-spacing: -0.28px;
  font-weight: 600;
}

.header-subtitle {
  margin: 2px 0 0;
  max-width: 700px;
  color: #6e6e73;
  font-size: 17px;
  line-height: 1.47;
  letter-spacing: -0.3px;
}

.header-extra {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.header-extra :deep(.el-input),
.header-extra :deep(.el-select) {
  width: min(360px, 60vw);
}

.header-extra :deep(.el-input__wrapper),
.header-extra :deep(.el-select__wrapper) {
  min-height: 44px;
}

.shell-content {
  padding: 20px 24px;
}

.shell-content.has-aside {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.shell-main,
.shell-aside {
  min-width: 0;
}

.shell-aside {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.shell-footnote {
  border-top: 1px solid #f0f0f0;
  padding: 20px 24px;
  color: #6e6e73;
  font-size: 14px;
}

.mobile-bottom-nav {
  display: none;
}

@media (max-width: 1100px) {
  .app-shell {
    padding-bottom: 90px;
  }

  .global-nav-links.secondary {
    display: none;
  }

  .shell-panel {
    width: calc(100% - 12px);
    margin-top: 8px;
  }

  .shell-content.has-aside {
    grid-template-columns: 1fr;
  }

  .mobile-bottom-nav {
    position: fixed;
    left: 8px;
    right: 8px;
    bottom: 8px;
    z-index: 40;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    padding: 8px;
    border-radius: 16px;
    background: rgba(245, 245, 247, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid #e0e0e0;
  }

  .mobile-nav-item {
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.72);
    border-radius: 12px;
    min-height: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: #6e6e73;
    font-size: 11px;
    font-weight: 600;
  }

  .mobile-nav-item.active {
    border-color: #0066cc;
    color: #0066cc;
    background: #fff;
  }

  .mobile-nav-item.mobile-nav-compose {
    min-height: 48px;
    border-radius: 12px;
    background: #0066cc;
    border-color: #0066cc;
    color: #fff;
  }

  .mobile-nav-item.mobile-nav-compose .mobile-nav-icon {
    width: 18px;
    height: 18px;
  }

  .mobile-nav-item.mobile-nav-compose.active {
    background: #0058b0;
    color: #fff;
  }

  .mobile-nav-icon {
    width: 16px;
    height: 16px;
  }
}

@media (max-width: 640px) {
  .global-nav {
    display: none;
  }

  .header-meta {
    display: none;
  }

  .brand-name {
    display: none;
  }

  .sub-nav {
    padding: 8px 12px;
    flex-direction: column;
    align-items: stretch;
    min-height: 0;
  }

  .header-extra {
    width: 100%;
  }

  .header-extra :deep(.el-input),
  .header-extra :deep(.el-select) {
    width: 100%;
  }

  .shell-content {
    padding: 0px;
  }

  .shell-content.has-aside {
    border: none;
  }
}
</style>