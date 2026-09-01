<template>
  <AppShell
    :title="profileTitle"
    eyebrow="个人中心"
    subtitle="把资料、关系链和动态列表收进统一工作台，移动端和桌面端共用同一张卡片结构。"
    active-section="profile"
  >
    <template #header-actions>
      <div class="header-actions">
        <button class="ghost-btn" type="button" @click="goBack">返回</button>
        <button v-if="profile?.isSelf" class="primary-btn" type="button" @click="goEdit">编辑资料</button>
      </div>
    </template>

    <div v-if="profile" ref="profileMotionRoot" class="profile-dashboard">
      <section class="profile-hero panel-card" v-reveal="{ y: 16, duration: 0.42 }">
        <div class="hero-head">
          <div class="hero-avatar-wrap">
            <img v-if="profile.avatarUrl" class="hero-avatar-image" :src="profile.avatarUrl" alt="头像" />
            <div v-else class="hero-avatar">{{ nameInitial }}</div>
            <!-- <span class="hero-vip-badge">VIP</span> -->
          </div>

          <div class="hero-meta compact">
            <h2 class="hero-name">{{ profile.nickname || profile.username }}</h2>
            <p class="hero-id">ID: {{ profile.id || resolvedUserId }}</p>
          </div>
        </div>

        <div class="stats-grid compact">
          <button class="stat-card" type="button" @click="activeListType = 'following'; listDrawerVisible = true">
            <strong>{{ formatCount(profile.followingCount || 0) }}</strong>
            <span>关注</span>
          </button>
          <button class="stat-card" type="button" @click="activeListType = 'followers'; listDrawerVisible = true">
            <strong>{{ formatCount(profile.followerCount || 0) }}</strong>
            <span>粉丝</span>
          </button>
          <div class="stat-card static">
            <strong>{{ formatCount(totalLikeCount) }}</strong>
            <span>获赞</span>
          </div>
        </div>

        <div class="hero-buttons" v-if="!profile.isSelf">
          <button class="ghost-btn" type="button" @click="sendPrivateMessage">私信</button>
          <button class="primary-btn" type="button" @click="toggleFollow">
            {{ profile.isFollowing ? '已关注' : '+ 关注' }}
          </button>
        </div>
      </section>

      <!-- <section class="panel-card tab-panel">
        <button class="tab-btn" :class="{ active: activeTab === 'dynamic' }" type="button" @click="switchTab('dynamic')">动态</button>
        <button class="tab-btn" :class="{ active: activeTab === 'posts' }" type="button" @click="switchTab('posts')">投稿</button>
      </section> -->

      <section class="panel-card feed-panel" v-reveal="{ y: 18, duration: 0.44, delay: 0.08 }">
        <div class="profile-feed-list">
          <article v-for="item in postList" :key="item.id" class="post-card" @click="goPost(item.id)">
          <div class="post-card-head">
            <strong class="post-title">{{ item.title }}</strong>
            <span>{{ formatTime(item.createTime) }}</span>
          </div>
          <p class="post-summary">{{ displayContent(item.content) || '暂无正文摘要' }}</p>
          <div class="post-card-meta">评论 {{ item.commentCount }} · 点赞 {{ item.likeCount }}</div>
          </article>
        </div>
        <div v-if="!postList.length" class="empty">暂无更多内容</div>
      </section>
    </div>

    <!-- <template #aside>
      <div v-if="profile" class="aside-stack">
        <section class="panel-card aside-card">
          <div class="section-title">关系摘要</div>
          <div class="relation-row">
            <span>是否本人</span>
            <strong>{{ profile.isSelf ? '是' : '否' }}</strong>
          </div>
          <div class="relation-row" v-if="!profile.isSelf">
            <span>关注状态</span>
            <strong>{{ profile.isFollowing ? '已关注' : '未关注' }}</strong>
          </div>
          <div class="relation-row">
            <span>当前页签</span>
            <strong>{{ activeTab === 'dynamic' ? '动态' : '投稿' }}</strong>
          </div>
        </section>

        <section class="panel-card aside-card">
          <div class="section-title">快捷操作</div>
          <button class="aside-link" type="button" @click="activeListType = 'following'; listDrawerVisible = true">查看关注列表</button>
          <button class="aside-link" type="button" @click="activeListType = 'followers'; listDrawerVisible = true">查看粉丝列表</button>
          <button class="aside-link" type="button" @click="goEdit" v-if="profile.isSelf">编辑个人资料</button>
          <button class="aside-link" type="button" @click="sendPrivateMessage" v-else>发送私信</button>
        </section>
      </div>
    </template> -->

    <el-drawer v-model="listDrawerVisible" :title="activeListTitle" size="88%" direction="btt">
      <div class="drawer-list">
        <div v-for="user in activeUserList" :key="user.id" class="drawer-user" @click="goUser(user.id)">
          <img v-if="user.avatarUrl" class="drawer-avatar-image" :src="user.avatarUrl" alt="头像" />
          <div v-else class="drawer-avatar">{{ getNameInitial(user.nickname || user.username) }}</div>
          <div class="drawer-info">
            <div class="drawer-name">{{ user.nickname || user.username }}</div>
            <div class="drawer-sub">@{{ user.username }}</div>
          </div>
          <div class="drawer-actions" @click.stop>
            <span v-if="getFollowStateText(user)" class="follow-state">{{ getFollowStateText(user) }}</span>
            <button
              v-if="getFollowActionText(user)"
              class="drawer-follow-btn"
              :class="{ following: isFollowingUser(user.id) }"
              type="button"
              @click="toggleFollowForUser(user)"
            >
              {{ getFollowActionText(user) }}
            </button>
          </div>
        </div>
        <div v-if="!activeUserList.length" class="empty">暂无数据</div>
      </div>
    </el-drawer>
    <div v-if="isLoggedIn" class="logout-row">
          <button type="button" class="logout-btn" @click="logout">
            退出登录
          </button>
        </div>
  </AppShell>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import { getCurrentAccount, clearAuthSession, setAuthSession } from '@/utils/auth'
