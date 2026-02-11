@echo off
echo Стартиране на бекенда...
cd /d "%~dp0"
call mvn spring-boot:run
pause
