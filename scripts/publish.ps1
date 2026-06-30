param(
    [string]$Target = "npm"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $RootDir

Write-Host "=== ReviewPilot Publish Script ===" -ForegroundColor Cyan

# Check npm login
$whoami = npm whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nNot logged in to npm. Run: npm login" -ForegroundColor Yellow
    exit 1
}
Write-Host "Logged in as: $whoami" -ForegroundColor Green

if ($Target -eq "npm" -or $Target -eq "all") {
    Write-Host "`n[1/3] Building..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }

    Write-Host "[2/3] Running tests..." -ForegroundColor Cyan
    npm test
    if ($LASTEXITCODE -ne 0) { throw "Tests failed" }

    Write-Host "[3/3] Publishing to npm..." -ForegroundColor Cyan
    npm publish
    if ($LASTEXITCODE -eq 0) {
        Write-Host " Published to npm!" -ForegroundColor Green
        Write-Host " Run: npx @sensei7708/reviewpilot" -ForegroundColor Green
    } else {
        throw "npm publish failed"
    }
}

if ($Target -eq "vscode" -or $Target -eq "all") {
    Write-Host "`nPublishing VS Code extension..." -ForegroundColor Cyan
    & "$RootDir\vscode\build.ps1" -Action "publish"
}

if ($Target -eq "all") {
    Write-Host "`n--- Reminder ---" -ForegroundColor Yellow
    Write-Host "GitHub Action: Create a release on GitHub to publish to the Marketplace." -ForegroundColor Yellow
    Write-Host "Website: Deploy the website/ directory to Vercel." -ForegroundColor Yellow
}
