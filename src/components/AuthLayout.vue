<template>
  <div class="auth-page" :class="[`theme-${theme}`]">
    <div class="petal petal-a"></div>
    <div class="petal petal-b"></div>
    <div class="branch branch-a"></div>

    <section class="auth-shell">
      <!-- <aside class="auth-hero"> -->
        <!-- <div class="hero-badge">移动端界面展示</div> -->
        <!-- <h1>围色万象</h1>
        <p class="hero-copy">把社区、日历、天气和轻量工具放进一套统一的暖色界面，移动端与桌面端都保持同一层级和节奏。</p> -->

        <!-- <div class="hero-points">
          <div class="hero-point">
            <strong>社区广场</strong>
            <span>卡片式内容流、推荐横幅、消息入口</span>
          </div>
          <div class="hero-point">
            <strong>日历 / 天气</strong>
            <span>日程备注、黄历信息与天气联动展示</span>
          </div>
          <div class="hero-point">
            <strong>个人中心</strong>
            <span>关注关系、动态与工具入口放进同一工作台</span>
          </div>
        </div> -->
      <!-- </aside> -->

      <section class="auth-card">
        <header class="auth-header">
          <!-- <p class="eyebrow">欢迎</p> -->
          <h2>{{ title }}</h2>
          <!-- <p class="sub" v-if="subtitle">{{ subtitle }}</p> -->
        </header>

        <main class="auth-main">
          <slot />
        </main>

        <footer class="auth-footer">
          <slot name="footer" />
          <!-- <router-link class="back" to="/forum-square">返回首页</router-link> -->
        </footer>
      </section>
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
.auth-form{
  background: none !important;
}
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 24px;
  box-sizing: border-box;
}

.theme-warm {
  background: linear-gradient(145deg, #fff6f0 0%, #fffaf6 48%, #f4f9ff 100%);
  --petal-a: rgba(240, 142, 118, 0.32);
  --petal-b: rgba(120, 171, 214, 0.22);
  --branch: rgba(232, 162, 153, 0.42);
  --shell-bg: rgba(255, 250, 245, 0.78);
  --shell-border: rgba(229, 211, 196, 0.88);
  --hero-bg: linear-gradient(180deg, rgba(255, 237, 225, 0.9), rgba(255, 250, 245, 0.72));
  --card-bg: rgba(255, 255, 252, 0.95);
  --card-border: #e8d8cb;
  --card-shadow: rgba(95, 75, 45, 0.14);
  --title-color: #5e3f2d;
  --sub-color: #8b7366;
  --label-color: #7b6141;
  --input-border: #decbbd;
  --input-focus: #df7d5d;
  --input-focus-shadow: rgba(223, 125, 93, 0.16);
  --primary-bg: linear-gradient(120deg, #e18163 0%, #cb694a 100%);
  --link-color: #a7543a;
}

.theme-fresh {
  background: linear-gradient(145deg, #f0f7f1 0%, #fbf8ef 52%, #eef6fb 100%);
  --petal-a: rgba(129, 181, 150, 0.26);
  --petal-b: rgba(201, 182, 132, 0.22);
  --branch: rgba(152, 173, 151, 0.36);
  --shell-bg: rgba(250, 253, 248, 0.8);
  --shell-border: rgba(209, 221, 206, 0.9);
  --hero-bg: linear-gradient(180deg, rgba(231, 244, 233, 0.92), rgba(251, 252, 247, 0.75));
  --card-bg: rgba(255, 255, 251, 0.96);
  --card-border: #d7dfcf;
  --card-shadow: rgba(68, 82, 49, 0.14);
  --title-color: #2e5b34;
  --sub-color: #5f7a63;
  --label-color: #4f6b53;
  --input-border: #bfcfb8;
  --input-focus: #4d9e64;
  --input-focus-shadow: rgba(77, 158, 100, 0.14);
  --primary-bg: linear-gradient(120deg, #5da770 0%, #3c8350 100%);
  --link-color: #2f7a43;
}

.petal {
  position: absolute;
  border-radius: 50%;
  filter: blur(4px);
}

.petal-a {
  width: 320px;
  height: 320px;
  background: var(--petal-a);
  top: -120px;
  left: -110px;
}

.petal-b {
  width: 400px;
  height: 400px;
  background: var(--petal-b);
  right: -120px;
  bottom: -120px;
}

.branch {
  position: absolute;
  inset: auto auto 14% -4%;
  width: 320px;
  height: 320px;
  border-radius: 40% 60% 45% 55%;
  border: 2px solid var(--branch);
  opacity: 0.55;
  transform: rotate(-14deg);
}

.auth-shell {
  width: min(720px, 100%);
  display: grid;
  border-radius: 36px;
  max-width: 720px;
  
  border: 1px solid var(--shell-border);
  background: var(--shell-bg);
  box-shadow: 0 30px 80px rgba(130, 110, 91, 0.16);
  backdrop-filter: blur(20px);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.auth-hero {
  padding: 48px 42px;
  background: var(--hero-bg);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-badge {
  width: fit-content;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.66);
  color: #b16246;
  font-size: 13px;
  font-weight: 700;
}

.auth-hero h1 {
  margin: 22px 0 0;
  color: var(--title-color);
  font-size: clamp(44px, 5vw, 62px);
  line-height: 1.05;
}

.hero-copy {
  margin: 18px 0 0;
  max-width: 520px;
  color: var(--sub-color);
  font-size: 16px;
  line-height: 1.9;
}

.hero-points {
  margin-top: 32px;
  display: grid;
  gap: 14px;
}

.hero-point {
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid rgba(233, 218, 205, 0.8);
}

.hero-point strong {
  display: block;
  color: #5a4338;
  font-size: 15px;
}

.hero-point span {
  display: block;
  margin-top: 6px;
  color: #8a786e;
  line-height: 1.7;
  font-size: 14px;
}

.auth-card {
  width: 90%;
  max-width: 680px;
  margin: 0 auto;
  background: var(--card-bg);
  border-left: 0;
  padding: 42px 34px;
  position: relative;
  z-index: 1;
  animation: rise 420ms ease;
}

.eyebrow {
  margin: 0 0 8px;
  color: #cb6a50;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.auth-header {
  text-align: center;
}

.auth-header h2 {
  margin: 0;
  font-size: 34px;
  color: var(--title-color);
  letter-spacing: 0.02em;
}

.sub {
  color: var(--sub-color);
  margin: 10px 0 26px;
  line-height: 1.8;
}

.auth-main {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.auth-footer {
  margin-top: 16px;
  text-align: center;
}

.back {
  display: inline-block;
  margin-top: 12px;
  color: var(--link-color);
  font-weight: 600;
  text-decoration: none;
}

@media (max-width: 920px) {
  .auth-page {
    padding: 14px;
  }

  .auth-shell {
    grid-template-columns: 1fr;
    border-radius: 28px;
    width: 100%;
    max-width: 680px;
  }

  .auth-hero {
    padding: 28px 24px 16px;
  }

  .auth-card {
    border-left: 0;
    border-top: 1px solid var(--card-border);
    padding: 26px 20px;
  }
}

@media (max-width: 640px) {
  .auth-hero {
    padding: 24px 18px 12px;
  }

  .auth-hero h1 {
    font-size: 38px;
  }

  .hero-copy,
  .hero-point span {
    font-size: 14px;
  }

  .auth-card {
    padding: 24px 18px;
  }

  .auth-header h2 {
    font-size: 30px;
  }
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
