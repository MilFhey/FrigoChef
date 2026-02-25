 BUILD ANDROID - Solution Finale
# Arrete Android Studio et build

Write-Host "`n=== BUILD ANDROID - Solution Finale ===" -ForegroundColor Cyan

# 1. Arreter Android Studio
Write-Host "`n[1/4] Arret d'Android Studio..." -ForegroundColor Yellow
$androidStudioProcesses = Get-Process | Where-Object {$_.Path -like "*Android Studio*" -or $_.ProcessName -eq "studio64"}
if ($androidStudioProcesses) {
    $androidStudioProcesses | Stop-Process -Force
    Write-Host "   [OK] Android Studio arrete" -ForegroundColor Green
} else {
    Write-Host "   [INFO] Android Studio n'etait pas lance" -ForegroundColor Gray
}

# 2. Arreter tous les processus Java (Gradle, etc.)
Write-Host "`n[2/4] Arret des processus Java..." -ForegroundColor Yellow
$javaProcesses = Get-Process | Where-Object {$_.Path -like "*java*" -or $_.ProcessName -like "*java*"}
if ($javaProcesses) {
    $javaProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "   [OK] Processus Java arretes ($($javaProcesses.Count))" -ForegroundColor Green
} else {
    Write-Host "   [INFO] Aucun processus Java actif" -ForegroundColor Gray
}

Start-Sleep -Seconds 3

# 3. Nettoyer les builds
Write-Host "`n[3/4] Nettoyage..." -ForegroundColor Yellow
$buildPaths = @(
    "platforms\android\build",
    "platforms\android\app\build",
    "platforms\android\CordovaLib\build"
)

foreach ($path in $buildPaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        Write-Host "   [OK] Supprime: $path" -ForegroundColor Green
    }
}

# 4. Build
Write-Host "`n[4/4] Build Android..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

cordova build android

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "[SUCCESS] BUILD REUSSI !" -ForegroundColor Green

    $apkPath = "platforms\android\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        $size = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
        Write-Host "`nAPK: $apkPath" -ForegroundColor White
        Write-Host "Taille: $size MB`n" -ForegroundColor White
    }
} else {
    Write-Host "`n[ERROR] BUILD ECHOUE" -ForegroundColor Red
    Write-Host "Verifiez les erreurs ci-dessus.`n" -ForegroundColor Yellow
}

