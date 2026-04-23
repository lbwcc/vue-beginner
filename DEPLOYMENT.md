# 部署指南

## GitHub Pages 前端 + lbwcc.cn 后端（推荐方案）

目标：
- 前端静态资源发布到 GitHub Pages（域名通常是 `https://<username>.github.io/vue-beginner/`）
- 后端服务运行在本地 Docker，统一通过 `https://lbwcc.cn/lb-api/*` 对外

### 1. 前端环境变量

本项目已支持通过 `VITE_BACKEND_ORIGIN` 统一切换 API、图片和 WebSocket 地址。

生产环境使用：

```env
VITE_BACKEND_ORIGIN=https://lbwcc.cn
```

### 2. 发布前端到 GitHub Pages

```bash
npm install
npm run build
npm run deploy
```

### 3. lbwcc.cn 反向代理配置（Nginx 示例）

在 `lbwcc.cn` 所在服务器上将 `/lb-api/` 转发到你的 Docker 后端（示例后端端口 `8088`）。

```nginx
server {
   listen 443 ssl;
   server_name lbwcc.cn;

   # 证书配置略

   location /lb-api/ {
      proxy_pass http://127.0.0.1:8088/;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      # WebSocket / SockJS
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_read_timeout 120s;
   }
}
```

### 4. 后端 CORS 必须放行 GitHub Pages 域名

需要允许以下来源（至少其一）：
- `https://<username>.github.io`
- 你绑定的前端自定义域名（如果有）

并允许：
- 方法：`GET, POST, PUT, DELETE, OPTIONS`
- 头：`Authorization, Content-Type, X-User-Name, X-User-Id`

### 5. 连通性检查

浏览器打开：

```text
https://lbwcc.cn/lb-api/actuator/health
```

或你的后端任意健康检查接口，确认返回正常再验证前端上传和聊天。

---

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
