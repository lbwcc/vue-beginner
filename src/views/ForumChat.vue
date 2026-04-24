<template>
	<div class="forum-chat-page">
		<div class="phone-shell">
			<header ref="chatHeaderRef" class="chat-header" :style="chatHeaderStyle">
				<button class="icon-btn back-btn" type="button" aria-label="返回" @click="goBack">
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M14.7 5.3a1 1 0 0 1 0 1.4L9.41 12l5.3 5.3a1 1 0 0 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.41 0z" />
					</svg>
				</button>

				<div class="title-block">
					<h1>{{ chatTitle }}</h1>
				</div>

				<div class="header-spacer" aria-hidden="true"></div>
			</header>

			<main ref="messagePanelRef" class="chat-body" :style="chatBodyStyle">
				<section class="message-list">
					<template v-for="item in renderItems" :key="item.key">
						<div v-if="item.renderType === 'divider'" class="time-divider">
							<span>{{ item.label }}</span>
						</div>

						<article
							v-else
							class="message-item"
							:class="{ mine: item.isMine, grouped: !item.showMeta }"
						>
							<div v-if="item.showMeta" class="message-meta" :class="{ mine: item.isMine }">
								<div class="sender-avatar">{{ getSenderAvatar(item.sender) }}</div>
								<div class="meta-text">
									<div class="sender">{{ item.sender }}</div>
									<div v-if="item.timestamp" class="message-time">{{ formatMessageTime(item.timestamp) }}</div>
								</div>
							</div>
							<div class="bubble" :class="{ image: item.type === 'image' }">
								<img
									v-if="item.type === 'image'"
									:src="resolveImageUrl(item.content)"
									alt="发送图片"
									class="image-message"
									loading="lazy"
									@load="handleImageLoaded"
								/>
								<span v-else>{{ item.content }}</span>
							</div>
						</article>
					</template>

					<div v-if="messages.length === 0" class="empty-tip">
						{{ currentUserName }}，开始发送第一条消息吧
					</div>

					<div ref="messageEndRef" class="message-end-anchor" />
				</section>
			</main>

			<button
				v-if="showScrollToBottom"
				type="button"
				class="scroll-bottom-btn"
				:style="scrollBottomButtonStyle"
				@click="scrollToBottom('smooth')"
			>
				回到底部
			</button>

			<footer ref="chatFooterRef" class="chat-footer" :style="chatFooterStyle">
				<div class="input-wrap">
					<div class="input-user">{{ currentUserName }}</div>
					<button class="tool-btn" type="button" aria-label="发送图片" @click="openImagePicker">
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M11 4a1 1 0 0 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z" />
						</svg>
					</button>

					<input
						ref="fileInputRef"
						type="file"
						accept="image/*"
						class="hidden-file"
						@change="onFileChange"
					/>

					<input
						v-model="inputText"
						type="text"
						class="message-input"
						placeholder="输入文字消息"
						@keydown.enter="sendText"
					/>

					<button class="send-btn" type="button" :disabled="!inputText.trim()" @click="sendText">
						发送
					</button>
				</div>
			</footer>
		</div>
	</div>
</template>

<script setup>
import { Client } from '@stomp/stompjs'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import SockJS from 'sockjs-client/dist/sockjs'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { uploadFileApi } from '@/api/fileApi'
import { listSessionMessagesApi, sendSessionMessageApi } from '@/api/socialApi'
import { markChatSessionNotifyReadApi } from '@/api/notifyApi'
import { getCurrentAccount } from '@/utils/auth'
import { normalizeFileUrl } from '@/utils/fileUrl'

const route = useRoute()
const currentAccount = computed(() => getCurrentAccount())
const currentUserName = computed(() => {
	const nickname = String(currentAccount.value?.nickname || '').trim()
	if (nickname) {
		return nickname
	}
	const username = String(currentAccount.value?.username || '').trim()
	return username || '我'
})

const chatTitle = computed(() => {
	const routeName = String(route.query.nickname || route.query.name || '').trim()
	if (routeName) {
		return routeName
	}
	return '啦啦啦'
})

const activeSessionId = computed(() => {
	const sessionId = Number(route.query.sessionId)
	if (Number.isFinite(sessionId) && sessionId > 0) {
		return sessionId
	}
	return null
})

