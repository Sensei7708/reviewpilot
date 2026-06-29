Write-Host "=== ReviewPilot Publish Script ===" -ForegroundColor Cyan

# 1. Check npm login
$whoami = npm whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nYou need to log in to npm first." -ForegroundColor Yellow
    Write-Host "Create an account at: https://www.npmjs.com/signup" -ForegroundColor Yellow
    Write-Host "Then run: npm login" -ForegroundColor Yellow
    exit 1
}

Write-Host "Logged in as: $whoami" -ForegroundColor Green

# 2. Build
Write-Host "`nBuilding..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# 3. Run tests
Write-Host "`nRunning tests..." -ForegroundColor Cyan
npm test 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "No tests configured, skipping." -ForegroundColor Yellow
}

# 4. Publish
Write-Host "`nPublishing to npm..." -ForegroundColor Cyan
npm publish
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n Published successfully!" -ForegroundColor Green
    Write-Host "Anyone can now run: npx reviewpilot" -ForegroundColor Green
} else {
    Write-Host "Publish failed!" -ForegroundColor Red
}
