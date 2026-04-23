<template>
  <div class="bbs-page">
    <header class="bbs-header">
      <div class="brand">LB 社区</div>
      <div class="search-wrap">
        <el-input v-model="searchKeyword" placeholder="搜索帖子标题、内容、作者" clearable />
      </div>
      <div class="user-actions">
        <button class="mail-btn" type="button" title="消息通知" @click="openNotifyDialog">
          ✉
          <span v-if="unreadCount > 0" class="mail-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </button>
        <button v-if="isAdminUser" class="admin-btn" type="button" @click="goUserAdmin">用户管理</button>
        <div class="user-panel clickable" @click="goMyProfile">
          <div class="avatar">{{ currentUserAvatar }}</div>
          <span class="username">{{ currentUserName }}</span>
        </div>
      </div>
    </header>

    <section class="mobile-channel-strip card">
      <div v-for="item in featureItems" :key="item.path" class="mobile-channel-item" @click="goFeature(item.path)">
        <div class="mobile-channel-icon" :style="{ background: item.color }">{{ item.icon }}</div>
        <div class="mobile-channel-name">{{ item.name }}</div>
      </div>
    </section>

    <section class="bbs-layout">
      <aside class="left-nav card">
        <h3>导航</h3>
        <div class="nav-list">
          <button class="nav-item" :class="{ active: tab === 'visible' }" type="button" @click="switchTab('visible')">
            社区内容
          </button>
          <button class="nav-item" :class="{ active: tab === 'mine' }" type="button" @click="switchTab('mine')">
            我的帖子
          </button>
        </div>

        <el-button class="publish-btn" type="primary" @click="openCreateDialog">+ 发布内容</el-button>

        <div class="nav-tip">帖子支持：仅自己可见 / 好友可见 / 公开</div>
      </aside>

      <main class="feed-main">
        <section class="category-strip card">
          <button
            v-for="item in categories"
            :key="item"
            class="category-chip"
            :class="{ active: selectedCategory === item }"
            type="button"
            @click="selectedCategory = item"
          >
            {{ item }}
          </button>
        </section>

        <section class="feed-list card">
          <article v-for="post in filteredPosts" :key="post.id" class="feed-card">
            <div class="feed-head">
              <div class="author-block clickable" @click.stop="goUserProfile(post.userId)">
                <img v-if="post.authorAvatarUrl" class="avatar-image small" :src="post.authorAvatarUrl" alt="头像" />
                <div v-else class="avatar small">{{ getAuthorInitial(post.authorName) }}</div>
                <div>
                  <div class="author-name">{{ post.authorName || ('用户' + post.userId) }}</div>
                  <div class="time-text">{{ formatTime(post.createTime) }}</div>
                </div>
              </div>
              <div class="head-actions">
                <el-tag size="small" :type="visibilityTagType(post.visibility)">
                  {{ visibilityText(post.visibility) }}
                </el-tag>
                <el-button v-if="post.isMine" link type="primary" @click="openEditDialog(post)">编辑</el-button>
              </div>
            </div>

            <h4 class="feed-title">{{ post.title }}</h4>

            <p class="feed-content" :class="{ clamp: !expandedMap[post.id] }">
              {{ displayContent(post.content) }}
            </p>

            <button
              v-if="displayContent(post.content).length > 160"
              class="expand-btn"
              type="button"
              @click="toggleExpand(post.id)"
            >
              {{ expandedMap[post.id] ? '收起' : '展开全文' }}
            </button>

            <div class="meta-row">
              <span class="meta-item">分类 {{ post.category || '默认' }}</span>
              <span class="meta-item">浏览 {{ post.viewCount }}</span>
              <span class="meta-item">评论 {{ post.commentCount }}</span>
            </div>

            <div class="action-row">
              <el-button size="small" :disabled="post.likedByMe" @click="likePost(post.id)">
                {{ post.likedByMe ? '已点赞' : '点赞' }} {{ post.likeCount }}
              </el-button>
              <el-button size="small" @click="goPostDetail(post.id)">查看详情</el-button>
              <!-- <el-button size="small" @click="toggleComments(post.id)">
                {{ commentOpenMap[post.id] ? '收起评论' : '查看评论' }}
              </el-button> -->
            </div>

            <div v-if="commentOpenMap[post.id]" class="comment-box">
              <div class="comment-form">
                <div v-if="replyTargetMap[post.id]" class="reply-target">
                  正在回复：{{ replyTargetMap[post.id].authorName || ('用户' + replyTargetMap[post.id].userId) }}
                  <el-button link type="primary" @click="cancelReply(post.id)">取消</el-button>
                </div>
                <el-input
                  v-model="commentDrafts[post.id]"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 4 }"
                  :placeholder="replyTargetMap[post.id] ? '输入回复内容' : '写下你的评论'"
                />
                <el-button type="primary" size="small" @click="submitComment(post.id)">发表评论</el-button>
              </div>

              <el-tree
                class="comment-tree"
                node-key="id"
                default-expand-all
                :data="commentMap[post.id] || []"
                :props="{ children: 'children' }"
              >
                <template #default="{ data }">
                  <div class="comment-item">
                    <div class="comment-head">
                      <span>{{ data.authorName || ('用户' + data.userId) }}</span>
                      <span>{{ formatTime(data.createTime) }}</span>
                    </div>
                    <div class="comment-content">{{ data.content }}</div>
                    <div class="comment-actions">
                      <el-button link type="primary" @click="startReply(post.id, data)">回复</el-button>
                      <el-button v-if="data.canDelete" link type="danger" @click="removeComment(post.id, data)">
                        删除
                      </el-button>
                    </div>
                  </div>
                </template>
              </el-tree>

              <div v-if="!(commentMap[post.id] || []).length" class="comment-empty">暂无评论</div>

              <div class="comment-pager">
                <el-pagination
                  small
                  background
                  layout="total, prev, pager, next"
                  :current-page="commentPageMap[post.id] || 1"
                  :page-size="commentPageSizeMap[post.id] || 5"
                  :total="commentTotalMap[post.id] || 0"
                  @current-change="(nextPage) => handleCommentPageChange(post.id, nextPage)"
                />
              </div>
            </div>
          </article>

          <div v-if="filteredPosts.length === 0" class="empty-feed">暂无匹配内容</div>
        </section>

        <section v-if="tab === 'visible'" class="pager-wrap card">
          <el-pagination
            background
            layout="total, prev, pager, next, sizes"
            :current-page="page"
            :page-size="pageSize"
            :page-sizes="[10, 20, 30]"
            :total="total"
            @current-change="handlePageChange"
            @size-change="handlePageSizeChange"
          />
        </section>
      </main>

      <aside class="right-side">
        <section class="card function-panel">
          <h3>功能区</h3>
          <div v-for="item in featureItems" :key="item.path" class="feature-item" @click="goFeature(item.path)">
            <div class="feature-left">
              <div class="icon-dot" :style="{ background: item.color }">{{ item.icon }}</div>
              <span>{{ item.name }}</span>
            </div>
            <el-button size="small" type="primary" plain>进入</el-button>
          </div>
        </section>
      </aside>
    </section>

    <section class="quote-footer card">
      <h3 class="quote-title">名人语录 · 随机一言</h3>
      <p class="quote-subtitle">{{ todayText }} · “{{ currentQuote.text }}” —— {{ currentQuote.author }}</p>
      <button class="quote-refresh" type="button" @click="pickRandomQuote">换一句</button>
    </section>

    <el-dialog
      v-model="composeVisible"
      :title="editingPostId ? '编辑帖子' : '发布帖子'"
      width="720px"
      :close-on-click-modal="false"
    >
      <div class="editor-grid">
        <el-input v-model="form.title" placeholder="帖子标题" maxlength="120" />
        <el-select v-model="form.visibility" placeholder="可见性">
          <el-option label="仅自己可见" :value="1" />
          <el-option label="好友可见" :value="2" />
          <el-option label="公开" :value="3" />
        </el-select>
      </div>
      <el-input
        v-model="form.category"
        placeholder="分类（可选，例如：游戏、日常、攻略）"
        maxlength="32"
        style="margin-bottom: 10px"
      />
      <el-input
        v-model="form.content"
        type="textarea"
        :autosize="{ minRows: 5, maxRows: 12 }"
        placeholder="分享你的想法"
        maxlength="5000"
        show-word-limit
      />

      <template #footer>
        <el-button @click="composeVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPost">{{ editingPostId ? '保存修改' : '发布帖子' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="notifyDialogVisible"
      title="消息中心"
      :width="notifyDialogWidth"
      :fullscreen="isMobileNotifyDialog"
      :close-on-click-modal="false"
    >
      <div class="notify-tabs">
        <button class="notify-tab" :class="{ active: notifyTab === 'notify' }" @click="notifyTab = 'notify'">通知消息</button>
        <button class="notify-tab" :class="{ active: notifyTab === 'battle' }" @click="notifyTab = 'battle'">战绩消息</button>
      </div>

      <div v-if="notifyTab === 'notify'" class="notify-list">
        <div
          v-for="item in notifications"
          :key="item.id"
          class="notify-item notify-clickable"
          :class="{ unread: !item.read }"
          @click="handleNotifyClick(item)"
        >
          <div class="notify-title-row">
            <span class="notify-type">{{ formatNotifyType(item.type) }}</span>
            <span class="notify-time">{{ formatTime(item.createTime) }}</span>
          </div>
          <div class="notify-title">{{ item.title || '新通知' }}</div>
          <div class="notify-content">{{ item.content }}</div>
        </div>
        <div v-if="!notifications.length" class="empty-tip">暂无通知</div>
      </div>

      <div v-else class="notify-list">
        <div v-for="record in battleRecords" :key="record.id" class="notify-item battle">
          <div class="notify-title-row">
            <span class="notify-type">{{ record.gameKey || 'game' }}</span>
            <span class="notify-time">{{ formatTime(record.createTime) }}</span>
          </div>
          <div class="notify-title">战绩分数：{{ record.score || 0 }}</div>
          <div class="notify-content">{{ record.payloadJson || '无额外信息' }}</div>
        </div>
        <div v-if="!battleRecords.length" class="empty-tip">暂无战绩记录</div>
      </div>
    </el-dialog>

    <!-- <nav class="mobile-bottom-nav">
      <button class="mobile-nav-item active" type="button">
        <span class="mobile-nav-icon">△</span>
        <span>首页</span>
      </button>
      <button class="mobile-nav-item" type="button">
        <span class="mobile-nav-icon">✕</span>
        <span>游戏库</span>
      </button>
      <button class="mobile-nav-item" type="button">
        <span class="mobile-nav-icon">□</span>
        <span>我</span>
      </button>
    </nav> -->
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addForumCommentApi,
  deleteForumCommentApi,
  likeForumPostApi,
  listForumCommentsApi,
  listForumPostsApi,
  listMyForumPostsApi,
  updateForumPostApi,
} from '@/api/forumApi'
import {
  getNotifyUnreadCountApi,
  listBattleRecordsApi,
  listNotifyMessagesApi,
  markNotifyReadApi,
} from '@/api/notifyApi'
import { getCurrentAccount } from '@/utils/auth'
import { normalizeFileUrl } from '@/utils/fileUrl'

const router = useRouter()

const tab = ref('visible')
const posts = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const editingPostId = ref(null)
const composeVisible = ref(false)
const searchKeyword = ref('')
const selectedCategory = ref('全部')
const expandedMap = ref({})
const unreadCount = ref(0)
const notifyDialogVisible = ref(false)
const notifyTab = ref('notify')
const notifications = ref([])
const battleRecords = ref([])
const isMobileNotifyDialog = ref(false)
const unreadTimerId = ref(null)

const commentMap = ref({})
const commentOpenMap = ref({})
const commentDrafts = ref({})
const commentTotalMap = ref({})
const commentPageMap = ref({})
const commentPageSizeMap = ref({})
const replyTargetMap = ref({})

const form = ref({
  title: '',
  content: '',
  visibility: 3,
  category: '',
})

const featureItems = ref([
  { name: '天气预报', path: '/weather-detail', icon: '天', color: '#0ea5e9' },
  { name: '图书查询', path: '/booksFinder', icon: '书', color: '#334155' },
  { name: '五子棋', path: '/gomoku', icon: '棋', color: '#111827' },
  { name: '抽奖', path: '/lottery', icon: '抽', color: '#d97706' },
  { name: '2048', path: '/game2048', icon: '游', color: '#4f46e5' },
  { name: '贪吃蛇', path: '/snakeGame', icon: '蛇', color: '#10b981' },
  { name: '俄罗斯方块', path: '/tetris', icon: '方', color: '#f59e0b' },
  { name: '烟花演示', path: '/fireworks', icon: '焰', color: '#db2777' },
  { name: '日历', path: '/calendar', icon: '日', color: '#f97316' },
])

const currentAccount = computed(() => getCurrentAccount())
const currentUserName = computed(() => currentAccount.value?.username || '访客用户')
const isAdminUser = computed(() => currentAccount.value?.username === 'lbwcc')
const notifyDialogWidth = computed(() => (isMobileNotifyDialog.value ? '100%' : '680px'))
const todayText = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
})
const currentUserAvatar = computed(() => {
  const username = currentUserName.value
  return username ? username.slice(0, 1).toUpperCase() : 'U'
})

