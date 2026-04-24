<template>
  <AppShell
    title="工具列表"
    eyebrow="效率工具"
    subtitle="挑一个工具快速开始。"
    active-section="tools"
  >
    <section class="panel-card list-panel">
      <div class="section-title">常用工具</div>
      <div class="tool-grid">
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
      </div>
    </section>
  </AppShell>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'

const router = useRouter()

const toolItems = ref([
  { name: '图书查询', path: '/booksFinder', icon: '书', desc: '搜索图书信息', color: '#8ec4ab' },
  { name: '计算器', path: '/calculator', icon: '算', desc: '基础算术计算', color: '#6ca8d9' },
  { name: '进制转换', path: '/bintodec', icon: '转', desc: '二进制与十进制互转', color: '#b38ad1' },
  { name: '圆角生成', path: '/border', icon: '角', desc: '快速生成圆角样式', color: '#e49a6a' },
  { name: '配色工具', path: '/colorHarmony', icon: '色', desc: '获取配色方案', color: '#db7f93' },
  { name: '天气详情', path: '/weather-detail', icon: '天', desc: '查看天气趋势', color: '#5fa9ea' },
  { name: '日历', path: '/calendar', icon: '历', desc: '查看日历', color: '#f4b400' }
])

const goPath = (path) => {
  if (!path) return
  router.push(path)
}
</script>

<style scoped>
.panel-card {
  background: linear-gradient(180deg, rgba(255, 255, 253, 0.98), rgba(252, 248, 244, 0.98));
  border: 1px solid rgba(210, 190, 178, 0.95);
  border-radius: 26px;
  padding: 20px;
  box-shadow: 0 22px 55px rgba(166, 139, 117, 0.12);
}

.list-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  color: #cb684d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tool-card {
  border: 1px solid rgba(226, 212, 201, 0.84);
  border-radius: 18px;
  background: #fff;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(166, 139, 117, 0.18);
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
  color: #372d29;
  font-size: 16px;
  font-weight: 700;
}

.tool-sub {
  margin-top: 4px;
  color: #7f6f67;
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
</style>
