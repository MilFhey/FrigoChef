# 📱 Frigo Chef - Fiche Application Complète

**Version :** 2.0.1  
**Date :** 11 février 2026  
**Plateforme :** Android (Cordova)  
**Type :** Application Mobile Hybride  

---

## 📖 Table des Matières

1. [Contexte du Projet](#contexte-du-projet)
2. [Fonctionnalités Implémentées](#fonctionnalités-implémentées)
3. [Guide d'Utilisation Complet](#guide-dutilisation-complet)
4. [Architecture Technique](#architecture-technique)
5. [Base de Données Nutritionnelle](#base-de-données-nutritionnelle)
6. [Installation](#installation)
7. [Dépannage](#dépannage)

---

## 🎯 Contexte du Projet

### Origine et Objectif

**Problème Résolu :**
> Comment transformer les ingrédients disponibles dans son frigo en recettes délicieuses, tout en ayant des informations nutritionnelles complètes ?

**Public Cible :**
- Personnes souhaitant réduire le gaspillage alimentaire
- Utilisateurs soucieux de leur nutrition
- Personnes manquant d'inspiration culinaire
- Étudiants et personnes actives (peu de temps)

### Valeur Ajoutée

**Frigo Chef se distingue par :**

1. **Intelligence Artificielle** : Utilisation de GPT-4 pour des recettes personnalisées
2. **Nutrition Complète** : 100 aliments + 2M produits (OpenFoodFacts)
3. **Validation Utilisateur** : Contrôle total sur les ingrédients avant génération
4. **Multi-Modes** : Photo frigo, saisie manuelle, analyse assiette, scan code-barres
5. **Hors Ligne** : Fonctionne sans internet (historique + base locale)

### Technologie Choisie

**Cordova (Hybride) plutôt que Native**

**Avantages :**
- ✅ Développement rapide (HTML/CSS/JS)
- ✅ Multi-plateformes (Android + iOS future)
- ✅ Pas besoin de Swift/Kotlin
- ✅ Plugins riches (caméra, barcodescanner)
- ✅ Maintenance simplifiée

**Inconvénients Acceptés :**
- ⚠️ Performances légèrement inférieures (acceptable pour notre usage)
- ⚠️ Taille APK un peu plus grande (~8MB)

---

## ✨ Fonctionnalités Implémentées

### 1️⃣ Génération de Recettes Intelligente

#### A. Mode "Photo du Frigo" 📸
**Fonctionnement :**
1. Utilisateur prend une photo de son frigo
2. GPT-4 Vision détecte les ingrédients visibles
3. Affichage d'un écran de validation
4. Utilisateur peut modifier/ajouter/supprimer des ingrédients
5. Génération de 2 recettes adaptées

**Détails Techniques :**
- API : OpenAI GPT-4 Turbo with Vision
- Format : Base64 image
- Prompt optimisé pour détecter ingrédients + quantités estimées
- Badge de confiance (haute/moyenne/faible)

**Code Clé :**
```javascript
// www/js/index.js - ligne ~800
async function detectIngredientsOnly(imageData) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Détecte les ingrédients...' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageData}` }}
        ]
      }],
      max_tokens: 500
    })
  });
  // ...parsing JSON
}
```

#### B. Mode "Saisie Manuelle" ⌨️
**Fonctionnement :**
1. Utilisateur saisit les ingrédients (séparés par virgules)
2. Exemple : "poulet, riz, tomate, oignon"
3. Validation automatique (passage à l'écran de confirmation)
4. Génération de 2 recettes

**Avantage :** Rapide si on connaît déjà ses ingrédients

#### C. Mode "Historique" 📜
**Fonctionnement :**
1. Affichage des 10 dernières recettes générées
2. Clic sur une recette → Réaffichage
3. Stockage : localStorage (JSON)

**Persistance :**
- Survit à la fermeture de l'app
- Limité à 10 pour performance
- Affichage "hors ligne" si pas de connexion

### 2️⃣ Analyse Nutritionnelle Avancée

#### A. Calcul Nutritionnel par Recette 📊

**Fonctionnement :**
1. Pour chaque ingrédient de la recette, extraction de la quantité
2. Recherche dans base locale (100 aliments)
3. Si non trouvé → Fallback OpenFoodFacts API
4. Calcul des totaux (somme pondérée)
5. Division par nombre de portions
6. Affichage complet

**Nutriments Calculés :**

**Macronutriments :**
- Calories (kcal)
- Protéines (g)
- Glucides (g)
- Lipides (g)
- Fibres (g)
- Sucres (g)
- Sodium (mg)

**Micronutriments :**
- Top 4 Vitamines (A, C, D, E, K, B-complexe)
- Top 4 Minéraux (Calcium, Fer, Magnesium, Potassium, Zinc, Selenium)
- % AJR (Apports Journaliers Recommandés)

**Index Glycémique :**
- Estimation : Faible / Modéré / Élevé
- Basé sur ingrédient principal glucidique

**Code Clé :**
```javascript
// www/js/nutrition.js - ligne ~200
async function calculateRecipeNutrition(ingredients, servings = 2) {
  const totals = { calories: 0, proteines: 0, ... };
  
  for (const ing of ingredients) {
    // 1. Recherche locale
    const food = await findFoodWithFallback(ing);
    
    if (!food) {
      missingIngredients.push(ing);
      continue;
    }
    
    // 2. Extraction quantité (100g, 200ml, etc.)
    const grams = parseIngredientQuantity(ing);
    const ratio = grams / 100;
    
    // 3. Calcul pondéré
    totals.calories += (food.per100g.calories || 0) * ratio;
    // ...autres nutriments
  }
  
  // 4. Division par portions
  return {
    perServing: {
      calories: Math.round(totals.calories / servings),
      // ...
    },
    missingIngredients
  };
}
```

#### B. Mode "Analyse d'Assiette" 📷 ⭐

**Fonctionnement :**
1. Utilisateur prend une photo de son assiette
2. GPT-4 Vision détecte les aliments + estime les quantités
3. Calcul nutritionnel automatique
4. Affichage avec disclaimer "estimation approximative"

**Cas d'Usage :**
- Restaurant : vérifier nutrition d'un plat
- Suivi alimentaire : journal de repas
- Curiosité : "combien de calories dans cette assiette ?"

**Précision :**
- ⚠️ Approximative (estimation visuelle)
- Dépend de la qualité de la photo
- Mieux avec portions standards

**Interface :**
- Bouton "Analyser une Assiette" dans menu principal
- Écran dédié avec résultats nutrition
- Option "Enregistrer dans historique"

#### C. Mode "Scan Code-Barres" 🔍 ⭐

**Fonctionnement :**
1. Utilisateur scanne le code-barres d'un produit
2. Recherche dans OpenFoodFacts (base collaborative)
3. Affichage :
   - Nom du produit + marque
   - Valeurs nutritionnelles complètes
   - Nutri-Score (si disponible)
   - Liste d'ingrédients
   - Allergènes

**Cas d'Usage :**
- Supermarché : comparer produits
- Cuisine : vérifier composition
- Allergies : détecter allergènes

**Code Clé :**
```javascript
// www/js/openfoodfacts.js
async function getProductByBarcode(barcode) {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
  );
  const data = await response.json();
  
  if (data.status === 1) {
    return mapOFFProductToNutrition(data.product);
  }
  return null;
}
```

**Interface :**
- Bouton "Scanner un Produit" dans menu
- Overlay caméra avec viseur
- Résultats instantanés

### 3️⃣ Gestion Utilisateur

#### A. Favoris ⭐
- Sauvegarde de recettes préférées
- Stockage : localStorage
- Accès hors ligne
- Suppression possible

#### B. Historique 📜
- 10 dernières recettes générées
- Ordre chronologique inversé
- Réaffichage rapide
- Indicateur "hors ligne"

#### C. Liste de Courses 🛒
- Ajout d'ingrédients depuis une recette (clic sur "+")
- Gestion par catégories
- Cochage des articles achetés
- Export/Partage (futur)

#### D. Minuteurs de Cuisson ⏱️
- Détection automatique des temps ("cuire 20 min", "laisser mijoter 1h")
- Création auto de minuteurs
- Notification sonore en fin
- Multi-minuteurs simultanés

#### E. Partage de Recettes 📤
- Export texte formaté
- Partage via apps natives (WhatsApp, Email, etc.)
- Inclut : titre, ingrédients, étapes, nutrition

### 4️⃣ Mode Hors Ligne

**Fonctionnalités Disponibles Sans Internet :**
- ✅ Historique (10 dernières recettes)
- ✅ Favoris
- ✅ Calcul nutrition (base locale 100 aliments)
- ✅ Minuteurs
- ✅ Liste de courses

**Fonctionnalités NON Disponibles :**
- ❌ Génération nouvelles recettes (nécessite OpenAI API)
- ❌ OpenFoodFacts fallback
- ❌ Scan code-barres

**Indicateur Visuel :**
- Badge "Hors ligne" affiché en haut
- Désactivation des boutons nécessitant connexion

---

## 📚 Guide d'Utilisation Complet

### 🚀 Premier Lancement

#### Étape 1 : Installation
1. Télécharger `FrigoChef.apk` sur votre mobile Android
2. Aller dans Paramètres → Sécurité → Autoriser sources inconnues
3. Ouvrir le fichier APK
4. Installer

#### Étape 2 : Permissions
Au premier lancement, l'app demandera :
- 📸 **Caméra** : Pour photo frigo/assiette/code-barres
- 💾 **Stockage** : Pour sauvegarder photos (optionnel)

**Autoriser les deux pour fonctionnalité complète**

#### Étape 3 : Écran d'Accueil
Vous verrez 4 options :
1. 📸 **Photo du Frigo** → Générer recettes
2. ⌨️ **Saisir Ingrédients** → Génération manuelle
3. 📊 **Analyser** → Assiette ou Code-barres
4. 📜 **Historique** → Recettes passées

---

### 📸 Utilisation : Générer Recettes depuis Photo Frigo

#### Étape par Étape

**1. Prendre la Photo**
```
[Accueil] → Clic "Photo du Frigo" 📸
         → Appareil photo s'ouvre
         → Prendre photo du frigo (bien éclairé)
         → Valider la photo
