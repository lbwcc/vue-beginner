<template>
  <AppShell
    title="孕期指南"
    eyebrow="怀孕 / 孕周 / 健康"
    subtitle="根据孕周动态展示作息、饮食、日常用品、检查等全面资料。"
    active-section="tools"
  >
    <template #header-actions>
      <button class="shell-btn" @click="$router.push('/tools')">返回工具</button>
    </template>

    <div class="pregnancy-page" v-reveal="{ y: 12, duration: 0.38 }">

      <!-- ========== 顶部英雄区 - 孕期概览仪表盘 ========== -->
      <section class="hero-section" :style="heroGradientStyle" v-reveal="{ y: 14, duration: 0.42 }">
        <div class="hero-glass">
          <div class="hero-main">
            <!-- 进度环 -->
            <div class="progress-ring-wrapper">
              <svg class="progress-ring" viewBox="0 0 160 160">
                <defs>
                  <linearGradient :id="'ring-grad'" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" :stop-color="trimesterColors.from" />
                    <stop offset="100%" :stop-color="trimesterColors.to" />
                  </linearGradient>
                </defs>
                <circle class="ring-bg" cx="80" cy="80" r="70" />
                <circle
                  class="ring-progress"
                  cx="80" cy="80" r="70"
                  :stroke="'url(#ring-grad)'"
                  :stroke-dasharray="ringCircumference"
                  :stroke-dashoffset="ringOffset"
                />
              </svg>
              <div class="ring-content">
                <div class="ring-week">{{ selectedWeek }}</div>
                <div class="ring-label">周</div>
                <div class="ring-trimester">{{ currentTrimester.shortLabel }}</div>
              </div>
            </div>

            <!-- 右侧信息 -->
            <div class="hero-info">
              <div class="hero-fruit">
                <span class="fruit-emoji">{{ currentFruit.emoji }}</span>
                <div class="fruit-text">
                  <div class="fruit-name">宝宝像 <strong>{{ currentFruit.name }}</strong></div>
                  <div class="fruit-desc">{{ currentFruit.desc }}</div>
                </div>
              </div>
              <div class="hero-due" v-if="dueDate">
                <div class="due-label">距离预产期还有</div>
                <div class="due-days"><span class="due-number">{{ daysUntilDue }}</span> 天</div>
                <div class="due-date">预产期：{{ dueDateStr }}</div>
                <button
                  class="sync-calendar-btn"
                  @click="syncDueDateToCalendar"
                  :disabled="syncedDueDate === 'syncing'"
                  :class="{ synced: syncedDueDate === 'done' }"
                >
                  {{ syncedDueDate === 'done' ? '✓ 已同步日历' : syncedDueDate === 'syncing' ? '同步中...' : '📅 同步到日历' }}
                </button>
              </div>
              <div class="hero-due" v-else>
                <div class="due-label">请输入末次月经日期</div>
                <div class="due-hint">以计算预产期</div>
              </div>
            </div>
          </div>

          <!-- 末次月经日期输入 -->
          <div class="lmp-row">
            <label class="lmp-label">末次月经日期</label>
            <input type="date" v-model="lmpDate" class="lmp-input" :max="todayStr" />
            <span class="auto-week-tag" v-if="autoWeek !== null">
              自动：第 <strong>{{ autoWeek }}</strong> 周 + {{ autoDays }} 天
            </span>
          </div>

          <!-- 孕周滑块 -->
          <div class="week-slider-row">
            <span class="slider-label">第 {{ selectedWeek }} 周</span>
            <div class="slider-track-wrapper">
              <div class="slider-track-bg">
                <div class="slider-track-t1"></div>
                <div class="slider-track-t2"></div>
                <div class="slider-track-t3"></div>
              </div>
              <input
                type="range" min="1" max="40"
                v-model.number="selectedWeek"
                class="week-slider"
              />
            </div>
            <span class="slider-range">40周</span>
          </div>

          <!-- 迷你孕期日历 -->
          <div class="mini-calendar">
            <div
              v-for="w in 40" :key="w"
              class="cal-dot"
              :class="{
                active: w === selectedWeek,
                t1: w <= 12,
                t2: w > 12 && w <= 27,
                t3: w > 27,
                past: w < selectedWeek
              }"
              @click="selectedWeek = w"
              :title="'第' + w + '周'"
            ></div>
          </div>
        </div>
      </section>

      <!-- ========== Tab 导航 ========== -->
      <nav class="tab-bar" v-reveal="{ y: 10, duration: 0.3, delay: 0.05 }">
        <button
          v-for="tab in tabs" :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          :style="activeTab === tab.key ? { color: trimesterColors.from, borderBottomColor: trimesterColors.from } : {}"
          @click="activeTab = tab.key"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-text">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- ========== Tab 内容区 ========== -->
      <transition name="tab-fade" mode="out-in">

        <!-- ===== 概览 Tab ===== -->
        <div v-if="activeTab === 'overview'" key="overview" class="tab-content">

          <!-- 宝宝发育 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.06 }">
            <div class="section-header">
              <span class="section-icon">👶</span>
              <span class="section-title">宝宝发育</span>
            </div>
            <div class="baby-metrics">
              <div class="metric-box">
                <span class="metric-icon">📏</span>
                <span class="metric-label">大小约</span>
                <span class="metric-value" :style="{ color: trimesterColors.from }">{{ currentData.baby.size }}</span>
              </div>
              <div class="metric-box">
                <span class="metric-icon">⚖️</span>
                <span class="metric-label">体重约</span>
                <span class="metric-value" :style="{ color: trimesterColors.from }">{{ currentData.baby.weight }}</span>
              </div>
            </div>
            <p class="baby-dev-text">{{ currentData.baby.development }}</p>
            <!-- 发育里程碑 -->
            <div class="milestones" v-if="currentMilestones.length">
              <div class="milestone-title">发育里程碑</div>
              <div class="milestone-list">
                <div class="milestone-item" v-for="(m, i) in currentMilestones" :key="i">
                  <span class="milestone-check" :style="{ color: trimesterColors.from }">✅</span>
                  <span class="milestone-text">{{ m }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 日常建议 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.1 }">
            <div class="section-header">
              <span class="section-icon">🌙</span>
              <span class="section-title">日常建议</span>
            </div>
            <div class="tip-list">
              <div class="tip-item" v-for="(tip, i) in [...currentData.routine, ...currentData.exercise]" :key="'daily'+i">
                <span class="tip-dot" :style="{ background: trimesterColors.from }"></span>
                <div class="tip-content">
                  <div class="tip-title">{{ tip.title }}</div>
                  <div class="tip-desc">{{ tip.detail }}</div>
                </div>
              </div>
            </div>
          </section>

          <!-- 情绪与心理 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.14 }">
            <div class="section-header">
              <span class="section-icon">💆‍♀️</span>
              <span class="section-title">情绪与心理</span>
            </div>
            <div class="tip-list">
              <div class="tip-item" v-for="(tip, i) in currentData.mental" :key="'mental'+i">
                <span class="tip-dot" :style="{ background: trimesterColors.from }"></span>
                <div class="tip-content">
                  <div class="tip-title">{{ tip.title }}</div>
                  <div class="tip-desc">{{ tip.detail }}</div>
                </div>
              </div>
            </div>
          </section>

          <!-- 注意事项 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.18 }">
            <div class="section-header">
              <span class="section-icon">⚠️</span>
              <span class="section-title">注意事项</span>
            </div>
            <div class="warning-list">
              <div class="warning-item" :class="w.level" v-for="(w, i) in currentData.warnings" :key="'warn'+i">
                <span class="warning-badge">{{ w.level === 'danger' ? '危险' : '注意' }}</span>
                <span class="warning-text">{{ w.text }}</span>
              </div>
            </div>
          </section>

          <!-- 准爸爸须知 -->
          <section class="panel-card accent-border dad-card" v-reveal="{ y: 14, duration: 0.44, delay: 0.22 }">
            <div class="section-header">
              <span class="section-icon">👨</span>
              <span class="section-title">准爸爸须知</span>
            </div>
            <div class="tip-list">
              <div class="tip-item" v-for="(tip, i) in currentData.dadTips" :key="'dad'+i">
                <span class="tip-dot" style="background: #2563eb"></span>
                <div class="tip-content">
                  <div class="tip-title">{{ tip.title }}</div>
                  <div class="tip-desc">{{ tip.detail }}</div>
                </div>
              </div>
            </div>
          </section>

          <!-- 体重记录 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.26 }">
            <div class="section-header">
              <span class="section-icon">📊</span>
              <span class="section-title">体重记录</span>
            </div>
            <div class="weight-tracker">
              <!-- 身高输入 -->
              <div class="height-input-row">
                <label class="height-label">身高</label>
                <template v-if="heightInput && !editingHeight">
                  <span class="height-value">{{ heightInput }} cm</span>
                  <button class="height-edit-btn" @click="editingHeight = true">修改</button>
                </template>
                <template v-else>
                  <input
                    type="number" step="0.1" min="100" max="220"
                    v-model.number="heightInput"
                    class="height-input"
                    placeholder="输入身高(cm)"
                    @change="saveHeight(); editingHeight = false"
                  />
                  <span class="height-unit">cm</span>
                </template>
                <span class="bmi-tag" v-if="currentBmi !== null" :class="bmiCategory">
                  BMI {{ currentBmi }} · {{ bmiLabel }}
                </span>
              </div>
              <!-- 增重建议 -->
              <div class="weight-advice" v-if="weightGainAdvice">
                <span class="advice-item">整个孕期建议增重：<strong>{{ weightGainAdvice.total }}</strong></span>
                <span class="advice-divider">·</span>
                <span class="advice-item">每周增重：<strong>{{ weightGainAdvice.weekly }}</strong></span>
              </div>
              <!-- 体重输入 -->
              <div class="weight-input-row">
                <input
                  type="number" step="0.1" min="30" max="200"
                  v-model.number="weightInput"
                  class="weight-input"
                  placeholder="输入体重(kg)"
                />
                <button class="weight-add-btn" :style="{ background: trimesterColors.from }" @click="addWeight">记录</button>
              </div>
              <div class="weight-history" v-if="weightRecords.length">
                <div class="weight-chart">
                  <div
                    v-for="(rec, i) in weightRecords.slice(-10)" :key="'wr'+i"
                    class="weight-bar-wrapper"
                  >
                    <button class="weight-delete-btn" @click="deleteWeight(weightRecords.length - Math.min(weightRecords.length, 10) + i)" title="删除此记录">×</button>
                    <div class="weight-bar-value">{{ rec.weight }}kg</div>
                    <div
                      class="weight-bar"
                      :style="{
                        height: weightBarHeight(rec.weight) + '%',
                        background: `linear-gradient(to top, ${trimesterColors.from}, ${trimesterColors.to})`
                      }"
                    ></div>
                    <div class="weight-bar-label">{{ rec.week }}周</div>
                  </div>
                </div>
                <div class="weight-summary">
                  共记录 {{ weightRecords.length }} 次 · 最近：{{ weightRecords[weightRecords.length - 1].weight }}kg
                </div>
              </div>
              <div v-else class="weight-empty">暂无记录，开始记录你的体重变化吧</div>
            </div>
          </section>

          <!-- 快速分享 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.3 }">
            <div class="section-header">
              <span class="section-icon">📋</span>
              <span class="section-title">快速分享</span>
            </div>
            <p class="share-preview">{{ shareText }}</p>
            <button class="share-btn" :style="{ background: trimesterColors.from }" @click="copyShareText">
              {{ copied ? '✅ 已复制' : '📋 复制本周摘要' }}
            </button>
          </section>

        </div>

        <!-- ===== 饮食营养 Tab ===== -->
        <div v-else-if="activeTab === 'diet'" key="diet" class="tab-content">

          <!-- 推荐食物 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.06 }">
            <div class="section-header">
              <span class="section-icon">✅</span>
              <span class="section-title">推荐食物</span>
            </div>
            <div class="food-tags">
              <span class="food-tag recommend" v-for="(item, i) in currentData.diet.recommended" :key="'rec'+i">
                {{ item }}
              </span>
            </div>
          </section>

          <!-- 忌口食物 -->
          <section class="panel-card accent-border avoid-card" v-reveal="{ y: 14, duration: 0.44, delay: 0.1 }">
            <div class="section-header">
              <span class="section-icon">🚫</span>
              <span class="section-title">忌口食物</span>
            </div>
            <div class="food-tags">
              <span class="food-tag avoid" v-for="(item, i) in currentData.diet.avoid" :key="'avoid'+i">
                {{ item }}
              </span>
            </div>
          </section>

          <!-- 每日营养摄入 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.14 }">
            <div class="section-header">
              <span class="section-icon">📊</span>
              <span class="section-title">每日营养摄入建议</span>
            </div>
            <div class="nutrient-bars" v-if="currentData.diet.nutrients">
              <div class="nutrient-bar-item" v-for="(n, i) in currentData.diet.nutrients" :key="'nut'+i">
                <div class="nutrient-bar-header">
                  <span class="nutrient-bar-name">{{ n.name }}</span>
                  <span class="nutrient-bar-amount">{{ n.amount }}</span>
                </div>
                <div class="nutrient-bar-track">
                  <div
                    class="nutrient-bar-fill"
                    :style="{
                      width: nutrientProgress(i) + '%',
                      background: `linear-gradient(90deg, ${trimesterColors.from}, ${trimesterColors.to})`
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </section>

          <!-- 推荐食谱 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.18 }">
            <div class="section-header">
              <span class="section-icon">🍽️</span>
              <span class="section-title">今日推荐食谱</span>
              <span class="calorie-badge" v-if="currentBmi !== null" :style="{ background: trimesterColors.from }">
                目标 {{ dailyCalorieTarget }}kcal/天
              </span>
            </div>
            <!-- BMI 提示 -->
            <div class="bmi-diet-hint" v-if="currentBmi !== null">
              根据您的 BMI({{ currentBmi }}, {{ bmiLabel }}) 和当前{{ currentTrimester.shortLabel }}，为您定制以下食谱
            </div>
            <div class="bmi-diet-hint" v-else>
              填写身高并记录体重后，将根据您的 BMI 提供个性化食谱
            </div>
            <div class="meal-cards">
              <div class="meal-card" v-for="(meal, i) in personalizedMeals" :key="'meal'+i">
                <div class="meal-icon">{{ meal.icon }}</div>
                <div class="meal-info">
                  <div class="meal-time">{{ meal.time }}</div>
                  <div class="meal-content">{{ meal.content }}</div>
                </div>
                <div class="meal-calories" v-if="meal.calories">{{ meal.calories }}</div>
              </div>
            </div>
          </section>

        </div>

        <!-- ===== 产检提醒 Tab ===== -->
        <div v-else-if="activeTab === 'checkup'" key="checkup" class="tab-content">

          <!-- 下一次产检 -->
          <section
            class="panel-card next-checkup-card"
            :style="{ background: `linear-gradient(135deg, ${trimesterColors.from}, ${trimesterColors.to})` }"
            v-reveal="{ y: 14, duration: 0.44, delay: 0.06 }"
            v-if="nextCheckup"
          >
            <div class="next-checkup-badge">
              <span class="pulse-dot"></span>
              下一次产检
            </div>
            <div class="next-checkup-name">{{ nextCheckup.name }}</div>
            <div class="next-checkup-desc">{{ nextCheckup.desc }}</div>
          </section>

          <!-- 产检时间线 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.1 }">
            <div class="section-header">
              <span class="section-icon">🏥</span>
              <span class="section-title">{{ currentTrimester.shortLabel }}产检项目</span>
              <button class="sync-all-btn" @click="syncAllCheckupsToCalendar" v-if="lmpDate">
                📅 全部同步到日历
              </button>
            </div>
            <div class="checkup-timeline">
              <div
                class="timeline-item"
                v-for="(item, i) in trimesterCheckups"
                :key="'ck'+i"
                :class="{ current: item.isCurrent, past: item.isPast }"
              >
                <div class="timeline-marker">
                  <div class="timeline-dot" :style="item.isCurrent ? { background: trimesterColors.from, boxShadow: `0 0 0 4px ${trimesterColors.to}40` } : {}">
                    <span v-if="item.isPast">✓</span>
                  </div>
                  <div class="timeline-line" v-if="i < trimesterCheckups.length - 1"></div>
                </div>
                <div class="timeline-content">
                  <div class="timeline-header-row">
                    <span class="timeline-name">{{ item.name }}</span>
                    <span
                      class="timeline-importance"
                      :class="item.importance"
                    >{{ item.importance === 'critical' ? '重要' : '常规' }}</span>
                  </div>
                  <div class="timeline-desc">{{ item.desc }}</div>
                  <div class="timeline-week">
                    建议孕周：{{ item.weekRange }}
                    <button
                      class="sync-item-btn"
                      @click="syncCheckupToCalendar(item)"
                      :disabled="syncingCheckup[item.name] === true"
                      :class="{ synced: syncingCheckup[item.name] === 'done' }"
                      v-if="lmpDate"
                    >
                      {{ syncingCheckup[item.name] === 'done' ? '✓' : syncingCheckup[item.name] === true ? '...' : '📅' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!trimesterCheckups.length" class="empty-tip">本阶段暂无特别产检项目，保持定期检查即可。</div>
          </section>

        </div>

        <!-- ===== 待产准备 Tab ===== -->
        <div v-else-if="activeTab === 'prepare'" key="prepare" class="tab-content">

          <!-- 准备进度 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.06 }">
            <div class="section-header">
              <span class="section-icon">📦</span>
              <span class="section-title">待产准备进度</span>
            </div>
            <div class="prepare-progress">
              <div class="prepare-progress-bar">
                <div
                  class="prepare-progress-fill"
                  :style="{
                    width: preparePercent + '%',
                    background: `linear-gradient(90deg, ${trimesterColors.from}, ${trimesterColors.to})`
                  }"
                ></div>
              </div>
              <div class="prepare-progress-text">已准备 {{ checkedCount }} / {{ totalSupplyCount }} 项 ({{ preparePercent }}%)</div>
            </div>
          </section>

          <!-- 物品清单 - 分类展示 -->
          <section
            class="panel-card accent-border" :style="accentBorderStyle"
            v-for="cat in supplyCategories" :key="cat.key"
            v-reveal="{ y: 14, duration: 0.44, delay: 0.1 }"
          >
            <div class="section-header">
              <span class="section-icon">{{ cat.icon }}</span>
              <span class="section-title">{{ cat.label }}</span>
              <span class="cat-count">{{ getCatChecked(cat.key) }}/{{ getCatItems(cat.key).length }}</span>
            </div>
            <div class="supply-checklist">
              <label
                class="supply-check-item"
                v-for="item in getCatItems(cat.key)" :key="item.id"
              >
                <input
                  type="checkbox"
                  :checked="supplyChecked[item.id] || false"
                  @change="toggleSupply(item.id)"
                  class="supply-checkbox"
                />
                <div class="supply-check-info" :class="{ done: supplyChecked[item.id] }">
                  <span class="supply-check-icon">{{ item.icon }}</span>
                  <div>
                    <div class="supply-check-name">{{ item.name }}</div>
                    <div class="supply-check-note">{{ item.note }}</div>
                  </div>
                </div>
                <span
                  class="supply-priority-tag"
                  :class="item.priority"
                >{{ item.priority === 'must' ? '必备' : item.priority === 'recommend' ? '推荐' : '可选' }}</span>
              </label>
            </div>
          </section>

          <!-- 运动建议 -->
          <section class="panel-card accent-border" :style="accentBorderStyle" v-reveal="{ y: 14, duration: 0.44, delay: 0.14 }">
            <div class="section-header">
              <span class="section-icon">🏃‍♀️</span>
              <span class="section-title">运动建议</span>
            </div>
            <div class="exercise-list">
              <div class="exercise-item" v-for="(ex, i) in currentData.exercise" :key="'ex'+i">
                <div class="exercise-intensity" :style="{ background: trimesterColors.from }">
                  {{ exerciseIntensity(ex.title) }}
                </div>
                <div class="exercise-info">
                  <div class="exercise-name">{{ ex.title }}</div>
                  <div class="exercise-desc">{{ ex.detail }}</div>
                </div>
              </div>
            </div>
          </section>

        </div>

      </transition>

    </div>
  </AppShell>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import AppShell from '@/components/AppShell.vue'