const quotePool = [
  { text: '天行健，君子以自强不息。', author: '《周易》' },
  { text: '先天下之忧而忧，后天下之乐而乐。', author: '范仲淹' },
  { text: '路虽远，行则将至。', author: '荀子' },
  { text: '千里之行，始于足下。', author: '老子' },
  { text: '不积跬步，无以至千里。', author: '荀子' },
  { text: '知之者不如好之者，好之者不如乐之者。', author: '孔子' },
  { text: '沉舟侧畔千帆过，病树前头万木春。', author: '刘禹锡' },
  { text: '星光不问赶路人，时光不负有心人。', author: '佚名' },
]

const currentQuote = ref(quotePool[0])

const categories = computed(() => {
  const builtIn = ['全部']
  const dynamic = posts.value
    .map((item) => (item.category || '').trim())
    .filter((item) => item)
  return Array.from(new Set([...builtIn, ...dynamic]))
})

const filteredPosts = computed(() => {
  const keyword = String(searchKeyword.value || '').trim().toLowerCase()
  return posts.value.filter((post) => {
    const byCategory = selectedCategory.value === '全部' || (post.category || '') === selectedCategory.value
    if (!byCategory) {
      return false
    }
    if (!keyword) {
      return true
    }
    const text = `${post.title || ''} ${post.content || ''} ${post.authorName || ''}`.toLowerCase()
    return text.includes(keyword)
  })
})