import { fetchCurrentUserApi } from '@/api/authApi'
import { createPrivateSessionApi } from '@/api/socialApi'
import {
  followUserApi,
  getUserProfileApi,
  listUserFollowersApi,
  listUserFollowingApi,
  listUserPostsApi,
  unfollowUserApi,
} from '@/api/userApi'
import { normalizeFileUrl } from '@/utils/fileUrl'
import { gsap, prefersReducedMotion } from '@/plugins/gsapMotion'

const route = useRoute()
const router = useRouter()
const profileMotionRoot = ref(null)
let profileMotionCtx = null

const profile = ref(null)
const postList = ref([])
const activeTab = ref('dynamic')
const listDrawerVisible = ref(false)
const activeListType = ref('following')
const followingList = ref([])
const followerList = ref([])
const myFollowingIdSet = ref(new Set())
const myFollowerIdSet = ref(new Set())

const currentAccount = computed(() => getCurrentAccount())
const currentAccountId = computed(() => {
  const id = Number(currentAccount.value?.id ?? currentAccount.value?.userId)
  return Number.isFinite(id) && id > 0 ? id : null
})
const resolvedUserId = computed(() => {
  const paramId = Number(route.params.id)
  if (Number.isFinite(paramId) && paramId > 0) {
    return paramId
  }
  return currentAccountId.value
})

const nameInitial = computed(() => getNameInitial(profile.value?.nickname || profile.value?.username))
const activeUserList = computed(() => (activeListType.value === 'followers' ? followerList.value : followingList.value))
const activeListTitle = computed(() => (activeListType.value === 'followers' ? '粉丝列表' : '关注列表'))
const profileTitle = computed(() => profile.value?.nickname || profile.value?.username || '个人中心')
const totalLikeCount = computed(() => {
  return postList.value.reduce((sum, item) => {
    const count = Number(item?.likeCount)
    return sum + (Number.isFinite(count) ? count : 0)
  }, 0)
})

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
  const imageItemsFromMarkdown = [...source.matchAll(/!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\)/g)]
    .map((match) => resolveImageMeta(match?.[1] || match?.[2]))
    .filter(Boolean)

  const imageItems = imageItemsFromMarkdown.length
    ? imageItemsFromMarkdown
    : (source.match(/https?:\/\/[^\s)]+/g) || [])
    .map((item) => resolveImageMeta(item))
    .filter(Boolean)
  const text = source
    .replace(/!\[[^\]]*\]\((?:<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\)/g, ' ')
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { text, imageItems }
}

const unwrap = (res) => res?.data?.data ?? res?.data ?? null

