@echo off
title SH LANDSCAPE - FULL SYSTEM
echo Dang khoi dong toan bo he thong...

echo.
echo 1. Dang khoi dong Backend (Port 5000)...
start cmd /k "cd server && node index.js"

echo.
echo 2. Dang khoi dong Ngrok Tunnel...
start cmd /k "ngrok http 5000"

echo.
echo 3. Dang khoi dong Frontend (Vite)...
start cmd /k "npm run dev:client"

echo.
echo DA XONG! He thong da san sang.
echo - Backend: http://localhost:5000 
echo - Ngrok: Check cua so Ngrok de lay link
echo - App: http://localhost:5173
echo.
pause