const unwrap = (res) => {
  return res?.data?.data ?? res?.data ?? []
}

const pickRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * quotePool.length)
  currentQuote.value = quotePool[randomIndex]
}

const loadVisiblePosts = async () => {
  const data = unwrap(await listForumPostsApi({ page: page.value, pageSize: pageSize.value }))
  const list = Array.isArray(data?.list) ? data.list : []
  posts.value = list.map((item) => ({
    ...item,
    authorAvatarUrl: normalizeFileUrl(item?.authorAvatarUrl),
  }))
  total.value = Number(data?.total || 0)
}

const loadMyPosts = async () => {
  const data = unwrap(await listMyForumPostsApi())
  const list = Array.isArray(data) ? data : []
  posts.value = list.map((item) => ({
    ...item,
    authorAvatarUrl: normalizeFileUrl(item?.authorAvatarUrl),
  }))
  total.value = posts.value.length
}

const resetInteractiveState = () => {
  commentMap.value = {}
  commentOpenMap.value = {}
  commentDrafts.value = {}
  commentTotalMap.value = {}
  commentPageMap.value = {}
  commentPageSizeMap.value = {}
  replyTargetMap.value = {}
  expandedMap.value = {}
}

const reloadPosts = async () => {
  resetInteractiveState()
  if (tab.value === 'mine') {
    await loadMyPosts()
    return
  }
  await loadVisiblePosts()
}

