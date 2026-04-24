<template>
  <AppShell title="" eyebrow="" subtitle="" active-section="forum">
    <template #header-actions>
      <el-input
        v-model="searchKeyword"
        class="search-input"
        placeholder="搜索帖子标题、内容、作者"
        clearable
      />

      <div class="header-tools">
        <button
          style="width: 60px; padding: 0; position: relative;"
          class="notify-btn"
          type="button"
          title="消息通知"
          @click="openNotifyDialog"
        >
          <span style="font-size: 24px;">✉</span> 
          <span v-if="unreadCount > 0" class="notify-badge">{{
            unreadCount > 99 ? "99+" : unreadCount
          }}</span>
        </button>
        <button class="profile-chip" type="button" @click="goMyProfile">
          <span class="profile-avatar">{{ currentUserAvatar }}</span>
          <span>{{ currentUserName }}</span>
        </button>
      </div>
    </template>

    <div class="forum-dashboard">
      <section v-if="!isMobileHome" class="hero-grid">
        <div class="hero-banner panel-card">
          <div class="hero-copy">
            <div>
              <div class="hero-tag">名人语录</div>
              <h2>{{ currentQuote.text }}</h2>
              <p class="hero-quote-author">{{ currentQuote.author }}</p>
            </div>
            <div class="hero-actions">
              <button
                class="primary-btn"
                type="button"
                @click="openCreateDialog"
              >
                立即发布
              </button>
              <button class="ghost-btn" type="button" @click="pickRandomQuote">
                换一句今日语录
              </button>
            </div>
          </div>

          <!-- <div class="hero-visual">
            <div class="hero-quote">{{ todayText }}</div>
            <div class="hero-author">
              把今天的想法发到广场，和大家一起交流。
            </div>
            <div class="hero-stats">
              <div
                v-for="item in heroStats"
                :key="item.label"
                class="hero-stat-item"
              >
                <strong>{{ item.value }}</strong>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </div> -->
        </div>

        <!-- <div class="hero-side-column">
          <div class="panel-card tab-card">
            <div class="section-title">内容视图</div>
            <div class="tab-switch">
              <button
                class="tab-btn"
                :class="{ active: tab === 'visible' }"
                type="button"
                @click="switchTab('visible')"
              >
                推荐内容
              </button>
              <button
                class="tab-btn"
                :class="{ active: tab === 'mine' }"
                type="button"
                @click="switchTab('mine')"
              >
                我的帖子
              </button>
            </div>
            <p class="muted-copy">
              帖子支持仅自己可见、好友可见和公开三种权限。
            </p>
          </div>

          <div class="panel-card spotlight-card">
            <div class="section-title">今日看点</div>
            <template v-if="spotlightPost">
              <h3>{{ spotlightPost.title }}</h3>
              <p>
                {{
                  displayContent(spotlightPost.content).slice(0, 88) ||
                  "点击查看完整内容。"
                }}
              </p>
              <button
                class="inline-link"
                type="button"
                @click="goPostDetail(spotlightPost.id)"
              >
                查看详情
              </button>
            </template>
            <p v-else class="empty-tip">暂无推荐内容</p>
          </div>
        </div> -->
      </section>

      <!-- <section v-if="!isMobileHome" class="shortcut-grid panel-card">
        <div class="section-heading">
          <div>
            <div class="section-title">小型功能集合</div>
            <p class="section-subtitle">
              保留原有路由能力，改成更接近设计稿的圆角小卡片入口。
            </p>
          </div>
        </div>
        <div class="feature-grid">
          <button
            v-for="item in highlightedFeatures"
            :key="item.path"
            class="feature-card"
            type="button"
            @click="goFeature(item.path)"
          >
            <span class="feature-icon" :style="{ background: item.color }">{{
              item.icon
            }}</span>
            <span class="feature-name">{{ item.name }}</span>
          </button>
        </div>
      </section> -->

      <section class="content-grid">
        <div class="feed-column">
          <div class="panel-card filter-card">
            <div class="section-title">内容筛选</div>
            <div class="category-strip">
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
            </div>
          </div>

          <div class="panel-card feed-card-list">
            <article
              v-for="post in filteredPosts"
              :key="post.id"
              class="feed-card"
            >
              <div class="feed-head">
                <div class="author-block" @click="goUserProfile(post.userId)">
                  <img
                    v-if="post.authorAvatarUrl"
                    class="avatar-image small"
                    :src="post.authorAvatarUrl"
                    alt="头像"
                  />
                  <div v-else class="avatar small">
                    {{ getAuthorInitial(post.authorName) }}
                  </div>
                  <div>
                    <div class="author-name">
                      {{ post.authorName || "用户" + post.userId }}
                    </div>
                    <div class="time-text">
                      {{ formatTime(post.createTime) }}
                    </div>
                  </div>
                </div>

                <div class="feed-actions-top">
                  <span class="visibility-badge">{{
                    visibilityText(post.visibility)
                  }}</span>
                  <button
                    v-if="post.isMine"
                    class="edit-link"
                    type="button"
                    @click="openEditDialog(post)"
                  >
                    编辑
                  </button>
                  <button
                    v-if="post.isMine"
                    class="delete-link"
                    type="button"
                    @click="removePost(post)"
                  >
                    删除
                  </button>
                </div>
              </div>

              <h3 class="feed-title">{{ post.title }}</h3>
              <p class="feed-content" :class="{ clamp: !expandedMap[post.id] }">
                {{ displayContent(post.content) }}
              </p>

              <div v-if="getPostImages(post.content).length" class="post-media">
                <div
                  v-for="(imageUrl, imageIndex) in getPostImages(post.content)"
                  :key="`${post.id}-${imageIndex}`"
                  class="media-thumb"
                >
                  <el-image
                    :src="imageUrl"
                    :preview-src-list="getPostImages(post.content)"
                    :initial-index="imageIndex"
                    fit="cover"
                    preview-teleported
                  />
                </div>
              </div>

              <button
                v-if="displayContent(post.content).length > 160"
                class="inline-link"
                type="button"
                @click="toggleExpand(post.id)"
              >
                {{ expandedMap[post.id] ? "收起" : "展开全文" }}
              </button>

              <div class="meta-row">
                <span class="meta-item">赞 {{ post.likeCount }}</span>
                <span class="meta-item">评 {{ post.commentCount }}</span>
                <span class="meta-item">浏览 {{ post.viewCount }}</span>
                <span class="meta-item">{{ post.category || "默认分类" }}</span>
              </div>

              <div class="action-row">
                <button
                  class="ghost-btn small"
                  type="button"
                  :disabled="post.likedByMe"
                  @click="likePost(post.id)"
                >
                  {{ post.likedByMe ? "已点赞" : "点赞" }}
                </button>
                <button
                  class="primary-btn small"
                  type="button"
                  @click="goPostDetail(post.id)"
                >
                  查看详情
                </button>
              </div>
            </article>

            <div v-if="filteredPosts.length === 0" class="empty-feed">
              暂无匹配内容
            </div>
          </div>

          <div v-if="tab === 'visible' && !isMobileHome" class="panel-card pager-card">
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
          </div>
        </div>

        <!-- <aside class="side-column mobile-only">
          <div class="panel-card mini-calendar-card">
            <div class="section-title">{{ miniCalendar.title }}</div>
            <div class="mini-calendar-week">
              <span v-for="day in miniCalendar.weekDays" :key="day">{{
                day
              }}</span>
            </div>
            <div class="mini-calendar-grid">
              <span
                v-for="(day, index) in miniCalendar.days"
                :key="`${day}-${index}`"
                class="mini-day"
                :class="{ today: day === miniCalendar.today }"
              >
                {{ day || "" }}
              </span>
            </div>
            <button
              class="inline-link"
              type="button"
              @click="goFeature('/calendar')"
            >
              进入日历
            </button>
          </div>

          <div class="panel-card weather-card">
            <div class="section-title">今日提示</div>
            <div class="weather-temp">{{ todayText }}</div>
            <p>{{ currentQuote.text }}</p>
          </div>

          <div class="panel-card list-card">
            <div class="section-title">最新内容</div>
            <button
              v-for="item in sidePosts"
              :key="item.id"
              class="side-post"
              type="button"
              @click="goPostDetail(item.id)"
            >
              <strong>{{ item.title }}</strong>
              <span>{{ formatTime(item.createTime) }}</span>
            </button>
            <div v-if="!sidePosts.length" class="empty-tip">暂无最新帖子</div>
          </div>
        </aside> -->
      </section>
    </div>

    <template #aside v-if="!isMobileHome">
      <div class="panel-card notify-side-card">
        <div class="section-title">消息通知</div>
        <div class="notify-side-list">
          <div
            v-for="item in notifications.slice(0, 3)"
            :key="item.id"
            class="notify-side-item notify-clickable"
            :class="{ unread: !item.read }"
            @click="handleNotifyClick(item)"
          >
            <div class="notify-side-title">{{ item.title || "新通知" }}</div>
            <div class="notify-side-type">
              {{ formatNotifyType(item.type) }} ·
              {{ formatTime(item.createTime) }}
            </div>
          </div>
          <div v-if="!notifications.length" class="empty-tip">暂无通知</div>
        </div>
        <button class="inline-link" type="button" @click="openNotifyDialog">
          查看全部消息
        </button>
      </div>

      <div class="panel-card mini-calendar-card">
        <div class="section-title">{{ miniCalendar.title }}</div>
        <div class="mini-calendar-week">
          <span v-for="day in miniCalendar.weekDays" :key="day">{{ day }}</span>
        </div>
        <div class="mini-calendar-grid">
          <span
            v-for="(day, index) in miniCalendar.days"
            :key="`${day}-${index}`"
            class="mini-day"
            :class="{ today: day === miniCalendar.today }"
          >
            {{ day || "" }}
          </span>
        </div>
        <button
          class="inline-link"
          type="button"
          @click="goFeature('/calendar')"
        >
          进入日历
        </button>
      </div>

      <!-- <div class="panel-card weather-card">
        <div class="section-title">今日提示</div>
        <div class="weather-temp">{{ todayText }}</div>
        <p>{{ currentQuote.text }}</p>
      </div> -->
    </template>

    <el-dialog
      v-model="notifyDialogVisible"
      title="消息中心"
      :width="notifyDialogWidth"
      :fullscreen="isMobileNotifyDialog"
      :close-on-click-modal="false"
    >
      <div class="notify-list">
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
          <div class="notify-title">{{ item.title || "新通知" }}</div>
          <div class="notify-content">{{ item.content }}</div>
        </div>
        <div v-if="!notifications.length" class="empty-tip">暂无通知</div>
      </div>
    </el-dialog>
  </AppShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import AppShell from "@/components/AppShell.vue";
