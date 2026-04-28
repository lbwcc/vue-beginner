import http from '@/utils/http'

export const uploadFileApi = (file, options = {}) => {
  const normalizedOptions = typeof options === 'function' ? { onProgress: options } : (options || {})
  const onProgress = typeof normalizedOptions.onProgress === 'function' ? normalizedOptions.onProgress : null
  const timeout = Number(normalizedOptions.timeout) > 0 ? Number(normalizedOptions.timeout) : 180000

  const formData = new FormData()
  formData.append('file', file)

  return http.post('/lb-api/api/files/upload', formData, {  
    timeout,
    onUploadProgress: (event) => {
      if (!onProgress) {
        return
      }
      const loaded = Number(event?.loaded || 0)
      const fallbackTotal = Number(file?.size || 0)
      const total = Number(event?.total || fallbackTotal)
      const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
      onProgress({ loaded, total, percent })
    }
  })
}