const refreshPostsOnly = async () => {
  if (tab.value === 'mine') {
    await loadMyPosts()
    return
  }
  await loadVisiblePosts()
}

const switchTab = async (nextTab) => {
  if (tab.value === nextTab) {
    return
  }
  tab.value = nextTab
  page.value = 1
  await reloadPosts()
}

const handlePageChange = async (nextPage) => {
  page.value = nextPage
  await reloadPosts()
}

const handlePageSizeChange = async (nextSize) => {
  pageSize.value = nextSize
  page.value = 1
  await reloadPosts()
}

const visibilityText = (visibility) => {
  if (visibility === 1) return '仅自己可见'
  if (visibility === 2) return '好友可见'
  return '公开'
}

const visibilityTagType = (visibility) => {
  if (visibility === 1) return 'info'
  if (visibility === 2) return 'warning'
  return 'success'
}

const openCreateDialog = () => {
  router.push('/forum-square/compose')
}

const openEditDialog = (post) => {
  editingPostId.value = post.id
  form.value = {
    title: post.title || '',
    content: post.content || '',
    visibility: post.visibility || 3,
    category: post.category || '',
  }
  composeVisible.value = true
}

const submitPost = async () => {
  const payload = {
    title: String(form.value.title || '').trim(),
    content: String(form.value.content || '').trim(),
    visibility: form.value.visibility,
    category: String(form.value.category || '').trim() || null,
  }

  if (!payload.title) {
    ElMessage.warning('请输入标题')
    return
  }

  if (!payload.content) {
    ElMessage.warning('请输入内容')
    return
  }

  await updateForumPostApi(editingPostId.value, payload)
  ElMessage.success('帖子已更新')

  composeVisible.value = false
  await reloadPosts()
}

