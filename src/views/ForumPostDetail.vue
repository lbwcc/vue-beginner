<template>
  <div ref="detailMotionRoot" class="detail-page">
    <header class="detail-topbar">
      <button class="back-btn" type="button" @click="goBack">返回</button>
      <!-- <div class="top-actions">
        <button class="follow-btn" type="button">+ 关注</button>
        <button class="share-btn" type="button">⤴</button>
      </div> -->
    </header>

    <main class="detail-content" :class="{ 'is-loading': !post }">
      <section class="post-main" v-if="post" v-reveal="{ y: 16, duration: 0.42 }">
        <div class="author-row clickable" @click="goUserProfile(post.userId)">
          <img v-if="post.authorAvatarUrl" class="avatar-image" :src="post.authorAvatarUrl" alt="头像" />
          <div v-else class="avatar">{{ getNameInitial(post.authorName) }}</div>
          <div>
            <div class="author-name">{{ post.authorName || ('用户' + post.userId) }}</div>
            <div class="time-text">{{ formatTime(post.createTime) }}</div>
          </div>
        </div>

        <h1 class="post-title">{{ post.title }}</h1>

        <div
          v-if="post.imageItems && post.imageItems.length"
          class="media-grid"
          :class="{ 'single-image': post.imageItems.length === 1 }"
        >
          <div
            v-for="(imageItem, index) in post.imageItems"
            :key="`${post.id}-${index}`"
            class="media-item"
          >
            <el-image
              :src="imageItem.thumbnailUrl || imageItem.url"
              :preview-src-list="post.imageItems.map(i => i.url || i.thumbnailUrl).filter(Boolean)"
              preview-teleported
              :fit="post.imageItems.length === 1 ? 'contain' : 'cover'"
              lazy
              @error="onDetailImageError($event, imageItem)"
            />
          </div>
        </div>

        <div class="post-text"><RichTextViewer :content="post.content" /></div>

        <div class="post-tags">
          <span class="tag">{{ post.category || '默认分类' }}</span>
          <span class="tag subtle">{{ visibilityText(post.visibility) }}</span>
        </div>

        <div class="post-meta">浏览 {{ post.viewCount }} · 发布于 {{ formatTime(post.createTime) }}</div>
      </section>

      <section v-else class="post-main skeleton-panel">
        <div class="author-row">
          <div class="avatar skeleton-block"></div>
          <div class="skeleton-stack">
            <div class="skeleton-line skeleton-line-lg"></div>
            <div class="skeleton-line skeleton-line-sm"></div>
          </div>
        </div>
        <div class="skeleton-line skeleton-line-title"></div>
        <div class="media-grid single-image skeleton-media-grid">
          <div class="media-item skeleton-block"></div>
        </div>
        <div class="skeleton-copy">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line skeleton-line-short"></div>
        </div>
        <div class="post-tags">
          <span class="tag skeleton-pill"></span>
          <span class="tag subtle skeleton-pill"></span>
        </div>
        <div class="post-meta skeleton-line skeleton-line-meta"></div>
      </section>

      <section class="comment-section" v-reveal="{ y: 18, duration: 0.44, delay: 0.08 }">
        <h2>全部评论 {{ commentTotal }}</h2>

        <div v-for="comment in commentList" :key="comment.id" class="comment-card" v-reveal="{ y: 14, duration: 0.34, scroll: true, start: 'top 93%' }">
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

        <template v-if="post">
          <div v-if="!commentList.length" class="empty">暂无评论</div>
        </template>
        <template v-else>
          <div class="comment-card skeleton-comment-card" v-for="n in 2" :key="`comment-skeleton-${n}`">
            <div class="comment-head">
              <div class="comment-user">
                <div class="comment-avatar skeleton-block"></div>
                <div class="comment-user-text">
                  <div class="skeleton-line skeleton-line-lg"></div>
                  <div class="skeleton-line skeleton-line-sm"></div>
                </div>
              </div>
              <div class="comment-like-chip skeleton-chip"></div>
            </div>
            <div class="comment-body skeleton-body"></div>
            <div class="comment-actions">
              <button class="text-btn skeleton-btn" type="button" disabled>回复</button>
            </div>
          </div>
        </template>

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

    <footer class="bottom-bar" v-reveal="{ y: 12, duration: 0.3, delay: 0.12 }">
      <button class="comment-input icon-action-btn" type="button" @click="handleCommentInputClick" @mouseenter="handleIconHover($event, true)" @mouseleave="handleIconHover($event, false)" aria-label="参与讨论" title="参与讨论">
        <svg class="action-icon comment-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path class="comment-fill" d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4 3v-3H7.5A2.5 2.5 0 0 1 5 12.5Z"/>
          <path class="comment-outline" d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4 3v-3H7.5A2.5 2.5 0 0 1 5 12.5Z"/>
          <circle class="comment-dot" cx="9" cy="9.75" r="0.9"/>
          <circle class="comment-dot" cx="12" cy="9.75" r="0.9"/>
          <circle class="comment-dot" cx="15" cy="9.75" r="0.9"/>
        </svg>
      </button>
      <button class="metric-btn icon-action-btn like-action-btn" type="button" @click="handleLikeClick" @mouseenter="handleIconHover($event, true)" @mouseleave="handleIconHover($event, false)" :class="{ liked: post?.likedByMe }" :aria-label="post?.likedByMe ? '已点赞' : '点赞'" :title="post?.likedByMe ? '已点赞' : '点赞'">
        <svg class="action-icon like-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path class="like-fill" d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 17.5 3 20.58 3 23 5.42 23 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/>
          <path class="like-outline" d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 17.5 3 20.58 3 23 5.42 23 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/>
          <path class="like-spark" d="M20 2.2 20.32 3.48 21.6 3.8 20.32 4.12 20 5.4 19.68 4.12 18.4 3.8 19.68 3.48Z"/>
        </svg>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import RichTextViewer from '@/components/RichTextViewer.vue'
