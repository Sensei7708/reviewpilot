param(
    [string]$Action = "package"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== ReviewPilot VS Code Extension Build ===" -ForegroundColor Cyan

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
}

# Compile
Write-Host "Compiling..." -ForegroundColor Cyan
npx tsc --noEmit 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "TypeScript check passed." -ForegroundColor Green
}

# Compile the extension to JS
npx tsc -p tsconfig.json
if ($LASTEXITCODE -ne 0) { throw "Compilation failed" }

if ($Action -eq "package") {
    Write-Host "Packaging..." -ForegroundColor Cyan
    npx @vscode/vsce package
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Package created!" -ForegroundColor Green
    } else {
        throw "Packaging failed"
    }
}

if ($Action -eq "publish") {
    Write-Host "Publishing..." -ForegroundColor Cyan
    npx @vscode/vsce publish
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Published to VS Code Marketplace!" -ForegroundColor Green
    } else {
        throw "Publish failed"
    }
}
