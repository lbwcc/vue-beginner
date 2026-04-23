import http from '@/utils/http'

export const listUsersApi = () => {
  return http.get('/lb-api/api/users/list')
}

export const createUserApi = (payload) => {
  return http.post('/lb-api/api/users', payload)
}

export const updateUserApi = (id, payload) => {
  return http.put(`/lb-api/api/users/${id}`, payload)
}

export const deleteUserApi = (id) => {
  return http.delete(`/lb-api/api/users/${id}`)
}

export const getUserProfileApi = (id) => {
  return http.get(`/lb-api/api/users/${id}/profile`)
}

export const listUserFollowingApi = (id) => {
  return http.get(`/lb-api/api/users/${id}/following`)
}

export const listUserFollowersApi = (id) => {
  return http.get(`/lb-api/api/users/${id}/followers`)
}

export const listUserPostsApi = (id, params = {}) => {
  return http.get(`/lb-api/api/users/${id}/posts`, { params })
}

export const followUserApi = (id) => {
  return http.post(`/lb-api/api/users/${id}/follow`)
}

export const unfollowUserApi = (id) => {
  return http.delete(`/lb-api/api/users/${id}/follow`)
}
