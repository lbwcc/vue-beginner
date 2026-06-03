<template>
  <AppShell
    title="个人信息编辑"
    eyebrow="资料设置"
    subtitle="更新昵称、联系方式、密码与头像。"
    active-section="profile"
  >
    <template #header-actions>
      <button class="shell-btn" type="button" @click="goHome">返回社区</button>
    </template>

    <section class="profile-panel" v-reveal="{ y: 12, duration: 0.36 }">
      <form class="auth-form panel-card" @submit.prevent="save" v-reveal="{ y: 14, duration: 0.38, delay: 0.04 }">
        <div class="section-title">个人信息编辑</div>

        <div class="avatar-field">
          <span>头像</span>
          <input
            ref="avatarInputRef"
            class="file-input sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/tiff,image/avif,image/heic,image/heif,image/svg+xml,image/x-icon,.heic,.heif,.avif,.bmp,.tif,.tiff,.svg,.ico"
            @change="onAvatarChange"
          />
          <button class="avatar-picker" type="button" @click="triggerAvatarSelect">
            <img v-if="avatarPreview" :src="avatarPreview" alt="avatar preview" class="avatar-preview" />
            <div v-else class="avatar-placeholder">上传头像</div>
            <span class="avatar-picker-tip">{{ avatarPreview ? '点击重新选择' : '点击选择图片' }}</span>
          </button>
        </div>

        <div v-if="cropImageUrl" class="crop-editor" v-reveal="{ y: 12, duration: 0.3, delay: 0.08 }">
          <p class="crop-hint">拖动图片并调整缩放，确认后再保存</p>
          <div
            ref="cropStageRef"
            class="crop-stage"
            @pointerdown="startCropDrag"
            @pointermove="onCropDrag"
            @pointerup="endCropDrag"
            @pointercancel="endCropDrag"
            @pointerleave="endCropDrag"
          >
            <img ref="cropImageRef" :src="cropImageUrl" alt="crop source" class="crop-image" :style="cropImageStyle" @load="onCropImageLoad" />
            <div class="crop-ring"></div>
          </div>

          <label class="crop-zoom-control">
            <span>缩放</span>
            <input v-model.number="cropZoom" type="range" min="1" max="3" step="0.01" @input="onCropZoomChange" />
          </label>

          <div class="crop-actions">
            <button class="submit-btn" type="button" @click="applyCrop">确认裁剪</button>
            <button class="avatar-clear-btn" type="button" @click="cancelCrop">取消</button>
          </div>
        </div>

        <div v-if="avatarPreview" class="avatar-preview-wrap">
          <button class="avatar-clear-btn" type="button" @click="clearAvatarSelection">移除头像</button>
        </div>
        <p class="avatar-meta" v-if="avatarName">已选择: {{ avatarName }} ({{ avatarSizeText }})</p>
        <div v-if="uploadingAvatar" class="upload-progress">
          <span>头像上传中 {{ uploadProgress }}%</span>
          <div class="upload-progress-track">
            <i :style="{ width: `${uploadProgress}%` }"></i>
          </div>
        </div>

        <label>
          <span>用户名</span>
          <input :value="form.username" disabled />
        </label>

        <label>
          <span>昵称</span>
          <input v-model.trim="form.nickname" maxlength="64" placeholder="例如：小李" />
        </label>

        <label>
          <span>邮箱</span>
          <input v-model.trim="form.email" maxlength="128" placeholder="请输入邮箱" />
        </label>

        <label>
          <span>手机号</span>
          <input v-model.trim="form.mobile" maxlength="32" placeholder="请输入手机号" />
        </label>

        <label>
          <span>新密码（可选）</span>
          <input v-model="form.password" type="password" maxlength="64" placeholder="至少 6 位" />
        </label>

        <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
        <p class="success" v-if="successMsg">{{ successMsg }}</p>

        <button class="submit-btn" :disabled="saving" type="submit">
          {{ saving ? '保存中...' : '保存修改' }}
        </button>
      </form>
    </section>

    <template #aside>
      <section class="panel-card side-card" v-reveal="{ y: 14, duration: 0.36, delay: 0.08 }">
        <div class="section-title">编辑提示</div>
        <p>头像支持 JPG、PNG、WEBP、GIF、BMP、TIFF、AVIF、HEIC、HEIF、SVG、ICO，大小不超过 20MB。</p>
        <p>点击头像位可重新选择图片，建议先裁剪再保存。</p>
        <p>密码留空表示不修改密码。</p>
      </section>
    </template>
  </AppShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { fetchCurrentUserApi, updateUserApi } from '@/api/authApi'
