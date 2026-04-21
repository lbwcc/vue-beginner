// vite.config.mjs

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { setupBuild  } from './build/index'

const basePath = process.env.VITE_BASE_PATH || '/vue-beginner/'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: setupBuild(),
  server: {
    hmr: {
      overlay: true,
      port: 24678
    },
    host: true,
    open: true,
    proxy: {
      '/findBooks': {
        target: 'https://openlibrary.org',
        rewrite: (path) => path.replace(/^\/findBooks/, '/api/books'),
        changeOrigin: true,
      },
      // Socket.IO 代理配置 - 用于开发环境连接本地服务
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true
      },
      // API 代理 - 如果有其他 API 调用
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  base: basePath,
})



