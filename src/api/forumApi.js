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
