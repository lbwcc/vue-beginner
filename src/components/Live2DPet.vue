<template>
  <div
    ref="petEl"
    class="live2d-pet"
    :class="{ 'is-dragging': petState.isDragging }"
    :style="petStyle"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
  >
    <div v-if="dialogueState.visible && dialogueState.text" class="live2d-pet-bubble">
      <div class="bubble-name">{{ petConfig.model.displayName }}</div>
      <p class="bubble-text">{{ dialogueState.text }}</p>
    </div>
    <canvas ref="canvasEl" class="live2d-pet-canvas"></canvas>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism2'
import {
  PET_CONFIG_EVENT,
  PET_CONFIG_STORAGE_KEY,
  loadPetConfig,
  pickDialogueText,
  resolvePetModelPath,
} from '@/utils/live2dPetConfig'

Live2DModel.registerTicker(PIXI.Ticker)

const canvasEl = ref(null)
const petEl = ref(null)
const petConfig = ref(loadPetConfig())

const PET_POSITION_STORAGE_KEY = 'live2d-pet-position'
const LONG_PRESS_MS = 260
const DOUBLE_TAP_WINDOW_MS = 260
const MOVE_THRESHOLD = 10

const petState = reactive({
  width: 210,
  height: 280,
  x: 0,
  y: 0,
  isDragging: false,
})

const pointerState = {
  id: null,
  pressTimer: null,
  startClientX: 0,
  startClientY: 0,
  startX: 0,
  startY: 0,
  moved: false,
}

const dialogueState = reactive({
  visible: false,
  text: '',
})

let app = null
let model = null
let currentMetrics = null
let hasCustomPosition = false
let modelLoadToken = 0
let hitTestCanvas = null
let hitTestContext = null

const runtimeState = {
  bubbleTimer: null,
  tapTimer: null,
  pendingApp: null,
  triggerCooldowns: new Map(),
}

const petStyle = computed(() => ({
  width: `${petState.width}px`,
  height: `${petState.height}px`,
  transform: `translate3d(${Math.round(petState.x)}px, ${Math.round(petState.y)}px, 0)`,
}))

function readSavedPosition() {
  try {
    const raw = window.localStorage.getItem(PET_POSITION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!Number.isFinite(parsed?.x) || !Number.isFinite(parsed?.y)) {
      window.localStorage.removeItem(PET_POSITION_STORAGE_KEY)
      return null
    }

    return {
      x: parsed.x,
      y: parsed.y,
    }
  } catch {
    return null
  }
}

function savePetPosition() {
  if (!hasCustomPosition) {
    return
  }

  try {
    window.localStorage.setItem(
      PET_POSITION_STORAGE_KEY,
      JSON.stringify({
        x: Math.round(petState.x),
        y: Math.round(petState.y),
      }),
    )
  } catch {
    // Ignore storage failures such as private mode quota restrictions.
  }
}

function getPetMetrics() {
  const isCompact = window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches
  const scaleRatio = isCompact ? petConfig.value.model.mobileScale : petConfig.value.model.desktopScale

  if (isCompact) {
    return {
      width: 136,
      height: 180,
      scaleRatio,
      bottomOffset: 10,
      edgeGap: 8,
    }
  }

  return {
    width: 210,
    height: 280,
    scaleRatio,
    bottomOffset: 16,
    edgeGap: 16,
  }
}

function clampPosition(x, y, metrics = currentMetrics) {
  const edgeGap = metrics?.edgeGap ?? 8
  const maxX = Math.max(edgeGap, window.innerWidth - petState.width - edgeGap)
  const maxY = Math.max(edgeGap, window.innerHeight - petState.height - edgeGap)

  return {
    x: Math.min(Math.max(edgeGap, x), maxX),
    y: Math.min(Math.max(edgeGap, y), maxY),
  }
}

function getDefaultPosition(metrics) {
  return clampPosition(
    window.innerWidth - metrics.width - metrics.edgeGap,
    window.innerHeight - metrics.height - metrics.edgeGap,
    metrics,
  )
}

function syncCanvasSize() {
  if (!app || !canvasEl.value) {
    return
  }

  app.renderer.resize(petState.width, petState.height)
  canvasEl.value.style.width = `${petState.width}px`
  canvasEl.value.style.height = `${petState.height}px`
}

function layoutModel() {
  if (!model || !currentMetrics) {
    return
  }

  const scale = (petState.width * currentMetrics.scaleRatio) / model.internalModel.originalWidth
  model.scale.set(scale)
  model.x = (petState.width - model.width) / 2
  model.y = petState.height - model.height + currentMetrics.bottomOffset
}

