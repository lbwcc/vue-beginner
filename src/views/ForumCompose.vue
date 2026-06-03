<template>
  <AppShell
    :title="isEditMode ? '编辑帖子' : '发布帖子'"
    eyebrow=""
    subtitle=""
    active-section="forum"
  >
    <template #header-actions>
      <div class="header-actions">
        <button class="ghost-btn header-back-btn" type="button" @click="goBack">返回</button>
        <button
          v-if="isEditMode"
          class="ghost-btn header-delete-btn"
          type="button"
          :disabled="publishing"
          @click="removePost"
        >
          删除
        </button>
        <button class="primary-btn header-submit-btn" type="button" :disabled="publishing" @click="submitPost">
          {{ publishing ? (isEditMode ? '保存中...' : '发布中...') : (isEditMode ? '保存' : '发布') }}
        </button>
      </div>
    </template>

    <div class="compose-layout" v-reveal="{ y: 12, duration: 0.36 }">
      <section class="panel-card base-form" v-reveal="{ y: 14, duration: 0.38, delay: 0.04 }">
        <el-input v-model="form.title" class="title-input" placeholder="分享你的想法..." maxlength="120" />
        <div class="rich-editor-wrapper">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="14"
            class="content-input"
            placeholder="支持 Markdown，例如：## 标题、**加粗**、- 列表、![图片](url)"
          />
        </div>
      </section>

      <section class="panel-card media-panel" v-reveal="{ y: 14, duration: 0.38, delay: 0.08 }">
        <div class="media-head">
          <div class="media-head-copy">
            <!-- <div class="section-title">图片内容</div> -->
            <!-- <p class="section-copy">支持 JPG、PNG、WebP，移动端会自动收成更紧凑的栅格。</p> -->
          </div>
          <label class="upload-btn">
                  <span class="upload-label">添加图片</span>
                  <span class="upload-plus">+</span>
                  <input type="file" accept="image/*,.heic,.heif,.avif,.bmp,.tif,.tiff,.svg,.ico" multiple @change="onPickImages" />
                </label>
        </div>

        <div class="media-preview">
          <TransitionGroup name="compose-media" tag="div" class="mixed-grid">
            <div v-for="(item, index) in imageItems" :key="item.localId" class="image-card">
              <el-image
                :src="item.previewUrl"
                :preview-src-list="previewImageList"
                :initial-index="index"
                fit="cover"
                preview-teleported
              />
              <div v-if="item.uploading" class="upload-progress-mask">
                <span>{{ item.progress }}%</span>
                <div class="upload-progress-track">
                  <i :style="{ width: `${item.progress}%` }"></i>
                </div>
              </div>
              <button class="remove-btn" type="button" @click="removeImage(index)">×</button>
            </div>
            <!-- <label class="image-card upload-slot">
              <span class="upload-slot-plus">+</span>
              <input type="file" accept="image/*" multiple @change="onPickImages" />
            </label> -->
          </TransitionGroup>

          <label v-if="imageItems.length < 9" class="mobile-empty-upload">
            <span class="upload-slot-plus">+</span>
            <input type="file" accept="image/*,.heic,.heif,.avif,.bmp,.tif,.tiff,.svg,.ico" multiple @change="onPickImages" />
          </label>

          <div v-if="imageItems.length" class="media-tip">
            已选 {{ imageItems.length }} 张
            <template v-if="uploadingImagesCount">，上传中 {{ uploadingImagesCount }} 张，整体 {{ uploadProgressOverall }}%</template>
          </div>
        </div>

        <div v-if="!imageItems.length" class="empty-media">暂无图片，先上传一张封面或者继续直接写正文。</div>
      </section>

      <section class="panel-card settings-panel" v-reveal="{ y: 14, duration: 0.38, delay: 0.12 }">
        <div class="setting-row">
          <span class="setting-label">分类</span>
          <el-input v-model="form.category" class="setting-input" placeholder="请输入分类" maxlength="32" />
        </div>
        <div class="setting-row">
          <span class="setting-label">可见性</span>
          <el-select v-model="form.visibility" class="setting-input" placeholder="可见性">
            <el-option label="仅自己可见" :value="1" />
            <el-option label="好友可见" :value="2" />
            <el-option label="公开" :value="3" />
          </el-select>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import { createForumPostApi, deleteForumPostApi, getForumPostDetailApi, updateForumPostApi } from '@/api/forumApi'
