$ErrorActionPreference = "Stop"

Write-Host "Installing Voxel Frontier dependencies from the public npm registry..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "Removing incomplete node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules"
}

npm cache verify
npm ci --legacy-peer-deps --registry=https://registry.npmjs.org/ --no-audit --no-fund --progress=false

Write-Host "Dependencies installed successfully. Starting the game..." -ForegroundColor Green
npm start
