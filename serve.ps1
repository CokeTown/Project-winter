# Project Shelter web MVP static server (no Node/Python required)
# Usage: powershell -ExecutionPolicy Bypass -File serve.ps1  ->  http://localhost:8420
param([int]$Port = 8420)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Project Shelter serving at http://localhost:$Port/  (Ctrl+C to stop)"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".gif"  = "image/gif"
  ".svg"  = "image/svg+xml"
  ".woff" = "font/woff"
  ".woff2" = "font/woff2"
  ".glb"  = "model/gltf-binary"
  ".gltf" = "model/gltf+json"
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq "/") { $path = "/index.html" }
    $file = Join-Path $PSScriptRoot ($path.TrimStart("/") -replace "/", "\")
    if ((Test-Path $file -PathType Leaf) -and ($file.StartsWith($PSScriptRoot))) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  } catch {
    # ignore per-request errors and keep serving
  }
}
