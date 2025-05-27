// vite.config.mjs

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { setupBuild  } from './build/index'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: setupBuild(),
  server: {
    proxy: {
      '/findBooks': {
        target: 'https://openlibrary.org',
        rewrite: (path) => path.replace(/^\/findBooks/, '/api/books'),
        changeOrigin: true,
      }
    }
  },
  base: '/vue-beginner/',
})



