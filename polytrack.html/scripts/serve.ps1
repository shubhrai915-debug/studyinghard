Param(
  [string]$Host = '127.0.0.1',
  [int]$Port = 8000,
  [switch]$KillExisting
)

# Move to project root (the parent folder of this script)
$repoRoot = (Resolve-Path "$PSScriptRoot/..\").Path
Set-Location $repoRoot
Write-Host "Project root:" $repoRoot

if ($KillExisting) {
  Try { Get-Job -Name server -ErrorAction SilentlyContinue | Stop-Job -ErrorAction SilentlyContinue | Out-Null } Catch {}
  Try { Remove-Job -Name server -Force -ErrorAction SilentlyContinue | Out-Null } Catch {}
}

$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if ($node -and $npm) {
  Write-Host "Building styles..." -ForegroundColor Cyan
  npm run build | Write-Output
  Write-Host "Starting local server... (Host=$Host Port=$Port)" -ForegroundColor Cyan
  npm run serve -- --host $Host --port $Port
} else {
  Write-Warning "Node/npm not found. Falling back to Python http.server"
  Write-Host "Starting python -m http.server $Port --directory `"$repoRoot`"" -ForegroundColor Cyan
  python -m http.server $Port --directory "$repoRoot"
}

