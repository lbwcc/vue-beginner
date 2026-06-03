<template>
  <AppShell
    title="桌宠配置"
    eyebrow="Live2D 宠物"
    subtitle="模型、动作、对话和触发器都保存在本地，可随时修改并立即生效。"
    active-section="tools"
  >
    <template #header-actions>
      <div class="header-actions">
        <button class="ghost-btn action-btn" type="button" @click="handleReset">恢复默认</button>
        <button class="primary-btn action-btn" type="button" @click="handleSave">保存配置</button>
      </div>
    </template>

    <div class="config-stack">
      <section class="panel-card config-card intro-card">
        <div>
          <div class="section-title">当前方案</div>
          <h2 class="card-title">{{ form.model.displayName || '未命名桌宠' }}</h2>
          <p class="card-subtitle">模型路径：{{ form.model.modelPath || '未填写' }}</p>
        </div>
        <div class="intro-meta">
          <div class="meta-chip">对话 {{ form.dialogues.length }}</div>
          <div class="meta-chip">触发器 {{ form.triggers.length }}</div>
          <div class="meta-status" :class="{ success: statusTone === 'success' }">{{ statusText }}</div>
        </div>
      </section>

      <section class="panel-card config-card">
        <div class="card-header">
          <div>
            <div class="section-title">模型</div>
            <h3 class="card-title small">基础模型与缩放</h3>
          </div>
          <p class="hint-text">默认读取 public/live2d 下的本地模型，例如 live2d/models/tororo/tororo.model.json。</p>
        </div>

        <div class="form-grid two-columns">
          <label class="field">
            <span class="field-label">宠物名称</span>
            <input v-model.trim="form.model.displayName" type="text" placeholder="例如：白猫 Tororo">
          </label>

          <label class="field span-2">
            <span class="field-label">模型库选择</span>
            <select v-model="form.model.modelPath" @change="handleModelSelect">
              <option v-for="option in modelOptions" :key="option.modelPath" :value="option.modelPath">{{ option.displayName }}</option>
            </select>
            <span class="field-hint">{{ modelLibraryStatusText }}</span>
          </label>

          <div v-if="selectedModelOption" class="model-library-panel span-2">
            <div class="model-library-title">当前模型信息</div>
            <div class="model-library-path">{{ selectedModelOption.modelPath }}</div>
            <div class="pill-list">
              <span class="info-pill">待机组：{{ formatMotionGroup(selectedModelOption.idleMotionGroup || 'idle') }}</span>
              <span class="info-pill">动作组：{{ selectedModelOption.motionGroups.length ? selectedModelOption.motionGroups.map(formatMotionGroup).join(' / ') : '未读取到' }}</span>
              <span class="info-pill">命中区域：{{ selectedModelOption.hitAreas.length ? selectedModelOption.hitAreas.join(' / ') : '未定义' }}</span>
            </div>
          </div>

          <label class="field">
            <span class="field-label">待机动作组</span>
            <input v-model="form.model.idleMotionGroup" type="text" placeholder="idle">
          </label>

          <label class="field">
            <span class="field-label">桌面缩放</span>
            <input v-model.number="form.model.desktopScale" type="number" min="0.2" max="2" step="0.01">
          </label>

          <label class="field">
            <span class="field-label">移动端缩放</span>
            <input v-model.number="form.model.mobileScale" type="number" min="0.2" max="2" step="0.01">
          </label>

          <label class="field span-2">
            <span class="field-label">模型路径</span>
            <div class="readonly-value">{{ form.model.modelPath || '未填写' }}</div>
          </label>
        </div>
      </section>

      <section class="panel-card config-card">
        <div class="card-header split">
          <div>
            <div class="section-title">对话池</div>
            <h3 class="card-title small">给触发器复用的台词集合</h3>
          </div>
          <button class="ghost-btn action-btn" type="button" @click="addDialogue">新增对话池</button>
        </div>

        <div class="stack-list">
          <article v-for="(dialogue, index) in form.dialogues" :key="dialogue.id" class="sub-card">
            <div class="sub-card-header">
              <div class="sub-card-title">对话 {{ index + 1 }}</div>
              <button class="text-btn danger" type="button" @click="removeDialogue(index)">删除</button>
            </div>

            <div class="form-grid two-columns">
              <label class="field">
                <span class="field-label">对话 ID</span>
                <input v-model.trim="dialogue.id" type="text" placeholder="welcome">
              </label>

              <label class="field">
                <span class="field-label">显示名称</span>
                <input v-model.trim="dialogue.name" type="text" placeholder="欢迎语">
              </label>

              <label class="field span-2">
                <span class="field-label">台词列表</span>
                <textarea v-model="dialogue.linesText" rows="4" placeholder="一行一句，保存后会自动拆成台词列表"></textarea>
              </label>
            </div>
          </article>
        </div>
      </section>

      <section class="panel-card config-card">
        <div class="card-header split">
          <div>
            <div class="section-title">触发器</div>
            <h3 class="card-title small">定义什么时候触发动作和对话</h3>
          </div>
          <button class="ghost-btn action-btn" type="button" @click="addTrigger">新增触发器</button>
        </div>

        <div class="stack-list">
          <article v-for="(trigger, index) in form.triggers" :key="trigger.id" class="sub-card">
            <div class="sub-card-header">
              <div class="sub-card-title">触发器 {{ index + 1 }}</div>
              <button class="text-btn danger" type="button" @click="removeTrigger(index)">删除</button>
            </div>

            <div class="form-grid two-columns">
              <label class="field">
                <span class="field-label">触发器 ID</span>
                <input v-model.trim="trigger.id" type="text" placeholder="trigger-tap">
              </label>

              <label class="field">
                <span class="field-label">显示名称</span>
                <input v-model.trim="trigger.name" type="text" placeholder="点击宠物">
              </label>

              <label class="field checkbox-field">
                <input v-model="trigger.enabled" type="checkbox">
                <span>启用这个触发器</span>
              </label>

              <label class="field">
                <span class="field-label">触发事件</span>
                <select v-model="trigger.event">
                  <option v-for="option in triggerEventOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">命中区域</span>
                <select v-model="trigger.hitArea">
                  <option v-for="option in getTriggerHitAreaOptions(trigger)" :key="`${trigger.id}-hit-${option.label}`" :value="option.value">{{ option.label }}</option>
                </select>
                <span class="field-hint">按当前选中模型自动枚举命中区域。</span>
              </label>

              <label class="field">
                <span class="field-label">冷却时间（毫秒）</span>
                <input v-model.number="trigger.cooldownMs" type="number" min="0" max="600000" step="100">
              </label>

              <label class="field checkbox-field">
                <input v-model="trigger.useMotion" type="checkbox">
                <span>同时播放动作</span>
              </label>

              <label class="field">
                <span class="field-label">动作组</span>
                <select v-model="trigger.motionGroup" @change="handleTriggerMotionGroupChange(trigger)">
                  <option v-for="option in getTriggerMotionGroupOptions(trigger)" :key="`${trigger.id}-${option.label}`" :value="option.value">{{ option.label }}</option>
                </select>
                <span class="field-hint">按当前选中模型自动枚举动作组。</span>
              </label>

              <label class="field">
                <span class="field-label">动作序号</span>
                <select v-model.number="trigger.motionIndex">
                  <option v-for="option in getTriggerMotionIndexOptions(trigger)" :key="`${trigger.id}-motion-${option.value}`" :value="option.value">{{ option.label }}</option>
                </select>
                <span class="field-hint">按当前动作组自动枚举可用序号。</span>
              </label>

              <label class="field">
                <span class="field-label">表情 ID</span>
                <input v-model.trim="trigger.expressionId" type="text" placeholder="留空则不切表情">
              </label>

              <label class="field span-2">
                <span class="field-label">绑定对话池</span>
                <select v-model="trigger.dialogueId">
                  <option value="">不显示对话</option>
                  <option v-for="dialogue in dialogueOptions" :key="dialogue.value" :value="dialogue.value">{{ dialogue.label }}</option>
                </select>
              </label>
            </div>
          </article>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppShell from '@/components/AppShell.vue'