import { fetchPregnancyData, savePregnancyData } from '@/api/pregnancyApi'
import { saveCalendarNoteApi } from '@/api/calendarApi'

// ========== 基础状态 ==========
const todayStr = new Date().toISOString().slice(0, 10)
const lmpDate = ref('')
const selectedWeek = ref(8)
const activeTab = ref('overview')
const weightInput = ref(null)
const heightInput = ref(null)
const editingHeight = ref(false)
const copied = ref(false)
const initialized = ref(false)

// Tab 定义
const tabs = [
  { key: 'overview', label: '概览', icon: '📋' },
  { key: 'diet', label: '饮食营养', icon: '🥗' },
  { key: 'checkup', label: '产检提醒', icon: '🏥' },
  { key: 'prepare', label: '待产准备', icon: '📦' },
]

// ========== 末次月经自动计算 ==========
const autoWeek = computed(() => {
  if (!lmpDate.value) return null
  const lmp = new Date(lmpDate.value)
  const now = new Date()
  const diff = now - lmp
  if (diff < 0) return null
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  return Math.floor(days / 7)
})

const autoDays = computed(() => {
  if (!lmpDate.value) return 0
  const lmp = new Date(lmpDate.value)
  const now = new Date()
  const diff = now - lmp
  if (diff < 0) return 0
  return Math.floor(diff / (1000 * 60 * 60 * 24)) % 7
})

watch(autoWeek, (val) => {
  if (val !== null && val >= 1 && val <= 40) {
    selectedWeek.value = val
  }
})

// 保存 lmpDate 变化到后端
watch(lmpDate, (val) => {
  if (!initialized.value) return
  debouncedSave({ lmpDate: val || '' })
})

// 保存 selectedWeek 变化到后端（排除 autoWeek 触发的联动）
watch(selectedWeek, (val) => {
  if (!initialized.value) return
  debouncedSave({ selectedWeek: val })
})

// ========== 预产期计算 ==========
const dueDate = computed(() => {
  if (!lmpDate.value) return null
  const lmp = new Date(lmpDate.value)
  const due = new Date(lmp)
  due.setDate(due.getDate() + 280)
  return due
})