import {
  deleteForumPostApi,
  likeForumPostApi,
  listForumPostsApi,
  listMyForumPostsApi,
} from "@/api/forumApi";
import {
  getNotifyUnreadCountApi,
  listNotifyMessagesApi,
  markNotifyReadApi,
} from "@/api/notifyApi";
import { getCurrentAccount } from "@/utils/auth";
import { normalizeFileUrl } from "@/utils/fileUrl";

const router = useRouter();

const tab = ref("visible");
const posts = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const searchKeyword = ref("");
const selectedCategory = ref("全部");
const expandedMap = ref({});
const unreadCount = ref(0);
const notifyDialogVisible = ref(false);
const notifications = ref([]);
const isMobileNotifyDialog = ref(false);
const isMobileHome = ref(false);
const unreadTimerId = ref(null);

const featureItems = ref([
  { name: "天气预报", path: "/weather-detail", icon: "天", color: "#72b8f4" },
  { name: "图书查询", path: "/booksFinder", icon: "书", color: "#96c8b3" },
  { name: "五子棋", path: "/gomoku", icon: "棋", color: "#f6bb78" },
  { name: "抽奖", path: "/lottery", icon: "抽", color: "#f08f6a" },
  { name: "2048", path: "/game2048", icon: "游", color: "#6a95ff" },
  { name: "贪吃蛇", path: "/snakeGame", icon: "蛇", color: "#8ccf7a" },
  { name: "俄罗斯方块", path: "/tetris", icon: "方", color: "#f4a95f" },
  { name: "日历", path: "/calendar", icon: "日", color: "#e98367" },
]);