import { uploadFileApi } from '@/api/fileApi'
import { getCurrentAccount, setAuthSession } from '@/utils/auth'
import { normalizeFileUrl } from '@/utils/fileUrl'

const router = useRouter()
const account = ref(getCurrentAccount())
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const avatarInputRef = ref(null)
const cropStageRef = ref(null)
const cropImageRef = ref(null)
const avatarFile = ref(null)
const avatarPreview = ref('')
const avatarName = ref('')
const uploadingAvatar = ref(false)
const uploadProgress = ref(0)
const MAX_AVATAR_SIZE = 20 * 1024 * 1024
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
const PASSTHROUGH_IMAGE_TYPES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'])
const DEFAULT_CROP_STAGE_SIZE = 220
const CROPPED_AVATAR_SIZE = 256

const cropImageUrl = ref('')
const cropStageSize = ref(DEFAULT_CROP_STAGE_SIZE)
const cropZoom = ref(1)
const previousCropZoom = ref(1)
const cropNatural = reactive({ width: 0, height: 0 })
const cropOffset = reactive({ x: 0, y: 0 })
const cropDragState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0
})

const form = reactive({
  id: null,
  username: '',
  nickname: '',
  email: '',
  mobile: '',
  password: '',
  avatarUrl: ''
})

const revokePreview = () => {
  if (avatarPreview.value && avatarPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarPreview.value)
  }
}

const revokeCropImageUrl = () => {
  if (cropImageUrl.value) {
    URL.revokeObjectURL(cropImageUrl.value)
  }
}

const avatarSizeText = computed(() => {
  if (!avatarFile.value) return ''
  const sizeKb = avatarFile.value.size / 1024
  return sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(2)}MB` : `${Math.round(sizeKb)}KB`
})

const triggerAvatarSelect = () => {
  avatarInputRef.value?.click()
}

const resetAvatarOutput = () => {
  revokePreview()
  avatarFile.value = null
  avatarName.value = ''
}

const clearCropEditor = () => {
  revokeCropImageUrl()
  cropImageUrl.value = ''
  cropZoom.value = 1
  previousCropZoom.value = 1
  cropNatural.width = 0
  cropNatural.height = 0
  cropOffset.x = 0
  cropOffset.y = 0
  cropDragState.active = false
}

const syncCropStageSize = () => {
  const nextSize = cropStageRef.value?.clientWidth || DEFAULT_CROP_STAGE_SIZE
  cropStageSize.value = nextSize
}

const clearAvatarSelection = () => {
  resetAvatarOutput()
  clearCropEditor()
  avatarPreview.value = ''
  form.avatarUrl = ''
  if (avatarInputRef.value) {
    avatarInputRef.value.value = ''
  }
}

const getRenderSizeByZoom = (zoomValue) => {
  const width = cropNatural.width
  const height = cropNatural.height
  if (!width || !height) {
    return { width: 0, height: 0 }
  }
  const baseScale = Math.max(cropStageSize.value / width, cropStageSize.value / height)
  const renderScale = baseScale * zoomValue
  return {
    width: width * renderScale,
    height: height * renderScale
  }
}

const clampCropOffset = (nextX, nextY, renderWidth, renderHeight) => {
  const minX = Math.min(0, cropStageSize.value - renderWidth)
  const minY = Math.min(0, cropStageSize.value - renderHeight)
  return {
    x: Math.min(0, Math.max(minX, nextX)),
    y: Math.min(0, Math.max(minY, nextY))
  }
}

const centerCropImage = () => {
  const { width, height } = getRenderSizeByZoom(cropZoom.value)
  const centeredX = (cropStageSize.value - width) / 2
  const centeredY = (cropStageSize.value - height) / 2
  const clamped = clampCropOffset(centeredX, centeredY, width, height)
  cropOffset.x = clamped.x
  cropOffset.y = clamped.y
}

const cropImageStyle = computed(() => {
  const { width, height } = getRenderSizeByZoom(cropZoom.value)
  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(${cropOffset.x}px, ${cropOffset.y}px)`
  }
})

