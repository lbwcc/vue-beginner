import http from '@/utils/http'

export const uploadFileApi = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return http.post('/lb-api/api/files/upload', formData)
}
