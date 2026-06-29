param(
    [string]$NpmToken,
    [string]$GhToken
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $RootDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ReviewPilot - Full Launch Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---- Step 1: Get tokens if not provided ----
if (-not $NpmToken) {
    $NpmToken = Read-Host "Paste your npm token (create at: https://www.npmjs.com/settings/tokens)"
}
if (-not $GhToken) {
    $GhToken = Read-Host "Paste your GitHub token (create at: https://github.com/settings/tokens)"
}

# ---- Step 2: Build ----
Write-Host "`n[1/5] Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

# ---- Step 3: Publish to npm ----
Write-Host "`n[2/5] Publishing to npm..." -ForegroundColor Cyan
$npmrc = "//registry.npmjs.org/:_authToken=$NpmToken"
Set-Content "$env:USERPROFILE\.npmrc" $npmrc -Force
$version = (Get-Content package.json | ConvertFrom-Json).version
npm publish
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Published v$version to npm!" -ForegroundColor Green
    Write-Host "  Anyone can run: npx reviewpilot" -ForegroundColor Green
} else { throw "npm publish failed" }

# ---- Step 4: Create GitHub repo ----
Write-Host "`n[3/5] Creating GitHub repo..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "token $GhToken"
    "Accept" = "application/vnd.github.v3+json"
}
$body = @{
    name = "reviewpilot"
    description = "AI-powered code review CLI. Analyzes PRs and diffs using Ollama (local, free, private)."
    homepage = "https://reviewpilot-steel.vercel.app"
    private = $false
    has_issues = $true
    has_wiki = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "  Repo created: https://github.com/$($response.full_name)" -ForegroundColor Green
} catch {
    Write-Host "  Repo may already exist. Trying to use existing..." -ForegroundColor Yellow
}

# ---- Step 5: Push code ----
Write-Host "`n[4/5] Pushing code to GitHub..." -ForegroundColor Cyan
$repoUrl = "https://$($GhToken):x-oauth-basic@github.com/reviewpilot/reviewpilot.git"

if (-not (Test-Path ".git")) {
    git init
    git config user.email "reviewpilot@bot.dev"
    git config user.name "reviewpilot"
}

git remote remove origin 2>$null
git remote add origin $repoUrl
git add -A
git commit -m "Initial release v$version" 2>$null
git branch -M main
git push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Code pushed to GitHub!" -ForegroundColor Green
}

# ---- Step 6: Set up GitHub Pages and Action ----
Write-Host "`n[5/5] Configuring GitHub..." -ForegroundColor Cyan
$actionYml = @"
name: ReviewPilot CI
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: reviewpilot/reviewpilot@main
"@
New-Item -ItemType Directory -Path ".github/workflows" -Force | Out-Null
Set-Content ".github/workflows/review.yml" $actionYml -Force
git add .github/workflows/review.yml
git commit -m "Add GitHub Action workflow"
git push

# ---- Done ----
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   LAUNCH COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  npm:     https://www.npmjs.com/package/reviewpilot"
Write-Host "  GitHub:  https://github.com/reviewpilot/reviewpilot"
Write-Host "  Website: https://reviewpilot-steel.vercel.app"
Write-Host ""
Write-Host "Next: Set up Gumroad products at https://gumroad.com"
Write-Host "  - ReviewPilot Pro    \$199 one-time"
Write-Host "  - ReviewPilot Team   \$499/year"
Write-Host ""
Write-Host "Cleanup:" -ForegroundColor Yellow
Write-Host "  Remove the npm token from your .npmrc file (or keep it for future publishes)"
Write-Host "  Remove the GitHub token from your session"
Write-Host ""
