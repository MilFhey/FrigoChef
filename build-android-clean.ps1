# Build Android avec nettoyage complet
# Ce script arrête tous les processus qui pourraient verrouiller les fichiers

Write-Host "`n🚀 BUILD ANDROID - Nettoyage Complet" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Étape 1 : Arrêter les processus potentiellement bloquants
Write-Host "⏸️  Arrêt des processus potentiellement bloquants..." -ForegroundColor Yellow

$processesToStop = @("java", "gradle", "adb")
foreach ($procName in $processesToStop) {
    $procs = Get-Process -Name $procName -ErrorAction SilentlyContinue
    if ($procs) {
        $procs | ForEach-Object {
            try {
                Stop-Process -Id $_.Id -Force -ErrorAction Stop
                Write-Host "   ✅ Arrêté: $procName (PID: $($_.Id))" -ForegroundColor Green
            } catch {
                Write-Host "   ⚠️  Impossible d'arrêter: $procName" -ForegroundColor Yellow
            }
        }
    }
}

# Arrêter les Gradle daemons
Write-Host "`n🛑 Arrêt des Gradle daemons..." -ForegroundColor Yellow
try {
    & "platforms\android\gradlew.bat" --stop 2>$null
    Write-Host "   ✅ Gradle daemons arrêtés" -ForegroundColor Green
} catch {
    Write-Host "   ℹ️  Aucun daemon Gradle actif" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

# Étape 2 : Nettoyer les builds précédents
Write-Host "`n🧹 Nettoyage des builds précédents..." -ForegroundColor Yellow
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
            Write-Host "   ✅ Supprimé: $path" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Impossible de supprimer: $path" -ForegroundColor Yellow
            Write-Host "      Raison: $($_.Exception.Message)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ℹ️  Déjà propre: $path" -ForegroundColor Gray
    }
}

# Étape 3 : Appliquer les corrections Gradle
Write-Host "`n🔧 Application des corrections Gradle..." -ForegroundColor Yellow

# Fix 1: Barcodescanner
$barcodeFile = "platforms\android\phonegap-plugin-barcodescanner\hellocordova-barcodescanner.gradle"
if (Test-Path $barcodeFile) {
    $content = Get-Content $barcodeFile -Raw
    if ($content -match "compile\(name:'barcodescanner") {
        $content = $content -replace "compile\(name:'barcodescanner-release-2\.1\.5', ext:'aar'\)", "implementation(name:'barcodescanner-release-2.1.5', ext:'aar')"
        Set-Content $barcodeFile $content -NoNewline
        Write-Host "   ✅ compile() → implementation() [OK]" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  Barcodescanner déjà corrigé" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  Fichier barcodescanner non trouvé" -ForegroundColor Yellow
}

# Fix 2: compileSdkVersion
$appGradleFile = "platforms\android\app\build.gradle"
if (Test-Path $appGradleFile) {
    $content = Get-Content $appGradleFile -Raw
    if ($content -match "defaultConfig\s*\{[^}]*compileSdkVersion") {
        $content = $content -replace "(namespace\s+cordovaConfig\.PACKAGE_NAMESPACE)(\s*buildFeatures)", "`$1`n    compileSdkVersion cordovaConfig.COMPILE_SDK_VERSION`n`$2"
        $content = $content -replace "(\s+)targetSdkVersion\s+cordovaConfig\.SDK_VERSION(\s+)compileSdkVersion\s+cordovaConfig\.COMPILE_SDK_VERSION", "`$1targetSdkVersion cordovaConfig.SDK_VERSION`$2"
        Set-Content $appGradleFile $content -NoNewline
        Write-Host "   ✅ compileSdkVersion déplacé [OK]" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  compileSdkVersion déjà au bon endroit" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ Fichier app/build.gradle non trouvé" -ForegroundColor Red
}

# Étape 4 : Build Android
Write-Host "`n🔨 Lancement du build Android..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

cordova build android

$buildSuccess = $LASTEXITCODE -eq 0

# Résumé
Write-Host "`n========================================" -ForegroundColor Cyan

if ($buildSuccess) {
    Write-Host "✅ BUILD RÉUSSI !" -ForegroundColor Green
    Write-Host "`nAPK généré dans:" -ForegroundColor Cyan
    Write-Host "platforms\android\app\build\outputs\apk\debug\app-debug.apk`n" -ForegroundColor White

    # Vérifier que l'APK existe
    $apkPath = "platforms\android\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $apkPath) {
        $apkSize = (Get-Item $apkPath).Length / 1MB
        Write-Host "📦 Taille de l'APK: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
    }

    Write-Host "`nProchaines étapes:" -ForegroundColor Yellow
    Write-Host "  • cordova run android (lancer sur émulateur)" -ForegroundColor White
    Write-Host "  • adb devices (lister les appareils connectés)" -ForegroundColor White
    Write-Host "  • adb install $apkPath (installer sur device)`n" -ForegroundColor White
} else {
    Write-Host "❌ BUILD ÉCHOUÉ" -ForegroundColor Red
    Write-Host "`nConsultez les erreurs ci-dessus.`n" -ForegroundColor Yellow

    Write-Host "💡 Suggestions de dépannage:" -ForegroundColor Cyan
    Write-Host "  1. Fermez Android Studio si ouvert" -ForegroundColor White
    Write-Host "  2. Arrêtez l'émulateur Android" -ForegroundColor White
    Write-Host "  3. Redémarrez votre PC (dernier recours)" -ForegroundColor White
    Write-Host "  4. Consultez ANDROID_BUILD_FIX.md`n" -ForegroundColor White
}

Write-Host "========================================`n" -ForegroundColor Cyan