const inputText = ref('')
const fileInputRef = ref(null)
const messagePanelRef = ref(null)
const chatHeaderRef = ref(null)
const chatFooterRef = ref(null)
const messages = ref([])
const messageEndRef = ref(null)
const stompClientRef = ref(null)
const connectedRef = ref(false)
const subscriptionRef = ref(null)
const loadingRef = ref(false)
const loadingHistoryMoreRef = ref(false)
const hasMoreHistoryRef = ref(true)
const keyboardOffset = ref(0)
const headerHeight = ref(64)
const footerHeight = ref(74)
const isNearBottom = ref(true)

const chatHeaderStyle = computed(() => ({
	transform: 'translateX(-50%)',
}))

const chatFooterStyle = computed(() => ({
	transform: `translate(-50%, -${keyboardOffset.value}px)`,
}))

const chatBodyStyle = computed(() => ({
	paddingTop: `${Math.max(70, headerHeight.value) + 18}px`,
	paddingBottom: `${Math.max(84, footerHeight.value) + keyboardOffset.value + 72}px`,
}))

const scrollBottomButtonStyle = computed(() => ({
	transform: 'translateX(-50%)',
	bottom: `${Math.max(74, footerHeight.value) + keyboardOffset.value + 14}px`,
}))

const showScrollToBottom = computed(() => !isNearBottom.value && messages.value.length > 0)

const TIME_DIVIDER_GAP_MS = 5 * 60 * 1000
const HISTORY_PAGE_SIZE = 30

const renderItems = computed(() => {
	const list = []
	let prevMessage = null
	let prevDate = null

	for (let index = 0; index < messages.value.length; index += 1) {
		const current = messages.value[index]
		const currentDate = parseMessageDate(current.timestamp)
		const currentMs = currentDate ? currentDate.getTime() : null
		const prevMs = prevDate ? prevDate.getTime() : null

		if (
			currentDate
			&& (!prevDate || !isSameDay(prevDate, currentDate) || Math.abs(currentMs - prevMs) >= TIME_DIVIDER_GAP_MS)
		) {
			list.push({
				renderType: 'divider',
				key: `divider_${current.id}_${index}`,
				label: formatTimeDivider(currentDate),
			})
		}

		const groupedWithPrev = (() => {
			if (!prevMessage || !prevDate || !currentDate) {
				return false
			}
			const sameSender = String(prevMessage.sender || '') === String(current.sender || '')
			if (!sameSender) {
				return false
			}
			return Math.abs(currentMs - prevMs) < TIME_DIVIDER_GAP_MS
		})()

		list.push({
			renderType: 'message',
			key: `message_${current.id}_${index}`,
			id: current.id,
			sender: current.sender,
			type: current.type,
			content: current.content,
			timestamp: current.timestamp,
			isMine: String(current.sender || '') === currentUserName.value,
			showMeta: !groupedWithPrev,
		})

		prevMessage = current
		prevDate = currentDate || prevDate
	}

	return list
})

const updateLayoutMetrics = () => {
	if (chatHeaderRef.value) {
		headerHeight.value = Math.ceil(chatHeaderRef.value.getBoundingClientRect().height)
	}
	if (chatFooterRef.value) {
		footerHeight.value = Math.ceil(chatFooterRef.value.getBoundingClientRect().height)
	}
}

const updateKeyboardOffset = () => {
	if (typeof window === 'undefined' || !window.visualViewport) {
		keyboardOffset.value = 0
		updateLayoutMetrics()
		return
	}
	const viewport = window.visualViewport
	const diff = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
	keyboardOffset.value = Math.round(diff)
	updateLayoutMetrics()
}

const normalizeMessageType = (type) => {
	const value = String(type || '').trim().toUpperCase()
	if (value === 'IMAGE' || value === 'IMG') {
		return 'image'
	}
	return 'text'
}

const readUploadUrl = (data) => {
	return normalizeFileUrl(data?.url || data?.fullUrl || data?.fileUrl || data?.path || '')
}

const resolveImageUrl = (value) => {
	return normalizeFileUrl(value)
}

const normalizeMessageTime = (value) => {
	if (!value) {
		return ''
	}
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return ''
	}
	return date.toISOString()
}

const parseMessageDate = (value) => {
	if (!value) {
		return null
	}
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return null
	}
	return date
}

const isSameDay = (left, right) => {
	return left.getFullYear() === right.getFullYear()
		&& left.getMonth() === right.getMonth()
		&& left.getDate() === right.getDate()
}