const likePost = async (id) => {
  await likeForumPostApi(id)
  await refreshPostsOnly()
}

const goPostDetail = (id) => {
  router.push(`/forum-square/post/${id}`)
}

const goUserProfile = (id) => {
  router.push(`/users/${id}`)
}

const goMyProfile = () => {
  const currentUserId = Number(currentAccount.value?.id)
  if (Number.isFinite(currentUserId) && currentUserId > 0) {
    router.push(`/users/${currentUserId}`)
    return
  }
  router.push('/profile')
}

const toggleExpand = (postId) => {
  expandedMap.value = {
    ...expandedMap.value,
    [postId]: !expandedMap.value[postId],
  }
}

const toggleComments = async (postId) => {
  const opened = !!commentOpenMap.value[postId]
  commentOpenMap.value = {
    ...commentOpenMap.value,
    [postId]: !opened,
  }
  if (!opened) {
    await loadComments(postId)
  }
}

const loadComments = async (postId, options = {}) => {
  const currentPage = options.page || commentPageMap.value[postId] || 1
  const currentPageSize = options.pageSize || commentPageSizeMap.value[postId] || 5
  const data = unwrap(await listForumCommentsApi(postId, { page: currentPage, pageSize: currentPageSize }))
  commentMap.value = {
    ...commentMap.value,
    [postId]: Array.isArray(data?.list) ? data.list : [],
  }
  commentTotalMap.value = {
    ...commentTotalMap.value,
    [postId]: Number(data?.total || 0),
  }
  commentPageMap.value = {
    ...commentPageMap.value,
    [postId]: Number(data?.page || currentPage),
  }
  commentPageSizeMap.value = {
    ...commentPageSizeMap.value,
    [postId]: Number(data?.pageSize || currentPageSize),
  }
}

const handleCommentPageChange = async (postId, nextPage) => {
  await loadComments(postId, { page: nextPage })
}

const startReply = (postId, comment) => {
  replyTargetMap.value = {
    ...replyTargetMap.value,
    [postId]: comment,
  }
}

const cancelReply = (postId) => {
  replyTargetMap.value = {
    ...replyTargetMap.value,
    [postId]: null,
  }
}

const submitComment = async (postId) => {
  const content = String(commentDrafts.value[postId] || '').trim()
  if (!content) {
    ElMessage.warning('请输入评论内容')
    return
  }
  const target = replyTargetMap.value[postId]
  const payload = target ? { content, parentId: target.id } : { content }
  await addForumCommentApi(postId, payload)
  commentDrafts.value = {
    ...commentDrafts.value,
    [postId]: '',
  }
  cancelReply(postId)
  await refreshPostsOnly()
  commentOpenMap.value = {
    ...commentOpenMap.value,
    [postId]: true,
  }
  await loadComments(postId, { page: 1 })
}