import { uploadFileApi } from '@/api/fileApi'
import { normalizeFileUrl } from '@/utils/fileUrl'
import { parsePostMixedV2, POST_MIXED_V2_PREFIX } from '@/utils/postContent'

const route = useRoute()
const router = useRouter()
const publishing = ref(false)

const editPostId = computed(() => Number(route.query.editId || 0))
const isEditMode = computed(() => Number.isFinite(editPostId.value) && editPostId.value > 0)

const form = ref({
  title: '',
  content: '',
  category: '',
  visibility: 3,
})

const imageItems = ref([])
const previewImageList = computed(() => imageItems.value.map((item) => item.remoteThumbnailUrl || item.previewUrl).filter(Boolean))
const MAX_IMAGE_SIZE = 20 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'image/svg+xml',
  'image/x-icon'
])
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.avif', '.heic', '.heif', '.svg', '.ico'])

const uploadProgressOverall = computed(() => {
  const pending = imageItems.value.filter((item) => !item.remoteUrl)
  if (!pending.length) {
    return 100
  }
  const total = pending.reduce((sum, item) => sum + Number(item.progress || 0), 0)
  return Math.round(total / pending.length)
})

const uploadingImagesCount = computed(() => imageItems.value.filter((item) => item.uploading).length)

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

const clearPreviewUrls = () => {
  for (const item of imageItems.value) {
    if (item?.previewUrl && String(item.previewUrl).startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl)
    }
  }
}

const resolveImageMeta = (item) => {
  if (typeof item === 'string') {
    const url = normalizeFileUrl(String(item || '').trim())
    return url ? { url, thumbnailUrl: url } : null
  }
  if (item && typeof item === 'object') {
    const url = normalizeFileUrl(String(item.url || item.originalUrl || item.src || '').trim())
    if (!url) {
      return null
    }
    const thumbnailUrl = normalizeFileUrl(String(item.thumbnailUrl || item.thumbUrl || '').trim()) || url
    return { url, thumbnailUrl }
  }
  return null
}