function updateModelFocus(x, y, instant = false) {
  if (!model) {
    return
  }

  try {
    model.focus(x, y, instant)
  } catch {
    // Ignore focus updates for models that don't expose focus parameters.
  }
}

function focusModelFromClientPoint(clientX, clientY, instant = false) {
  if (!canvasEl.value) {
    return
  }

  const rect = canvasEl.value.getBoundingClientRect()
  updateModelFocus(clientX - rect.left, clientY - rect.top, instant)
}

function resetModelFocus(instant = false) {
  updateModelFocus(petState.width / 2, petState.height / 2, instant)
}

function updatePetLayout({ preservePosition = true } = {}) {
  currentMetrics = getPetMetrics()
  petState.width = currentMetrics.width
  petState.height = currentMetrics.height
  syncCanvasSize()

  if (hasCustomPosition && preservePosition) {
    const nextPosition = clampPosition(petState.x, petState.y, currentMetrics)
    petState.x = nextPosition.x
    petState.y = nextPosition.y
    savePetPosition()
  } else {
    const defaultPosition = getDefaultPosition(currentMetrics)
    petState.x = defaultPosition.x
    petState.y = defaultPosition.y
  }

  layoutModel()
}

function clearBubbleTimer() {
  if (runtimeState.bubbleTimer) {
    window.clearTimeout(runtimeState.bubbleTimer)
    runtimeState.bubbleTimer = null
  }
}

function hideDialogue() {
  clearBubbleTimer()
  dialogueState.visible = false
  dialogueState.text = ''
}

function showDialogue(text) {
  const content = String(text || '').trim()
  if (!content) {
    hideDialogue()
    return
  }

  clearBubbleTimer()
  dialogueState.text = content
  dialogueState.visible = true
  runtimeState.bubbleTimer = window.setTimeout(() => {
    dialogueState.visible = false
    runtimeState.bubbleTimer = null
  }, Math.min(5200, Math.max(2200, content.length * 140)))
}

function clearTapTimer() {
  if (runtimeState.tapTimer) {
    window.clearTimeout(runtimeState.tapTimer)
    runtimeState.tapTimer = null
  }
}

function clearPressTimer() {
  if (pointerState.pressTimer) {
    window.clearTimeout(pointerState.pressTimer)
    pointerState.pressTimer = null
  }
}

function releasePointer(pointerId) {
  if (pointerId == null || !petEl.value?.hasPointerCapture(pointerId)) {
    return
  }

  petEl.value.releasePointerCapture(pointerId)
}

function destroyPetScene() {
  if (runtimeState.pendingApp) {
    runtimeState.pendingApp.destroy(false, { children: true })
    runtimeState.pendingApp = null
  }

  if (app) {
    app.destroy(false, { children: true })
    app = null
  }

  model = null
}

