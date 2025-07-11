# 聊天功能本地开发指南

## 项目简化说明
已删除所有 Vercel 相关配置，项目现在专注于本地开发。

## 使用说明

### 启动聊天服务
1. 启动本地聊天服务器：`npm run chat-server`
2. 启动前端开发服务器：`npm run dev`
3. 在聊天界面点击"真实连接"按钮

### 功能说明
- **真实连接模式**: 连接到本地 WebSocket 服务器 (localhost:3001)
- **演示模式**: 本地模拟聊天，包含自动回复功能

### 开发环境配置
- 前端服务器: http://localhost:5173
- 聊天服务器: http://localhost:3001
- Socket.IO 通过 Vite 代理进行连接

## 故障排除

### 常见问题
1. **连接失败**: 确保聊天服务器已启动 (`npm run chat-server`)
2. **端口冲突**: 检查 3001 端口是否被占用
3. **代理问题**: 重启开发服务器

### 调试技巧
1. 查看浏览器控制台错误信息
2. 检查网络请求是否正常
3. 确认聊天服务器运行状态

## 项目结构
- `src/views/Chat.vue` - 聊天界面组件
- `api/socket.js` - 聊天服务器
- `server/chat-server.js` - 聊天服务器启动文件
- `vite.config.mjs` - 开发服务器配置（包含代理）

## 更新记录
- 移除了所有 Vercel 部署相关代码
- 简化了连接逻辑，仅支持本地开发
- 优化了 CORS 配置，仅允许本地域名
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
