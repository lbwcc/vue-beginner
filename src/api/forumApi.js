import http from '@/utils/http'

export const listForumPostsApi = (params = {}) => {
  return http.get('/lb-api/api/forum/posts', { params })
}

export const listMyForumPostsApi = () => {
  return http.get('/lb-api/api/forum/my-posts')
}

export const createForumPostApi = (payload) => {
  return http.post('/lb-api/api/forum/posts', payload)
}

export const updateForumPostApi = (id, payload) => {
  return http.put(`/lb-api/api/forum/posts/${id}`, payload)
}

export const deleteForumPostApi = (id) => {
  return http.delete(`/lb-api/api/forum/posts/${id}`)
}

export const likeForumPostApi = (id) => {
  return http.post(`/lb-api/api/forum/posts/${id}/like`)
}

export const getForumPostDetailApi = (id) => {
  return http.get(`/lb-api/api/forum/posts/${id}`)
}

export const listForumCommentsApi = (postId, params = {}) => {
  return http.get(`/lb-api/api/forum/posts/${postId}/comments`, { params })
}

export const addForumCommentApi = (postId, payload) => {
  return http.post(`/lb-api/api/forum/posts/${postId}/comments`, payload)
}

export const deleteForumCommentApi = (postId, commentId) => {
  return http.delete(`/lb-api/api/forum/posts/${postId}/comments/${commentId}`)
}

export const listForumBotPersonasApi = () => {
  return http.get('/lb-api/api/forum/bot/personas')
}

export const createForumBotPersonaApi = (payload) => {
  return http.post('/lb-api/api/forum/bot/personas', payload)
}

export const updateForumBotPersonaApi = (id, payload) => {
  return http.put(`/lb-api/api/forum/bot/personas/${id}`, payload)
}

export const deleteForumBotPersonaApi = (id) => {
  return http.delete(`/lb-api/api/forum/bot/personas/${id}`)
}

export const listForumBotPlansApi = (personaId) => {
  return http.get('/lb-api/api/forum/bot/plans', { params: { personaId } })
}

export const createForumBotPlanApi = (payload) => {
  return http.post('/lb-api/api/forum/bot/plans', payload)
}

export const updateForumBotPlanApi = (id, payload) => {
  return http.put(`/lb-api/api/forum/bot/plans/${id}`, payload)
}

export const deleteForumBotPlanApi = (id) => {
  return http.delete(`/lb-api/api/forum/bot/plans/${id}`)
}

export const listForumBotTasksApi = (personaId, limit = 20) => {
  return http.get('/lb-api/api/forum/bot/tasks', { params: { personaId, limit } })
}

export const runForumBotDailyNowApi = () => {
  return http.post('/lb-api/api/forum/bot/run-daily')
}

export const runForumBotTrainingNowApi = () => {
  return http.post('/lb-api/api/forum/bot/run-training')
}

export const getForumBotConfigApi = (provider) => {
  return http.get('/lb-api/api/forum/bot/config', {
    params: provider ? { provider } : {},
  })
}

export const updateForumBotConfigApi = (payload) => {
  return http.put('/lb-api/api/forum/bot/config', payload)
}

export const getForumBotConfigPlatformsApi = () => {
  return http.get('/lb-api/api/forum/bot/config-platforms')
}

// 预设模型 CURD API
export const listPresetModels = () => {
  return http.get('/lb-api/api/forum-bot/preset-models')
}

export const getPresetModel = (id) => {
  return http.get(`/lb-api/api/forum-bot/preset-models/${id}`)
}

export const createPresetModel = (payload) => {
  return http.post('/lb-api/api/forum-bot/preset-models', payload)
}

export const updatePresetModel = (id, payload) => {
  return http.put(`/lb-api/api/forum-bot/preset-models/${id}`, payload)
}

export const deletePresetModel = (id) => {
  return http.delete(`/lb-api/api/forum-bot/preset-models/${id}`)
}

export const getForumBotPresetModelsApi = () => {
  return http.get('/lb-api/api/forum/bot/preset-models')
}

export const getForumBotPresetModelsByProviderApi = (provider) => {
  return http.get(`/lb-api/api/forum/bot/preset-models/provider/${provider}`)
}
