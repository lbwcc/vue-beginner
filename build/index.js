// 打包配置

const INVALID_CHAR_REGEX = /[\u0000-\u001F"#$&*+,:;<=>?[\]^`{|}\u007F]/g
const DRIVE_LETTER_REGEX = /^[a-z]:/i

export function setupBuild() {
  return {
    outDir: 'docs',
    emptyOutDir: false, // 防止清空 docs 目录下 favicon.ico 等静态文件
    sourcemap: false,
    // 消除打包大小超过500kb警告
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // 移除 input 配置，交由 Vite 默认处理入口 index.html
      output: {
        chunkFileNames: 'static/js/[name]-[hash].js',
        entryFileNames: 'static/js/[name]-[hash].js',
        assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
        // TODO: 处理GitHub Pages 部署 _plugin-vue_export-helper.js 404
        // https://github.com/rollup/rollup/blob/master/src/utils/sanitizeFileName.ts
        sanitizeFileName(name) {
          const match = DRIVE_LETTER_REGEX.exec(name)
          const driveLetter = match ? match[0] : ''
          // A `:` is only allowed as part of a windows drive letter (ex: C:\foo)
          // Otherwise, avoid them because they can refer to NTFS alternate data streams.
          return driveLetter + name.slice(driveLetter.length).replace(INVALID_CHAR_REGEX, '')
        },
        // manualChunks(id) {
        //   if (id.includes('node_modules')) {
        //     return id.toString().match(/\/node_modules\/(?!.pnpm)(?<moduleName>[^\/]*)\//)?.groups!.moduleName ?? 'vender'
        //   }
        // }
        manualChunks(id) {
          const normalized = String(id || '').replace(/\\/g, '/')

          if (normalized.includes('/src/views/Forum')) {
            return 'forum-pages'
          }
          if (normalized.includes('/src/views/Gomoku') || normalized.includes('/src/views/Game2048') || normalized.includes('/src/views/Tetris') || normalized.includes('/src/views/Snake')) {
            return 'game-pages'
          }
          if (normalized.includes('/src/views/EchartsDemo') || normalized.includes('/src/views/FireworksDemo') || normalized.includes('/src/views/WeatherDetail')) {
            return 'tool-heavy-pages'
          }

          if (normalized.includes('/node_modules/echarts/')) {
            return 'vendor-echarts'
          }
          if (normalized.includes('/node_modules/three/')) {
            return 'vendor-three'
          }
          if (normalized.includes('/node_modules/element-plus/')) {
            return 'vendor-element-plus'
          }
          if (normalized.includes('/node_modules/@stomp/')) {
            return 'vendor-realtime'
          }
          if (normalized.includes('/node_modules/sockjs-client/')) {
            return 'vendor-realtime'
          }

          if (normalized.includes('/node_modules/')) {
            return normalized.split('/node_modules/')[1].split('/')[0].toString()
          }
        }
      }
    }
  }
}