const currentAccount = computed(() => getCurrentAccount());
const currentUserName = computed(
  () => currentAccount.value?.username || "访客用户",
);
const notifyDialogWidth = computed(() =>
  isMobileNotifyDialog.value ? "100%" : "680px",
);
const todayText = computed(() => {
  return new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
});
const currentUserAvatar = computed(() => {
  const username = currentUserName.value;
  return username ? username.slice(0, 1).toUpperCase() : "U";
});

const quotePool = [
  { text: "天行健，君子以自强不息。", author: "《周易》" },
  { text: "先天下之忧而忧，后天下之乐而乐。", author: "范仲淹" },
  { text: "路虽远，行则将至。", author: "荀子" },
  { text: "千里之行，始于足下。", author: "老子" },
  { text: "不积跬步，无以至千里。", author: "荀子" },
  { text: "知之者不如好之者，好之者不如乐之者。", author: "孔子" },
  { text: "沉舟侧畔千帆过，病树前头万木春。", author: "刘禹锡" },
  { text: "星光不问赶路人，时光不负有心人。", author: "佚名" },
];

const currentQuote = ref(quotePool[0]);

const categories = computed(() => {
  const builtIn = ["全部"];
  const dynamic = posts.value
    .map((item) => (item.category || "").trim())
    .filter((item) => item);
  return Array.from(new Set([...builtIn, ...dynamic]));
});

