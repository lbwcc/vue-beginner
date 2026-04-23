<template>
  <div class="compose-page">
    <header class="compose-topbar">
      <button class="back-btn" type="button" @click="goBack">‹ 返回</button>
      <div class="title">发布帖子</div>
      <button class="publish-btn" type="button" :disabled="publishing" @click="submitPost">
        {{ publishing ? '发布中...' : '发布' }}
      </button>
    </header>

    <main class="compose-main">
      <section class="card base-form">
        <el-input v-model="form.title" placeholder="输入帖子标题" maxlength="120" />
        <div class="row two-col">
          <el-select v-model="form.visibility" placeholder="可见性">
            <el-option label="仅自己可见" :value="1" />
            <el-option label="好友可见" :value="2" />
            <el-option label="公开" :value="3" />
          </el-select>
          <el-input v-model="form.category" placeholder="分类（可选）" maxlength="32" />
        </div>
      </section>

      <section class="card mode-panel">
        <div class="mode-title">发布类型</div>
        <div class="mode-switch">
          <button class="mode-btn" :class="{ active: postMode === 'mixed' }" type="button" @click="postMode = 'mixed'">
            图文混排
          </button>
          <button class="mode-btn" :class="{ active: postMode === 'album' }" type="button" @click="postMode = 'album'">
            图片合集 + 文字
          </button>
        </div>
      </section>

      <section class="card media-panel">
        <div class="media-head">
          <div class="media-title">图片内容</div>
          <label class="upload-btn">
            + 添加图片
            <input type="file" accept="image/*" multiple @change="onPickImages" />
          </label>
        </div>

        <div v-if="imageItems.length" class="media-preview">
          <div v-if="postMode === 'mixed'" class="mixed-grid">
            <div v-for="(item, index) in imageItems" :key="item.localId" class="image-card">
              <img :src="item.previewUrl" alt="预览" />
              <button class="remove-btn" type="button" @click="removeImage(index)">×</button>
            </div>
          </div>

          <div v-else class="album-preview">
            <button class="album-nav" type="button" @click="slidePrev">‹</button>
            <div ref="albumViewport" class="album-track">
              <div v-for="item in imageItems" :key="item.localId" class="album-slide">
                <img :src="item.previewUrl" alt="预览" />
              </div>
            </div>
            <button class="album-nav" type="button" @click="slideNext">›</button>
          </div>

          <div class="media-tip">已选 {{ imageItems.length }} 张，拖动可左右切换（合集模式）。</div>
        </div>

        <div v-else class="empty-media">暂无图片，支持 JPG/PNG/WebP</div>
      </section>

      <section class="card text-panel">
        <div class="textarea-title">正文</div>
        <el-input
          v-model="form.content"
          type="textarea"
          :autosize="{ minRows: 6, maxRows: 12 }"
          placeholder="写点什么吧..."
          maxlength="5000"
          show-word-limit
        />
      </section>
    </main>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createForumPostApi } from '@/api/forumApi'
import { uploadFileApi } from '@/api/fileApi'
import { normalizeFileUrl } from '@/utils/fileUrl'

const router = useRouter()
const albumViewport = ref(null)
const publishing = ref(false)
const postMode = ref('mixed')

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

const slidePrev = () => {
  if (!albumViewport.value) return
  albumViewport.value.scrollBy({ left: -albumViewport.value.clientWidth, behavior: 'smooth' })
}

const slideNext = () => {
  if (!albumViewport.value) return
  albumViewport.value.scrollBy({ left: albumViewport.value.clientWidth, behavior: 'smooth' })
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
    lines.push(postMode.value === 'album' ? '#ALBUM#' : '#MIXED#')
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
.compose-page {
  min-height: 100vh;
  background: #f4f5f7;
  color: #111827;
}

.compose-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 54px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}

.back-btn,
.publish-btn {
  border: 0;
  background: #f3f4f6;
  height: 34px;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
}

.publish-btn {
  background: #111827;
  color: #fff;
}

.publish-btn:disabled {
  opacity: 0.6;
}

.title {
  text-align: center;
  font-weight: 800;
}

.compose-main {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  background: #fff;
  border: 1px solid #e6e9ef;
  border-radius: 12px;
  padding: 10px;
}

.row.two-col {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-title,
.media-title,
.textarea-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-btn {
  border: 1px solid #d7dce5;
  background: #f8fafc;
  border-radius: 9px;
  height: 38px;
  font-weight: 700;
}

.mode-btn.active {
  background: #111827;
  border-color: #111827;
  color: #fff;
}

.media-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.upload-btn {
  position: relative;
  border: 1px solid #cdd5e1;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
}

.upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.media-preview {
  margin-top: 10px;
}

.mixed-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.image-card {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
}

.image-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  border: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.7);
  color: #fff;
  line-height: 1;
}

.album-preview {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px;
}

.album-nav {
  border: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e5e7eb;
}

.album-track {
  overflow-x: auto;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100%;
  gap: 8px;
  scroll-snap-type: x mandatory;
}

.album-slide {
  scroll-snap-align: start;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.album-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.empty-media {
  margin-top: 10px;
  padding: 14px;
  text-align: center;
  color: #9ca3af;
  background: #f8fafc;
  border-radius: 8px;
}

@media (max-width: 600px) {
  .mixed-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .row.two-col {
    grid-template-columns: 1fr;
  }
}
</style>
