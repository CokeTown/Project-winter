# 버전 범프 원샷: package.json + android versionCode/Name + PATCHNOTES 스텁
# 사용: .\tools\bump-version.ps1 -Version 0.9.6
param([Parameter(Mandatory=$true)][string]$Version)
$root = Split-Path $PSScriptRoot -Parent
$pkgPath = Join-Path $root 'package.json'
$gradlePath = Join-Path $root 'android\app\build.gradle'
$notesPath = Join-Path $root 'docs\PATCHNOTES.md'

$pkg = Get-Content $pkgPath -Raw
$old = [regex]::Match($pkg, '"version":\s*"([^"]+)"').Groups[1].Value
$pkg -replace '"version":\s*"[^"]+"', "`"version`": `"$Version`"" | Set-Content $pkgPath -NoNewline

$gradle = Get-Content $gradlePath -Raw
$code = [int][regex]::Match($gradle, 'versionCode (\d+)').Groups[1].Value
$newCode = $code + 1
$gradle = $gradle -replace "versionCode $code", "versionCode $newCode"
$gradle = $gradle -replace 'versionName "[^"]+"', "versionName `"$Version-beta`""
$gradle | Set-Content $gradlePath -NoNewline

$notes = Get-Content $notesPath -Raw
$today = Get-Date -Format 'yyyy-MM-dd'
$stub = "## v$Version Beta ($today) - (제목 작성)`r`n`r`n- (변경 요약 작성)`r`n`r`n"
$anchor = '> 사람이 읽는 변경 이력. 상세 개발 문서는 PROJECT.md 참고.'
$notes = $notes -replace [regex]::Escape($anchor), "$anchor`r`n`r`n$stub"
$notes | Set-Content $notesPath -NoNewline

Write-Host "bump: $old -> $Version (versionCode $code -> $newCode), PATCHNOTES 스텁 추가"
