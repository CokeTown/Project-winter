# Nine Winters Demo APK build (#74 · demo-vertical-slice). ASCII only in this file.
# Output: release-demo\Nine-Winters-Demo.apk (signed release, side-by-side install via .demo appId).
# Demo identity: -PdemoEdition=1 -> applicationId com.projectwinter.shelter.demo + "Nine Winters Demo" label.
# Gate lives in game.js behind __DEMO__ (DEMO_BUILD=1). Base './' (electron mode) = relative paths for Capacitor webview.
# The demo web bundle must never leak: final step rebuilds normal dist.
$ErrorActionPreference = 'Stop'
$env:Path = "$env:LOCALAPPDATA\node-portable;$env:Path"
Set-Location (Split-Path $PSScriptRoot -Parent)
$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version

Write-Host "[1/5] vite build (DEMO_BUILD=1, relative base for Capacitor)"
$env:DEMO_BUILD = '1'
npx vite build --mode electron
if ($LASTEXITCODE -ne 0) { throw "vite build (demo) failed" }

Write-Host "[2/5] capacitor sync (dist -> android assets)"
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "cap sync failed" }

Write-Host "[3/5] gradle assembleRelease (-PdemoEdition=1, signed)"
Push-Location android
& .\gradlew.bat assembleRelease -PdemoEdition=1
$rc = $LASTEXITCODE
Pop-Location
if ($rc -ne 0) { throw "gradle assembleRelease failed" }

Write-Host "[4/5] Collect APK -> release-demo"
$apk = Get-ChildItem android\app\build\outputs\apk\release -Filter '*.apk' | Where-Object { $_.Name -notmatch 'unsigned' } | Select-Object -First 1
if (-not $apk) { throw "no signed APK found" }
if (-not (Test-Path release-demo)) { New-Item -ItemType Directory release-demo | Out-Null }
$dst = "release-demo\Nine-Winters-Demo-$ver.apk"
Copy-Item $apk.FullName $dst -Force
Write-Host ("  {0}  {1:N1} MB" -f $dst, ($apk.Length / 1MB))

Write-Host "[5/5] Restore normal dist (demo bundle must not leak)"
Remove-Item Env:DEMO_BUILD -ErrorAction SilentlyContinue
npx vite build --mode electron
if ($LASTEXITCODE -ne 0) { throw "restore vite build failed" }
Write-Host "Done."
