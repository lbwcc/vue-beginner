# 聊天应用跨域解决方案

## 问题说明
Vue 聊天应用在连接 WebSocket 服务器时遇到跨域（CORS）问题。

## 解决方案

### 1. 开发环境配置

#### 启动后端服务器
```bash
# 运行聊天服务器（端口：3001）
npm run chat-server
# 或者直接运行
node server/chat-server.js
# 或者使用批处理文件
start-dev-server.bat
```

#### 启动前端开发服务器
```bash
# 运行Vue开发服务器（端口：5173）
npm run dev
```

### 2. Vite 代理配置
在 `vite.config.mjs` 中添加了代理配置：
```javascript
proxy: {
  '/socket.io': {
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
