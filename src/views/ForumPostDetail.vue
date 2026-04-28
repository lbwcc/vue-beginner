<template>
  <div class="detail-page">
    <header class="detail-topbar">
      <button class="back-btn" type="button" @click="goBack">返回</button>
      <!-- <div class="top-actions">
        <button class="follow-btn" type="button">+ 关注</button>
        <button class="share-btn" type="button">⤴</button>
      </div> -->
    </header>

    <main class="detail-content" v-if="post">
      <section class="post-main">
        <div class="author-row clickable" @click="goUserProfile(post.userId)">
          <img v-if="post.authorAvatarUrl" class="avatar-image" :src="post.authorAvatarUrl" alt="头像" />
          <div v-else class="avatar">{{ getNameInitial(post.authorName) }}</div>
          <div>
            <div class="author-name">{{ post.authorName || ('用户' + post.userId) }}</div>
            <div class="time-text">{{ formatTime(post.createTime) }}</div>
          </div>
        </div>

        <h1 class="post-title">{{ post.title }}</h1>

        <div v-if="post.imageItems && post.imageItems.length" class="media-grid">
          <div
            v-for="(imageItem, index) in post.imageItems"
            :key="`${post.id}-${index}`"
            class="media-item"
          >
            <el-image
              :src="imageItem.thumbnailUrl || imageItem.url"
              :preview-src-list="post.imageItems.map(i => i.url || i.thumbnailUrl).filter(Boolean)"
              preview-teleported
              fit="cover"
              lazy
              @error="onDetailImageError($event, imageItem)"
            />
          </div>
        </div>

        <p class="post-text">{{ displayContent(post.content) }}</p>

        <div class="post-tags">
          <span class="tag">{{ post.category || '默认分类' }}</span>
          <span class="tag subtle">{{ visibilityText(post.visibility) }}</span>
        </div>

        <div class="post-meta">点赞 {{ post.likeCount }} · 评论 {{ post.commentCount }} · 浏览 {{ post.viewCount }}</div>
      </section>

      <section class="comment-section">
        <h2>全部评论 {{ commentTotal }}</h2>

        <div v-for="comment in commentList" :key="comment.id" class="comment-card">
          <div class="comment-head">
            <div class="comment-user">
              <img
                v-if="comment.authorAvatarUrl"
                class="comment-avatar-image"
                :src="comment.authorAvatarUrl"
                alt="头像"
              />
              <div v-else class="comment-avatar">{{ getNameInitial(comment.authorName) }}</div>
              <div class="comment-user-text">
                <div class="comment-name">{{ comment.authorName || ('用户' + comment.userId) }}</div>
                <div class="comment-time">{{ formatTime(comment.createTime) }}</div>
              </div>
            </div>
            <div class="comment-head-right">
              <div class="comment-like-chip">👍 {{ comment.likeCount || 0 }}</div>
              <el-button v-if="comment.canDelete" link type="danger" @click="removeComment(comment)">删除</el-button>
            </div>
          </div>

          <div class="comment-body">{{ comment.content }}</div>

          <div v-if="flattenReplies(comment.children || []).length" class="reply-preview">
            <div
              v-for="child in visibleReplies(comment)"
              :key="child.id"
              class="reply-item"
              :style="{ marginLeft: `${Math.min(child.depth * 12, 36)}px` }"
            >
              <div class="reply-line">
                <span class="reply-author">{{ child.authorName || ('用户' + child.userId) }}</span>
                <span>：{{ child.content }}</span>
              </div>
              <div class="reply-actions">
                <button class="mini-btn" type="button" @click="startReply(child)">回复</button>
                <button v-if="child.canDelete" class="mini-btn danger" type="button" @click="removeComment(child)">
                  删除
                </button>
              </div>
            </div>
            <button
              v-if="flattenReplies(comment.children || []).length > 2"
              class="reply-more"
              type="button"
              @click="toggleReplies(comment.id)"
            >
              {{ expandedReplyMap[comment.id] ? '收起回复' : `展开全部 ${flattenReplies(comment.children || []).length} 条回复` }}
            </button>
          </div>

          <div class="comment-actions">
            <button class="text-btn" type="button" @click="startReply(comment)">回复</button>
          </div>
        </div>

        <div v-if="!commentList.length" class="empty">暂无评论</div>

        <div class="comment-pager" v-if="commentTotal > commentPageSize">
          <el-pagination
            small
            background
            layout="prev, pager, next"
            :current-page="commentPage"
            :page-size="commentPageSize"
            :total="commentTotal"
            @current-change="handleCommentPageChange"
          />
        </div>
      </section>
    </main>

    <div v-else class="empty loading">正在加载帖子...</div>

    <footer class="bottom-bar">
      <button class="comment-input" type="button" @click="focusInput">
        <span class="input-icon">✎</span>
        <span>参与讨论</span>
      </button>
      <button class="metric-btn" type="button" @click="likePost">
        <span class="metric-icon">👍</span>
        <span>{{ post?.likedByMe ? '已赞' : (post?.likeCount || 0) }}</span>
      </button>
      <!-- <button class="metric-btn" type="button" @click="scrollToCommentTop">
        <span class="metric-icon">★</span>
        <span>{{ post?.viewCount || 0 }}</span>
      </button> -->
      <button class="metric-btn" type="button" @click="scrollToCommentTop">
        <span class="metric-icon">💬</span>
        <span>{{ post?.commentCount || 0 }}</span>
      </button>
    </footer>

    <el-dialog v-model="commentDialogVisible" title="发表评论" width="90%" :close-on-click-modal="false">
      <div v-if="replyTarget" class="reply-target">回复：{{ replyTarget.authorName || ('用户' + replyTarget.userId) }}</div>
      <el-input
        v-model="commentDraft"
        type="textarea"
        :autosize="{ minRows: 3, maxRows: 6 }"
        placeholder="输入评论内容"
      />
      <template #footer>
        <el-button @click="cancelComment">取消</el-button>
        <el-button type="primary" @click="submitComment">发布</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addForumCommentApi,
  deleteForumCommentApi,
  getForumPostDetailApi,
  likeForumPostApi,
  listForumCommentsApi,
} from '@/api/forumApi'
import { normalizeFileUrl } from '@/utils/fileUrl'

