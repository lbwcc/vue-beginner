<template>
  <div class="auth-page" :class="[`theme-${theme}`]">
    <div class="bg-orb orb-a"></div>
    <div class="bg-orb orb-b"></div>

    <section class="auth-card">
      <header class="auth-header">
        <h1>{{ title }}</h1>
        <p class="sub" v-if="subtitle">{{ subtitle }}</p>
      </header>

      <main class="auth-main">
        <slot />
      </main>

      <footer class="auth-footer">
        <slot name="footer" />
        <router-link class="back" to="/forum-square">返回首页</router-link>
      </footer>
    </section>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  theme: {
    type: String,
    default: 'warm', // warm | fresh
    validator: (value) => ['warm', 'fresh'].includes(value)
  }
})
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 20px;
  box-sizing: border-box;
}

.theme-warm {
  background: linear-gradient(145deg, #f6efe4 0%, #e5f1f8 55%, #fdf6e8 100%);
  --orb-a: #f2be8a;
  --orb-b: #96c5de;
  --card-bg: rgba(255, 252, 247, 0.94);
  --card-border: #e7d8c4;
  --card-shadow: rgba(95, 75, 45, 0.18);
  --title-color: #5a3c1a;
  --sub-color: #7e6850;
  --label-color: #7b6141;
  --input-border: #d8c5ad;
  --input-focus: #d67f3a;
  --input-focus-shadow: rgba(214, 127, 58, 0.15);
  --primary-bg: linear-gradient(120deg, #de8d4a 0%, #c4682e 100%);
  --link-color: #a74f12;
}

.theme-fresh {
  background: linear-gradient(145deg, #eaf4eb 0%, #f7f1e7 50%, #e7f1f9 100%);
  --orb-a: #9fd2bb;
  --orb-b: #e0c29b;
  --card-bg: rgba(255, 255, 251, 0.95);
  --card-border: #d7dfcf;
  --card-shadow: rgba(68, 82, 49, 0.16);
  --title-color: #2e5b34;
  --sub-color: #5f7a63;
  --label-color: #4f6b53;
  --input-border: #bfcfb8;
  --input-focus: #4d9e64;
  --input-focus-shadow: rgba(77, 158, 100, 0.14);
  --primary-bg: linear-gradient(120deg, #5da770 0%, #3c8350 100%);
  --link-color: #2f7a43;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  opacity: 0.42;
}

.orb-a {
  width: 300px;
  height: 300px;
  background: var(--orb-a);
  top: -100px;
  left: -90px;
}

.orb-b {
  width: 360px;
  height: 360px;
  background: var(--orb-b);
  right: -120px;
  bottom: -120px;
}

.auth-card {
  width: min(92vw, 430px);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 22px;
  box-shadow: 0 24px 60px var(--card-shadow);
  padding: 30px 26px;
  position: relative;
  z-index: 1;
  animation: rise 420ms ease;
}

.auth-header h1 {
  margin: 0;
  font-size: 30px;
  color: var(--title-color);
  letter-spacing: 1px;
}

.sub {
  color: var(--sub-color);
  margin: 8px 0 20px;
}

.auth-footer {
  margin-top: 14px;
}

.back {
  display: inline-block;
  margin-top: 10px;
  color: var(--link-color);
  font-weight: 600;
  text-decoration: none;
}

@keyframes rise {
  from {
    transform: translateY(14px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
