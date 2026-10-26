# Creates the local development database and role for Tessera.
# Usage (from tessera/backend):  powershell -ExecutionPolicy Bypass -File scripts/setup-local-db.ps1
# Reads the postgres superuser password from .local/postgres-superuser.txt
# (or prompts for it). Safe to run more than once.
param(
    [string]$PsqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    [string]$AppPassword = "tessera_dev"
)

$ErrorActionPreference = "Stop"
$secretFile = Join-Path $PSScriptRoot "..\.local\postgres-superuser.txt"
if (Test-Path $secretFile) {
    $env:PGPASSWORD = (Get-Content $secretFile -Raw).Trim()
} else {
    $secure = Read-Host "postgres superuser password" -AsSecureString
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

$roleExists = & $PsqlPath -U postgres -h localhost -tAc "select 1 from pg_roles where rolname = 'tessera'"
if ($roleExists -ne "1") {
    & $PsqlPath -U postgres -h localhost -c "create role tessera login password '$AppPassword'"
}
$dbExists = & $PsqlPath -U postgres -h localhost -tAc "select 1 from pg_database where datname = 'tessera'"
if ($dbExists -ne "1") {
    & $PsqlPath -U postgres -h localhost -c "create database tessera owner tessera"
}
Remove-Item Env:PGPASSWORD
Write-Host "Database 'tessera' and role 'tessera' are ready. Flyway creates the tables when the backend starts."
