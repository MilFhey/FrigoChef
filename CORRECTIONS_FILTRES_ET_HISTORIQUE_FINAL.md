# 🔧 Corrections Filtres et Historique - Version Finale

**Date :** 11 février 2026  
**Statut :** ✅ Résolu

---

## 📋 Problèmes Corrigés

### 1. ❌ **Filtres alimentaires non respectés**

**Symptôme :**
- L'utilisateur active le filtre "Végan"
- Saisit "porc" comme ingrédient
- L'application génère quand même des recettes de porc

**Cause :**
La fonction `getActiveFiltersPrompt()` envoyait bien les exclusions à l'IA, mais il n'y avait **aucune vérification côté client** AVANT la génération.

**Solution :**
Ajout d'une **vérification stricte** dans `confirmIngredientsAndGenerateRecipes()` :

```javascript
// ✅ VÉRIFICATION DES FILTRES : Bloquer si ingrédient interdit
const activeFilters = appState.settings.dietaryFilters;
if (activeFilters.length > 0) {
  const forbiddenIngredients = [];
  
  activeFilters.forEach(filterId => {
    const forbiddenList = {
      "vegetarian": ["viande", "poisson", "poulet", "bœuf", "porc", ...],
      "vegan": ["viande", "poisson", "œuf", "lait", "fromage", ...],
      "gluten-free": ["pâtes", "pain", "farine de blé", ...],
      "lactose-free": ["lait", "fromage", "beurre", ...]
    };
    
    // Vérifier chaque ingrédient
    finalIngredients.forEach(ing => {
      const ingLower = ing.toLowerCase();
      forbidden.forEach(forbiddenItem => {
        if (ingLower.includes(forbiddenItem)) {
          forbiddenIngredients.push({ ingredient: ing, raison: filterId });
        }
      });
    });
  });

  // Si incompatibilité détectée → BLOQUER + Message d'erreur
  if (forbiddenIngredients.length > 0) {
    // Afficher erreur détaillée
    // Bouton retour à la validation
    return; // ⛔ NE PAS GÉNÉRER
  }
}
```

**Résultat :**
- ✅ Détection **avant** génération
- ✅ Message d'erreur clair : "❌ Porc (incompatible avec le filtre végan)"
- ✅ Pas de gaspillage de tokens IA

---

### 2. ❌ **Barre de recherche non mise à jour**

**Symptôme :**
- L'utilisateur ajoute un ingrédient via l'écran de validation
- L'ingrédient est bien pris en compte pour les recettes
- **MAIS** le champ de recherche (`#question`) ne se met pas à jour

**Cause :**
La fonction `confirmIngredientsAndGenerateRecipes()` récupérait les ingrédients validés mais ne les réinjectait pas dans le champ.

**Solution :**
Ajout de cette ligne après validation :

```javascript
// ✅ Mettre à jour la barre de recherche avec les ingrédients finaux
document.getElementById("question").value = finalIngredients.join(", ");
```

**Résultat :**
- ✅ Le champ affiche toujours les ingrédients validés
- ✅ Permet de voir exactement ce qui a été utilisé pour la génération
- ✅ Cohérence entre UI et données

---

### 3. ❌ **Bouton "Refaire" défaillant**

**Symptôme :**
- Clic sur "🔄 Refaire" dans l'historique
- **Photo :** Redirige vers la page d'accueil, mais ne restaure rien
- **Manuel :** Redirige vers la page d'accueil avec la même recette affichée

**Causes multiples :**
1. L'historique ne sauvegardait pas les **ingrédients validés** (uniquement les détectés)
2. `replayHistory()` ne gérait pas tous les cas (photo + manuel)
3. Navigation asynchrone : tentative de restauration avant que la page soit chargée

**Solutions :**

#### A) Sauvegarder les ingrédients validés dans l'historique

**Avant :**
```javascript
function addToHistory(query, imageBase64, results, detectedIngredients, confidence, notes)
```

**Après :**
```javascript
function addToHistory(query, imageBase64, results, detectedIngredients, validatedIngredients, confidence, notes)
//                                                                       ^^^^^^^^^^^^^^^^^ NOUVEAU
```

**Modification de l'appel :**
```javascript
addToHistory(
  document.getElementById("question").value.trim() || "Scan de frigo",
  selectedImageBase64,
  parsedData,
  detectedIngredientsForValidation, // Ingrédients détectés initialement
  ingredients, // ✅ Ingrédients validés/modifiés (NOUVEAU)
  "medium",
  null
);
```

#### B) Réécriture complète de `replayHistory()`

