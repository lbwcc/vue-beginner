import http from '@/utils/http'

export const getGameSettingApi = (gameKey) => {
  return http.get(`/lb-api/api/game-records/settings/${encodeURIComponent(gameKey)}`)
}

export const saveGameSettingApi = (gameKey, configJson) => {
  return http.post(`/lb-api/api/game-records/settings/${encodeURIComponent(gameKey)}`, {
    configJson,
  })
}
