import { getCurrentAccount } from './auth'
import { listGameLeaderboardApi, listUserGameRecordsApi, saveGameRecordApi } from '@/api/gameRecordApi'

const buildKey = (gameKey, username) => `${gameKey}-records-${username}`
const buildLeaderboardKey = (gameKey) => `${gameKey}-leaderboard`

const safeParseArray = (raw) => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

const readLocalLeaderboard = (gameKey, limit = 10) => {
  const raw = localStorage.getItem(buildLeaderboardKey(gameKey))
  return safeParseArray(raw).slice(0, limit)
}

const writeLocalLeaderboard = (gameKey, records) => {
  localStorage.setItem(buildLeaderboardKey(gameKey), JSON.stringify(Array.isArray(records) ? records : []))
}

const readLocalUserRecords = (gameKey) => {
  const account = getCurrentAccount()
  if (!account?.username) return []
  const raw = localStorage.getItem(buildKey(gameKey, account.username))
  return safeParseArray(raw)
}

const writeLocalUserRecords = (gameKey, records) => {
  const account = getCurrentAccount()
  if (!account?.username) return
  localStorage.setItem(buildKey(gameKey, account.username), JSON.stringify(Array.isArray(records) ? records : []))
}

const normalizeRecord = (record) => {
  return {
    id: record?.id,
    ownerId: record?.ownerId,
    ownerUsername: record?.ownerUsername || '',
    gameKey: record?.gameKey || '',
    score: Number(record?.score) || 0,
    payloadJson: record?.payloadJson || '',
    createdAt: record?.createdAt || new Date().toISOString(),
  }
}

export const getUserGameRecords = async (gameKey, limit = 100) => {
  const account = getCurrentAccount()
  if (!account?.username) return []

  try {
    const res = await listUserGameRecordsApi(gameKey, limit)
    if (res?.data?.code === 200 && Array.isArray(res?.data?.data)) {
      const records = res.data.data.map(normalizeRecord)
      writeLocalUserRecords(gameKey, records)
      return records
    }
  } catch (error) {
    // fallback to local cache
  }
  return readLocalUserRecords(gameKey).slice(0, limit)
}

export const appendUserGameRecord = async (gameKey, record, limit = 100) => {
  const account = getCurrentAccount()
  if (!account?.username) return []

  const score = Number(record?.score) || 0
  const payloadJson = JSON.stringify(record || {})

  try {
    await saveGameRecordApi({ gameKey, score, payloadJson })
  } catch (error) {
    const current = readLocalUserRecords(gameKey)
    const next = [
      {
        ...record,
        ownerId: account.id,
        ownerUsername: account.username,
        gameKey,
        score,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ].slice(0, limit)
    writeLocalUserRecords(gameKey, next)
    return next
  }

  return getUserGameRecords(gameKey, limit)
}

export const getGameLeaderboard = async (gameKey, limit = 10) => {
  try {
    const res = await listGameLeaderboardApi(gameKey, limit)
    if (res?.data?.code === 200 && Array.isArray(res?.data?.data)) {
      const records = res.data.data.map(normalizeRecord)
      writeLocalLeaderboard(gameKey, records)
      return records
    }
  } catch (error) {
    // fallback to local cache
  }

  return readLocalLeaderboard(gameKey, limit)
}

export const appendGameScoreRecord = async (gameKey, score, extra = {}, limit = 50) => {
  const account = getCurrentAccount()
  if (!account?.username) {
    return {
      record: null,
      leaderboard: readLocalLeaderboard(gameKey, limit),
      isTopRecord: false,
    }
  }

  const normalizedScore = Number(score) || 0
  const payload = {
    ...extra,
    score: normalizedScore,
    gameKey,
  }

  let createdAt = new Date().toISOString()
  try {
    const saveRes = await saveGameRecordApi({
      gameKey,
      score: normalizedScore,
      payloadJson: JSON.stringify(payload),
    })
    if (saveRes?.data?.code === 200 && saveRes?.data?.data?.createdAt) {
      createdAt = saveRes.data.data.createdAt
    }
  } catch (error) {
    const fallbackRecord = {
      ownerId: account.id,
      ownerUsername: account.username,
      gameKey,
      score: normalizedScore,
      payloadJson: JSON.stringify(payload),
      createdAt,
    }
    const localLeaderboard = [fallbackRecord, ...readLocalLeaderboard(gameKey, limit)]
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .slice(0, limit)
    writeLocalLeaderboard(gameKey, localLeaderboard)
    return {
      record: fallbackRecord,
      leaderboard: localLeaderboard,
      isTopRecord: localLeaderboard.length > 0 && localLeaderboard[0].createdAt === createdAt,
    }
  }

  const leaderboard = await getGameLeaderboard(gameKey, limit)
  const top = leaderboard[0]
  return {
    record: {
      ownerId: account.id,
      ownerUsername: account.username,
      gameKey,
      score: normalizedScore,
      payloadJson: JSON.stringify(payload),
      createdAt,
    },
    leaderboard,
    isTopRecord: !!top && Number(top.score) === normalizedScore && top.ownerId === account.id,
  }
}
