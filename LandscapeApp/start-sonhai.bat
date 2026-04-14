@echo off
title HE THONG SON HAI LANDSCAPE - SERVER & NGROK
echo Dang khoi dong Backend Server...
start cmd /k "cd server && node index.js"
echo.
echo Dang khoi dong Ngrok Tunnel...
echo LUU Y: Neu link Ngrok thay doi, hay cap nhat lai file .env vao push len Git nhe!
start cmd /k "ngrok http 5000"
echo.
echo DA XONG! He thong dang chay tren cong 5000.
pause