import {
  PET_TRIGGER_EVENT_OPTIONS,
  clonePetConfig,
  loadPetModelLibrary,
  loadPetConfig,
  resetPetConfig,
  savePetConfig,
} from '@/utils/live2dPetConfig'

function toEditableConfig(config) {
  const cloned = clonePetConfig(config)

  return {
    model: {
      ...cloned.model,
    },
    dialogues: cloned.dialogues.map(dialogue => ({
      ...dialogue,
      linesText: dialogue.lines.join('\n'),
    })),
    triggers: cloned.triggers.map(trigger => ({
      ...trigger,
    })),
  }
}

function splitLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function createDialogueDraft(index = 0) {
  return {
    id: `dialogue-${Date.now()}-${index}`,
    name: `新对话 ${index + 1}`,
    linesText: '喵，你可以在这里自定义台词。',
  }
}

function createTriggerDraft(index = 0, dialogueId = '') {
  return {
    id: `trigger-${Date.now()}-${index}`,
    name: `新触发器 ${index + 1}`,
    enabled: true,
    event: 'pet-tap',
    hitArea: '',
    useMotion: false,
    motionGroup: 'idle',
    motionIndex: 0,
    expressionId: '',
    dialogueId,
    cooldownMs: 0,
  }
}

function fromEditableConfig(editable) {
  return {
    model: {
      displayName: editable.model.displayName,
      modelPath: editable.model.modelPath,
      idleMotionGroup: editable.model.idleMotionGroup,
      desktopScale: editable.model.desktopScale,
      mobileScale: editable.model.mobileScale,
    },
    dialogues: editable.dialogues.map(dialogue => ({
      id: dialogue.id,
      name: dialogue.name,
      lines: splitLines(dialogue.linesText),
    })),
    triggers: editable.triggers.map(trigger => ({
      id: trigger.id,
      name: trigger.name,
      enabled: trigger.enabled,
      event: trigger.event,
      hitArea: trigger.hitArea,
      useMotion: trigger.useMotion,
      motionGroup: trigger.motionGroup,
      motionIndex: trigger.motionIndex,
      expressionId: trigger.expressionId,
      dialogueId: trigger.dialogueId,
      cooldownMs: trigger.cooldownMs,
    })),
  }
}

