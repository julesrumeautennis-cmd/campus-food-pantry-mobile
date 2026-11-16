param([string]$JavaBin = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$compiler = if ($JavaBin) { Join-Path $JavaBin 'javac.exe' } else { 'javac' }
$runtime = if ($JavaBin) { Join-Path $JavaBin 'java.exe' } else { 'java' }
$originalOutput = Join-Path $root '.local/legacy-classes'
$adapterOutput = Join-Path $root '.local/domain-classes'
New-Item -ItemType Directory -Force $originalOutput,$adapterOutput | Out-Null
$original = Get-ChildItem (Join-Path $root 'legacy-console') -Filter '*.java' | ForEach-Object FullName
& $compiler -encoding UTF-8 -d $originalOutput $original (Join-Path $root 'legacy-console/tests/RegressionTests.java')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $runtime -cp $originalOutput RegressionTests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$domain = Get-ChildItem (Join-Path $root 'backend/src/main/java/edu/roosevelt/pantry/domain') -Filter '*.java' | ForEach-Object FullName
& $compiler --release 21 -encoding UTF-8 -d $adapterOutput $domain (Join-Path $root 'backend/src/test/java/edu/roosevelt/pantry/DomainAdapterChecks.java')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $runtime -cp $adapterOutput edu.roosevelt.pantry.DomainAdapterChecks
exit $LASTEXITCODE