const dueDateStr = computed(() => {
  if (!dueDate.value) return ''
  const d = dueDate.value
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const daysUntilDue = computed(() => {
  if (!dueDate.value) return 0
  const now = new Date()
  const diff = dueDate.value - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

// ========== 孕期阶段 ==========
const trimesters = [
  { label: '孕早期 (1-12周)', shortLabel: '孕早期', color: '#f43f5e', range: [1, 12] },
  { label: '孕中期 (13-27周)', shortLabel: '孕中期', color: '#f59e0b', range: [13, 27] },
  { label: '孕晚期 (28-40周)', shortLabel: '孕晚期', color: '#10b981', range: [28, 40] },
]

const currentTrimester = computed(() => {
  const w = selectedWeek.value
  return trimesters.find(t => w >= t.range[0] && w <= t.range[1]) || trimesters[0]
})

// 孕期阶段对应颜色
const trimesterColorMap = {
  '孕早期': { from: '#f43f5e', to: '#fb7185' },
  '孕中期': { from: '#f59e0b', to: '#fbbf24' },
  '孕晚期': { from: '#10b981', to: '#34d399' },
}

const trimesterColors = computed(() => {
  return trimesterColorMap[currentTrimester.value.shortLabel] || trimesterColorMap['孕早期']
})

// ========== 进度环 ==========
const ringCircumference = 2 * Math.PI * 70
const ringOffset = computed(() => {
  const progress = selectedWeek.value / 40
  return ringCircumference * (1 - progress)
})

// ========== 水果对照 ==========
const fruitComparison = {
  1: { emoji: '🫧', name: '小气泡', desc: '比针尖还小' },
  4: { emoji: '🌰', name: '芝麻', desc: '刚刚可见' },
  8: { emoji: '🫐', name: '蓝莓', desc: '约1.6cm' },
  12: { emoji: '🍋', name: '柠檬', desc: '约6cm' },
  16: { emoji: '🥑', name: '牛油果', desc: '约11.5cm' },
  20: { emoji: '🍌', name: '香蕉', desc: '约16cm' },
  24: { emoji: '🌽', name: '玉米', desc: '约30cm' },
  28: { emoji: '🍆', name: '茄子', desc: '约38cm' },
  32: { emoji: '🥥', name: '椰子', desc: '约42cm' },
  36: { emoji: '🍈', name: '哈密瓜', desc: '约47cm' },
  40: { emoji: '🍉', name: '西瓜', desc: '约50cm' },
}

const fruitWeeks = Object.keys(fruitComparison).map(Number).sort((a, b) => a - b)

const currentFruit = computed(() => {
  const w = selectedWeek.value
  let closest = fruitWeeks[0]
  let minDiff = Math.abs(w - closest)
  for (const fw of fruitWeeks) {
    const diff = Math.abs(w - fw)
    if (diff < minDiff) {
      minDiff = diff
      closest = fw
    }
  }
  return fruitComparison[closest]
})

// ========== 样式计算 ==========
const heroGradientStyle = computed(() => {
  const c = trimesterColors.value
  return {
    background: `linear-gradient(135deg, ${c.from}12, ${c.to}18)`
  }
})

const accentBorderStyle = computed(() => {
  return { borderLeftColor: trimesterColors.value.from }
})

// ========== 孕周数据 ==========
const weeklyData = {
  1: {
    baby: { size: '0.1mm', weight: '极微小', development: '受精卵开始分裂，形成囊胚，准备着床。此时胚胎还非常微小，肉眼不可见。' },
    routine: [
      { title: '保持正常作息', detail: '每天保证7-8小时睡眠，避免熬夜。规律作息有助于激素分泌稳定。' },
      { title: '避免剧烈运动', detail: '受精卵着床期间，避免跑跳、搬重物等剧烈活动。' },
      { title: '放松心情', detail: '保持心情愉悦，避免过度紧张和焦虑。' },
    ],
    diet: {
      recommended: ['叶酸丰富的绿叶蔬菜', '鸡蛋', '瘦肉', '豆类', '新鲜水果', '全谷物'],
      avoid: ['生鱼片', '酒精', '含咖啡因饮料(限量)', '未熟的肉类', '高汞鱼类'],
      nutrients: [
        { name: '叶酸', amount: '400-800μg/天' },
        { name: '铁', amount: '20mg/天' },
        { name: '维生素D', amount: '10μg/天' },
      ],
    },
    exercise: [
      { title: '散步', detail: '每天20-30分钟轻松散步，保持基础活动量。' },
      { title: '轻度伸展', detail: '简单的瑜伽拉伸，放松身体。' },
    ],
    supplies: [
      { icon: '💊', name: '叶酸片', note: '每日补充400-800μg，预防神经管缺陷', priority: 'must' },
      { icon: '🌡️', name: '基础体温计', note: '监测基础体温变化', priority: 'recommend' },
      { icon: '📔', name: '孕期日记本', note: '记录身体变化和感受', priority: 'optional' },
    ],
    checkups: [],
    mental: [
      { title: '接受变化', detail: '刚发现怀孕可能会有各种复杂的情绪，这是完全正常的。' },
      { title: '与伴侣沟通', detail: '分享你的感受和期待，共同规划孕期生活。' },
    ],
    warnings: [
      { level: 'danger', text: '绝对禁止饮酒、吸烟和接触二手烟。' },
      { level: 'warning', text: '避免接触X光和有害化学品。' },
      { level: 'warning', text: '用药前务必咨询医生。' },
    ],
    dadTips: [
      { title: '陪同就医', detail: '尽早陪伴妻子去医院确认怀孕，了解初步注意事项。' },
      { title: '戒烟限酒', detail: '为了妻子和宝宝的健康，远离烟酒。' },
    ],
  },
  4: {
    baby: { size: '1mm (芝麻大小)', weight: '<1g', development: '胚胎已着床，开始形成神经管（未来的大脑和脊髓）。心脏原始细胞开始形成。' },
    routine: [
      { title: '应对孕吐', detail: '晨起先吃几块苏打饼干，少食多餐，避免空腹。' },
      { title: '充足睡眠', detail: '孕早期容易疲劳嗜睡，中午可以小睡20-30分钟。' },
      { title: '减少电子屏幕', detail: '睡前1小时减少手机使用，有助于提高睡眠质量。' },
    ],
    diet: {
      recommended: ['姜茶(缓解孕吐)', '苏打饼干', '柠檬水', '小米粥', '蒸鸡蛋', '香蕉'],
      avoid: ['油腻重口味食物', '腌制食品', '含添加剂零食', '生冷食物', '浓茶'],
      nutrients: [
        { name: '叶酸', amount: '400-800μg/天' },
        { name: '蛋白质', amount: '60g/天' },
        { name: 'DHA', amount: '200mg/天' },
      ],
    },
    exercise: [
      { title: '慢走', detail: '每次15-20分钟，避免在人多拥挤的地方。' },
      { title: '凯格尔运动', detail: '开始练习盆底肌训练，每天3组，每组10次。' },
    ],
    supplies: [
      { icon: '💊', name: '叶酸/孕早期复合维生素', note: '持续补充叶酸至孕12周', priority: 'must' },
      { icon: '🍪', name: '苏打饼干', note: '放在床头，晨起缓解孕吐', priority: 'recommend' },
      { icon: '🧴', name: '温和护肤品', note: '更换为孕妇专用无添加护肤品', priority: 'recommend' },
      { icon: '👟', name: '平底舒适鞋', note: '避免穿高跟鞋，选择防滑平底鞋', priority: 'must' },
    ],
    checkups: [
      { name: '首次产检 (建档)', desc: '确认宫内妊娠、排除宫外孕，建立孕期档案。', importance: 'critical' },
      { name: '血常规/尿常规', desc: '了解基本身体状况，排除贫血等问题。', importance: 'normal' },
    ],
    mental: [
      { title: '孕吐期情绪波动正常', detail: '激素变化会导致情绪不稳，不要因此自责。' },
      { title: '减轻工作压力', detail: '与上级沟通，适当减少加班和高压任务。' },
    ],
    warnings: [
      { level: 'danger', text: '出现阴道出血或剧烈腹痛须立即就医。' },
      { level: 'warning', text: '避免泡热水澡和蒸桑拿，高温可能影响胚胎发育。' },
      { level: 'warning', text: '避免接触猫砂（弓形虫风险）。' },
    ],
    dadTips: [
      { title: '分担家务', detail: '主动承担做饭、清洁等家务，减少妻子的劳累。' },
      { title: '准备清淡饮食', detail: '学习几道清淡、缓解孕吐的食谱。' },
    ],
  },
  8: {
    baby: { size: '1.6cm (蓝莓大小)', weight: '约1g', development: '五官开始分化，小手小脚初见雏形，心脏已分四腔并开始跳动，每分钟约150次。' },
    routine: [
      { title: '少食多餐', detail: '每天5-6顿小餐，避免一次性吃太多加重孕吐。' },
      { title: '保持通风', detail: '室内多通风，减少刺激性气味对孕吐的触发。' },
      { title: '左侧卧位练习', detail: '可以开始习惯左侧卧位，有利于子宫血液循环。' },
    ],
    diet: {
      recommended: ['富含维生素B6的食物(土豆、香蕉)', '酸奶', '坚果（适量）', '清蒸鱼', '时令蔬菜', '红枣'],
      avoid: ['螃蟹', '甲鱼', '薏米', '桂圆', '山楂', '芦荟'],
      nutrients: [
        { name: '叶酸', amount: '400μg/天' },
        { name: '钙', amount: '800mg/天' },
        { name: '铁', amount: '25mg/天' },
        { name: 'DHA', amount: '200mg/天' },
      ],
    },
    exercise: [
      { title: '孕妇瑜伽', detail: '选择孕早期适合的轻柔瑜伽动作，避免扭转和挤压腹部。' },
      { title: '游泳', detail: '水温适宜(28-32°C)的情况下，游泳是极佳的孕期运动。' },
    ],
    supplies: [
      { icon: '🤢', name: '孕吐缓解手环', note: '穴位按压手环，辅助缓解恶心感', priority: 'optional' },
      { icon: '🧴', name: '妊娠纹预防霜', note: '从孕早期开始使用，预防效果更佳', priority: 'recommend' },
      { icon: '👙', name: '孕妇内衣', note: '选择无钢圈、棉质、可调节的孕妇内衣', priority: 'must' },
      { icon: '📱', name: '孕期管理App', note: '记录产检、体重、胎动等数据', priority: 'recommend' },
    ],
    checkups: [
      { name: 'B超检查', desc: '确认胎心胎芽，核实孕周，判断单胎/多胎。', importance: 'critical' },
    ],
    mental: [
      { title: '建立支持网络', detail: '加入孕妈群，分享经验、互相鼓励。' },
      { title: '阅读孕期书籍', detail: '了解孕期知识，减少未知带来的焦虑。' },
    ],
    warnings: [
      { level: 'danger', text: '持续性腹痛伴出血，需排除先兆流产或宫外孕。' },
      { level: 'warning', text: '避免长时间站立或久坐不动。' },
    ],
    dadTips: [
      { title: '陪伴B超检查', detail: '第一次听到宝宝心跳是特别的时刻，一起见证。' },
      { title: '了解孕期知识', detail: '一起阅读孕期书籍或参加准爸爸课程。' },
    ],
  },
  12: {
    baby: { size: '6cm (柠檬大小)', weight: '约14g', development: '所有主要器官已形成，手指和脚趾分开，可以做出握拳动作。进入相对安全的孕中期过渡阶段。' },
    routine: [
      { title: '孕吐逐渐减轻', detail: '大部分孕妈的孕吐会在12周后明显减轻，食欲逐渐恢复。' },
      { title: '适度增加活动', detail: '身体状态好转后可以适度增加活动量。' },
      { title: '开始记录体重', detail: '每周称重一次，整个孕期增重建议10-12.5kg。' },
    ],
    diet: {
      recommended: ['优质蛋白(鱼、禽、蛋、奶)', '深色蔬菜', '含铁食物(菠菜、猪肝)', '粗粮', '新鲜水果', '海带(适量)'],
      avoid: ['高糖饮料', '加工肉制品', '过量盐分', '含防腐剂食品'],
      nutrients: [
        { name: '叶酸', amount: '400μg/天(可在医生建议下停)' },
        { name: '钙', amount: '1000mg/天' },
        { name: '铁', amount: '25mg/天' },
        { name: '维生素C', amount: '促进铁吸收' },
      ],
    },
    exercise: [
      { title: '快走', detail: '每天30分钟快走，提高心肺功能。' },
      { title: '孕妇操', detail: '跟着专业视频做孕妇体操，增强体力。' },
    ],
    supplies: [
      { icon: '⚖️', name: '体重秤', note: '每周监测体重变化', priority: 'must' },
      { icon: '👗', name: '孕妇装', note: '开始准备宽松舒适的孕妇服装', priority: 'recommend' },
      { icon: '📋', name: '母子手册', note: '医院建档后领取，每次产检必带', priority: 'must' },
    ],
    checkups: [
      { name: 'NT检查 (11-13+6周)', desc: '通过B超测量胎儿颈后透明层厚度，筛查唐氏综合征风险。', importance: 'critical' },
      { name: '早期唐筛', desc: '抽血检查，评估胎儿染色体异常风险。', importance: 'critical' },
    ],
    mental: [
      { title: '分享好消息', detail: '度过最危险的孕早期，可以考虑向亲友分享怀孕喜讯。' },
      { title: '调整期望', detail: '每个孕妈的体验都不同，不要与他人过度比较。' },
    ],
    warnings: [
      { level: 'warning', text: 'NT检查有时间窗口(11-13+6周)，请提前预约。' },
      { level: 'warning', text: '进入孕中期前仍需注意避免剧烈运动。' },
    ],
    dadTips: [
      { title: '计划孕期旅行', detail: '孕中期(14-27周)是孕期旅行的最佳时间，可以开始规划。' },
      { title: '陪同NT检查', detail: '这是重要的排畸检查，陪伴在侧给予支持。' },
    ],
  },
  16: {
    baby: { size: '11.5cm (牛油果大小)', weight: '约100g', development: '开始长出细细的胎毛(胎脂)，骨骼逐渐硬化。眼睛可以感知光线，已有吞咽反射。' },
    routine: [
      { title: '调整睡姿', detail: '建议采用左侧卧位，可在膝间放一个枕头增加舒适度。' },
      { title: '规律作息', detail: '每天固定时间起床和睡觉，白天适当午休。' },
      { title: '注意口腔卫生', detail: '孕期牙龈容易发炎出血，注意刷牙和使用牙线。' },
    ],
    diet: {
      recommended: ['含钙丰富的乳制品', '深海鱼(三文鱼、鳕鱼)', '坚果(核桃、杏仁)', '牛肉', '绿叶蔬菜', '豆腐'],
      avoid: ['含汞高的鱼类(鲨鱼、旗鱼)', '未消毒乳制品', '过多甜食', '腌制咸菜'],
      nutrients: [
        { name: '钙', amount: '1000mg/天' },
        { name: 'DHA', amount: '200-300mg/天' },
        { name: '铁', amount: '30mg/天' },
        { name: '蛋白质', amount: '70g/天' },
      ],
    },
    exercise: [
      { title: '游泳', detail: '孕中期最推荐的运动，减轻关节负担，锻炼全身。' },
      { title: '孕妇瑜伽', detail: '每周2-3次，30-45分钟，注意不要过度伸展。' },
      { title: '凯格尔运动', detail: '持续练习盆底肌训练，为分娩做准备。' },
    ],
    supplies: [
      { icon: '🛏️', name: '孕妇枕', note: 'U型或C型孕妇枕，改善睡眠质量', priority: 'must' },
      { icon: '🧴', name: '妊娠纹按摩油', note: '每天涂抹腹部、胸部和大腿', priority: 'recommend' },
      { icon: '👗', name: '托腹裤', note: '有托腹设计的孕妇裤，减轻腰部负担', priority: 'must' },
      { icon: '🦷', name: '软毛牙刷', note: '孕期牙龈敏感，选用超软毛牙刷', priority: 'recommend' },
    ],
    checkups: [
      { name: '中期唐筛 (15-20周)', desc: '三联或四联筛查，评估唐氏综合征等风险。如有需要可做无创DNA。', importance: 'critical' },
    ],
    mental: [
      { title: '享受孕中期', detail: '孕中期通常是最舒适的阶段，好好享受这段时光。' },
      { title: '开始胎教', detail: '可以开始给宝宝放音乐、讲故事、与宝宝说话。' },
    ],
    warnings: [
      { level: 'warning', text: '唐筛有时间窗口，请按时检查。' },
      { level: 'warning', text: '注意预防便秘，多吃富含纤维的食物。' },
    ],
    dadTips: [
      { title: '参与胎教', detail: '每天花几分钟对着妻子的肚子和宝宝说话、唱歌。' },
      { title: '关注妻子情绪', detail: '孕期荷尔蒙变化大，多一些耐心和理解。' },
    ],
  },
  20: {
    baby: { size: '16cm (香蕉大小)', weight: '约300g', development: '宝宝开始活跃地活动，孕妈可以明显感受到胎动。味蕾形成，可以品尝到羊水的味道。皮肤被胎脂保护。' },
    routine: [
      { title: '开始数胎动', detail: '每天选择固定时间，记录1小时内胎动次数，正常应≥3次。' },
      { title: '适当抬腿', detail: '久坐后抬高双腿，缓解下肢水肿。' },
      { title: '充足饮水', detail: '每天8杯水，有助于预防便秘和尿路感染。' },
    ],
    diet: {
      recommended: ['含铁食物(红肉、黑木耳)', '含锌食物(牡蛎、瘦肉)', '红薯、玉米等粗粮', '猕猴桃、草莓(维生素C)', '芝麻(补钙)', '银耳'],
      avoid: ['人参、鹿茸等大补品', '过量水果(警惕妊娠糖尿病)', '碳酸饮料', '方便面等即食食品'],
      nutrients: [
        { name: '钙', amount: '1000-1200mg/天' },
        { name: '铁', amount: '30mg/天' },
        { name: '锌', amount: '11mg/天' },
        { name: '膳食纤维', amount: '25-30g/天' },
      ],
    },
    exercise: [
      { title: '散步', detail: '每天30-40分钟，选择空气好的公园或小区。' },
      { title: '骨盆底运动', detail: '加强盆底肌锻炼，每天做3-4组。' },
    ],
    supplies: [
      { icon: '🧦', name: '弹力袜', note: '预防静脉曲张，尤其是长时间站立时', priority: 'recommend' },
      { icon: '🧴', name: '身体乳', note: '缓解孕期皮肤干燥瘙痒', priority: 'recommend' },
      { icon: '📸', name: '孕妇写真', note: '可以开始预约孕妇写真，记录最美时刻', priority: 'optional' },
    ],
    checkups: [
      { name: '大排畸B超 (20-24周)', desc: '系统性筛查胎儿各器官结构是否异常，是整个孕期最重要的超声检查之一。', importance: 'critical' },
    ],
    mental: [
      { title: '感受胎动的喜悦', detail: '胎动是宝宝与你交流的方式，好好享受这份独特的感受。' },
      { title: '做好身材变化的心理准备', detail: '腹部明显隆起，体型变化是自然且美丽的。' },
    ],
    warnings: [
      { level: 'danger', text: '胎动突然减少或消失须立即就医。' },
      { level: 'warning', text: '大排畸检查务必按时完成(20-24周)。' },
    ],
    dadTips: [
      { title: '感受胎动', detail: '把手放在妻子肚子上，感受宝宝的活动，增进亲子感情。' },
      { title: '陪伴大排畸', detail: '这是一次重要的检查，你的陪伴是最好的支持。' },
    ],
  },
  24: {
    baby: { size: '30cm', weight: '约600g', development: '肺部开始发育表面活性物质，大脑快速发育，可以对外界声音做出反应。已形成睡眠-清醒周期。' },
    routine: [
      { title: '控制体重增长', detail: '孕中期每周增重约0.3-0.5kg为宜，避免增长过快。' },
      { title: '注意坐姿', detail: '使用腰靠垫支撑腰部，避免驼背弯腰。' },
      { title: '适度休息', detail: '工作每1-2小时起来活动5-10分钟。' },
    ],
    diet: {
      recommended: ['全谷物(燕麦、糙米)', '优质蛋白(鱼、虾、鸡胸肉)', '蔬菜沙拉', '酸奶', '坚果混合', '蓝莓、樱桃'],
      avoid: ['高糖高脂食物', '过量盐分', '含反式脂肪食品', '甜点(控制量)'],
      nutrients: [
        { name: '钙', amount: '1200mg/天' },
        { name: 'DHA', amount: '300mg/天' },
        { name: '铁', amount: '30mg/天' },
        { name: '维生素A', amount: '770μg/天' },
      ],
    },
    exercise: [
      { title: '水中有氧操', detail: '在水中做轻柔的有氧运动，减轻身体负担。' },
      { title: '轻度力量训练', detail: '使用小重量哑铃进行上肢训练，保持肌肉力量。' },
    ],
    supplies: [
      { icon: '🫗', name: '随身水壶', note: '随时补充水分，建议选择保温杯', priority: 'must' },
      { icon: '💺', name: '腰靠垫', note: '办公或居家使用，缓解腰部压力', priority: 'recommend' },
      { icon: '🧴', name: '防晒霜(孕妇专用)', note: '孕期易长妊娠斑，注意防晒', priority: 'recommend' },
    ],
    checkups: [
      { name: '糖耐量筛查 (24-28周)', desc: '口服75g葡萄糖后检测血糖，筛查妊娠期糖尿病。', importance: 'critical' },
      { name: '血常规', desc: '检查是否有贫血，必要时补铁。', importance: 'normal' },
    ],
    mental: [
      { title: '准备迎接孕晚期', detail: '开始了解分娩知识，参加孕妇课程。' },
      { title: '培养兴趣爱好', detail: '画画、编织、阅读等轻松的活动有助于保持好心情。' },
    ],
    warnings: [
      { level: 'warning', text: '糖筛检查需空腹，前一天晚8点后禁食。' },
      { level: 'warning', text: '注意预防妊娠糖尿病，控制甜食摄入。' },
    ],
    dadTips: [
      { title: '一起上课', detail: '参加医院的孕妇学校或在线课程，学习分娩和育儿知识。' },
      { title: '布置婴儿房', detail: '可以开始规划和布置宝宝的房间了。' },
    ],
  },
  28: {
    baby: { size: '38cm', weight: '约1100g', development: '眼睛可以睁开和闭合，大脑进入快速发育期。肺部继续成熟，开始练习呼吸动作。' },
    routine: [
      { title: '每天数胎动', detail: '每天早中晚各数1小时胎动，每小时≥3次，12小时≥30次为正常。' },
      { title: '左侧卧位睡觉', detail: '左侧卧位可改善子宫胎盘血流，减轻下腔静脉压迫。' },
      { title: '注意休息', detail: '减少工作强度，避免过度劳累。开始考虑产假安排。' },
    ],
    diet: {
      recommended: ['高铁食物(猪血、鸭血)', '高钙食物(牛奶、小鱼干)', '优质蛋白质', '新鲜蔬菜水果', '杂粮饭', '核桃(健脑)'],
      avoid: ['过咸食物(预防水肿)', '过甜食物', '太油腻的食物', '容易胀气的食物'],
      nutrients: [
        { name: '钙', amount: '1200mg/天' },
        { name: '铁', amount: '35mg/天' },
        { name: 'DHA', amount: '300mg/天' },
        { name: '蛋白质', amount: '80g/天' },
      ],
    },
    exercise: [
      { title: '散步', detail: '每天20-30分钟慢走，避免走太远。' },
      { title: '分娩球运动', detail: '坐在分娩球上做骨盆摇摆，帮助宝宝入盆。' },
      { title: '拉梅兹呼吸法', detail: '学习和练习分娩呼吸法，为分娩做准备。' },
    ],
    supplies: [
      { icon: '⚽', name: '分娩球', note: '辅助骨盆运动和减轻腰背痛', priority: 'recommend' },
      { icon: '🍼', name: '待产包(开始准备)', note: '整理妈妈和宝宝的住院用品', priority: 'must' },
      { icon: '🧸', name: '新生儿衣物', note: '准备纯棉的连体衣、帽子、袜子', priority: 'must' },
      { icon: '🚗', name: '安全座椅', note: '提前选购和安装婴儿安全座椅', priority: 'recommend' },
    ],
    checkups: [
      { name: '产检频率增加', desc: '从28周起改为每2周产检一次。', importance: 'critical' },
      { name: '胎位检查', desc: '确认宝宝是否已经头朝下(头位)。', importance: 'normal' },
    ],
    mental: [
      { title: '分娩焦虑', detail: '对分娩的担忧是正常的，可以通过了解分娩过程来减轻焦虑。' },
      { title: '给宝宝取名字', detail: '和家人一起讨论宝宝的名字，增添期待感。' },
    ],
    warnings: [
      { level: 'danger', text: '出现规律宫缩、阴道出血或破水须立即就医。' },
      { level: 'warning', text: '孕晚期避免远途旅行和长时间乘车。' },
      { level: 'warning', text: '注意观察是否有水肿加重、头痛、眼花等先兆子痫症状。' },
    ],
    dadTips: [
      { title: '练习开车路线', detail: '提前规划到医院的路线，准备好应急方案。' },
      { title: '参与待产包准备', detail: '一起整理待产包，了解每件物品的用途。' },
    ],
  },
  32: {
    baby: { size: '42cm', weight: '约1800g', development: '皮下脂肪增加，皮肤不再透明。指甲已长到指尖。大部分宝宝已经转为头朝下的胎位。' },
    routine: [
      { title: '注意宫缩', detail: '区分假性宫缩(不规律、不痛)和真宫缩(规律、逐渐加强)。' },
      { title: '每天数胎动', detail: '胎动规律性很重要，突然增多或减少都需要关注。' },
      { title: '准备待产包', detail: '详细列出清单，确保所有必需品已备齐。' },
    ],
    diet: {
      recommended: ['优质蛋白(鸡胸肉、鱼)', '含维生素K食物(西兰花)', '高钙食物', '含纤维食物(预防便秘)', '适量红枣', '黑芝麻糊'],
      avoid: ['高热量零食', '含酒精食品', '过于辛辣的食物', '过量水果(控制糖分)'],
      nutrients: [
        { name: '钙', amount: '1200mg/天' },
        { name: '铁', amount: '35-40mg/天' },
        { name: '蛋白质', amount: '85g/天' },
        { name: '维生素K', amount: '促进凝血功能' },
      ],
    },
    exercise: [
      { title: '慢走', detail: '减少运动强度，以慢走为主。' },
      { title: '呼吸练习', detail: '每天练习拉梅兹呼吸法15-20分钟。' },
      { title: '会阴按摩', detail: '从34周起可开始会阴按摩，减少分娩撕裂风险。' },
    ],
    supplies: [
      { icon: '🍼', name: '奶瓶和奶粉', note: '备一小罐新生儿奶粉以防母乳不足', priority: 'must' },
      { icon: '🧷', name: '产妇卫生巾', note: '产后恶露期使用，准备2-3包', priority: 'must' },
      { icon: '🧴', name: '婴儿洗护用品', note: '沐浴露、润肤乳、爽身粉(选天然款)', priority: 'must' },
      { icon: '🛏️', name: '婴儿床', note: '确保符合安全标准，无尖角、间距合适', priority: 'must' },
      { icon: '🚼', name: '尿不湿(NB码)', note: '准备2-3包新生儿尿不湿', priority: 'must' },
    ],
    checkups: [
      { name: '胎心监护', desc: '开始定期进行胎心监护(NST)。', importance: 'critical' },
      { name: '骨盆测量', desc: '评估骨盆大小，判断自然分娩的可能性。', importance: 'normal' },
    ],
    mental: [
      { title: '写分娩计划', detail: '思考并写下你的分娩偏好(分娩方式、镇痛、陪产等)。' },
      { title: '学习新生儿护理', detail: '了解换尿布、洗澡、喂奶等基础护理知识。' },
    ],
    warnings: [
      { level: 'danger', text: '孕32周前出现规律宫缩可能是早产信号，须紧急就医。' },
      { level: 'warning', text: '避免单独外出，随身携带手机和母子手册。' },
    ],
    dadTips: [
      { title: '学习新生儿护理', detail: '和妻子一起学习换尿布、冲奶粉等技能。' },
      { title: '确认产假安排', detail: '提前和公司沟通产假(陪产假)，确保能陪伴在侧。' },
    ],
  },
  36: {
    baby: { size: '47cm', weight: '约2700g', development: '肺部基本成熟，吸吮和吞咽功能完善。体重快速增长，皮下脂肪丰满，为出生后保暖做准备。' },
    routine: [
      { title: '每周产检', detail: '36周后改为每周产检一次，密切监测胎儿状况。' },
      { title: '准备分娩', detail: '确认待产包已完备，了解入院流程。' },
      { title: '保持充足睡眠', detail: '虽然可能不太舒服，但尽量保证休息。可以用多个枕头辅助。' },
    ],
    diet: {
      recommended: ['易消化的食物', '高蛋白低脂食物', '红枣、桂圆(补气血)', '银耳莲子汤', '鲫鱼汤', '山药'],
      avoid: ['容易胀气的食物(豆类过多)', '太辣的食物', '未经医生同意的催产食物', '过量食物(胃被压迫)'],
      nutrients: [
        { name: '蛋白质', amount: '85-90g/天' },
        { name: '铁', amount: '35-40mg/天' },
        { name: '钙', amount: '1200mg/天' },
        { name: '维生素C', amount: '85mg/天' },
      ],
    },
    exercise: [
      { title: '温和散步', detail: '每次15-20分钟，有人陪伴，避免走太远。' },
      { title: '爬楼梯(医生同意后)', detail: '有助于宝宝入盆，但要量力而行。' },
      { title: '蹲起运动', detail: '扶稳后缓慢蹲下再起立，锻炼大腿和骨盆力量。' },
    ],
    supplies: [
      { icon: '🏥', name: '入院待产包', note: '妈妈：睡衣、拖鞋、洗漱用品、产妇垫、吸管杯', priority: 'must' },
      { icon: '👶', name: '新生儿出院服', note: '纯棉连体衣、包被、帽子(按季节)', priority: 'must' },
      { icon: '🤱', name: '哺乳用品', note: '哺乳内衣、防溢乳垫、吸奶器(可选)', priority: 'must' },
      { icon: '📄', name: '证件文件', note: '身份证、医保卡、母子手册、产检资料', priority: 'must' },
      { icon: '🧴', name: '婴儿护臀膏', note: '预防新生儿红屁股', priority: 'recommend' },
    ],
    checkups: [
      { name: 'GBS筛查 (35-37周)', desc: 'B族链球菌筛查，阳性者需在分娩时使用抗生素预防。', importance: 'critical' },
      { name: '胎心监护', desc: '每周进行胎心监护，评估胎儿健康状况。', importance: 'critical' },
      { name: '胎位确认', desc: '确认胎位，臀位可能需要讨论分娩方式。', importance: 'critical' },
    ],
    mental: [
      { title: '准备好迎接宝宝', detail: '做好心理准备，宝宝随时可能到来。保持手机畅通。' },
      { title: '信任自己的身体', detail: '女性的身体天生具备分娩的能力，相信自己。' },
    ],
    warnings: [
      { level: 'danger', text: '破水(阴道流出清亮液体)须立即就医。' },
      { level: 'danger', text: '出现见红伴规律宫缩(每5分钟一次)，准备入院。' },
      { level: 'warning', text: '避免长途外出，随时准备去医院。' },
    ],
    dadTips: [
      { title: '随时待命', detail: '保持手机24小时开机，随时准备送妻子去医院。' },
      { title: '熟悉入院流程', detail: '提前了解医院的入院手续和产房位置。' },
      { title: '给妻子鼓励', detail: '多说鼓励的话，让她感受到你的支持和爱。' },
    ],
  },
  40: {
    baby: { size: '50cm', weight: '约3200-3400g', development: '宝宝已经足月，各器官发育完善，准备好来到这个世界。胎脂大部分被吸收，皮肤光滑粉嫩。' },
    routine: [
      { title: '密切关注临产征兆', detail: '见红、规律宫缩、破水，出现任何一个征兆都应准备入院。' },
      { title: '保持体力', detail: '充分休息，保证睡眠，为分娩储存体力。' },
      { title: '放松心态', detail: '顺其自然，超过预产期1-2周也属正常范围(在医生监测下)。' },
    ],
    diet: {
      recommended: ['巧克力/红牛(分娩时补充能量)', '容易消化的粥类', '鸡汤、排骨汤', '蜂蜜水', '香蕉(快速补充能量)', '红糖水'],
      avoid: ['油腻难消化食物', '过多食物(保持适度)'],
      nutrients: [
        { name: '碳水化合物', amount: '分娩前适量补充，提供能量' },
        { name: '水分', amount: '充足饮水' },
      ],
    },
    exercise: [
      { title: '缓慢散步', detail: '在家人陪伴下短距离散步，有助于促进宫缩。' },
      { title: '呼吸练习', detail: '最后复习分娩呼吸法，确保熟练掌握。' },
    ],
    supplies: [
      { icon: '🏥', name: '确认待产包完备', note: '再次检查所有物品是否齐全', priority: 'must' },
      { icon: '📞', name: '紧急联系人', note: '确保家人、医生的电话畅通', priority: 'must' },
      { icon: '🚗', name: '交通准备', note: '确认去医院的交通工具和路线', priority: 'must' },
      { icon: '📷', name: '相机/手机', note: '记录宝宝出生的珍贵瞬间', priority: 'recommend' },
    ],
    checkups: [
      { name: '胎心监护', desc: '每2-3天监测一次，确认胎儿安全。', importance: 'critical' },
      { name: '超过预产期评估', desc: '如超过40周，医生会评估是否需要催产。', importance: 'critical' },
    ],
    mental: [
      { title: '即将成为妈妈', detail: '享受最后的孕期时光，你已经做了所有能做的准备。' },
      { title: '相信医疗团队', detail: '有专业的医护人员保驾护航，放心把自己交给他们。' },
    ],
    warnings: [
      { level: 'danger', text: '超过42周仍未分娩须住院处理。' },
      { level: 'danger', text: '胎动明显减少立即就医。' },
      { level: 'warning', text: '分娩时保持冷静，按呼吸法配合医生指导。' },
    ],
    dadTips: [
      { title: '全程陪伴', detail: '分娩过程中陪伴在妻子身边，握住她的手，给予力量。' },
      { title: '做好后勤', detail: '准备好产后月子餐食材、联系月嫂(如需要)。' },
      { title: '迎接新生命', detail: '做好当爸爸的准备，这是人生最美好的时刻之一。' },
    ],
  },
}

// 补全中间周数的数据：通过就近取整来获取最接近的有数据的周
const dataWeeks = Object.keys(weeklyData).map(Number).sort((a, b) => a - b)

function getClosestWeek(w) {
  let closest = dataWeeks[0]
  let minDiff = Math.abs(w - closest)
  for (const dw of dataWeeks) {
    const diff = Math.abs(w - dw)
    if (diff < minDiff) {
      minDiff = diff
      closest = dw
    }
  }
  return closest
}

const currentData = computed(() => {
  const w = selectedWeek.value
  const closest = getClosestWeek(w)
  return weeklyData[closest]
})

// ========== 发育里程碑 ==========
const milestoneData = {
  1: ['受精卵开始分裂'],
  4: ['胚胎着床完成', '神经管开始形成', '心脏原始细胞形成'],
  8: ['心脏开始跳动', '五官开始分化', '手脚雏形出现'],
  12: ['所有主要器官已形成', '手指脚趾分开', '可以做出握拳动作'],
  16: ['骨骼逐渐硬化', '眼睛可以感知光线', '已有吞咽反射'],
  20: ['可以感受到胎动', '味蕾形成', '皮肤被胎脂保护'],
  24: ['大脑快速发育', '可以对声音做出反应', '形成睡眠-清醒周期'],
  28: ['眼睛可以睁闭', '肺部练习呼吸', '大脑快速发育期'],
  32: ['皮下脂肪增加', '指甲长到指尖', '大部分已转头位'],
  36: ['肺部基本成熟', '吸吮吞咽功能完善', '体重快速增长'],
  40: ['各器官发育完善', '准备来到这个世界', '皮肤光滑粉嫩'],
}

const currentMilestones = computed(() => {
  const closest = getClosestWeek(selectedWeek.value)
  return milestoneData[closest] || []
})

// ========== 推荐食谱 ==========
// BMI 计算（基于身高和最新体重）
const currentBmi = computed(() => {
  if (!heightInput.value || !weightRecords.value.length) return null
  const h = heightInput.value / 100 // cm -> m
  const w = weightRecords.value[weightRecords.value.length - 1].weight
  if (h <= 0 || w <= 0) return null
  return +(w / (h * h)).toFixed(1)
})

// BMI 分类
const bmiCategory = computed(() => {
  const bmi = currentBmi.value
  if (bmi === null) return null
  if (bmi < 18.5) return 'underweight'
  if (bmi < 24) return 'normal'
  if (bmi < 28) return 'overweight'
  return 'obese'
})

const bmiLabel = computed(() => {
  const map = { underweight: '偏瘦', normal: '正常', overweight: '偏胖', obese: '肥胖' }
  return bmiCategory.value ? map[bmiCategory.value] : ''
})

// 根据 BMI + 孕期阶段 计算每日热量目标
const dailyCalorieTarget = computed(() => {
  const trimester = currentTrimester.value.shortLabel
  // 基础热量根据 BMI 分类
  const baseCalories = {
    underweight: 2300,
    normal: 2100,
    overweight: 1900,
    obese: 1800,
  }
  const base = baseCalories[bmiCategory.value] || 2100
  // 孕期额外热量
  const extra = { '孕早期': 0, '孕中期': 300, '孕晚期': 450 }
  return base + (extra[trimester] || 0)
})

// 个性化食谱
const personalizedMeals = computed(() => {
  const cat = bmiCategory.value
  const trimester = currentTrimester.value.shortLabel
  const calories = dailyCalorieTarget.value
  const foods = currentData.value.diet.recommended

  if (!cat) {
    // 未填写身高或体重，返回默认食谱
    return [
      { icon: '🌅', time: '早餐', content: foods[0] || '营养均衡的早餐', calories: '' },
      { icon: '☀️', time: '午餐', content: foods[2] || '优质蛋白 + 蔬菜', calories: '' },
      { icon: '🍎', time: '加餐', content: foods[4] || '新鲜水果/坚果', calories: '' },
      { icon: '🌙', time: '晚餐', content: foods[1] || '清淡易消化', calories: '' },
    ]
  }

  // 按 BMI 分类定制食谱
  const mealPlans = {
    underweight: {
      '孕早期': [
        { icon: '🌅', time: '早餐', content: '全麦面包+鸡蛋+牛奶+坚果', calories: '~550kcal' },
        { icon: '☀️', time: '午餐', content: '糙米饭+红烧排骨+清炒菠菜+紫菜蛋花汤', calories: '~700kcal' },
        { icon: '🍎', time: '加餐', content: '酸奶+核桃+香蕉', calories: '~350kcal' },
        { icon: '🌙', time: '晚餐', content: '杂粮粥+清蒸鱼+凉拌木耳+豆腐汤', calories: '~600kcal' },
      ],
      '孕中期': [
        { icon: '🌅', time: '早餐', content: '燕麦粥+荷包蛋+牛油果+牛奶', calories: '~600kcal' },
        { icon: '☀️', time: '午餐', content: '米饭+黄焖鸡+蒜蓉西兰花+排骨汤', calories: '~800kcal' },
        { icon: '🍎', time: '加餐', content: '奶酪+混合坚果+红枣', calories: '~400kcal' },
        { icon: '🌙', time: '晚餐', content: '面条+番茄牛腩+蒸蛋+银耳莲子汤', calories: '~700kcal' },
      ],
      '孕晚期': [
        { icon: '🌅', time: '早餐', content: '小米红枣粥+肉包+鸡蛋+豆浆', calories: '~650kcal' },
        { icon: '☀️', time: '午餐', content: '米饭+红烧牛肉+炒青菜+鲫鱼汤', calories: '~850kcal' },
        { icon: '🍎', time: '加餐', content: '芝麻糊+核桃+猕猴桃', calories: '~400kcal' },
        { icon: '🌙', time: '晚餐', content: '杂粮饭+清蒸鲈鱼+炒虾仁+山药排骨汤', calories: '~750kcal' },
      ],
    },
    normal: {
      '孕早期': [
        { icon: '🌅', time: '早餐', content: '杂粮粥+水煮蛋+小番茄', calories: '~450kcal' },
        { icon: '☀️', time: '午餐', content: '米饭+清蒸鱼+清炒时蔬+紫菜汤', calories: '~650kcal' },
        { icon: '🍎', time: '加餐', content: '苹果+酸奶', calories: '~250kcal' },
        { icon: '🌙', time: '晚餐', content: '面条+番茄炒蛋+凉拌黄瓜+豆腐汤', calories: '~550kcal' },
      ],
      '孕中期': [
        { icon: '🌅', time: '早餐', content: '全麦吐司+鸡蛋+牛奶+蓝莓', calories: '~500kcal' },
        { icon: '☀️', time: '午餐', content: '糙米饭+宫保鸡丁+蒜蓉西兰花+冬瓜排骨汤', calories: '~750kcal' },
        { icon: '🍎', time: '加餐', content: '坚果+橙子+酸奶', calories: '~300kcal' },
        { icon: '🌙', time: '晚餐', content: '小米粥+清蒸虾+炒菠菜+海带汤', calories: '~650kcal' },
      ],
      '孕晚期': [
        { icon: '🌅', time: '早餐', content: '红枣小米粥+蒸蛋+牛奶+核桃', calories: '~550kcal' },
        { icon: '☀️', time: '午餐', content: '米饭+清炖鸡腿+炒丝瓜+豆腐鲫鱼汤', calories: '~800kcal' },
        { icon: '🍎', time: '加餐', content: '红枣+芝麻糊+草莓', calories: '~350kcal' },
        { icon: '🌙', time: '晚餐', content: '杂粮粥+蒸鳕鱼+炒芦笋+山药汤', calories: '~700kcal' },
      ],
    },
    overweight: {
      '孕早期': [
        { icon: '🌅', time: '早餐', content: '燕麦粥+水煮蛋+黄瓜', calories: '~380kcal' },
        { icon: '☀️', time: '午餐', content: '糙米饭(少量)+清蒸鸡胸+大拌菜+冬瓜汤', calories: '~550kcal' },
        { icon: '🍎', time: '加餐', content: '小番茄+脱脂酸奶', calories: '~200kcal' },
        { icon: '🌙', time: '晚餐', content: '杂粮粥+清蒸鱼+凉拌西芹+紫菜蛋汤', calories: '~480kcal' },
      ],
      '孕中期': [
        { icon: '🌅', time: '早餐', content: '全麦面包+鸡蛋白+脱脂牛奶+小番茄', calories: '~420kcal' },
        { icon: '☀️', time: '午餐', content: '糙米饭+白灼虾+蒜蓉菜心+萝卜排骨汤', calories: '~650kcal' },
        { icon: '🍎', time: '加餐', content: '苹果+少量坚果(10颗)', calories: '~250kcal' },
        { icon: '🌙', time: '晚餐', content: '荞麦面+番茄炒蛋+凉拌海带+豆腐汤', calories: '~550kcal' },
      ],
      '孕晚期': [
        { icon: '🌅', time: '早餐', content: '小米粥+蒸蛋+生菜+脱脂牛奶', calories: '~450kcal' },
        { icon: '☀️', time: '午餐', content: '杂粮饭+清蒸鳕鱼+炒西兰花+冬瓜汤', calories: '~700kcal' },
        { icon: '🍎', time: '加餐', content: '脱脂酸奶+蓝莓+少量核桃', calories: '~280kcal' },
        { icon: '🌙', time: '晚餐', content: '红薯粥+白灼鸡胸+炒芥兰+紫菜汤', calories: '~600kcal' },
      ],
    },
    obese: {
      '孕早期': [
        { icon: '🌅', time: '早餐', content: '燕麦粥(无糖)+水煮蛋白2个+黄瓜', calories: '~330kcal' },
        { icon: '☀️', time: '午餐', content: '杂粮饭(半碗)+清蒸鸡胸+大量蔬菜+冬瓜汤', calories: '~500kcal' },
        { icon: '🍎', time: '加餐', content: '小番茄+脱脂酸奶(无糖)', calories: '~180kcal' },
        { icon: '🌙', time: '晚餐', content: '蔬菜沙拉+清蒸鱼+紫菜蛋汤', calories: '~430kcal' },
      ],
      '孕中期': [
        { icon: '🌅', time: '早餐', content: '全麦面包1片+鸡蛋白+脱脂牛奶+生菜', calories: '~380kcal' },
        { icon: '☀️', time: '午餐', content: '糙米饭(半碗)+白灼虾+蒜蓉菜心+萝卜汤', calories: '~580kcal' },
        { icon: '🍎', time: '加餐', content: '苹果半个+脱脂酸奶', calories: '~200kcal' },
        { icon: '🌙', time: '晚餐', content: '荞麦面(少量)+清蒸鱼+凉拌海带+豆腐汤', calories: '~500kcal' },
      ],
      '孕晚期': [
        { icon: '🌅', time: '早餐', content: '小米粥(稀)+蒸蛋+黄瓜+脱脂牛奶', calories: '~400kcal' },
        { icon: '☀️', time: '午餐', content: '杂粮饭(半碗)+清蒸鳕鱼+炒西兰花+冬瓜汤', calories: '~630kcal' },
        { icon: '🍎', time: '加餐', content: '脱脂酸奶+少量蓝莓', calories: '~220kcal' },
        { icon: '🌙', time: '晚餐', content: '蔬菜沙拉+清蒸鸡胸+紫菜汤', calories: '~530kcal' },
      ],
    },
  }

  return mealPlans[cat]?.[trimester] || mealPlans.normal[trimester] || [
    { icon: '🌅', time: '早餐', content: foods[0] || '营养均衡的早餐', calories: '' },
    { icon: '☀️', time: '午餐', content: foods[2] || '优质蛋白 + 蔬菜', calories: '' },
    { icon: '🍎', time: '加餐', content: foods[4] || '新鲜水果/坚果', calories: '' },
    { icon: '🌙', time: '晚餐', content: foods[1] || '清淡易消化', calories: '' },
  ]
})

// 每日增重建议
const weightGainAdvice = computed(() => {
  const cat = bmiCategory.value
  if (!cat) return null
  const advice = {
    underweight: { total: '12.5-18kg', weekly: '0.44-0.58kg/周(中晚期)' },
    normal: { total: '11.5-16kg', weekly: '0.35-0.50kg/周(中晚期)' },
    overweight: { total: '7-11.5kg', weekly: '0.23-0.33kg/周(中晚期)' },
    obese: { total: '5-9kg', weekly: '0.17-0.27kg/周(中晚期)' },
  }
  return advice[cat]
})

// ========== 营养进度条 ==========
function nutrientProgress(index) {
  const progressMap = [85, 70, 60, 75]
  return progressMap[index % 4]
}

// ========== 产检时间线 ==========
const allCheckups = [
  { name: '首次产检 (建档)', desc: '确认宫内妊娠、排除宫外孕', importance: 'critical', weekRange: '4-8周', week: 4, trimester: '孕早期' },
  { name: 'B超检查', desc: '确认胎心胎芽，核实孕周', importance: 'critical', weekRange: '6-8周', week: 8, trimester: '孕早期' },
  { name: 'NT检查', desc: '筛查唐氏综合征风险', importance: 'critical', weekRange: '11-13+6周', week: 12, trimester: '孕早期' },
  { name: '中期唐筛', desc: '评估染色体异常风险', importance: 'critical', weekRange: '15-20周', week: 16, trimester: '孕中期' },
  { name: '大排畸B超', desc: '系统性筛查胎儿器官结构', importance: 'critical', weekRange: '20-24周', week: 22, trimester: '孕中期' },
  { name: '糖耐量筛查', desc: '筛查妊娠期糖尿病', importance: 'critical', weekRange: '24-28周', week: 26, trimester: '孕中期' },
  { name: '产检(每2周)', desc: '常规产检，胎位检查', importance: 'normal', weekRange: '28-36周', week: 30, trimester: '孕晚期' },
  { name: '胎心监护', desc: '定期胎心监护', importance: 'critical', weekRange: '32周起', week: 32, trimester: '孕晚期' },
  { name: 'GBS筛查', desc: 'B族链球菌筛查', importance: 'critical', weekRange: '35-37周', week: 36, trimester: '孕晚期' },
  { name: '每周产检', desc: '密切监测胎儿状况', importance: 'critical', weekRange: '36-40周', week: 38, trimester: '孕晚期' },
]

const trimesterCheckups = computed(() => {
  const t = currentTrimester.value.shortLabel
  return allCheckups
    .filter(c => c.trimester === t)
    .map(c => ({
      ...c,
      isCurrent: Math.abs(c.week - selectedWeek.value) <= 2,
      isPast: c.week < selectedWeek.value - 2,
    }))
})

const nextCheckup = computed(() => {
  const w = selectedWeek.value
  const upcoming = allCheckups.find(c => c.week >= w)
  return upcoming || null
})

// ========== 待产物品清单 ==========
const supplyCategories = [
  { key: 'mom', label: '妈妈用品', icon: '👩' },
  { key: 'baby', label: '宝宝用品', icon: '👶' },
  { key: 'docs', label: '证件文件', icon: '📄' },
  { key: 'other', label: '其他', icon: '📦' },
]

const allSupplyItems = [
  { id: 's1', icon: '👗', name: '孕妇装/哺乳衣', note: '宽松舒适，方便哺乳', priority: 'must', category: 'mom' },
  { id: 's2', icon: '👙', name: '哺乳内衣', note: '无钢圈，方便开合', priority: 'must', category: 'mom' },
  { id: 's3', icon: '🧴', name: '产妇卫生巾', note: '产后恶露使用，准备2-3包', priority: 'must', category: 'mom' },
  { id: 's4', icon: '🩴', name: '防滑拖鞋', note: '住院期间使用', priority: 'must', category: 'mom' },
  { id: 's5', icon: '🧴', name: '洗漱用品', note: '牙刷、毛巾、洗发水等', priority: 'must', category: 'mom' },
  { id: 's6', icon: '🥤', name: '吸管杯', note: '产后躺着也能喝水', priority: 'recommend', category: 'mom' },
  { id: 's7', icon: '🤱', name: '吸奶器', note: '开奶/背奶使用', priority: 'recommend', category: 'mom' },
  { id: 's8', icon: '🧷', name: '防溢乳垫', note: '防止溢奶弄湿衣物', priority: 'recommend', category: 'mom' },
  { id: 'b1', icon: '👶', name: '新生儿连体衣', note: '纯棉，准备3-5件', priority: 'must', category: 'baby' },
  { id: 'b2', icon: '🧒', name: '婴儿帽/袜子', note: '保暖用，各2-3双', priority: 'must', category: 'baby' },
  { id: 'b3', icon: '🚼', name: '纸尿裤(NB码)', note: '准备2-3包', priority: 'must', category: 'baby' },
  { id: 'b4', icon: '🍼', name: '奶瓶+奶粉', note: '备用，以防母乳不足', priority: 'must', category: 'baby' },
  { id: 'b5', icon: '🧴', name: '婴儿洗护用品', note: '沐浴露、润肤乳', priority: 'must', category: 'baby' },
  { id: 'b6', icon: '🛏️', name: '包被/襁褓', note: '出院及日常使用', priority: 'must', category: 'baby' },
  { id: 'b7', icon: '🧸', name: '婴儿床', note: '符合安全标准', priority: 'recommend', category: 'baby' },
  { id: 'b8', icon: '🚗', name: '安全座椅', note: '出院回家使用', priority: 'recommend', category: 'baby' },
  { id: 'd1', icon: '🪪', name: '身份证', note: '夫妻双方', priority: 'must', category: 'docs' },
  { id: 'd2', icon: '💳', name: '医保卡', note: '医保报销使用', priority: 'must', category: 'docs' },
  { id: 'd3', icon: '📋', name: '母子手册', note: '每次产检必带', priority: 'must', category: 'docs' },
  { id: 'd4', icon: '📄', name: '产检资料', note: '所有产检报告', priority: 'must', category: 'docs' },
  { id: 'd5', icon: '💰', name: '现金/银行卡', note: '以备不时之需', priority: 'recommend', category: 'docs' },
  { id: 'o1', icon: '📷', name: '相机/手机', note: '记录宝宝出生瞬间', priority: 'recommend', category: 'other' },
  { id: 'o2', icon: '🔌', name: '充电器/充电宝', note: '住院期间使用', priority: 'recommend', category: 'other' },
  { id: 'o3', icon: '🍫', name: '零食/巧克力', note: '分娩时补充能量', priority: 'optional', category: 'other' },
  { id: 'o4', icon: '📞', name: '紧急联系人清单', note: '家人、医生电话', priority: 'must', category: 'other' },
]

const supplyChecked = ref({})

// ========== 防抖保存到后端 ==========
let saveTimer = null
function debouncedSave(payload) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    savePregnancyData(payload).catch(() => { /* 静默失败 */ })
  }, 800)
}

onMounted(async () => {
  try {
    const res = await fetchPregnancyData()
    const data = res.data?.data
    if (data) {
      if (data.lmpDate) lmpDate.value = data.lmpDate
      if (data.selectedWeek) selectedWeek.value = data.selectedWeek
      if (data.height) heightInput.value = data.height
      try {
        const wr = JSON.parse(data.weightRecords)
        if (Array.isArray(wr) && wr.length) weightRecords.value = wr
      } catch (e) { /* 忽略 */ }
      try {
        const sc = JSON.parse(data.supplyChecked)
        if (sc && typeof sc === 'object' && Object.keys(sc).length) supplyChecked.value = sc
      } catch (e) { /* 忽略 */ }
    }
  } catch (e) { /* 忽略 */ }
  // 等待一个 tick 让 autoWeek watcher 完成触发后再开启保存
  await nextTick()
  initialized.value = true
})

function getCatItems(catKey) {
  return allSupplyItems.filter(item => item.category === catKey)
}

function getCatChecked(catKey) {
  return getCatItems(catKey).filter(item => supplyChecked.value[item.id]).length
}

function toggleSupply(id) {
  supplyChecked.value[id] = !supplyChecked.value[id]
  debouncedSave({ supplyChecked: JSON.stringify(supplyChecked.value) })
}

const totalSupplyCount = allSupplyItems.length
const checkedCount = computed(() => Object.values(supplyChecked.value).filter(Boolean).length)
const preparePercent = computed(() => Math.round((checkedCount.value / totalSupplyCount) * 100))

// ========== 体重记录 ==========
const weightRecords = ref([])

function addWeight() {
  if (!weightInput.value || weightInput.value < 30 || weightInput.value > 200) return
  const date = new Date().toISOString().slice(0, 10)
  weightRecords.value.push({
    weight: weightInput.value,
    week: selectedWeek.value,
    date,
  })
  debouncedSave({ weightRecords: JSON.stringify(weightRecords.value) })
  syncWeightToCalendar(weightInput.value, date)
  weightInput.value = null
}

function deleteWeight(index) {
  if (index < 0 || index >= weightRecords.value.length) return
  weightRecords.value.splice(index, 1)
  debouncedSave({ weightRecords: JSON.stringify(weightRecords.value) })
}

function saveHeight() {
  if (heightInput.value && heightInput.value >= 100 && heightInput.value <= 220) {
    debouncedSave({ height: heightInput.value })
  }
}

// ========== 日历联动 ==========
const syncingCheckup = ref({})
const syncedDueDate = ref(false)

// 根据末次月经和孕周计算产检日期
function getCheckupDate(weekNum) {
  if (!lmpDate.value) return null
  const lmp = new Date(lmpDate.value)
  const d = new Date(lmp)
  d.setDate(d.getDate() + weekNum * 7)
  return d
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

// 同步单个产检到日历
async function syncCheckupToCalendar(item) {
  if (!lmpDate.value) return
  const date = getCheckupDate(item.week)
  if (!date) return
  const key = formatDateKey(date)
  syncingCheckup.value[item.name] = true
  try {
    await saveCalendarNoteApi({
      date: key,
      remark: `🏥 ${item.name} - ${item.desc}`,
      weatherJson: null,
      location: null,
    })
    syncingCheckup.value[item.name] = 'done'
  } catch (e) {
    syncingCheckup.value[item.name] = false
  }
}

// 同步所有产检到日历
async function syncAllCheckupsToCalendar() {
  if (!lmpDate.value) return
  for (const item of allCheckups) {
    await syncCheckupToCalendar(item)
  }
}

// 同步预产期到日历
async function syncDueDateToCalendar() {
  if (!dueDate.value) return
  const key = formatDateKey(dueDate.value)
  syncedDueDate.value = 'syncing'
  try {
    await saveCalendarNoteApi({
      date: key,
      remark: `🎉 预产期 - 宝宝预计今天到来！`,
      weatherJson: null,
      location: null,
    })
    syncedDueDate.value = 'done'
  } catch (e) {
    syncedDueDate.value = false
  }
}

// 体重记录时同步到日历
async function syncWeightToCalendar(weight, date) {
  try {
    const d = new Date(date)
    const key = formatDateKey(d)
    await saveCalendarNoteApi({
      date: key,
      remark: `⚖️ 孕期体重记录：${weight}kg（第${selectedWeek.value}周）`,
      weatherJson: null,
      location: null,
    })
  } catch (e) { /* 忽略 */ }
}

function weightBarHeight(weight) {
  const weights = weightRecords.value.map(r => r.weight)
  const min = Math.min(...weights) - 2
  const max = Math.max(...weights) + 2
  if (max === min) return 50
  return ((weight - min) / (max - min)) * 80 + 10
}

// ========== 运动强度 ==========
function exerciseIntensity(title) {
  const highIntensity = ['快走', '游泳', '水中有氧操', '爬楼梯']
  const medIntensity = ['散步', '孕妇瑜伽', '孕妇操', '慢走', '分娩球运动', '蹲起运动', '轻度力量训练', '骨盆底运动']
  if (highIntensity.some(k => title.includes(k))) return '中高'
  if (medIntensity.some(k => title.includes(k))) return '中等'
  return '低'
}

// ========== 快速分享 ==========
const shareText = computed(() => {
  const d = currentData.value
  const f = currentFruit.value
  return `🤰 我现在怀孕第${selectedWeek.value}周啦！\n` +
    `${currentTrimester.value.shortLabel} · 宝宝像${f.emoji}${f.name}(${f.desc})\n` +
    `📏 大小：${d.baby.size} · ⚖️ 体重：${d.baby.weight}\n` +
    `💡 ${d.baby.development}`
})

function copyShareText() {
  navigator.clipboard.writeText(shareText.value).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}
</script>

<style scoped>
.pregnancy-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ========== 英雄区 ========== */
.hero-section {
  border-radius: 22px;
  padding: 2px;
  transition: background 0.5s ease;
}

.hero-glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 20px;
}

.progress-ring-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 8;
}

