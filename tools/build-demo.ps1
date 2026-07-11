# Nine Winters Demo build (#74, Steam Next Fest "The First Winter"). ASCII only in this file.
# Output: release-demo\ (NSIS installer + portable exe). PC only - no APK (Next Fest is a Steam event).
# Demo identity: appId .demo suffix, productName "Nine Winters Demo" -> installs side by side with retail.
# Gameplay gate lives in game.js behind __DEMO__ (DEMO_BUILD=1): normal mode only, ends at Day 15
# (First Fortnight cut, demoPhase state machine), saves namespaced demo- (never touches retail saves).
# The demo web bundle must never leak: final step rebuilds normal dist.
$ErrorActionPreference = 'Stop'
$env:Path = "$env:LOCALAPPDATA\node-portable;$env:Path"
Set-Location (Split-Path $PSScriptRoot -Parent)
$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version

# [guard] Demo freeze+guard (#175, review rank-1). The shipping demo source-of-truth is branch
# 'demo-vertical-slice'. gd-2.0 trunk carries a divergent demo path (the old Day-37 gate was an
# always-false seasonOf-object===string bug), so a demo built there would never cut / show credits /
# show the wishlist CTA. Refuse to build off the frozen source, and fail on the known breakages.
Write-Host "[guard] Demo freeze+guard (#175)"
$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'demo-vertical-slice' -and $env:ALLOW_DEMO_ANY_BRANCH -ne '1') {
  throw "Demo build must run on 'demo-vertical-slice' (frozen demo source). Current branch: $branch. Set ALLOW_DEMO_ANY_BRANCH=1 to override for local testing."
}
# seasonOf() returns an object; comparing it directly to a season string is always false (the trunk
# demo-end bug). Fail if the pattern reappears anywhere in src (correct form is seasonOf(...).id === '...').
$landmine = Get-ChildItem src -Recurse -Filter *.js | Select-String -Pattern "seasonOf\([^)]*\)\s*===\s*['""]"
if ($landmine) { throw "Season object===string comparison found (always-false demo-gate risk): $($landmine[0].Path):$($landmine[0].LineNumber). Use seasonOf(...).id === '...'." }
# The Day-15 end screen needs these i18n keys (5 credit cards + CTA); missing = blank credits at the
# single most conversion-sensitive surface.
$ko = Get-Content src/locales/ko.json -Raw
foreach ($k in @('demo.credits.0','demo.credits.1','demo.credits.2','demo.credits.3','demo.credits.4','demo.credits.close')) {
  if ($ko -notmatch [regex]::Escape("`"$k`"")) { throw "Missing demo i18n key '$k' in src/locales/ko.json (demo credits screen would be blank)." }
}
Write-Host "[guard] OK (branch=$branch, no season landmine, credits keys present)"

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
