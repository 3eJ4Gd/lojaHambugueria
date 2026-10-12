<#
  Servidor estático local para o site Brasa Burger — sem dependências externas.
  Uso:  .\dev-server.ps1 -Port 8080 [-Root .\]
  Depois abra http://localhost:8080/ no navegador.
#>
param(
    [int]$Port = 8080,
    [string]$Root = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path $Root).Path

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.woff2'= 'font/woff2'
    '.woff' = 'font/woff'
    '.txt'  = 'text/plain; charset=utf-8'
    '.md'   = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Brasa Burger dev server: http://localhost:$Port/  (root: $Root)"
Write-Host "Ctrl+C para parar."

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        try {
            $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
            $path = Join-Path $Root $rel

            # Bloqueia acesso fora da raiz
            if (-not $path.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
                $ctx.Response.StatusCode = 403; $ctx.Response.Close(); continue
            }

            if (Test-Path $path -PathType Container) { $path = Join-Path $path 'index.html' }

            if (-not (Test-Path $path -PathType Leaf)) {
                $buf = [Text.Encoding]::UTF8.GetBytes('404 - nao encontrado')
                $ctx.Response.StatusCode = 404
                $ctx.Response.ContentType = 'text/plain; charset=utf-8'
                $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
                $ctx.Response.Close()
                continue
            }

            $ext = [IO.Path]::GetExtension($path).ToLower()
            $data = [IO.File]::ReadAllBytes($path)
            $ctx.Response.StatusCode = 200
            $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' })
            $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
            $ctx.Response.OutputStream.Write($data, 0, $data.Length)
            $ctx.Response.Close()
        }
        catch {
            try { $ctx.Response.StatusCode = 500; $ctx.Response.Close() } catch { }
        }
    }
}
finally {
    $listener.Stop()
    $listener.Close()
}