const removeComment = async (postId, comment) => {
  try {
    await ElMessageBox.confirm('确定删除这条评论吗？其所有回复也会一并删除。', '删除评论', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await deleteForumCommentApi(postId, comment.id)
  ElMessage.success('评论已删除')
  await refreshPostsOnly()
  commentOpenMap.value = {
    ...commentOpenMap.value,
    [postId]: true,
  }
  await loadComments(postId)
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
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getAuthorInitial = (name) => {
  const text = String(name || '').trim()
  return text ? text.slice(0, 1).toUpperCase() : 'U'
}

const displayContent = (content) => {
  return String(content || '')
    .replace(/#ALBUM#|#MIXED#/g, '')
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const loadUnreadCount = async () => {
  if (!currentAccount.value) {
    unreadCount.value = 0
    return
  }
  const data = unwrap(await getNotifyUnreadCountApi())
  unreadCount.value = Number(data?.unread || 0)
}

const openNotifyDialog = async () => {
  notifyDialogVisible.value = true
  const [notifyRes, battleRes] = await Promise.all([listNotifyMessagesApi(), listBattleRecordsApi()])
  notifications.value = Array.isArray(unwrap(notifyRes)) ? unwrap(notifyRes) : []
  battleRecords.value = Array.isArray(unwrap(battleRes)) ? unwrap(battleRes) : []
}

const markNotifyAsRead = async (item) => {
  const id = Number(item?.id)
  if (!Number.isFinite(id) || id <= 0 || item?.read) {
    return
  }
  try {
    await markNotifyReadApi(id)
  } catch {
    return
  }
  notifications.value = notifications.value.map((notifyItem) => {
    if (Number(notifyItem?.id) === id) {
      return { ...notifyItem, read: true }
    }
    return notifyItem
  })
  unreadCount.value = Math.max(0, Number(unreadCount.value || 0) - 1)
}

const goUserAdmin = () => {
  router.push('/user-admin')
}

const goFeature = (path) => {
  if (path) {
    router.push(path)
  }
}

const parseNotifyBizId = (value) => {
  const id = Number(value)
  if (!Number.isFinite(id) || id <= 0) {
    return null
  }
  return id
}

const formatNotifyType = (type) => {
  const value = String(type || '').toUpperCase()
  if (value === 'CHAT') return '私信'
  if (value === 'LIKE') return '点赞'
  if (value === 'COMMENT') return '评论'
  if (value === 'FOLLOW') return '关注'
  return value || '消息'
}

const handleNotifyClick = async (item) => {
  await markNotifyAsRead(item)
  const type = String(item?.type || '').toUpperCase()
  const bizId = parseNotifyBizId(item?.bizId)

  if (type === 'CHAT' && bizId) {
    router.push({ path: '/forumchat', query: { sessionId: String(bizId) } })
    notifyDialogVisible.value = false
    return
  }

  if ((type === 'LIKE' || type === 'COMMENT') && bizId) {
    router.push(`/forum-square/post/${bizId}`)
    notifyDialogVisible.value = false
    return
  }

  if (type === 'FOLLOW' && bizId) {
    router.push(`/users/${bizId}`)
    notifyDialogVisible.value = false
    return
  }

  if (type === 'FORUM') {
    router.push('/forum-square')
    notifyDialogVisible.value = false
    return
  }

  if (type === 'GAME') {
    notifyTab.value = 'battle'
    return
  }

  if (type === 'SYSTEM') {
    router.push('/forum-square')
    notifyDialogVisible.value = false
    return
  }

  ElMessage.info('该消息暂未配置跳转')
}

const updateNotifyDialogMode = () => {
  if (typeof window === 'undefined') {
    isMobileNotifyDialog.value = false
    return
  }
  isMobileNotifyDialog.value = window.innerWidth <= 768
}

const startUnreadPolling = () => {
  if (typeof window === 'undefined' || unreadTimerId.value || !currentAccount.value) {
    return
  }
  unreadTimerId.value = window.setInterval(() => {
    loadUnreadCount()
  }, 8000)
}

const stopUnreadPolling = () => {
  if (typeof window === 'undefined' || !unreadTimerId.value) {
    return
  }
  window.clearInterval(unreadTimerId.value)
  unreadTimerId.value = null
}

onMounted(async () => {
  updateNotifyDialogMode()
  window.addEventListener('resize', updateNotifyDialogMode)
  window.addEventListener('focus', loadUnreadCount)
  pickRandomQuote()
  await Promise.all([reloadPosts(), loadUnreadCount()])
  startUnreadPolling()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateNotifyDialogMode)
  window.removeEventListener('focus', loadUnreadCount)
  stopUnreadPolling()
})
</script>

<style scoped>
.bbs-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 8% 0%, rgba(255, 189, 89, 0.16), transparent 32%),
    radial-gradient(circle at 90% 10%, rgba(64, 152, 255, 0.16), transparent 34%),
    #f2f4f8;
  color: #111827;
}

.card {
  background: #ffffff;
  border: 1px solid #e7ebf0;
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.bbs-header {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 72px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e7ebf0;
  display: grid;
  grid-template-columns: 220px 1fr 260px;
  align-items: center;
  gap: 18px;
  padding: 0 24px;
}

.brand {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 1px;
}

.search-wrap {
  max-width: 760px;
}

.user-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mail-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: #1f2937;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}

.mail-badge {
  position: absolute;
  right: -5px;
  top: -5px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.admin-btn {
  border: none;
  border-radius: 10px;
  height: 40px;
  padding: 0 12px;
  background: #2f7a43;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.user-panel {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}

.user-panel.clickable {
  cursor: pointer;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #111827, #374151);
  color: #fff;
  font-weight: 700;
}

.avatar-image {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar.small {
  width: 32px;
  height: 32px;
  font-size: 12px;
}

.avatar-image.small {
  width: 32px;
  height: 32px;
}

.bbs-layout {
  max-width: 1320px;
  margin: 18px auto 0;
  display: grid;
  grid-template-columns: 220px 1fr 320px;
  gap: 16px;
  padding: 0 18px 22px;
}

.quote-footer {
  max-width: 1320px;
  margin: 0 auto 20px;
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.quote-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.quote-subtitle {
  margin: 0;
  color: #4b5563;
  flex: 1;
}

.quote-refresh {
  border: 1px solid #dbe1ea;
  background: #f8fafc;
  border-radius: 10px;
  height: 38px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.mobile-channel-strip {
  display: none;
}

.left-nav {
  padding: 14px;
  height: fit-content;
}

.left-nav h3 {
  margin: 2px 0 12px;
  font-size: 20px;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  border: 1px solid #d8dee8;
  background: #f7f9fc;
  border-radius: 10px;
  height: 44px;
  text-align: left;
  padding: 0 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.nav-item.active {
  background: #131a24;
  color: #fff;
  border-color: #131a24;
}

.publish-btn {
  width: 100%;
  margin-top: 14px;
  height: 44px;
  font-weight: 700;
}

.nav-tip {
  margin-top: 10px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

.feed-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 10px;
}

.category-chip {
  border: 1px solid #dbe1ea;
  border-radius: 999px;
  background: #f8fafc;
  min-width: 78px;
  height: 34px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.category-chip.active {
  border-color: #111827;
  color: #fff;
  background: #111827;
}

.feed-list {
  padding: 12px;
}

.feed-card {
  border: 1px solid #e8edf4;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fff;
}

.feed-card:last-child {
  margin-bottom: 0;
}

.feed-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.author-block {
  display: flex;
  gap: 10px;
  align-items: center;
}

.author-name {
  font-weight: 800;
}

.time-text {
  font-size: 12px;
  color: #6b7280;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feed-title {
  margin: 12px 0 8px;
  font-size: 22px;
  line-height: 1.3;
}

.feed-content {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
  color: #1f2937;
}

.feed-content.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.expand-btn {
  margin-top: 6px;
  border: none;
  background: none;
  color: #2563eb;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.meta-item {
  font-size: 12px;
  color: #6b7280;
}

.action-row {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.comment-box {
  margin-top: 10px;
  border-top: 1px solid #eef2f7;
  padding-top: 10px;
}

.comment-form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: end;
}

.reply-target {
  margin-bottom: 8px;
  grid-column: 1 / -1;
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 6px;
}

.comment-tree {
  margin-top: 10px;
}

.comment-item {
  background: #f9fbff;
  border: 1px solid #e8edf4;
  border-radius: 8px;
  padding: 8px;
}

.comment-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
}

.comment-content {
  margin-top: 4px;
  color: #1f2937;
  white-space: pre-wrap;
}

.comment-actions {
  margin-top: 4px;
  display: flex;
  gap: 6px;
}

.comment-empty {
  margin-top: 8px;
  color: #9ca3af;
  font-size: 12px;
}

.comment-pager {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.empty-feed {
  text-align: center;
  color: #9ca3af;
  padding: 30px 10px;
}

.pager-wrap {
  padding: 12px;
  display: flex;
  justify-content: center;
}

.right-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.function-panel {
  padding: 14px;
}

.function-panel h3 {
  margin: 2px 0 12px;
  font-size: 24px;
}

.feature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #edf2f8;
  cursor: pointer;
}

.feature-item:last-child {
  border-bottom: none;
}

.feature-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}

.icon-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.download-panel {
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.qr-box {
  width: 78px;
  height: 78px;
  border-radius: 10px;
  border: 2px dashed #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

.download-text .title {
  font-size: 20px;
  font-weight: 900;
}

.download-text .desc {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

.notify-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.notify-tab {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 999px;
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  cursor: pointer;
}

.notify-tab.active {
  background: #111827;
  color: #fff;
  border-color: #111827;
}

.notify-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 56vh;
  overflow-y: auto;
}

.notify-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}

.notify-clickable {
  cursor: pointer;
}

.notify-clickable:hover {
  border-color: #cbd5e1;
}

.notify-item.unread {
  border-color: #cbd5e1;
  background: #f8fbff;
}

.notify-item.battle {
  background: #f8fafc;
}

.notify-title-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.notify-type {
  font-weight: 700;
}

.notify-title {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.notify-content {
  margin-top: 4px;
  font-size: 13px;
  color: #374151;
  white-space: pre-wrap;
}

.empty-tip {
  text-align: center;
  color: #9ca3af;
  padding: 16px 0;
}

:deep(.el-dialog.is-fullscreen) {
  border-radius: 0;
}

:deep(.el-dialog__body) {
  max-height: calc(100vh - 170px);
  overflow-y: auto;
}

.editor-grid {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 10px;
  margin-bottom: 10px;
}

.mobile-bottom-nav {
  display: none;
}

@media (max-width: 1200px) {
  .bbs-layout {
    grid-template-columns: 220px 1fr;
  }

  .quote-footer {
    margin: 0 18px 20px;
  }

  .right-side {
    grid-column: 1 / -1;
    flex-direction: row;
  }

  .right-side .card {
    flex: 1;
  }
}

@media (max-width: 920px) {
  .bbs-page {
    background: #f4f5f7;
  }

  .bbs-header {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'brand user'
      'search search';
    height: auto;
    padding: 10px 12px;
    gap: 8px;
    border-bottom: none;
    backdrop-filter: none;
    background: #f4f5f7;
  }

  .brand {
    grid-area: brand;
    font-size: 22px;
  }

  .search-wrap {
    grid-area: search;
    max-width: none;
  }

  .user-actions {
    grid-area: user;
    justify-self: end;
    gap: 6px;
  }

  .admin-btn,
  .mail-btn {
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 8px;
    font-size: 14px;
  }

  .admin-btn {
    width: auto;
    padding: 0 8px;
    font-size: 12px;
  }

  .username {
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }

  .mobile-channel-strip {
    display: flex;
    gap: 10px;
    margin: 0 12px;
    padding: 10px;
    overflow-x: auto;
    border-radius: 12px;
  }

  .mobile-channel-item {
    min-width: 62px;
    text-align: center;
    flex: 0 0 auto;
    cursor: pointer;
  }

  .mobile-channel-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    color: #fff;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 6px;
  }

  .mobile-channel-name {
    font-size: 12px;
    color: #374151;
  }

  .left-nav,
  .right-side {
    display: none;
  }

  .bbs-layout {
    grid-template-columns: 1fr;
    padding: 10px 0 86px;
    margin-top: 0;
    gap: 10px;
  }

  .quote-footer {
    margin: 0 12px 14px;
    border-radius: 12px;
    padding: 12px;
    flex-direction: column;
    align-items: flex-start;
  }

  .quote-title {
    font-size: 18px;
  }

  .quote-subtitle {
    font-size: 13px;
    line-height: 1.6;
  }

  .feed-main {
    gap: 10px;
  }

  .category-strip {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    box-shadow: none;
    padding: 10px 12px;
  }

  .feed-list {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    box-shadow: none;
    padding: 0;
    background: transparent;
  }

  .feed-card {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    margin-bottom: 8px;
    padding: 12px;
  }

  .feed-title {
    font-size: 30px;
    margin: 8px 0;
  }

  .feed-content {
    font-size: 14px;
  }

  .comment-pager,
  .pager-wrap {
    display: none;
  }

  .editor-grid {
    grid-template-columns: 1fr;
  }

  .mobile-bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 64px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
    z-index: 40;
  }

  .mobile-nav-item {
    border: 0;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: #9ca3af;
    font-size: 11px;
  }

  .mobile-nav-item.active {
    color: #111827;
  }

  .notify-tabs {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #fff;
    padding-bottom: 8px;
  }

  .notify-list {
    max-height: calc(100vh - 190px);
  }

  .notify-item {
    padding: 10px;
    border-radius: 8px;
  }

  .notify-title {
    font-size: 13px;
  }

  .notify-content {
    font-size: 12px;
    line-height: 1.5;
  }

  .mobile-nav-icon {
    font-size: 18px;
    line-height: 1;
  }
}
</style>
