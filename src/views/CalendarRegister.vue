<template>
  <AppShell
    title="注册账号"
    eyebrow="欢迎加入"
    subtitle="保留现有注册与头像上传流程，界面统一到当前工作台风格。"
    active-section="profile"
  >
    <template #header-actions>
      <button class="shell-btn" type="button" @click="goLogin">去登录</button>
    </template>

    <section class="register-panel">
      <form @submit.prevent="submitRegister" class="auth-form panel-card">
        <div class="section-title">账号信息</div>

        <div class="avatar-field">
          <span>头像（可选）</span>
          <input
            ref="avatarInputRef"
            class="file-input sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            @change="onAvatarChange"
          />
          <button class="avatar-picker" type="button" @click="triggerAvatarSelect">
            <img v-if="avatarPreview" :src="avatarPreview" alt="avatar preview" class="avatar-preview" />
            <div v-else class="avatar-placeholder">上传头像</div>
            <span class="avatar-picker-tip">{{ avatarPreview ? '点击重新选择' : '点击选择图片' }}</span>
          </button>
        </div>

        <div v-if="cropImageUrl" class="crop-editor">
          <p class="crop-hint">拖动图片并调整缩放，确认后才会上传该头像</p>
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

        <label>
          <span>用户名</span>
          <input v-model.trim="form.username" placeholder="请输入用户名" maxlength="64" />
        </label>

        <label>
          <span>昵称（可选）</span>
          <input v-model.trim="form.nickname" placeholder="例如：小李" maxlength="64" />
        </label>

        <label>
          <span>邮箱（可选）</span>
          <input v-model.trim="form.email" placeholder="请输入邮箱" maxlength="128" />
        </label>

        <label>
          <span>手机号（可选）</span>
          <input v-model.trim="form.mobile" placeholder="请输入手机号" maxlength="32" />
        </label>

        <label>
          <span>密码</span>
          <input v-model="form.password" type="password" placeholder="至少 6 位" maxlength="64" />
        </label>

        <label>
          <span>确认密码</span>
          <input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" maxlength="64" />
        </label>

        <p class="error" v-if="errorMsg">{{ errorMsg }}</p>

        <button :disabled="loading" type="submit" class="submit-btn">
          {{ loading ? '注册中...' : '注册并登录' }}
        </button>

        <p class="switch-row">
          已有账号？
          <button type="button" class="text-link" @click="goLogin">去登录</button>
        </p>
      </form>
    </section>

    <template #aside>
      <section class="panel-card side-card">
        <div class="section-title">注册提示</div>
        <p>点击头像位即可选择图片，拖动和缩放后确认裁剪。</p>
        <p>头像支持 PNG、JPG、WEBP、GIF，裁剪结果不超过 2MB。</p>
        <p>密码不少于 6 位，建议使用字母和数字组合。</p>
        <p>注册成功后将自动登录并跳转到社区广场。</p>
      </section>
    </template>
  </AppShell>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { fetchCurrentUserApi, registerApi, updateUserApi } from '@/api/authApi'
import { uploadFileApi } from '@/api/fileApi'
import { setAuthSession } from '@/utils/auth'
import { normalizeFileUrl } from '@/utils/fileUrl'

const route = useRoute()
const router = useRouter()