function getPointFromEvent(event) {
  if (!petEl.value) {
    return null
  }

  const rect = petEl.value.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function getHitAreasFromPoint(point) {
  if (!point || !model) {
    return []
  }

  try {
    return model.hitTest(point.x, point.y) || []
  } catch {
    return []
  }
}

function isPointOnVisiblePixel(point) {
  if (!point || !canvasEl.value) {
    return false
  }

  try {
    const sourceCanvas = canvasEl.value
    const sourceWidth = sourceCanvas.width || petState.width
    const sourceHeight = sourceCanvas.height || petState.height
    const displayWidth = sourceCanvas.clientWidth || petState.width
    const displayHeight = sourceCanvas.clientHeight || petState.height
    const sampleX = Math.max(0, Math.min(sourceWidth - 1, Math.round((point.x / displayWidth) * sourceWidth)))
    const sampleY = Math.max(0, Math.min(sourceHeight - 1, Math.round((point.y / displayHeight) * sourceHeight)))

    if (!hitTestCanvas) {
      hitTestCanvas = document.createElement('canvas')
      hitTestCanvas.width = 1
      hitTestCanvas.height = 1
      hitTestContext = hitTestCanvas.getContext('2d', { willReadFrequently: true })
    }

    if (!hitTestContext) {
      return false
    }

    hitTestContext.clearRect(0, 0, 1, 1)
    hitTestContext.drawImage(sourceCanvas, sampleX, sampleY, 1, 1, 0, 0, 1, 1)
    return hitTestContext.getImageData(0, 0, 1, 1).data[3] > 16
  } catch {
    return false
  }
}

async function playIdleMotion() {
  if (!model) {
    return false
  }

  try {
    return await model.motion(petConfig.value.model.idleMotionGroup, 0)
  } catch {
    return false
  }
}

function parseExpressionId(value) {
  const text = String(value || '').trim()
  if (!text) {
    return null
  }
  if (/^-?\d+$/.test(text)) {
    return Number(text)
  }
  return text
}

async function runTrigger(trigger) {
  const now = Date.now()
  const lastRun = runtimeState.triggerCooldowns.get(trigger.id) || 0

  if (trigger.cooldownMs > 0 && now - lastRun < trigger.cooldownMs) {
    return false
  }

  runtimeState.triggerCooldowns.set(trigger.id, now)

  if (model && trigger.useMotion) {
    try {
      await model.motion(trigger.motionGroup, trigger.motionIndex)
    } catch {
      // Keep other trigger effects running even if the motion is missing.
    }
  }

  const expressionId = parseExpressionId(trigger.expressionId)
  if (model && expressionId !== null) {
    try {
      await model.expression(expressionId)
    } catch {
      // Ignore unsupported expressions on older models.
    }
  }

  const dialogueText = pickDialogueText(petConfig.value, trigger.dialogueId)
  if (dialogueText) {
    showDialogue(dialogueText)
  }

  return true
}

async function dispatchTriggers(eventName, { hitAreas = [] } = {}) {
  const normalizedHitAreas = hitAreas.map(area => String(area || '').toLowerCase())
  const matches = petConfig.value.triggers.filter((trigger) => {
    if (!trigger.enabled || trigger.event !== eventName) {
      return false
    }
    if (!trigger.hitArea) {
      return true
    }
    return normalizedHitAreas.includes(trigger.hitArea.toLowerCase())
  })

  for (const trigger of matches) {
    await runTrigger(trigger)
  }
}

function scheduleTapTriggers(hitAreas) {
  const snapshot = [...hitAreas]

  if (runtimeState.tapTimer) {
    clearTapTimer()
    void dispatchTriggers('pet-double-tap', { hitAreas: snapshot })
    return
  }

  runtimeState.tapTimer = window.setTimeout(() => {
    runtimeState.tapTimer = null
    void dispatchTriggers('pet-tap', { hitAreas: snapshot })
  }, DOUBLE_TAP_WINDOW_MS)
}

async function initializePetScene({ runLoadTrigger = false } = {}) {
  const loadToken = ++modelLoadToken
  destroyPetScene()

  if (!canvasEl.value) {
    return
  }

  const nextApp = new PIXI.Application({
    view: canvasEl.value,
    width: petState.width,
    height: petState.height,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    preserveDrawingBuffer: true,
    resolution: window.devicePixelRatio || 1,
  })

  runtimeState.pendingApp = nextApp

  try {
    const modelPath = resolvePetModelPath(petConfig.value.model.modelPath, import.meta.env.BASE_URL)
    const nextModel = await Live2DModel.from(modelPath, { autoInteract: false })

    if (loadToken !== modelLoadToken) {
      nextApp.destroy(false, { children: true })
      return
    }

    runtimeState.pendingApp = null
    app = nextApp
    model = nextModel

    app.stage.addChild(model)
    layoutModel()
    resetModelFocus(true)
    await playIdleMotion()

    if (runLoadTrigger) {
      void dispatchTriggers('page-load')
    }
  } catch (error) {
    if (runtimeState.pendingApp === nextApp) {
      runtimeState.pendingApp = null
    }
    nextApp.destroy(false, { children: true })
    if (loadToken === modelLoadToken) {
      app = null
      model = null
    }
    throw error
  }
}

function applyPetConfig(nextConfig, { reloadModel = false, runLoadTrigger = false } = {}) {
  const previousModelPath = petConfig.value.model.modelPath
  petConfig.value = nextConfig
  updatePetLayout({ preservePosition: true })

  if (reloadModel || previousModelPath !== petConfig.value.model.modelPath || !model) {
    void initializePetScene({ runLoadTrigger })
    return
  }

  layoutModel()
  void playIdleMotion()
}

function handleRuntimeConfigChange() {
  runtimeState.triggerCooldowns.clear()
  hideDialogue()
  applyPetConfig(loadPetConfig(), { reloadModel: true })
}

function handleStorageChange(event) {
  if (event.key !== PET_CONFIG_STORAGE_KEY) {
    return
  }
  handleRuntimeConfigChange()
}

function handlePointerDown(event) {
  if (event.button !== undefined && event.button !== 0) {
    return
  }

  pointerState.id = event.pointerId
  pointerState.startClientX = event.clientX
  pointerState.startClientY = event.clientY
  pointerState.startX = petState.x
  pointerState.startY = petState.y
  pointerState.moved = false

  clearPressTimer()
  pointerState.pressTimer = window.setTimeout(() => {
    if (pointerState.id !== event.pointerId) {
      return
    }

    petState.isDragging = true
    petEl.value?.setPointerCapture(event.pointerId)
  }, LONG_PRESS_MS)
}

function handlePointerMove(event) {
  if (event.pointerId !== pointerState.id) {
    return
  }

  const deltaX = event.clientX - pointerState.startClientX
  const deltaY = event.clientY - pointerState.startClientY

  if (Math.abs(deltaX) > MOVE_THRESHOLD || Math.abs(deltaY) > MOVE_THRESHOLD) {
    pointerState.moved = true
  }

  if (!petState.isDragging) {
    if (pointerState.moved) {
      clearPressTimer()
    }
    return
  }

  const nextPosition = clampPosition(pointerState.startX + deltaX, pointerState.startY + deltaY)
  petState.x = nextPosition.x
  petState.y = nextPosition.y
  hasCustomPosition = true
  event.preventDefault()
}

function finishPointer(event) {
  if (event.pointerId !== pointerState.id) {
    return
  }

  const wasDragging = petState.isDragging
  const point = !wasDragging && !pointerState.moved ? getPointFromEvent(event) : null
  const hitAreas = point ? getHitAreasFromPoint(point) : []
  const isModelTap = point ? isPointOnVisiblePixel(point) : false
  clearPressTimer()
  releasePointer(event.pointerId)
  petState.isDragging = false
  pointerState.id = null

  if (wasDragging) {
    savePetPosition()
    void dispatchTriggers('drag-end')
    return
  }

  if (!pointerState.moved && isModelTap) {
    scheduleTapTriggers(hitAreas)
  }
}

function handlePointerUp(event) {
  finishPointer(event)
}

function handlePointerCancel(event) {
  finishPointer(event)
}

function handleResize() {
  updatePetLayout()
}

function handleWindowPointerMove(event) {
  if (!event.isPrimary) {
    return
  }

  if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
    return
  }

  if (petState.isDragging) {
    return
  }

  focusModelFromClientPoint(event.clientX, event.clientY)
}