```

**2. Détection IA (Chargement ~5-10s)**
```
"Analyse de votre frigo en cours... 🤖"
[Barre de progression]
```

**3. Validation des Ingrédients**
```
┌─────────────────────────────────────┐
│  Ingrédients Détectés (Confiance: Haute)  │
├─────────────────────────────────────┤
│  ✅ Poulet (200g)          [×]      │
│  ✅ Tomate (3 unités)      [×]      │
│  ✅ Oignon (1 unité)       [×]      │
│  ✅ Riz blanc (500g)       [×]      │
│                                     │
│  [+ Ajouter un ingrédient]          │
│                                     │
│  Notes: Image claire, bonne détection │
│                                     │
│  [ Réessayer Photo ]  [ Valider ✓ ]  │
└─────────────────────────────────────┘
```

**Actions Possibles :**
- **[×]** → Supprimer un ingrédient erroné
- **Modifier** → Cliquer sur un ingrédient pour éditer quantité
- **[+]** → Ajouter manuellement un ingrédient oublié
- **[Réessayer]** → Reprendre une photo
- **[Valider ✓]** → Lancer la génération

**4. Génération des Recettes (Chargement ~10-15s)**
```
"Génération de vos recettes personnalisées... 👨‍🍳"
[Animation de cuisson]
```

**5. Résultats : 2 Recettes**
```
┌─────────────────────────────────────┐
│  🍗 Poulet Rôti aux Tomates         │
│  ⏱️ 25 MIN  |  👨‍🍳 FACILE  |  🔥 350 kcal │
├─────────────────────────────────────┤
│  📋 Ingrédients (2 portions) [+ / -]│
│  □ 200g de poulet                   │
│  □ 3 tomates                        │
│  □ 1 oignon                         │
│  □ Huile d'olive                    │
│                                     │
│  📖 Étapes:                         │
│  1. Préchauffer le four (180°C) ⏱️20min│
│  2. Couper les légumes...           │
│  3. ...                             │
│                                     │
│  📊 VALEURS NUTRITIONNELLES         │
│  (par portion - 2 portions au total)│
│  ┌─────────┬─────────┐             │
│  │ Calories│ Protéines│             │
│  │ 350 kcal│ 31.6g   │             │
│  ├─────────┼─────────┤             │
│  │ Glucides│ Lipides │             │
│  │ 34.5g   │ 12.3g   │             │
│  └─────────┴─────────┘             │
│                                     │
│  🌟 Top Vitamines & Minéraux        │
│  Vitamine B3 (13.7mg) ████████ 86%  │
│  Selenium (27µg)      ████████ 49%  │
│                                     │
│  IG: Faible (absorption lente)      │
│                                     │
│  💡 Astuce du Chef:                 │
│  Mariner le poulet 30min avant...   │
│                                     │
│  [ ❤️ Favoris ] [ 🛒 Liste ] [ 📤 Partager ] │
└─────────────────────────────────────┘

