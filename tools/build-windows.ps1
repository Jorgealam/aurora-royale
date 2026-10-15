param([string]$RuntimeZip)
$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$buildRoot = Join-Path $projectRoot '.build'
$runtimeRoot = Join-Path $buildRoot 'electron'
$windowsRoot = Join-Path $projectRoot 'Windows'
$version = '44.7.0'
$expectedHash = 'eee30dc8fa1f5ea95490e59f44e46ea68dd24c6e93d22facf70fe5c2d4c2665c'
New-Item -ItemType Directory -Force -Path $buildRoot,$runtimeRoot,$windowsRoot | Out-Null
if (-not $RuntimeZip) {
  $RuntimeZip = Join-Path $buildRoot 'electron-win64.zip'
  if (-not (Test-Path -LiteralPath $RuntimeZip)) {
    Invoke-WebRequest -Uri "https://github.com/electron/electron/releases/download/v$version/electron-v$version-win32-x64.zip" -OutFile $RuntimeZip
  }
}
$actualHash = (Get-FileHash -LiteralPath $RuntimeZip -Algorithm SHA256).Hash.ToLower()
if ($actualHash -ne $expectedHash) { throw 'O SHA-256 do runtime difere do release oficial. Empacotamento cancelado.' }
if (Get-Command tar.exe -ErrorAction SilentlyContinue) { & tar.exe -xf $RuntimeZip -C $runtimeRoot; if ($LASTEXITCODE) { throw 'Falha na extracao do Electron' } }
else { Expand-Archive -LiteralPath $RuntimeZip -DestinationPath $runtimeRoot -Force }
Get-ChildItem -LiteralPath $runtimeRoot | Copy-Item -Destination $windowsRoot -Recurse -Force
Move-Item -LiteralPath (Join-Path $windowsRoot 'electron.exe') -Destination (Join-Path $windowsRoot 'AuroraRoyale.exe') -Force
$appRoot = Join-Path $windowsRoot 'resources\app'
New-Item -ItemType Directory -Force -Path $appRoot | Out-Null
foreach ($folder in @('game','tests','tools')) { Copy-Item -LiteralPath (Join-Path $projectRoot $folder) -Destination $appRoot -Recurse -Force }
foreach ($file in @('main.cjs','package.json')) { Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $appRoot -Force }
Write-Output "Aplicativo portatil criado em $windowsRoot\AuroraRoyale.exe"
