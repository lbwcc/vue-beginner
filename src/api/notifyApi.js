import http from '@/utils/http'

export const listNotifyMessagesApi = () => {
  return http.get('/lb-api/api/notify/messages')
}

export const getNotifyUnreadCountApi = () => {
  return http.get('/lb-api/api/notify/unread-count')
}

export const markAllNotifyReadApi = () => {
  return http.post('/lb-api/api/notify/read-all')
}

export const markNotifyReadApi = (id) => {
  return http.post(`/lb-api/api/notify/messages/${id}/read`)
}

export const markChatSessionNotifyReadApi = (sessionId) => {
  return http.post(`/lb-api/api/notify/read-chat-session/${sessionId}`)
}

export const listBattleRecordsApi = () => {
  return http.get('/lb-api/api/notify/battle-records')
}
