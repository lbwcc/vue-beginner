# 部署指南

## 本地 Docker 部署

### 1. 构建镜像
```bash
docker build -t vue-beginner .
```

### 2. 运行容器
```bash
docker run -d -p 8080:80 --name vue-app vue-beginner
```

### 3. 使用 Docker Compose
```bash
docker-compose up -d
```

访问: http://localhost:8080

---

## Railway 部署

### 方法一: 通过 CLI
```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up
```

### 方法二: 通过 GitHub
1. 将代码推送到 GitHub
2. 在 Railway 控制台连接 GitHub 仓库
3. Railway 会自动检测 Dockerfile 并部署

---

## Render 部署

1. 在 Render 控制台创建新的 Web Service
2. 连接 GitHub 仓库
3. 配置:
   - Environment: Docker
   - Build Command: (留空)
   - Start Command: (留空,使用 Dockerfile 默认)
4. 点击 Deploy

---

## Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

---

## GitHub Pages 部署

```bash
# 构建并部署
npm run build
npm run deploy
```

---

## 环境变量配置

在各平台配置以下环境变量:

- `VITE_API_BASE_URL`: API 基础路径
- `VITE_WS_URL`: WebSocket 地址

### Railway
在项目设置 -> Variables 中添加

### Render
在项目设置 -> Environment 中添加

### Vercel
在项目设置 -> Environment Variables 中添加

---

## 故障排查

### 容器无法启动
```bash
# 查看日志
docker logs vue-app

# 进入容器调试
docker exec -it vue-app sh
```

### 构建失败
- 检查 Node 版本是否兼容
- 清除 node_modules 重新安装
- 检查内存限制

### 部署后访问 404
- 确认 nginx 配置正确
- 检查构建输出目录是否正确
- 验证路由模式配置