const onCropImageLoad = () => {
  syncCropStageSize()
  const image = cropImageRef.value
  if (!image) return
  cropNatural.width = image.naturalWidth
  cropNatural.height = image.naturalHeight
  cropZoom.value = 1
  previousCropZoom.value = 1
  centerCropImage()
}

const onCropZoomChange = () => {
  if (!cropNatural.width || !cropNatural.height) {
    return
  }

  const oldSize = getRenderSizeByZoom(previousCropZoom.value)
  const newSize = getRenderSizeByZoom(cropZoom.value)
  if (!oldSize.width || !oldSize.height || !newSize.width || !newSize.height) {
    previousCropZoom.value = cropZoom.value
    return
  }

  const stageCenterX = cropStageSize.value / 2
  const stageCenterY = cropStageSize.value / 2
  const anchorX = (stageCenterX - cropOffset.x) / oldSize.width
  const anchorY = (stageCenterY - cropOffset.y) / oldSize.height
  const nextX = stageCenterX - anchorX * newSize.width
  const nextY = stageCenterY - anchorY * newSize.height
  const clamped = clampCropOffset(nextX, nextY, newSize.width, newSize.height)

  cropOffset.x = clamped.x
  cropOffset.y = clamped.y
  previousCropZoom.value = cropZoom.value
}

const startCropDrag = (event) => {
  if (!cropImageUrl.value) {
    return
  }
  cropDragState.active = true
  cropDragState.startX = event.clientX
  cropDragState.startY = event.clientY
  cropDragState.originX = cropOffset.x
  cropDragState.originY = cropOffset.y
  cropStageRef.value?.setPointerCapture?.(event.pointerId)
}

const onCropDrag = (event) => {
  if (!cropDragState.active) {
    return
  }
  const { width, height } = getRenderSizeByZoom(cropZoom.value)
  const deltaX = event.clientX - cropDragState.startX
  const deltaY = event.clientY - cropDragState.startY
  const nextX = cropDragState.originX + deltaX
  const nextY = cropDragState.originY + deltaY
  const clamped = clampCropOffset(nextX, nextY, width, height)
  cropOffset.x = clamped.x
  cropOffset.y = clamped.y
}

const endCropDrag = (event) => {
  if (!cropDragState.active) {
    return
  }
  cropDragState.active = false
  cropStageRef.value?.releasePointerCapture?.(event.pointerId)
}

const createBlobFromCanvas = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob((blob) => resolve(blob), type, quality)
})

