@echo off
:: TEMPLATE — copy ra env.local.bat tren may B va dien secrets that.
:: env.local.bat da nam trong .gitignore — KHONG bao gio commit.

:: ===== Required =====
set PORT=3001
set FLOW_HEADLESS=0
set FLOW_CONCURRENCY=4
set FLOW_MAX_VARIANTS=4

:: Auth header cho Vercel goi worker — phai MATCH Vercel env FLOW_WORKER_SECRET.
set WORKER_SECRET=PUT_RANDOM_STRING_HERE_AND_PASTE_TO_VERCEL_TOO

:: Auth header cho worker post webhook ve Vercel — phai MATCH Vercel env WEBHOOK_SECRET.
set WEBHOOK_SECRET=PUT_RANDOM_STRING_HERE_AND_PASTE_TO_VERCEL_TOO

:: Cloudinary creds — worker tu upload ket qua len Cloudinary, chi gui URL ve Vercel.
set CLOUDINARY_CLOUD_NAME=dzgudobhx
set CLOUDINARY_API_KEY=PUT_CLOUDINARY_API_KEY_HERE
set CLOUDINARY_API_SECRET=PUT_CLOUDINARY_API_SECRET_HERE

:: ===== Optional =====
:: Neu Chrome cai khac duong dan mac dinh, set them:
:: set CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
