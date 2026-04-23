<template>
  <AppShell
    title="游戏列表"
    eyebrow="娱乐中心"
    subtitle="选择一个小游戏，马上开始。"
    active-section="game"
  >
    <section class="panel-card list-panel">
      <div class="section-title">热门游戏</div>
      <div class="game-grid">
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
      </div>
    </section>
  </AppShell>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'

const router = useRouter()

const gameItems = ref([
  { name: '五子棋', path: '/gomoku', icon: '棋', desc: '双人对弈体验', color: '#f2b36d' },
  { name: '2048', path: '/game2048', icon: '数', desc: '数字合并挑战', color: '#6d93f2' },
  { name: '贪吃蛇', path: '/snakeGame', icon: '蛇', desc: '经典街机玩法', color: '#7bc27a' },
  { name: '俄罗斯方块', path: '/tetris', icon: '方', desc: '节奏叠块挑战', color: '#ef9f63' },
  { name: '骰子', path: '/dice', icon: '骰', desc: '随机点数小工具', color: '#d485a9' },
  { name: '抽奖', path: '/lottery', icon: '抽', desc: '幸运轮盘', color: '#df7c5e' }
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

.game-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.game-card {
  border: 1px solid rgba(226, 212, 201, 0.84);
  border-radius: 18px;
  background: #fff;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.game-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(166, 139, 117, 0.18);
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
  color: #372d29;
  font-size: 16px;
  font-weight: 700;
}

.game-sub {
  margin-top: 4px;
  color: #7f6f67;
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
</style>
