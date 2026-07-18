# Nine Winters itch.io demo build (#121). English-default HTML5 web build for itch.io. ASCII only in this file.
# Output: release-itch\nine-winters-demo-itch-en-<ver>.zip  (upload to itch.io as an HTML5/web project).
#   On itch: kind = "HTML", tick "This file will be played in the browser", set the viewport to
#   1280 x 720 (or larger) with "fullscreen" allowed, and mark index.html as the launch file.
#
# Same Day-15 demo cut as the Steam demo (DEMO_BUILD=1). ITCH_BUILD=1 additionally switches:
#   - base path to './'  (itch serves the unzipped bundle from a hashed relative path)
#   - default UI language to English (game.js autoLang; a player's explicit pick still wins)
#   - service-worker injection OFF (itch runs inside a sandboxed iframe; offline shell not needed)
# The web bundle must never leak into the repo dist: the final step rebuilds the normal electron dist.
$ErrorActionPreference = 'Stop'
$env:Path = "$env:LOCALAPPDATA\node-portable;$env:Path"
Set-Location (Split-Path $PSScriptRoot -Parent)
$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version

# [guard] Same freeze guard as the Steam demo: this branch (demo-vertical-slice) is the frozen Day-15
# source-of-truth. A build off trunk would carry the always-false demo-end gate and never cut/credit.
$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'demo-vertical-slice' -and $env:ALLOW_DEMO_ANY_BRANCH -ne '1') {
  throw "itch demo build must run on 'demo-vertical-slice' (frozen demo source). Current branch: $branch. Set ALLOW_DEMO_ANY_BRANCH=1 to override."
}
$landmine = Get-ChildItem src -Recurse -Filter *.js | Select-String -Pattern "seasonOf\([^)]*\)\s*===\s*['""]"
if ($landmine) { throw "Season object===string comparison found (always-false demo-gate risk): $($landmine[0].Path):$($landmine[0].LineNumber)." }
$en = Get-Content src/locales/en.json -Raw
foreach ($k in @('demo.credits.0','demo.credits.4','demo.credits.close')) {
  if ($en -notmatch [regex]::Escape("`"$k`"")) { throw "Missing demo i18n key '$k' in src/locales/en.json (EN credits screen would be blank)." }
}
Write-Host "[guard] OK (branch=$branch, no season landmine, EN credits keys present)"

Write-Host "[1/3] vite build (DEMO_BUILD=1, ITCH_BUILD=1, web/EN)"
$env:DEMO_BUILD = '1'
$env:ITCH_BUILD = '1'
npx vite build
if ($LASTEXITCODE -ne 0) { throw "vite build (itch) failed" }
Remove-Item Env:\ITCH_BUILD
Remove-Item Env:\DEMO_BUILD

Write-Host "[2/3] zip -> release-itch"
New-Item -ItemType Directory -Force release-itch | Out-Null
$zip = "release-itch\nine-winters-demo-itch-en-$ver.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path dist\* -DestinationPath $zip
$mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "  wrote $zip ($mb MB)"

Write-Host "[3/3] rebuild normal electron dist (prevent demo/itch bundle leak)"
npx vite build --mode electron | Out-Null

Write-Host "DONE. Upload $zip to itch.io (HTML, played-in-browser, index.html launch, 1280x720+)."