const unwrapList = (res) => {
  const payload = unwrap(res)
  if (Array.isArray(payload)) {
    return payload
  }
  if (Array.isArray(payload?.records)) {
    return payload.records
  }
  if (Array.isArray(payload?.list)) {
    return payload.list
  }
  if (Array.isArray(payload?.items)) {
    return payload.items
  }
  return []
}

const resolveUserId = (item) => {
  const id = Number(item?.id ?? item?.userId ?? item?.followUserId ?? item?.targetUserId)
  return Number.isFinite(id) && id > 0 ? id : null
}

const normalizeFollowUser = (item) => {
  const username = String(item?.username ?? item?.userName ?? item?.account ?? '').trim()
  const nickname = String(item?.nickname ?? item?.nickName ?? '').trim()
  const id = resolveUserId(item)
  return {
    ...item,
    id,
    username,
    nickname: nickname || username,
    avatarUrl: normalizeFileUrl(item?.avatarUrl || item?.avatar || item?.avatarPath),
  }
}

const logout = () => {
  clearAuthSession()
  router.replace('/login')
}

const ensureCurrentAccountId = async () => {
  if (Number.isFinite(currentAccountId.value) && currentAccountId.value > 0) {
    return currentAccountId.value
  }
  try {
    const me = unwrap(await fetchCurrentUserApi())
    const meId = Number(me?.id)
    const username = String(me?.username || currentAccount.value?.username || '').trim()
    if (Number.isFinite(meId) && meId > 0 && username) {
      setAuthSession({
        token: null,
        user: {
          ...currentAccount.value,
          id: meId,
          username,
          avatarUrl: me?.avatarUrl || currentAccount.value?.avatarUrl || '',
          avatar: currentAccount.value?.avatar,
        },
      })
      return meId
    }
  } catch {
    // ignore and fallback to route guard behavior
  }
  return null
}

const currentUser = getCurrentAccount()
const isLoggedIn = !!currentUser

const loadProfile = async () => {
  const data = unwrap(await getUserProfileApi(resolvedUserId.value))
  profile.value = data
    ? {
      ...data,
      avatarUrl: normalizeFileUrl(data.avatarUrl),
    }
    : null
}

const loadPosts = async () => {
  const data = unwrap(await listUserPostsApi(resolvedUserId.value, { tab: activeTab.value }))
  postList.value = Array.isArray(data) ? data : []
}

const loadFollowLists = async () => {
  const targetId = resolvedUserId.value
  const meId = Number(currentAccountId.value)
  // 自己主页时 targetId === meId，若直接发 4 个同 URL 请求，
  // http 去重拦截器会 abort 重复的第 3、4 个请求，导致 Promise.all 整体抛错。
  // 修复：自己主页只发 2 个请求，结果复用给 myFollowingIdSet/myFollowerIdSet。
  const isSelf = Number.isFinite(meId) && meId > 0 && targetId === meId

  const getVal = (r) => (r?.status === 'fulfilled' ? r.value : null)

  if (isSelf) {
    const settled = await Promise.allSettled([
      listUserFollowingApi(targetId),
      listUserFollowersApi(targetId),
    ])
    const following = unwrapList(getVal(settled[0]))
    const followers = unwrapList(getVal(settled[1]))
    followingList.value = following.map(normalizeFollowUser).filter((u) => Number.isFinite(u.id) && u.id > 0)
    followerList.value = followers.map(normalizeFollowUser).filter((u) => Number.isFinite(u.id) && u.id > 0)
    myFollowingIdSet.value = new Set(following.map(resolveUserId).filter((id) => Number.isFinite(id) && id > 0))
    myFollowerIdSet.value = new Set(followers.map(resolveUserId).filter((id) => Number.isFinite(id) && id > 0))
  } else {
    const extraRequests = Number.isFinite(meId) && meId > 0
      ? [listUserFollowingApi(meId), listUserFollowersApi(meId)]
      : []
    const settled = await Promise.allSettled([
      listUserFollowingApi(targetId),
      listUserFollowersApi(targetId),
      ...extraRequests,
    ])
    const following = unwrapList(getVal(settled[0]))
    const followers = unwrapList(getVal(settled[1]))
    followingList.value = following.map(normalizeFollowUser).filter((u) => Number.isFinite(u.id) && u.id > 0)
    followerList.value = followers.map(normalizeFollowUser).filter((u) => Number.isFinite(u.id) && u.id > 0)

    if (extraRequests.length > 0) {
      const myFollowingList = unwrapList(getVal(settled[2]))
      const myFollowerList = unwrapList(getVal(settled[3]))
      myFollowingIdSet.value = new Set(myFollowingList.map(resolveUserId).filter((id) => Number.isFinite(id) && id > 0))
      myFollowerIdSet.value = new Set(myFollowerList.map(resolveUserId).filter((id) => Number.isFinite(id) && id > 0))
    } else {
      myFollowingIdSet.value = new Set()
      myFollowerIdSet.value = new Set()
    }
  }
}

