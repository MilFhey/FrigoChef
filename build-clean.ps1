# Build Android avec nettoyage complet
# Ce script arrete tous les processus qui pourraient verrouiller les fichiers

Write-Host "`n*** BUILD ANDROID - Nettoyage Complet ***" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Etape 1 : Arreter les processus potentiellement bloquants
Write-Host "Arret des processus potentiellement bloquants..." -ForegroundColor Yellow

$processesToStop = @("java", "gradle", "adb")
foreach ($procName in $processesToStop) {
    $procs = Get-Process -Name $procName -ErrorAction SilentlyContinue
    if ($procs) {
        foreach ($proc in $procs) {
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                Write-Host "   [OK] Arrete: $procName (PID: $($proc.Id))" -ForegroundColor Green
            } catch {
                Write-Host "   [WARN] Impossible d'arreter: $procName" -ForegroundColor Yellow
            }
        }
    }
}

# Arreter les Gradle daemons
Write-Host "`nArret des Gradle daemons..." -ForegroundColor Yellow
try {
    & "platforms\android\gradlew.bat" --stop 2>$null
    Write-Host "   [OK] Gradle daemons arretes" -ForegroundColor Green
} catch {
    Write-Host "   [INFO] Aucun daemon Gradle actif" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

# Etape 2 : Nettoyer les builds precedents
Write-Host "`nNettoyage des builds precedents..." -ForegroundColor Yellow
$buildPaths = @(
    "platforms\android\build",
    "platforms\android\app\build",
    "platforms\android\CordovaLib\build",
    "platforms\android\.gradle"
)

foreach ($path in $buildPaths) {
    if (Test-Path $path) {
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
            Write-Host "   [OK] Supprime: $path" -ForegroundColor Green
        } catch {
            Write-Host "   [WARN] Impossible de supprimer: $path" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   [INFO] Deja propre: $path" -ForegroundColor Gray
    }
}

# Etape 3 : Appliquer les corrections Gradle
Write-Host "`nApplication des corrections Gradle..." -ForegroundColor Yellow

# Fix 1: Barcodescanner
$barcodeFile = "platforms\android\phonegap-plugin-barcodescanner\hellocordova-barcodescanner.gradle"
if (Test-Path $barcodeFile) {
    $content = Get-Content $barcodeFile -Raw
    if ($content -match "compile\(name:'barcodescanner") {
        $content = $content -replace "compile\(name:'barcodescanner-release-2\.1\.5', ext:'aar'\)", "implementation(name:'barcodescanner-release-2.1.5', ext:'aar')"
        Set-Content $barcodeFile $content -NoNewline
        Write-Host "   [OK] compile() remplace par implementation()" -ForegroundColor Green
    } else {
        Write-Host "   [INFO] Barcodescanner deja corrige" -ForegroundColor Gray
    }
}

# Fix 2: compileSdkVersion
$appGradleFile = "platforms\android\app\build.gradle"
if (Test-Path $appGradleFile) {
    $content = Get-Content $appGradleFile -Raw
    if ($content -match "defaultConfig\s*\{[^}]*compileSdkVersion") {
        $content = $content -replace "(namespace\s+cordovaConfig\.PACKAGE_NAMESPACE)(\s*buildFeatures)", "`$1`n    compileSdkVersion cordovaConfig.COMPILE_SDK_VERSION`n`$2"
        $content = $content -replace "(\s+)targetSdkVersion\s+cordovaConfig\.SDK_VERSION(\s+)compileSdkVersion\s+cordovaConfig\.COMPILE_SDK_VERSION", "`$1targetSdkVersion cordovaConfig.SDK_VERSION`$2"
        Set-Content $appGradleFile $content -NoNewline
        Write-Host "   [OK] compileSdkVersion deplace au bon endroit" -ForegroundColor Green
    } else {
        Write-Host "   [INFO] compileSdkVersion deja au bon endroit" -ForegroundColor Gray
    }
}

# Etape 4 : Build Android
Write-Host "`nLancement du build Android..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

cordova build android

$buildSuccess = $LASTEXITCODE -eq 0

# Résumé
Write-Host "`n========================================" -ForegroundColor Cyan

if ($buildSuccess) {
    Write-Host "[SUCCESS] BUILD REUSSI !" -ForegroundColor Green
    Write-Host "`nAPK genere dans:" -ForegroundColor Cyan
    Write-Host "platforms\android\app\build\outputs\apk\debug\app-debug.apk`n" -ForegroundColor White

    # Verifier que l'APK existe
    $apkPath = "platforms\android\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        $apkSize = (Get-Item $apkPath).Length / 1MB
        $sizeRounded = [math]::Round($apkSize, 2)
        Write-Host "Taille de l'APK: $sizeRounded MB" -ForegroundColor Cyan
    }

    Write-Host "`nProchaines etapes:" -ForegroundColor Yellow
    Write-Host "  - cordova run android (lancer sur emulateur)" -ForegroundColor White
    Write-Host "  - adb devices (lister les appareils connectes)" -ForegroundColor White
    Write-Host "  - adb install $apkPath (installer sur device)`n" -ForegroundColor White
} else {
    Write-Host "[ERROR] BUILD ECHOUE" -ForegroundColor Red
    Write-Host "`nConsultez les erreurs ci-dessus.`n" -ForegroundColor Yellow

    Write-Host "Suggestions de depannage:" -ForegroundColor Cyan
    Write-Host "  1. Fermez Android Studio si ouvert" -ForegroundColor White
    Write-Host "  2. Arretez l'emulateur Android" -ForegroundColor White
    Write-Host "  3. Redemarrez votre PC (dernier recours)" -ForegroundColor White
    Write-Host "  4. Consultez ANDROID_BUILD_FIX.md`n" -ForegroundColor White
}

Write-Host "========================================`n" -ForegroundColor Cyan

