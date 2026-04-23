import http from '@/utils/http'

export const loginApi = (payload) => {
  return http.post('/lb-api/api/auth/login', payload)
}

export const registerApi = (payload) => {
  return http.post('/lb-api/api/auth/register', payload)
}

export const fetchCurrentUserApi = () => {
  return http.get('/lb-api/api/users/me')
}

export const updateUserApi = (id, payload) => {
  return http.put(`/lb-api/api/users/${id}`, payload)
}
