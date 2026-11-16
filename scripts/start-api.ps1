param([string]$MavenCommand = 'mvn')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$backendPath = Join-Path $projectRoot 'backend'
$envPath = Join-Path $backendPath '.env'
if (-not (Test-Path -LiteralPath $envPath)) { throw 'Copy backend/.env.example to backend/.env and fill in the server settings.' }
# Parse data, never evaluate shell expressions from .env.
foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match '^\s*([A-Z][A-Z0-9_]*)=(.*)$') {
        $value = $Matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) { $value = $value.Substring(1,$value.Length-2) }
        [Environment]::SetEnvironmentVariable($Matches[1],$value,'Process')
    }
}
foreach ($required in @('SUPABASE_URL','DATABASE_URL','DATABASE_USERNAME','DATABASE_PASSWORD')) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($required,'Process'))) { throw "Missing setting: $required" }
}
Push-Location $backendPath
try { & $MavenCommand '-Dmaven.repo.local=../.local/m2' 'spring-boot:run'; exit $LASTEXITCODE }
finally { Pop-Location }
