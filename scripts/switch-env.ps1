param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("staging", "production")]
  [string] $Environment
)

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root ".env.$Environment"
$target = Join-Path $root ".env"

if (-not (Test-Path -LiteralPath $source)) {
  Write-Error "Environment file not found: $source"
  exit 1
}

Copy-Item -LiteralPath $source -Destination $target -Force
Write-Host "App environment switched to $Environment."
