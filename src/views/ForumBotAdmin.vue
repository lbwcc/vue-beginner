<template>
  <div class="bot-admin-page">
    <header class="page-header">
      <h2>智能分身管理</h2>
      <div class="header-actions">
        <button class="ghost-btn" type="button" @click="goBack">返回广场</button>
        <button class="ghost-btn" type="button" @click="toggleConfigPanel">
          {{ showConfigPanel ? '关闭配置' : 'AI 参数配置' }}
        </button>
        <button class="primary-btn" type="button" :disabled="runningDaily" @click="runDailyNow">
          {{ runningDaily ? '触发中...' : '立即执行每日发帖' }}
        </button>
        <button class="ghost-btn" type="button" :disabled="runningTraining" @click="runTrainingNow">
          {{ runningTraining ? '训练中...' : '立即训练分身' }}
        </button>
      </div>
    </header>

    <section v-if="showConfigPanel" class="panel-card section-card">
      <h3>AI 参数配置</h3>
      <div class="form-grid">
        <input v-model.trim="configForm.apiKey" type="password" placeholder="OpenAI API Key" />
        <input v-model.trim="configForm.baseUrl" placeholder="API Base URL (https://...)" />
        <input v-model.trim="configForm.model" placeholder="Model Name (gpt-4o-mini)" />
      </div>
      <div class="row-actions">
        <button class="primary-btn" type="button" :disabled="savingConfig" @click="saveConfig">
          {{ savingConfig ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </section>

    <section class="panel-card section-card">
      <h3>{{ editingPersonaId ? `编辑分身 #${editingPersonaId}` : '创建分身' }}</h3>
      <div class="form-grid">
        <input v-model.trim="personaForm.name" placeholder="分身名称" />
        <input v-model.trim="personaForm.topicHint" placeholder="主题提示（如：Java、Vue）" />
        <input v-model.number="personaForm.replyCooldownMinutes" type="number" min="1" placeholder="回复冷却(分钟)" />
        <input v-model.trim="personaForm.toneStyle" placeholder="语气风格（简洁、专业）" />
        <input v-model.trim="personaForm.blockedWords" placeholder="屏蔽词（逗号分隔）" />
        <select v-model.number="personaForm.status">
          <option :value="1">启用</option>
          <option :value="0">停用</option>
        </select>
      </div>
      <textarea v-model.trim="personaForm.personaPrompt" rows="4" placeholder="人设描述（可选）"></textarea>
      <div class="row-actions">
        <button class="primary-btn" type="button" :disabled="savingPersona" @click="createPersona">
          {{ savingPersona ? '保存中...' : (editingPersonaId ? '保存分身' : '创建分身') }}
        </button>
        <button v-if="editingPersonaId" class="ghost-btn" type="button" :disabled="savingPersona" @click="cancelPersonaEdit">取消编辑</button>
      </div>
    </section>

    <section class="panel-card section-card">
      <h3>分身列表</h3>
      <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
      <table v-if="personas.length" class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th>主题提示</th>
            <th>自动发帖</th>
            <th>自动回复</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="persona in personas" :key="persona.id">
            <td>{{ persona.id }}</td>
            <td>{{ persona.name }}</td>
            <td>{{ persona.topicHint || '-' }}</td>
            <td>{{ persona.autoPostEnabled === 1 ? '开' : '关' }}</td>
            <td>{{ persona.autoReplyEnabled === 1 ? '开' : '关' }}</td>
            <td>{{ persona.status === 1 ? '启用' : '停用' }}</td>
            <td>
              <button class="mini-btn" type="button" @click="selectPersona(persona)">查看计划</button>
              <button class="mini-btn" type="button" @click="editPersona(persona)">编辑</button>
              <button class="mini-btn" type="button" @click="togglePersonaStatus(persona)">切换状态</button>
              <button class="mini-btn danger-btn" type="button" @click="deletePersona(persona)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-text">暂无分身</p>
    </section>

    <section v-if="selectedPersonaId" class="panel-card section-card">
      <h3>
        {{ editingPlanId ? `编辑计划 #${editingPlanId}（分身 #${selectedPersonaId}）` : `发帖计划（分身 #${selectedPersonaId}）` }}
      </h3>
      <div class="form-grid">
        <input v-model.trim="planForm.topic" placeholder="主题（如：每日后端实战）" />
        <input v-model.trim="planForm.scheduleAt" placeholder="发布时间 HH:mm" />
        <input v-model.trim="planForm.category" placeholder="分类（可选）" />
        <select v-model.number="planForm.visibility">
          <option :value="1">仅自己</option>
          <option :value="2">好友可见</option>
          <option :value="3">公开</option>
        </select>
        <select v-model.number="planForm.status">
          <option :value="1">启用</option>
          <option :value="0">停用</option>
        </select>
      </div>
      <div class="row-actions">
        <button class="primary-btn" type="button" :disabled="savingPlan" @click="createPlan">
          {{ savingPlan ? '保存中...' : (editingPlanId ? '保存计划' : '新增计划') }}
        </button>
        <button v-if="editingPlanId" class="ghost-btn" type="button" :disabled="savingPlan" @click="cancelPlanEdit">取消编辑</button>
      </div>

      <table v-if="plans.length" class="table compact-top">
        <thead>
          <tr>
            <th>ID</th>
            <th>主题</th>
            <th>时间</th>
            <th>分类</th>
            <th>可见性</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="plan in plans" :key="plan.id">
            <td>{{ plan.id }}</td>
            <td>{{ plan.topic }}</td>
            <td>{{ plan.scheduleAt }}</td>
            <td>{{ plan.category || '-' }}</td>
            <td>{{ visibilityLabel(plan.visibility) }}</td>
            <td>{{ plan.status === 1 ? '启用' : '停用' }}</td>
            <td>
              <button class="mini-btn" type="button" @click="editPlan(plan)">编辑</button>
              <button class="mini-btn" type="button" @click="togglePlanStatus(plan)">切换状态</button>
              <button class="mini-btn danger-btn" type="button" @click="deletePlan(plan)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-text">暂无计划</p>
    </section>

    <section v-if="selectedPersonaId" class="panel-card section-card">
      <h3>执行日志</h3>
      <table v-if="tasks.length" class="table compact-top">
        <thead>
          <tr>
            <th>ID</th>
            <th>计划日期</th>
            <th>状态</th>
            <th>帖子ID</th>
            <th>错误信息</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.id">
            <td>{{ task.id }}</td>
            <td>{{ task.planDate || '-' }}</td>
            <td>{{ taskStatusLabel(task.status) }}</td>
            <td>{{ task.postId || '-' }}</td>
            <td>{{ task.errorMessage || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-text">暂无日志</p>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
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
} from '@/api/forumApi'

const router = useRouter()
const personas = ref([])
const plans = ref([])
const tasks = ref([])
const selectedPersonaId = ref(null)
const errorMsg = ref('')
const savingPersona = ref(false)
const savingPlan = ref(false)
const runningDaily = ref(false)
const runningTraining = ref(false)
const savingConfig = ref(false)
const showConfigPanel = ref(false)
const editingPersonaId = ref(null)
const editingPlanId = ref(null)

const defaultPersonaForm = {
  name: '我的智能分身',
  personaPrompt: '专业、真诚、可执行。',
  toneStyle: '简洁友好',
  topicHint: '技术与成长',
  blockedWords: '',
  replyCooldownMinutes: 5,
  status: 1,
}

const defaultPlanForm = {
  topic: '每日主题',
  scheduleAt: '09:00',
  category: 'AI分身',
  visibility: 3,
  status: 1,
}

const personaForm = reactive({
  ...defaultPersonaForm,
})

const planForm = reactive({
  ...defaultPlanForm,
})

const configForm = reactive({
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
})

const unwrap = (res) => {
  const payload = res?.data
  if (!payload) {
    throw new Error('请求失败')
  }
  if (payload.code !== 200) {
    throw new Error(payload.message || '请求失败')
  }
  return payload.data
}

const ensureAdminAccess = () => {
  if (!isFrontendAdmin()) {
    ElMessage.error('仅 lbwcc 账号可访问智能分身管理页')
    router.replace('/forum-square')
    return false
  }
  return true
}

const resetPersonaForm = () => {
  Object.assign(personaForm, defaultPersonaForm)
}

const resetPlanForm = () => {
  Object.assign(planForm, defaultPlanForm)
}

const cancelPersonaEdit = () => {
  editingPersonaId.value = null
  resetPersonaForm()
}

const cancelPlanEdit = () => {
  editingPlanId.value = null
  resetPlanForm()
}

const loadPersonas = async () => {
  try {
    const data = unwrap(await listForumBotPersonasApi())
    personas.value = Array.isArray(data) ? data : []
    const stillExists = personas.value.some((item) => item.id === selectedPersonaId.value)
    if (!stillExists) {
      selectedPersonaId.value = null
      plans.value = []
      tasks.value = []
    }
    if (!selectedPersonaId.value && personas.value.length) {
      selectedPersonaId.value = personas.value[0].id
      await loadPlansAndTasks(selectedPersonaId.value)
    }
  } catch (error) {
    errorMsg.value = error?.message || '加载分身失败'
  }
}

const loadPlansAndTasks = async (personaId) => {
  try {
    const [planData, taskData] = await Promise.all([
      listForumBotPlansApi(personaId),
      listForumBotTasksApi(personaId, 20),
    ])
    plans.value = Array.isArray(unwrap(planData)) ? unwrap(planData) : []
    tasks.value = Array.isArray(unwrap(taskData)) ? unwrap(taskData) : []
  } catch (error) {
    errorMsg.value = error?.message || '加载计划或日志失败'
  }
}

const createPersona = async () => {
  if (!personaForm.name) {
    ElMessage.warning('请填写分身名称')
    return
  }
  savingPersona.value = true
  try {
    const payload = {
      name: personaForm.name,
      personaPrompt: personaForm.personaPrompt,
      toneStyle: personaForm.toneStyle,
      topicHint: personaForm.topicHint,
      blockedWords: personaForm.blockedWords,
      autoPostEnabled: 1,
      autoReplyEnabled: 1,
      replyCooldownMinutes: Number(personaForm.replyCooldownMinutes) || 5,
      status: Number(personaForm.status) || 1,
    }
    if (editingPersonaId.value) {
      await updateForumBotPersonaApi(editingPersonaId.value, payload)
      ElMessage.success('分身已更新')
    } else {
      await createForumBotPersonaApi(payload)
      ElMessage.success('分身创建成功')
    }
    cancelPersonaEdit()
    await loadPersonas()
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || (editingPersonaId.value ? '更新分身失败' : '创建分身失败'))
  } finally {
    savingPersona.value = false
  }
}

const createPlan = async () => {
  if (!selectedPersonaId.value) {
    ElMessage.warning('请先选择分身')
    return
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(planForm.scheduleAt || ''))) {
    ElMessage.warning('发布时间格式应为 HH:mm')
    return
  }
  savingPlan.value = true
  try {
    const payload = {
      personaId: selectedPersonaId.value,
      topic: planForm.topic,
      scheduleAt: planForm.scheduleAt,
      category: planForm.category,
      visibility: Number(planForm.visibility) || 3,
      status: Number(planForm.status) || 1,
    }
    if (editingPlanId.value) {
      await updateForumBotPlanApi(editingPlanId.value, payload)
      ElMessage.success('计划已更新')
    } else {
      await createForumBotPlanApi(payload)
      ElMessage.success('计划创建成功')
    }
    cancelPlanEdit()
    await loadPlansAndTasks(selectedPersonaId.value)
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || (editingPlanId.value ? '更新计划失败' : '创建计划失败'))
  } finally {
    savingPlan.value = false
  }
}

