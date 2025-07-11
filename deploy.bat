@echo off
echo ====================================
echo    聊天应用部署助手
echo ====================================
echo.

echo 正在启动部署助手...
echo.

node deploy-helper.js

if errorlevel 1 (
    echo.
    echo ❌ 部署过程中出现错误
    echo 请检查错误信息并重试
    pause
    exit /b 1
)

echo.
echo ✅ 部署助手执行完成
pause
