<template>
  <div class="detail-page">
    <header class="detail-topbar">
      <button class="back-btn" type="button" @click="goBack">‹ 返回</button>
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

        <div v-if="hasCoverMedia" class="cover-block">
          <img v-if="coverMedia.type === 'image'" class="cover-image" :src="coverMedia.url" alt="帖子主图" />
          <video v-else-if="coverMedia.type === 'video'" class="cover-image" :src="coverMedia.url" controls preload="metadata" />
          <div class="cover-tag">{{ coverMedia.type === 'video' ? '视频' : '主图' }}</div>
        </div>

        <p class="post-text">{{ post.content }}</p>

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

const coverMedia = computed(() => {
  const content = String(post.value?.content || '')
  const urls = content.match(/(?:https?:\/\/[^\s)]+|\/[\w./%-]+(?:\?[\w=&%-]+)?)/g) || []
  const normalizedUrls = urls.map((item) => normalizeFileUrl(item)).filter(Boolean)
  const firstVideo = normalizedUrls.find((item) => /\.(mp4|webm|ogg)(\?|$)/i.test(item))
  if (firstVideo) {
    return { type: 'video', url: firstVideo }
  }
  const firstImage = normalizedUrls.find((item) => /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(item))
  if (firstImage) {
    return { type: 'image', url: firstImage }
  }
  return { type: '', url: '' }
})

const hasCoverMedia = computed(() => {
  return !!coverMedia.value.url
})

const unwrap = (res) => {
  return res?.data?.data ?? res?.data ?? null
}

const loadPost = async () => {
  const data = unwrap(await getForumPostDetailApi(postId.value))
  post.value = data
    ? {
      ...data,
      authorAvatarUrl: normalizeFileUrl(data.authorAvatarUrl),
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
  background: #f4f5f7;
  color: #111827;
  padding-bottom: 74px;
}

.detail-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 52px;
  background: #f4f5f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid #e5e7eb;
}

.back-btn,
.follow-btn,
.share-btn {
  border: 0;
  background: #fff;
  border-radius: 8px;
  height: 32px;
  padding: 0 10px;
  font-size: 14px;
  color: #111827;
}

.top-actions {
  display: flex;
  gap: 8px;
}

.detail-content {
  padding: 10px 12px;
}

.post-main {
  background: #fff;
  border-radius: 12px;
  padding: 12px;
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
  background: linear-gradient(135deg, #0f172a, #334155);
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
}

.time-text {
  margin-top: 2px;
  color: #6b7280;
  font-size: 12px;
}

.post-title {
  margin: 14px 0 8px;
  font-size: 24px;
  line-height: 1.3;
}

.cover-block {
  margin: 10px 0 12px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: #111827;
}

.cover-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

.cover-tag {
  position: absolute;
  right: 8px;
  bottom: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
}

.post-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
  font-size: 16px;
}

.post-tags {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.tag {
  font-size: 12px;
  border-radius: 999px;
  padding: 2px 10px;
  background: #e8eefb;
  color: #1d4ed8;
}

.tag.subtle {
  background: #eef2f7;
  color: #475569;
}

.post-meta {
  margin-top: 10px;
  color: #6b7280;
  font-size: 13px;
}

.comment-section {
  margin-top: 10px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
}

.comment-section h2 {
  margin: 0 0 10px;
  font-size: 28px;
}

.comment-card {
  border-top: 1px solid #edf1f5;
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
  color: #9ca3af;
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
}

.comment-time {
  font-size: 12px;
  color: #6b7280;
}

.comment-body {
  margin-top: 10px;
  line-height: 1.7;
  white-space: pre-wrap;
  font-size: 16px;
  background: #f8fafc;
  border-radius: 10px;
  padding: 10px;
}

.reply-preview {
  margin-top: 8px;
  background: #f7f9fc;
  border-radius: 8px;
  padding: 8px;
}

.reply-item {
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
}

.reply-line {
  white-space: pre-wrap;
}

.reply-author {
  color: #334155;
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
  color: #2563eb;
  font-size: 12px;
  padding: 0;
}

.mini-btn.danger {
  color: #ef4444;
}

.reply-more {
  border: 0;
  background: transparent;
  margin-top: 6px;
  font-size: 12px;
  color: #2563eb;
  padding: 0;
}

.comment-actions {
  margin-top: 8px;
}

.text-btn {
  border: 0;
  background: transparent;
  color: #2563eb;
  padding: 0;
  font-size: 13px;
}

.empty {
  color: #9ca3af;
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
  background: #fff;
  border-top: 1px solid #e5e7eb;
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 6px;
  align-items: center;
  padding: 0 8px;
  z-index: 30;
}

.comment-input {
  border: 0;
  height: 38px;
  border-radius: 8px;
  background: #f3f4f6;
  text-align: left;
  padding: 0 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
}

.metric-btn {
  border: 0;
  height: 38px;
  min-width: 54px;
  border-radius: 8px;
  background: #f8fafc;
  color: #374151;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
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
  color: #6b7280;
}
</style>