const editPersona = (persona) => {
  editingPersonaId.value = persona.id
  personaForm.name = persona.name || ''
  personaForm.personaPrompt = persona.personaPrompt || ''
  personaForm.toneStyle = persona.toneStyle || ''
  personaForm.topicHint = persona.topicHint || ''
  personaForm.blockedWords = persona.blockedWords || ''
  personaForm.replyCooldownMinutes = Number(persona.replyCooldownMinutes) || 5
  personaForm.status = Number(persona.status) === 0 ? 0 : 1
}

const editPlan = (plan) => {
  editingPlanId.value = plan.id
  planForm.topic = plan.topic || ''
  planForm.scheduleAt = plan.scheduleAt || '09:00'
  planForm.category = plan.category || ''
  planForm.visibility = Number(plan.visibility) || 3
  planForm.status = Number(plan.status) === 0 ? 0 : 1
}

const togglePersonaStatus = async (persona) => {
  try {
    await updateForumBotPersonaApi(persona.id, {
      status: persona.status === 1 ? 0 : 1,
    })
    ElMessage.success('分身状态已更新')
    await loadPersonas()
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || '更新分身状态失败')
  }
}

const togglePlanStatus = async (plan) => {
  try {
    await updateForumBotPlanApi(plan.id, {
      status: plan.status === 1 ? 0 : 1,
    })
    ElMessage.success('计划状态已更新')
    await loadPlansAndTasks(selectedPersonaId.value)
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || '更新计划状态失败')
  }
}