[Recette 2 en dessous, similaire]
```

---

### ⌨️ Utilisation : Saisie Manuelle d'Ingrédients

**Plus Rapide si Vous Connaissez vos Ingrédients**

#### Étape par Étape

**1. Saisir les Ingrédients**
```
[Accueil] → "Saisir Ingrédients" ⌨️
         → Champ texte s'affiche

┌─────────────────────────────────────┐
│  Quels ingrédients avez-vous ?      │
│                                     │
│  [poulet, riz, tomate, oignon__]    │
│                                     │
│  💡 Séparez par des virgules        │
│                                     │
│  [  Générer Recettes  ]             │
└─────────────────────────────────────┘
```

**2. Validation Automatique**
- Passage direct à l'écran de validation
- Ingrédients listés
- Possibilité de modifier

**3. Génération**
- Identique au mode photo
- 2 recettes + nutrition

---

### 📷 Utilisation : Analyser une Assiette

**Estimer la Nutrition d'un Plat**

#### Étape par Étape

**1. Accès**
```
[Accueil] → "Analyser" 📊
         → "Analyser une Assiette" 📷
```

**2. Photo**
```
- Prendre photo de l'assiette (vue du dessus, bien éclairé)
- L'IA détecte aliments + estime quantités
```

**3. Résultats**
```
┌─────────────────────────────────────┐
│  Analyse de votre Assiette          │
├─────────────────────────────────────┤
│  Aliments Détectés:                 │
│  • Steak (150g estimé)              │
│  • Frites (200g estimé)             │
│  • Salade verte (50g estimé)        │
│                                     │
│  ⚠️ Estimation Approximative        │
│                                     │
│  📊 Nutrition Estimée:              │
│  Calories: 650 kcal                 │
│  Protéines: 35g                     │
│  Glucides: 60g                      │
│  Lipides: 28g                       │
│                                     │
│  Verdict: Équilibré, riche en       │
│  protéines et lipides               │
│                                     │
│  [ 💾 Sauvegarder ] [ 🔄 Réessayer ]  │
└─────────────────────────────────────┘
```

---

### 🔍 Utilisation : Scanner un Code-Barres

**Analyser un Produit Industriel**

#### Étape par Étape

**1. Accès**
```
[Accueil] → "Analyser" 📊
         → "Scanner un Produit" 🔍