const loadAll = async () => {
  await Promise.allSettled([loadProfile(), loadPosts(), loadFollowLists()])
}

const switchTab = async (tab) => {
  activeTab.value = tab
  await loadPosts()
}

const toggleFollow = async () => {
  if (!profile.value || profile.value.isSelf) {
    return
  }
  if (profile.value.isFollowing) {
    await unfollowUserApi(profile.value.id)
    ElMessage.success('已取消关注')
  } else {
    await followUserApi(profile.value.id)
    ElMessage.success('已关注')
  }
  await Promise.all([loadProfile(), loadFollowLists()])
}

const sendPrivateMessage = async () => {
  if (!profile.value || profile.value.isSelf) {
    return
  }
  const res = await createPrivateSessionApi(profile.value.id)
  const sessionId = unwrap(res)?.sessionId
  const nickname = String(profile.value.nickname || profile.value.username || '').trim()
  const query = {}
  if (sessionId) {
    query.sessionId = sessionId
  }
  if (nickname) {
    query.nickname = nickname
  }
  router.push({ path: '/forumchat', query })
}

const goEdit = () => {
  router.push('/profile/edit')
}

const goPost = (id) => {
  router.push(`/forum-square/post/${id}`)
}

const goUser = (id) => {
  listDrawerVisible.value = false
  router.push(`/users/${id}`)
}

const isFollowingUser = (userId) => {
  const id = Number(userId)
  if (!Number.isFinite(id) || id <= 0) {
    return false
  }
  return myFollowingIdSet.value.has(id)
}

const isMutualFollow = (userId) => {
  const id = Number(userId)
  if (!Number.isFinite(id) || id <= 0) {
    return false
  }
  return myFollowingIdSet.value.has(id) && myFollowerIdSet.value.has(id)
}

const getFollowStateText = (user) => {
  const id = Number(user?.id)
  const meId = Number(currentAccountId.value)
  if (!Number.isFinite(id) || !Number.isFinite(meId) || id <= 0 || meId <= 0 || id === meId) {
    return ''
  }
  if (isMutualFollow(id)) {
    return '互相关注'
  }
  if (isFollowingUser(id)) {
    return '已关注'
  }
  return ''
}

const getFollowActionText = (user) => {
  const id = Number(user?.id)
  const meId = Number(currentAccountId.value)
  if (!Number.isFinite(id) || !Number.isFinite(meId) || id <= 0 || meId <= 0 || id === meId) {
    return ''
  }
  return isFollowingUser(id) ? '取消关注' : '关注'
}

const toggleFollowForUser = async (user) => {
  const id = Number(user?.id)
  const meId = Number(currentAccountId.value)
  if (!Number.isFinite(id) || !Number.isFinite(meId) || id <= 0 || meId <= 0 || id === meId) {
    return
  }

  if (isFollowingUser(id)) {
    await unfollowUserApi(id)
    ElMessage.success('已取消关注')
  } else {
    await followUserApi(id)
    ElMessage.success('已关注')
  }
  await Promise.all([loadProfile(), loadFollowLists()])
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.replace('/forum-square')
}

const getNameInitial = (name) => {
  const text = String(name || '').trim()
  return text ? text.slice(0, 1).toUpperCase() : 'U'
}

const displayContent = (content) => {
  return parsePostContent(content).text
}

const formatTime = (value) => {
  if (!value || value === 'null') {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

const formatCount = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) {
    return '0'
  }
  if (number < 1000) {
    return String(number)
  }
  if (number < 10000) {
    return `${(number / 1000).toFixed(1)}K`
  }
  return `${(number / 10000).toFixed(1)}W`
}

