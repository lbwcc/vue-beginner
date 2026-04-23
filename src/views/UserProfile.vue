<template>
  <div class="user-profile-page">
    <header class="profile-topbar">
      <button class="back-btn" type="button" @click="goBack">‹ 返回</button>
      <button v-if="profile?.isSelf" class="edit-btn" type="button" @click="goEdit">编辑资料</button>
    </header>

    <main v-if="profile" class="profile-main">
      <section class="hero-card">
        <div class="hero-head">
          <img v-if="profile.avatarUrl" class="avatar-image" :src="profile.avatarUrl" alt="头像" />
          <div v-else class="avatar">{{ nameInitial }}</div>
          <div class="hero-meta">
            <div class="nickname-row">
              <h1>{{ profile.nickname || profile.username }}</h1>
              <!-- <span class="level-badge">LV.{{ profile.level || 9 }}</span> -->
            </div>
            <!-- <div class="bio">{{ profile.bio || 'TA还没有设置个性签名' }}</div> -->
          </div>
        </div>

        <div class="stats-row">
          <button class="stat-item" type="button" @click="activeListType = 'following'; listDrawerVisible = true">
            <strong>{{ profile.followingCount || 0 }}</strong>
            <span>关注</span>
          </button>
          <button class="stat-item" type="button" @click="activeListType = 'followers'; listDrawerVisible = true">
            <strong>{{ profile.followerCount || 0 }}</strong>
            <span>粉丝</span>
          </button>
          <div class="stat-item static">
            <strong>{{ postList.length }}</strong>
            <span>{{ activeTab === 'dynamic' ? '动态数' : '投稿数' }}</span>
          </div>
        </div>
      </section>

      <section class="tab-card">
        <button class="tab-btn" :class="{ active: activeTab === 'dynamic' }" type="button" @click="switchTab('dynamic')">
          动态
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'posts' }" type="button" @click="switchTab('posts')">
          投稿
        </button>
      </section>

      <section class="feed-area">
        <article v-for="item in postList" :key="item.id" class="post-card" @click="goPost(item.id)">
          <div class="post-title">{{ item.title }}</div>
          <div class="post-content">{{ displayContent(item.content) || '暂无正文摘要' }}</div>
          <div class="post-meta">{{ formatTime(item.createTime) }} · 评论 {{ item.commentCount }} · 点赞 {{ item.likeCount }}</div>
        </article>
        <div v-if="!postList.length" class="empty">暂无更多内容</div>
      </section>
    </main>

    <footer v-if="profile && !profile.isSelf" class="bottom-actions">
      <button class="message-btn" type="button" @click="sendPrivateMessage">💬 私信</button>
      <button class="follow-btn" type="button" @click="toggleFollow">
        {{ profile.isFollowing ? '已关注' : '+ 关注' }}
      </button>
    </footer>

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
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getCurrentAccount } from '@/utils/auth'
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

const route = useRoute()
const router = useRouter()

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
const resolvedUserId = computed(() => {
  const paramId = Number(route.params.id)
  if (Number.isFinite(paramId) && paramId > 0) {
    return paramId
  }
  return Number(currentAccount.value?.id)
})

const nameInitial = computed(() => getNameInitial(profile.value?.nickname || profile.value?.username))
const activeUserList = computed(() => (activeListType.value === 'followers' ? followerList.value : followingList.value))
const activeListTitle = computed(() => (activeListType.value === 'followers' ? '粉丝列表' : '关注列表'))

const unwrap = (res) => res?.data?.data ?? res?.data ?? null

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
  const requests = [
    listUserFollowingApi(resolvedUserId.value),
    listUserFollowersApi(resolvedUserId.value),
  ]
  const meId = Number(currentAccount.value?.id)
  if (Number.isFinite(meId) && meId > 0) {
    requests.push(listUserFollowingApi(meId))
    requests.push(listUserFollowersApi(meId))
  }

  const [followingRes, followersRes, myFollowingRes, myFollowersRes] = await Promise.all(requests)
  const following = Array.isArray(unwrap(followingRes)) ? unwrap(followingRes) : []
  const followers = Array.isArray(unwrap(followersRes)) ? unwrap(followersRes) : []
  followingList.value = following.map((item) => ({
    ...item,
    avatarUrl: normalizeFileUrl(item?.avatarUrl),
  }))
  followerList.value = followers.map((item) => ({
    ...item,
    avatarUrl: normalizeFileUrl(item?.avatarUrl),
  }))

  const myFollowingList = Array.isArray(unwrap(myFollowingRes)) ? unwrap(myFollowingRes) : []
  const myFollowerList = Array.isArray(unwrap(myFollowersRes)) ? unwrap(myFollowersRes) : []
  myFollowingIdSet.value = new Set(myFollowingList.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0))
  myFollowerIdSet.value = new Set(myFollowerList.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0))
}

