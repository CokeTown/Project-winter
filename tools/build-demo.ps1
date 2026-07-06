# Nine Winters Demo build (#74, Steam Next Fest "The First Winter"). ASCII only in this file.
# Output: release-demo\ (NSIS installer + portable exe). PC only - no APK (Next Fest is a Steam event).
# Demo identity: appId .demo suffix, productName "Nine Winters Demo" -> installs side by side with retail.
# Gameplay gate lives in game.js behind __DEMO__ (DEMO_BUILD=1): normal mode only, ends after winter 1,
# saves namespaced demo- (never touches retail saves).
# The demo web bundle must never leak: final step rebuilds normal dist.
$ErrorActionPreference = 'Stop'
$env:Path = "$env:LOCALAPPDATA\node-portable;$env:Path"
Set-Location (Split-Path $PSScriptRoot -Parent)
$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version

Write-Host "[1/4] vite build (DEMO_BUILD=1, electron mode)"
$env:DEMO_BUILD = '1'
npx vite build --mode electron
if ($LASTEXITCODE -ne 0) { throw "vite build (demo) failed" }

Write-Host "[2/4] electron-builder (Demo identity -> release-demo)"
npx electron-builder --win nsis portable "-c.electronDist=build/electron-dist" "-c.appId=com.projectwinter.shelter.demo" "-c.productName=Nine Winters Demo" "-c.directories.output=release-demo"
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed" }

Write-Host "[3/4] Restore normal dist (demo bundle must not leak)"
Remove-Item Env:DEMO_BUILD -ErrorAction SilentlyContinue
npx vite build --mode electron
if ($LASTEXITCODE -ne 0) { throw "restore vite build failed" }

Write-Host "[4/4] Done. release-demo artifacts:"
Get-ChildItem release-demo -File | Where-Object { $_.Extension -eq '.exe' } |
  ForEach-Object { "{0}  {1:N1} MB" -f $_.Name, ($_.Length / 1MB) }
