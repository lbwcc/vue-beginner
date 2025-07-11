# 🚀 Vercel 部署聊天服务器指南

## 快速部署

### 方法一：使用部署脚本（推荐）
```bash
# 在项目根目录 d:\code\vue\vue-beginner\ 运行
deploy-vercel.bat
```

### 方法二：手动部署
```bash
# 1. 安装 Vercel CLI（如果未安装）
npm install -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署到生产环境
vercel --prod
```

## 部署前的准备工作

✅ **已完成**：
- CORS 配置已更新，支持生产环境
- `vercel.json` 配置文件已创建
- `package.json` 包含必要的启动脚本

## 部署步骤详解

### 1. 运行部署脚本
双击运行 `deploy-vercel.bat` 或在命令行中执行：
```cmd
cd d:\code\vue\vue-beginner
deploy-vercel.bat
```

### 2. 登录 Vercel
- 如果没有账号，先到 [vercel.com](https://vercel.com) 注册
- 建议使用 GitHub 账号登录

### 3. 配置项目
首次部署时，Vercel 会询问：
- **Set up and deploy**: 选择 `Yes`
- **Project name**: 输入项目名称或直接回车使用默认
- **Directory**: 直接回车（使用当前目录）

### 4. 获取部署域名
部署成功后，Vercel 会提供一个域名，类似：
```
https://vue-beginner-xxx.vercel.app
```

## 部署后的配置

### 1. 更新前端连接地址
编辑 `src/views/Chat.vue`，找到这一行：
```javascript
socket.value = io('http://localhost:3001'
```

替换为你的 Vercel 域名：
```javascript
socket.value = io('https://your-app-name.vercel.app'
```

### 2. 重新部署前端到 GitHub Pages
```bash
npm run build
npm run deploy
```

## 验证部署

### 1. 检查服务器状态
访问你的 Vercel 域名，应该看到聊天服务器状态页面

### 2. 测试聊天功能
- 访问你的 GitHub Pages 前端地址
- 进入聊天室页面
- 测试发送消息功能

## 常见问题

### Q: 部署失败怎么办？
- 检查网络连接
- 确保已正确登录 Vercel
- 查看错误信息并根据提示操作

### Q: Socket.IO 连接失败？
- 确保前端配置了正确的服务器地址
- 检查浏览器控制台是否有 CORS 错误
- 验证 Vercel 服务器是否正常运行

### Q: 如何查看部署日志？
- 访问 [vercel.com](https://vercel.com) 的 Dashboard
- 找到你的项目，查看 Functions 日志

## 部署域名示例

部署成功后，你的服务器地址将类似于：
```
https://vue-beginner-lbwcc.vercel.app
```

记住这个地址，在下一步更新前端配置时需要用到！
