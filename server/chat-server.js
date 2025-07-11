const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')

const app = express()
const server = http.createServer(app)

// 配置 CORS 以允许来自 Vue 开发服务器和生产环境的连接
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://localhost:3000", 
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "https://lbwcc.github.io",  // GitHub Pages 域名
      "https://*.vercel.app"      // Vercel 域名
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
})

// 存储在线用户和房间信息
const users = new Map()
const rooms = new Map()
const messageHistory = []

// 中间件
app.use(express.static(path.join(__dirname, '../dist')))
app.use(express.json())

// API 路由
app.get('/', (req, res) => {
  const stats = {
    onlineUsers: users.size,
    totalRooms: rooms.size,
    totalMessages: messageHistory.length,
    serverStartTime: process.uptime(),
    currentTime: new Date().toLocaleString('zh-CN')
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>聊天服务器状态</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .stats { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .stat-item { margin: 10px 0; }
        .users { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .user-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        .user-tag { background: #2196f3; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>🚀 聊天服务器运行中</h1>
      
      <div class="stats">
        <h3>📊 服务器统计</h3>
        <div class="stat-item"><strong>在线用户:</strong> ${stats.onlineUsers}</div>
        <div class="stat-item"><strong>活跃房间:</strong> ${stats.totalRooms}</div>
        <div class="stat-item"><strong>历史消息:</strong> ${stats.totalMessages}</div>
        <div class="stat-item"><strong>运行时间:</strong> ${Math.floor(stats.serverStartTime / 60)} 分钟</div>
        <div class="stat-item"><strong>当前时间:</strong> ${stats.currentTime}</div>
      </div>

      ${users.size > 0 ? `
      <div class="users">
        <h3>👥 在线用户 (${users.size})</h3>
        <div class="user-list">
          ${Array.from(users.values()).map(user => 
            `<span class="user-tag">${user.username}</span>`
          ).join('')}
        </div>
      </div>
      ` : '<div class="users"><h3>👥 暂无在线用户</h3></div>'}

      <div>
        <h3>🔗 连接信息</h3>
        <p>WebSocket 地址: <code>ws://localhost:${process.env.PORT || 3001}</code></p>
        <p>确保你的 Vue 应用连接到此地址</p>
      </div>

      <div>
        <h3>📖 使用说明</h3>
        <ol>
          <li>启动你的 Vue 开发服务器</li>
          <li>访问聊天室页面</li>
          <li>在聊天室中切换到"真实连接"模式</li>
          <li>开始聊天！</li>
        </ol>
      </div>
    </body>
    </html>
  `)
})

// 获取用户列表 API
app.get('/api/users', (req, res) => {
  res.json({
    users: Array.from(users.values()),
    count: users.size
  })
})

// 获取消息历史 API
app.get('/api/messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  const messages = messageHistory.slice(-limit)
  res.json({
    messages,
    total: messageHistory.length
  })
})

// WebSocket 连接处理
io.on('connection', (socket) => {
  console.log(`\x1b[32m[连接]\x1b[0m 用户连接: ${socket.id}`)

  // 发送历史消息（最近20条）
  const recentMessages = messageHistory.slice(-20)
  if (recentMessages.length > 0) {
    socket.emit('message:history', recentMessages)
  }

  // 用户加入
  socket.on('user:join', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username,
      joinTime: new Date(),
      lastActivity: new Date()
    }
    
    users.set(socket.id, user)
    
    // 通知所有用户有新用户加入
    socket.broadcast.emit('user:joined', {
      username: userData.username,
      message: `${userData.username} 加入了聊天室`,
      timestamp: new Date()
    })
    
    // 发送当前在线用户列表
    const userList = Array.from(users.values())
    io.emit('users:online', userList)
    
    console.log(`\x1b[36m[加入]\x1b[0m ${userData.username} 加入聊天室 (总计: ${users.size} 人)`)
  })

  // 接收消息
  socket.on('message:send', (messageData) => {
    const user = users.get(socket.id)
    if (user) {
      const message = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        username: user.username,
        content: messageData.content,
        timestamp: new Date(),
        userId: socket.id
      }
      
      // 保存到历史消息
      messageHistory.push(message)
      
      // 限制历史消息数量（保留最近1000条）
      if (messageHistory.length > 1000) {
        messageHistory.splice(0, messageHistory.length - 1000)
      }
      
      // 更新用户活动时间
      user.lastActivity = new Date()
      
      // 广播消息给所有用户
      io.emit('message:received', message)
      
      console.log(`\x1b[33m[消息]\x1b[0m ${user.username}: ${messageData.content}`)
    }
  })

  // 用户正在输入
  socket.on('typing:start', () => {
    const user = users.get(socket.id)
    if (user) {
      socket.broadcast.emit('typing:user', {
        username: user.username,
        isTyping: true
      })
    }
  })

  // 用户停止输入
  socket.on('typing:stop', () => {
    const user = users.get(socket.id)
    if (user) {
      socket.broadcast.emit('typing:user', {
        username: user.username,
        isTyping: false
      })
    }
  })

  // 加入房间
  socket.on('room:join', (roomData) => {
    const user = users.get(socket.id)
    if (user) {
      socket.join(roomData.roomName)
      
      if (!rooms.has(roomData.roomName)) {
        rooms.set(roomData.roomName, {
          name: roomData.roomName,
          users: new Set(),
          createdAt: new Date()
        })
      }
      
      const room = rooms.get(roomData.roomName)
      room.users.add(socket.id)
      
      socket.to(roomData.roomName).emit('user:joined', {
        username: user.username,
        message: `${user.username} 加入了房间 ${roomData.roomName}`,
        room: roomData.roomName
      })
      
      console.log(`\x1b[35m[房间]\x1b[0m ${user.username} 加入房间: ${roomData.roomName}`)
    }
  })

  // 离开房间
  socket.on('room:leave', (roomData) => {
    const user = users.get(socket.id)
    if (user) {
      socket.leave(roomData.roomName)
      
      const room = rooms.get(roomData.roomName)
      if (room) {
        room.users.delete(socket.id)
        
        if (room.users.size === 0) {
          rooms.delete(roomData.roomName)
        }
      }
      
      socket.to(roomData.roomName).emit('user:left', {
        username: user.username,
        message: `${user.username} 离开了房间 ${roomData.roomName}`,
        room: roomData.roomName
      })
      
      console.log(`\x1b[35m[房间]\x1b[0m ${user.username} 离开房间: ${roomData.roomName}`)
    }
  })

  // 用户断开连接
  socket.on('disconnect', (reason) => {
    const user = users.get(socket.id)
    if (user) {
      users.delete(socket.id)
      
      // 从所有房间中移除用户
      for (const [roomName, room] of rooms.entries()) {
        if (room.users.has(socket.id)) {
          room.users.delete(socket.id)
          if (room.users.size === 0) {
            rooms.delete(roomName)
          }
        }
      }
      
      // 通知其他用户有用户离开
      socket.broadcast.emit('user:left', {
        username: user.username,
        message: `${user.username} 离开了聊天室`,
        timestamp: new Date()
      })
      
      // 更新在线用户列表
      const userList = Array.from(users.values())
      socket.broadcast.emit('users:online', userList)
      
      console.log(`\x1b[31m[离开]\x1b[0m ${user.username} 离开聊天室 (原因: ${reason}) (剩余: ${users.size} 人)`)
    }
  })

  // 处理错误
  socket.on('error', (error) => {
    console.error(`\x1b[31m[错误]\x1b[0m Socket错误 ${socket.id}:`, error)
  })
})

// 定期清理不活跃用户
setInterval(() => {
  const now = new Date()
  const inactiveThreshold = 30 * 60 * 1000 // 30分钟

  for (const [socketId, user] of users.entries()) {
    if (now - user.lastActivity > inactiveThreshold) {
      console.log(`\x1b[33m[清理]\x1b[0m 清理不活跃用户: ${user.username}`)
      users.delete(socketId)
      
      // 通知其他用户
      io.emit('user:left', {
        username: user.username,
        message: `${user.username} 因长时间不活跃而离开`,
        timestamp: new Date()
      })
    }
  }
}, 5 * 60 * 1000) // 每5分钟检查一次

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', '='.repeat(50))
  console.log('\x1b[32m%s\x1b[0m', `🚀 聊天服务器启动成功！`)
  console.log('\x1b[36m%s\x1b[0m', `📍 服务器地址: http://localhost:${PORT}`)
  console.log('\x1b[36m%s\x1b[0m', `🔗 WebSocket: ws://localhost:${PORT}`)
  console.log('\x1b[33m%s\x1b[0m', `💡 确保你的 Vue 应用连接到此地址`)
  console.log('\x1b[36m%s\x1b[0m', '='.repeat(50))
})

// 优雅关闭
const gracefulShutdown = (signal) => {
  console.log(`\n\x1b[33m[关闭]\x1b[0m 收到 ${signal} 信号，正在关闭服务器...`)
  
  // 通知所有用户服务器即将关闭
  io.emit('server:shutdown', {
    message: '服务器即将关闭，请稍后重新连接',
    timestamp: new Date()
  })
  
  setTimeout(() => {
    server.close((err) => {
      if (err) {
        console.error('\x1b[31m[错误]\x1b[0m 关闭服务器时出错:', err)
        process.exit(1)
      }
      console.log('\x1b[32m[成功]\x1b[0m 服务器已安全关闭')
      process.exit(0)
    })
  }, 1000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('\x1b[31m[严重错误]\x1b[0m 未捕获的异常:', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('\x1b[31m[严重错误]\x1b[0m 未处理的Promise拒绝:', reason)
  gracefulShutdown('UNHANDLED_REJECTION')
})
