// vite.config.mjs

import fs from 'node:fs/promises'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { setupBuild  } from './build/index'

const LIVE2D_MODELS_DIR = path.resolve(__dirname, './public/live2d/models')
const LIVE2D_MANIFEST_FILE = path.resolve(LIVE2D_MODELS_DIR, 'manifest.json')
const SOCKJS_UNLOAD_EVENT_RE = /if\s*\(!isChromePackagedApp\)\s*\{\s*module\.exports\.attachEvent\('unload',\s*unloadTriggered\);\s*\}/
const VUE_ROUTER_UNLOAD_EVENT_RE = /beforeunload/g

function formatModelLabel(value, fallback = '未命名模型') {
  const text = String(value || '').trim()
  if (!text) {
    return fallback
  }

  return text
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function walkFiles(directory) {
  let entries = []

  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }

  const files = []

  for (const entry of entries) {
    const nextPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...await walkFiles(nextPath))
      continue
    }

    files.push(nextPath)
  }

  return files
}

async function generateLive2DModelManifest() {
  await fs.mkdir(LIVE2D_MODELS_DIR, { recursive: true })

  const publicRoot = path.resolve(__dirname, './public')
  const modelFiles = (await walkFiles(LIVE2D_MODELS_DIR)).filter(file => file.endsWith('.model.json'))
  const models = []

  for (const filePath of modelFiles) {
    try {
      const raw = await fs.readFile(filePath, 'utf8')
      const json = JSON.parse(raw)
      const relativeModelPath = path.relative(publicRoot, filePath).replace(/\\/g, '/')
      const folderName = path.basename(path.dirname(filePath))
      const motionGroups = json?.motions && typeof json.motions === 'object'
        ? Object.keys(json.motions)
        : []
      const motionCounts = motionGroups.reduce((result, group) => {
        result[group] = Array.isArray(json?.motions?.[group]) ? json.motions[group].length : 0
        return result
      }, {})
      const idleMotionGroup = motionGroups.includes('idle')
        ? 'idle'
        : (motionGroups[0] ?? '')

      models.push({
        id: relativeModelPath.replace(/\//g, '__').replace(/\.model\.json$/i, ''),
        displayName: formatModelLabel(json?.name, formatModelLabel(folderName)),
        modelPath: relativeModelPath,
        idleMotionGroup,
        motionGroups,
        motionCounts,
        hitAreas: Array.isArray(json?.hit_areas)
          ? json.hit_areas.map(area => String(area?.name || '').trim()).filter(Boolean)
          : [],
      })
    } catch (error) {
      console.warn(`[live2d-model-manifest] 跳过无效模型文件: ${filePath}`, error)
    }
  }

  models.sort((left, right) => left.displayName.localeCompare(right.displayName, 'zh-CN'))

  const nextContent = `${JSON.stringify({ generatedAt: new Date().toISOString(), models }, null, 2)}\n`
  let previousContent = ''

  try {
    previousContent = await fs.readFile(LIVE2D_MANIFEST_FILE, 'utf8')
  } catch {
    previousContent = ''
  }

  if (previousContent !== nextContent) {
    await fs.writeFile(LIVE2D_MANIFEST_FILE, nextContent, 'utf8')
  }
}

function createLive2DModelManifestPlugin() {
  let running = Promise.resolve()

  const queueGeneration = () => {
    running = running
      .then(() => generateLive2DModelManifest())
      .catch((error) => {
        console.warn('[live2d-model-manifest] 生成模型清单失败', error)
      })

    return running
  }

  const shouldRegenerate = (filePath) => {
    const normalized = String(filePath || '').replace(/\\/g, '/')
    return normalized.includes('/public/live2d/models/') && !normalized.endsWith('/public/live2d/models/manifest.json')
  }

  return {
    name: 'live2d-model-manifest',
    buildStart() {
      return queueGeneration()
    },
    configureServer(server) {
      queueGeneration()
      server.watcher.add(LIVE2D_MODELS_DIR)

      const rerun = (filePath) => {
        if (shouldRegenerate(filePath)) {
          queueGeneration()
        }
      }

      server.watcher.on('add', rerun)
      server.watcher.on('change', rerun)
      server.watcher.on('unlink', rerun)
    },
  }
}

function createSockJsUnloadPatchPlugin() {
  return {
    name: 'patch-sockjs-unload',
    enforce: 'pre',
    transform(code, id) {
      const normalized = String(id || '').replace(/\\/g, '/')

      if (!normalized.includes('/node_modules/sockjs-client/dist/sockjs')) {
        return null
      }

      const nextCode = code.replace(SOCKJS_UNLOAD_EVENT_RE, 'if (!isChromePackagedApp) {}')

      if (nextCode === code) {
        return null
      }

      return {
        code: nextCode,
        map: null,
      }
    },
  }
}

function createVueRouterUnloadPatchPlugin() {
  return {
    name: 'patch-vue-router-unload',
    enforce: 'pre',
    transform(code, id) {
      const normalized = String(id || '').replace(/\\/g, '/')

      if (!normalized.includes('/node_modules/vue-router/dist/')) {
        return null
      }

      const nextCode = code.replace(VUE_ROUTER_UNLOAD_EVENT_RE, 'pagehide')

      if (nextCode === code) {
        return null
      }

      return {
        code: nextCode,
        map: null,
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const basePath = env.VITE_BASE_PATH || '/vue-beginner/'
  const backendProxyTarget = env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:8088'
  const chatProxyTarget = env.VITE_CHAT_SERVER_URL || 'http://localhost:3001'

  return {
    plugins: [vue(), createLive2DModelManifestPlugin(), createSockJsUnloadPatchPlugin(), createVueRouterUnloadPatchPlugin()],
    optimizeDeps: {
      exclude: ['sockjs-client', 'vue-router'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: setupBuild(),
    server: {
      hmr: {
        overlay: true
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