```

**2. Scan**
```
- Caméra s'ouvre avec viseur
- Pointer vers code-barres
- Scan automatique (ou clic bouton)
```

**3. Résultats (si trouvé)**
```
┌─────────────────────────────────────┐
│  Nutella (Ferrero)                  │
├─────────────────────────────────────┤
│  Code-barres: 3017620422003         │
│  Nutri-Score: E                     │
│                                     │
│  📊 Nutrition (pour 100g):          │
│  Calories: 539 kcal                 │
│  Protéines: 6.3g                    │
│  Glucides: 57g                      │
│    dont sucres: 56g                 │
│  Lipides: 31g                       │
│    dont saturés: 11g                │
│  Sodium: 107mg                      │
│                                     │
│  🏷️ Ingrédients:                    │
│  Sucre, huile de palme, noisettes...│
│                                     │
│  ⚠️ Allergènes:                     │
│  Fruits à coque (noisettes)         │
│  Peut contenir: lait                │
│                                     │
│  Verdict: ⛔ Produit très sucré,    │
│  à consommer occasionnellement      │
│                                     │
│  [ ❤️ Favoris ] [ 📤 Partager ]      │
└─────────────────────────────────────┘
```

**4. Si Produit Non Trouvé**
```
❌ Produit introuvable dans OpenFoodFacts

