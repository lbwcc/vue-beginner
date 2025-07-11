# Vue 聊天应用快速部署指南

## 🚀 一键部署

### 方法一：使用部署助手（推荐）
```bash
# Windows 用户
deploy.bat

# 或者直接运行
node deploy-helper.js
```

部署助手会自动帮你：
1. ✅ 检查必要的工具和文件
2. 🚀 指导你部署聊天服务器（Vercel 或 Heroku）
3. 🔧 自动更新前端配置
4. 📤 部署前端到 GitHub Pages

### 方法二：手动部署

#### 步骤 1: 部署聊天服务器

**选择 Vercel:**
```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 部署
vercel --prod
```

**选择 Heroku:**
```bash
# 登录 Heroku
heroku login

# 创建应用
heroku create your-app-name

# 部署
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### 步骤 2: 更新前端配置

编辑 `src/views/Chat.vue`，找到这一行：
```javascript
socket.value = io('http://localhost:3001'
```

替换为你的服务器地址：
```javascript
// Vercel
socket.value = io('https://your-app.vercel.app'

// 或者 Heroku
socket.value = io('https://your-app-name.herokuapp.com'
```

#### 步骤 3: 部署前端

```bash
# 构建项目
npm run build

# 部署到 GitHub Pages
npm run deploy
```

## 📋 部署要求

- ✅ Node.js 14+
- ✅ Git
- ✅ GitHub 账号
- ✅ Vercel 或 Heroku 账号

## 🌐 访问应用

部署完成后：
- **前端地址**: https://lbwcc.github.io/vue-beginner/
- **聊天服务器**: 你的 Vercel 或 Heroku 域名

## 🛠️ 本地开发

```bash
# 安装依赖
npm install

# 启动聊天服务器
npm run chat-server

# 新开一个终端，启动前端
npm run dev
```

## ❓ 常见问题

### Q: 部署后聊天功能不工作？
A: 检查：
1. 聊天服务器是否正常运行
2. 前端是否正确连接到服务器地址
3. 浏览器控制台是否有错误信息

### Q: Vercel 部署失败？
A: 确保：
1. `vercel.json` 文件存在
2. 已经正确登录 Vercel
3. 项目根目录没有其他配置冲突

### Q: Heroku 部署失败？
A: 确保：
1. `Procfile` 文件存在
2. 已经正确登录 Heroku
3. 应用名称是唯一的

## 📚 相关文档

- [Vercel 文档](https://vercel.com/docs)
- [Heroku 文档](https://devcenter.heroku.com/)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