import {
  addForumCommentApi,
  deleteForumCommentApi,
  getForumPostDetailApi,
  likeForumPostApi,
  listForumCommentsApi,
} from '@/api/forumApi'
import { normalizeFileUrl } from '@/utils/fileUrl'
import { parsePostMixedV2 } from '@/utils/postContent'
import { gsap, prefersReducedMotion } from '@/plugins/gsapMotion'

const route = useRoute()
const router = useRouter()
const detailMotionRoot = ref(null)
let detailMotionCtx = null

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

// 从HTML内容中提取纯文本
const extractPlainText = (content) => {
  if (!content) return ''
  // 移除HTML标签
  const plainText = String(content)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
  return plainText
}

const parsePostContent = (rawContent) => {
  const source = String(rawContent || '')
  // V2 格式由 RichTextViewer 统一渲染图片，此处不提取 imageItems 避免重复
  const v2 = parsePostMixedV2(source)
  if (v2) {
    return { text: v2.textBlocks.join('\n'), imageItems: [] }
  }
  const imageItemsFromMarkdown = [...source.matchAll(/!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\)/g)]
    .map((match) => resolveImageMeta(match?.[1] || match?.[2]))
    .filter(Boolean)

  const imageItems = imageItemsFromMarkdown.length
    ? imageItemsFromMarkdown
    : (source.match(/https?:\/\/[^\s)"',}\]]+/g) || [])
    .map((item) => resolveImageMeta(item))
    .filter(Boolean)
  const text = source
    .replace(/!\[[^\]]*\]\((?:<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\)/g, ' ')
    .replace(/https?:\/\/[^\s)"',}\]]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { text, imageItems }
}

const displayContent = (content) => {
  const text = parsePostContent(content).text
  // 如果是HTML内容，提取纯文本；否则返回原文本
  return extractPlainText(text)
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

const getActionSvg = (eventOrEl) => {
  const buttonEl = eventOrEl?.currentTarget || eventOrEl
  if (!(buttonEl instanceof Element)) {
    return null
  }
  return buttonEl.querySelector('svg.action-icon')
}

const animateIconHover = (eventOrEl, entering) => {
  if (prefersReducedMotion()) return
  const svg = getActionSvg(eventOrEl)
  if (!svg) return
  gsap.killTweensOf(svg)
  gsap.to(svg, {
    scale: entering ? 1.18 : 1,
    duration: entering ? 0.22 : 0.18,
    ease: entering ? 'back.out(2)' : 'power2.out',
    transformOrigin: '50% 50%',
  })
}

const animateIconTap = (eventOrEl, { liked = false } = {}) => {
  if (prefersReducedMotion()) return
  const svg = getActionSvg(eventOrEl)
  if (!svg) return
  gsap.killTweensOf(svg)

  if (liked) {
    gsap.timeline({ defaults: { transformOrigin: '50% 50%' } })
      .fromTo(svg, { scale: 1 }, { scale: 1.4, duration: 0.13, ease: 'power3.out' })
      .to(svg, { scale: 0.84, duration: 0.1, ease: 'power2.in' })
      .to(svg, { scale: 1, duration: 0.46, ease: 'elastic.out(1.1, 0.42)' })
  } else {
    gsap.timeline({ defaults: { transformOrigin: '50% 50%' } })
      .fromTo(svg, { scale: 1 }, { scale: 1.22, duration: 0.12, ease: 'power2.out' })
      .to(svg, { scale: 1, duration: 0.26, ease: 'back.out(2.5)' })
  }
}

const handleIconHover = (event, entering) => {
  animateIconHover(event, entering)
}

const likePost = async () => {
  await likeForumPostApi(postId.value)
  await loadPost()
}

const handleLikeClick = async (event) => {
  if (post.value?.likedByMe) {
    animateIconTap(event, { liked: false })
    ElMessage.info('你已经点过赞了')
    return
  }
  animateIconTap(event, { liked: true })
  await likePost()
}

const focusInput = () => {
  commentDialogVisible.value = true
}

const handleCommentInputClick = (event) => {
  animateIconTap(event)
  focusInput()
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

  await nextTick()
  if (!prefersReducedMotion() && detailMotionRoot.value) {
    detailMotionCtx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power2.out' } })
        .from('.detail-topbar', { autoAlpha: 0, y: -10, duration: 0.26 })
        .from('.post-main', { autoAlpha: 0, y: 14, duration: 0.34 }, '-=0.14')
        .from('.comment-card', { autoAlpha: 0, y: 10, stagger: 0.04, duration: 0.2 }, '-=0.1')
    }, detailMotionRoot.value)
  }
})