const form = reactive({
  username: '',
  nickname: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const errorMsg = ref('')
const avatarInputRef = ref(null)
const cropStageRef = ref(null)
const cropImageRef = ref(null)
const avatarFile = ref(null)
const avatarPreview = ref('')
const avatarName = ref('')
const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
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

const avatarSizeText = computed(() => {
  if (!avatarFile.value) return ''
  const sizeKb = avatarFile.value.size / 1024
  return sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(2)}MB` : `${Math.round(sizeKb)}KB`
})

const revokeAvatarPreview = () => {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
  }
}

const revokeCropImageUrl = () => {
  if (cropImageUrl.value) {
    URL.revokeObjectURL(cropImageUrl.value)
  }
}

const triggerAvatarSelect = () => {
  avatarInputRef.value?.click()
}

const resetAvatarOutput = () => {
  revokeAvatarPreview()
  avatarFile.value = null
  avatarPreview.value = ''
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
    errorMsg.value = '裁剪后的头像超过 2MB，请缩小后重试'
    return
  }

  const baseName = avatarName.value.replace(/\.[^/.]+$/, '') || 'avatar'
  const nextFile = new File([blob], `${baseName}-crop.jpg`, { type: 'image/jpeg' })

  errorMsg.value = ''
  resetAvatarOutput()
  avatarFile.value = nextFile
  avatarName.value = nextFile.name
  avatarPreview.value = URL.createObjectURL(nextFile)
  clearCropEditor()
}

const cancelCrop = () => {
  clearCropEditor()
  if (!avatarFile.value) {
    avatarName.value = ''
  }
  if (avatarInputRef.value) {
    avatarInputRef.value.value = ''
  }
}

const onAvatarChange = (event) => {
  const file = event.target.files?.[0]
  resetAvatarOutput()
  clearCropEditor()

  if (!file) {
    return
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    errorMsg.value = '仅支持 PNG/JPG/WEBP/GIF 格式头像'
    return
  }

  if (file.size > MAX_AVATAR_SIZE) {
    errorMsg.value = '头像大小不能超过 2MB'
    return
  }

  errorMsg.value = ''
  avatarName.value = file.name
  cropImageUrl.value = URL.createObjectURL(file)
}

onBeforeUnmount(() => {
  revokeAvatarPreview()
  revokeCropImageUrl()
})

const isEmailValid = (email) => {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const goLogin = () => {
  router.push('/login')
}

const submitRegister = async () => {
  errorMsg.value = ''

  if (!form.username || !form.password) {
    errorMsg.value = '用户名和密码不能为空'
    return
  }

  if (form.password.length < 6) {
    errorMsg.value = '密码至少 6 位'
    return
  }

  if (form.password !== form.confirmPassword) {
    errorMsg.value = '两次输入的密码不一致'
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

  loading.value = true
  try {
    const registerRes = await registerApi({
      username: form.username,
      password: form.password,
      nickname: form.nickname || null,
      email: form.email || null,
      mobile: form.mobile || null
    })

    if (registerRes?.data?.code !== 200 || !registerRes?.data?.data?.token) {
      errorMsg.value = registerRes?.data?.message || '注册失败'
      return
    }

    const token = registerRes.data.data.token
    const fallbackUsername = registerRes.data.data.username || form.username
    setAuthSession({ token, user: { username: fallbackUsername } })

    let currentUser = { username: fallbackUsername }
    try {
      const meRes = await fetchCurrentUserApi()
      if (meRes?.data?.code === 200 && meRes?.data?.data?.username) {
        currentUser = {
          id: meRes.data.data.id,
          username: meRes.data.data.username
        }

        if (avatarFile.value && currentUser.id) {
          const uploadRes = await uploadFileApi(avatarFile.value)
          const avatarUrl = normalizeFileUrl(uploadRes?.data?.data?.url)
          if (uploadRes?.data?.code === 200 && avatarUrl) {
            await updateUserApi(currentUser.id, { avatarUrl })
          } else {
            throw new Error(uploadRes?.data?.message || '头像上传失败')
          }
        }
      }
    } catch (error) {
      if (avatarFile.value) {
        throw error
      }
      currentUser = { username: fallbackUsername }
    }

    setAuthSession({ token, user: currentUser })

    const redirectPath = typeof route.query.redirect === 'string' && route.query.redirect
      ? route.query.redirect
      : '/forum-square'
    router.replace(redirectPath)
  } catch (error) {
    errorMsg.value = error?.response?.data?.message || '注册失败，请检查后端服务'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-panel {
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
.shell-btn,
.text-link {
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
.switch-row,
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

.switch-row {
  text-align: left;
}

.text-link {
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #a7543a;
}

.side-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 768px) {
  .register-panel {
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
  .switch-row,
  .side-card p {
    font-size: 13px;
  }
}
</style>