Suggestions:
• Vérifier le code-barres (bien cadré)
• Réessayer avec meilleur éclairage
• Produit local non répertorié
```

---

### ⚙️ Fonctionnalités Secondaires

#### Ajuster les Portions

**Dans une Recette Affichée :**
```
📋 Ingrédients (2 portions) [➖] [➕]
                           ↓ Clic ➕
📋 Ingrédients (3 portions) [➖] [➕]

Quantités automatiquement ajustées:
• 200g poulet → 300g poulet
• Calories: 350 kcal/portion → 350 kcal/portion (inchangé)
• Total: 700 kcal → 1050 kcal
```

#### Démarrer un Minuteur

**Depuis une Étape de Recette :**
```
📖 Étapes:
2. Cuire au four 20 minutes [⏱️ Démarrer]
                             ↓ Clic
┌─────────────────────────┐
│  Minuteur: Cuisson Four │
│  ⏱️ 19:45 restantes     │
│  [ ⏸️ Pause ] [ ⏹️ Stop ]│
└─────────────────────────┘

Notification sonore à 00:00
```

#### Ajouter à la Liste de Courses

**Depuis une Recette :**
```
📋 Ingrédients:
□ 200g de poulet [➕]
                  ↓ Clic
✅ Ajouté à la liste

Accès: Menu → Liste de Courses
┌─────────────────────────┐
│  🛒 Liste de Courses    │
├─────────────────────────┤
│  Viandes:               │
│  □ 200g de poulet       │
│                         │
│  Légumes:               │
│  □ 3 tomates            │
└─────────────────────────┘
```

#### Sauvegarder en Favoris

**Depuis une Recette :**
```
[ ❤️ Favoris ] ← Clic
    ↓
[ ❤️ Favoris ] (rouge = sauvegardé)

Accès: Onglet "Favoris" en haut
```

---

## 🏗️ Architecture Technique

### Stack Technologique

**Frontend :**
- HTML5 / CSS3 / JavaScript ES6+
- Vanilla JS (pas de framework lourd)
- ~2500 lignes de code JS
- ~1400 lignes de CSS

**Backend / APIs :**
- OpenAI GPT-4 Turbo (génération recettes + vision)
- OpenFoodFacts API (données nutritionnelles)

**Framework Mobile :**
- Apache Cordova 12.0.0
- Plugins : Camera, Device, Network, Barcodescanner, Splashscreen

**Stockage :**
- localStorage (favoris, historique, paramètres)
- Cache mémoire (résultats OpenFoodFacts)

### Modules Principaux

**1. `index.js` (2500 lignes)**
- Gestion interface utilisateur
- Appels API OpenAI
- Gestion événements
- Historique et favoris
- Minuteurs

**2. `nutrition.js` (500 lignes)**
- Calcul nutritionnel
- Recherche base locale
- Fallback OpenFoodFacts
- Estimation index glycémique

**3. `openfoodfacts.js` (200 lignes)**
- Scan code-barres
- Recherche produits
- Mapping données

**4. `food_db.json` (3600 lignes)**
- 100 aliments de base
- Valeurs USDA / ANSES
- Format standardisé

---

## 🗄️ Base de Données Nutritionnelle

### 100 Aliments Locaux

**Sources :**
- USDA FoodData Central (États-Unis)
- Table Ciqual - ANSES (France)

**Catégories :**
- Protéines (12) : Poulet, Bœuf, Dinde, Porc, Agneau, Saumon, Thon, Cabillaud, Sardines, Maquereau, Crevettes, Œuf
- Céréales (11) : Riz blanc, Riz complet, Riz basmati, Pâtes, Pain blanc, Pain complet, Quinoa, Boulgour, Semoule, Orge, Avoine
- Légumineuses (4) : Lentilles, Pois chiches, Haricots rouges, Tofu
- Légumes (25) : Tomate, Oignon, Carotte, Courgette, Poivron, Aubergine, Concombre, Champignons, Haricots verts, Petits pois, Maïs, Salade, Chou, Épinards, Brocoli, Betterave, Céleri, Radis, Navet, Potiron, Panais, Endive, Fenouil, Pomme de terre
- Fruits (18) : Banane, Pomme, Orange, Fraise, Raisin, Kiwi, Ananas, Poire, Pêche, Abricot, Cerise, Pastèque, Melon, Mangue, Papaye, Avocat
- Oléagineux (5) : Amandes, Noix, Noisettes, Noix de coco
- Laitiers (3) : Lait, Fromage, Yaourt
- Matières grasses (4) : Huile d'olive, Huile tournesol, Beurre, Crème fraîche
- Aromates (13) : Ail, Gingembre, Échalote, Citron, Persil, Basilic, Coriandre, Thym, Romarin, Menthe, Cumin, Paprika, Curry
- Condiments (9) : Miel, Farine, Sucre, Vinaigre, Sauce soja, Moutarde, Olives, Câpres, Cornichons
- Chocolat (1) : Chocolat noir

**Format :**
```json
{
  "name": "poulet",
  "aliases": ["blanc de poulet", "filet de poulet"],
  "per100g": {
    "calories": 165,
    "proteines": 31,
    "glucides": 0,
    "lipides": 3.6,
    "fibres": 0,
    "sucres": 0,
    "sodium": 0.08,
    "vitamines": { "B3": 13.7, "B6": 0.6, "B12": 0.3 },
    "mineraux": { "phosphore": 220, "selenium": 27, "zinc": 1.3 }
  },
  "gi": "low"
}
```

### Fallback OpenFoodFacts (+2M Produits)

**Utilisation :**
1. Recherche d'abord dans base locale
2. Si non trouvé → API OpenFoodFacts
3. Cache du résultat en mémoire
4. Normalisation des unités (mg vs g)

**Correction Automatique :**
- Sodium : détection si valeur en mg au lieu de g (> 10g → division par 1000)

---

## 💻 Installation

### Prérequis Développement

```bash
# Node.js 24.6.0+
node -v

