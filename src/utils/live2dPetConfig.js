export const PET_CONFIG_STORAGE_KEY = 'live2d-pet-config'
export const PET_CONFIG_EVENT = 'live2d-pet-config-change'
export const PET_MODEL_MANIFEST_PATH = 'live2d/models/manifest.json'

export const PET_TRIGGER_EVENT_OPTIONS = [
  { value: 'page-load', label: '页面载入' },
  { value: 'pet-tap', label: '点击宠物' },
  { value: 'pet-double-tap', label: '双击宠物' },
  { value: 'drag-end', label: '拖动结束' },
]

export const DEFAULT_PET_CONFIG = {
  model: {
    displayName: '白猫 Tororo',
    modelPath: 'live2d/models/tororo/tororo.model.json',
    idleMotionGroup: 'idle',
    desktopScale: 0.78,
    mobileScale: 0.72,
  },
  dialogues: [
    {
      id: 'welcome',
      name: '欢迎语',
      lines: ['喵，欢迎回来。', '今天也一起把事情处理好。'],
    },
    {
      id: 'tap',
      name: '点击反馈',
      lines: ['喵？你在找我吗？', '收到，正在待命。'],
    },
    {
      id: 'double-tap',
      name: '双击反馈',
      lines: ['别点这么快啦。', '我听到了，真的听到了。'],
    },
    {
      id: 'drag-end',
      name: '拖动反馈',
      lines: ['这个位置我先记住了。'],
    },
  ],
  triggers: [
    {
      id: 'trigger-load',
      name: '页面载入',
      enabled: true,
      event: 'page-load',
      hitArea: '',
      useMotion: true,
      motionGroup: 'idle',
      motionIndex: 0,
      expressionId: '',
      dialogueId: 'welcome',
      cooldownMs: 0,
    },
    {
      id: 'trigger-tap',
      name: '点击宠物',
      enabled: true,
      event: 'pet-tap',
      hitArea: '',
      useMotion: true,
      motionGroup: '',
      motionIndex: 0,
      expressionId: '',
      dialogueId: 'tap',
      cooldownMs: 900,
    },
    {
      id: 'trigger-double-tap',
      name: '双击宠物',
      enabled: true,
      event: 'pet-double-tap',
      hitArea: '',
      useMotion: true,
      motionGroup: '',
      motionIndex: 1,
      expressionId: '',
      dialogueId: 'double-tap',
      cooldownMs: 1200,
    },
    {
      id: 'trigger-drag-end',
      name: '拖动结束',
      enabled: true,
      event: 'drag-end',
      hitArea: '',
      useMotion: true,
      motionGroup: 'idle',
      motionIndex: 0,
      expressionId: '',
      dialogueId: 'drag-end',
      cooldownMs: 0,
    },
  ],
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    if (value === 'true') {
      return true
    }
    if (value === 'false') {
      return false
    }
  }
  return fallback
}

function toText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function toNumber(value, fallback, { min = -Infinity, max = Infinity } = {}) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(Math.max(parsed, min), max)
}

function makeId(prefix, value, index) {
  const text = toText(value).trim()
  if (text) {
    return text
  }
  return `${prefix}-${index + 1}`
}

function normalizeDialogue(dialogue, index) {
  const fallback = DEFAULT_PET_CONFIG.dialogues[index] || DEFAULT_PET_CONFIG.dialogues[0]
  const lines = Array.isArray(dialogue?.lines)
    ? dialogue.lines.map(line => toText(line).trim()).filter(Boolean)
    : []

  return {
    id: makeId('dialogue', dialogue?.id || fallback.id, index),
    name: toText(dialogue?.name, fallback.name || `对话 ${index + 1}`).trim() || `对话 ${index + 1}`,
    lines: lines.length ? lines : clone(fallback.lines),
  }
}

function normalizeTrigger(trigger, index) {
  const fallback = DEFAULT_PET_CONFIG.triggers[index] || DEFAULT_PET_CONFIG.triggers[0]
  const event = PET_TRIGGER_EVENT_OPTIONS.some(option => option.value === trigger?.event)
    ? trigger.event
    : fallback.event

  return {
    id: makeId('trigger', trigger?.id || fallback.id, index),
    name: toText(trigger?.name, fallback.name || `触发器 ${index + 1}`).trim() || `触发器 ${index + 1}`,
    enabled: toBoolean(trigger?.enabled, fallback.enabled),
    event,
    hitArea: toText(trigger?.hitArea, fallback.hitArea).trim(),
    useMotion: toBoolean(trigger?.useMotion, fallback.useMotion),
    motionGroup: toText(trigger?.motionGroup, fallback.motionGroup),
    motionIndex: Math.round(toNumber(trigger?.motionIndex, fallback.motionIndex, { min: 0, max: 99 })),
    expressionId: toText(trigger?.expressionId, fallback.expressionId).trim(),
    dialogueId: toText(trigger?.dialogueId, fallback.dialogueId).trim(),
    cooldownMs: Math.round(toNumber(trigger?.cooldownMs, fallback.cooldownMs, { min: 0, max: 600000 })),
  }
}

export function clonePetConfig(config = DEFAULT_PET_CONFIG) {
  return clone(config)
}

