# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# 先复制 package 文件，利用层缓存安装依赖
COPY package*.json ./
RUN npm ci

# 复制源码（排除本地 docs/node_modules 等大目录，见 .dockerignore）
COPY . .

# Docker 构建时使用根路径，避免 /vue-beginner/ 前缀导致 404
ENV VITE_BASE_PATH=${VITE_BASE_PATH:-/}

# 直接调用 vite build（跳过 prebuild 的 clean-docs-static.cjs，该脚本仅用于本地）
RUN npx vite build

# ── Stage 2: Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# 复制构建产物到 nginx 静态目录
COPY --from=builder /app/docs /usr/share/nginx/html

# 复制 nginx 配置（含 /lb-api 反向代理）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