const extractImageMetasFromContent = (rawContent) => {
  const source = String(rawContent || '')

  // 兼容 #POST_MIXED_V2# 格式（数组格式和对象格式）
  const v2 = parsePostMixedV2(source)
  if (v2) {
    return v2.imageItems.map((i) => resolveImageMeta(i)).filter(Boolean)
  }

  // 普通 Markdown 格式
  const matches = [...source.matchAll(/!\[[^\]]*\]\((?:<([^>]+)>|([^\s)"',}\]]+))(?:\s+["'][^"']*["'])?\)/g)]
  return matches
    .map((match) => resolveImageMeta(match?.[1] || match?.[2]))
    .filter(Boolean)
}

const loadPostForEdit = async () => {
  const data = unwrap(await getForumPostDetailApi(editPostId.value))
  if (!data) {
    throw new Error('帖子不存在或已删除')
  }

  const rawContent = String(data.content || '')
  let textContent = rawContent
  let loadedImages = []

  const v2 = parsePostMixedV2(rawContent)
  if (v2) {
    textContent = v2.textBlocks.join('\n\n')
    loadedImages = v2.imageItems.map((i, index) => ({
      localId: `remote_${Date.now()}_${index}`,
      file: null,
      previewUrl: i.thumbnailUrl || i.url,
      remoteUrl: i.url,
      remoteThumbnailUrl: i.thumbnailUrl || i.url,
    }))
  } else {
    loadedImages = extractImageMetasFromContent(rawContent).map((meta, index) => ({
      localId: `remote_${Date.now()}_${index}`,
      file: null,
      previewUrl: meta.thumbnailUrl || meta.url,
      remoteUrl: meta.url,
      remoteThumbnailUrl: meta.thumbnailUrl || meta.url,
    }))
  }

  form.value = {
    title: String(data.title || ''),
    content: textContent,
    category: String(data.category || ''),
    visibility: Number(data.visibility || 3),
  }

  clearPreviewUrls()
  imageItems.value = loadedImages
}

const onPickImages = (event) => {
  const files = Array.from(event?.target?.files || [])
  if (!files.length) return

  const slotsLeft = Math.max(0, 9 - imageItems.value.length)
  if (!slotsLeft) {
    ElMessage.warning('最多上传 9 项内容')
    event.target.value = ''
    return
  }

  const candidates = []

  for (const file of files) {
    const mime = String(file.type || '').toLowerCase()
    const lowerName = String(file.name || '').toLowerCase()
    const dotIndex = lowerName.lastIndexOf('.')
    const ext = dotIndex >= 0 ? lowerName.slice(dotIndex) : ''

    if (ALLOWED_IMAGE_TYPES.has(mime) || ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      candidates.push({
        localId: `${Date.now()}_${Math.random()}`,
        type: 'image',
        file,
        previewUrl: URL.createObjectURL(file),
        remoteUrl: '',
        uploading: false,
        progress: 0,
      })
      continue
    }

    ElMessage.warning(`不支持的文件格式: ${file.name}`)
  }

  // push candidates into imageItems (respect slotsLeft)
  const toAdd = candidates.slice(0, slotsLeft)
  for (const it of toAdd) {
    imageItems.value.push(it)
  }

  event.target.value = ''
}

const removeImage = (index) => {
  const item = imageItems.value[index]
  if (item?.previewUrl && String(item.previewUrl).startsWith('blob:')) {
    URL.revokeObjectURL(item.previewUrl)
  }
  imageItems.value.splice(index, 1)
}

const readUploadUrl = (data) => {
  return normalizeFileUrl(data?.url || data?.fullUrl || data?.fileUrl || data?.path || '')
}

const readUploadThumbnailUrl = (data, fallbackUrl = '') => {
  return normalizeFileUrl(data?.thumbnailUrl || data?.thumbUrl || data?.previewUrl || '') || fallbackUrl
}

const uploadImageItem = async (item) => {
  if (item.remoteUrl || !item.file) {
    return
  }

  item.uploading = true
  item.progress = 0
  try {
    const res = await uploadFileApi(item.file, {
      onProgress: ({ percent }) => {
        item.progress = percent
      }
    })
    const data = unwrap(res)
    const url = readUploadUrl(data)
    if (!url) {
      throw new Error('图片上传失败：未返回可用地址')
    }
    const thumbnailUrl = readUploadThumbnailUrl(data, url)
    item.remoteUrl = url
    item.remoteThumbnailUrl = thumbnailUrl
    item.progress = 100
  } finally {
    item.uploading = false
  }
}

const ensureUploadedImages = async () => {
  for (const item of imageItems.value) {
    await uploadImageItem(item)
  }
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

    // 统一保存为对象格式：#POST_MIXED_V2#{"text":"...","images":[{url,thumbnailUrl}]}
    const textContent = String(form.value.content || '').trim()
    const images = imageItems.value
      .filter((item) => item.remoteUrl)
      .map((item) => ({ url: item.remoteUrl, thumbnailUrl: item.remoteThumbnailUrl || item.remoteUrl }))
    const finalContent = (textContent || images.length)
      ? POST_MIXED_V2_PREFIX + JSON.stringify({ text: textContent, images })
      : ''

    const payload = {
      title,
      visibility: form.value.visibility,
      category: String(form.value.category || '').trim() || null,
      content: finalContent,
    }
    if (isEditMode.value) {
      await updateForumPostApi(editPostId.value, payload)
      ElMessage.success('帖子已更新')
    } else {
      await createForumPostApi(payload)
      ElMessage.success('帖子发布成功')
    }
    router.replace('/forum-square')
  } catch (error) {
    ElMessage.error(error?.message || (isEditMode.value ? '保存失败，请稍后重试' : '发布失败，请稍后重试'))
  } finally {
    publishing.value = false
  }
}

const removePost = async () => {
  if (!isEditMode.value) {
    return
  }

  try {
    await ElMessageBox.confirm('确定删除这条帖子吗？删除后无法恢复。', '删除帖子', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  publishing.value = true
  try {
    await deleteForumPostApi(editPostId.value)
    ElMessage.success('帖子已删除')
    router.replace('/forum-square')
  } catch (error) {
    ElMessage.error(error?.message || '删除失败，请稍后重试')
  } finally {
    publishing.value = false
  }
}

onMounted(async () => {
  if (!route.query.editId) {
    return
  }
  if (!isEditMode.value) {
    ElMessage.error('帖子参数错误')
    router.replace('/forum-square')
    return
  }
  try {
    await loadPostForEdit()
  } catch (error) {
    ElMessage.error(error?.message || '加载帖子失败')
    router.replace('/forum-square')
  }
})

onBeforeUnmount(() => {
  clearPreviewUrls()
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
  /* background: rgba(255, 252, 248, 0.78); */
  border: none !important;
  border-radius: 22px;
  padding: 16px;
  box-shadow: none !important;
}
:deep(.el-textarea .el-input__count){
  background: none !important;
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

.header-delete-btn {
  pointer-events: auto;
  min-height: 36px;
  border-radius: 999px;
  padding: 0 14px;
  color: #c8503a;
  background: #fff0ec;
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

.base-form {
  padding-top: 8px;
}

.title-input :deep(.el-input__wrapper) {
  min-height: 56px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  border-bottom: 1px solid rgba(226, 213, 202, 0.9);
}

.title-input :deep(.el-input__inner) {
  font-size: 24px;
  font-weight: 800;
  color: #2f2623;
}

.title-input :deep(.el-input__inner::placeholder) {
  color: #8e7d74;
}

.content-input {
  margin-top: 10px;
}

.content-input :deep(.el-textarea__inner) {
  padding: 0;
  min-height: 220px !important;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: #2f2623;
  font-size: 16px;
  line-height: 1.78;
}

.content-input :deep(.el-input__count) {
  margin-top: 6px;
}

.settings-panel {
  padding: 4px 0;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  border-bottom: 1px solid rgba(226, 213, 202, 0.9);
}

.setting-row:last-child {
  border-bottom: 0;
}

.setting-label {
  color: #5a4b46;
  font-size: 16px;
}

.setting-input {
  width: min(190px, 56vw);
}

.setting-input :deep(.el-input__wrapper),
.setting-input :deep(.el-select__wrapper) {
  min-height: 42px;
  border-radius: 12px;
  box-shadow: none;
  background: #fff8f3;
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

.image-card :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.image-card :deep(.el-image__inner) {
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

.upload-progress-mask {
  position: absolute;
  inset: auto 8px 8px 8px;
  padding: 6px 8px;
  border-radius: 10px;
  background: rgba(32, 25, 21, 0.72);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  line-height: 1;
}

.upload-progress-track {
  width: 100%;
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.26);
}

.upload-progress-track i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #ffd29f, #ff9f67);
  transition: width 0.2s ease;
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

  .title-input :deep(.el-input__inner) {
    font-size: 26px;
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

  .content-input :deep(.el-textarea__inner) {
    min-height: 190px !important;
    font-size: 15px;
  }

  .setting-row {
    min-height: 48px;
  }

  .setting-label {
    font-size: 15px;
  }
}

@media (max-width: 640px) {
  :deep(.shell-panel) {
    padding: 12px 14px 16px;
    /* border-radius: 24px; */
    border: none;
    background: none;
  }

  .panel-card {
    padding: 10px;
    border: 0;
    /* border-radius: 0; */
    background: transparent;
  }


/* Apple-style page refinement overrides */
.panel-card {
  background: var(--canvas, #fff);
  /* border: 1px solid var(--hairline, #e0e0e0); */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

:deep(.shell-header) {
  border-bottom: 1px solid var(--divider-soft, #f0f0f0);
}

.section-title,
.setting-label {
  color: var(--ink, #1d1d1f);
}

.section-copy,
.media-tip,
.tip-item,
.empty-media,
.location-value {
  color: var(--ink-muted, #6e6e73);
}

.primary-btn,
.header-submit-btn {
  background: var(--primary, #0066cc);
  color: #fff;
  box-shadow: none;
}

.ghost-btn,
.upload-btn,
.mode-btn,
.header-delete-btn {
  background: #fff;
  border: 1px solid var(--hairline, #e0e0e0);
  color: var(--ink, #1d1d1f);
}

.header-back-btn {
  color: var(--ink-muted, #6e6e73);
}

.title-input :deep(.el-input__wrapper),
.setting-input :deep(.el-input__wrapper),
.setting-input :deep(.el-select__wrapper),
.row.two-col :deep(.el-select__wrapper),
.row.two-col :deep(.el-input__wrapper) {
  border-bottom-color: var(--divider-soft, #f0f0f0);
  background: transparent;
}

.title-input :deep(.el-input__inner),
.content-input :deep(.el-textarea__inner) {
  color: var(--ink, #1d1d1f);
}

.title-input :deep(.el-input__inner::placeholder) {
  color: #8e8e93;
}

.image-card,
.upload-slot,
.mobile-empty-upload {
  background: #fff;
  border-color: var(--hairline, #e0e0e0);
}

.upload-progress-track {
  background: #e8e8ed;
}

.upload-progress-track i {
  background: linear-gradient(90deg, #2997ff, #0066cc);
}

.remove-btn {
  background: rgba(29, 29, 31, 0.78);
}
  .mixed-grid {
    grid-template-columns: repeat(3, minmax(0, 86px));
  }
}
</style>

<style scoped>
/* Third-pass alignment acceptance for compose page */
.compose-layout {
  gap: 14px;
  max-width: 840px;
}

:deep(.shell-header) {
  min-height: 48px;
  margin-bottom: 10px;
}

.header-actions {
  gap: 8px;
}

.header-back-btn,
.header-delete-btn,
.header-submit-btn,
.upload-btn,
.remove-btn {
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.header-back-btn,
.header-delete-btn,
.header-submit-btn {
  min-height: 38px;
}

.header-back-btn:focus-visible,
.header-delete-btn:focus-visible,
.header-submit-btn:focus-visible,
.upload-btn:focus-visible,
.remove-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #0066cc) 28%, transparent);
}

.header-submit-btn:hover,
.upload-btn:hover {
  filter: brightness(0.98);
}

.header-submit-btn:disabled,
.header-delete-btn:disabled,
.header-back-btn:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.panel-card {
  border-radius: 18px;
}

.title-input :deep(.el-input__wrapper),
.content-input :deep(.el-textarea__inner),
.setting-input :deep(.el-input__wrapper),
.setting-input :deep(.el-select__wrapper) {
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.title-input :deep(.el-input__wrapper.is-focus),
.content-input :deep(.el-textarea__inner:focus),
.setting-input :deep(.is-focus .el-input__wrapper),
.setting-input :deep(.is-focus.el-select__wrapper) {
  border-color: var(--primary, #0066cc) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #0066cc) 20%, transparent) !important;
}

.title-input :deep(.el-input__inner) {
  letter-spacing: -0.01em;
}

.media-panel {
  padding-top: 14px;
}

.media-head {
  margin-bottom: 8px;
}

.mixed-grid {
  grid-template-columns: repeat(3, minmax(0, 104px));
  gap: 11px;
}

.image-card,
.mobile-empty-upload {
  border-radius: 16px;
}

.remove-btn:hover {
  background: rgba(29, 29, 31, 0.9);
}

.setting-row {
  min-height: 54px;
}

@media (max-width: 1024px) {
  .compose-layout {
    max-width: 780px;
  }
}

@media (max-width: 768px) {
  .compose-layout {
    gap: 10px;
  }

  .mixed-grid {
    grid-template-columns: repeat(3, minmax(0, 96px));
    gap: 9px;
  }

  .setting-row {
    min-height: 50px;
  }
}

@media (max-width: 520px) {
  .header-actions {
    gap: 6px;
  }

  .header-back-btn,
  .header-delete-btn,
  .header-submit-btn {
    min-height: 36px;
    padding-inline: 12px;
  }

  .mixed-grid {
    grid-template-columns: repeat(3, minmax(0, 90px));
    gap: 8px;
  }

  .setting-input {
    width: min(178px, 58vw);
  }
}
</style>

<style scoped>
/* Final visual polish for compose page: cleaner hierarchy, better spacing, and mobile-friendly controls. */
.compose-layout {
  max-width: 760px;
  gap: 16px;
  padding-bottom: 92px;
}

:deep(.shell-panel) {
  background:
    radial-gradient(1200px 520px at 8% -22%, rgba(0, 97, 255, 0.08), transparent 55%),
    radial-gradient(1000px 420px at 100% 0%, rgba(0, 156, 136, 0.07), transparent 58%),
    #f4f7fb;
  border: 1px solid #dfe7f2;
}

:deep(.shell-header) {
  min-height: 50px;
  margin-bottom: 12px;
  border-bottom: 1px solid #dbe4f0;
}

:deep(.header-title) {
  font-family: 'Source Han Sans SC', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #192331;
  letter-spacing: 0.01em;
}

.panel-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #dce5f1;
  border-radius: 20px;
  box-shadow: 0 10px 24px rgba(21, 40, 69, 0.08);
  backdrop-filter: blur(4px);
}

.header-back-btn,
.header-delete-btn,
.header-submit-btn {
  min-height: 38px;
  border-radius: 999px;
  font-weight: 700;
}

.header-back-btn {
  background: #ffffff;
  color: #35465b;
  border: 1px solid #d3deec;
}

.header-delete-btn {
  background: #fff2ef;
  color: #d34c36;
  border: 1px solid #ffd6cf;
}

.header-submit-btn,
.primary-btn {
  background: linear-gradient(135deg, #0d6efd, #0a58ca);
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(13, 110, 253, 0.24);
}

.base-form {
  padding-top: 12px;
}

.title-input :deep(.el-input__wrapper) {
  border: 1px solid #d4deeb;
  background: #f8fbff;
  border-radius: 16px;
  padding: 0 16px;
  min-height: 54px;
  box-shadow: none;
}

.title-input :deep(.el-input__inner) {
  font-size: 20px;
  font-weight: 700;
  color: #1c2b3f;
}

.content-input {
  margin-top: 12px;
}

.content-input :deep(.el-textarea__inner) {
  min-height: 220px !important;
  border: 1px solid #d4deeb;
  border-radius: 18px;
  background: #fcfdff;
  padding: 16px;
  font-size: 15px;
  color: #1f2d3e;
  box-shadow: none;
}

.content-input :deep(.el-textarea__inner:focus),
.title-input :deep(.el-input__wrapper.is-focus),
.setting-input :deep(.el-input__wrapper.is-focus),
.setting-input :deep(.el-select__wrapper.is-focused) {
  border-color: #0d6efd !important;
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.14) !important;
}

.media-panel {
  padding-top: 14px;
}

.media-head {
  margin-bottom: 8px;
}

.mixed-grid {
  grid-template-columns: repeat(3, minmax(0, 92px));
  gap: 10px;
}

.image-card,
.mobile-empty-upload {
  border-radius: 16px;
  border: 1px solid #d7e2ef;
  background: #ffffff;
}

.mobile-empty-upload {
  width: 92px;
  height: 92px;
}

.upload-slot-plus {
  color: #5b6f88;
}

.remove-btn {
  width: 26px;
  height: 26px;
  top: 6px;
  right: 6px;
}

.settings-panel {
  padding: 8px 12px;
}

.setting-row {
  min-height: 56px;
  border-bottom: 1px dashed #d9e4f2;
}

.setting-row:last-child {
  border-bottom: 0;
}

.setting-label {
  color: #24364c;
  font-weight: 600;
}

.setting-input {
  width: min(220px, 58vw);
}

.setting-input :deep(.el-input__wrapper),
.setting-input :deep(.el-select__wrapper) {
  border: 1px solid #d4deeb;
  background: #f8fbff;
  border-radius: 14px;
  box-shadow: none;
}

@media (max-width: 768px) {
  .compose-layout {
    gap: 12px;
    padding-bottom: 88px;
  }

  :deep(.shell-panel) {
    /* border-radius: 24px; */
  }

  .panel-card {
    border-radius: 18px;
    padding: 12px;
  }

  .title-input :deep(.el-input__inner) {
    font-size: 18px;
  }

  .content-input :deep(.el-textarea__inner) {
    min-height: 190px !important;
    font-size: 14px;
  }

  .mixed-grid {
    grid-template-columns: repeat(3, minmax(0, 88px));
    gap: 8px;
  }

  .mobile-empty-upload {
    width: 88px;
    height: 88px;
  }

  .setting-row {
    min-height: 52px;
  }
}

@media (max-width: 420px) {
  .header-back-btn,
  .header-delete-btn,
  .header-submit-btn {
    min-height: 36px;
    padding-inline: 12px;
  }

  .setting-input {
    width: min(188px, 58vw);
  }
}
:deep(.sub-nav) {
    padding: 8px 12px;
    flex-direction: column;
    align-items: center !important;
    min-height: 50px;
    background: transparent;
  }
</style>