const route = useRoute()
const router = useRouter()

const postId = computed(() => Number(route.params.id))
const post = ref(null)

const commentList = ref([])
const commentTotal = ref(0)
const commentPage = ref(1)
const commentPageSize = ref(5)

const commentDialogVisible = ref(false)
const commentDraft = ref('')
const replyTarget = ref(null)
const expandedReplyMap = ref({})

const POST_MIXED_MARKER = '#POST_MIXED_V2#'

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

const parsePostContent = (rawContent) => {
  const source = String(rawContent || '')
  if (source.startsWith(POST_MIXED_MARKER)) {
    const rawJson = source.slice(POST_MIXED_MARKER.length).trim()
    try {
      const parsed = JSON.parse(rawJson)
      const text = String(parsed?.text || '').trim()
      const imageItems = Array.isArray(parsed?.images)
        ? parsed.images.map((item) => resolveImageMeta(item)).filter(Boolean)
        : []
      return { text, imageItems }
    } catch {
      return { text: source.trim(), imageItems: [] }
    }
  }

  const lines = source.split('\n')
  const markerIndex = lines.findIndex((line) => line.trim() === '#MIXED#')
  if (markerIndex >= 0) {
    const text = lines.slice(0, markerIndex).join('\n').trim()
    const imageItems = lines
      .slice(markerIndex + 1)
      .map((line) => resolveImageMeta(line))
      .filter(Boolean)
    return { text, imageItems }
  }

  const imageItems = (source.match(/https?:\/\/[^\s)]+/g) || [])
    .map((item) => resolveImageMeta(item))
    .filter(Boolean)
  const text = source
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/#ALBUM#|#MIXED#/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { text, imageItems }
}

const displayContent = (content) => {
  return parsePostContent(content).text
}

const getPostImageItems = (content) => {
  return parsePostContent(content).imageItems
}

const getPostImages = (content) => {
  return getPostImageItems(content).map((item) => item.url).filter(Boolean)
}

const onDetailImageError = (evt, item) => {
  try {
    const el = evt?.target
    if (!el) return
    const fallback = item?.thumbnailUrl || ''
    if (fallback && el.src !== fallback) {
      el.src = fallback
    } else {
      el.src = ''
    }
  } catch {}
}

// image preview handled by Element Plus `el-image`

const unwrap = (res) => {
  return res?.data?.data ?? res?.data ?? null
}

const loadPost = async () => {
  const data = unwrap(await getForumPostDetailApi(postId.value))
  post.value = data
    ? {
      ...data,
      authorAvatarUrl: normalizeFileUrl(data.authorAvatarUrl),
      imageItems: parsePostContent(data.content).imageItems || [],
    }
    : null
}

const loadComments = async (page = commentPage.value) => {
  const data = unwrap(await listForumCommentsApi(postId.value, { page, pageSize: commentPageSize.value }))
  const list = Array.isArray(data?.list) ? data.list : []
  commentList.value = list.map((item) => ({
    ...item,
    authorAvatarUrl: normalizeFileUrl(item?.authorAvatarUrl),
  }))
  commentTotal.value = Number(data?.total || 0)
  commentPage.value = Number(data?.page || page)
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.replace('/forum-square')
}

