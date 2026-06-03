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
          style="width: 44px; padding: 0; position: relative;"
          class="notify-btn"
          type="button"
          title="消息通知"
          @click="openNotifyDialog"
        >
          <svg class="notify-env-icon" :class="{ 'has-unread': unreadCount > 0 }" viewBox="0 0 24 24" aria-hidden="true">
            <path class="env-fill" d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>
            <path class="env-stroke" d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>
            <path class="env-flap" d="M4 8l8 5.5L20 8"/>
          </svg>
          <span v-if="unreadCount > 0" class="notify-badge">{{
            unreadCount > 99 ? "99+" : unreadCount
          }}</span>
        </button>
        <button class="profile-chip" type="button" @click="goMyProfile">
          <span class="profile-avatar">
            <img v-if="currentUserAvatarUrl" :src="currentUserAvatarUrl" alt="头像" class="profile-avatar-image" />
            <span v-else>{{ currentUserAvatar }}</span>
          </span>
          <span>{{ currentUserName }}</span>
        </button>
      </div>
    </template>

    <div ref="forumMotionRoot" class="forum-dashboard">
      <section v-if="!isMobileHome" class="hero-grid">
        <div class="hero-banner panel-card" v-reveal="{ y: 16, duration: 0.44 }">
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
          <div class="panel-card filter-card" v-reveal="{ y: 14, duration: 0.4, delay: 0.06 }">
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

          <div class="panel-card" v-reveal="{ y: 18, duration: 0.44, delay: 0.08 }">
            <div class="feed-card-list">
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

                  <div
                    v-if="post.imageItems && post.imageItems.length"
                    class="post-media"
                    :class="{ 'single-image': post.imageItems.length === 1 }"
                  >
                    <div
                      v-for="(imageItem, imageIndex) in post.imageItems"
                      :key="`${post.id}-${imageIndex}`"
                      class="media-thumb"
                    >
                      <el-image
                        :src="imageItem.thumbnailUrl || imageItem.url"
                        :preview-src-list="post.imageItems.map(i => i.url || i.thumbnailUrl).filter(Boolean)"
                        :initial-index="imageIndex"
                        preview-teleported
                        :fit="post.imageItems.length === 1 ? 'contain' : 'cover'"
                        lazy
                        :style="post.imageItems.length === 1 ? { width: '100%', height: 'auto' } : { width: '100%', height: '100%' }"
                        @error="onThumbError($event, imageItem)"
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
                <span class="meta-item meta-pill">{{ post.category || "默认分类" }}</span>
                <span class="meta-item">浏览 {{ post.viewCount }}</span>
              </div>

              <div class="action-row">
                <button
                  class="ghost-btn small icon-action-btn like-action-btn"
                  type="button"
                  :disabled="post.likedByMe"
                  @click="handleFeedLikeClick(post, $event)"
                  @mouseenter="handleFeedIconHover($event, true)"
                  @mouseleave="handleFeedIconHover($event, false)"
                  :class="{ liked: post.likedByMe }"
                  :aria-label="post.likedByMe ? '已点赞' : '点赞'"
                  :title="post.likedByMe ? '已点赞' : '点赞'"
                >
                  <svg class="action-icon like-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path class="like-fill" d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 17.5 3 20.58 3 23 5.42 23 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/>
                    <path class="like-outline" d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 17.5 3 20.58 3 23 5.42 23 8.5c0 3.78-3.4 6.86-8.55 11.54Z"/>
                    <path class="like-spark" d="M20 2.2 20.32 3.48 21.6 3.8 20.32 4.12 20 5.4 19.68 4.12 18.4 3.8 19.68 3.48Z"/>
                  </svg>
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
            </div>

            <div v-if="filteredPosts.length === 0" class="empty-feed">
              暂无匹配内容
            </div>
          </div>

          <div v-if="tab === 'visible' && !isMobileHome" class="panel-card pager-card" v-reveal="{ y: 12, duration: 0.34, delay: 0.1 }">
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

          <div v-if="tab === 'visible' && isMobileHome" class="panel-card pager-card mobile-pager-card" v-reveal="{ y: 12, duration: 0.34, delay: 0.1 }">
            <div class="mobile-pager-meta">已加载 {{ posts.length }} / {{ total }}</div>
            <button
              class="ghost-btn mobile-load-more"
              type="button"
              :disabled="mobileLoadingMore || !hasMoreVisiblePosts"
              @click="handleMobileLoadMore"
            >
              {{ mobileLoadingMore ? "加载中..." : (hasMoreVisiblePosts ? "加载更多" : "已加载全部") }}
            </button>
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
      class="notify-dialog-motion"
    >
      <template #header>
        <div class="notify-dialog-header">
          <span class="notify-dialog-title">消息中心</span>
          <button
            v-if="unreadCount > 0"
            class="ghost-btn small notify-read-all-btn"
            type="button"
            :disabled="markingAllRead"
            @click="markAllRead"
          >{{ markingAllRead ? '处理中...' : '一键已读' }}</button>
        </div>
      </template>
      <div class="notify-list">
        <TransitionGroup name="notify-stagger" tag="div" class="notify-list-inner">
          <div
            v-for="(item, notifyIndex) in notifications"
            :key="item.id"
            class="notify-item notify-clickable"
            :class="{ unread: !item.read }"
            :style="{ '--notify-index': notifyIndex }"
            @click="handleNotifyClick(item)"
          >
            <div class="notify-title-row">
              <span class="notify-type">{{ formatNotifyType(item.type) }}</span>
              <span class="notify-time">{{ formatTime(item.createTime) }}</span>
            </div>
            <div class="notify-title">{{ item.title || "新通知" }}</div>
            <div class="notify-content">{{ item.content }}</div>
          </div>
        </TransitionGroup>
        <div v-if="!notifications.length" class="empty-tip">暂无通知</div>
      </div>
    </el-dialog>

  </AppShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import AppShell from "@/components/AppShell.vue";
