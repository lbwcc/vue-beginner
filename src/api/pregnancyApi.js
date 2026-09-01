import http from '@/utils/http'

export const fetchPregnancyData = () => {
  return http.get('/lb-api/api/pregnancy/data')
}

export const savePregnancyData = (payload) => {
  return http.post('/lb-api/api/pregnancy/data', payload)
}
