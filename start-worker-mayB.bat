@echo off
title FLOW-WORKER - MAY B (PORT 3001 + NGROK)
chcp 65001 >nul

echo =============================================
echo   PULL CODE + START FLOW-WORKER + NGROK
echo =============================================
echo.

:: 1. Kill cu node + ngrok + Chrome dang giu profile lock (tranh chay code cu /
::    port 3001 collision / SingletonLock cua flow_profile khien browser khong launch).
echo [1/6] Kill node + ngrok + Chrome flow_profile cu...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM ngrok.exe 2>nul
:: Chi kill Chrome process spawn voi --user-data-dir tro vao flow_profile
:: (tranh nuke Chrome dang browse cua user). Match qua command line argument.
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'chrome.exe'\" | Where-Object { $_.CommandLine -match 'flow_profile' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" 2>nul
timeout /t 2 /nobreak >nul

:: 1b. Xoa SingletonLock cua Chrome profile (neu Chrome bi force-kill,
::     lock file con sot lai khien lan launch sau khong mo duoc profile).
del /F /Q "%~dp0tooltaoanh\flow_profile\SingletonLock" 2>nul
del /F /Q "%~dp0tooltaoanh\flow_profile\SingletonSocket" 2>nul
del /F /Q "%~dp0tooltaoanh\flow_profile\SingletonCookie" 2>nul

:: 2. Pull code moi nhat (file nay nam o root repo "designer")
echo.
echo [2/6] Git pull...
cd /d "%~dp0"
git pull --rebase --autostash
if errorlevel 1 (
    echo *** GIT PULL LOI - kiem tra conflict roi chay lai ***
    pause
    exit /b 1
)

:: 3. npm install neu package.json doi (chi flow-worker, FE deploy tren Vercel)
echo.
echo [3/6] Cap nhat dependencies (flow-worker)...
cd /d "%~dp0flow-worker"
call npm install --silent --no-audit --no-fund

:: 4. Load env tu file gitignored (secrets) — must exist truoc khi chay
if not exist "%~dp0flow-worker\env.local.bat" (
    echo.
    echo *** THIEU FILE flow-worker\env.local.bat ***
    echo Copy flow-worker\env.local.example.bat ra env.local.bat va dien secrets.
    pause
    exit /b 1
)
call "%~dp0flow-worker\env.local.bat"

:: 4. Verify port 3001 free (taskkill node.exe da chac chan free, day chi double-check)
echo.
echo [4/6] Kiem tra port 3001 free...
netstat -an | findstr ":3001 " | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo *** PORT 3001 VAN BI CHIEM — co process khac (khong phai node) dang giu. ***
    echo Tim process: netstat -ano ^| findstr ":3001 "
    pause
    exit /b 1
)
echo Port 3001 free, OK.

:: 5. Start worker (port 3001) + ngrok tunnel
echo.
echo [5/6] Khoi dong flow-worker (port 3001)...
start "Flow Worker" cmd /k "cd /d %~dp0flow-worker && node server.js"
timeout /t 5 /nobreak >nul

echo.
echo [6/6] Khoi dong ngrok tunnel (3001 -> automatic-resisting-clumsily.ngrok-free.dev)...
start "Flow Worker Ngrok" cmd /k "ngrok http 3001 --domain=automatic-resisting-clumsily.ngrok-free.dev"

echo.
echo =============================================
echo   DA XONG. Kiem tra:
echo   - Worker:  http://localhost:3001/health
echo   - Public:  https://automatic-resisting-clumsily.ngrok-free.dev/health
echo.
echo   Vercel env can match:
echo     FLOW_WORKER_URL    = https://automatic-resisting-clumsily.ngrok-free.dev
echo     FLOW_WORKER_SECRET = (= WORKER_SECRET trong env.local.bat)
echo     WEBHOOK_SECRET     = (= WEBHOOK_SECRET trong env.local.bat)
echo =============================================
echo.
pause
