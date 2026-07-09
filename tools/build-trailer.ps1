# Nine Winters Trailer Edition build (#148). ASCII only in this file.
# Output: release-trailer\ (NSIS installer + portable exe). Boots straight into the
# storyboard loop (no input needed) - for capturing trailer footage by hand.
# Gate lives in src/trailer-script.js behind __TRAILER_EDITION__ (TRAILER_BUILD=1):
# auto-plays the 7-beat scenario on launch, loops forever, blocks all save writes
# (Storage.setItem no-op) so it never touches retail saves.
# The trailer web bundle must never leak: final step rebuilds normal dist.
$ErrorActionPreference = 'Stop'
$env:Path = "$env:LOCALAPPDATA\node-portable;$env:Path"
Set-Location (Split-Path $PSScriptRoot -Parent)
$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version

Write-Host "[1/4] vite build (TRAILER_BUILD=1, electron mode)"
$env:TRAILER_BUILD = '1'
npx vite build --mode electron
if ($LASTEXITCODE -ne 0) { throw "vite build (trailer) failed" }

Write-Host "[2/4] electron-builder (Trailer identity -> release-trailer)"
npx electron-builder --win nsis portable "-c.electronDist=build/electron-dist" "-c.appId=com.projectwinter.shelter.trailer" "-c.productName=Nine Winters Trailer Edition" "-c.directories.output=release-trailer"
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed" }

Write-Host "[3/4] Restore normal dist (trailer bundle must not leak)"
Remove-Item Env:TRAILER_BUILD -ErrorAction SilentlyContinue
npx vite build --mode electron
if ($LASTEXITCODE -ne 0) { throw "restore vite build failed" }

Write-Host "[4/4] Done. release-trailer artifacts:"
Get-ChildItem release-trailer -File | Where-Object { $_.Extension -eq '.exe' } |
  ForEach-Object { "{0}  {1:N1} MB" -f $_.Name, ($_.Length / 1MB) }
