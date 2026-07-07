# Nine Winters Demo - Android APK + itch.io HTML5 web zip (friend playtest / browser demo). ASCII only.
# One demo web bundle feeds BOTH artifacts:
#   - release-demo\NineWinters-Demo-web-<ver>.zip   (itch.io HTML5: index.html at zip root, relative base, no SW)
#   - release-demo\NineWinters-Demo-<ver>.apk       (Android debug APK, auto-signed, installs via unknown sources)
# Demo gate: DEMO_BUILD=1 -> __DEMO__ in game.js (normal mode only, first-snow credits, sandbox). Build from demo-vertical-slice.
# --mode electron => base './' (works on itch subpath AND Capacitor local assets) + SW disabled (avoids itch cache/scope issues).
# Demo identity: -PdemoEdition=1 -> appId .demo + label "Nine Winters Demo" (installs side by side with retail).
# Final step restores the normal dist so the demo web bundle never leaks into retail builds.
$ErrorActionPreference = 'Stop'
$env:Path = "$env:LOCALAPPDATA\node-portable;$env:Path"
Set-Location (Split-Path $PSScriptRoot -Parent)

# JDK 17+ required by AGP 8.13 (PATH default is Java 8 - too old). Point at the local JDK 21.
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $jdk = "$env:LOCALAPPDATA\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Local\jdk21"
    if (Test-Path "$jdk\bin\java.exe") {
        $env:JAVA_HOME = $jdk
    } else {
        throw "JDK 17+ not found. Set JAVA_HOME to a JDK 17/21 install before running."
    }
}
Write-Host "JAVA_HOME = $env:JAVA_HOME"

$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version
if (-not (Test-Path release-demo)) { New-Item -ItemType Directory release-demo | Out-Null }

Write-Host "[1/5] vite build (DEMO_BUILD=1, electron mode -> base './', no SW)"
$env:DEMO_BUILD = '1'
npx vite build --mode electron
if ($LASTEXITCODE -ne 0) { throw "vite build (demo) failed" }

Write-Host "[2/5] itch.io HTML5 zip (dist contents at zip root)"
$webzip = "release-demo\NineWinters-Demo-web-$ver.zip"
if (Test-Path $webzip) { Remove-Item $webzip -Force }
Compress-Archive -Path (Join-Path dist '*') -DestinationPath $webzip -Force
Write-Host ("      {0}  {1:N1} MB" -f $webzip, ((Get-Item $webzip).Length / 1MB))

Write-Host "[3/5] capacitor sync android (copies dist -> android assets)"
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "cap sync failed" }

Write-Host "[4/5] gradlew assembleDebug (-PdemoEdition=1, JDK 21)"
Push-Location android
try {
    & .\gradlew.bat -PdemoEdition=1 assembleDebug
    $rc = $LASTEXITCODE
} finally {
    Pop-Location
}
if ($rc -ne 0) { throw "gradle assembleDebug failed (rc=$rc)" }
$apkSrc = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkSrc)) { throw "APK not found at $apkSrc" }
$apkOut = "release-demo\NineWinters-Demo-$ver.apk"
Copy-Item $apkSrc $apkOut -Force
Write-Host ("      {0}  {1:N1} MB" -f $apkOut, ((Get-Item $apkOut).Length / 1MB))

Write-Host "[5/5] Restore normal dist (demo bundle must not leak)"
Remove-Item Env:DEMO_BUILD -ErrorAction SilentlyContinue
npx vite build --mode electron
if ($LASTEXITCODE -ne 0) { throw "restore vite build failed" }

Write-Host "=== DONE ==="
Write-Host "  itch.io web : $webzip"
Write-Host "  Android APK : $apkOut"
