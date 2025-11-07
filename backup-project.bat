@echo off
echo ====================================
echo   SERVICE POINT PLATFORM BACKUP
echo ====================================
echo.

set PROJECT_DIR=C:\Users\samad shaikh\OneDrive\Desktop\final year project\service-point-platform
set BACKUP_DIR=C:\Users\samad shaikh\OneDrive\Desktop\final year project\backups
set DATE_TIME=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set DATE_TIME=%DATE_TIME: =0%

echo Creating backup directory...
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Creating project archive...
set BACKUP_NAME=service-point-platform_%DATE_TIME%

echo Copying project files...
xcopy "%PROJECT_DIR%" "%BACKUP_DIR%\%BACKUP_NAME%" /E /I /H /Y

echo.
echo ✅ Backup completed successfully!
echo.
echo Backup Location: %BACKUP_DIR%\%BACKUP_NAME%
echo.
echo Files included:
echo - Frontend (HTML, CSS, JS)
echo - Backend (Node.js server)
echo - Database models
echo - Configuration files
echo - Environment settings
echo.
pause