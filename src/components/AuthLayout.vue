<template>
  <div ref="authPageRef" class="auth-page" :class="[`theme-${theme}`]">
    <section ref="authShellRef" class="auth-shell">
      <div ref="authHeroRef" class="auth-hero-art" aria-hidden="true"></div>

      <section ref="authCardRef" class="auth-card">
        <header ref="authHeaderRef" class="auth-header">
          <p class="eyebrow">LBBBB</p>
          <h2>{{ title }}</h2>
          <p class="sub" v-if="subtitle">{{ subtitle }}</p>
        </header>

        <main class="auth-main">
          <slot />
        </main>

        <footer class="auth-footer">
          <slot name="footer" />
        </footer>
      </section>
    </section>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap, prefersReducedMotion } from '@/plugins/gsapMotion'

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
    default: 'apple'
  }
})

const authPageRef = ref(null)
const authShellRef = ref(null)
const authHeroRef = ref(null)
const authCardRef = ref(null)
const authHeaderRef = ref(null)
let authMotionCtx = null

onMounted(() => {
  if (prefersReducedMotion() || !authPageRef.value) {
    return
  }

  const clearAll = 'transform,opacity,visibility,filter'

  authMotionCtx = gsap.context(() => {
    gsap.set('.auth-card', { transformOrigin: '50% 24%' })

    gsap.timeline({ defaults: { ease: 'power2.out' } })
      .from(authHeroRef.value, { autoAlpha: 0, scale: 0.96, y: 20, duration: 0.6, clearProps: clearAll })
      .from(authShellRef.value, { autoAlpha: 0, y: 18, duration: 0.48, clearProps: clearAll }, '-=0.42')
      .from(authCardRef.value, { autoAlpha: 0, y: 14, duration: 0.42, clearProps: clearAll }, '-=0.28')
      .from('.auth-main > *', { autoAlpha: 0, y: 10, stagger: 0.06, duration: 0.28, clearProps: clearAll }, '-=0.18')
      .from(authHeaderRef.value?.querySelectorAll('.eyebrow, h2, .sub') || [], { autoAlpha: 0, y: 8, stagger: 0.04, duration: 0.24, clearProps: clearAll }, '-=0.5')
  }, authPageRef.value)
})

onUnmounted(() => {
  authMotionCtx?.revert()
  authMotionCtx = null
})
</script>

<style scoped>
.auth-form {
  background: none !important;
}

.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 18px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #ffffff 0%, #f5f5f7 100%);
}

.auth-hero-art {
  position: absolute;
  width: min(980px, 95vw);
  height: min(520px, 60vh);
  border-radius: 32px;
  background:
    radial-gradient(circle at 18% 22%, rgba(255, 255, 255, 0.7) 0%, transparent 34%),
    radial-gradient(circle at 82% 76%, rgba(0, 102, 204, 0.12) 0%, transparent 40%),
    linear-gradient(140deg, #f5f5f7 0%, #ececf0 46%, #ffffff 100%);
  border: 1px solid #e0e0e0;
  z-index: 0;
}

.theme-apple,
.theme-warm,
.theme-fresh {
  --title-color: #1d1d1f;
  --sub-color: #6e6e73;
  --label-color: #1d1d1f;
  --card-bg: rgba(255, 255, 255, 0.95);
  --card-border: #e0e0e0;
  --card-shadow: rgba(0, 0, 0, 0.14);
  --input-border: #d2d2d7;
  --input-focus: #0071e3;
  --input-focus-shadow: rgba(0, 113, 227, 0.2);
  --primary-bg: #0066cc;
  --link-color: #0066cc;
}

.auth-shell {
  width: min(720px, 100%);
  border-radius: 28px;
  border: 1px solid rgba(224, 224, 224, 0.95);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 26px 65px rgba(0, 0, 0, 0.12);
  backdrop-filter: saturate(150%) blur(16px);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.auth-card {
  width: 100%;
  /* max-width: 680px; */
  margin: 0 auto;
  background: var(--card-bg);
  border-left: 0;
  padding: 40px 34px;
  position: relative;
  z-index: 1;
}

.eyebrow {
  margin: 0 0 10px;
  color: #0066cc;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.auth-header {
  text-align: center;
}

.auth-header h2 {
  margin: 0;
  font-size: clamp(30px, 4vw, 40px);
  font-weight: 600;
  letter-spacing: -0.28px;
  line-height: 1.1;
  color: var(--title-color);
}

.sub {
  color: var(--sub-color);
  margin: 12px auto 28px;
  max-width: 520px;
  line-height: 1.47;
  font-size: 17px;
}

.auth-main {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.auth-footer {
  margin-top: 20px;
  text-align: center;
}

.back {
  display: inline-block;
  margin-top: 12px;
  color: var(--link-color);
  font-weight: 500;
  text-decoration: none;
}

@media (max-width: 920px) {
  .auth-page {
    padding: 10px;
  }

  .auth-hero-art {
    height: 48vh;
  }

  .auth-shell {
    border-radius: 22px;
    width: 100%;
    max-width: 680px;
  }

  .auth-card {
    padding: 28px 20px;
  }
}

@media (max-width: 640px) {
  .auth-page {
    padding: 8px;
  }

  .auth-shell {
    border-radius: 18px;
  }

  .auth-card {
    padding: 24px 16px;
  }

  .sub {
    font-size: 15px;
  }
}

.petal,
.petal-a,
.petal-b,
.branch,
.branch-a,
.auth-hero,
.hero-badge,
.hero-copy,
.hero-points,
.hero-point,
.hero-point strong,
.hero-point span,
.auth-hero h1 {
  display: none;
}
</style>