const deletePersona = async (persona) => {
  try {
    await ElMessageBox.confirm(`确定删除分身“${persona.name}”吗？该分身下的计划也会一并删除。`, '删除分身', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteForumBotPersonaApi(persona.id)
    ElMessage.success('分身已删除')
    if (editingPersonaId.value === persona.id) {
      cancelPersonaEdit()
    }
    await loadPersonas()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage.error(error?.response?.data?.message || error?.message || '删除分身失败')
  }
}

const deletePlan = async (plan) => {
  try {
    await ElMessageBox.confirm(`确定删除计划“${plan.topic}”吗？`, '删除计划', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteForumBotPlanApi(plan.id)
    ElMessage.success('计划已删除')
    if (editingPlanId.value === plan.id) {
      cancelPlanEdit()
    }
    await loadPlansAndTasks(selectedPersonaId.value)
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage.error(error?.response?.data?.message || error?.message || '删除计划失败')
  }
}

const selectPersona = async (persona) => {
  selectedPersonaId.value = persona.id
  await loadPlansAndTasks(persona.id)
}

const runDailyNow = async () => {
  runningDaily.value = true
  try {
    unwrap(await runForumBotDailyNowApi())
    ElMessage.success('已触发每日发帖调度')
    if (selectedPersonaId.value) {
      await loadPlansAndTasks(selectedPersonaId.value)
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || '触发失败')
  } finally {
    runningDaily.value = false
  }
}

const runTrainingNow = async () => {
  runningTraining.value = true
  try {
    const result = unwrap(await runForumBotTrainingNowApi())
    if (result?.success) {
      ElMessage.success(result.message || '训练完成')
      await loadPersonas()
    } else {
      ElMessage.warning(result?.message || '训练未产生更新')
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || '训练失败')
  } finally {
    runningTraining.value = false
  }
}

const loadConfig = async () => {
  try {
    const data = unwrap(await getForumBotConfigApi())
    if (data) {
      configForm.apiKey = data.apiKey || ''
      configForm.baseUrl = data.baseUrl || 'https://api.openai.com/v1'
      configForm.model = data.model || 'gpt-4o-mini'
    }
  } catch (error) {
    errorMsg.value = error?.message || '加载配置失败'
  }
}

const saveConfig = async () => {
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
    await updateForumBotConfigApi({
      apiKey: configForm.apiKey,
      baseUrl: configForm.baseUrl,
      model: configForm.model,
    })
    ElMessage.success('AI 配置已保存')
    showConfigPanel.value = false
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || '保存配置失败')
  } finally {
    savingConfig.value = false
  }
}

