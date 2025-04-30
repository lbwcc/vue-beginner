<template>
  <div class="home-container">
    <Weather />
    <Clock />
    <el-header>
      <h1 class="title"><router-link to="/">初级项目合集</router-link></h1>
    </el-header>
    <el-main>
      <div class="feature-list">
        <div
          v-for="item in features"
          :key="item.path"
          class="feature-item"
          @click="goTo(item.path)"
        >
          <span class="feature-title">{{ item.title }}</span>
        </div>
      </div>
      <div class="router-view-wrapper">
        <router-view></router-view>
      </div>
    </el-main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Weather from '@/components/Weather.vue'
import Clock from '@/components/Clock.vue'

const features = ref([
  { path: '/bintodec', title: '二进制转十进制' },
  { path: '/border', title: '可变边框' },
  { path: '/calculator', title: '计算器' },
  { path: '/booksFinder', title: '图书查询' },
  { path: '/echartsDemo', title: '数据可视化' },
  { path: '/snakeGame', title: '贪吃蛇' },
])

const router = useRouter()
const route = useRoute()

function goTo(url) {
  if (route.path !== url) {
    router.push(url)
  }
}
</script>

<style scoped>
.home-container {
  min-height: 98vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
  overflow-x: hidden; /* 禁止左右滚动 */
}
.title {
  text-align: center;
  margin: 30px 0 10px 0;
  font-size: 2.2rem;
  font-weight: bold;
}
.feature-list {
  display: flex;
  /* justify-content: center; */
  flex-direction: column;
  height: 250px;
  overflow: auto;
}
.feature-item {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  padding: 32px 38px;
  font-size: 1.18rem;
  font-weight: 500;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  min-width: 180px;
  text-align: center;
  user-select: none;
}
.feature-item:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.13);
  transform: translateY(-2px) scale(1.03);
  color: #409eff;
}
.feature-title {
  letter-spacing: 1px;
}
.router-view-wrapper {
  width: 80%;
  margin: 40px auto 0 auto; /* 顶部留出空间避免覆盖按钮 */
  /* max-width: 900px; */
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
@media (max-width: 600px) {
  .title {
    font-size: 1.3rem;
    margin: 18px 0 8px 0;
  }
  .feature-list {
    flex-direction: column;
    gap: 14px;
    margin: 18px 0 10px 0;
    align-items: center;
  }
  .feature-item {
    min-width: 80vw;
    padding: 18px 0;
    font-size: 1rem;
  }
  .router-view-wrapper {
    padding: 0 4vw;
  }
}
</style>