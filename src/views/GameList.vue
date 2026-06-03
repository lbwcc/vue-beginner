<template>
  <AppShell
    title="游戏列表"
    eyebrow="娱乐中心"
    subtitle="选择一个小游戏，马上开始。"
    active-section="game"
  >
    <section class="panel-card list-panel" v-reveal="{ y: 14, duration: 0.42 }">
      <div class="section-title">热门游戏</div>
      <TransitionGroup name="catalog-card" tag="div" class="game-grid">
        <button
          v-for="item in gameItems"
          :key="item.path"
          class="game-card"
          type="button"
          @click="goPath(item.path)"
        >
          <div class="game-icon" :style="{ background: item.color }">{{ item.icon }}</div>
          <div class="game-name">{{ item.name }}</div>
          <div class="game-sub">{{ item.desc }}</div>
        </button>
      </TransitionGroup>
    </section>
  </AppShell>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'

const router = useRouter()

const gameItems = ref([
  { name: '五子棋', path: '/gomoku', icon: '棋', desc: '双人对弈体验', color: '#1d1d1f' },
  { name: '2048', path: '/game2048', icon: '数', desc: '数字合并挑战', color: '#0066cc' },
  { name: '贪吃蛇', path: '/snakeGame', icon: '蛇', desc: '经典街机玩法', color: '#2997ff' },
  { name: '俄罗斯方块', path: '/tetris', icon: '方', desc: '节奏叠块挑战', color: '#272729' },
  { name: '骰子', path: '/dice', icon: '骰', desc: '随机点数小工具', color: '#0058b0' },
  { name: '烟花演示', path: '/fireworks', icon: '烟', desc: '节日烟花效果演示', color: '#d56a4f' },
  { name: '抽奖', path: '/lottery', icon: '抽', desc: '幸运轮盘', color: '#3c3c43' }
])

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

.game-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.game-card {
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 18px;
  background: var(--canvas, #fff);
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.game-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
  border-color: var(--primary, #0066cc);
}

.game-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 800;
}

.game-name {
  margin-top: 10px;
  color: var(--ink, #1d1d1f);
  font-size: 16px;
  font-weight: 600;
}

.game-sub {
  margin-top: 4px;
  color: var(--ink-muted, #6e6e73);
  font-size: 13px;
}

@media (max-width: 768px) {
  .game-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .panel-card {
    border-radius: 20px;
    padding: 14px;
  }

  .game-grid {
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