watch(() => route.fullPath, async () => {
  activeTab.value = 'dynamic'
  await ensureCurrentAccountId()
  await loadAll()
})

onMounted(async () => {
  await ensureCurrentAccountId()
  if (!Number.isFinite(resolvedUserId.value) || resolvedUserId.value <= 0) {
    router.replace('/forum-square')
    return
  }
  await loadAll()

  await nextTick()
  if (!prefersReducedMotion() && profileMotionRoot.value) {
    profileMotionCtx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } })
      const postCards = gsap.utils.toArray('.post-card')

      if (postCards.length) {
        timeline.from(postCards, { autoAlpha: 0, y: 10, stagger: 0.04, duration: 0.22, clearProps: 'transform,opacity,visibility,filter' })
      }
    }, profileMotionRoot.value)
  }
})

onBeforeUnmount(() => {
  profileMotionCtx?.revert()
  profileMotionCtx = null
})
</script>

<style scoped>
.profile-dashboard,
.aside-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-card {
  background: linear-gradient(180deg, rgba(255, 255, 253, 0.98), rgba(252, 248, 244, 0.98));
  border: 1px solid rgba(226, 213, 202, 0.9);
  border-radius: 26px;
  padding: 20px;
  box-shadow: 0 22px 55px rgba(166, 139, 117, 0.1);
}

.profile-hero {
  background: linear-gradient(180deg, #f2f2f2 0%, #eeeeee 100%);
  border: 1px solid rgba(208, 208, 208, 0.95);
  padding: 14px 14px 12px;
}

.hero-head {
  display: flex;
  gap: 12px;
  align-items: center;
}

.hero-avatar-wrap {
  position: relative;
}

.hero-avatar,
.hero-avatar-image {
  width: 56px;
  height: 56px;
  border-radius: 50%;
}

.hero-avatar {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #e38f71, #c65d45);
  color: #fff;
  font-size: 20px;
  font-weight: 800;
}

.hero-avatar-image {
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.95);
}

.hero-vip-badge {
  position: absolute;
  right: -4px;
  top: -5px;
  min-width: 24px;
  height: 14px;
  padding: 0 4px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #f6d08c, #e8ad47);
  color: #7a4d06;
  font-size: 9px;
  font-weight: 800;
}

.hero-meta {
  flex: 1;
  min-width: 0;
}

