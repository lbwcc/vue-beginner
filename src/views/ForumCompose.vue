<template>
  <AppShell
    title="发布帖子"
    eyebrow=""
    subtitle=""
    active-section="forum"
  >
    <template #header-actions>
      <div class="header-actions">
        <button class="ghost-btn header-back-btn" type="button" @click="goBack">返回</button>
        <button class="primary-btn header-submit-btn" type="button" :disabled="publishing" @click="submitPost">
          {{ publishing ? '发布中...' : '发布' }}
        </button>
      </div>
    </template>

    <div class="compose-layout">
      <section class="panel-card base-form">
        <div class="section-title">基础信息</div>
        <el-input v-model="form.title" class="title-input" placeholder="分享你的想法..." maxlength="120" />
        <div class="row two-col">
          <el-select v-model="form.visibility" placeholder="可见性">
            <el-option label="仅自己可见" :value="1" />
            <el-option label="好友可见" :value="2" />
            <el-option label="公开" :value="3" />
          </el-select>
          <el-input v-model="form.category" class="category-input" placeholder="分类（可选）" maxlength="32" />
        </div>
        <button class="location-trigger" type="button">
          <span>附加位置</span>
          <span class="location-value">添加位置</span>
        </button>
      </section>

      <section class="panel-card media-panel">
        <div class="media-head">
          <div class="media-head-copy">
            <div class="section-title">图片内容</div>
            <p class="section-copy">支持 JPG、PNG、WebP，移动端会自动收成更紧凑的栅格。</p>
          </div>
          <label class="upload-btn">
            <span class="upload-label">添加图片</span>
            <span class="upload-plus">+</span>
            <input type="file" accept="image/*" multiple @change="onPickImages" />
          </label>
        </div>

        <div class="media-preview">
          <div class="mixed-grid">
            <div v-for="(item, index) in imageItems" :key="item.localId" class="image-card">
              <img :src="item.previewUrl" alt="预览" />
              <button class="remove-btn" type="button" @click="removeImage(index)">×</button>
            </div>
            <label class="image-card upload-slot">
              <span class="upload-slot-plus">+</span>
              <input type="file" accept="image/*" multiple @change="onPickImages" />
            </label>
          </div>

          <label v-if="!imageItems.length" class="mobile-empty-upload">
            <span class="upload-slot-plus">+</span>
            <input type="file" accept="image/*" multiple @change="onPickImages" />
          </label>

          <div v-if="imageItems.length" class="media-tip">已选 {{ imageItems.length }} 张，合集模式可横向滑动浏览。</div>
        </div>

        <div v-if="!imageItems.length" class="empty-media">暂无图片，先上传一张封面或者继续直接写正文。</div>
      </section>

      <section class="panel-card text-panel">
        <div class="section-title">正文</div>
        <el-input
          v-model="form.content"
          type="textarea"
          :autosize="{ minRows: 8, maxRows: 14 }"
          placeholder="写点什么吧..."
          maxlength="5000"
          show-word-limit
        />
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import { createForumPostApi } from '@/api/forumApi'
import { uploadFileApi } from '@/api/fileApi'
import { normalizeFileUrl } from '@/utils/fileUrl'

const router = useRouter()
const publishing = ref(false)

const form = ref({
  title: '',
  content: '',
  category: '',
  visibility: 3,
})

const imageItems = ref([])

const unwrap = (res) => {
  return res?.data?.data ?? res?.data ?? null
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.replace('/forum-square')
}

const onPickImages = (event) => {
  const files = Array.from(event?.target?.files || [])
  if (!files.length) {
    return
  }

  for (const file of files) {
    const previewUrl = URL.createObjectURL(file)
    imageItems.value.push({
      localId: `${Date.now()}_${Math.random()}`,
      file,
      previewUrl,
      remoteUrl: '',
    })
  }

  event.target.value = ''
}

const removeImage = (index) => {
  const item = imageItems.value[index]
  if (item?.previewUrl) {
    URL.revokeObjectURL(item.previewUrl)
  }
  imageItems.value.splice(index, 1)
}

const readUploadUrl = (data) => {
  return normalizeFileUrl(data?.url || data?.fullUrl || data?.fileUrl || data?.path || '')
}

const ensureUploadedImages = async () => {
  for (const item of imageItems.value) {
    if (item.remoteUrl) continue
    const res = await uploadFileApi(item.file)
    const data = unwrap(res)
    const url = readUploadUrl(data)
    if (!url) {
      throw new Error('图片上传失败：未返回可用地址')
    }
    item.remoteUrl = url
  }
}

const buildPostContent = () => {
  const text = String(form.value.content || '').trim()
  const urls = imageItems.value.map((item) => item.remoteUrl).filter(Boolean)

  const lines = []
  if (text) {
    lines.push(text)
  }
  if (urls.length) {
    lines.push('')
    lines.push('#MIXED#')
    lines.push(...urls)
  }
  return lines.join('\n').trim()
}

const submitPost = async () => {
  const title = String(form.value.title || '').trim()
  if (!title) {
    ElMessage.warning('请输入标题')
    return
  }

  if (!String(form.value.content || '').trim() && !imageItems.value.length) {
    ElMessage.warning('请至少输入正文或上传图片')
    return
  }

  publishing.value = true
  try {
    await ensureUploadedImages()
    const payload = {
      title,
      visibility: form.value.visibility,
      category: String(form.value.category || '').trim() || null,
      content: buildPostContent(),
    }
    await createForumPostApi(payload)
    ElMessage.success('帖子发布成功')
    router.replace('/forum-square')
  } catch (error) {
    ElMessage.error(error?.message || '发布失败，请稍后重试')
  } finally {
    publishing.value = false
  }
}

