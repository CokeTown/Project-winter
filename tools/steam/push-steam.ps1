# push-steam.ps1 -- Steam depot upload pipeline (#75)
# Usage:
#   powershell -ExecutionPolicy Bypass -File tools\steam\push-steam.ps1 -App main -Desc "v1.9.0 lighting" [-SetLive beta] [-Username <steam_login>] [-DryRun]
#   powershell -ExecutionPolicy Bypass -File tools\steam\push-steam.ps1 -App demo -ContentRoot G:\pw-demo\release-demo\win-unpacked -Desc "demo 1.9.0" -DryRun
# Notes:
#   - Uploads the UNPACKED app dir (win-unpacked), never the NSIS installer.
#   - steamcmd login is interactive (password + Steam Guard) -- run from a real terminal.
#   - Default SetLive is empty: build lands unpublished; promote to 'default' in Steamworks console.
#   - -DryRun generates and validates the vdf pair without steamcmd (no login needed).
param(
  [Parameter(Mandatory=$true)][ValidateSet('main','demo')][string]$App,
  [string]$ContentRoot = '',
  [string]$Desc = '',
  [string]$SetLive = '',
  [string]$Username = '',
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # repo root (tools/steam/..)

# -- 1) Resolve IDs ----------------------------------------------------------
$ids = (Get-Content (Join-Path $PSScriptRoot 'steam-ids.json') -Raw | ConvertFrom-Json).$App
if (-not $ids -or -not $ids.app -or -not $ids.depot) {
  Write-Error "steam-ids.json has no IDs for '$App'. Create the app in Steamworks, then fill tools/steam/steam-ids.json (app + depot)."
}
$appId = [int]$ids.app; $depotId = [int]$ids.depot

# -- 2) Resolve and validate content root ------------------------------------
if (-not $ContentRoot) {
  $ContentRoot = if ($App -eq 'demo') { 'G:\pw-demo\release-demo\win-unpacked' } else { Join-Path $root 'release\win-unpacked' }
}
$ContentRoot = (Resolve-Path $ContentRoot).Path
$exe = Get-ChildItem $ContentRoot -Filter '*.exe' | Select-Object -First 1
if (-not $exe) { Write-Error "No .exe in $ContentRoot -- run the electron-builder build first (win-unpacked missing?)" }
if (-not (Test-Path (Join-Path $ContentRoot 'resources\app.asar'))) { Write-Error "resources/app.asar missing in $ContentRoot -- not an electron-builder unpacked dir" }
$files = Get-ChildItem $ContentRoot -Recurse -File
$totalMB = [math]::Round(($files | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-Host "[push-steam] app=$App ($appId/depot $depotId) root=$ContentRoot files=$($files.Count) size=${totalMB}MB exe=$($exe.Name)"

# -- 3) Generate vdf pair ----------------------------------------------------
$outDir = Join-Path $root "release\steam-build\$App"
New-Item -ItemType Directory -Force $outDir | Out-Null
if (-not $Desc) { $Desc = "$App $(Get-Date -Format yyyy-MM-dd_HHmm)" }
$depotVdf = Join-Path $outDir "depot_build_$depotId.vdf"
@"
"DepotBuild"
{
  "DepotID" "$depotId"
  "ContentRoot" "$ContentRoot"
  "FileMapping" { "LocalPath" "*" "DepotPath" "." "recursive" "1" }
  "FileExclusion" "*.log"
  "FileExclusion" "builder-debug.yml"
  "FileExclusion" "*.pdb"
}
"@ | Set-Content $depotVdf -Encoding ascii
$appVdf = Join-Path $outDir "app_build_$appId.vdf"
@"
"AppBuild"
{
  "AppID" "$appId"
  "Desc" "$Desc"
  "BuildOutput" "$outDir\logs\"
  "ContentRoot" "$ContentRoot"
  "SetLive" "$SetLive"
  "Depots" { "$depotId" "$depotVdf" }
}
"@ | Set-Content $appVdf -Encoding ascii
Write-Host "[push-steam] vdf generated: $appVdf"

if ($DryRun) { Write-Host "[push-steam] DRY RUN OK -- vdf pair valid, content root verified. No upload."; exit 0 }

# -- 4) Locate steamcmd and run ----------------------------------------------
$steamcmd = if ($env:STEAMCMD_PATH) { $env:STEAMCMD_PATH } else { Join-Path $PSScriptRoot 'steamcmd\steamcmd.exe' }
if (-not (Test-Path $steamcmd)) {
  Write-Error "steamcmd not found ($steamcmd). Download https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip, extract to tools/steam/steamcmd/ (gitignored), or set STEAMCMD_PATH."
}
if (-not $Username) { Write-Error "Pass -Username <steam_login> for upload (password + Steam Guard prompted interactively)." }
& $steamcmd +login $Username +run_app_build $appVdf +quit
if ($LASTEXITCODE -ne 0) { Write-Error "steamcmd exited $LASTEXITCODE -- see $outDir\logs" }
Write-Host "[push-steam] upload complete. Promote the build to a branch in Steamworks > SteamPipe > Builds."
