<template>
  <AppShell
    title="工具列表"
    eyebrow="效率工具"
    subtitle="挑一个工具快速开始。"
    active-section="tools"
  >
    <section class="panel-card list-panel" v-reveal="{ y: 14, duration: 0.42 }">
      <div class="section-title">常用工具</div>
      <TransitionGroup name="catalog-card" tag="div" class="tool-grid">
        <button
          v-for="item in toolItems"
          :key="item.path"
          class="tool-card"
          type="button"
          @click="goPath(item.path)"
        >
          <div class="tool-icon" :style="{ background: item.color }">{{ item.icon }}</div>
          <div class="tool-name">{{ item.name }}</div>
          <div class="tool-sub">{{ item.desc }}</div>
        </button>
      </TransitionGroup>
    </section>
  </AppShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { isFrontendAdmin } from '@/utils/auth'

const router = useRouter()

const allToolItems = [
  { name: 'Hermes 对话', path: '/hermes-chat', icon: '聊', desc: '连接 Hermes 对话接口', color: '#1f6feb', adminOnly: true },
  { name: '桌宠配置', path: '/pet-config', icon: '宠', desc: '配置模型、动作、对话和触发器', color: '#0f766e' },
  { name: '图书查询', path: '/booksFinder', icon: '书', desc: '搜索图书信息', color: '#0066cc' },
  { name: '计算器', path: '/calculator', icon: '算', desc: '基础算术计算', color: '#1d1d1f' },
  { name: '进制转换', path: '/bintodec', icon: '转', desc: '二进制与十进制互转', color: '#2997ff' },
  { name: '圆角生成', path: '/border', icon: '角', desc: '快速生成圆角样式', color: '#3c3c43' },
  { name: '配色工具', path: '/colorHarmony', icon: '色', desc: '获取配色方案', color: '#0071e3' },
  { name: '天气详情', path: '/weather-detail', icon: '天', desc: '查看天气趋势', color: '#272729' },
  { name: '日历', path: '/calendar', icon: '历', desc: '查看日历', color: '#0058b0' },
  { name: '孕期指南', path: '/pregnancy-guide', icon: '孕', desc: '按孕周查看作息饮食用品等资料', color: '#e84393' }
]

const toolItems = computed(() => {
  return allToolItems.filter(item => !item.adminOnly || isFrontendAdmin())
})

const goPath = (path) => {
  if (!path) return
  router.push(path)
}
</script>

<style scoped>
.panel-card {
  background: var(--canvas, #fff);
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.08);
}

.list-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  color: var(--primary, #0066cc);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tool-card {
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 18px;
  background: var(--canvas, #fff);
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
  border-color: var(--primary, #0066cc);
}

.tool-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 800;
}

.tool-name {
  margin-top: 10px;
  color: var(--ink, #1d1d1f);
  font-size: 16px;
  font-weight: 600;
}

.tool-sub {
  margin-top: 4px;
  color: var(--ink-muted, #6e6e73);
  font-size: 13px;
}

@media (max-width: 768px) {
  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .panel-card {
    border-radius: 20px;
    padding: 14px;
  }

  .tool-grid {
    grid-template-columns: 1fr;
  }
}

.catalog-card-enter-active,
.catalog-card-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.catalog-card-enter-from,
.catalog-card-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.catalog-card-move {
  transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
}
</style>