import RichTextViewer from "@/components/RichTextViewer.vue";
import {
  deleteForumPostApi,
  likeForumPostApi,
  listForumPostsApi,
  listMyForumPostsApi,
} from "@/api/forumApi";
import {
  getNotifyUnreadCountApi,
  listNotifyMessagesApi,
  markAllNotifyReadApi,
  markNotifyReadApi,
} from "@/api/notifyApi";
import { getCurrentAccount, isFrontendAdmin } from "@/utils/auth";
import { parsePostMixedV2, POST_MIXED_V2_PREFIX } from "@/utils/postContent";
import { normalizeFileUrl } from "@/utils/fileUrl";
import { appEnv } from "@/config/env";
import { useAppStore } from "@/stores/app";
import { gsap, prefersReducedMotion } from "@/plugins/gsapMotion";

const router = useRouter();
const appStore = useAppStore();

const tab = ref("visible");
const posts = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const mobileLoadingMore = ref(false);
const searchKeyword = ref("");
const selectedCategory = ref("全部");
const expandedMap = ref({});
const unreadCount = ref(0);
const notifyDialogVisible = ref(false);
const notifications = ref([]);
const detectMobileViewport = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.innerWidth <= 768;
};

const isMobileNotifyDialog = ref(detectMobileViewport());
const isMobileHome = ref(detectMobileViewport());
const unreadTimerId = ref(null);
const imgObserver = ref(null);
const forumMotionRoot = ref(null);
const LIST_PREVIEW_IMAGE_LIMIT = 9;
let forumMotionCtx = null;

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
const isAvatarUrlLike = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw === "👤") {
    return false;
  }
  return (
    /^(https?:)?\/\//i.test(raw) ||
    raw.startsWith("/") ||
    raw.startsWith("lb-api/") ||
    raw.startsWith("./") ||
    raw.startsWith("../")
  );
};
const currentUserAvatarUrl = computed(() => {
  
  const avatarUrl = currentAccount.value?.avatarUrl || currentAccount.value?.avatar;

  return isAvatarUrlLike(avatarUrl) ? normalizeFileUrl(avatarUrl) : "";
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
const hasMoreVisiblePosts = computed(() => {
  if (tab.value !== "visible") {
    return false;
  }
  return Number(posts.value.length || 0) < Number(total.value || 0);
});
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

const processPostItem = (item) => {
  return {
    ...item,
    authorAvatarUrl: normalizeFileUrl(item?.authorAvatarUrl),
    imageItems: parsePostContent(item?.content).imageItems.slice(0, LIST_PREVIEW_IMAGE_LIMIT),
  };
};

const updatePostsInPlace = (newList) => {
  const existingMap = new Map(posts.value.map((p) => [p.id, p]));
  const merged = [];
  for (const raw of newList) {
    const parsed = processPostItem(raw);
    const id = parsed.id;
    const existing = existingMap.get(id);
    if (existing) {
      const updates = {};
      for (const key of Object.keys(parsed)) {
        if (key === "imageItems") continue;
        if (parsed[key] !== existing[key]) updates[key] = parsed[key];
      }
      const newImgs = parsed.imageItems || [];
      const oldImgs = existing.imageItems || [];
      let sameImgs = newImgs.length === oldImgs.length && newImgs.every((ni, idx) => {
        const oi = oldImgs[idx];
        return oi && oi.thumbnailUrl === ni.thumbnailUrl && oi.url === ni.url;
      });
      if (!sameImgs) updates.imageItems = newImgs;
      if (Object.keys(updates).length) Object.assign(existing, updates);
      merged.push(existing);
      existingMap.delete(id);
    } else {
      merged.push(parsed);
    }
  }
  posts.value.splice(0, posts.value.length, ...merged);
};

const appendPostsInPlace = (newList) => {
  const incoming = Array.isArray(newList) ? newList : [];
  const existingMap = new Map(posts.value.map((item) => [item.id, item]));
  for (const raw of incoming) {
    const parsed = processPostItem(raw);
    const existing = existingMap.get(parsed.id);
    if (!existing) {
      posts.value.push(parsed);
      continue;
    }

    for (const key of Object.keys(parsed)) {
      if (key === "imageItems") continue;
      if (parsed[key] !== existing[key]) {
        existing[key] = parsed[key];
      }
    }

    const newImgs = parsed.imageItems || [];
    const oldImgs = existing.imageItems || [];
    const sameImgs =
      newImgs.length === oldImgs.length &&
      newImgs.every((ni, idx) => {
        const oi = oldImgs[idx];
        return oi && oi.thumbnailUrl === ni.thumbnailUrl && oi.url === ni.url;
      });
    if (!sameImgs) {
      existing.imageItems = newImgs;
    }
  }
};

const loadVisiblePosts = async ({ append = false } = {}) => {
  const data = unwrap(
    await listForumPostsApi({ page: page.value, pageSize: pageSize.value }),
  );
  const list = Array.isArray(data?.list) ? data.list : [];
  if (append) {
    appendPostsInPlace(list);
  } else {
    updatePostsInPlace(list);
  }
  total.value = Number(data?.total || 0);
};

const reloadVisiblePostsUpToPage = async (maxPage) => {
  const safeMaxPage = Math.max(1, Number(maxPage || 1));
  const merged = [];
  const seen = new Set();
  for (let p = 1; p <= safeMaxPage; p += 1) {
    const data = unwrap(await listForumPostsApi({ page: p, pageSize: pageSize.value }));
    const list = Array.isArray(data?.list) ? data.list : [];
    total.value = Number(data?.total || total.value || 0);
    for (const raw of list) {
      const id = Number(raw?.id);
      if (Number.isFinite(id) && seen.has(id)) continue;
      if (Number.isFinite(id)) seen.add(id);
      merged.push(raw);
    }
  }
  updatePostsInPlace(merged);
};

const loadMyPosts = async () => {
  const data = unwrap(await listMyForumPostsApi());
  const list = Array.isArray(data) ? data : [];
  updatePostsInPlace(list);
  total.value = posts.value.length;
};

let lastReloadTs = 0;

const reloadPosts = async () => {
  const now = Date.now();
  if (now - lastReloadTs < 3000) return; // 3s 防抖
  lastReloadTs = now;
  expandedMap.value = {};
  if (tab.value === "mine") {
    await loadMyPosts();
    return;
  }
  await loadVisiblePosts();
};

const refreshPostsOnly = async () => {
  const now = Date.now();
  if (now - lastReloadTs < 2000) return; // 2s 防抖
  lastReloadTs = now;
  if (tab.value === "mine") {
    await loadMyPosts();
    return;
  }
  if (isMobileHome.value && page.value > 1) {
    await reloadVisiblePostsUpToPage(page.value);
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

const handleMobileLoadMore = async () => {
  if (mobileLoadingMore.value || !hasMoreVisiblePosts.value || tab.value !== "visible") {
    return;
  }
  mobileLoadingMore.value = true;
  try {
    page.value += 1;
    await loadVisiblePosts({ append: true });
  } finally {
    mobileLoadingMore.value = false;
  }
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

const getFeedActionSvg = (eventOrEl) => {
  const buttonEl = eventOrEl?.currentTarget || eventOrEl;
  if (!(buttonEl instanceof Element)) {
    return null;
  }
  return buttonEl.querySelector("svg.action-icon");
};

const animateFeedIconHover = (eventOrEl, entering) => {
  if (prefersReducedMotion()) return;
  const svg = getFeedActionSvg(eventOrEl);
  if (!svg) return;
  gsap.killTweensOf(svg);
  gsap.to(svg, {
    scale: entering ? 1.18 : 1,
    duration: entering ? 0.22 : 0.18,
    ease: entering ? "back.out(2)" : "power2.out",
    transformOrigin: "50% 50%",
  });
};

const animateFeedIconTap = (eventOrEl, { liked = false } = {}) => {
  if (prefersReducedMotion()) return;
  const svg = getFeedActionSvg(eventOrEl);
  if (!svg) return;
  gsap.killTweensOf(svg);

  if (liked) {
    gsap.timeline({ defaults: { transformOrigin: "50% 50%" } })
      .fromTo(svg, { scale: 1 }, { scale: 1.4, duration: 0.13, ease: "power3.out" })
      .to(svg, { scale: 0.84, duration: 0.1, ease: "power2.in" })
      .to(svg, { scale: 1, duration: 0.46, ease: "elastic.out(1.1, 0.42)" });
  } else {
    gsap.timeline({ defaults: { transformOrigin: "50% 50%" } })
      .fromTo(svg, { scale: 1 }, { scale: 1.22, duration: 0.12, ease: "power2.out" })
      .to(svg, { scale: 1, duration: 0.26, ease: "back.out(2.5)" });
  }
};

const handleFeedIconHover = (event, entering) => {
  animateFeedIconHover(event, entering);
};

const handleFeedLikeClick = async (post, event) => {
  animateFeedIconTap(event, { liked: true });
  await likePost(post.id);
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

function resolveImageMeta(item) {
  if (typeof item === "string") {
    const url = normalizeFileUrl(String(item || "").trim());
    return url ? { url, thumbnailUrl: url } : null;
  }
  if (item && typeof item === "object") {
    const url = normalizeFileUrl(
      String(item.url || item.originalUrl || item.src || "").trim(),
    );
    if (!url) {
      return null;
    }
    const thumbnailUrl =
      normalizeFileUrl(String(item.thumbnailUrl || item.thumbUrl || "").trim()) ||
      url;
    return { url, thumbnailUrl };
  }
  return null;
};

// 从HTML内容中提取纯文本
const extractPlainText = (content) => {
  if (!content) return '';
  // 移除HTML标签
  const plainText = String(content)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
  return plainText;
};

function parsePostContent(rawContent) {
  const source = String(rawContent || "");

  // 处理 #POST_MIXED_V2# 格式（数组格式和对象格式）
  const v2 = parsePostMixedV2(source);
  if (v2) {
    return {
      text: v2.textBlocks.join('\n'),
      imageItems: v2.imageItems.map((i) => resolveImageMeta(i)).filter(Boolean),
    };
  }

  // 普通 Markdown 格式：从 ![...](...) 提取图片
  const imageItemsFromMarkdown = [...source.matchAll(/!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\)/g)]
    .map((match) => resolveImageMeta(match?.[1] || match?.[2]))
    .filter(Boolean);

  // 收紧 URL 正则，遇到 " ' } ] , 停止，避免把 JSON 内容误当 URL
  const imageItems = imageItemsFromMarkdown.length
    ? imageItemsFromMarkdown
    : (source.match(/https?:\/\/[^\s)"',}\]]+/g) || [])
    .map((item) => resolveImageMeta(item))
    .filter(Boolean);

  const text = source
    .replace(/!\[[^\]]*\]\((?:<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\)/g, " ")
    .replace(/https?:\/\/[^\s)"',}\]]+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, imageItems };
};

const stripMarkdownSymbols = (md) => {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, '')        // 代码块
    .replace(/!\[.*?\]\(.*?\)/g, '')       // 图片
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // 链接
    .replace(/\*\*(.*?)\*\*/g, '$1')       // 粗体
    .replace(/\*(.*?)\*/g, '$1')           // 斜体
    .replace(/~~(.*?)~~/g, '$1')           // 删除线
    .replace(/`([^`]+)`/g, '$1')           // 行内代码
    .replace(/^#{1,6}\s+/gm, '')           // 标题
    .replace(/^>\s+/gm, '')               // 引用
    .replace(/^[-*+]\s+/gm, '')           // 无序列表
    .replace(/^\d+\.\s+/gm, '')           // 有序列表
    .replace(/\n{2,}/g, '\n')
    .trim();
};

const displayContent = (content) => {
  if (!content) return '';
  const raw = String(content);
  // 兼容 #POST_MIXED_V2# 格式（数组格式和对象格式）
  const v2 = parsePostMixedV2(raw);
  if (v2) {
    return v2.textBlocks.map(stripMarkdownSymbols).join(' ');
  }
  return stripMarkdownSymbols(raw);
};

const getPostImageItems = (content) => {
  return parsePostContent(content).imageItems.slice(0, LIST_PREVIEW_IMAGE_LIMIT);
};

const getPostImages = (content) => {
  return getPostImageItems(content).map((item) => item.url).filter(Boolean);
};

const onThumbError = (evt, item) => {
  try {
    const el = evt?.target;
    if (!el) return;
    const fallback = item?.url || "";
    if (fallback && el.src !== fallback) {
      el.src = fallback;
    } else {
      el.src = "";
    }
  } catch {}
};

const loadUnreadCount = async () => {
  if (!currentAccount.value) {
    unreadCount.value = 0;
    appStore.setUnreadNotifyCount(0);
    return;
  }
  const data = unwrap(await getNotifyUnreadCountApi());
  unreadCount.value = Number(data?.unread || 0);
  appStore.setUnreadNotifyCount(unreadCount.value);
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
  appStore.setUnreadNotifyCount(unreadCount.value);
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

const markingAllRead = ref(false);

const markAllRead = async () => {
  if (markingAllRead.value) return;
  markingAllRead.value = true;
  try {
    await markAllNotifyReadApi();
    notifications.value = notifications.value.map((item) => ({ ...item, read: true }));
    unreadCount.value = 0;
    appStore.setUnreadNotifyCount(0);
  } catch {
    ElMessage.error('操作失败');
  } finally {
    markingAllRead.value = false;
  }
};

const formatNotifyType = (type) => {
  const value = String(type || "").toUpperCase();
  if (value === "CHAT") return "私信";
  if (value === "LIKE") return "点赞";
  if (value === "COMMENT") return "评论";
  if (value === "FOLLOW") return "关注";
  if (value === "MENTION") return "@提及";
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

  if ((type === "LIKE" || type === "COMMENT" || type === "MENTION") && bizId) {
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
  const isMobile = detectMobileViewport();
  isMobileNotifyDialog.value = isMobile;
  isMobileHome.value = isMobile;
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

  if (!prefersReducedMotion() && forumMotionRoot.value) {
    forumMotionCtx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
      const heroBanner = gsap.utils.toArray(".hero-banner");
      const filterCard = gsap.utils.toArray(".filter-card");
      const feedCards = gsap.utils.toArray(".feed-card");

      if (heroBanner.length) {
        timeline.from(heroBanner, { autoAlpha: 0, y: 14, duration: 0.34 });
      }
      if (filterCard.length) {
        timeline.from(filterCard, { autoAlpha: 0, y: 10, duration: 0.26 }, heroBanner.length ? "-=0.18" : 0);
      }
      if (feedCards.length) {
        timeline.from(feedCards, { autoAlpha: 0, y: 10, stagger: 0.04, duration: 0.24 }, filterCard.length || heroBanner.length ? "-=0.12" : 0);
      }
    }, forumMotionRoot.value);
  }

  startUnreadPolling();

  // 开发时：观察 feed 列表中 <img> 的 src 属性变化，帮助定位重复请求来源
  if (typeof window !== "undefined") {
    try {
      if (appEnv.isDev) {
        const feedEl = document.querySelector(".feed-card-list");
        const counts = new Map();
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.type === "attributes" && m.attributeName === "src") {
              const img = m.target;
              const src = img.getAttribute("src") || "";
              const c = counts.get(src) || 0;
              counts.set(src, c + 1);
              // eslint-disable-next-line no-console
              console.log(`[ImgSrcChange] src=${src} count=${c + 1} posts=${posts.value.length}`, img);
            }
          }
        });
        if (feedEl) {
          observer.observe(feedEl, { subtree: true, attributes: true, attributeFilter: ["src"] });
          imgObserver.value = observer;
          // eslint-disable-next-line no-console
          console.log("[ImgObserver] started observing .feed-card-list");
        } else {
          // eslint-disable-next-line no-console
          console.log("[ImgObserver] .feed-card-list not found");
        }

        watch(posts, (newVal, oldVal) => {
          // eslint-disable-next-line no-console
          console.log("[posts] changed", { newLen: newVal?.length, oldLen: oldVal?.length, time: new Date().toISOString() });
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[ImgObserver] setup failed", err);
    }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateNotifyDialogMode);
  window.removeEventListener("focus", loadUnreadCount);
  stopUnreadPolling();
  if (imgObserver.value) {
    try {
      imgObserver.value.disconnect();
    } catch {}
    imgObserver.value = null;
  }
  forumMotionCtx?.revert();
  forumMotionCtx = null;
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

.icon-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 44px;
  min-width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: inset 0 0 0 1px rgba(91, 110, 128, 0.08), 0 8px 18px rgba(24, 39, 75, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.action-icon {
  width: 22px;
  height: 22px;
  transition: transform 0.2s ease, color 0.2s ease, filter 0.2s ease;
}

.like-action-btn:hover,
.like-action-btn:focus-visible {
  box-shadow: inset 0 0 0 1px rgba(213, 106, 79, 0.22),
              0 6px 18px rgba(213, 106, 79, 0.14);
}

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
  display: flex;
  align-items: center;
  justify-content: center;
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

/* ── 消息信封 SVG 图标 ── */
.notify-env-icon {
  width: 26px;
  height: 26px;
  overflow: visible;
  display: block;
  transition: transform 0.22s ease, filter 0.22s ease;
}

.env-fill {
  fill: rgba(60, 60, 67, 0.06);
  transition: fill 0.22s ease;
}

.env-stroke {
  fill: none;
  stroke: #6e6e73;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
  transition: stroke 0.22s ease, stroke-width 0.22s ease;
}

.env-flap {
  fill: none;
  stroke: #6e6e73;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
  transition: stroke 0.22s ease, stroke-width 0.22s ease;
}

.notify-btn:hover .env-fill { fill: rgba(60, 60, 67, 0.1); }
.notify-btn:hover .env-stroke,
.notify-btn:hover .env-flap { stroke: #1d1d1f; stroke-width: 2; }
.notify-btn:hover .notify-env-icon {
  transform: rotate(-8deg) scale(1.08);
  filter: drop-shadow(0 2px 6px rgba(30, 30, 32, 0.18));
}

.notify-env-icon.has-unread .env-stroke,
.notify-env-icon.has-unread .env-flap {
  stroke: #d66449;
}

@keyframes env-pulse {
  0%, 100% { filter: drop-shadow(0 0 0px rgba(214, 100, 73, 0)); }
  50% { filter: drop-shadow(0 0 6px rgba(214, 100, 73, 0.55)); }
}

.notify-env-icon.has-unread {
  animation: env-pulse 2.4s ease-in-out infinite;
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

.profile-avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
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
  position: relative;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.media-thumb {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(220, 205, 194, 0.8);
  background: #f4efea;
  aspect-ratio: 1 / 1;
  cursor: zoom-in;
}

.media-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* make el-image fill the thumb container and keep cover behavior */
.media-thumb :deep(.el-image) {
  width: 100%;
  height: 100%;
  display: block;
}

.media-thumb :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-media.single-image {
  grid-template-columns: minmax(0, 1fr);
}

.post-media.single-image .media-thumb {
  aspect-ratio: auto;
}

.post-media.single-image .media-thumb :deep(.el-image) {
  height: auto;
}

.post-media.single-image .media-thumb :deep(.el-image__inner) {
  height: auto;
  object-fit: contain;
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

.meta-row {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.meta-pill {
  border-radius: 999px;
  padding: 2px 10px;
  background: rgba(226, 213, 202, 0.38);
  color: #6d5951;
  font-weight: 700;
}

.action-row {
  margin-top: 10px;
  align-items: center;
  justify-content: space-between;
}

.pager-card {
  display: flex;
  justify-content: center;
}

.mobile-pager-card {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mobile-pager-meta {
  color: #8e7d74;
  font-size: 13px;
}

.mobile-load-more {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
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

.notify-list-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notify-stagger-move {
  transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.notify-stagger-enter-active,
.notify-stagger-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.notify-stagger-enter-from,
.notify-stagger-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.notify-stagger-enter-active {
  transition-delay: calc(var(--notify-index, 0) * 26ms);
}

.notify-item {
  padding: 14px;
  border-radius: 16px;
  background: #f7f3f0;
  border: 1px solid rgba(214, 194, 181, 0.5);
  opacity: 0.75;
  transition: opacity 0.2s, box-shadow 0.2s;
}

.notify-item.unread {
  background: #fff4ee;
  border-color: #e8896a;
  opacity: 1;
  box-shadow: 0 2px 8px rgba(198, 99, 72, 0.10);
}

.notify-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notify-dialog-title {
  font-size: 16px;
  font-weight: 700;
  color: #3b302c;
}

:deep(.notify-dialog-motion .el-dialog) {
  transform-origin: 50% 12%;
  animation: notify-dialog-pop 0.24s cubic-bezier(0.22, 0.61, 0.36, 1);
}

@keyframes notify-dialog-pop {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.notify-read-all-btn {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  border-color: #c66348;
  color: #c66348;
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

/* improved preview dialog styles */
.image-preview-dialog :deep(.el-dialog__body) {
  padding: 12px;
  background: transparent;
}

.preview-stage {
  min-height: min(70vh, 680px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 10, 0.65);
  border-radius: 14px;
  padding: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
}

.preview-image {
  max-width: 100%;
  max-height: min(80vh, 820px);
  object-fit: contain;
  border-radius: 10px;
  transition: transform 200ms ease;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}

.preview-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  border: 0;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 120ms ease, transform 120ms ease;
}

.preview-close:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(1.03);
}

.preview-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  border: 0;
  background: rgba(0, 0, 0, 0.32);
  color: #fff;
  width: 48px;
  height: 72px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 120ms ease, transform 120ms ease;
}

.preview-nav:hover {
  background: rgba(0, 0, 0, 0.48);
  transform: translateY(-50%) scale(1.02);
}

.preview-nav.prev {
  left: 10px;
}

.preview-nav.next {
  right: 10px;
}

.preview-nav[disabled] {
  opacity: 0.3;
  cursor: not-allowed;
}

.preview-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 6px 0 6px;
  color: #fff;
}

.preview-footer .preview-footer-center {
  text-align: center;
  flex: 0 0 auto;
  color: #fff;
  font-weight: 700;
}

.preview-footer-left,
.preview-footer-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 768px) {
  .preview-nav {
    display: none;
  }

  .preview-close {
    top: 8px;
    right: 8px;
    width: 36px;
    height: 36px;
  }

  .preview-image {
    max-height: calc(100vh - 140px);
    border-radius: 6px;
  }
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

  .content-grid,
  .panel-card,
  .feed-card {
    border: none;
  }

  .panel-card,
  .feed-card {
    border-radius: 20px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }

  .feed-card {
    border-radius: 16px;
    padding: 12px;
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

  .hero-stat-item {
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .feature-card {
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
    border: none;
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

  .media-thumb {
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .search-input {
    width: 100%;
  }

  .search-input :deep(.el-input__wrapper) {
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .feed-actions-top {
    justify-content: space-between;
  }

  .notify-btn,
  .admin-btn,
  .profile-chip {
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  }

  .notify-item {
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .notify-item.unread {
    border-left: 3px solid #0066cc;
  }

  .side-post {
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
    border: none;
    padding: 0;
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
    border: none;
  }

  .category-chip {
    width: auto;
    border: none;
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
    border: none;
  }

  .post-media {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .feature-grid {
    grid-template-columns: 1fr 1fr;
  }

  .mini-day {
    border: none;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  }

  .notify-side-item {
    border: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }
}

/* Apple-style page refinement overrides */
.panel-card,
.feed-card,
.notify-item,
.feature-card,
.side-post {
  background: var(--canvas, #fff);
  border: 1px solid var(--hairline, #e0e0e0);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.hero-banner {
  background:
    radial-gradient(circle at 88% 18%, rgba(41, 151, 255, 0.14), transparent 36%),
    radial-gradient(circle at right top, rgba(0, 102, 204, 0.08), transparent 28%),
    linear-gradient(135deg, #ffffff 0%, #f5f5f7 100%);
}

.hero-banner::after {
  background: linear-gradient(145deg, rgba(41, 151, 255, 0.14), rgba(0, 102, 204, 0.08));
}

.hero-tag,
.section-title,
.notify-type,
.inline-link,
.edit-link,
.delete-link {
  color: var(--primary, #0066cc);
}

.hero-banner h2,
.feed-title,
.author-name,
.spotlight-card h3 {
  color: var(--ink, #1d1d1f);
}

.hero-banner p,
.muted-copy,
.section-subtitle,
.feed-content,
.time-text,
.meta-item,
.notify-content,
.notify-time,
.visibility-badge {
  color: var(--ink-muted, #6e6e73);
}

.primary-btn,
.tab-btn.active,
.notify-tab.active,
.category-chip.active {
  background: var(--primary, #0066cc);
  color: #fff;
  box-shadow: none;
}

.ghost-btn,
.notify-btn,
.admin-btn,
.profile-chip,
.tab-btn,
.notify-tab,
.category-chip {
  background: var(--canvas, #fff);
  color: var(--ink, #1d1d1f);
  border: 1px solid var(--hairline, #e0e0e0);
}

.notify-badge {
  background: var(--primary, #0066cc);
}

.profile-avatar,
.avatar,
.avatar-image {
  border-color: #fff;
}

.profile-avatar,
.avatar {
  background: linear-gradient(135deg, #1d1d1f, #3c3c43);
}

.hero-stat-item {
  background: #fff;
  border-color: var(--hairline, #e0e0e0);
}

.hero-stat-item strong {
  color: var(--ink, #1d1d1f);
}

.hero-author,
.hero-stat-item span {
  color: var(--ink-muted, #6e6e73);
}

.notify-panel {
  background: #fff;
  border: 1px solid var(--hairline, #e0e0e0);
}

/* Second-pass micro-polish */
.forum-dashboard {
  gap: 22px;
}

.hero-banner {
  min-height: 320px;
}

.hero-copy {
  width: min(100%, 820px);
}

.hero-banner h2 {
  margin: 18px 0 10px;
  font-size: clamp(32px, 3vw, 46px);
  letter-spacing: -0.24px;
}

.hero-quote-author {
  font-size: 15px;
}

.search-input {
  width: min(380px, 100%);
}

.header-tools {
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.feed-card-list {
  gap: 14px;
}

.feed-card {
  padding: 16px;
  border-radius: 18px;
}

.feed-title {
  margin: 10px 0 8px;
  font-size: clamp(17px, 1.5vw, 20px);
}

.feed-content {
  line-height: 1.75;
}

.meta-row {
  gap: 14px;
}

.action-row {
  margin-top: 12px;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.notify-item {
  border-radius: 14px;
}

.notify-item.unread {
  border-left: 3px solid var(--primary, #0066cc);
}

@media (max-width: 768px) {
  .forum-dashboard {
    gap: 16px;
  }

  .panel-card,
  .feed-card {
    border-radius: 16px;
    padding: 14px;
  }

  .header-tools {
    gap: 6px;
  }

  .notify-btn,
  .admin-btn,
  .profile-chip {
    min-height: 38px;
    font-size: 13px;
    padding: 0 12px;
  }

  .profile-avatar,
  .avatar,
  .avatar-image {
    width: 30px;
    height: 30px;
  }
}

@media (max-width: 640px) {
  .header-tools .notify-btn,
  .header-tools .admin-btn,
  .header-tools .profile-chip {
    width: auto;
    justify-content: center;
    flex: 0 0 auto;
  }

  .action-row{
    flex-direction: row;
  }
  .hero-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .feed-head {
    flex-direction: column;
    gap: 8px;
  }

  .feed-actions-top {
    justify-content: flex-start;
  }
}

/* Third-pass alignment acceptance */
.primary-btn,
.ghost-btn,
.notify-btn,
.admin-btn,
.profile-chip,
.tab-btn,
.notify-tab,
.category-chip {
  min-height: 40px;
  font-size: 14px;
  line-height: 1;
}

.primary-btn:disabled,
.ghost-btn:disabled,
.notify-btn:disabled,
.admin-btn:disabled,
.profile-chip:disabled,
.tab-btn:disabled,
.notify-tab:disabled,
.category-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.primary-btn:focus-visible,
.ghost-btn:focus-visible,
.notify-btn:focus-visible,
.admin-btn:focus-visible,
.profile-chip:focus-visible,
.tab-btn:focus-visible,
.notify-tab:focus-visible,
.category-chip:focus-visible,
.inline-link:focus-visible,
.edit-link:focus-visible,
.delete-link:focus-visible {
  outline: 2px solid rgba(0, 113, 227, 0.35);
  outline-offset: 2px;
}

.search-input :deep(.el-input__wrapper) {
  min-height: 42px;
  border: 1px solid var(--hairline, #e0e0e0);
}

.search-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--primary-focus, #0071e3);
  box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.18);
}

.header-tools {
  gap: 8px;
}

.feed-actions-top {
  gap: 8px;
}

@media (max-width: 1024px) {
  .search-input {
    width: min(320px, 100%);
  }

  .primary-btn,
  .ghost-btn,
  .notify-btn,
  .admin-btn,
  .profile-chip,
  .tab-btn,
  .notify-tab,
  .category-chip {
    min-height: 38px;
    font-size: 13px;
  }
}

@media (max-width: 640px) {
  .header-tools {
    justify-content: flex-start;
  }

  .primary-btn,
  .ghost-btn,
  .notify-btn,
  .admin-btn,
  .profile-chip,
  .tab-btn,
  .notify-tab,
  .category-chip {
    min-height: 36px;
    font-size: 13px;
  }
}
</style>

<style>
/* 全局覆盖：确保 Element Plus 的图片查看器为固定定位并正确居中，按钮在移动端也可见 */
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
.el-image-viewer__btn {
  background: transparent !important;
  border: 0 !important;
  color: #fff !important;
}
.el-image-viewer__prev {
  left: 22px !important;
  right: auto !important;
}
.el-image-viewer__next {
  right: 22px !important;
  left: auto !important;
}
</style>