onMounted(async () => {
  try {
    const savedPosition = readSavedPosition()
    if (savedPosition) {
      petState.x = savedPosition.x
      petState.y = savedPosition.y
      hasCustomPosition = true
    }

    updatePetLayout({ preservePosition: true })
    window.addEventListener('resize', handleResize)
  window.addEventListener('pointermove', handleWindowPointerMove, { passive: true })
    window.addEventListener(PET_CONFIG_EVENT, handleRuntimeConfigChange)
    window.addEventListener('storage', handleStorageChange)

    await initializePetScene({ runLoadTrigger: true })
  } catch (e) {
    console.warn('[Live2DPet] 初始化失败:', e)
  }
})

onBeforeUnmount(() => {
  clearBubbleTimer()
  clearTapTimer()
  clearPressTimer()
  hitTestCanvas = null
  hitTestContext = null
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('pointermove', handleWindowPointerMove)
  window.removeEventListener(PET_CONFIG_EVENT, handleRuntimeConfigChange)
  window.removeEventListener('storage', handleStorageChange)
  destroyPetScene()
})
</script>

<style scoped>
.live2d-pet {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 999;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  will-change: transform;
  pointer-events: auto;
  touch-action: manipulation;
}

.live2d-pet.is-dragging {
  z-index: 1000;
  touch-action: none;
  cursor: grabbing;
}

.live2d-pet-bubble {
  position: absolute;
  right: 8px;
  bottom: calc(100% - 12px);
  min-width: 140px;
  max-width: min(260px, 68vw);
  padding: 12px 14px;
  border-radius: 18px 18px 6px 18px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(12px);
  pointer-events: none;
}

.live2d-pet-bubble::after {
  content: '';
  position: absolute;
  right: 24px;
  top: calc(100% - 1px);
  border-width: 10px 10px 0;
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.96) transparent transparent;
}

.bubble-name {
  color: var(--primary, #0066cc);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.bubble-text {
  margin: 6px 0 0;
  color: var(--ink, #1d1d1f);
  font-size: 13px;
  line-height: 1.5;
}

.live2d-pet-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  touch-action: manipulation;
}

@media (max-width: 768px) {
  .live2d-pet-bubble {
    right: 2px;
    max-width: min(220px, 74vw);
    padding: 10px 12px;
  }

  .bubble-text {
    font-size: 12px;
  }
}
</style>
