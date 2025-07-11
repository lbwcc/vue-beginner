# CORS 跨域问题解决方案

## 问题描述
当前端应用运行在 `http://localhost:4173` 时，尝试连接到 Vercel 部署的 WebSocket 服务器会遇到 CORS 错误：

```
Access to XMLHttpRequest at 'https://chat-aaydn2iyh-lbs-projects-d8a353b9.vercel.app/socket.io/?EIO=4&transport=polling&t=ie68ytky' from origin 'http://localhost:4173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 已实施的解决方案

### 1. 服务器端配置修复

#### A. Socket.IO CORS 配置（api/socket.js）
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:4173", // Vite 预览模式
        "http://localhost:8080",
        "https://lbwcc.github.io"
      ];
      
      // 宽松的检查逻辑，允许本地开发和常见域名
      if (!origin || 
          allowedOrigins.includes(origin) || 
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      
      return callback(null, true); // 生产环境允许所有来源
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: false, // 设为 false 避免某些 CORS 问题
    allowedHeaders: ["*"]
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
})
```

#### B. Express CORS 中间件
```javascript
app.use((req, res, next) => {
  const origin = req.get('Origin');
  
  // 更宽松的 origin 检查
  if (!origin || 
      allowedOrigins.includes(origin) || 
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
```

### 2. 客户端配置修复（src/views/Chat.vue）

```javascript
socket.value = io(socketUrl, {
  transports: ['polling', 'websocket'],
  timeout: 10000,
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  withCredentials: false, // 重要：设为 false 避免 CORS 问题
  autoConnect: true,
  extraHeaders: {},
  upgrade: true
})
```
    target: 'http://localhost:3001',
    changeOrigin: true,
    ws: true
  }
}
```

### 3. WebSocket 连接配置
在 `Chat.vue` 中根据环境自动选择连接地址：
```javascript
const socketUrl = import.meta.env.PROD 
  ? 'https://chat-aaydn2iyh-lbs-projects-d8a353b9.vercel.app'
  : 'http://localhost:3001'
```

### 4. 服务器 CORS 配置
- 配置了 Socket.IO 的 CORS 选项
- 添加了 Express CORS 中间件
- 支持多种域名和环境

### 5. 支持的域名
- `http://localhost:5173` (Vite 开发服务器)
- `http://localhost:3000` 
- `http://localhost:4173` (Vite 预览模式)
- `https://lbwcc.github.io` (GitHub Pages)
- `*.vercel.app` (Vercel 部署)
- `*.netlify.app` (Netlify 部署)

## 使用说明

### 开发环境测试
1. 启动聊天服务器：`npm run chat-server` 或 `start-dev-server.bat`
2. 启动Vue开发服务器：`npm run dev`
3. 在浏览器中打开 `http://localhost:5173`
4. 在聊天界面点击"真实连接"按钮测试WebSocket连接

### 生产环境
- 自动使用 Vercel 部署的 WebSocket 服务器
- 无需额外配置

## 故障排除

### 连接失败
1. 确保聊天服务器在端口3001运行
2. 检查防火墙设置
3. 查看浏览器控制台的错误信息

### CORS 错误
1. 确认域名在服务器允许列表中
2. 检查服务器控制台的CORS日志
3. 确保使用HTTPS（生产环境）

### 开发工具
- 浏览器开发者工具 → Network → WS 查看WebSocket连接
- 服务器控制台查看连接日志
- 使用 `演示模式` 进行本地测试（无需服务器）
