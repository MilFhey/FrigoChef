# 🍳 Frigo Chef - Application Mobile de Suggestions de Recettes

> **Transformez les ingrédients de votre frigo en délicieuses recettes !**

Une application mobile Cordova utilisant l'IA (OpenAI GPT-4) pour suggérer des recettes personnalisées basées sur les ingrédients disponibles, avec calcul nutritionnel complet et fonctionnalités hors ligne.

[![Version](https://img.shields.io/badge/version-2.0.1-blue.svg)](https://github.com/MilFhey/FrigoChef)
[![Platform](https://img.shields.io/badge/platform-Android-green.svg)](https://www.android.com/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

---

## 📱 Aperçu

**Frigo Chef** est une application mobile intelligente qui vous aide à :
- 📸 Analyser le contenu de votre frigo par photo
- 🤖 Générer des recettes personnalisées avec l'IA
- 📊 Calculer les valeurs nutritionnelles complètes
- ⭐ Sauvegarder vos recettes favorites
- 📴 Fonctionner hors ligne avec historique

### Captures d'Écran

```
[Accueil]  →  [Photo Frigo]  →  [Validation Ingrédients]  →  [Recettes + Nutrition]
```

---

## ✨ Fonctionnalités Principales

### 🍽️ Génération de Recettes Intelligente

- **3 Modes de Saisie :**
  - 📸 Photo du frigo (reconnaissance IA)
  - ⌨️ Saisie manuelle des ingrédients
  - 📋 Historique des recettes précédentes

- **Validation Interactive :**
  - Liste modifiable des ingrédients détectés
  - Ajout/suppression d'ingrédients
  - Contrôle total avant génération

- **Recettes Personnalisées :**
  - 2 recettes générées par requête
  - Adaptées aux préférences utilisateur
  - Temps de préparation et difficulté
  - Astuce du chef incluse

### 📊 Analyse Nutritionnelle Complète

- **Macronutriments :**
  - Calories
  - Protéines, Glucides, Lipides
  - Fibres, Sucres, Sodium

- **Micronutriments :**
  - Top 4 vitamines & minéraux
  - % des Apports Journaliers Recommandés (AJR)
  - Valeurs exactes affichées

- **Index Glycémique :**
  - Estimation (Faible / Modéré / Élevé)
  - Explication contextuelle

- **Base de Données :**
  - **100 aliments locaux** (USDA, ANSES)
  - **+2M produits** via OpenFoodFacts (fallback)
  - Cache intelligent pour performances

### 🎯 Fonctionnalités Avancées

- **Gestion de Portions :**
  - Ajustement dynamique des quantités
  - Calcul automatique des calories/portion

- **Liste de Courses :**
  - Ajout d'ingrédients d'un clic
  - Gestion de catégories
  - Export/partage

- **Favoris :**
  - Sauvegarde des recettes préférées
  - Accès hors ligne
  - Synchronisation locale

- **Minuteurs Intégrés :**
  - Détection automatique des temps de cuisson
  - Notifications sonores
  - Multi-minuteurs simultanés

- **Partage :**
  - Export recette (texte formaté)
  - Partage via apps natives

### 📴 Mode Hors Ligne

- Historique des 10 dernières recettes
- Base nutritionnelle locale (100 aliments)
- Favoris accessibles sans internet
- Indication claire du statut

---

## 🛠️ Technologies Utilisées

### Frontend
- **Apache Cordova** 12.0.0 - Framework mobile hybride
- **HTML5 / CSS3 / JavaScript ES6+** - Interface utilisateur
- **Vanilla JS** - Pas de framework lourd, performances optimales

### Backend / APIs
- **OpenAI GPT-4 Turbo** - Génération de recettes IA
- **OpenFoodFacts API** - Base nutritionnelle (fallback)
- **USDA / ANSES** - Données nutritionnelles locales

### Plugins Cordova
- `cordova-plugin-camera` - Prise de photo ✅ (frigo + assiette)
- `cordova-plugin-device` - Informations appareil ✅
- `cordova-plugin-geolocation` - Localisation ✅
- `cordova-plugin-network-information` - Détection connexion ✅
- `cordova-plugin-splashscreen` - Écran de démarrage ✅
- `phonegap-plugin-barcodescanner` - Scan code-barres ✅ (analyse produits)

### Outils de Développement
- **Node.js** 24.6.0
- **npm** - Gestion des dépendances
- **Android SDK** - Build Android
- **Gradle** 8.13 - Build system Android

---

## 📦 Installation

### Prérequis

```bash
# Node.js & npm
node -v  # v24.6.0+
npm -v   # v10+

# Cordova CLI
npm install -g cordova

# Android SDK (pour build Android)
# Télécharger depuis https://developer.android.com/studio
```

### Variables d'Environnement (Windows)

```powershell
# Android SDK
$env:ANDROID_HOME = "C:\Users\[USER]\AppData\Local\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools"
$env:Path += ";$env:ANDROID_HOME\tools"

# Java JDK
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
```

### Clonage du Projet

```bash
git clone https://github.com/MilFhey/FrigoChef.git
cd FrigoChef
```

### Installation des Dépendances

```bash
# Dépendances npm
npm install

# Restaurer les plateformes Cordova
cordova platform add android
cordova platform add browser

# Restaurer les plugins
cordova plugin add cordova-plugin-camera
cordova plugin add cordova-plugin-device
cordova plugin add cordova-plugin-geolocation
cordova plugin add cordova-plugin-network-information
cordova plugin add cordova-plugin-splashscreen
cordova plugin add phonegap-plugin-barcodescanner
```

### Configuration de la Clé API OpenAI

**⚠️ IMPORTANT :** L'application nécessite une clé API OpenAI pour fonctionner.

1. Obtenez une clé API sur [platform.openai.com](https://platform.openai.com/)
2. Ouvrez `www/js/index.js`
3. Remplacez la clé à la ligne ~9 :

```javascript
const OPENAI_API_KEY = "VOTRE_CLE_API_ICI";
```

**💡 Sécurité :** Pour la production, utilisez une solution backend pour protéger votre clé API.

---

## 🚀 Utilisation

### Développement - Navigateur

```bash
# Lancer dans le navigateur
cordova run browser

# Avec live reload (si plugin installé)
cordova run browser -- --live-reload
```

Ouvre l'application sur `http://localhost:8000`

### Développement - Émulateur Android

```bash
# Lancer l'émulateur Android Studio
# Puis :
cordova run android
```

### Build Production

```bash
# Build debug
cordova build android

# Build release (nécessite signature)
cordova build android --release

# APK généré dans :
# platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

### Installation sur Mobile

**Méthode 1 : Via câble USB**
```bash
# Activer débogage USB sur le mobile
# Connecter en USB
adb devices
cordova run android --device
```

**Méthode 2 : APK manuel**
1. Copier `platforms/android/app/build/outputs/apk/debug/app-debug.apk`
2. Transférer sur le mobile
3. Installer (autoriser sources inconnues)

**Script automatique fourni :**
```bash
.\install-on-phone.ps1
```

---

## 📖 Guide d'Utilisation

### Première Utilisation

1. **Lancer l'application**
2. **Choisir une méthode de saisie :**
   - Photo du frigo
   - Saisie manuelle
   - Historique

3. **Valider les ingrédients :**
   - Vérifier la liste détectée
   - Ajouter/supprimer si nécessaire
   - Cliquer "Valider et générer"

4. **Découvrir vos recettes :**
   - 2 recettes adaptées
   - Valeurs nutritionnelles complètes
   - Ajuster les portions
   - Sauvegarder en favoris

### Fonctionnalités Détaillées

**Ajustement des Portions :**
- Cliquez sur +/- à côté de "Portions"
- Quantités et calories s'ajustent automatiquement

**Minuteurs de Cuisson :**
- Détection automatique des temps ("cuire 20 minutes")
- Clic sur l'icône ⏱️ pour démarrer
- Notification sonore en fin de cuisson

**Liste de Courses :**
- Clic sur "+" à côté d'un ingrédient
- Accès via menu "Liste"
- Cocher les articles achetés

**Favoris :**
- Clic sur ❤️ pour sauvegarder
- Accès via onglet "Favoris"
- Disponible hors ligne

---

## 📊 Architecture du Projet

### Structure des Fichiers

```
MYFIRSTAPP/
├── www/                          # Sources de l'application
│   ├── index.html               # Page principale
│   ├── css/
│   │   └── index.css            # Styles complets (~1400 lignes)
│   ├── js/
│   │   ├── index.js             # Logique principale (~2500 lignes)
│   │   ├── nutrition.js         # Calcul nutritionnel
│   │   ├── openfoodfacts.js     # API OpenFoodFacts
│   │   └── food_db.json         # Base nutritionnelle (100 aliments)
│   └── img/                     # Images et logos
│
├── platforms/                    # Plateformes natives
│   ├── android/                 # Build Android
│   └── browser/                 # Build navigateur
│
├── plugins/                      # Plugins Cordova
│   ├── cordova-plugin-camera/
│   ├── cordova-plugin-device/
│   └── ...
│
├── config.xml                    # Configuration Cordova
├── package.json                  # Dépendances npm
│
└── docs/                         # Documentation
    ├── ENRICHISSEMENT_50_ALIMENTS.md
    ├── INTEGRATION_OPENFOODFACTS_COMPLETE.md
    ├── CORRECTION_SODIUM.md
    ├── GUIDE_COMMANDES_CORDOVA.md
    └── SOURCES_NUTRITION.md
```

### Modules Principaux

**`index.js` - Contrôleur Principal**
- Gestion de l'interface utilisateur
- Appels API OpenAI
- Gestion de l'historique et favoris
- Événements et interactions

**`nutrition.js` - Module Nutritionnel**
- Calcul des valeurs nutritionnelles
- Recherche dans base locale (100 aliments)
- Fallback OpenFoodFacts
- Estimation index glycémique
- Cache intelligent

**`openfoodfacts.js` - API OpenFoodFacts**
- Recherche de produits
- Scan code-barres
- Mapping données nutritionnelles

**`food_db.json` - Base Nutritionnelle**
- 100 aliments de base
- Valeurs USDA / ANSES
- Format standardisé

---

## 🗄️ Base de Données Nutritionnelle

### 100 Aliments Locaux

**Catégories :**
- 🥩 Protéines (12) : Poulet, Bœuf, Dinde, Porc, Agneau, Saumon, Thon, etc.
- 🌾 Céréales (11) : Riz, Pâtes, Pain, Quinoa, Boulgour, etc.
- 🫘 Légumineuses (4) : Lentilles, Pois chiches, Haricots rouges, Tofu
- 🥕 Légumes (25) : Tomate, Carotte, Courgette, Poivron, etc.
- 🍎 Fruits (18) : Banane, Pomme, Orange, Kiwi, Mangue, etc.
- 🥜 Oléagineux (5) : Amandes, Noix, Noisettes, Noix de coco
- 🥛 Laitiers (3) : Lait, Fromage, Yaourt
- 🧈 Matières grasses (4) : Huile d'olive, Beurre, Crème
- 🌿 Aromates (13) : Ail, Basilic, Curry, Cumin, etc.
- 🥫 Condiments (9) : Miel, Sauce soja, Moutarde, etc.

### Fallback OpenFoodFacts

**+2 millions de produits** accessibles en ligne :
- Produits industriels
- Marques spécifiques
- Produits internationaux
- Cache automatique des résultats

### Taux de Couverture

- Recettes simples : **95-100%** ✅
- Recettes moyennes : **90-95%** ✅
- Recettes complexes : **85-90%** ✅

---

## 🎨 Interface Utilisateur

### Design

- **Material Design** inspiré
- **Responsive** - S'adapte aux écrans
- **Animations fluides** - Transitions CSS
- **Thème vert nature** - Cohérent avec la cuisine

### Composants Clés

**Cartes de Recettes :**
- Header avec nom et tags
- Contrôle de portions
- Liste d'ingrédients cochable
- Étapes numérotées
- Minuteurs intégrés
- Carte nutritionnelle
- Actions (favoris, partage)

**Navigation :**
- Onglets principaux (Accueil, Favoris, Historique)
- Menu latéral (Liste de courses, Paramètres)
- Fil d'Ariane contextuel

**Feedback Utilisateur :**
- Toasts de notification
- Indicateurs de chargement
- Messages d'erreur clairs
- Mode hors ligne visible

---

## 🔐 Sécurité & Confidentialité

### Données Locales

- **Historique** : Stocké localement (localStorage)
- **Favoris** : Stocké localement
- **Cache** : En mémoire (session)
- **Aucune donnée** envoyée à des serveurs tiers (sauf OpenAI/OpenFoodFacts)

### API OpenAI

- Clé API stockée dans le code (⚠️ À sécuriser en production)
- Requêtes HTTPS
- Pas de stockage des conversations
- Données anonymes

### Permissions Android

```xml
<!-- Caméra pour photo du frigo -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Stockage pour photos -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- Internet pour API -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Réseau pour détection hors ligne -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

---

## 🧪 Tests

### Tests Manuels Recommandés

**Test 1 : Génération Recette Basique**
```
1. Saisir "poulet, riz, tomate"
2. Valider
3. Vérifier 2 recettes générées
4. Vérifier valeurs nutritionnelles
```

**Test 2 : Ajustement Portions**
```
1. Générer une recette
2. Cliquer sur + pour augmenter portions
3. Vérifier quantités et calories ajustées
```

**Test 3 : Mode Hors Ligne**
```
1. Activer mode avion
2. Accéder à l'historique
3. Vérifier recettes disponibles
4. Vérifier indication "hors ligne"
```

**Test 4 : Favoris**
```
1. Générer une recette
2. Cliquer sur ❤️
3. Aller dans onglet Favoris
4. Vérifier recette sauvegardée
```

**Test 5 : Nutrition OpenFoodFacts**
```
1. Saisir "pâtes, parmesan"
2. Vérifier logs console
3. Confirmer recherche OpenFoodFacts pour parmesan
4. Vérifier valeurs nutritionnelles cohérentes
```

### Débuggage

**Console Browser (F12) :**
```javascript
// Logs de nutrition
✅ Trouvé en local: poulet
🔍 Recherche OpenFoodFacts: parmesan
✅ Trouvé sur OpenFoodFacts: parmesan

// Warnings
⚠️ OpenFoodFacts: Sodium suspect (1200 g), conversion mg → g
```

**Logs Android :**
```bash
adb logcat | Select-String "chromium"
```

**Remote Debugging :**
```
1. Lancer app sur mobile
2. Chrome sur PC → chrome://inspect
3. Cliquer "Inspect"
```

---

## 🐛 Problèmes Connus & Solutions

### Erreur : "Cannot find module cordova"

**Cause :** Mauvaise commande
```bash
# ❌ Incorrect
npx run cordova browser

# ✅ Correct
cordova run browser
```

### Sodium Très Élevé (>10000mg)

**Cause :** Incohérence OpenFoodFacts (mg vs g)
**Solution :** Correction automatique en v2.0.1
**Détails :** Voir `CORRECTION_SODIUM.md`

### Build Android Échoue

**Vérifications :**
```bash
# Java JDK installé ?
java -version

# Android SDK configuré ?
echo $env:ANDROID_HOME

# Gradle accessible ?
gradle -v
```

**Solution :** Voir `ANDROID_BUILD_FIX.md`

### Plugins Cordova Manquants

```bash
# Réinstaller tous les plugins
cordova plugin ls
cordova plugin add [plugin-name]
```

---

## ❓ FAQ - Questions Fréquentes

### Comment fonctionne le scan code-barres ?

**Oui, c'est implémenté !** Le scan code-barres est **fonctionnel** dans la v2.0.1.

**Comment l'utiliser :**
1. Accéder au mode "Analyse"
2. Choisir "Analyser un produit"
3. Scanner le code-barres
4. Obtenir infos nutritionnelles via OpenFoodFacts

**Fonctionnalités :**
- ✅ Scan avec caméra
- ✅ Récupération données OpenFoodFacts
- ✅ Affichage nutrition complète
- ✅ Cache des résultats

### L'analyse d'assiette fonctionne-t-elle ?

**Oui !** L'analyse d'assiette est **implémentée** et fonctionnelle.

**Comment l'utiliser :**
1. Accéder au mode "Analyse"
2. Choisir "Analyser une assiette"
3. Prendre une photo de votre plat
4. L'IA estime les aliments et quantités
5. Calcul nutritionnel automatique

**Note :** Les estimations sont approximatives (basées sur vision IA).

### OpenFoodFacts est-il utilisé ?

**Oui, pleinement intégré !** OpenFoodFacts est utilisé de **deux manières** :

**1. Fallback nutritionnel :**
- Recherche ingrédients manquants dans la base locale
- +2M produits accessibles
- Cache intelligent

**2. Scan code-barres :**
- Analyse de produits industriels
- Données nutritionnelles complètes
- Nutri-Score (si disponible dans API)

**Ce qui fonctionne :**
- ✅ Scan code-barres
- ✅ Recherche produits
- ✅ Données nutritionnelles
- ✅ Cache résultats
- ✅ Fallback intelligent

### Quelles sont les prochaines améliorations ?

**v2.2+ prévu :**
- Nutri-Score et NOVA **visuels** améliorés
- Profils utilisateurs personnalisés
- Objectifs nutritionnels
- Tracking journalier
- Backend sécurisé
- Sync cloud

### Comment contribuer ?

Consultez `CONTRIBUTING.md` pour le processus complet. Toutes les contributions sont bienvenues !

---

## 📈 Roadmap / Améliorations Futures

> **✅ Note :** L'analyse d'assiette et le scan code-barres sont **déjà implémentés** en v2.0.1

### Version 2.2 (Prévue Q2 2026)

**Profils & Personnalisation :**
- [ ] Profils utilisateurs (objectifs nutritionnels)
- [ ] Suggestions basées sur objectifs personnels
- [ ] Filtres alimentaires avancés (végétarien, vegan, sans gluten, halal, etc.)
- [ ] Gestion des allergies et intolérances

**Tracking & Statistiques :**
- [ ] Journal alimentaire quotidien
- [ ] Historique nutritionnel hebdo/mensuel
- [ ] Graphiques et tendances
- [ ] Rappels et notifications

### Version 2.5 (Prévue Q3 2026)

**Social & Partage :**
- [ ] Partage de recettes communautaire
- [ ] Notation et commentaires
- [ ] Profils publics
- [ ] Collections de recettes

**Planning :**
- [ ] Planificateur de menus hebdomadaires
- [ ] Génération automatique liste de courses
- [ ] Intégration calendrier

### Version 3.0 (Prévue Q4 2026)

**Backend & Infrastructure :**
- [ ] Backend Node.js sécurisé
- [ ] Base de données cloud (Firebase/MongoDB)
- [ ] Synchronisation multi-devices
- [ ] API REST publique

**Plateformes :**
- [ ] Version iOS
- [ ] Progressive Web App (PWA)
- [ ] Extension navigateur

**Qualité & Tests :**
- [ ] Tests unitaires (Jest)
- [ ] Tests E2E (Appium)
- [ ] CI/CD (GitHub Actions)
- [ ] Monitoring et analytics

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment participer :

### Processus

1. **Fork** le projet
2. **Créer une branche** (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir une Pull Request**

### Guidelines

- Code en **JavaScript ES6+**
- Commentaires en **français**
- Respecter la structure existante
- Tester avant de commit
- Documenter les nouvelles fonctionnalités

### Ajouter des Aliments à la Base

**Format `food_db.json` :**
```json
{
  "name": "nom_aliment",
  "aliases": ["alias1", "alias2"],
  "per100g": {
    "calories": 0,
    "proteines": 0,
    "glucides": 0,
    "lipides": 0,
    "fibres": 0,
    "sucres": 0,
    "sodium": 0,
    "vitamines": {
      "C": 0,  // mg (sauf A, D, K, B9, B12 en µg)
    },
    "mineraux": {
      "calcium": 0,  // mg (sauf selenium en µg)
    }
  },
  "gi": "low|medium|high"
}
```

**Sources recommandées :**
- USDA FoodData Central
- Table Ciqual (ANSES)

---

## 📝 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

```
MIT License

Copyright (c) 2026 Frigo Chef

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

[...]
```

---

## 👥 Auteurs & Remerciements

### Développement
- **Développeur Principal** - [MilFhey](https://github.com/MilFhey)

### Remerciements
- **OpenAI** - GPT-4 Turbo API
- **OpenFoodFacts** - Base de données nutritionnelle
- **USDA** - Données nutritionnelles
- **ANSES** - Table Ciqual
- **Apache Cordova** - Framework mobile
- **Communauté Open Source**

---

## 📞 Contact & Support

### Issues GitHub
Pour les bugs et demandes de fonctionnalités :
[https://github.com/MilFhey/FrigoChef/issues](https://github.com/MilFhey/FrigoChef/issues)

### Documentation
- **Guide Complet** : Ce README
- **Guide Commandes** : `GUIDE_COMMANDES_CORDOVA.md`
- **Nutrition** : `SOURCES_NUTRITION.md`
- **Corrections** : `CORRECTION_SODIUM.md`, `CORRECTIONS_NUTRITION.md`

### Communauté
- **Discussions** : GitHub Discussions
- **Wiki** : [Wiki du projet](https://github.com/MilFhey/FrigoChef/wiki)

---

## 📊 Statistiques du Projet

```
Lignes de Code Total  : ~5,500
  - JavaScript        : ~3,000
  - CSS               : ~1,400
  - HTML              : ~300
  - JSON              : ~800

Fichiers              : ~50
Commits               : 35+
Taille Projet         : ~15 MB
Taille APK            : ~8 MB
```

---

## 🎯 État du Projet

**Version Actuelle :** v2.0.1  
**Status :** ✅ Production Ready - Application Complète  
**Dernière Mise à Jour :** 11 février 2026  

### ✅ Fonctionnalités Implémentées

**Génération de Recettes :**
- ✅ Photo frigo → Détection IA (GPT-4 Vision)
- ✅ Saisie manuelle d'ingrédients
- ✅ Validation interactive avant génération
- ✅ 2 recettes personnalisées par requête
- ✅ Minuteurs de cuisson automatiques
- ✅ Partage de recettes

**Analyse Nutritionnelle Complète :**
- ✅ **Analyse d'assiette** (photo → estimation nutrition) ⭐ **IMPLÉMENTÉ**
- ✅ **Scan code-barres** (produits via OpenFoodFacts) ⭐ **IMPLÉMENTÉ**
- ✅ Calcul nutritionnel (100 aliments + 2M produits OpenFoodFacts)
- ✅ Macronutriments complets
- ✅ Micronutriments (vitamines & minéraux + % AJR)
- ✅ Index glycémique estimé
- ✅ Cache intelligent
- ✅ Correction sodium automatique

**Gestion Utilisateur :**
- ✅ Gestion portions dynamique
- ✅ Favoris (localStorage)
- ✅ Historique (10 dernières recettes)
- ✅ Liste de courses
- ✅ Mode hors ligne complet

### 🚧 Améliorations Futures (v2.2+)

**Profils & Personnalisation :**
- 🚧 Profils utilisateurs (objectifs nutritionnels)
- 🚧 Tracking nutritionnel journalier
- 🚧 Filtres avancés (vegan, halal, allergies)
- 🚧 Graphiques nutritionnels interactifs

**Infrastructure :**
- 🚧 Backend Node.js sécurisé
- 🚧 Base de données cloud (sync multi-devices)
- 🚧 Version iOS
- 🚧 Tests automatisés (Jest, Appium)

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/MilFhey/FrigoChef.git
cd FrigoChef

# Install
npm install
cordova platform add android

# Configure OpenAI API Key
# Éditer www/js/index.js ligne 9

# Run
cordova run browser  # Navigateur
# OU
cordova run android  # Émulateur Android
```

---

## 🌟 Fonctionnalités Uniques

**Ce qui rend Frigo Chef unique :**

1. **IA Contextuelle** - Recettes adaptées à VOS ingrédients
2. **Nutrition Complète** - 100 aliments + 2M produits
3. **Validation Intelligente** - Contrôle avant génération
4. **Hors Ligne** - Fonctionne sans internet
5. **Cache Intelligent** - Performances optimales
6. **Minuteurs Intégrés** - Détection automatique
7. **Open Source** - Code transparent et modifiable

---

**Transformez votre frigo en source d'inspiration culinaire ! 🍳**

---

*Made with ❤️ and 🤖 AI*
