// vite.config.mjs

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { setupBuild  } from './build/index'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const basePath = env.VITE_BASE_PATH || '/vue-beginner/'
  const backendProxyTarget = env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:8088'
  const chatProxyTarget = env.VITE_CHAT_SERVER_URL || 'http://localhost:3001'

  return {
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
        '/lb-api': {
          target: backendProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/lb-api/, '')
        },
        '/findBooks': {
          target: 'https://openlibrary.org',
          rewrite: (path) => path.replace(/^\/findBooks/, '/api/books'),
          changeOrigin: true,
        },
        '/socket.io': {
          target: chatProxyTarget,
          changeOrigin: true,
          ws: true
        },
        '/api': {
          target: chatProxyTarget,
          changeOrigin: true
        }
      }
    },
    base: basePath,
  }
})



