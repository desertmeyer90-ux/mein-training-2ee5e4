@echo off
cd /d "%~dp0"
start "" /min cmd /c "python -m http.server 4181"
timeout /t 2 /nobreak >nul
start "" "http://localhost:4181"
