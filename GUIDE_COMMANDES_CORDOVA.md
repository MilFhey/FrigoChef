# 🚀 Guide des Commandes Cordova

### 1. Lancer sur Navigateur

```powershell
# Commande simple
cordova run browser

# OU avec build automatique
cordova build browser
cordova run browser
```

**Résultat :** Ouvre l'application dans votre navigateur par défaut

---

### 2. Lancer sur Android (Émulateur)

```powershell
# Build + Run sur émulateur
cordova run android

# OU Build seulement
cordova build android
```

**Résultat :** Lance l'app sur l'émulateur Android

---

### 3. Lancer sur Mobile Physique

```powershell
# Avec mobile connecté en USB
cordova run android --device

# Installer l'APK manuellement
# Voir: INSTALLER_FRIGOCHEF.txt sur le Bureau
```

---

## 🛠️ Commandes Utiles

### Build

```powershell
# Build Android (debug)
cordova build android

# Build Android (release - signé)
cordova build android --release

# Build Browser
cordova build browser
```

### Plateformes

```powershell
# Lister les plateformes installées
cordova platform ls

# Ajouter une plateforme
cordova platform add browser
cordova platform add android

# Supprimer une plateforme
cordova platform remove browser
```

### Plugins

```powershell
# Lister les plugins
cordova plugin ls

# Ajouter un plugin
cordova plugin add cordova-plugin-camera

# Supprimer un plugin
cordova plugin remove cordova-plugin-camera
```

### Nettoyage

```powershell
# Nettoyer les builds
cordova clean

# Nettoyer puis rebuild
cordova clean android
cordova build android
```

---

## 🌐 Tester dans le Navigateur

### Option 1 : Cordova Run (Recommandé)

```powershell
cd C:\Users\bossk\PC\02-PROJETS\ETUDES\M2\ERP\MYFIRSTAPP
cordova run browser
```

**Avantages :**
- ✅ Simule l'environnement Cordova
- ✅ Plugins disponibles (en mode émulation)
- ✅ Auto-reload

---

### Option 2 : Serveur Local Simple

```powershell
# Avec Python (si installé)
cd C:\Users\bossk\PC\02-PROJETS\ETUDES\M2\ERP\MYFIRSTAPP\www
python -m http.server 8000

# Avec Node.js (si installé)
npm install -g http-server
cd C:\Users\bossk\PC\02-PROJETS\ETUDES\M2\ERP\MYFIRSTAPP\www
http-server -p 8000
```

**Puis ouvrir :** `http://localhost:8000`

**Attention :** Plugins Cordova non disponibles avec cette méthode

---

### Option 3 : Live Reload (Développement)

```powershell
# Avec cordova-plugin-browsersync
cordova plugin add cordova-plugin-browsersync
cordova run browser -- --live-reload
```

**Avantage :** Rechargement automatique à chaque modification

---

## 📱 Tester sur Android

### Émulateur

```powershell
# Vérifier que l'émulateur est lancé
adb devices

# Lancer l'app
cordova run android
```

### Mobile Physique

```powershell
# 1. Activer débogage USB sur le mobile
# 2. Connecter en USB
# 3. Vérifier la connexion
adb devices

# 4. Installer
cordova run android --device
```

---

## 🐛 Débuggage

### Logs Android

```powershell
# Voir les logs en temps réel
adb logcat | Select-String "chromium"

# OU
adb logcat *:E  # Erreurs seulement
```

### Logs Browser

```
1. Ouvrir DevTools (F12)
2. Onglet Console
3. Voir les logs JavaScript
```

### Inspecter sur Mobile

```powershell
# 1. Lancer l'app sur mobile
cordova run android --device

# 2. Ouvrir Chrome sur PC
# 3. Aller à : chrome://inspect

# 4. Cliquer sur "Inspect" sous votre app
```

---

## 📋 Récapitulatif

| Action | Commande |
|--------|----------|
| **Tester sur navigateur** | `cordova run browser` |
| **Tester sur émulateur** | `cordova run android` |
| **Build APK** | `cordova build android` |
| **Nettoyer** | `cordova clean` |
| **Lister plateformes** | `cordova platform ls` |
| **Lister plugins** | `cordova plugin ls` |

---

## ⚠️ Erreurs Courantes

### 1. "Cannot find module cordova"

**Cause :** Mauvaise commande (`npx run cordova` au lieu de `cordova`)

**Solution :**
```powershell
# Utiliser directement
cordova run browser

# OU si cordova pas installé globalement
npx cordova run browser
```

---

### 2. "Platform browser not installed"

**Solution :**
```powershell
cordova platform add browser
```

---

### 3. "No emulator found"

**Solution :**
```powershell
# Lancer l'émulateur manuellement depuis Android Studio
# OU
emulator -avd Pixel_4_API_30  # Nom de votre AVD
```

---

### 4. "ANDROID_HOME not set"

**Solution :**
```powershell
# Windows
$env:ANDROID_HOME = "C:\Users\bossk\AppData\Local\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools"
$env:Path += ";$env:ANDROID_HOME\tools"
```

---

## 🎯 Workflow Recommandé

### Développement

```powershell
# 1. Modifier le code dans www/
# 2. Tester rapidement dans navigateur
cordova run browser

# 3. Tester sur émulateur Android
cordova run android
```

### Production

```powershell
# 1. Build final
cordova build android --release

# 2. Signer l'APK (voir doc release)

# 3. Copier sur Bureau
Copy-Item "platforms\android\app\build\outputs\apk\debug\app-debug.apk" "$env:USERPROFILE\Desktop\FrigoChef.apk" -Force
```

---

## 📚 Documentation Officielle

- **Cordova Docs :** https://cordova.apache.org/docs/en/latest/
- **Cordova CLI :** https://cordova.apache.org/docs/en/latest/reference/cordova-cli/
- **Android Platform :** https://cordova.apache.org/docs/en/latest/guide/platforms/android/

---

## ✅ Commande Correcte pour VOUS

**Pour tester l'application dans le navigateur :**

```powershell
cd C:\Users\bossk\PC\02-PROJETS\ETUDES\M2\ERP\MYFIRSTAPP
cordova run browser
```

**L'application s'ouvrira automatiquement dans votre navigateur par défaut !**

---

**Date :** 11 février 2026  
**Projet :** Frigo Chef v2.0