onBeforeUnmount(() => {
  for (const item of imageItems.value) {
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
  }
})
</script>

<style scoped>
.compose-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 760px;
  margin: 0 auto;
}

.panel-card {
  background: rgba(255, 252, 248, 0.78);
  border: 1px solid rgba(226, 213, 202, 0.9);
  border-radius: 22px;
  padding: 16px;
  box-shadow: none;
}

.section-title {
  color: #cb684d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 14px;
}

.section-copy,
.media-tip,
.tip-item,
.empty-media {
  color: #8e7d74;
  line-height: 1.7;
}

.header-actions,
.mode-switch,
.media-head {
  display: flex;
  gap: 10px;
}

:deep(.shell-header) {
  position: relative;
  min-height: 44px;
  margin-bottom: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(226, 213, 202, 0.9);
  align-items: center;
  justify-content: center;
}

:deep(.shell-header > div:first-child) {
  flex: 1;
  text-align: center;
}

:deep(.header-eyebrow),
:deep(.header-subtitle) {
  display: none;
}

:deep(.header-title) {
  font-size: 20px;
  line-height: 1.2;
}

:deep(.header-extra) {
  position: static;
  gap: 0;
}

.header-actions {
  position: absolute;
  inset: 0 0 auto 0;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.header-back-btn,
.header-submit-btn {
  pointer-events: auto;
  min-height: 36px;
  border-radius: 999px;
}

.header-back-btn {
  min-width: 36px;
  padding: 0 10px;
  background: transparent;
  color: #6c5d56;
  box-shadow: none;
}

.header-submit-btn {
  min-width: 68px;
  padding: 0 16px;
}

.location-trigger {
  margin-top: 12px;
  width: 100%;
  min-height: 46px;
  padding: 0 2px;
  border: 0;
  border-bottom: 1px solid rgba(226, 213, 202, 0.9);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #5a4b46;
  font-size: 15px;
  cursor: pointer;
}

.location-value {
  color: #8e7d74;
}

.row.two-col {
  margin-top: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

.row.two-col :deep(.el-select__wrapper),
.row.two-col :deep(.el-input__wrapper) {
  min-height: 46px;
  padding: 0 2px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  border-bottom: 1px solid rgba(226, 213, 202, 0.9);
}

.row.two-col :deep(.el-select__placeholder),
.row.two-col :deep(.el-input__inner) {
  color: #5a4b46;
  font-size: 15px;
}

.primary-btn,
.ghost-btn,
.mode-btn,
.album-nav,
.upload-btn {
  border: 0;
  cursor: pointer;
}

.primary-btn,
.ghost-btn,
.mode-btn,
.upload-btn {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
}

.primary-btn {
  background: linear-gradient(135deg, #e58a6a, #d56a4f);
  color: #fff;
  box-shadow: 0 14px 28px rgba(213, 106, 79, 0.25);
}

.ghost-btn,
.upload-btn,
.mode-btn {
  background: #fff5ee;
  color: #b86247;
}

.primary-btn:disabled {
  opacity: 0.7;
}

.mode-panel {
  display: none;
}

.mode-switch {
  flex-wrap: wrap;
}

.mode-btn.active {
  background: linear-gradient(135deg, #e38e6d, #cf684c);
  color: #fff;
}

.media-head {
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  gap: 8px;
}

.upload-btn {
  display: none;
}

.upload-label {
  display: inline-flex;
}

.upload-plus {
  display: none;
}

.upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.media-preview {
  margin-top: 2px;
}

.mixed-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 86px));
  gap: 10px;
  justify-content: flex-start;
}

.image-card {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  background: linear-gradient(180deg, #fff8f3, #fff3eb);
  border: 1px solid rgba(226, 213, 202, 0.9);
}

.image-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: rgba(55, 45, 41, 0.75);
  color: #fff;
  cursor: pointer;
}

.upload-slot,
.mobile-empty-upload {
  position: relative;
  border: 1px dashed rgba(210, 192, 181, 0.95);
  background: #fffdfb;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.upload-slot input,
.mobile-empty-upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-slot-plus {
  color: #7b706a;
  font-size: 28px;
  line-height: 1;
}

.mobile-empty-upload {
  width: 86px;
  height: 86px;
  display: grid;
  margin-top: 6px;
  border-radius: 16px;
}

.empty-media {
  display: none;
}

.tips-card {
  display: none;
}

.tip-item {
  padding: 12px 14px;
  border-radius: 16px;
  background: #fff8f3;
}

@media (max-width: 768px) {
  .section-title {
    margin-bottom: 10px;
    font-size: 12px;
  }

  .title-input :deep(.el-input__wrapper) {
    min-height: 54px;
    padding: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .title-input :deep(.el-input__inner) {
    font-size: 18px;
    color: #2f2623;
  }

  .title-input :deep(.el-input__inner::placeholder) {
    color: #8e7d74;
  }

  .media-head-copy .section-copy {
    display: none;
  }

  .image-card,
  .upload-slot,
  .mobile-empty-upload {
    border-radius: 16px;
  }

  .media-tip,
  .empty-media {
    display: none;
  }

  .text-panel {
    padding-top: 4px;
  }

  .text-panel .section-title {
    display: none;
  }

  .text-panel :deep(.el-textarea__inner) {
    padding: 0;
    min-height: 180px !important;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: #2f2623;
    font-size: 15px;
    line-height: 1.75;
  }
}

@media (max-width: 640px) {
  :deep(.shell-panel) {
    padding: 12px 14px 16px;
    border-radius: 24px;
  }

  .panel-card {
    padding: 12px 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .mixed-grid {
    grid-template-columns: repeat(3, minmax(0, 86px));
  }
}
</style>