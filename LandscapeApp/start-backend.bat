@echo off
title Son Hai - Backend Server (24/7)
echo =============================================
echo   SON HAI LANDSCAPE - BACKEND SERVER
echo   Chay 24/7 tren may tinh cua anh
echo =============================================
echo.

:: Khoi dong Backend
echo [1/2] Dang khoi dong Backend (Express + MongoDB)...
cd /d "%~dp0server"
start /B node index.js

:: Doi 3 giay de server khoi dong
timeout /t 3 /nobreak >nul

:: Khoi dong ngrok tunnel voi static domain
echo [2/2] Dang khoi dong ngrok tunnel...
echo.
echo =============================================
echo   NGROK DOMAIN: automatic-resisting-clumsily.ngrok-free.dev
echo   FE VERCEL SE GOI TOI DUONG DAN NAY
echo =============================================
echo.
cd /d "%~dp0"
ngrok http 5000 --domain automatic-resisting-clumsily.ngrok-free.dev