const filteredPosts = computed(() => {
  const keyword = String(searchKeyword.value || "")
    .trim()
    .toLowerCase();
  return posts.value.filter((post) => {
    const byCategory =
      selectedCategory.value === "全部" ||
      (post.category || "") === selectedCategory.value;
    if (!byCategory) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const text =
      `${post.title || ""} ${displayContent(post.content)} ${post.authorName || ""}`.toLowerCase();
    return text.includes(keyword);
  });
});

const highlightedFeatures = computed(() => featureItems.value.slice(0, 6));
const spotlightPost = computed(() => filteredPosts.value[0] || null);
const sidePosts = computed(() => filteredPosts.value.slice(0, 3));
const heroStats = computed(() => {
  const totalPosts = tab.value === "mine" ? posts.value.length : total.value;
  return [
    { label: "帖子总数", value: totalPosts },
    { label: "快捷入口", value: featureItems.value.length },
    { label: "未读消息", value: unreadCount.value },
  ];
});

const miniCalendar = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let index = 0; index < firstDay; index += 1) {
    days.push(0);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(day);
  }
  while (days.length < 35) {
    days.push(0);
  }

  return {
    title: `${year}年${month + 1}月`,
    today: now.getDate(),
    weekDays: ["日", "一", "二", "三", "四", "五", "六"],
    days,
  };
});

const unwrap = (res) => {
  return res?.data?.data ?? res?.data ?? [];
};

const pickRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * quotePool.length);
  currentQuote.value = quotePool[randomIndex];
};

const loadVisiblePosts = async () => {
  const data = unwrap(
    await listForumPostsApi({ page: page.value, pageSize: pageSize.value }),
  );
  const list = Array.isArray(data?.list) ? data.list : [];
  posts.value = list.map((item) => ({
    ...item,
    authorAvatarUrl: normalizeFileUrl(item?.authorAvatarUrl),
  }));
  total.value = Number(data?.total || 0);
};

const loadMyPosts = async () => {
  const data = unwrap(await listMyForumPostsApi());
  const list = Array.isArray(data) ? data : [];
  posts.value = list.map((item) => ({
    ...item,
    authorAvatarUrl: normalizeFileUrl(item?.authorAvatarUrl),
  }));
  total.value = posts.value.length;
};

const reloadPosts = async () => {
  expandedMap.value = {};
  if (tab.value === "mine") {
    await loadMyPosts();
    return;
  }
  await loadVisiblePosts();
};

const refreshPostsOnly = async () => {
  if (tab.value === "mine") {
    await loadMyPosts();
    return;
  }
  await loadVisiblePosts();
};

const switchTab = async (nextTab) => {
  if (tab.value === nextTab) {
    return;
  }
  tab.value = nextTab;
  page.value = 1;
  await reloadPosts();
};

const handlePageChange = async (nextPage) => {
  page.value = nextPage;
  await reloadPosts();
};

const handlePageSizeChange = async (nextSize) => {
  pageSize.value = nextSize;
  page.value = 1;
  await reloadPosts();
};

const visibilityText = (visibility) => {
  if (visibility === 1) return "仅自己可见";
  if (visibility === 2) return "好友可见";
  return "公开";
};

const openCreateDialog = () => {
  router.push("/forum-square/compose");
};

const openEditDialog = (post) => {
  router.push({
    path: "/forum-square/compose",
    query: { editId: String(post.id) },
  });
};

