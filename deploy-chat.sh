#!/bin/bash

# 聊天服务器部署脚本

echo "🚀 准备部署聊天服务器到云平台..."

# 检查必要文件
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到 package.json 文件"
    exit 1
fi

if [ ! -f "server/chat-server.js" ]; then
    echo "❌ 错误: 未找到聊天服务器文件"
    exit 1
fi

echo "✅ 文件检查完成"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建前端
echo "🔨 构建前端应用..."
npm run build

echo "✅ 构建完成！"
echo ""
echo "🌐 接下来的步骤："
echo "1. 将代码推送到 GitHub"
echo "2. 在 Railway/Render/Heroku 上连接您的仓库"
echo "3. 配置环境变量 VITE_CHAT_SERVER_URL"
echo "4. 部署并测试"
echo ""
echo "📖 详细步骤请参考 CHAT_DEPLOYMENT.md 文件"