export function normalizePetConfig(config) {
  const source = config && typeof config === 'object' ? config : {}
  const model = source.model && typeof source.model === 'object' ? source.model : {}
  const modelPath = toText(model.modelPath, DEFAULT_PET_CONFIG.model.modelPath).trim() || DEFAULT_PET_CONFIG.model.modelPath

  const dialogues = Array.isArray(source.dialogues)
    ? source.dialogues.map(normalizeDialogue)
    : DEFAULT_PET_CONFIG.dialogues.map(normalizeDialogue)

  const triggers = Array.isArray(source.triggers)
    ? source.triggers.map(normalizeTrigger)
    : DEFAULT_PET_CONFIG.triggers.map(normalizeTrigger)

  const dialogueIds = new Set(dialogues.map(dialogue => dialogue.id))

  return {
    model: {
      displayName: toText(model.displayName, DEFAULT_PET_CONFIG.model.displayName).trim() || DEFAULT_PET_CONFIG.model.displayName,
      modelPath,
      idleMotionGroup: toText(model.idleMotionGroup, DEFAULT_PET_CONFIG.model.idleMotionGroup),
      desktopScale: toNumber(model.desktopScale, DEFAULT_PET_CONFIG.model.desktopScale, { min: 0.2, max: 2 }),
      mobileScale: toNumber(model.mobileScale, DEFAULT_PET_CONFIG.model.mobileScale, { min: 0.2, max: 2 }),
    },
    dialogues,
    triggers: triggers.map(trigger => ({
      ...trigger,
      hitArea: modelPath === DEFAULT_PET_CONFIG.model.modelPath
        && (trigger.event === 'pet-tap' || trigger.event === 'pet-double-tap')
        && trigger.hitArea === 'head'
        ? ''
        : trigger.hitArea,
      dialogueId: dialogueIds.has(trigger.dialogueId) ? trigger.dialogueId : '',
    })),
  }
}

function emitConfigChange(config) {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new CustomEvent(PET_CONFIG_EVENT, { detail: clonePetConfig(config) }))
}

export function loadPetConfig() {
  if (typeof window === 'undefined') {
    return clonePetConfig(DEFAULT_PET_CONFIG)
  }

  try {
    const raw = window.localStorage.getItem(PET_CONFIG_STORAGE_KEY)
    if (!raw) {
      return clonePetConfig(DEFAULT_PET_CONFIG)
    }
    return normalizePetConfig(JSON.parse(raw))
  } catch {
    return clonePetConfig(DEFAULT_PET_CONFIG)
  }
}

export function savePetConfig(config) {
  const normalized = normalizePetConfig(config)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PET_CONFIG_STORAGE_KEY, JSON.stringify(normalized))
    emitConfigChange(normalized)
  }

  return normalized
}

export function resetPetConfig() {
  return savePetConfig(DEFAULT_PET_CONFIG)
}

export function pickDialogueText(config, dialogueId) {
  if (!dialogueId) {
    return ''
  }

  const dialogue = config.dialogues.find(item => item.id === dialogueId)
  if (!dialogue || !dialogue.lines.length) {
    return ''
  }

  const randomIndex = Math.floor(Math.random() * dialogue.lines.length)
  return dialogue.lines[randomIndex]
}

export function getTriggerEventLabel(eventValue) {
  return PET_TRIGGER_EVENT_OPTIONS.find(option => option.value === eventValue)?.label || eventValue
}

export function resolvePetModelPath(modelPath, baseUrl = '/') {
  const normalized = toText(modelPath, DEFAULT_PET_CONFIG.model.modelPath).trim() || DEFAULT_PET_CONFIG.model.modelPath

  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith('data:')) {
    return normalized
  }

  if (normalized.startsWith('/')) {
    return normalized
  }

  const safeBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${safeBase}${normalized.replace(/^\/+/, '')}`
}

function normalizeModelLibraryEntry(entry, index) {
  const modelPath = toText(entry?.modelPath).trim()
  if (!modelPath) {
    return null
  }

  const motionGroups = Array.isArray(entry?.motionGroups)
    ? entry.motionGroups
      .map(group => (typeof group === 'string' ? group : ''))
      .filter((group, groupIndex, groups) => groups.indexOf(group) === groupIndex)
    : []

  const motionCounts = motionGroups.reduce((result, group) => {
    const count = Number(entry?.motionCounts?.[group])
    result[group] = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0
    return result
  }, {})

  return {
    id: toText(entry?.id, `model-${index + 1}`).trim() || `model-${index + 1}`,
    displayName: toText(entry?.displayName, toText(entry?.id, `模型 ${index + 1}`)).trim() || `模型 ${index + 1}`,
    modelPath,
    idleMotionGroup: toText(entry?.idleMotionGroup, motionGroups[0] ?? ''),
    motionGroups,
    motionCounts,
    hitAreas: Array.isArray(entry?.hitAreas)
      ? entry.hitAreas.map(area => toText(area).trim()).filter(Boolean)
      : [],
  }
}

export async function loadPetModelLibrary(baseUrl = '/') {
  const manifestPath = resolvePetModelPath(PET_MODEL_MANIFEST_PATH, baseUrl)

  try {
    const response = await fetch(manifestPath, { cache: 'no-store' })
    if (!response.ok) {
      return []
    }

    const manifest = await response.json()
    if (!Array.isArray(manifest?.models)) {
      return []
    }

    return manifest.models.map(normalizeModelLibraryEntry).filter(Boolean)
  } catch {
    return []
  }
}