const removePost = async (post) => {
  try {
    await ElMessageBox.confirm("确定删除这条帖子吗？删除后无法恢复。", "删除帖子", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }

  await deleteForumPostApi(post.id);
  ElMessage.success("帖子已删除");
  await reloadPosts();
};

const likePost = async (id) => {
  await likeForumPostApi(id);
  await refreshPostsOnly();
};

const goPostDetail = (id) => {
  router.push(`/forum-square/post/${id}`);
};

const goUserProfile = (id) => {
  router.push(`/users/${id}`);
};

const goMyProfile = () => {
  const currentUserId = Number(currentAccount.value?.id);
  if (Number.isFinite(currentUserId) && currentUserId > 0) {
    router.push(`/users/${currentUserId}`);
    return;
  }
  router.push("/profile");
};

const toggleExpand = (postId) => {
  expandedMap.value = {
    ...expandedMap.value,
    [postId]: !expandedMap.value[postId],
  };
};

const formatTime = (value) => {
  if (!value || value === "null") {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAuthorInitial = (name) => {
  const text = String(name || "").trim();
  return text ? text.slice(0, 1).toUpperCase() : "U";
};

const POST_MIXED_MARKER = "#POST_MIXED_V2#";

const parsePostContent = (rawContent) => {
  const source = String(rawContent || "");
  if (source.startsWith(POST_MIXED_MARKER)) {
    const rawJson = source.slice(POST_MIXED_MARKER.length).trim();
    try {
      const parsed = JSON.parse(rawJson);
      const text = String(parsed?.text || "").trim();
      const imageUrls = Array.isArray(parsed?.images)
        ? parsed.images
            .map((item) => normalizeFileUrl(String(item || "").trim()))
            .filter(Boolean)
        : [];
      return { text, imageUrls };
    } catch {
      return { text: source.trim(), imageUrls: [] };
    }
  }

  const lines = source.split("\n");
  const markerIndex = lines.findIndex((line) => line.trim() === "#MIXED#");
  if (markerIndex >= 0) {
    const text = lines.slice(0, markerIndex).join("\n").trim();
    const imageUrls = lines
      .slice(markerIndex + 1)
      .map((line) => normalizeFileUrl(String(line || "").trim()))
      .filter(Boolean);
    return { text, imageUrls };
  }

  const imageUrls = (source.match(/https?:\/\/[^\s)]+/g) || [])
    .map((item) => normalizeFileUrl(item))
    .filter(Boolean);
  const text = source
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/#ALBUM#|#MIXED#/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, imageUrls };
};

const displayContent = (content) => {
  return parsePostContent(content).text;
};

const getPostImages = (content) => {
  return parsePostContent(content).imageUrls.slice(0, 4);
};

const loadUnreadCount = async () => {
  if (!currentAccount.value) {
    unreadCount.value = 0;
    return;
  }
  const data = unwrap(await getNotifyUnreadCountApi());
  unreadCount.value = Number(data?.unread || 0);
};

const loadNotifications = async () => {
  try {
    const notifyRes = await listNotifyMessagesApi();
    notifications.value = Array.isArray(unwrap(notifyRes))
      ? unwrap(notifyRes)
      : [];
  } catch {
    notifications.value = [];
  }
};

const openNotifyDialog = async () => {
  notifyDialogVisible.value = true;
  await loadNotifications();
};

const markNotifyAsRead = async (item) => {
  const id = Number(item?.id);
  if (!Number.isFinite(id) || id <= 0 || item?.read) {
    return;
  }
  try {
    await markNotifyReadApi(id);
  } catch {
    return;
  }
  notifications.value = notifications.value.map((notifyItem) => {
    if (Number(notifyItem?.id) === id) {
      return { ...notifyItem, read: true };
    }
    return notifyItem;
  });
  unreadCount.value = Math.max(0, Number(unreadCount.value || 0) - 1);
};

const goFeature = (path) => {
  if (path) {
    router.push(path);
  }
};

const parseNotifyBizId = (value) => {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
};

const formatNotifyType = (type) => {
  const value = String(type || "").toUpperCase();
  if (value === "CHAT") return "私信";
  if (value === "LIKE") return "点赞";
  if (value === "COMMENT") return "评论";
  if (value === "FOLLOW") return "关注";
  return value || "消息";
};

const handleNotifyClick = async (item) => {
  await markNotifyAsRead(item);
  const type = String(item?.type || "").toUpperCase();
  const bizId = parseNotifyBizId(item?.bizId);

  if (type === "CHAT" && bizId) {
    router.push({ path: "/forumchat", query: { sessionId: String(bizId) } });
    notifyDialogVisible.value = false;
    return;
  }

  if ((type === "LIKE" || type === "COMMENT") && bizId) {
    router.push(`/forum-square/post/${bizId}`);
    notifyDialogVisible.value = false;
    return;
  }

  if (type === "FOLLOW" && bizId) {
    router.push(`/users/${bizId}`);
    notifyDialogVisible.value = false;
    return;
  }

  if (type === "FORUM") {
    router.push("/forum-square");
    notifyDialogVisible.value = false;
    return;
  }

  if (type === "SYSTEM") {
    router.push("/forum-square");
    notifyDialogVisible.value = false;
    return;
  }

  ElMessage.info("该消息暂未配置跳转");
};

const updateNotifyDialogMode = () => {
  if (typeof window === "undefined") {
    isMobileNotifyDialog.value = false;
    isMobileHome.value = false;
    return;
  }
  isMobileNotifyDialog.value = window.innerWidth <= 768;
  isMobileHome.value = window.innerWidth <= 768;
};

const startUnreadPolling = () => {
  if (
    typeof window === "undefined" ||
    unreadTimerId.value ||
    !currentAccount.value
  ) {
    return;
  }
  unreadTimerId.value = window.setInterval(() => {
    loadUnreadCount();
  }, 8000);
};

const stopUnreadPolling = () => {
  if (typeof window === "undefined" || !unreadTimerId.value) {
    return;
  }
  window.clearInterval(unreadTimerId.value);
  unreadTimerId.value = null;
};

onMounted(async () => {
  updateNotifyDialogMode();
  window.addEventListener("resize", updateNotifyDialogMode);
  window.addEventListener("focus", loadUnreadCount);
  pickRandomQuote();
  await Promise.all([reloadPosts(), loadUnreadCount(), loadNotifications()]);
  startUnreadPolling();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateNotifyDialogMode);
  window.removeEventListener("focus", loadUnreadCount);
  stopUnreadPolling();
});
</script>

<style lang="less" scoped>
.forum-dashboard {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-card {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 253, 0.98),
    rgba(252, 248, 244, 0.98)
  );
  border: 1px solid rgba(210, 190, 178, 0.95);
  border-radius: 26px;
  padding: 20px;
  box-shadow: 0 22px 55px rgba(166, 139, 117, 0.12);
}

