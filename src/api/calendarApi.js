import http from '@/utils/http'

export const listCalendarNotesApi = () => {
  return http.get('/lb-api/api/calendar/notes')
}

export const saveCalendarNoteApi = (payload) => {
  return http.post('/lb-api/api/calendar/notes', payload)
}

export const deleteCalendarNoteApi = (date) => {
  return http.delete(`/lb-api/api/calendar/notes/${encodeURIComponent(date)}`)
}
