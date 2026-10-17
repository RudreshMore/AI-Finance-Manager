# MySQL Backup & Restore Utility for AI Finance Manager (PowerShell)
# Usage:
#   .\scripts\db-backup-restore.ps1 -Action backup -OutputFile ./backup.sql
#   .\scripts\db-backup-restore.ps1 -Action restore -InputFile ./backup.sql

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("backup", "restore")]
    [string]$Action,

    [string]$DbHost = "localhost",
    [int]$DbPort = 3306,
    [string]$DbUser = "root",
    [string]$DbName = "ai_finance_manager",
    [string]$OutputFile = "./backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql",
    [string]$InputFile = ""
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " AI Finance Manager — Database Backup & Recovery Utility" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Action -eq "backup") {
    Write-Host "Starting database backup for '$DbName' on $DbHost:$DbPort..." -ForegroundColor Yellow
    
    # Prompt password securely if not in environment
    $passwordArgs = @()
    if ($env:DB_PASSWORD) {
        $passwordArgs = "--password=$env:DB_PASSWORD"
    } else {
        $passwordArgs = "-p"
    }

    try {
        & mysqldump -h $DbHost -P $DbPort -u $DbUser $passwordArgs --single-transaction --quick --routines --triggers $DbName | Out-File -FilePath $OutputFile -Encoding utf8
        Write-Host "Database backup successfully saved to: $OutputFile" -ForegroundColor Green
    } catch {
        Write-Host "Backup failed: $_" -ForegroundColor Red
        exit 1
    }
}
elseif ($Action -eq "restore") {
    if (-not $InputFile -or -not (Test-Path $InputFile)) {
        Write-Host "Error: Valid InputFile path is required for restore." -ForegroundColor Red
        exit 1
    }

    Write-Host "CAUTION: Restoring will overwrite existing data in '$DbName'!" -ForegroundColor Yellow
    $confirmation = Read-Host "Are you sure you want to proceed? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "Restore operation aborted by user." -ForegroundColor Gray
        exit 0
    }

    $passwordArgs = @()
    if ($env:DB_PASSWORD) {
        $passwordArgs = "--password=$env:DB_PASSWORD"
    } else {
        $passwordArgs = "-p"
    }

    try {
        Get-Content -Path $InputFile -Raw | & mysql -h $DbHost -P $DbPort -u $DbUser $passwordArgs $DbName
        Write-Host "Database successfully restored from: $InputFile" -ForegroundColor Green
    } catch {
        Write-Host "Restore failed: $_" -ForegroundColor Red
        exit 1
    }
}