const form = ref(toEditableConfig(loadPetConfig()))
const modelLibrary = ref([])
const modelLibraryLoading = ref(false)
const statusText = ref('尚未保存新的配置')
const statusTone = ref('idle')
const triggerEventOptions = PET_TRIGGER_EVENT_OPTIONS

const modelOptions = computed(() => {
  const options = [...modelLibrary.value]
  const currentPath = form.value.model.modelPath

  if (currentPath && !options.some(option => option.modelPath === currentPath)) {
    options.unshift({
      id: 'current-custom-model',
      displayName: `${form.value.model.displayName || '当前模型'}（当前配置）`,
      modelPath: currentPath,
      idleMotionGroup: form.value.model.idleMotionGroup,
      motionGroups: [],
      hitAreas: [],
    })
  }

  return options
})

const selectedModelOption = computed(() => {
  return modelOptions.value.find(option => option.modelPath === form.value.model.modelPath) || null
})

const modelLibraryStatusText = computed(() => {
  if (modelLibraryLoading.value) {
    return '正在扫描 public/live2d/models 下的本地模型…'
  }
  if (modelLibrary.value.length) {
    return `已发现 ${modelLibrary.value.length} 个可用模型，选择后会自动填充路径和待机动作组。`
  }
  return '暂未读取到模型库清单，将保留当前配置。'
})

const dialogueOptions = computed(() => {
  return form.value.dialogues.map(dialogue => ({
    value: dialogue.id,
    label: dialogue.name || dialogue.id || '未命名对话',
  }))
})

function formatMotionGroup(group) {
  return group === '' ? '空字符串组' : group
}

function getTriggerMotionGroupOptions(trigger) {
  const groups = selectedModelOption.value?.motionGroups || []
  const options = groups.map(group => ({
    value: group,
    label: formatMotionGroup(group),
  }))

  if (!options.some(option => option.value === trigger.motionGroup)) {
    options.unshift({
      value: trigger.motionGroup,
      label: trigger.motionGroup === '' ? '空字符串组' : `${formatMotionGroup(trigger.motionGroup)}（当前配置）`,
    })
  }

  if (!options.length) {
    options.push({
      value: '',
      label: '未读取到动作组',
    })
  }

  return options
}

function getTriggerMotionIndexOptions(trigger) {
  const count = Number(selectedModelOption.value?.motionCounts?.[trigger.motionGroup] ?? 0)
  const options = Array.from({ length: count }, (_, index) => ({
    value: index,
    label: `第 ${index} 个动作`,
  }))

  if (!options.some(option => option.value === trigger.motionIndex)) {
    options.unshift({
      value: trigger.motionIndex,
      label: `第 ${trigger.motionIndex} 个动作（当前配置）`,
    })
  }

  if (!options.length) {
    options.push({
      value: 0,
      label: '未读取到动作序号',
    })
  }

  return options
}

function getTriggerHitAreaOptions(trigger) {
  const hitAreas = selectedModelOption.value?.hitAreas || []
  const options = [
    {
      value: '',
      label: '不限命中区域',
    },
    ...hitAreas.map(area => ({
      value: area,
      label: area,
    })),
  ]

  if (trigger.hitArea && !options.some(option => option.value === trigger.hitArea)) {
    options.push({
      value: trigger.hitArea,
      label: `${trigger.hitArea}（当前配置）`,
    })
  }

  return options
}

function handleTriggerMotionGroupChange(trigger) {
  const nextOptions = getTriggerMotionIndexOptions(trigger)
  if (!nextOptions.some(option => option.value === trigger.motionIndex)) {
    trigger.motionIndex = nextOptions[0]?.value ?? 0
  }
}

