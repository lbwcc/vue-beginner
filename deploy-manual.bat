@echo off
echo ====================================
echo    手动部署到 GitHub Pages
echo ====================================
echo.

echo 正在检查构建文件...
if not exist docs (
    echo 错误: docs 目录不存在，请先运行 npm run build
    pause
    exit /b 1
)

echo ✅ 构建文件存在
echo.

echo 正在准备部署...

REM 进入 docs 目录
cd docs

REM 初始化 git（如果不存在）
if not exist .git (
    echo 初始化 Git 仓库...
    git init
    git branch -M gh-pages
)

REM 添加所有文件
echo 添加文件到 Git...
git add .

REM 提交
echo 提交更改...
git commit -m "Deploy to GitHub Pages - %date% %time%"

REM 添加远程仓库（如果不存在）
git remote remove origin >nul 2>&1
git remote add origin https://github.com/lbwcc/vue-beginner.git

REM 推送到 gh-pages 分支
echo 推送到 GitHub Pages...
git push -f origin gh-pages

if errorlevel 1 (
    echo 部署失败，请检查网络连接和权限
    cd ..
    pause
    exit /b 1
)

echo.
echo 🎉 部署成功！
echo 访问地址: https://lbwcc.github.io/vue-beginner/
echo.
echo 注意: GitHub Pages 可能需要几分钟来更新内容

cd ..
pause