const formatTimeDivider = (date) => {
	const now = new Date()
	const yesterday = new Date(now)
	yesterday.setDate(now.getDate() - 1)

	if (isSameDay(date, now)) {
		return `今天 ${formatMessageTime(date.toISOString())}`
	}
	if (isSameDay(date, yesterday)) {
		return `昨天 ${formatMessageTime(date.toISOString())}`
	}
	return date.toLocaleString('zh-CN', {
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	})
}

const formatMessageTime = (value) => {
	if (!value) {
		return ''
	}
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return ''
	}
	return date.toLocaleTimeString('zh-CN', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

const getSenderAvatar = (name) => {
	const text = String(name || '').trim()
	if (!text) {
		return '聊'
	}
	return text.slice(0, 1).toUpperCase()
}

const wsEndpoint = () => {
	const backendOrigin = String(import.meta.env.VITE_BACKEND_ORIGIN || '').trim().replace(/\/+$/, '')
	if (backendOrigin) {
		return `${backendOrigin}/lb-api/ws`
	}
	if (typeof window === 'undefined') {
		return '/lb-api/ws'
	}
	return `${window.location.origin}/lb-api/ws`
}

const markCurrentSessionNotifyAsRead = async () => {
	if (!activeSessionId.value) {
		return
	}
	try {
		await markChatSessionNotifyReadApi(activeSessionId.value)
	} catch {
		// ignore
	}
}

const checkIsNearBottom = () => {
	if (!messagePanelRef.value) {
		isNearBottom.value = true
		return true
	}
	const panel = messagePanelRef.value
	const remaining = panel.scrollHeight - panel.scrollTop - panel.clientHeight
	const nearBottom = remaining <= 64
	isNearBottom.value = nearBottom
	return nearBottom
}

const handlePanelScroll = () => {
	checkIsNearBottom()
	if (!messagePanelRef.value) {
		return
	}
	if (!hasMoreHistoryRef.value || loadingHistoryMoreRef.value || loadingRef.value) {
		return
	}
	if (messagePanelRef.value.scrollTop <= 40) {
		loadHistoryMessages(true)
	}
}

const scrollToBottom = (behavior = 'auto') => {
	nextTick(() => {
		if (messageEndRef.value) {
			messageEndRef.value.scrollIntoView({
				block: 'end',
				behavior,
			})
		} else if (messagePanelRef.value) {
			messagePanelRef.value.scrollTop = messagePanelRef.value.scrollHeight
		}
		isNearBottom.value = true
	})
}

const appendMessage = (payload) => {
	const messageId = String(payload?.id || '')
	if (messageId && messages.value.some((item) => String(item.id) === messageId)) {
		return
	}
	const nextMessage = {
		id: payload?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
		sender: currentUserName.value,
		timestamp: normalizeMessageTime(payload?.timestamp),
		...payload,
	}
	const shouldStickBottom = checkIsNearBottom()
	messages.value.push(nextMessage)
	if (shouldStickBottom || String(nextMessage.sender || '') === currentUserName.value) {
		scrollToBottom()
	}
}

const handleImageLoaded = () => {
	if (checkIsNearBottom()) {
		scrollToBottom()
	}
}

const loadHistoryMessages = async (loadMore = false) => {
	if (!activeSessionId.value) {
		messages.value = []
		hasMoreHistoryRef.value = false
		return
	}
	if (loadMore && !hasMoreHistoryRef.value) {
		return
	}
	if (loadMore) {
		loadingHistoryMoreRef.value = true
	} else {
		loadingRef.value = true
	}

	const panel = messagePanelRef.value
	const prevScrollHeight = panel ? panel.scrollHeight : 0
	const prevScrollTop = panel ? panel.scrollTop : 0
	const oldestMessage = messages.value.length > 0 ? messages.value[0] : null
	const beforeId = loadMore && oldestMessage ? Number(oldestMessage.id) : null
	try {
		const res = await listSessionMessagesApi(activeSessionId.value, {
			limit: HISTORY_PAGE_SIZE,
			beforeId,
		})
		const payload = res?.data?.data ?? res?.data ?? []
		const list = Array.isArray(payload) ? payload : []
		const mapped = list.map((item) => ({
			id: item.id,
			sender: String(item.senderName || '未知用户'),
			type: normalizeMessageType(item.msgType),
			timestamp: normalizeMessageTime(item.createTime || item.updateTime || item.sendTime),
			content: String(item.content || ''),
		}))

		hasMoreHistoryRef.value = mapped.length >= HISTORY_PAGE_SIZE

		if (loadMore) {
			const existingIds = new Set(messages.value.map((item) => String(item.id)))
			const prependList = mapped.filter((item) => !existingIds.has(String(item.id)))
			if (prependList.length > 0) {
				messages.value = [...prependList, ...messages.value]
				nextTick(() => {
					if (!messagePanelRef.value) {
						return
					}
					const nextHeight = messagePanelRef.value.scrollHeight
					messagePanelRef.value.scrollTop = prevScrollTop + (nextHeight - prevScrollHeight)
				})
			} else {
				hasMoreHistoryRef.value = false
			}
		} else {
			messages.value = mapped
			scrollToBottom()
			await markCurrentSessionNotifyAsRead()
		}
	} finally {
		if (loadMore) {
			loadingHistoryMoreRef.value = false
		} else {
			loadingRef.value = false
		}
	}
}

const connectWebSocket = () => {
	if (stompClientRef.value) {
		return
	}

	const client = new Client({
		webSocketFactory: () => new SockJS(wsEndpoint()),
		reconnectDelay: 3000,
		onConnect: () => {
			connectedRef.value = true
			if (!activeSessionId.value) {
				return
			}
			subscriptionRef.value = client.subscribe(`/topic/social.session.${activeSessionId.value}`, (frame) => {
				let body = null
				try {
					body = JSON.parse(frame.body || '{}')
				} catch {
					return
				}
				const content = String(body?.content || '').trim()
				if (!content) {
					return
				}
				appendMessage({
					id: body.id,
					sender: String(body?.senderName || body?.username || '匿名用户'),
					type: normalizeMessageType(body?.msgType || body?.type),
					timestamp: normalizeMessageTime(body?.createTime || body?.sendTime || body?.timestamp),
					content,
				})
				markCurrentSessionNotifyAsRead()
			})
			loadHistoryMessages(false)
		},
		onWebSocketClose: () => {
			connectedRef.value = false
		},
		onStompError: () => {
			connectedRef.value = false
		},
		onWebSocketError: () => {
			connectedRef.value = false
		},
	})

	stompClientRef.value = client
	client.activate()
}

const publishMessage = (payload) => {
	if (!activeSessionId.value) {
		ElMessage.warning('缺少会话ID，无法发送消息')
		return false
	}
	sendSessionMessageApi(activeSessionId.value, payload)
		.catch((error) => {
			const message = error?.response?.data?.message || error?.message || '发送失败'
			ElMessage.error(message)
		})
	return true
}

const sendText = () => {
	const text = inputText.value.trim()
	if (!text) {
		return
	}
	const published = publishMessage({
		msgType: 'TEXT',
		content: text,
	})
	if (!published) {
		return
	}
	inputText.value = ''
}

const openImagePicker = () => {
	fileInputRef.value?.click()
}

const onFileChange = (event) => {
	const file = event.target?.files?.[0]
	event.target.value = ''
	if (!file) {
		return
	}
	if (!activeSessionId.value) {
		ElMessage.warning('只能和好友或互关用户发起私聊，无法发送图片')
		return
	}
	if (!String(file.type || '').startsWith('image/')) {
		ElMessage.warning('请选择图片文件')
		return
	}
	if (file.size > 8 * 1024 * 1024) {
		ElMessage.warning('图片不能超过 8MB')
		return
	}

	uploadFileApi(file)
		.then((res) => {
			const data = res?.data?.data ?? res?.data ?? {}
			const url = readUploadUrl(data)
			if (!url) {
				throw new Error('上传成功但未返回图片地址')
			}
			const ok = publishMessage({
				msgType: 'IMAGE',
				content: url,
			})
			if (!ok) {
				throw new Error('发送失败，请稍后重试')
			}
		})
		.catch((error) => {
			ElMessage.error(error?.message || '图片上传失败，请稍后重试')
		})
}

onMounted(() => {
	if (!activeSessionId.value) {
		ElMessage.warning('只能和好友或互关用户发起私聊')
	}
	connectWebSocket()
	updateKeyboardOffset()
	nextTick(() => {
		updateLayoutMetrics()
		if (messagePanelRef.value) {
			messagePanelRef.value.addEventListener('scroll', handlePanelScroll, { passive: true })
		}
		checkIsNearBottom()
	})
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', updateKeyboardOffset)
		window.visualViewport.addEventListener('scroll', updateKeyboardOffset)
	}
	window.addEventListener('resize', updateKeyboardOffset)
})

