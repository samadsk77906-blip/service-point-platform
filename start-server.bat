@echo off
echo Starting Service Point Platform...
echo.
cd /d "C:\Users\samad shaikh\OneDrive\Desktop\final year project\service-point-platform\backend"
echo MongoDB Atlas Connection: Connecting...
echo Server Port: 3001
echo.
echo ==============================
echo   SERVICE POINT PLATFORM
echo ==============================
echo.
echo Server will start in 3 seconds...
timeout /t 3 /nobreak > nul
echo.
echo Starting server...
node server.js
echo.
echo Server stopped. Press any key to restart or close this window.
pause
goto :start