.ring-progress {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease;
}

.ring-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-week {
  font-size: 36px;
  font-weight: 800;
  color: var(--ink, #1d1d1f);
  line-height: 1;
}

.ring-label {
  font-size: 14px;
  color: var(--ink-muted, #6e6e73);
  margin-top: 2px;
}

.ring-trimester {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-muted, #6e6e73);
  margin-top: 4px;
}

.hero-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-fruit {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fruit-emoji {
  font-size: 36px;
  line-height: 1;
}

.fruit-name {
  font-size: 15px;
  color: var(--ink, #1d1d1f);
}

.fruit-desc {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
}

.hero-due {
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.03);
}

.due-label {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
}

.due-days {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink, #1d1d1f);
  margin-top: 2px;
}

.due-number {
  font-size: 28px;
  font-weight: 800;
}

.due-date {
  font-size: 12px;
  color: var(--ink-muted, #6e6e73);
  margin-top: 2px;
}

.due-hint {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
  margin-top: 4px;
}

/* ========== LMP 输入行 ========== */
.lmp-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.lmp-label {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
  white-space: nowrap;
}

.lmp-input {
  padding: 6px 12px;
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 10px;
  font-size: 14px;
  background: var(--canvas, #fff);
  color: var(--ink, #1d1d1f);
  transition: border-color 0.2s;
}

.lmp-input:focus {
  outline: none;
  border-color: #0066cc;
}

.auto-week-tag {
  font-size: 13px;
  color: #0066cc;
  background: #eff6ff;
  padding: 4px 10px;
  border-radius: 8px;
}

/* ========== 孕周滑块 ========== */
.week-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.slider-label {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink, #1d1d1f);
  min-width: 80px;
}

.slider-track-wrapper {
  flex: 1;
  position: relative;
  height: 6px;
}

.slider-track-bg {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  overflow: hidden;
  display: flex;
}

.slider-track-t1 {
  flex: 12;
  background: linear-gradient(90deg, #f43f5e, #fb7185);
}

.slider-track-t2 {
  flex: 15;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.slider-track-t3 {
  flex: 13;
  background: linear-gradient(90deg, #10b981, #34d399);
}

.week-slider {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  margin: 0;
}

.week-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #1d1d1f;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: grab;
}

.slider-range {
  font-size: 12px;
  color: var(--ink-muted, #6e6e73);
  white-space: nowrap;
}

/* ========== 迷你日历 ========== */
.mini-calendar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cal-dot {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.3;
}

.cal-dot.t1 { background: #f43f5e; }
.cal-dot.t2 { background: #f59e0b; }
.cal-dot.t3 { background: #10b981; }
.cal-dot.past { opacity: 0.6; }
.cal-dot.active {
  opacity: 1;
  transform: scale(1.4);
  border-radius: 4px;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
}

.cal-dot:hover {
  opacity: 0.8;
  transform: scale(1.2);
}

/* ========== Tab 导航 ========== */
.tab-bar {
  display: flex;
  background: var(--canvas, #fff);
  border-radius: 14px;
  padding: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--hairline, #e0e0e0);
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 8px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted, #6e6e73);
  cursor: pointer;
  transition: all 0.25s ease;
  border-bottom: 2px solid transparent;
}

.tab-item.active {
  background: rgba(0, 0, 0, 0.04);
  font-weight: 700;
}

.tab-item:hover:not(.active) {
  background: rgba(0, 0, 0, 0.02);
}

.tab-icon { font-size: 16px; }

/* ========== Tab 过渡 ========== */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ========== 面板卡片 ========== */
.panel-card {
  background: var(--canvas, #fff);
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s;
}

.panel-card:hover {
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.1);
}

.accent-border {
  border-left: 4px solid #e5e7eb;
  transition: border-left-color 0.5s ease;
}

.dad-card {
  border-left: 4px solid #2563eb;
}

.avoid-card {
  border-left: 4px solid #dc2626;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.section-icon { font-size: 22px; }

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink, #1d1d1f);
  flex: 1;
}

.cat-count {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
  font-weight: 600;
}

/* ========== 宝宝发育 ========== */
.baby-metrics {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.metric-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: 14px;
  background: var(--canvas-parchment, #f5f5f7);
  border: 1px solid var(--hairline, #e0e0e0);
  transition: transform 0.2s;
}

.metric-box:hover { transform: translateY(-2px); }
.metric-icon { font-size: 20px; margin-bottom: 4px; }
.metric-label { font-size: 12px; color: var(--ink-muted, #6e6e73); }
.metric-value { font-size: 18px; font-weight: 700; margin-top: 2px; transition: color 0.5s; }

.baby-dev-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--ink, #1d1d1f);
  margin: 0 0 12px;
}

.milestones { margin-top: 4px; }

.milestone-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted, #6e6e73);
  margin-bottom: 8px;
}

.milestone-list { display: flex; flex-direction: column; gap: 6px; }

.milestone-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--ink, #1d1d1f);
}

.milestone-check { font-size: 14px; }

/* ========== 提示列表 ========== */
.tip-list { display: flex; flex-direction: column; gap: 12px; }

.tip-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.tip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
  transition: background 0.5s;
}

.tip-content { flex: 1; }
.tip-title { font-size: 14px; font-weight: 600; color: var(--ink, #1d1d1f); }
.tip-desc { font-size: 13px; color: var(--ink-muted, #6e6e73); margin-top: 2px; line-height: 1.6; }

/* ========== 警告 ========== */
.warning-list { display: flex; flex-direction: column; gap: 8px; }

.warning-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
}

.warning-item.danger { background: #fef2f2; border: 1px solid #fecaca; }
.warning-item.warning { background: #fffbeb; border: 1px solid #fde68a; }

.warning-badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.warning-item.danger .warning-badge { background: #dc2626; color: #fff; }
.warning-item.warning .warning-badge { background: #f59e0b; color: #fff; }
.warning-text { color: var(--ink, #1d1d1f); }

/* ========== 饮食标签 ========== */
.food-tags { display: flex; flex-wrap: wrap; gap: 8px; }

.food-tag {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  transition: transform 0.15s;
}

.food-tag:hover { transform: scale(1.05); }
.food-tag.recommend { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.food-tag.avoid { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

/* ========== 营养进度条 ========== */
.nutrient-bars { display: flex; flex-direction: column; gap: 14px; }

.nutrient-bar-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.nutrient-bar-name { font-size: 14px; font-weight: 600; color: var(--ink, #1d1d1f); }
.nutrient-bar-amount { font-size: 13px; color: var(--ink-muted, #6e6e73); }

.nutrient-bar-track {
  height: 8px;
  border-radius: 4px;
  background: #e5e7eb;
  overflow: hidden;
}

.nutrient-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}

/* ========== 推荐食谱 ========== */
.meal-cards { display: flex; flex-direction: column; gap: 10px; }

.meal-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--canvas-parchment, #f5f5f7);
  border: 1px solid var(--hairline, #e0e0e0);
  transition: transform 0.15s;
}

.meal-card:hover { transform: translateX(4px); }
.meal-icon { font-size: 24px; }
.meal-time { font-size: 13px; font-weight: 600; color: var(--ink, #1d1d1f); }
.meal-content { font-size: 13px; color: var(--ink-muted, #6e6e73); }

/* ========== 产检提醒 ========== */
.next-checkup-card {
  color: #fff;
  border: none;
  padding: 24px;
}

.next-checkup-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.next-checkup-name { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
.next-checkup-desc { font-size: 14px; opacity: 0.9; line-height: 1.5; }

.checkup-timeline { display: flex; flex-direction: column; }

.timeline-item {
  display: flex;
  gap: 14px;
  padding: 12px 0;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  font-weight: 700;
  transition: all 0.3s;
}

.timeline-item.past .timeline-dot { background: #9ca3af; }

.timeline-line {
  flex: 1;
  width: 2px;
  background: #e5e7eb;
  margin: 4px 0;
}

.timeline-content { flex: 1; }

.timeline-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.timeline-name { font-size: 14px; font-weight: 600; color: var(--ink, #1d1d1f); }

.timeline-importance {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}

.timeline-importance.critical { background: #fef2f2; color: #dc2626; }
.timeline-importance.normal { background: #f0fdf4; color: #16a34a; }
.timeline-desc { font-size: 13px; color: var(--ink-muted, #6e6e73); line-height: 1.5; }
.timeline-week { font-size: 12px; color: var(--ink-muted, #6e6e73); margin-top: 4px; font-style: italic; display: flex; align-items: center; gap: 8px; }

/* ========== 日历同步按钮 ========== */
.sync-calendar-btn {
  margin-top: 8px;
  padding: 5px 14px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  backdrop-filter: blur(4px);
  transition: all 0.2s;
}
.sync-calendar-btn:hover { background: rgba(255, 255, 255, 0.4); }
.sync-calendar-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.sync-calendar-btn.synced { background: rgba(255, 255, 255, 0.35); }

.sync-all-btn {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: var(--canvas, #fff);
  color: var(--ink-muted, #6e6e73);
  transition: all 0.2s;
  white-space: nowrap;
}
.sync-all-btn:hover { background: var(--canvas-parchment, #f5f5f7); color: var(--ink, #1d1d1f); }

.sync-item-btn {
  padding: 2px 8px;
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  background: var(--canvas, #fff);
  color: var(--ink-muted, #6e6e73);
  transition: all 0.2s;
}
.sync-item-btn:hover { background: var(--canvas-parchment, #f5f5f7); }
.sync-item-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.sync-item-btn.synced { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
.empty-tip { font-size: 14px; color: var(--ink-muted, #6e6e73); text-align: center; padding: 16px; }

/* ========== 准备进度 ========== */
.prepare-progress-bar {
  height: 10px;
  border-radius: 5px;
  background: #e5e7eb;
  overflow: hidden;
  margin-bottom: 8px;
}

.prepare-progress-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease;
}

.prepare-progress-text {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
  text-align: center;
}

/* ========== 物品清单 ========== */
.supply-checklist { display: flex; flex-direction: column; gap: 8px; }

.supply-check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--hairline, #e0e0e0);
  background: var(--canvas-parchment, #f5f5f7);
  cursor: pointer;
  transition: all 0.2s;
}

.supply-check-item:hover { background: #f0f0f2; }

.supply-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #10b981;
  flex-shrink: 0;
}

.supply-check-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: opacity 0.3s;
}

.supply-check-info.done { opacity: 0.5; text-decoration: line-through; }
.supply-check-icon { font-size: 20px; }
.supply-check-name { font-size: 14px; font-weight: 600; color: var(--ink, #1d1d1f); }
.supply-check-note { font-size: 12px; color: var(--ink-muted, #6e6e73); }

.supply-priority-tag {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.supply-priority-tag.must { background: #fef2f2; color: #dc2626; }
.supply-priority-tag.recommend { background: #eff6ff; color: #2563eb; }
.supply-priority-tag.optional { background: #f9fafb; color: #6b7280; }

/* ========== 运动建议 ========== */
.exercise-list { display: flex; flex-direction: column; gap: 10px; }

.exercise-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--canvas-parchment, #f5f5f7);
  border: 1px solid var(--hairline, #e0e0e0);
}

.exercise-intensity {
  padding: 4px 10px;
  border-radius: 8px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.exercise-name { font-size: 14px; font-weight: 600; color: var(--ink, #1d1d1f); }
.exercise-desc { font-size: 13px; color: var(--ink-muted, #6e6e73); margin-top: 2px; }

/* ========== 身高输入 & BMI ========== */
.height-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.height-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink, #1d1d1f);
  white-space: nowrap;
}

.height-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink, #1d1d1f);
}

.height-edit-btn {
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  background: var(--canvas, #fff);
  color: var(--ink-muted, #6e6e73);
  transition: all 0.2s;
}
.height-edit-btn:hover { background: var(--canvas-parchment, #f5f5f7); color: var(--ink, #1d1d1f); }

.weight-delete-btn {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: #f43f5e;
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  padding: 0;
}
.weight-bar-wrapper:hover .weight-delete-btn { opacity: 1; }

.height-input {
  width: 100px;
  padding: 6px 12px;
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 10px;
  font-size: 14px;
  background: var(--canvas, #fff);
  color: var(--ink, #1d1d1f);
}

.height-input:focus { outline: none; border-color: #0066cc; }

.height-unit {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
}

.bmi-tag {
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  margin-left: auto;
}

.bmi-tag.underweight { background: #eff6ff; color: #2563eb; }
.bmi-tag.normal { background: #f0fdf4; color: #16a34a; }
.bmi-tag.overweight { background: #fffbeb; color: #d97706; }
.bmi-tag.obese { background: #fef2f2; color: #dc2626; }

.weight-advice {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--canvas-parchment, #f5f5f7);
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
  margin-bottom: 12px;
}

.advice-divider { color: #d1d5db; }

/* ========== 食谱热量 & BMI 提示 ========== */
.calorie-badge {
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
}

.bmi-diet-hint {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--canvas-parchment, #f5f5f7);
  margin-bottom: 12px;
  line-height: 1.5;
}

.meal-calories {
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-muted, #6e6e73);
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
}

/* ========== 体重记录 ========== */
.weight-input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.weight-input {
  flex: 1;
  padding: 8px 14px;
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 10px;
  font-size: 14px;
  background: var(--canvas, #fff);
  color: var(--ink, #1d1d1f);
}

.weight-input:focus { outline: none; border-color: #0066cc; }

.weight-add-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.weight-add-btn:hover { opacity: 0.85; }

.weight-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 120px;
  padding: 8px 0;
}

.weight-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  position: relative;
}

.weight-bar {
  width: 100%;
  max-width: 28px;
  border-radius: 6px 6px 0 0;
  transition: height 0.4s ease;
  min-height: 4px;
}

.weight-bar-value { font-size: 10px; color: var(--ink-muted, #6e6e73); margin-bottom: 4px; }
.weight-bar-label { font-size: 10px; color: var(--ink-muted, #6e6e73); margin-top: 4px; }
.weight-summary { font-size: 13px; color: var(--ink-muted, #6e6e73); text-align: center; margin-top: 8px; }
.weight-empty { font-size: 13px; color: var(--ink-muted, #6e6e73); text-align: center; padding: 16px; }

/* ========== 快速分享 ========== */
.share-preview {
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink, #1d1d1f);
  background: var(--canvas-parchment, #f5f5f7);
  padding: 12px 14px;
  border-radius: 12px;
  white-space: pre-line;
  margin: 0 0 12px;
}

.share-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.share-btn:hover { opacity: 0.85; }

/* ========== 响应式 ========== */
@media (max-width: 640px) {
  .hero-main {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .progress-ring-wrapper {
    width: 120px;
    height: 120px;
  }

  .ring-week { font-size: 28px; }
  .hero-fruit { justify-content: center; }
  .hero-due { text-align: center; }

  .panel-card {
    border-radius: 14px;
    padding: 14px;
  }

  .tab-item {
    flex-direction: column;
    gap: 2px;
    padding: 8px 4px;
  }

  .tab-text { font-size: 11px; }

  .week-slider-row { flex-wrap: wrap; }

  .lmp-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .baby-metrics { flex-direction: column; }
}
</style>