const goUserProfile = (userId) => {
  router.push(`/users/${userId}`)
}

const likePost = async () => {
  if (post.value?.likedByMe) {
    ElMessage.info('你已经点过赞了')
    return
  }
  await likeForumPostApi(postId.value)
  await loadPost()
}

const focusInput = () => {
  commentDialogVisible.value = true
}

const startReply = (comment) => {
  replyTarget.value = comment
  commentDialogVisible.value = true
}

const flattenReplies = (children, depth = 1) => {
  const list = []
  for (const item of children || []) {
    list.push({ ...item, depth })
    if (Array.isArray(item.children) && item.children.length) {
      list.push(...flattenReplies(item.children, depth + 1))
    }
  }
  return list
}

const visibleReplies = (comment) => {
  const all = flattenReplies(comment.children || [])
  if (expandedReplyMap.value[comment.id]) {
    return all
  }
  return all.slice(0, 2)
}

const toggleReplies = (commentId) => {
  expandedReplyMap.value = {
    ...expandedReplyMap.value,
    [commentId]: !expandedReplyMap.value[commentId],
  }
}

const cancelComment = () => {
  commentDialogVisible.value = false
  commentDraft.value = ''
  replyTarget.value = null
}

const submitComment = async () => {
  const content = String(commentDraft.value || '').trim()
  if (!content) {
    ElMessage.warning('请输入评论内容')
    return
  }

  const payload = replyTarget.value ? { content, parentId: replyTarget.value.id } : { content }
  await addForumCommentApi(postId.value, payload)
  ElMessage.success('评论成功')
  cancelComment()
  await Promise.all([loadPost(), loadComments(1)])
}

