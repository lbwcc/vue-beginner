import http from '@/utils/http'

export const saveGameRecordApi = (payload) => {
  return http.post('/lb-api/api/game-records', payload)
}

export const listGameLeaderboardApi = (gameKey, limit = 10) => {
  return http.get(`/lb-api/api/game-records/leaderboard/${encodeURIComponent(gameKey)}`, {
    params: { limit }
  })
}

export const listUserGameRecordsApi = (gameKey, limit = 100) => {
  return http.get(`/lb-api/api/game-records/user/${encodeURIComponent(gameKey)}`, {
    params: { limit }
  })
}
