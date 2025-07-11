@echo off
chcp 65001 >nul
echo ====================================
echo    Vercel Deploy Chat Server
echo ====================================
echo.

echo Checking Vercel CLI...
vercel --version >nul 2>&1
if errorlevel 1 (
    echo Installing Vercel CLI...
    npm install -g vercel
    if errorlevel 1 (
        echo Error: Failed to install Vercel CLI
        echo Please run manually: npm install -g vercel
        pause
        exit /b 1
    )
    echo Success: Vercel CLI installed
) else (
    echo Success: Vercel CLI found
)

echo.
echo Please login to Vercel...
echo Tip: Register at https://vercel.com if you don't have an account
echo.

vercel login

if errorlevel 1 (
    echo Error: Login failed
    pause
    exit /b 1
)

echo.
echo Starting deployment to Vercel...
echo.
echo Configuration tips:
echo - Set up and deploy: Choose Yes
echo - Project name: Use default or custom name
echo - Directory: Press Enter (use current directory)
echo.

vercel --prod

if errorlevel 1 (
    echo Error: Deployment failed
    pause
    exit /b 1
)

echo.
echo Success: Deployment completed!
echo.
echo Next steps:
echo 1. Copy the Vercel domain URL
echo 2. Update frontend server address
echo 3. Redeploy frontend to GitHub Pages
echo.

pause