const applyCrop = async () => {
  const image = cropImageRef.value
  if (!image) {
    errorMsg.value = '头像图片加载失败，请重新选择'
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = CROPPED_AVATAR_SIZE
  canvas.height = CROPPED_AVATAR_SIZE
  const context = canvas.getContext('2d')
  if (!context) {
    errorMsg.value = '浏览器不支持头像裁剪，请更换浏览器'
    return
  }

  const factor = CROPPED_AVATAR_SIZE / cropStageSize.value
  const { width, height } = getRenderSizeByZoom(cropZoom.value)
  context.scale(factor, factor)
  context.drawImage(image, cropOffset.x, cropOffset.y, width, height)

  const blob = await createBlobFromCanvas(canvas, 'image/jpeg', 0.92)
  if (!blob) {
    errorMsg.value = '头像裁剪失败，请重试'
    return
  }

  if (blob.size > MAX_AVATAR_SIZE) {
    errorMsg.value = '裁剪后的头像超过 20MB，请缩小后重试'
    return
  }

  const baseName = avatarName.value.replace(/\.[^/.]+$/, '') || 'avatar'
  const nextFile = new File([blob], `${baseName}-crop.jpg`, { type: 'image/jpeg' })

  errorMsg.value = ''
  revokePreview()
  avatarFile.value = nextFile
  avatarName.value = nextFile.name
  avatarPreview.value = URL.createObjectURL(nextFile)
  clearCropEditor()
}

const cancelCrop = () => {
  clearCropEditor()
  if (avatarInputRef.value) {
    avatarInputRef.value.value = ''
  }
}

const onAvatarChange = (event) => {
  const file = event.target.files?.[0]
  resetAvatarOutput()
  clearCropEditor()
  if (!file) return

  const mime = String(file.type || '').toLowerCase()
  const lowerName = String(file.name || '').toLowerCase()
  const dotIndex = lowerName.lastIndexOf('.')
  const ext = dotIndex >= 0 ? lowerName.slice(dotIndex) : ''

  if (!ALLOWED_IMAGE_TYPES.has(mime) && !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    errorMsg.value = '头像仅支持 JPG/PNG/WEBP/GIF/BMP/TIFF/AVIF/HEIC/HEIF/SVG/ICO'
    return
  }
  if (file.size > MAX_AVATAR_SIZE) {
    errorMsg.value = '头像大小不能超过 20MB'
    return
  }

  errorMsg.value = ''
  avatarName.value = file.name

  if (PASSTHROUGH_IMAGE_TYPES.has(mime)) {
    avatarFile.value = file
    avatarPreview.value = ''
    return
  }

  cropImageUrl.value = URL.createObjectURL(file)
}

const isEmailValid = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const loadProfile = async () => {
  errorMsg.value = ''
  const res = await fetchCurrentUserApi()
  if (res?.data?.code !== 200 || !res?.data?.data?.id) {
    throw new Error(res?.data?.message || '加载个人信息失败')
  }

  const data = res.data.data
  form.id = data.id
  form.username = data.username || ''
  form.nickname = data.nickname || ''
  form.email = data.email || ''
  form.mobile = data.mobile || ''
  form.avatarUrl = data.avatarUrl || ''
  revokePreview()
  avatarPreview.value = normalizeFileUrl(form.avatarUrl) || ''
}

const save = async () => {
  errorMsg.value = ''
  successMsg.value = ''

  if (!form.id) {
    errorMsg.value = '当前用户信息无效'
    return
  }
  if (form.password && form.password.length < 6) {
    errorMsg.value = '新密码至少 6 位'
    return
  }
  if (!isEmailValid(form.email)) {
    errorMsg.value = '邮箱格式不正确'
    return
  }
  if (cropImageUrl.value && !avatarFile.value) {
    errorMsg.value = '请先确认头像裁剪'
    return
  }

  saving.value = true
  try {
    let finalAvatarUrl = form.avatarUrl || null
    if (avatarFile.value) {
      uploadingAvatar.value = true
      uploadProgress.value = 0
      const uploadRes = await uploadFileApi(avatarFile.value, {
        onProgress: ({ percent }) => {
          uploadProgress.value = percent
        }
      })
      if (uploadRes?.data?.code !== 200 || !uploadRes?.data?.data?.url) {
        throw new Error(uploadRes?.data?.message || '头像上传失败')
      }
      finalAvatarUrl = normalizeFileUrl(uploadRes.data.data.url)
    }

    const payload = {
      nickname: form.nickname || null,
      email: form.email || null,
      mobile: form.mobile || null,
      avatarUrl: finalAvatarUrl
    }
    if (form.password) {
      payload.password = form.password
    }

    const updateRes = await updateUserApi(form.id, payload)
    if (updateRes?.data?.code !== 200) {
      throw new Error(updateRes?.data?.message || '保存失败')
    }

    form.avatarUrl = finalAvatarUrl || ''
    form.password = ''
    resetAvatarOutput()
    avatarPreview.value = normalizeFileUrl(form.avatarUrl) || ''
    if (avatarInputRef.value) avatarInputRef.value.value = ''

    setAuthSession({
      token: undefined,
      user: {
        id: form.id,
        username: form.username,
        avatar: form.avatarUrl || '👤',
        avatarUrl: form.avatarUrl || ''
      }
    })

    successMsg.value = '保存成功'
  } catch (error) {
    errorMsg.value = error?.message || error?.response?.data?.message || '保存失败'
  } finally {
    uploadingAvatar.value = false
    saving.value = false
  }
}

const goHome = () => {
  router.push('/forum-square')
}

onMounted(async () => {
  try {
    await loadProfile()
  } catch (error) {
    errorMsg.value = error?.message || '加载失败'
  }
})

onBeforeUnmount(() => {
  revokePreview()
  revokeCropImageUrl()
})
</script>

<style scoped>
.profile-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}

