@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. Once https://nodejs.org/ adresinden kur.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
  echo Ilk kurulum: paketler indiriliyor...
  call npm install
  if errorlevel 1 (
    echo Kurulum basarisiz. Internet baglantini kontrol et.
    pause
    exit /b 1
  )
)
echo Ozerk Portfolio aciliyor...
call npm run dev -- --open
pause