onBeforeUnmount(() => {
	if (window.visualViewport) {
		window.visualViewport.removeEventListener('resize', updateKeyboardOffset)
		window.visualViewport.removeEventListener('scroll', updateKeyboardOffset)
	}
	window.removeEventListener('resize', updateKeyboardOffset)
	if (messagePanelRef.value) {
		messagePanelRef.value.removeEventListener('scroll', handlePanelScroll)
	}
	if (stompClientRef.value) {
		if (subscriptionRef.value) {
			subscriptionRef.value.unsubscribe()
			subscriptionRef.value = null
		}
		stompClientRef.value.deactivate()
		stompClientRef.value = null
	}
	connectedRef.value = false
})

const goBack = () => {
	if (window.history.length > 1) {
		window.history.back()
	}
}
</script>

<style scoped>
.forum-chat-page {
	min-height: 100vh;
	background: var(--bg-main-gradient, linear-gradient(180deg, var(--bg-main, #fdf8f3) 0%, var(--bg-cell, #faf4ed) 100%));
	display: flex;
	justify-content: center;
	color: var(--main-text, #2f2623);
}

.phone-shell {
	width: 100%;
	height: 100vh;
	max-width: 768px;
	position: relative;
	overflow: hidden;
}

.phone-shell::before {
	content: '';
	position: absolute;
	inset: 0;
	z-index: 0;
	pointer-events: none;
	background:
		var(--bg-main-gradient, linear-gradient(90deg, var(--bg-cell, #fdf1e8) 0%, var(--bg-main, #fdf8f3) 48%, var(--bg-cell, #fdf1e8) 100%));
}

.chat-header {
	position: fixed;
	top: 0;
	left: 50%;
	width: min(100%, 768px);
	z-index: 30;
	height: calc(64px + env(safe-area-inset-top));
	padding: calc(10px + env(safe-area-inset-top)) 16px 10px;
	display: grid;
	grid-template-columns: 42px 1fr 42px;
	align-items: center;
	background: var(--bg-main, #fdf8f3);
	border-bottom: 1px solid var(--input-border, rgba(210, 190, 178, 0.7));
	backdrop-filter: blur(8px);
}

.icon-btn {
	width: 36px;
	height: 36px;
	border: 0;
	border-radius: 18px;
	display: grid;
	place-items: center;
	background: transparent;
	color: var(--main-text, #5a4b46);
	cursor: pointer;
}

.icon-btn svg {
	width: 22px;
	height: 22px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.header-spacer {
	width: 36px;
	height: 36px;
}

.title-block {
	text-align: center;
}

.title-block h1 {
	margin: 0;
	font-size: 22px;
	line-height: 1;
	letter-spacing: 0.02em;
	font-weight: 700;
	color: var(--main-text, #2f2623);
}

.chat-body {
	height: 70vh;
	position: relative;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
	overscroll-behavior-y: contain;
	background: transparent;
	z-index: 1;
	scroll-padding-top: 110px;
	scroll-padding-bottom: 180px;
}

.chat-footer {
	position: fixed;
	left: 50%;
	bottom: 0;
	width: min(100%, 768px);
	z-index: 31;
	padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
	background: var(--bg-main, #fdf8f3);
	border-top: 1px solid var(--input-border, rgba(210, 190, 178, 0.7));
	box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.06);
	backdrop-filter: blur(8px);
}

.input-wrap {
	height: 52px;
	border-radius: 14px;
	background: var(--input-bg, #fffcf8);
	/* border: 1px solid var(--input-border, rgba(226, 213, 202, 0.9)); */
	padding: 0 8px 0 10px;
	display: flex;
	align-items: center;
	gap: 8px;
}

.input-user {
	font-size: 13px;
	line-height: 1;
	padding: 6px 8px;
	border-radius: 999px;
	background: var(--bg-cell, rgba(255, 240, 232, 0.9));
	color: var(--main-text, #b86247);
	white-space: nowrap;
}

.message-input {
	flex: 1;
	height: 38px;
	border: 0;
	outline: none;
	background: transparent;
	font-size: 16px;
	color: var(--main-text, #2f2623);
}

.tool-btn {
	width: 34px;
	height: 34px;
	border: 0;
	border-radius: 17px;
	background: var(--bg-cell, rgba(255, 240, 232, 0.9));
	color: var(--button-active, #c8603e);
	display: grid;
	place-items: center;
	flex: 0 0 auto;
}

.tool-btn svg {
	width: 20px;
	height: 20px;
	fill: none;
	stroke: currentColor;
	stroke-width: 1.8;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.send-btn {
	height: 34px;
	border: 0;
	border-radius: 10px;
	padding: 0 12px;
	background: var(--button, #e58a6a);
	color: var(--button-text, #fff);
	font-size: 14px;
	font-weight: 600;
	flex: 0 0 auto;
}

.send-btn:disabled {
	background: var(--button-hover, rgba(226, 213, 202, 0.8));
	color: var(--button-text, #c4b0a8);
	opacity: 0.5;
}

.hidden-file {
	display: none;
}

.message-list {
	position: relative;
	z-index: 1;
	padding: 14px 12px;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.time-divider {
	display: flex;
	justify-content: center;
	margin: 4px 0;
}

.time-divider span {
	font-size: 11px;
	padding: 2px 8px;
	border-radius: 999px;
	background: var(--bg-cell, rgba(210, 190, 178, 0.3));
	color: var(--main-text, #a0897d);
	opacity: 0.75;
}

.message-item {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	max-width: min(82vw, 76%);
}

.message-item.grouped {
	margin-top: -3px;
}

.message-item.mine {
	margin-left: auto;
	align-items: flex-end;
}

.message-meta {
	display: flex;
	align-items: flex-end;
	gap: 6px;
	margin-bottom: 4px;
}

.message-meta.mine {
	flex-direction: row-reverse;
}

.sender-avatar {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: var(--bg-cell, rgba(226, 213, 202, 0.7));
	color: var(--main-text, #7a6257);
	display: grid;
	place-items: center;
	font-size: 11px;
	font-weight: 700;
	flex: 0 0 auto;
}

.message-meta.mine .sender-avatar {
	background: var(--button-hover, rgba(255, 218, 200, 0.8));
	color: var(--button-active, #c8603e);
}

.meta-text {
	display: flex;
	align-items: center;
	gap: 6px;
}

.message-meta.mine .meta-text {
	flex-direction: row-reverse;
}

.message-item.mine .message-meta {
	justify-content: flex-end;
}

.sender {
	font-size: 12px;
	color: var(--main-text, #a0897d);
	opacity: 0.7;
}

.message-time {
	font-size: 11px;
	color: var(--main-text, #b09e96);
	opacity: 0.55;
}

.bubble {
	padding: 9px 12px;
	border-radius: 14px;
	background: var(--input-bg, #fffcf8);
	border: 1px solid var(--input-border, rgba(226, 213, 202, 0.7));
	box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
	word-break: break-word;
	overflow-wrap: anywhere;
	white-space: pre-wrap;
	font-size: 15px;
	line-height: 1.5;
	color: var(--main-text, #2f2623);
}

.message-item.mine .bubble {
	background: var(--button, #e58a6a);
	border-color: transparent;
	color: var(--button-text, #fff);
}

.bubble.image {
	padding: 4px;
	background: var(--input-bg, #fffcf8);
	border: 1px solid var(--input-border, rgba(226, 213, 202, 0.7));
}

.message-item.mine .bubble.image {
	background: var(--input-bg, #fffcf8);
	border-color: var(--input-border, rgba(226, 213, 202, 0.7));
}

.image-message {
	display: block;
	max-width: min(56vw, 240px);
	max-height: 240px;
	border-radius: 10px;
	object-fit: cover;
}

.message-end-anchor {
	height: 1px;
	margin-top: 2px;
	scroll-margin-bottom: 220px;
}

.scroll-bottom-btn {
	position: fixed;
	left: 50%;
	z-index: 35;
	border: 0;
	border-radius: 999px;
	padding: 8px 14px;
	background: var(--button, #e58a6a);
	color: var(--button-text, #fff);
	font-size: 12px;
	line-height: 1;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.22);
}

.empty-tip {
	margin: 36px auto 0;
	padding: 10px 14px;
	border-radius: 12px;
	background: var(--input-bg, rgba(255, 252, 248, 0.8));
	color: var(--main-text, #a0897d);
	opacity: 0.8;
	font-size: 13px;
}

@media (max-width: 480px) {
	.message-item {
		max-width: 88%;
	}

	.bubble {
		font-size: 14px;
		line-height: 1.42;
	}

	.image-message {
		max-width: 62vw;
	}

	.scroll-bottom-btn {
		padding: 8px 12px;
		font-size: 12px;
	}
}

@media (min-width: 768px) {
	.phone-shell {
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
		border-left: 1px solid var(--input-border, rgba(210, 190, 178, 0.7));
		border-right: 1px solid var(--input-border, rgba(210, 190, 178, 0.7));
	}
}
</style>