# Cordova CLI
npm install -g cordova

# Android SDK
# Télécharger Android Studio
# Configurer $env:ANDROID_HOME

# Java JDK 17+
java -version
```

### Cloner et Installer

```bash
git clone https://github.com/MilFhey/FrigoChef.git
cd FrigoChef
npm install
cordova platform add android
```

### Configurer la Clé API OpenAI

**⚠️ IMPORTANT**

Éditer `www/js/index.js` ligne 9 :
```javascript
const OPENAI_API_KEY = "VOTRE_CLE_API_ICI";
```

### Build

```bash
# Développement
cordova run browser

# Android
cordova build android

# APK généré:
# platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔧 Dépannage

### Problème : Build Android Échoue

**Solution 1 : Script de Fix**
```powershell
.\fix-android-build.ps1
cordova build android
```

**Solution 2 : Manuelle**
Voir `HISTORIQUE_PROBLEMES_BUILD.md`

### Problème : Sodium Très Élevé (>10000mg)

**Cause :** Donnée OpenFoodFacts en mg interprétée comme g

**Solution :** Automatique depuis v2.0.1 (détection > 10g → division par 1000)

### Problème : Ingrédient Non Trouvé

**Vérifier :**
1. Orthographe correcte
2. Présent dans les 100 aliments de base ?
3. Connexion internet (pour fallback OpenFoodFacts) ?

**Solution :**
- Modifier le nom (ex: "blanc de poulet" → "poulet")
- Ajouter à `food_db.json` (voir CONTRIBUTING.md)

---

## 📊 Statistiques

```
Lignes de Code : ~5,500
  - JavaScript  : ~3,000
  - CSS         : ~1,400
  - HTML        : ~300
  - JSON        : ~800

Taille APK     : ~8 MB
Base Nutrition : 100 aliments + 2M OpenFoodFacts
Couverture     : 95-100% recettes courantes
```

---

## 🎯 Cas d'Usage Réels

**Scénario 1 : Étudiant Pressé**
> "J'ai du poulet et du riz, que faire ?"
→ Photo frigo → 2 recettes rapides en 30s

**Scénario 2 : Suivi Nutritionnel**
> "Combien de calories dans ce plat au restau ?"
→ Analyse assiette → Estimation nutrition

**Scénario 3 : Course au Supermarché**
> "Ce yaourt est-il sain ?"
→ Scan code-barres → Nutri-Score + verdict

**Scénario 4 : Inspiration Culinaire**
> "Quoi cuisiner ce soir ?"
→ Photo frigo → Recettes créatives

---

**Date de Création Fiche :** 11 février 2026  
**Version Application :** 2.0.1  
**Status :** Production Ready ✅

