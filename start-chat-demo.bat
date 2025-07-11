@echo off
echo ====================================
echo    Vue 聊天室演示启动脚本
echo ====================================
echo.

echo 正在检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
echo.

echo 正在检查依赖...
if not exist node_modules (
    echo 📦 正在安装依赖...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo ✅ 依赖检查完成
echo.

echo 🚀 启动说明:
echo 1. 即将启动聊天服务器 (端口 3001)
echo 2. 然后需要手动启动 Vue 开发服务器
echo 3. 在 Vue 应用中访问聊天室页面
echo.

echo 按任意键启动聊天服务器...
pause >nul

echo 🔥 启动聊天服务器...
echo.
echo 提示: 启动后请在新的命令行窗口运行 "npm run dev" 启动 Vue 应用
echo.

npm run chat-server
