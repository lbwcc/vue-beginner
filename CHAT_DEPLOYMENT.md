# 聊天服务器云托管部署指南

## 概述
这份指南将帮助您将聊天服务器部署到云平台，实现在线聊天功能。

## 推荐方案

### 方案 1: Railway (推荐 - 免费额度充足)

Railway 提供免费的 Node.js 应用托管，配置简单，支持自动部署。

#### 部署步骤：

1. **准备代码**
   - 确保您的代码已推送到 GitHub 仓库
   - 项目根目录已包含 `railway.toml` 配置文件

2. **创建 Railway 账户**
   - 访问 [railway.app](https://railway.app)
   - 使用 GitHub 账户登录

3. **部署项目**
   ```bash
   # 安装 Railway CLI (可选)
   npm install -g @railway/cli
   
   # 登录 Railway
   railway login
   
   # 部署项目
   railway deploy
   ```

4. **获取部署地址**
   - 部署完成后，Railway 会提供一个类似 `https://your-app-name.railway.app` 的地址

5. **更新前端配置**
   - 修改 `.env.production` 文件：
   ```env
   VITE_CHAT_SERVER_URL=https://your-app-name.railway.app
   ```

#### Railway 优势：
- ✅ 免费额度：500 小时/月
- ✅ 自动 HTTPS
- ✅ 自动部署
- ✅ 简单配置

### 方案 2: Render (免费但有限制)

#### 部署步骤：

1. **创建 Render 账户**
   - 访问 [render.com](https://render.com)
   - 连接 GitHub 账户

2. **创建 Web Service**
   - 选择您的 GitHub 仓库
   - 配置：
     - Name: `vue-chat-server`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`

3. **环境变量**
   - 设置 `NODE_ENV=production`

#### Render 优势：
- ✅ 免费方案
- ✅ 自动 HTTPS
- ❌ 有睡眠机制（无活动时会休眠）

### 方案 3: Heroku (需要信用卡验证)

#### 部署步骤：

1. **安装 Heroku CLI**
   ```bash
   # 下载安装 Heroku CLI
   # https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **登录并创建应用**
   ```bash
   heroku login
   heroku create your-chat-app-name
   ```

3. **部署**
   ```bash
   git push heroku main
   ```

#### Heroku 优势：
- ✅ 稳定可靠
- ✅ 丰富的附加组件
- ❌ 免费方案已取消

## 部署后配置

### 1. 更新 CORS 设置

在 `server/chat-server.js` 中添加您的生产域名：

```javascript
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:3000", 
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "https://lbwcc.github.io",  // 您的 GitHub Pages 域名
  "https://your-app-name.railway.app"  // 添加您的 Railway 域名
];
```

### 2. 测试部署

1. **检查服务器状态**
   - 访问您的服务器地址，应该看到服务器状态页面

2. **测试聊天功能**
   - 部署前端应用
   - 打开聊天页面，测试连接和消息发送

### 3. 监控和维护

- **Railway**: 在控制台查看日志和指标
- **Render**: 检查部署日志和服务状态
- **Heroku**: 使用 `heroku logs --tail` 查看日志

## 环境变量说明

```env
# .env.development (本地开发)
VITE_CHAT_SERVER_URL=http://localhost:3001

# .env.production (生产环境)
VITE_CHAT_SERVER_URL=https://your-app-name.railway.app
```

## 常见问题

### Q: 部署后无法连接？
A: 检查 CORS 配置，确保添加了正确的域名。

### Q: 消息发送失败？
A: 检查网络连接和服务器日志，确认 WebSocket 连接正常。

### Q: 免费额度用完了？
A: 考虑升级到付费方案，或者迁移到其他平台。

## 推荐部署流程

1. 使用 Railway 部署聊天服务器（免费）
2. 更新前端环境变量配置
3. 重新构建并部署前端到 GitHub Pages
4. 测试完整的聊天功能

这样您就可以拥有一个完全在线的聊天应用了！
