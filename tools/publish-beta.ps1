# Publish build artifacts to a GitHub Release (ASCII only - PS5.1 safe)
# Usage: .\tools\publish-beta.ps1 -Tag v0.9.0-beta -Files release\NineWinters-Setup.exe, android\app\build\outputs\apk\release\app-release.apk
param(
  [Parameter(Mandatory = $true)][string]$Tag,
  [Parameter(Mandatory = $true)][string[]]$Files,
  [string]$Repo = 'CokeTown/Project-winter',
  [string]$Name = '',
  [string]$Notes = ''
)
$ErrorActionPreference = 'Stop'

# token from git credential store
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
$tok = ($cred | Select-String 'password=(.+)').Matches[0].Groups[1].Value
if (-not $tok) { throw 'no github token in credential store' }
$h = @{ Authorization = "Bearer $tok"; Accept = 'application/vnd.github+json' }

if (-not $Name) { $Name = $Tag }

# create release (or reuse existing)
$rel = $null
try {
  $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/tags/$Tag" -Headers $h
  Write-Host "reusing existing release id=$($rel.id)"
} catch {
  $body = @{ tag_name = $Tag; name = $Name; body = $Notes; prerelease = $true } | ConvertTo-Json
  $rel = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$Repo/releases" -Headers $h -Body $body -ContentType 'application/json'
  Write-Host "created release id=$($rel.id)"
}

foreach ($f in $Files) {
  if (-not (Test-Path $f)) { Write-Warning "missing: $f"; continue }
  $fi = Get-Item $f
  $name = [uri]::EscapeDataString($fi.Name)
  $url = "https://uploads.github.com/repos/$Repo/releases/$($rel.id)/assets?name=$name"
  Write-Host ("uploading {0} ({1:N1} MB)..." -f $fi.Name, ($fi.Length / 1MB))
  Invoke-RestMethod -Method Post -Uri $url -Headers $h -ContentType 'application/octet-stream' -InFile $fi.FullName | Out-Null
  Write-Host "  done"
}
Write-Host "release url: $($rel.html_url)"
