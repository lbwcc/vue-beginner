import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let gsapReady = false

export function setupGsap() {
  if (gsapReady) {
    return
  }
  gsap.registerPlugin(ScrollTrigger)
  gsapReady = true
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function resolveRevealOptions(value) {
  const defaults = {
    y: 20,
    x: 0,
    scale: 0.98,
    duration: 0.52,
    delay: 0,
    ease: 'power2.out',
    scroll: false,
    start: 'top 86%',
    once: true,
  }
  if (!value || typeof value !== 'object') {
    return defaults
  }
  return {
    ...defaults,
    ...value,
  }
}

const GSAP_REVEAL_KEY = '__gsapRevealInstance'

const REVEAL_CLEAR_PROPS = 'transform,opacity,visibility,filter'
const REVEAL_SAFETY_TIMEOUT = 3000

function forceVisible(el) {
  gsap.set(el, { autoAlpha: 1, clearProps: REVEAL_CLEAR_PROPS })
}

export const revealDirective = {
  mounted(el, binding) {
    setupGsap()

    if (prefersReducedMotion()) {
      forceVisible(el)
      return
    }

    const options = resolveRevealOptions(binding.value)
    let trigger = null

    // 安全超时：如果动画在指定时间内未完成，强制显示元素
    const safetyTimer = setTimeout(() => forceVisible(el), REVEAL_SAFETY_TIMEOUT)

    const ctx = gsap.context(() => {
      const tween = gsap.fromTo(
        el,
        {
          autoAlpha: 0,
          x: options.x,
          y: options.y,
          scale: options.scale,
          filter: 'blur(6px)',
        },
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: options.duration,
          delay: options.delay,
          ease: options.ease,
          paused: Boolean(options.scroll),
          clearProps: REVEAL_CLEAR_PROPS,
          onComplete: () => clearTimeout(safetyTimer),
        }
      )

      if (options.scroll) {
        trigger = ScrollTrigger.create({
          trigger: el,
          start: options.start,
          once: options.once,
          onEnter: () => tween.play(),
        })
      }
    }, el)

    el[GSAP_REVEAL_KEY] = { ctx, trigger, safetyTimer }
  },

  unmounted(el) {
    const runtime = el[GSAP_REVEAL_KEY]
    if (runtime?.safetyTimer) {
      clearTimeout(runtime.safetyTimer)
    }
    if (runtime?.trigger) {
      runtime.trigger.kill()
    }
    if (runtime?.ctx) {
      runtime.ctx.revert()
    }
    // 确保卸载时元素样式不残留
    forceVisible(el)
    delete el[GSAP_REVEAL_KEY]
  },
}

export function installGsapMotion(app) {
  setupGsap()
  app.directive('reveal', revealDirective)
}

export { gsap }
