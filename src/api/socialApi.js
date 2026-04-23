import http from '@/utils/http'

export const listFriendsApi = () => {
  return http.get('/lb-api/api/social/friends')
}

export const addFriendApi = (friendUserId) => {
  return http.post(`/lb-api/api/social/friends/${friendUserId}`)
}

export const removeFriendApi = (friendUserId) => {
  return http.delete(`/lb-api/api/social/friends/${friendUserId}`)
}

export const listSessionsApi = () => {
  return http.get('/lb-api/api/social/sessions')
}

export const createPrivateSessionApi = (friendUserId) => {
  return http.post('/lb-api/api/social/sessions/private', { friendUserId })
}

export const createGroupSessionApi = (payload) => {
  return http.post('/lb-api/api/social/sessions/group', payload)
}

export const inviteFriendToGroupApi = (sessionId, friendUserId) => {
  return http.post(`/lb-api/api/social/sessions/${sessionId}/invite`, { friendUserId })
}

export const leaveGroupApi = (sessionId) => {
  return http.delete(`/lb-api/api/social/sessions/${sessionId}/leave`)
}

export const dissolveGroupApi = (sessionId) => {
  return http.delete(`/lb-api/api/social/sessions/${sessionId}`)
}

export const listSessionMessagesApi = (sessionId, options = 30) => {
  const params = {}
  if (typeof options === 'number') {
    params.limit = options
  } else if (options && typeof options === 'object') {
    if (options.limit != null) {
      params.limit = options.limit
    }
    if (options.beforeId != null) {
      params.beforeId = options.beforeId
    }
  }
  return http.get(`/lb-api/api/social/sessions/${sessionId}/messages`, { params })
}

export const sendSessionMessageApi = (sessionId, payload) => {
  const body = typeof payload === 'object' && payload !== null
    ? payload
    : { content: payload }
  return http.post(`/lb-api/api/social/sessions/${sessionId}/messages`, body)
}