const loadAll = async () => {
  await Promise.all([loadProfile(), loadPosts(), loadFollowLists()])
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
  const meId = Number(currentAccount.value?.id)
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
  const meId = Number(currentAccount.value?.id)
  if (!Number.isFinite(id) || !Number.isFinite(meId) || id <= 0 || meId <= 0 || id === meId) {
    return ''
  }
  return isFollowingUser(id) ? '取消关注' : '关注'
}

const toggleFollowForUser = async (user) => {
  const id = Number(user?.id)
  const meId = Number(currentAccount.value?.id)
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
  return String(content || '')
    .replace(/#ALBUM#|#MIXED#/g, '')
    .replace(/https?:\/\/[^\s)]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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

watch(() => route.fullPath, async () => {
  activeTab.value = 'dynamic'
  await loadAll()
})

onMounted(async () => {
  if (!Number.isFinite(resolvedUserId.value) || resolvedUserId.value <= 0) {
    router.replace('/forum-square')
    return
  }
  await loadAll()
})
</script>

<style scoped>
.user-profile-page {
  min-height: 100vh;
  background: #f4f5f7;
  color: #111827;
  padding-bottom: 78px;
}

.profile-topbar {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
}

.back-btn,
.edit-btn {
  border: 0;
  background: #fff;
  border-radius: 8px;
  height: 32px;
  padding: 0 10px;
}

.profile-main {
  padding: 0 12px 12px;
}

.hero-card,
.tab-card,
.post-card {
  background: #fff;
  border-radius: 12px;
}

.hero-card {
  padding: 14px;
}

.hero-head {
  display: flex;
  gap: 12px;
  align-items: center;
}

.avatar {
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background: linear-gradient(135deg, #111827, #4b5563);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
}

.avatar-image {
  width: 74px;
  height: 74px;
  border-radius: 50%;
  object-fit: cover;
}

.nickname-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nickname-row h1 {
  margin: 0;
  font-size: 28px;
}

.level-badge {
  border-radius: 999px;
  padding: 2px 8px;
  background: #3b82f6;
  color: #fff;
  font-size: 12px;
}

.bio {
  margin-top: 6px;
  color: #9ca3af;
}

.stats-row {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-item {
  border: 0;
  background: transparent;
  text-align: center;
  padding: 6px 0;
}

.stat-item strong {
  display: block;
  font-size: 28px;
  line-height: 1.2;
}

.stat-item span {
  color: #9ca3af;
  font-size: 12px;
}

.tab-card {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.tab-btn {
  border: 0;
  background: #fff;
  height: 44px;
  font-size: 16px;
}

.tab-btn.active {
  font-weight: 800;
  box-shadow: inset 0 -2px 0 #111827;
}

.feed-area {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-card {
  padding: 12px;
}

.post-title {
  font-size: 18px;
  font-weight: 800;
}

.post-content {
  margin-top: 8px;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}

.post-meta {
  margin-top: 8px;
  color: #9ca3af;
  font-size: 12px;
}

.empty {
  padding: 24px 12px;
  color: #c0c4cc;
  text-align: center;
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 68px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 10px 16px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

.message-btn,
.follow-btn {
  border: 0;
  border-radius: 10px;
  font-size: 18px;
}

.message-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.follow-btn {
  background: linear-gradient(135deg, #111827, #374151);
  color: #fff;
}

.drawer-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #eef2f7;
}

.drawer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #111827;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-avatar-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.drawer-name {
  font-weight: 700;
}

.drawer-sub {
  color: #9ca3af;
  font-size: 12px;
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

.follow-state {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.drawer-follow-btn {
  border: 1px solid #cfd6e3;
  border-radius: 999px;
  background: #fff;
  color: #1f2937;
  font-size: 12px;
  height: 28px;
  padding: 0 10px;
  white-space: nowrap;
}

.drawer-follow-btn.following {
  border-color: #d6deed;
  background: #f4f7fc;
  color: #4b5563;
}
</style>