const removeComment = async (comment) => {
  try {
    await ElMessageBox.confirm('确定删除这条评论吗？其回复会一并删除。', '删除评论', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  await deleteForumCommentApi(postId.value, comment.id)
  ElMessage.success('评论已删除')
  await Promise.all([loadPost(), loadComments(commentPage.value)])
}

const handleCommentPageChange = async (nextPage) => {
  await loadComments(nextPage)
}

const scrollToCommentTop = () => {
  const target = document.querySelector('.comment-section')
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const visibilityText = (visibility) => {
  if (visibility === 1) return '仅自己可见'
  if (visibility === 2) return '好友可见'
  return '公开'
}

const getNameInitial = (name) => {
  const text = String(name || '').trim()
  return text ? text.slice(0, 1).toUpperCase() : 'U'
}

const formatTime = (value) => {
  if (!value || value === 'null') {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  if (!Number.isFinite(postId.value) || postId.value <= 0) {
    ElMessage.error('帖子参数错误')
    router.replace('/forum-square')
    return
  }
  await Promise.all([loadPost(), loadComments(1)])
})
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #fdf8f3;
  color: #2f2623;
  padding-bottom: 74px;
}

.detail-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 52px;
  background: #fdf8f3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid rgba(210, 190, 178, 0.8);
}

.back-btn,
.follow-btn,
.share-btn {
  border: 0;
  background: rgba(255, 252, 248, 0.9);
  border-radius: 10px;
  height: 32px;
  padding: 0 12px;
  font-size: 14px;
  color: #5a4b46;
}

.top-actions {
  display: flex;
  gap: 8px;
}

.detail-content {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.post-main {
  background: linear-gradient(180deg, rgba(255, 255, 253, 0.98), rgba(252, 248, 244, 0.98));
  border: 1px solid rgba(210, 190, 178, 0.95);
  border-radius: 22px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(166, 139, 117, 0.09);
}

.author-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.clickable {
  cursor: pointer;
}

.avatar,
.comment-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e58a6a, #c86040);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-image,
.comment-avatar-image {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.author-name {
  font-size: 18px;
  font-weight: 800;
  color: #2f2623;
}

.time-text {
  margin-top: 2px;
  color: #8e7d74;
  font-size: 12px;
}

.post-title {
  margin: 14px 0 8px;
  font-size: 24px;
  line-height: 1.3;
  color: #1e1713;
}

.media-grid {
  margin: 10px 0 12px;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.media-item {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  cursor: zoom-in;
}

.media-item :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.post-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.78;
  font-size: 16px;
  color: #3a2e29;
}

.post-tags {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.tag {
  font-size: 12px;
  border-radius: 999px;
  padding: 2px 10px;
  background: #fff0e8;
  color: #c8603e;
}

.tag.subtle {
  background: rgba(226, 213, 202, 0.4);
  color: #7a6257;
}

.post-meta {
  margin-top: 10px;
  color: #8e7d74;
  font-size: 13px;
}

.comment-section {
  background: linear-gradient(180deg, rgba(255, 255, 253, 0.98), rgba(252, 248, 244, 0.98));
  border: 1px solid rgba(210, 190, 178, 0.95);
  border-radius: 22px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(166, 139, 117, 0.09);
}

.comment-section h2 {
  margin: 0 0 12px;
  font-size: 22px;
  color: #cb684d;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.comment-card {
  border-top: 1px solid rgba(226, 213, 202, 0.8);
  padding: 14px 0;
}

.comment-card:first-of-type {
  border-top: none;
  padding-top: 0;
}

.comment-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.comment-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-like-chip {
  font-size: 12px;
  color: #b09e96;
  min-width: 56px;
  text-align: right;
}

.comment-user {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.comment-user-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.comment-name {
  font-weight: 700;
  color: #2f2623;
}

.comment-time {
  font-size: 12px;
  color: #8e7d74;
}

.comment-body {
  margin-top: 10px;
  line-height: 1.7;
  white-space: pre-wrap;
  font-size: 16px;
  background: rgba(255, 248, 243, 0.8);
  border-radius: 12px;
  padding: 10px;
}

.reply-preview {
  margin-top: 8px;
  background: rgba(255, 248, 243, 0.6);
  border-radius: 12px;
  padding: 8px;
}

.reply-item {
  font-size: 13px;
  color: #7a6257;
  line-height: 1.6;
}

.reply-line {
  white-space: pre-wrap;
}

.reply-author {
  color: #5a3e36;
  font-weight: 700;
}

.reply-actions {
  margin-top: 2px;
  display: flex;
  gap: 8px;
}

.mini-btn {
  border: 0;
  background: transparent;
  color: #cb684d;
  font-size: 12px;
  padding: 0;
  cursor: pointer;
}

.mini-btn.danger {
  color: #ef4444;
}

.reply-more {
  border: 0;
  background: transparent;
  margin-top: 6px;
  font-size: 12px;
  color: #cb684d;
  padding: 0;
  cursor: pointer;
}

.comment-actions {
  margin-top: 8px;
}

.text-btn {
  border: 0;
  background: transparent;
  color: #cb684d;
  padding: 0;
  font-size: 13px;
  cursor: pointer;
}

.empty {
  color: #b09e96;
  text-align: center;
  padding: 14px 0;
}

.loading {
  padding-top: 120px;
}

.comment-pager {
  margin-top: 6px;
  display: flex;
  justify-content: center;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 62px;
  background: rgba(253, 248, 243, 0.97);
  border-top: 1px solid rgba(210, 190, 178, 0.8);
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 6px;
  align-items: center;
  padding: 0 8px;
  z-index: 30;
  backdrop-filter: blur(8px);
}

.comment-input {
  border: 0;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 248, 243, 0.9);
  border: 1px solid rgba(226, 213, 202, 0.9);
  text-align: left;
  padding: 0 12px;
  color: #8e7d74;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.metric-btn {
  border: 0;
  height: 38px;
  min-width: 54px;
  border-radius: 10px;
  background: rgba(255, 248, 243, 0.9);
  color: #5a4b46;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
}

.input-icon {
  font-size: 14px;
}

.metric-icon {
  font-size: 14px;
}

.reply-target {
  margin-bottom: 8px;
  font-size: 12px;
  color: #8e7d74;
}

.video-thumb {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: zoom-in;
  overflow: hidden;
}

.video-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-play {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.48);
  color: #fff;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.preview-video {
  width: 100%;
  max-height: 80vh;
  border-radius: 8px;
  background: #000;
}

.video-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}
</style>

<style>
/* 全局覆盖：确保 Element Plus 的图片查看器为固定定位并正确居中 */
.el-image-viewer__wrapper {
  position: fixed !important;
  inset: 0 !important;
  z-index: 99999 !important;
}
.el-image-viewer__canvas {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 100% !important;
}
.el-image-viewer__mask {
  position: fixed !important;
  inset: 0 !important;
}
</style>

<style>
/* 增强：让查看器按钮在列表/详情均一致可见 */
.el-image-viewer__close {
  right: 18px !important;
  top: 18px !important;
  z-index: 100001 !important;
  width: 44px !important;
  height: 44px !important;
  border-radius: 10px !important;
  background: rgba(255,255,255,0.06) !important;
  color: #fff !important;
  display: grid !important;
  place-items: center !important;
  box-shadow: 0 8px 18px rgba(0,0,0,0.35) !important;
}
.el-image-viewer__close:hover {
  background: rgba(255,255,255,0.12) !important;
}
.el-image-viewer__actions {
  z-index: 100000 !important;
  bottom: 28px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  background: rgba(0,0,0,0.36) !important;
  padding: 6px 12px !important;
  border-radius: 999px !important;
  display: flex !important;
  gap: 10px !important;
  align-items: center !important;
}
</style>