.hero-meta.compact {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.hero-name {
  margin: 0;
  color: #202020;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.hero-id {
  margin: 0;
  color: #8d8d8d;
  font-size: 12px;
}

.hero-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-name-row h2 {
  margin: 0;
  color: #372d29;
  font-size: clamp(28px, 3vw, 36px);
}

.hero-tag,
.section-title {
  color: #cb684d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.hero-bio {
  margin: 10px 0 0;
  color: #8e7d74;
  line-height: 1.8;
}

.hero-buttons,
.header-actions,
.stats-grid {
  display: flex;
  gap: 10px;
}

.hero-buttons {
  margin-top: 10px;
  justify-content: space-between;
}

.primary-btn,
.ghost-btn,
.tab-btn,
.aside-link,
.stat-card,
.drawer-follow-btn {
  border: 0;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary-btn,
.ghost-btn,
.tab-btn,
.aside-link {
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
.aside-link {
  background: #fff5ee;
  color: #b86247;
}

.stats-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stats-grid.compact {
  gap: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.58);
}

.stat-card {
  padding: 10px 4px 8px;
  border-radius: 0;
  background: transparent;
  text-align: center;
}

.stat-card + .stat-card {
  border-left: 1px solid rgba(172, 172, 172, 0.35);
}

.stat-card strong {
  display: block;
  color: #1f1f1f;
  font-size: 20px;
  line-height: 1.2;
}

.stat-card span {
  display: block;
  margin-top: 2px;
  color: #8a8a8a;
  font-size: 11px;
}

.tab-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.tab-btn {
  background: #fff6ef;
  color: #8a7367;
}

.tab-btn.active {
  background: linear-gradient(135deg, #e38e6d, #cf684c);
  color: #fff;
  box-shadow: 0 12px 24px rgba(207, 104, 76, 0.22);
}

.feed-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile-feed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-card {
  padding: 16px;
  border-radius: 18px;
  background: var(--canvas, #fff);
  border: 1px solid rgba(232, 220, 210, 0.9);
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
  border-color: var(--primary, #0066cc);
}

.post-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.post-card-head strong {
  color: #372d29;
  font-size: 18px;
}

.post-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.post-card-head span,
.post-card-meta,
.drawer-sub,
.follow-state,
.empty {
  color: #8e7d74;
  font-size: 12px;
}

.post-card p {
  margin: 10px 0 0;
  color: #554845;
  line-height: 1.8;
}

.post-summary {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.post-card-meta {
  margin-top: 12px;
}

.relation-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(232, 221, 212, 0.9);
  color: #8e7d74;
}

.relation-row:last-child {
  border-bottom: 0;
}

.relation-row strong,
.drawer-name {
  color: #372d29;
}

.aside-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.aside-link {
  text-align: left;
}

.drawer-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #f0e9e2;
}

.drawer-avatar,
.drawer-avatar-image {
  width: 42px;
  height: 42px;
  border-radius: 50%;
}

.drawer-avatar {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #e38f71, #c65d45);
  color: #fff;
  font-weight: 800;
}

.drawer-avatar-image {
  object-fit: cover;
}

.drawer-info {
  flex: 1;
  min-width: 0;
}

.drawer-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.drawer-follow-btn {
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #fff5ee;
  color: #b86247;
  font-size: 12px;
}

.drawer-follow-btn.following {
  background: #f6f0eb;
  color: #7d6c64;
}

@media (max-width: 768px) {
  .header-actions,
  .hero-buttons,
  .post-card-head {
    /* flex-direction: column; */
    justify-content: space-between;
    align-items: stretch;
  }

  .profile-hero {
    padding: 12px;
  }

  .hero-avatar,
  .hero-avatar-image {
    width: 52px;
    height: 52px;
  }

  .hero-name {
    font-size: 14px;
  }
}

@media (max-width: 640px) {
  .panel-card,
  .post-card {
    border-radius: 20px;
    padding: 16px;
  }

  .tab-panel {
    grid-template-columns: 1fr;
  }
}

.logout-row {
  padding-top: 14px;
  margin-top: 2px;
}

.logout-btn {
  width: 100%;
  min-height: 42px;
  border: 1px solid #e0c0b0;
  border-radius: 14px;
  padding: 0 16px;
  background: #fff8f4;
  color: #a04030;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s;
}

.logout-btn:hover {
  background: #ffeee6;
  border-color: #c8603e;
}

/* Apple-style page refinement overrides */
.panel-card,
.post-card {
  background: var(--canvas, #fff);
  border: 1px solid var(--hairline, #e0e0e0);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.profile-hero {
  background: linear-gradient(180deg, #ffffff 0%, #f5f5f7 100%);
  border-color: var(--hairline, #e0e0e0);
}

.hero-avatar,
.drawer-avatar {
  background: linear-gradient(135deg, #1d1d1f, #3c3c43);
}

.hero-name,
.post-card-head strong,
.relation-row strong,
.drawer-name {
  color: var(--ink, #1d1d1f);
}

.hero-id,
.post-card-head span,
.post-card-meta,
.drawer-sub,
.follow-state,
.empty,
.post-card p,
.relation-row,
.logout-row {
  color: var(--ink-muted, #6e6e73);
}

.hero-tag,
.section-title {
  color: var(--primary, #0066cc);
  font-weight: 600;
}

.primary-btn {
  background: var(--primary, #0066cc);
  color: #fff;
  box-shadow: none;
}

.ghost-btn,
.aside-link,
.tab-btn,
.drawer-follow-btn {
  background: #fff;
  border: 1px solid var(--hairline, #e0e0e0);
  color: var(--ink, #1d1d1f);
}

.tab-btn.active {
  background: var(--primary, #0066cc);
  color: #fff;
  box-shadow: none;
}

.stats-grid.compact {
  background: #fff;
}

.stat-card + .stat-card,
.relation-row,
.drawer-user {
  border-color: var(--divider-soft, #f0f0f0);
}

.stat-card strong {
  color: var(--ink, #1d1d1f);
}

.stat-card span {
  color: var(--ink-muted, #6e6e73);
}

.logout-btn {
  border: 1px solid var(--hairline, #e0e0e0);
  background: #fff;
  color: var(--ink, #1d1d1f);
}

.logout-btn:hover {
  border-color: var(--primary, #0066cc);
  background: #f5f5f7;
}
</style>