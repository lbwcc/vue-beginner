#!/usr/bin/env node

/**
 * 聊天服务器启动脚本
 * 用于启动 WebSocket 聊天服务器
 */

const path = require('path')
const { spawn } = require('child_process')

// 检查 Node.js 版本
const nodeVersion = process.version
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])

if (majorVersion < 14) {
  console.error('❌ 需要 Node.js 14 或更高版本')
  console.error(`当前版本: ${nodeVersion}`)
  process.exit(1)
}

console.log('🔍 检查依赖...')

// 检查是否安装了必要的依赖
try {
  require('socket.io')
  require('express')
  console.log('✅ 依赖检查通过')
} catch (error) {
  console.error('❌ 缺少必要依赖，请运行: npm install')
  console.error('需要的包: express, socket.io')
  process.exit(1)
}

// 启动服务器
console.log('🚀 启动聊天服务器...')

const serverPath = path.join(__dirname, 'chat-server.js')
const serverProcess = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
})

serverProcess.on('error', (error) => {
  console.error('❌ 启动服务器失败:', error.message)
  process.exit(1)
})

serverProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`❌ 服务器异常退出，代码: ${code}`)
  } else {
    console.log('✅ 服务器已正常关闭')
  }
})

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n🛑 收到中断信号，正在关闭服务器...')
  serverProcess.kill('SIGINT')
})

process.on('SIGTERM', () => {
  console.log('\n🛑 收到终止信号，正在关闭服务器...')
  serverProcess.kill('SIGTERM')
})