function setStatus(text, tone = 'idle') {
  statusText.value = text
  statusTone.value = tone
}

async function hydrateModelLibrary() {
  modelLibraryLoading.value = true
  modelLibrary.value = await loadPetModelLibrary(import.meta.env.BASE_URL)
  modelLibraryLoading.value = false
}

function handleModelSelect() {
  const selected = selectedModelOption.value
  if (!selected) {
    return
  }

  form.value.model.modelPath = selected.modelPath
  form.value.model.idleMotionGroup = selected.idleMotionGroup || form.value.model.idleMotionGroup
  form.value.model.displayName = selected.displayName || form.value.model.displayName
}

function handleSave() {
  const normalized = savePetConfig(fromEditableConfig(form.value))
  form.value = toEditableConfig(normalized)
  setStatus('配置已保存，桌宠会立即读取最新设置。', 'success')
}

function handleReset() {
  const normalized = resetPetConfig()
  form.value = toEditableConfig(normalized)
  setStatus('已恢复默认配置。', 'success')
}

function addDialogue() {
  form.value.dialogues.push(createDialogueDraft(form.value.dialogues.length))
}

function removeDialogue(index) {
  form.value.dialogues.splice(index, 1)
}

function addTrigger() {
  form.value.triggers.push(createTriggerDraft(form.value.triggers.length, form.value.dialogues[0]?.id || ''))
}

function removeTrigger(index) {
  form.value.triggers.splice(index, 1)
}

onMounted(() => {
  void hydrateModelLibrary()
})
</script>

<style scoped>
.config-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.intro-card {
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.intro-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.meta-chip,
.meta-status {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--hairline, #e0e0e0);
  background: rgba(255, 255, 255, 0.78);
  color: var(--ink-muted, #6e6e73);
  font-size: 12px;
  font-weight: 600;
}

.meta-status.success {
  color: var(--primary, #0066cc);
  border-color: rgba(0, 102, 204, 0.28);
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn {
  min-width: 112px;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header.split {
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
}

.card-title {
  margin: 4px 0 0;
  font-size: 24px;
  line-height: 1.2;
  color: var(--ink, #1d1d1f);
}

.card-title.small {
  font-size: 18px;
}

.card-subtitle,
.hint-text {
  margin: 0;
  color: var(--ink-muted, #6e6e73);
  font-size: 14px;
  line-height: 1.6;
}

.section-title {
  color: var(--primary, #0066cc);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.form-grid {
  display: grid;
  gap: 14px;
}

.form-grid.two-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-hint {
  color: var(--ink-muted, #6e6e73);
  font-size: 12px;
  line-height: 1.5;
}

.field.span-2 {
  grid-column: 1 / -1;
}

.field-label {
  color: var(--ink, #1d1d1f);
  font-size: 13px;
  font-weight: 600;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--ink, #1d1d1f);
  padding: 12px 14px;
  font: inherit;
}

.field textarea {
  resize: vertical;
  min-height: 120px;
}

.readonly-value {
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 14px;
  background: rgba(245, 245, 247, 0.92);
  color: var(--ink, #1d1d1f);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}

.model-library-panel {
  grid-column: 1 / -1;
  padding: 14px 16px;
  border: 1px solid rgba(0, 102, 204, 0.14);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(0, 102, 204, 0.06) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.model-library-title {
  color: var(--ink, #1d1d1f);
  font-size: 14px;
  font-weight: 700;
}

.model-library-path {
  margin-top: 6px;
  color: var(--ink-muted, #6e6e73);
  font-size: 13px;
  line-height: 1.6;
  word-break: break-all;
}

.pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.info-pill {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: var(--ink, #1d1d1f);
  font-size: 12px;
  font-weight: 600;
}

.checkbox-field {
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  flex-direction: row;
  align-items: center;
  gap: 10px;
  color: var(--ink, #1d1d1f);
  font-size: 14px;
  font-weight: 500;
}

.checkbox-field input {
  width: 16px;
  height: 16px;
  margin: 0;
}

.stack-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 245, 247, 0.94) 100%);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sub-card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.sub-card-title {
  color: var(--ink, #1d1d1f);
  font-size: 15px;
  font-weight: 700;
}

.text-btn {
  border: 0;
  background: transparent;
  color: var(--primary, #0066cc);
  cursor: pointer;
  font: inherit;
  padding: 0;
}

.text-btn.danger {
  color: #c9342c;
}

@media (max-width: 900px) {
  .intro-card,
  .card-header.split {
    flex-direction: column;
  }

  .intro-meta {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .config-card {
    padding: 16px;
  }

  .form-grid.two-columns {
    grid-template-columns: 1fr;
  }
}
</style>