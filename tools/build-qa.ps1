# Nine Winters QA Edition build (#89). ASCII only in this file.
# Output: release-qa\ (NSIS installer + portable exe + APK).
# QA identity: appId .qa suffix, productName "Nine Winters QA" -> installs side by side with retail.
# The QA web bundle must never leak: final step rebuilds normal dist and re-syncs android assets.
param([switch]$SkipApk)
$ErrorActionPreference = 'Stop'
$env:Path = "$env:LOCALAPPDATA\node-portable;$env:Path"
Set-Location (Split-Path $PSScriptRoot -Parent)
$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version

Write-Host "[1/5] vite build (QA_EDITION=1, electron mode)"
$env:QA_EDITION = '1'
npx vite build --mode electron
if ($LASTEXITCODE -ne 0) { throw "vite build (qa) failed" }

Write-Host "[2/5] electron-builder (QA identity -> release-qa)"
npx electron-builder --win nsis portable "-c.electronDist=build/electron-dist" "-c.appId=com.projectwinter.shelter.qa" "-c.productName=Nine Winters QA" "-c.directories.output=release-qa"
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed" }

if (-not $SkipApk) {
  Write-Host "[3/5] APK (-PqaEdition=1: appId .qa, label 'Nine Winters QA')"
  $env:JAVA_HOME = "C:\Users\mhdmj\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Local\jdk21"
  npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw "cap sync failed" }
  Push-Location android
  .\gradlew assembleRelease -PqaEdition=1
  $gradleExit = $LASTEXITCODE
  Pop-Location
  if ($gradleExit -ne 0) { throw "gradlew assembleRelease failed" }
  Copy-Item "android\app\build\outputs\apk\release\app-release.apk" "release-qa\NineWinters-QA-$ver.apk" -Force
} else {
  Write-Host "[3/5] APK skipped (-SkipApk)"
}

Write-Host "[4/5] Restore normal dist + android assets (QA bundle must not leak)"
Remove-Item Env:QA_EDITION -ErrorAction SilentlyContinue
npx vite build --mode electron
if ($LASTEXITCODE -ne 0) { throw "restore vite build failed" }
if (-not $SkipApk) { npx cap sync android | Out-Null }

Write-Host "[5/5] Done. release-qa artifacts:"
Get-ChildItem release-qa -File | Where-Object { $_.Extension -in '.exe', '.apk' } |
  ForEach-Object { "{0}  {1:N1} MB" -f $_.Name, ($_.Length / 1MB) }