const toggleConfigPanel = async () => {
  if (!showConfigPanel.value) {
    showConfigPanel.value = true
    await loadConfig()
  } else {
    showConfigPanel.value = false
  }
}

const visibilityLabel = (value) => {
  if (value === 1) return '仅自己'
  if (value === 2) return '好友可见'
  return '公开'
}

const taskStatusLabel = (value) => {
  if (value === 1) return '成功'
  if (value === 2) return '失败'
  return '待执行'
}

const goBack = () => {
  router.push('/forum-square')
}

onMounted(async () => {
  if (!ensureAdminAccess()) {
    return
  }
  await loadPersonas()
})
</script>

<style scoped>
.bot-admin-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #3f2d2a;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.section-card {
  margin-bottom: 14px;
  padding: 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eadad0;
}

.section-card h3 {
  margin: 0 0 10px;
  color: #4a3632;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid #d8c9bf;
  border-radius: 10px;
  padding: 10px 12px;
  box-sizing: border-box;
  font-size: 14px;
}

textarea {
  margin-top: 10px;
}

.row-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.primary-btn,
.ghost-btn,
.mini-btn {
  border: 0;
  border-radius: 10px;
  height: 38px;
  padding: 0 14px;
  cursor: pointer;
  font-weight: 700;
}

.primary-btn {
  color: #fff;
  background: linear-gradient(135deg, #e58a6a, #d56a4f);
}

.ghost-btn,
.mini-btn {
  /* background: #fff6ef; */
  color: #8f4e39;
}

.danger-btn {
  background: #fff1ee;
  color: #bf4a3a;
}

.primary-btn:disabled,
.mini-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.table th,
.table td {
  border-bottom: 1px solid #efdfd5;
  text-align: left;
  padding: 10px 8px;
  font-size: 13px;
}

.compact-top {
  margin-top: 12px;
}

.error-text {
  color: #c43c2d;
  margin: 0 0 8px;
}

.empty-text {
  margin: 0;
  color: #7f6a61;
}

@media (max-width: 960px) {
  .bot-admin-page {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