.panel-card {
  background: linear-gradient(180deg, rgba(255, 255, 253, 0.98), rgba(252, 248, 244, 0.98));
  border: 1px solid rgba(210, 190, 178, 0.95);
  border-radius: 26px;
  padding: 20px;
  box-shadow: 0 22px 55px rgba(166, 139, 117, 0.12);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  color: #cb684d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.avatar-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label span {
  display: block;
  text-align: left;
  margin-bottom: 6px;
  color: #5f4e48;
  font-size: 14px;
}

input {
  width: 100%;
  border: 1px solid #ccb8ab;
  background: #fffdfb;
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 16px;
  box-sizing: border-box;
  color: #2f2623;
}

input::placeholder {
  color: #8d7d75;
}

.file-input {
  padding: 8px 10px;
  background: #fff;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  border: 0;
  padding: 0;
  clip: rect(0, 0, 0, 0);
  overflow: hidden;
}

.avatar-picker {
  width: 100%;
  border: 1px dashed #d2b8a8;
  background: linear-gradient(180deg, #fff8f3, #fffdfb);
  border-radius: 16px;
  min-height: 132px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.avatar-picker:hover {
  border-color: #cd6d4f;
  transform: translateY(-1px);
}

.avatar-picker-tip {
  font-size: 13px;
  color: #8d6e61;
}

.avatar-placeholder {
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 20%, #f4c9b8, #e39b7f);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-editor {
  border: 1px solid #ead8cc;
  border-radius: 16px;
  background: #fffaf7;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.crop-hint {
  margin: 0;
  color: #7d665d;
  font-size: 13px;
  text-align: left;
}

.crop-stage {
  width: 220px;
  height: 220px;
  border-radius: 16px;
  overflow: hidden;
  background: #f3e8e1;
  position: relative;
  margin: 0 auto;
  touch-action: none;
}

.crop-image {
  position: absolute;
  left: 0;
  top: 0;
  user-select: none;
  -webkit-user-drag: none;
}

.crop-ring {
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: 16px;
  box-shadow: inset 0 0 0 2px rgba(225, 130, 99, 0.65);
}

.crop-zoom-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.crop-zoom-control input {
  padding: 0;
}

.crop-actions {
  display: flex;
  gap: 8px;
}

.crop-actions .submit-btn,
.crop-actions .avatar-clear-btn {
  flex: 1;
  min-height: 40px;
}

.avatar-preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.avatar-preview {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #decbbd;
}

.avatar-clear-btn,
.submit-btn,
.shell-btn {
  border: none;
  border-radius: 12px;
  padding: 12px;
  font-weight: 600;
  cursor: pointer;
}

.shell-btn,
.submit-btn {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  background: linear-gradient(120deg, #e18163 0%, #cb694a 100%);
  color: #fff;
}

.avatar-clear-btn {
  width: auto;
  padding: 6px 12px;
  font-size: 13px;
  background: #fff3ec;
  color: #b86247;
}

.avatar-meta,
.side-card p {
  margin: 0;
  color: #695b54;
  line-height: 1.7;
}

.avatar-meta {
  margin-top: -6px;
  text-align: left;
  font-size: 13px;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #8d6e61;
  text-align: left;
}

.upload-progress-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #f2dfd5;
  overflow: hidden;
}

.upload-progress-track i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #f1b47f, #dd7e61);
  transition: width 0.2s ease;
}

input:focus {
  outline: none;
  border-color: #df7d5d;
  box-shadow: 0 0 0 3px rgba(223, 125, 93, 0.16);
}

.submit-btn:disabled,
.shell-btn:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.error {
  min-height: 20px;
  color: #c53535;
  margin: 0;
  text-align: left;
}

.success {
  min-height: 20px;
  color: #3d8f4f;
  margin: 0;
  text-align: left;
}

.side-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 768px) {
  .profile-panel {
    gap: 12px;
  }

  .panel-card {
    border-radius: 20px;
    padding: 16px;
  }

  .auth-form {
    gap: 12px;
  }

  input,
  .shell-btn,
  .submit-btn {
    min-height: 42px;
    font-size: 15px;
  }

  .avatar-preview {
    width: 64px;
    height: 64px;
  }

  .crop-stage {
    width: 188px;
    height: 188px;
  }
}