onBeforeUnmount(() => {
  detailMotionCtx?.revert()
  detailMotionCtx = null
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

.skeleton-panel {
  min-height: 380px;
}

.skeleton-block,
.skeleton-line,
.skeleton-pill,
.skeleton-chip,
.skeleton-body {
  background: linear-gradient(90deg, rgba(227, 214, 205, 0.52), rgba(241, 232, 225, 0.96), rgba(227, 214, 205, 0.52));
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.35s ease-in-out infinite;
}

.skeleton-stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 2px;
}

.skeleton-line {
  height: 12px;
  border-radius: 999px;
}

.skeleton-line-lg {
  width: 38%;
}

.skeleton-line-sm {
  width: 24%;
}

.skeleton-line-title {
  width: min(72%, 360px);
  height: 26px;
  margin: 14px 0 8px;
  border-radius: 12px;
}

.skeleton-media-grid {
  margin-top: 10px;
}

.skeleton-copy {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.skeleton-copy .skeleton-line {
  width: 100%;
  height: 14px;
}

.skeleton-copy .skeleton-line-short {
  width: 64%;
}

.skeleton-pill {
  display: inline-flex;
  min-width: 72px;
  min-height: 20px;
}

.skeleton-line-meta {
  width: 58%;
  height: 13px;
  margin-top: 10px;
}

.skeleton-comment-card {
  min-height: 140px;
}

.skeleton-chip {
  width: 56px;
  height: 18px;
  border-radius: 999px;
}

.skeleton-body {
  height: 64px;
  border-radius: 12px;
  margin-top: 10px;
}

.skeleton-btn {
  pointer-events: none;
  opacity: 0.72;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
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

.media-grid.single-image {
  grid-template-columns: minmax(0, 1fr);
}

.media-grid.single-image .media-item {
  aspect-ratio: auto;
}

.media-grid.single-image .media-item :deep(.el-image__inner) {
  height: auto;
  object-fit: contain;
}

.media-grid.single-image .media-item img {
  height: auto;
  object-fit: contain;
}

.post-text {
  margin: 0;
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
  grid-template-columns: repeat(2, auto);
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
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


.icon-action-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  min-width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(91, 110, 128, 0.08), 0 8px 18px rgba(24, 39, 75, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.icon-action-btn .action-icon {
  width: 22px;
  height: 22px;
  transition: transform 0.2s ease, color 0.2s ease, filter 0.2s ease;
}

.icon-action-btn:hover,
.icon-action-btn:focus-visible {
  background: rgba(255, 228, 214, 0.55);
  box-shadow: inset 0 0 0 1px rgba(213, 106, 79, 0.2),
              0 8px 20px rgba(213, 106, 79, 0.1);
}

/* ── 评论气泡图标 ── */
.comment-icon {
  overflow: visible;
}

.comment-fill {
  fill: #fef4ef;
  transition: fill 0.22s ease;
}

.comment-outline {
  fill: none;
  stroke: #b8a49e;
  stroke-width: 1.8;
  stroke-linejoin: round;
  stroke-linecap: round;
  transition: stroke 0.22s ease;
}

.comment-dot {
  fill: #b8a49e;
  transition: fill 0.22s ease;
}

.comment-input:hover .comment-fill { fill: #ffe8db; }
.comment-input:hover .comment-outline { stroke: #d49b8a; }
.comment-input:hover .comment-dot { fill: #d49b8a; }

/* ── 心形点赞图标 ── */
.like-icon {
  overflow: visible;
}

.like-fill {
  fill: #e8604a;
  opacity: 0;
  transition: opacity 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.like-outline {
  fill: none;
  stroke: #b8a49e;
  stroke-width: 1.85;
  stroke-linejoin: round;
  stroke-linecap: round;
  transition: stroke 0.28s ease, stroke-width 0.28s ease;
}

.like-spark {
  fill: #f9c74f;
  opacity: 0;
  transition: opacity 0.22s ease 0.14s;
}

/* 已点赞状态 */
.like-action-btn.liked .like-fill {
  opacity: 1;
}

.like-action-btn.liked .like-outline {
  stroke: #c03528;
  stroke-width: 1.6;
}

.like-action-btn.liked .like-spark {
  opacity: 1;
}

.like-action-btn.liked .like-icon {
  filter: drop-shadow(0 2px 10px rgba(232, 96, 74, 0.52));
}

.like-action-btn.liked {
  background: rgba(255, 228, 214, 0.9);
  box-shadow: inset 0 0 0 1.5px rgba(213, 106, 79, 0.34),
              0 8px 22px rgba(213, 106, 79, 0.22);
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

<style scoped>
/* Third-pass alignment acceptance for post detail page */
.detail-page {
  background: var(--surface-1, #f5f5f7);
  color: var(--ink, #1d1d1f);
}

.detail-topbar {
  height: 56px;
  padding: 0 14px;
  background: color-mix(in srgb, var(--surface-1, #f5f5f7) 88%, white 12%);
  border-bottom: 1px solid var(--divider-soft, #e5e5ea);
  backdrop-filter: blur(10px);
}

.back-btn,
.metric-btn,
.comment-input,
.mini-btn,
.reply-more,
.text-btn {
  transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.back-btn {
  height: 36px;
  border-radius: 999px;
  border: 1px solid var(--hairline, #d2d2d7);
  background: var(--canvas, #fff);
  color: var(--ink, #1d1d1f);
  font-weight: 600;
}

.back-btn:hover {
  background: var(--surface-2, #fafafa);
}

.back-btn:focus-visible,
.metric-btn:focus-visible,
.comment-input:focus-visible,
.mini-btn:focus-visible,
.reply-more:focus-visible,
.text-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #0066cc) 28%, transparent);
}

.detail-content {
  max-width: 860px;
  margin: 0 auto;
  padding: 12px 14px;
  gap: 12px;
}

.post-main,
.comment-section {
  background: var(--canvas, #fff);
  border: 1px solid var(--hairline, #e0e0e0);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
}

.author-name,
.post-title,
.comment-name {
  color: var(--ink, #1d1d1f);
}

.time-text,
.comment-time,
.post-meta,
.reply-target,
.empty {
  color: var(--ink-muted, #6e6e73);
}

.post-title {
  margin-top: 12px;
  font-size: clamp(24px, 4.3vw, 30px);
  line-height: 1.28;
  letter-spacing: -0.01em;
}

.post-text,
.comment-body {
  color: var(--ink, #1d1d1f);
}

.comment-section h2 {
  margin-bottom: 10px;
  color: var(--ink, #1d1d1f);
  font-size: clamp(19px, 3.2vw, 23px);
}

.comment-card {
  border-top-color: var(--divider-soft, #ececf0);
}

.comment-body,
.reply-preview {
  background: var(--surface-2, #fafafa);
}

.mini-btn,
.reply-more,
.text-btn {
  color: var(--primary, #0066cc);
}

.mini-btn:hover,
.reply-more:hover,
.text-btn:hover {
  color: color-mix(in srgb, var(--primary, #0066cc) 84%, black 16%);
}

.mini-btn.danger {
  color: #d84f45;
}

.bottom-bar {
  min-height: 64px;
  height: auto;
  background: color-mix(in srgb, var(--canvas, #fff) 92%, white 8%);
  border-top: 1px solid var(--divider-soft, #e5e5ea);
  padding: 8px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  grid-template-columns: repeat(2, auto);
  justify-content: flex-end;
}

.comment-input,
.metric-btn {
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--hairline, #e0e0e0);
  background: var(--canvas, #fff);
  color: var(--ink, #1d1d1f);
}

.comment-input:hover,
.metric-btn:hover {
  background: var(--surface-2, #fafafa);
}

.metric-btn:active,
.comment-input:active {
  transform: translateY(1px);
}

.metric-icon,
.input-icon {
  font-size: 13px;
}

@media (max-width: 960px) {
  .detail-content {
    max-width: 760px;
  }
}

@media (max-width: 768px) {
  .detail-page {
    padding-bottom: 78px;
  }

  .detail-topbar {
    padding-inline: 12px;
    border-bottom: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  }

  .detail-content {
    padding-inline: 10px;
  }

  .post-main,
  .comment-section {
    padding: 14px;
    border-radius: 18px;
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }

  .author-name {
    font-size: 16px;
  }

  .media-grid {
    gap: 7px;
  }

  .comment-card {
    border-top: none;
    padding: 12px 0;
    box-shadow: 0 -1px 0 inset rgba(226, 213, 202, 0.3);
  }

  .comment-card:first-of-type {
    box-shadow: none;
  }

  .bottom-bar {
    border-top: none;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  }

  .comment-input {
    border: none;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .metric-btn {
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }
}

@media (max-width: 460px) {
  .bottom-bar {
    gap: 5px;
  }

  .metric-btn {
    min-width: 50px;
    font-size: 12px;
  }
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
