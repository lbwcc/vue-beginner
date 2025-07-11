const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

const app = express()
const httpServer = createServer(app)

// 配置 CORS - 最宽松的设置用于解决跨域问题
const io = new Server(httpServer, {
  cors: {
    origin: "*", // 允许所有来源（生产环境临时解决方案）
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: false,
    allowedHeaders: ["*"]
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
})

// 存储在线用户和消息历史
const users = new Map()
const messageHistory = []

// 中间件
app.use(express.json())
// 最简单的 CORS 中间件配置
app.use((req, res, next) => {
  // 允许所有来源
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 主页面 - 显示服务器状态
app.get('/', (req, res) => {
  const stats = {
    onlineUsers: users.size,
    totalMessages: messageHistory.length,
    serverTime: new Date().toLocaleString('zh-CN'),
    status: 'running'
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>聊天服务器状态</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .status { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .stats { background: #f0f8ff; padding: 15px; border-radius: 5px; }
        .online { color: #28a745; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>🚀 聊天服务器运行中</h1>
      
      <div class="status">
        <h3>📊 服务器状态</h3>
        <div class="stats">
          <p><strong>状态:</strong> <span class="online">正常运行</span></p>
          <p><strong>在线用户:</strong> ${stats.onlineUsers}</p>
          <p><strong>历史消息:</strong> ${stats.totalMessages}</p>
          <p><strong>服务器时间:</strong> ${stats.serverTime}</p>
        </div>
      </div>

      <div>
        <h3>🔗 连接信息</h3>
        <p>Socket.IO 地址: <code>wss://chat-oegacerd2-lbs-projects-d8a353b9.vercel.app</code></p>
        <p>传输方式: HTTP Long Polling (适配 Vercel)</p>
      </div>

      <div>
        <h3>📖 使用说明</h3>
        <ol>
          <li>访问你的 Vue 前端应用</li>
          <li>进入聊天室页面</li>
          <li>切换到"真实连接"模式</li>
          <li>开始聊天！</li>
        </ol>
      </div>
    </body>
    </html>
  `)
})

// API 接口
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    users: users.size,
    messages: messageHistory.length,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  const messages = messageHistory.slice(-limit)
  res.json({
    messages,
    total: messageHistory.length
  })
})

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log(`[连接] 用户连接: ${socket.id}`)

  // 发送历史消息
  const recentMessages = messageHistory.slice(-20)
  if (recentMessages.length > 0) {
    socket.emit('message:history', recentMessages)
  }

  // 用户加入
  socket.on('user:join', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username,
      joinTime: new Date()
    }
    
    users.set(socket.id, user)
    
    // 通知其他用户
    socket.broadcast.emit('user:joined', {
      username: userData.username,
      message: `${userData.username} 加入了聊天室`,
      timestamp: new Date()
    })
    
    // 发送在线用户列表
    const userList = Array.from(users.values())
    io.emit('users:online', userList)
    
    console.log(`[加入] ${userData.username} 加入聊天室`)
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
      
      // 保存消息
      messageHistory.push(message)
      
      // 限制消息数量
      if (messageHistory.length > 500) {
        messageHistory.splice(0, messageHistory.length - 500)
      }
      
      // 广播消息
      io.emit('message:received', message)
      
      console.log(`[消息] ${user.username}: ${messageData.content}`)
    }
  })

  // 正在输入
  socket.on('typing:start', () => {
    const user = users.get(socket.id)
    if (user) {
      socket.broadcast.emit('typing:user', {
        username: user.username,
        isTyping: true
      })
    }
  })

  socket.on('typing:stop', () => {
    const user = users.get(socket.id)
    if (user) {
      socket.broadcast.emit('typing:user', {
        username: user.username,
        isTyping: false
      })
    }
  })

  // 断开连接
  socket.on('disconnect', () => {
    const user = users.get(socket.id)
    if (user) {
      users.delete(socket.id)
      
      // 通知其他用户
      socket.broadcast.emit('user:left', {
        username: user.username,
        message: `${user.username} 离开了聊天室`,
        timestamp: new Date()
      })
      
      // 更新在线用户列表
      const userList = Array.from(users.values())
      socket.broadcast.emit('users:online', userList)
      
      console.log(`[离开] ${user.username} 离开聊天室`)
    }
  })
})

// 导出给 Vercel 使用
module.exports = app
module.exports.io = io
module.exports.httpServer = httpServer

// 如果直接运行此文件（非 Vercel 环境）
if (require.main === module) {
  const PORT = process.env.PORT || 3001
  httpServer.listen(PORT, () => {
    console.log(`聊天服务器启动在端口 ${PORT}`)
  })
}