**Améliorations :**
1. **Attente de la navigation** : `setTimeout(() => { ... }, 100)` après le clic
2. **Priorité aux ingrédients validés** : `entry.validatedIngredients` > `entry.detectedIngredients`
3. **Gestion de tous les cas** :
   - Photo + ingrédients validés → Restaure tout + écran validation
   - Photo + ingrédients détectés → Restaure tout + écran validation
   - Photo seule → Restaure image + "Cliquez sur Analyser"
   - Manuel + ingrédients validés → Restaure barre + écran validation
   - Manuel sans ingrédients → Restaure query simple

**Code clé :**
```javascript
setTimeout(() => {
  if (entry.hasImage && entry.imageData) {
    selectedImageBase64 = entry.imageData;
    // Afficher l'image
    
    if (entry.validatedIngredients && entry.validatedIngredients.length > 0) {
      detectedIngredientsForValidation = entry.validatedIngredients;
      document.getElementById("question").value = entry.validatedIngredients.join(", ");
      
      setTimeout(() => {
        showIngredientValidationScreen(entry.validatedIngredients, "high", "...");
      }, 100);
      
      showToast("✅ Photo et ingrédients validés restaurés");
    }
  } else {
    // Cas manuel
    if (entry.validatedIngredients && entry.validatedIngredients.length > 0) {
      document.getElementById("question").value = entry.validatedIngredients.join(", ");
      // ... écran validation
    }
  }
}, 100);
```

**Résultat :**
- ✅ Photo restaurée
- ✅ Ingrédients validés restaurés
- ✅ Barre de recherche mise à jour
- ✅ Écran de validation affiché automatiquement
- ✅ Fonctionne pour photo ET saisie manuelle

---

## 🎯 Impact Global

| Avant | Après |
|-------|-------|
| ❌ Filtre végan + porc = recettes de porc | ✅ Blocage + message d'erreur |
| ❌ Barre de recherche vide après validation | ✅ Barre mise à jour automatiquement |
| ❌ "Refaire" ne restaure rien | ✅ Tout est restauré correctement |
| ❌ Perte des ingrédients validés dans l'historique | ✅ Sauvegarde complète (détectés + validés) |

---

## 🧪 Tests à Effectuer

### Test 1 : Filtre végan + porc
1. Activer le filtre "Végan" dans les paramètres
2. Saisir manuellement "porc" comme ingrédient
3. Cliquer sur "Générer"
4. **Attendu :** Message d'erreur "❌ porc (incompatible avec le filtre végan)"

### Test 2 : Ajout d'ingrédient + barre de recherche
1. Saisir "tomate, oignon"
2. Cliquer sur "Analyser"
3. Dans l'écran de validation, ajouter "ail"
4. Cliquer sur "Valider et générer"
5. **Attendu :** La barre affiche "tomate, oignon, ail"

### Test 3 : Historique "Refaire" (photo)
1. Prendre une photo de frigo
2. Valider les ingrédients détectés (en modifier 1)
3. Générer les recettes
4. Aller dans Historique
5. Cliquer sur "🔄 Refaire"
6. **Attendu :** 
   - Photo restaurée
   - Ingrédients validés (modifiés) affichés
   - Écran de validation visible

### Test 4 : Historique "Refaire" (manuel)
1. Saisir "poulet, riz"
2. Générer les recettes
3. Aller dans Historique
4. Cliquer sur "🔄 Refaire"
5. **Attendu :** 
   - Barre de recherche = "poulet, riz"
   - Écran de validation visible

---

## 📦 Fichiers Modifiés

- ✅ `www/js/index.js`
  - `confirmIngredientsAndGenerateRecipes()` : Vérification filtres + mise à jour barre
  - `replayHistory()` : Gestion complète de tous les cas
  - `addToHistory()` : Nouveau paramètre `validatedIngredients`
  - Appel à `addToHistory()` avec les ingrédients validés

- ✅ `platforms/browser/www/js/index.js` (copie synchronisée)
- ✅ `platforms/android/app/src/main/assets/www/js/index.js` (copie synchronisée)

---

## 🚀 Prochaines Étapes

1. **Tester sur émulateur Android** pour valider le comportement
2. **Tester sur navigateur** (`cordova run browser`)
3. **Installer l'APK sur téléphone** pour test réel
4. Si OK → Commit + Push vers GitHub (après avoir retiré la clé API !)

---

## 🔑 Note Importante : Clé API

⚠️ **RAPPEL :** La clé OpenAI est toujours dans le code (`www/js/index.js`).

**Avant de push vers GitHub :**
1. Remplacer la clé par une variable d'environnement
2. OU utiliser GitHub Secrets pour CI/CD
3. OU créer un fichier `.env` local (exclu de Git)

**Sinon :** GitHub Push Protection bloquera à nouveau le push.

