param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $RootDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ReviewPilot Launch Checklist" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$steps = @(
    @{ Name = "1. Build project"; Command = { npm run build } },
    @{ Name = "2. Run tests"; Command = { npm test } },
    @{ Name = "3. Publish to npm"; Command = { npm publish } },
    @{ Name = "4. Package VS Code extension"; Command = { 
        Push-Location vscode
        npx @vscode/vsce package
        Pop-Location
    }},
    @{ Name = "5. Push to GitHub"; Command = { 
        git push origin main --tags
    }}
)

foreach ($step in $steps) {
    Write-Host "  $($step.Name)..." -ForegroundColor Cyan
    if (-not $DryRun) {
        & $step.Command
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  FAILED: $($step.Name)" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "  Done." -ForegroundColor Green
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "   Post-Launch Tasks" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Website:  Deploy website/ to Vercel"
Write-Host "  GitHub:   Create a release at https://github.com/Sensei7708/reviewpilot/releases"
Write-Host "  VS Code:  Publish extension: cd vscode && npx @vscode/vsce publish"
Write-Host "  Gumroad:  Verify products at https://gumroad.com"
Write-Host "  Docs:     Update README with latest features"
Write-Host "  Launch:   Post on Product Hunt, Hacker News, Reddit"
Write-Host ""
