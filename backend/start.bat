@echo off
echo ========================================
echo  Carpool backend - порт 8080
echo ========================================
cd /d "%~dp0"

echo Проверка за стар процес на порт 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
  echo Спиране на PID %%a ...
  taskkill /PID %%a /F >nul 2>&1
)

echo Стартиране на бекенда (http://localhost:8080)...
call mvn spring-boot:run
pause
