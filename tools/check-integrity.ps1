$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$manifest = Join-Path $projectRoot 'SHA256SUMS.txt'
$checked = 0
foreach ($line in Get-Content -LiteralPath $manifest) {
  if (-not $line.Trim()) { continue }
  $expected = $line.Substring(0,64)
  $relative = $line.Substring(66)
  $target = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $relative))
  if (-not $target.StartsWith($projectRoot + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Caminho fora do projeto' }
  $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLower()
  if ($actual -ne $expected) { throw "Arquivo diferente do manifesto: $relative" }
  $checked++
}
Write-Output "$checked arquivos conferidos; SHA-256 correto."
