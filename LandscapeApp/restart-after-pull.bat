@echo off
title SON HAI - PULL + RESTART (DUNG CHO MAY B)
chcp 65001 >nul

echo =============================================
echo   PULL CODE MOI + RESTART SERVER + NGROK
echo =============================================
echo.

:: 1. Kill toan bo node + ngrok cu (de tranh chay code cu trong RAM)
echo [1/5] Kill node + ngrok cu...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM ngrok.exe 2>nul
timeout /t 2 /nobreak >nul

:: 2. Pull code moi nhat
echo.
echo [2/5] Git pull...
cd /d "%~dp0\.."
git pull --rebase
if errorlevel 1 (
    echo.
    echo *** GIT PULL LOI - kiem tra conflict roi chay lai ***
    pause
    exit /b 1
)

:: 3. npm install neu package.json doi
echo.
echo [3/5] Cap nhat dependencies (FE + BE)...
cd /d "%~dp0"
call npm install --silent --no-audit --no-fund
cd server
call npm install --silent --no-audit --no-fund
cd ..

:: 4. Start backend trong cua so moi
echo.
echo [4/5] Khoi dong Backend (port 5000)...
start "Sonhai Backend" cmd /k "cd /d %~dp0server && node index.js"
timeout /t 3 /nobreak >nul

:: 5. Start ngrok trong cua so moi
echo.
echo [5/5] Khoi dong Ngrok tunnel...
start "Sonhai Ngrok" cmd /k "ngrok http 5000 --domain=automatic-resisting-clumsily.ngrok-free.dev"

echo.
echo =============================================
echo   DA XONG. Kiem tra 2 cua so moi:
echo   - Backend: phai thay "Server running on port 5000"
echo   - Ngrok:   phai thay "Forwarding ... -> 127.0.0.1:5000"
echo =============================================
echo.
pause