@media (max-width: 640px) {
  .shell-btn,
  .submit-btn {
    width: 100%;
    justify-content: center;
  }

  .avatar-meta,
  .side-card p {
    font-size: 13px;
  }
}

/* Apple-style page refinement overrides */
.panel-card {
  background: var(--canvas, #fff);
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.section-title {
  color: var(--primary, #0066cc);
  font-weight: 600;
}

label span {
  color: var(--ink, #1d1d1f);
}

input {
  border: 1px solid var(--hairline, #e0e0e0);
  background: var(--canvas, #fff);
  border-radius: 12px;
  color: var(--ink, #1d1d1f);
}

input::placeholder,
.avatar-picker-tip,
.upload-progress,
.avatar-meta,
.side-card p {
  color: var(--ink-muted, #6e6e73);
}

input:focus {
  border-color: var(--primary-focus, #0071e3);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.2);
}

.shell-btn,
.submit-btn {
  background: var(--primary, #0066cc);
  color: #fff;
  border-radius: 9999px;
}

.avatar-clear-btn {
  background: var(--canvas, #fff);
  border: 1px solid var(--hairline, #e0e0e0);
  color: var(--ink, #1d1d1f);
}

.avatar-picker {
  border-color: var(--hairline, #e0e0e0);
  background: linear-gradient(180deg, #ffffff, #f5f5f7);
}

.avatar-picker:hover {
  border-color: var(--primary, #0066cc);
}

.avatar-placeholder {
  background: linear-gradient(135deg, #0066cc, #0058b0);
}

.crop-editor {
  border-color: var(--hairline, #e0e0e0);
  background: #f5f5f7;
}

.crop-ring {
  box-shadow: inset 0 0 0 2px rgba(0, 113, 227, 0.45);
}

.upload-progress-track {
  background: #e8e8ed;
}

.upload-progress-track i {
  background: linear-gradient(90deg, #2997ff, #0066cc);
}
</style>
