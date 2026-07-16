@echo off
setlocal
cd /d "%~dp0"
echo Installing Voxel Frontier dependencies from the public npm registry...
if exist node_modules rmdir /s /q node_modules
call npm cache verify
if errorlevel 1 goto :error
call npm ci --legacy-peer-deps --registry=https://registry.npmjs.org/ --no-audit --no-fund --progress=false
if errorlevel 1 goto :error
call npm start
exit /b 0
:error
echo.
echo Installation failed. Run: node -v ^& npm -v
pause
exit /b 1
