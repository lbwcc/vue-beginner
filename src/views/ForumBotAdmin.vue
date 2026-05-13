<template>
  <div class="bot-admin">
    <!-- 顶部 -->
    <div class="admin-header">
      <div class="header-left">
        <el-button text @click="router.push('/forum-square')">
          <el-icon><ArrowLeft /></el-icon> 返回广场
        </el-button>
        <span class="page-title">智能分身管理</span>
      </div>
      <div class="header-right">
        <el-button @click="router.push('/avatar-chat')" type="primary" plain>
          <el-icon><ChatDotRound /></el-icon> 与分身对话
        </el-button>
        <el-button @click="runDailyNow" :loading="runningDaily" type="warning">
          <el-icon><Refresh /></el-icon> 立即发帖
        </el-button>
        <el-button @click="runTrainingNow" :loading="runningTraining">
          <el-icon><MagicStick /></el-icon> 训练分身
        </el-button>
      </div>
    </div>

    <!-- 主体 Tabs -->
    <el-tabs v-model="activeTab" class="admin-tabs">

      <!-- ─────────── AI 配置 ─────────── -->
      <el-tab-pane label="AI 配置" name="config">
        <el-form :model="configForm" label-width="120px" class="config-form">
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="服务商">
                <el-radio-group v-model="configForm.provider" @change="onProviderChange">
                  <el-radio-button value="alibaba">阿里云</el-radio-button>
                  <el-radio-button value="deepseek">DeepSeek</el-radio-button>
                  <el-radio-button value="openai">OpenAI</el-radio-button>
                  <el-radio-button value="custom">自定义</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>

            <!-- 预设模型选择器 -->
            <el-col :span="12" v-if="configForm.provider !== 'custom'">
              <el-form-item label="预设模型">
                <el-select
                  v-model="selectedPresetId"
                  placeholder="选择预设快速填入"
                  clearable
                  style="width:100%"
                  @change="applyPreset"
                >
                  <el-option
                    v-for="m in filteredPresets"
                    :key="m.id"
                    :label="m.displayName"
                    :value="m.id"
                  >
                    <div class="preset-option">
                      <span>{{ m.displayName }}</span>
                      <span class="preset-desc">{{ m.description }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="API Key" required>
                <el-input
                  v-model="configForm.apiKey"
                  type="password"
                  show-password
                  placeholder="粘贴你的 API Key"
                />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="Base URL">
                <el-input v-model="configForm.baseUrl" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="模型名称">
                <el-input v-model="configForm.model" placeholder="qwen-plus / deepseek-chat" />
              </el-form-item>
            </el-col>

            <el-col :span="24">
              <el-divider content-position="left">
                <el-switch v-model="showAdvanced" active-text="高级参数" />
              </el-divider>
            </el-col>

            <template v-if="showAdvanced">
              <el-col :span="8">
                <el-form-item label="Temperature">
                  <el-input-number v-model="configForm.temperature" :min="0" :max="2" :step="0.1" :precision="1" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="Top P">
                  <el-input-number v-model="configForm.topP" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="Max Tokens">
                  <el-input-number v-model="configForm.maxTokens" :min="256" :max="32768" :step="256" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="联网搜索">
                  <el-switch
                    v-model="configForm.webSearchEnabled"
                    :active-value="1"
                    :inactive-value="0"
                    active-text="开"
                    inactive-text="关"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="16" v-if="configForm.webSearchEnabled">
                <el-form-item label="Search API Key">
                  <el-input
                    v-model="configForm.webSearchApiKey"
                    type="password"
                    show-password
                    placeholder="Tavily API Key（免费申请：app.tavily.com）"
                    clearable
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="Thinking 模式">
                  <el-switch
                    v-model="configForm.thinkingEnabled"
                    :active-value="1"
                    :inactive-value="0"
                    active-text="开"
                    inactive-text="关"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8" v-if="configForm.thinkingEnabled">
                <el-form-item label="推理强度">
                  <el-select v-model="configForm.reasoningEffort" style="width:100%">
                    <el-option label="低" value="low" />
                    <el-option label="中" value="medium" />
                    <el-option label="高" value="high" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="设为默认">
                  <el-switch
                    v-model="configForm.isDefault"
                    :active-value="1"
                    :inactive-value="0"
                  />
                </el-form-item>
              </el-col>
            </template>

            <el-col :span="24">
              <el-form-item>
                <el-button type="primary" :loading="savingConfig" @click="saveConfig">保存配置</el-button>
                <el-button @click="loadCurrentConfig">重新加载</el-button>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <!-- 当前已配置的平台列表 -->
        <el-divider>已配置的平台</el-divider>
        <el-table :data="configPlatforms" size="small" style="max-width:600px">
          <el-table-column prop="provider" label="服务商" width="120" />
          <el-table-column prop="baseUrl" label="Base URL" show-overflow-tooltip />
          <el-table-column label="默认" width="70" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.isDefault" type="success" size="small">默认</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ row }">
              <el-button text size="small" type="primary" @click="editPlatformConfig(row.provider)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ─────────── 分身管理 ─────────── -->
      <el-tab-pane label="分身管理" name="persona">
        <div class="tab-actions">
          <el-button type="primary" @click="openPersonaDialog(null)">
            <el-icon><Plus /></el-icon> 新建分身
          </el-button>
        </div>

        <el-alert v-if="errorMsg" :title="errorMsg" type="error" closable @close="errorMsg=''" class="mb-12" />

        <el-table :data="personas" v-loading="loadingPersonas" stripe>
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column prop="topicHint" label="主题" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.topicHint || '-' }}</template>
          </el-table-column>
          <el-table-column label="自动发帖" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.autoPostEnabled ? 'success' : 'info'" size="small">
                {{ row.autoPostEnabled ? '开' : '关' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="自动回复" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.autoReplyEnabled ? 'success' : 'info'" size="small">
                {{ row.autoReplyEnabled ? '开' : '关' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'warning'" size="small">
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="230" align="center">
            <template #default="{ row }">
              <el-button text size="small" type="primary" @click="goToPlans(row)">计划</el-button>
              <el-button text size="small" @click="openPersonaDialog(row)">编辑</el-button>
              <el-button text size="small" :type="row.status === 1 ? 'warning' : 'success'"
                @click="togglePersonaStatus(row)">
                {{ row.status === 1 ? '停用' : '启用' }}
              </el-button>
              <el-button text size="small" type="danger" @click="deletePersona(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ─────────── 发帖计划 ─────────── -->
      <el-tab-pane label="发帖计划" name="plan">
        <div class="tab-actions">
          <el-select v-model="planPersonaId" placeholder="选择分身" @change="onPlanPersonaChange" style="width:200px">
            <el-option v-for="p in personas" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
          <el-button type="primary" :disabled="!planPersonaId" @click="openPlanDialog(null)">
            <el-icon><Plus /></el-icon> 新建计划
          </el-button>
        </div>

        <el-empty v-if="!planPersonaId" description="请先选择一个智能分身" />

        <el-table v-else :data="plans" v-loading="loadingPlans" stripe>
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="topic" label="主题" min-width="140" show-overflow-tooltip />
          <el-table-column prop="scheduleAt" label="发布时间" width="100" align="center" />
          <el-table-column prop="category" label="分类" width="100" show-overflow-tooltip>
            <template #default="{ row }">{{ row.category || '-' }}</template>
          </el-table-column>
          <el-table-column label="可见性" width="100" align="center">
            <template #default="{ row }">{{ visibilityLabel(row.visibility) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'warning'" size="small">
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center">
            <template #default="{ row }">
              <el-button text size="small" @click="openPlanDialog(row)">编辑</el-button>
              <el-button text size="small" :type="row.status === 1 ? 'warning' : 'success'"
                @click="togglePlanStatus(row)">
                {{ row.status === 1 ? '停用' : '启用' }}
              </el-button>
              <el-button text size="small" type="danger" @click="deletePlan(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ─────────── 执行日志 ─────────── -->
      <el-tab-pane label="执行日志" name="log">
        <div class="tab-actions">
          <el-select v-model="logPersonaId" placeholder="选择分身" @change="onLogPersonaChange" style="width:200px">
            <el-option v-for="p in personas" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
          <el-button :disabled="!logPersonaId" @click="refreshTasks">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>

        <el-empty v-if="!logPersonaId" description="请先选择一个智能分身" />

        <el-table v-else :data="tasks" v-loading="loadingTasks" stripe>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="planDate" label="计划日期" width="120" align="center">
            <template #default="{ row }">{{ row.planDate || '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : row.status === 2 ? 'danger' : 'info'" size="small">
                {{ taskStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="postId" label="帖子ID" width="90" align="center">
            <template #default="{ row }">{{ row.postId || '-' }}</template>
          </el-table-column>
          <el-table-column prop="errorMessage" label="错误信息" show-overflow-tooltip>
            <template #default="{ row }">{{ row.errorMessage || '-' }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- ─── 分身 编辑/创建 Dialog ─── -->
    <el-dialog
      v-model="personaDialogVisible"
      :title="editingPersona && editingPersona.id ? `编辑分身 #${editingPersona.id}` : '新建分身'"
      width="600px"
      destroy-on-close
    >
      <el-form :model="personaForm" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分身名称" required>
              <el-input v-model="personaForm.name" placeholder="例如：技术顾问小李" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主题提示">
              <el-input v-model="personaForm.topicHint" placeholder="Java、Vue、技术成长" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="语气风格">
              <el-input v-model="personaForm.toneStyle" placeholder="简洁友好" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="回复冷却">
              <el-input-number v-model="personaForm.replyCooldownMinutes" :min="1" :max="1440" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="人设描述">
              <el-input v-model="personaForm.personaPrompt" type="textarea" :rows="4"
                placeholder="描述分身的性格、专业方向、表达习惯……" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="屏蔽词">
              <el-input v-model="personaForm.blockedWords" placeholder="逗号分隔，例如：广告,推广" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="自动发帖">
              <el-switch v-model="personaForm.autoPostEnabled" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="自动回复">
              <el-switch v-model="personaForm.autoReplyEnabled" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="启用状态">
              <el-switch v-model="personaForm.status" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="personaDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingPersona" @click="submitPersonaForm">
          {{ editingPersona && editingPersona.id ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ─── 计划 编辑/创建 Dialog ─── -->
    <el-dialog
      v-model="planDialogVisible"
      :title="editingPlan && editingPlan.id ? `编辑计划 #${editingPlan.id}` : '新建计划'"
      width="500px"
      destroy-on-close
    >
      <el-form :model="planForm" label-width="100px">
        <el-form-item label="主题" required>
          <el-input v-model="planForm.topic" placeholder="每日后端实战" />
        </el-form-item>
        <el-form-item label="发布时间" required>
          <el-input v-model="planForm.scheduleAt" placeholder="09:00" maxlength="5" style="width:120px" />
          <span class="form-hint">格式 HH:mm</span>
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="planForm.category" placeholder="AI分身（可选）" />
        </el-form-item>
        <el-form-item label="可见性">
          <el-select v-model="planForm.visibility" style="width:100%">
            <el-option label="仅自己" :value="1" />
            <el-option label="好友可见" :value="2" />
            <el-option label="公开" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="planForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingPlan" @click="submitPlanForm">
          {{ editingPlan && editingPlan.id ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, ChatDotRound, Refresh, MagicStick, Plus
} from '@element-plus/icons-vue'
import { isFrontendAdmin } from '@/utils/auth'
import {
  createForumBotPersonaApi,
  createForumBotPlanApi,
  deleteForumBotPersonaApi,
  deleteForumBotPlanApi,
  listForumBotPersonasApi,
  listForumBotPlansApi,
  listForumBotTasksApi,
  runForumBotDailyNowApi,
  runForumBotTrainingNowApi,
  updateForumBotPersonaApi,
  updateForumBotPlanApi,
  getForumBotConfigApi,
  updateForumBotConfigApi,
  getForumBotPresetModelsApi,
  getForumBotConfigPlatformsApi,
} from '@/api/forumApi'

const router = useRouter()

// top-level state
const activeTab = ref('config')
const errorMsg = ref('')
const runningDaily = ref(false)
const runningTraining = ref(false)

// AI config
const savingConfig = ref(false)
const showAdvanced = ref(false)
const presetModels = ref([])
const selectedPresetId = ref(null)
const configPlatforms = ref([])

const configForm = reactive({
  provider: 'deepseek',
  apiKey: '',
  baseUrl: '',
  model: '',
  isDefault: 1,
  webSearchEnabled: 0,
  webSearchStrategy: 'agent',
  webSearchApiKey: '',
  temperature: 0.7,
  topP: 1.0,
  maxTokens: 2048,
  thinkingEnabled: 0,
  reasoningEffort: 'medium',
})

const filteredPresets = computed(() =>
  presetModels.value.filter(m => m.provider === configForm.provider)
)

const PROVIDER_DEFAULTS = {
  alibaba: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  custom: { baseUrl: '', model: '' },
}

function onProviderChange(val) {
  selectedPresetId.value = null
  const defaults = PROVIDER_DEFAULTS[val] || { baseUrl: '', model: '' }
  configForm.baseUrl = defaults.baseUrl
  configForm.model = defaults.model
  loadCurrentConfig()
}

function applyPreset(presetId) {
  const preset = presetModels.value.find(m => m.id === presetId)
  if (!preset) return
  configForm.baseUrl = preset.baseUrl
  configForm.model = preset.modelName
  if (preset.supportsWebSearch) {
    configForm.webSearchEnabled = 1
  }
}

async function loadCurrentConfig() {
  try {
    const res = await getForumBotConfigApi(configForm.provider)
    const data = res && res.data && res.data.data
    if (data && data.apiKey !== undefined) {
      configForm.apiKey = data.apiKey || ''
      configForm.baseUrl = data.baseUrl || (PROVIDER_DEFAULTS[configForm.provider] ? PROVIDER_DEFAULTS[configForm.provider].baseUrl : '')
      configForm.model = data.model || ''
      configForm.isDefault = data.isDefault !== undefined ? data.isDefault : 1
      configForm.webSearchEnabled = data.webSearchEnabled !== undefined ? data.webSearchEnabled : 0
      configForm.webSearchStrategy = data.webSearchStrategy || 'agent'
      configForm.webSearchApiKey = data.webSearchApiKey || ''
      configForm.temperature = data.temperature !== undefined ? data.temperature : 0.7
      configForm.topP = data.topP !== undefined ? data.topP : 1.0
      configForm.maxTokens = data.maxTokens !== undefined ? data.maxTokens : 2048
      configForm.thinkingEnabled = data.thinkingEnabled !== undefined ? data.thinkingEnabled : 0
      configForm.reasoningEffort = data.reasoningEffort || 'medium'
    }
  } catch (e) {
    // no config yet for this provider, keep defaults
  }
}

async function loadPresetModels() {
  try {
    const res = await getForumBotPresetModelsApi()
    if (res && res.data && res.data.code === 200) {
      presetModels.value = res.data.data || []
    }
  } catch (e) { /* ignore */ }
}

async function loadConfigPlatforms() {
  try {
    const res = await getForumBotConfigPlatformsApi()
    if (res && res.data && res.data.code === 200) {
      configPlatforms.value = res.data.data || []
    }
  } catch (e) { /* ignore */ }
}

function editPlatformConfig(provider) {
  configForm.provider = provider
  loadCurrentConfig()
  activeTab.value = 'config'
}

async function saveConfig() {
  if (!configForm.apiKey) {
    ElMessage.warning('请填写 API Key')
    return
  }
  if (!configForm.baseUrl) {
    ElMessage.warning('请填写 Base URL')
    return
  }
  savingConfig.value = true
  try {
    await updateForumBotConfigApi(Object.assign({}, configForm))
    ElMessage.success('配置已保存')
    await loadConfigPlatforms()
  } catch (e) {
    ElMessage.error((e && e.response && e.response.data && e.response.data.message) || (e && e.message) || '保存失败')
  } finally {
    savingConfig.value = false
  }
}

// personas
const personas = ref([])
const loadingPersonas = ref(false)
const personaDialogVisible = ref(false)
const editingPersona = ref(null)
const savingPersona = ref(false)

const personaForm = reactive({
  name: '我的智能分身',
  personaPrompt: '专业、真诚、可执行。',
  toneStyle: '简洁友好',
  topicHint: '技术与成长',
  blockedWords: '',
  autoPostEnabled: 1,
  autoReplyEnabled: 1,
  replyCooldownMinutes: 5,
  status: 1,
})

async function loadPersonas() {
  loadingPersonas.value = true
  try {
    const res = await listForumBotPersonasApi()
    if (res && res.data && res.data.code === 200) {
      personas.value = res.data.data || []
    }
  } catch (e) {
    errorMsg.value = (e && e.message) || '加载分身失败'
  } finally {
    loadingPersonas.value = false
  }
}

function openPersonaDialog(persona) {
  editingPersona.value = persona
  if (persona) {
    Object.assign(personaForm, {
      name: persona.name || '',
      personaPrompt: persona.personaPrompt || '',
      toneStyle: persona.toneStyle || '',
      topicHint: persona.topicHint || '',
      blockedWords: persona.blockedWords || '',
      autoPostEnabled: persona.autoPostEnabled !== undefined ? persona.autoPostEnabled : 1,
      autoReplyEnabled: persona.autoReplyEnabled !== undefined ? persona.autoReplyEnabled : 1,
      replyCooldownMinutes: persona.replyCooldownMinutes !== undefined ? persona.replyCooldownMinutes : 5,
      status: persona.status !== undefined ? persona.status : 1,
    })
  } else {
    Object.assign(personaForm, {
      name: '我的智能分身',
      personaPrompt: '专业、真诚、可执行。',
      toneStyle: '简洁友好',
      topicHint: '技术与成长',
      blockedWords: '',
      autoPostEnabled: 1,
      autoReplyEnabled: 1,
      replyCooldownMinutes: 5,
      status: 1,
    })
  }
  personaDialogVisible.value = true
}

async function submitPersonaForm() {
  if (!personaForm.name) {
    ElMessage.warning('请填写分身名称')
    return
  }
  savingPersona.value = true
  try {
    const payload = Object.assign({}, personaForm)
    if (editingPersona.value && editingPersona.value.id) {
      await updateForumBotPersonaApi(editingPersona.value.id, payload)
      ElMessage.success('分身已更新')
    } else {
      await createForumBotPersonaApi(payload)
      ElMessage.success('分身创建成功')
    }
    personaDialogVisible.value = false
    await loadPersonas()
  } catch (e) {
    ElMessage.error((e && e.response && e.response.data && e.response.data.message) || (e && e.message) || '操作失败')
  } finally {
    savingPersona.value = false
  }
}

async function togglePersonaStatus(persona) {
  try {
    await updateForumBotPersonaApi(persona.id, { status: persona.status === 1 ? 0 : 1 })
    ElMessage.success('状态已更新')
    await loadPersonas()
  } catch (e) {
    ElMessage.error((e && e.message) || '操作失败')
  }
}

async function deletePersona(persona) {
  try {
    await ElMessageBox.confirm('确定删除分身「' + persona.name + '」？该分身下的计划也会一并删除。', '删除分身', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
    })
    await deleteForumBotPersonaApi(persona.id)
    ElMessage.success('已删除')
    await loadPersonas()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error((e && e.message) || '删除失败')
  }
}

function goToPlans(persona) {
  planPersonaId.value = persona.id
  activeTab.value = 'plan'
  loadPlans(persona.id)
}

// plans
const plans = ref([])
const loadingPlans = ref(false)
const planPersonaId = ref(null)
const planDialogVisible = ref(false)
const editingPlan = ref(null)
const savingPlan = ref(false)

const planForm = reactive({
  topic: '每日主题',
  scheduleAt: '09:00',
  category: 'AI分身',
  visibility: 3,
  status: 1,
})

async function onPlanPersonaChange(id) {
  if (id) await loadPlans(id)
}

async function loadPlans(personaId) {
  if (!personaId) return
  loadingPlans.value = true
  try {
    const res = await listForumBotPlansApi(personaId)
    if (res && res.data && res.data.code === 200) {
      plans.value = res.data.data || []
    }
  } finally {
    loadingPlans.value = false
  }
}

function openPlanDialog(plan) {
  editingPlan.value = plan
  if (plan) {
    Object.assign(planForm, {
      topic: plan.topic || '',
      scheduleAt: plan.scheduleAt || '09:00',
      category: plan.category || '',
      visibility: plan.visibility !== undefined ? plan.visibility : 3,
      status: plan.status !== undefined ? plan.status : 1,
    })
  } else {
    Object.assign(planForm, {
      topic: '每日主题',
      scheduleAt: '09:00',
      category: 'AI分身',
      visibility: 3,
      status: 1,
    })
  }
  planDialogVisible.value = true
}

async function submitPlanForm() {
  if (!planForm.topic) {
    ElMessage.warning('请填写主题')
    return
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(planForm.scheduleAt)) {
    ElMessage.warning('发布时间格式应为 HH:mm')
    return
  }
  savingPlan.value = true
  try {
    const payload = Object.assign({}, planForm, { personaId: planPersonaId.value })
    if (editingPlan.value && editingPlan.value.id) {
      await updateForumBotPlanApi(editingPlan.value.id, payload)
      ElMessage.success('计划已更新')
    } else {
      await createForumBotPlanApi(payload)
      ElMessage.success('计划创建成功')
    }
    planDialogVisible.value = false
    await loadPlans(planPersonaId.value)
  } catch (e) {
    ElMessage.error((e && e.message) || '操作失败')
  } finally {
    savingPlan.value = false
  }
}

async function togglePlanStatus(plan) {
  try {
    await updateForumBotPlanApi(plan.id, { status: plan.status === 1 ? 0 : 1 })
    ElMessage.success('状态已更新')
    await loadPlans(planPersonaId.value)
  } catch (e) {
    ElMessage.error((e && e.message) || '操作失败')
  }
}

async function deletePlan(plan) {
  try {
    await ElMessageBox.confirm('确定删除计划「' + plan.topic + '」？', '删除计划', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消',
    })
    await deleteForumBotPlanApi(plan.id)
    ElMessage.success('已删除')
    await loadPlans(planPersonaId.value)
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error((e && e.message) || '删除失败')
  }
}

// task logs
const tasks = ref([])
const loadingTasks = ref(false)
const logPersonaId = ref(null)

async function onLogPersonaChange(id) {
  if (id) await loadTasks(id)
}

async function loadTasks(personaId) {
  if (!personaId) return
  loadingTasks.value = true
  try {
    const res = await listForumBotTasksApi(personaId, 30)
    if (res && res.data && res.data.code === 200) {
      tasks.value = res.data.data || []
    }
  } finally {
    loadingTasks.value = false
  }
}

async function refreshTasks() {
  if (logPersonaId.value) await loadTasks(logPersonaId.value)
}

// top actions
async function runDailyNow() {
  runningDaily.value = true
  try {
    const result = await runForumBotDailyNowApi()
    const payload = result && result.data
    if (!payload) throw new Error('请求失败')
    if (payload.code !== 200) throw new Error(payload.message || '触发失败')
    ElMessage.success('已触发每日发帖调度')
    if (logPersonaId.value) await loadTasks(logPersonaId.value)
  } catch (e) {
    ElMessage.error((e && e.message) || '触发失败')
  } finally {
    runningDaily.value = false
  }
}

async function runTrainingNow() {
  runningTraining.value = true
  try {
    const res = await runForumBotTrainingNowApi()
    const result = res && res.data && res.data.data
    if (result && result.success) {
      ElMessage.success(result.message || '训练完成')
      await loadPersonas()
    } else {
      ElMessage.warning((result && result.message) || '训练未产生更新')
    }
  } catch (e) {
    ElMessage.error((e && e.message) || '训练失败')
  } finally {
    runningTraining.value = false
  }
}

const visibilityLabel = (v) => v === 1 ? '仅自己' : v === 2 ? '好友可见' : '公开'
const taskStatusLabel = (v) => v === 1 ? '成功' : v === 2 ? '失败' : '待执行'

onMounted(async () => {
  if (!isFrontendAdmin()) {
    ElMessage.error('仅 lbwcc 账号可访问智能分身管理页')
    router.replace('/forum-square')
    return
  }
  await Promise.all([
    loadPersonas(),
    loadPresetModels(),
    loadConfigPlatforms(),
    loadCurrentConfig(),
  ])
})
</script>

<style scoped>
.bot-admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
}

.header-right {
  display: flex;
  gap: 8px;
}

.admin-tabs {
  background: var(--el-bg-color, #fff);
  border-radius: 12px;
  padding: 0 16px 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.config-form {
  padding-top: 12px;
}

.preset-option {
  display: flex;
  flex-direction: column;
}

.preset-desc {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.tab-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  padding-top: 12px;
}

.form-hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.mb-12 {
  margin-bottom: 12px;
}
</style>