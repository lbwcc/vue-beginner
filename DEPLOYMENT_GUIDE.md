# 聊天应用部署指南

## 概述

本项目包含两个部分：
1. **Vue 前端应用** - 将部署到 GitHub Pages
2. **Node.js 聊天服务器** - 将部署到 Vercel 或 Heroku

## 方案一：使用 Vercel 部署聊天服务器 (推荐)

### 步骤 1: 注册 Vercel 账号
1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Sign Up" 注册账号
3. 建议使用 GitHub 账号登录，这样可以直接关联代码仓库

### 步骤 2: 安装 Vercel CLI
```bash
npm install -g vercel
```

### 步骤 3: 准备聊天服务器代码
在项目根目录创建 `vercel.json` 配置文件（见项目文件）

### 步骤 4: 修改聊天服务器配置
修改 `server/chat-server.js` 的 CORS 配置，添加你的 GitHub Pages 域名

### 步骤 5: 部署到 Vercel
```bash
# 在项目根目录运行
vercel login
vercel --prod
```

### 步骤 6: 更新前端配置
修改 Vue 应用中的 Socket.IO 连接地址为 Vercel 提供的域名

---

## 方案二：使用 Heroku 部署聊天服务器

### 步骤 1: 注册 Heroku 账号
1. 访问 [heroku.com](https://heroku.com)
2. 注册免费账号

### 步骤 2: 安装 Heroku CLI
1. 下载 [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. 安装后重启命令行

### 步骤 3: 准备 Heroku 配置文件
创建 `Procfile` 文件（见项目文件）

### 步骤 4: 部署到 Heroku
```bash
# 登录 Heroku
heroku login

# 创建 Heroku 应用
heroku create your-chat-app-name

# 推送代码
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

---

## GitHub Pages 部署 Vue 应用

### 当前配置已完成
你的项目已经配置好了 GitHub Pages 部署：

```bash
npm run build
npm run deploy
```

### 需要更新的配置
部署聊天服务器后，需要更新前端的服务器连接地址。

---

## 部署后的配置更新

### 1. 更新 Socket.IO 连接地址
在 `src/views/Chat.vue` 中更新服务器地址：

```javascript
// 替换为你的 Vercel 或 Heroku 域名
const socket = io('https://your-app-name.vercel.app')
// 或者
const socket = io('https://your-app-name.herokuapp.com')
```

### 2. 更新 CORS 配置
在 `server/chat-server.js` 中添加你的 GitHub Pages 域名：

```javascript
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://lbwcc.github.io",  // 你的 GitHub Pages 域名
      "https://your-domain.com"   // 其他需要的域名
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
})
```

---

## 常见问题解答

### Q: Vercel 和 Heroku 哪个更好？
- **Vercel**: 更适合前端项目，免费额度较大，部署速度快
- **Heroku**: 老牌 PaaS 平台，社区支持好，但免费额度有限

### Q: 部署失败怎么办？
1. 检查日志：`vercel logs` 或在 Heroku Dashboard 查看
2. 确保所有依赖都在 `package.json` 中
3. 检查端口配置是否正确

### Q: 如何查看部署状态？
- **Vercel**: 访问 vercel.com 的 Dashboard
- **Heroku**: 访问 dashboard.heroku.com

---

## 下一步

选择一个部署方案后：
1. 按照相应步骤部署聊天服务器
2. 获取服务器域名
3. 更新前端配置
4. 重新部署 Vue 应用到 GitHub Pages
5. 测试聊天功能

如有问题，请查看相应平台的官方文档或寻求帮助。
