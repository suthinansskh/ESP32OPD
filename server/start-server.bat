@echo off
echo Starting ESP32 Temperature Dashboard Server...
echo.
echo Make sure you have:
echo 1. Java 17 or later installed
echo 2. Created the firebase-service-account.json file
echo.
echo Building the application...

cd /d %~dp0
call mvnw.cmd clean package

if %ERRORLEVEL% neq 0 (
  echo.
  echo Build failed. Please fix the errors and try again.
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo Build successful!
echo.
echo Starting the server...
echo.

java -jar target\esp32-dashboard-0.0.1-SNAPSHOT.jar

pause