.hero-grid {
  display: block;
}

.hero-banner {
  position: relative;
  overflow: hidden;
  min-height: 276px;
  display: flex;
  align-items: stretch;
  background:
    radial-gradient(circle at 88% 18%, rgba(255, 211, 178, 0.42), transparent 36%),
    radial-gradient(
      circle at right top,
      rgba(126, 180, 233, 0.18),
      transparent 28%
    ),
    linear-gradient(135deg, #fff5ec 0%, #fffdfa 52%, #f5f9ff 100%);
}

.hero-banner::after {
  content: "";
  position: absolute;
  right: -54px;
  bottom: -74px;
  width: 220px;
  height: 220px;
  border-radius: 42px;
  background: linear-gradient(145deg, rgba(255, 185, 152, 0.18), rgba(124, 170, 235, 0.16));
  transform: rotate(22deg);
  pointer-events: none;
}

.hero-copy,
.hero-visual {
  display: flex;
  flex-direction: column;
}

.hero-copy {
  position: relative;
  z-index: 1;
  width: min(100%, 760px);
  justify-content: space-between;
}

.hero-tag,
.section-title {
  color: #cb684d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.hero-banner h2 {
  margin: 14px 0 8px;
  color: #372d29;
  font-size: clamp(28px, 3.3vw, 44px);
  line-height: 1.12;
  letter-spacing: 0.01em;
}

.hero-quote-author {
  font-size: 14px;
  font-weight: 700;
  color: #9a6a56;
}

.hero-banner p,
.muted-copy,
.section-subtitle,
.weather-card p,
.spotlight-card p {
  margin: 0;
  color: #695b54;
  line-height: 1.75;
}

.hero-actions,
.header-tools,
.hero-stats,
.tab-switch,
.meta-row,
.action-row,
.notify-tabs {
  display: flex;
  gap: 10px;
}

.hero-actions {
  flex-wrap: wrap;
  align-items: center;
}

.primary-btn,
.ghost-btn,
.notify-btn,
.admin-btn,
.profile-chip,
.tab-btn,
.category-chip,
.feature-card,
.side-post,
.notify-tab {
  border: 0;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.primary-btn,
.ghost-btn,
.notify-btn,
.admin-btn,
.profile-chip,
.tab-btn,
.notify-tab {
  min-height: 42px;
  border-radius: 14px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 700;
}

.primary-btn {
  background: linear-gradient(135deg, #e58a6a, #d56a4f);
  color: #fff;
  box-shadow: 0 14px 28px rgba(213, 106, 79, 0.25);
}

.primary-btn.small,
.ghost-btn.small {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 12px;
}

.ghost-btn {
  background: #fff5ee;
  color: #b86247;
}

.notify-btn,
.admin-btn,
.profile-chip {
  background: rgba(255, 250, 246, 0.96);
  color: #554844;
  border: 1px solid rgba(214, 194, 181, 0.95);
}

.notify-btn {
  position: relative;
}

.notify-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #d66449;
  color: #fff;
  font-size: 11px;
}

.profile-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.profile-avatar,
.avatar,
.avatar-image {
  width: 34px;
  height: 34px;
  border-radius: 50%;
}

.profile-avatar,
.avatar {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #e38f71, #c65d45);
  color: #fff;
  font-weight: 800;
}

.hero-quote {
  padding: 18px;
  border-radius: 22px;
  background: rgba(93, 80, 133, 0.9);
  color: #fff8f1;
  line-height: 1.8;
  min-height: 108px;
}

.hero-author {
  margin-top: 10px;
  color: #8e7d74;
  font-size: 13px;
}

.hero-stats {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.hero-stat-item {
  padding: 16px 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(226, 212, 201, 0.84);
  text-align: center;
}

.hero-stat-item strong {
  display: block;
  color: #352d29;
  font-size: 26px;
}

.hero-stat-item span {
  display: block;
  margin-top: 6px;
  color: #8e7d74;
  font-size: 12px;
}

.hero-side-column,
.feed-column,
.side-column {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.tab-switch {
  margin-top: 14px;
}

.tab-btn {
  flex: 1;
  background: #fff6ef;
  color: #5d504b;
}

.tab-btn.active,
.notify-tab.active,
.category-chip.active {
  background: linear-gradient(135deg, #e38e6d, #cf684c);
  color: #fff;
  box-shadow: 0 12px 24px rgba(207, 104, 76, 0.22);
}

.spotlight-card h3 {
  margin: 14px 0 10px;
  color: #372d29;
  font-size: 20px;
}

.inline-link {
  margin-top: 10px;
  border: 0;
  background: transparent;
  padding: 0;
  color: #c46046;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.shortcut-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

.feature-card {
  min-height: 124px;
  border-radius: 22px;
  padding: 14px 10px;
  background: linear-gradient(180deg, #fff9f4, #ffffff);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid rgba(230, 216, 205, 0.82);
}

.feature-card:hover,
.side-post:hover,
.primary-btn:hover,
.ghost-btn:hover,
.notify-btn:hover,
.admin-btn:hover,
.profile-chip:hover,
.tab-btn:hover,
.notify-tab:hover {
  transform: translateY(-2px);
}

.feature-icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 22px;
  font-weight: 800;
}

.feature-name {
  color: #453a36;
  font-size: 14px;
  font-weight: 700;
}

.content-grid {
  display: block;
}

.filter-card {
  margin-bottom: 18px;
}

.category-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.category-chip {
  min-height: 38px;
  border-radius: 999px;
  padding: 0 16px;
  background: #fff6ef;
  color: #5d504b;
  font-size: 13px;
  font-weight: 700;
}

.feed-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feed-card {
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(220, 205, 194, 0.85);
  box-shadow: 0 6px 18px rgba(166, 139, 117, 0.08);
}

.feed-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.author-block {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.avatar.small,
.avatar-image.small {
  width: 34px;
  height: 34px;
}

.avatar-image {
  object-fit: cover;
}

.author-name {
  color: #392f2b;
  font-weight: 800;
  font-size: 14px;
}

.time-text,
.meta-item,
.side-post span,
.notify-time,
.notify-content,
.empty-tip,
.empty-feed {
  color: #695b54;
}

.time-text,
.meta-item,
.side-post span,
.notify-time {
  font-size: 11px;
}

.feed-actions-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.visibility-badge {
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  background: #fff1e8;
  color: #c66348;
  font-size: 12px;
  font-weight: 700;
}

.edit-link {
  border: 0;
  background: transparent;
  color: #b86146;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.delete-link {
  border: 0;
  background: transparent;
  color: #cc4f39;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.feed-title {
  margin: 8px 0 6px;
  color: #372d29;
  font-size: clamp(16px, 1.4vw, 18px);
}

.feed-content {
  margin: 0;
  color: #433834;
  line-height: 1.7;
  font-size: 14px;
  white-space: pre-wrap;
}

.feed-content.clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.post-media {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.media-thumb {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(220, 205, 194, 0.8);
  background: #f4efea;
  aspect-ratio: 1.4 / 1;
}

.media-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meta-row {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.action-row {
  margin-top: 10px;
  justify-content: flex-end;
}

.pager-card {
  display: flex;
  justify-content: center;
}

.mini-calendar-week,
.mini-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.mini-calendar-week span,
.mini-day {
  min-height: 36px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  font-size: 13px;
}

.mini-calendar-week span {
  background: #fff3eb;
  color: #b86a50;
  font-weight: 700;
}

.mini-day {
  background: #fff;
  border: 1px solid rgba(230, 216, 205, 0.85);
  color: #6f5e57;
}

.mini-day.today {
  background: linear-gradient(135deg, #e38e6d, #cf684c);
  color: #fff;
  border-color: transparent;
}

.weather-temp {
  margin-top: 14px;
  color: #372d29;
  font-size: 24px;
  font-weight: 800;
}

.side-post {
  width: 100%;
  padding: 14px 16px;
  border-radius: 18px;
  background: #fff9f4;
  border: 1px solid rgba(229, 214, 202, 0.8);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.side-post strong,
.notify-title {
  color: #3b302c;
}

.notify-tabs {
  margin-bottom: 14px;
}

.notify-tab {
  background: #fff6ef;
  color: #5d504b;
}

.notify-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notify-item {
  padding: 14px;
  border-radius: 16px;
  background: #fff9f5;
  border: 1px solid rgba(214, 194, 181, 0.86);
}

.notify-item.unread {
  background: #fff3ec;
}

.notify-clickable {
  cursor: pointer;
}

.notify-title-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.notify-type {
  color: #c66348;
  font-size: 12px;
  font-weight: 700;
}

.notify-side-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notify-side-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
}

.notify-side-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff9f5;
  border: 1px solid rgba(214, 194, 181, 0.86);
  cursor: pointer;
  transition: all 0.2s ease;

  &.unread {
    background: #fff3ec;
  }

  &:hover {
    transform: translateX(2px);
    box-shadow: 0 4px 12px rgba(166, 139, 117, 0.12);
  }
}

.notify-side-title {
  color: #3b302c;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
}

.notify-side-type {
  color: #695b54;
  font-size: 11px;
}

.mini-calendar-card,
.weather-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weather-card p {
  margin: 0;
  color: #695b54;
  line-height: 1.75;
  font-size: 13px;
}

.search-input :deep(.el-input__wrapper) {
  min-height: 46px;
  border-radius: 16px;
  background: rgba(255, 251, 247, 0.95);
//   box-shadow: none;
}

.editor-grid {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 10px;
  margin-bottom: 10px;
}

.mobile-only {
  display: none;
}

@media (max-width: 1200px) {
  .hero-banner {
    min-height: 248px;
  }

  .feature-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .mobile-only {
    display: flex;
  }
}

@media (max-width: 768px) {
  .hero-grid,
  .shortcut-grid {
    display: none;
  }

  .panel-card,
  .feed-card {
    border-radius: 20px;
    padding: 16px;
  }

  .forum-dashboard,
  .hero-side-column,
  .feed-column,
  .side-column {
    gap: 14px;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .category-strip {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .category-strip::-webkit-scrollbar {
    display: none;
  }

  .category-chip {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .feed-head,
  .header-tools {
    // flex-direction: column;
    align-items: stretch;
  }

  .hero-banner h2 {
    font-size: clamp(24px, 8vw, 32px);
  }

  .hero-banner p,
  .feed-content,
  .notify-content,
  .section-subtitle,
  .muted-copy {
    font-size: 13px;
    line-height: 1.7;
  }

  .post-media {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .search-input {
    width: 100%;
  }

  .feed-actions-top {
    justify-content: space-between;
  }

  .editor-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {

  .hero-banner h2 {
    font-size: 30px;
  }

  .action-row,
  .hero-actions {
    flex-direction: column;
  }

  .profile-chip{
    border:none;
    padding:0;
  }
  
  .primary-btn,
  .ghost-btn,
  .notify-btn,
  .admin-btn,
  .profile-chip,
  .tab-btn,
  .notify-tab {
    width: 100%;
    justify-content: center;
  }

  .category-chip {
    width: auto;
  }

  .profile-chip {
    gap: 8px;
  }

  .feed-title {
    font-size: 16px;
  }

  .feed-card {
    padding: 12px;
    border-radius: 14px;
  }

  .post-media {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .feature-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
