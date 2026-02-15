// Module de calcul nutritionnel
// Utilise food_db.json pour les ingrédients bruts

let FOOD_DATABASE = null;

// Charger la base de données
async function loadFoodDatabase() {
  if (FOOD_DATABASE) return FOOD_DATABASE;

  try {
    const response = await fetch("js/food_db.json");
    const data = await response.json();
    FOOD_DATABASE = data.foods;
    return FOOD_DATABASE;
  } catch (err) {
    console.error("Erreur chargement food_db:", err);
    FOOD_DATABASE = [];
    return [];
  }
}

// Normaliser un nom d'ingrédient (pour améliorer le matching)
function normalizeIngredientName(name) {
  return name
    .toLowerCase()
    .trim()
    // Enlever les accents
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    // Enlever les articles
    .replace(/^(le|la|les|un|une|des|du|de|d'|l')\s+/gi, '')
    // Enlever les pluriels simples (s à la fin)
    .replace(/s$/, '')
    // Enlever les caractères spéciaux sauf espaces
    .replace(/[^a-z0-9\s]/g, '');
}

// Calculer la distance de Levenshtein (similarité entre 2 mots)
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // substitution
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1      // insertion
        );
      }
    }
  }

  return dp[m][n];
}

// Calculer la similarité entre 2 chaînes (0 à 1)
function calculateSimilarity(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(str1, str2);
  return 1.0 - (distance / maxLen);
}

// Trouver un aliment dans la base avec fuzzy matching amélioré
function findFood(ingredientName) {
  if (!FOOD_DATABASE) return null;

  const search = ingredientName.toLowerCase().trim();
  const normalizedSearch = normalizeIngredientName(ingredientName);

  // 1. Recherche exacte
  let found = FOOD_DATABASE.find(f => f.name.toLowerCase() === search);
  if (found) {
    console.log(`✅ Match exact: "${search}" → "${found.name}"`);
    return found;
  }

  // 2. Recherche dans les aliases
  found = FOOD_DATABASE.find(f =>
    f.aliases.some(alias => alias.toLowerCase() === search)
  );
  if (found) {
    console.log(`✅ Match alias: "${search}" → "${found.name}"`);
    return found;
  }

  // 3. Recherche normalisée exacte
  found = FOOD_DATABASE.find(f =>
    normalizeIngredientName(f.name) === normalizedSearch ||
    f.aliases.some(alias => normalizeIngredientName(alias) === normalizedSearch)
  );
  if (found) {
    console.log(`✅ Match normalisé: "${search}" → "${found.name}"`);
    return found;
  }

  // 4. Recherche partielle (contient)
  found = FOOD_DATABASE.find(f =>
    f.name.toLowerCase().includes(search) ||
    f.aliases.some(alias => alias.toLowerCase().includes(search))
  );
  if (found) {
    console.log(`✅ Match partiel: "${search}" → "${found.name}"`);
    return found;
  }

  // 5. Recherche inversée (le search contient le nom)
  found = FOOD_DATABASE.find(f =>
    search.includes(f.name.toLowerCase()) ||
    f.aliases.some(alias => search.includes(alias.toLowerCase()))
  );
  if (found) {
    console.log(`✅ Match inversé: "${search}" → "${found.name}"`);
    return found;
  }

  // 6. Fuzzy matching (similarité > 80%)
  let bestMatch = null;
  let bestSimilarity = 0.8; // Seuil minimum

  for (const food of FOOD_DATABASE) {
    // Comparer avec le nom
    const nameSimilarity = calculateSimilarity(normalizedSearch, normalizeIngredientName(food.name));
    if (nameSimilarity > bestSimilarity) {
      bestSimilarity = nameSimilarity;
      bestMatch = food;
    }

    // Comparer avec les aliases
    for (const alias of food.aliases) {
      const aliasSimilarity = calculateSimilarity(normalizedSearch, normalizeIngredientName(alias));
      if (aliasSimilarity > bestSimilarity) {
        bestSimilarity = aliasSimilarity;
        bestMatch = food;
      }
    }
  }

  if (bestMatch) {
    console.log(`✅ Fuzzy match (${Math.round(bestSimilarity * 100)}%): "${search}" → "${bestMatch.name}"`);
    return bestMatch;
  }

  console.log(`❌ Aucun match local pour: "${search}"`);
  return null;
}

// Cache pour OpenFoodFacts (éviter requêtes répétées)
const OFF_CACHE = {};

// Générer des variantes d'un nom d'ingrédient pour améliorer la recherche
function generateSearchVariants(ingredientName) {
  const variants = [];
  const base = ingredientName.toLowerCase().trim();

  // Variante originale
  variants.push(base);

  // Variante normalisée
  const normalized = normalizeIngredientName(ingredientName);
  if (normalized !== base) {
    variants.push(normalized);
  }

  // Nettoyer (enlever quantités et articles)
  const cleaned = base
    .replace(/\d+\s*(g|grammes?|kg|ml|cl|l|litres?|cuillères?|c\.)/gi, '')
    .replace(/^(le|la|les|un|une|des|du|de|d'|l')\s+/gi, '')
    .trim();
  if (cleaned && cleaned !== base) {
    variants.push(cleaned);
  }

  // Singulier (enlever 's' final)
  const singular = cleaned.replace(/s$/, '');
  if (singular !== cleaned) {
    variants.push(singular);
  }

  // Enlever "frais/fraîche/cuit/cuite/etc"
  const withoutModifiers = cleaned
    .replace(/\s+(frais|fraiche|fraîche|cuit|cuite|crus?|secs?|séchés?)\s*$/gi, '')
    .trim();
  if (withoutModifiers && withoutModifiers !== cleaned) {
    variants.push(withoutModifiers);
  }

  // Retourner uniquement les variantes uniques
  return [...new Set(variants)].filter(v => v.length > 2);
}

// Rechercher dans OpenFoodFacts avec plusieurs tentatives
async function findFoodInOpenFoodFacts(ingredientName) {
  // Vérifier le cache
  if (OFF_CACHE[ingredientName]) {
    console.log("OpenFoodFacts: Trouvé dans le cache:", ingredientName);
    return OFF_CACHE[ingredientName];
  }

  // Vérifier connexion
  if (!navigator.onLine) {
    console.log("OpenFoodFacts: Hors ligne, impossible de rechercher");
    return null;
  }

  // Générer des variantes de recherche
  const searchVariants = generateSearchVariants(ingredientName);
  console.log("OpenFoodFacts: Variantes de recherche:", searchVariants);

  // Essayer chaque variante
  for (const variant of searchVariants) {
    try {
      console.log(`OpenFoodFacts: Tentative avec "${variant}"`);

      const params = new URLSearchParams({
        search_terms: variant,
        page_size: 5, // Plus de résultats pour améliorer les chances
        fields: 'product_name,nutriments,categories',
        json: 1
      });

      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
        headers: {
          'User-Agent': 'FrigoChef/1.0 (Mobile App)',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        console.warn(`OpenFoodFacts HTTP ${response.status} pour "${variant}"`);
        continue; // Essayer la variante suivante
      }

      const data = await response.json();

      if (!data.products || data.products.length === 0) {
        console.log(`OpenFoodFacts: Aucun résultat pour "${variant}"`);
        continue; // Essayer la variante suivante
      }

      // Prendre le premier produit qui semble correspondre
      const product = data.products[0];
      console.log(`✅ OpenFoodFacts: Trouvé "${product.product_name}" pour "${variant}"`);

      const nutriments = product.nutriments || {};

      const foodData = {
        name: variant,
        source: 'openfoodfacts',
        original_name: product.product_name,
        per100g: {
          calories: nutriments['energy-kcal_100g'] || nutriments['energy_100g'] / 4.184 || 0,
          proteines: nutriments['proteins_100g'] || 0,
          glucides: nutriments['carbohydrates_100g'] || 0,
          lipides: nutriments['fat_100g'] || 0,
          fibres: nutriments['fiber_100g'] || 0,
          sucres: nutriments['sugars_100g'] || 0,
          sodium: (nutriments['salt_100g'] || 0) / 2.5,
          vitamines: {},
          mineraux: {}
        }
      };

      // Mettre en cache
      OFF_CACHE[ingredientName] = foodData;
      return foodData;

    } catch (err) {
      console.warn(`OpenFoodFacts: Erreur pour "${variant}":`, err.message);
      continue; // Essayer la variante suivante
    }
  }

  // Aucune variante n'a fonctionné
  console.log(`❌ OpenFoodFacts: Aucun résultat pour toutes les variantes de "${ingredientName}"`);
  OFF_CACHE[ingredientName] = null; // Mettre en cache l'échec
  return null;
}

// Fonction hybride: chercher d'abord en local, puis OpenFoodFacts
async function findFoodWithFallback(ingredientName) {
  // 1. Priorité: base locale
  const localFood = findFood(ingredientName);
  if (localFood) {
    console.log("✅ Trouvé en local:", ingredientName);
    return localFood;
  }

  // 2. Fallback: OpenFoodFacts
  console.log("🔍 Recherche OpenFoodFacts:", ingredientName);
  const offFood = await findFoodInOpenFoodFacts(ingredientName);

  if (offFood) {
    console.log("✅ Trouvé sur OpenFoodFacts:", ingredientName);
    return offFood;
  }

  // 3. Pas trouvé
  console.log("❌ Non trouvé:", ingredientName);
  return null;
}

// Extraire quantité en grammes depuis un texte ingrédient
function parseIngredientQuantity(ingredientText) {
  // Patterns pour extraire quantité + unité
  const patterns = [
    { regex: /(\d+(?:[.,]\d+)?)\s*kg/i, multiplier: 1000 },
    { regex: /(\d+(?:[.,]\d+)?)\s*g/i, multiplier: 1 },
    { regex: /(\d+(?:[.,]\d+)?)\s*ml/i, multiplier: 1 }, // approximation ml ≈ g
    { regex: /(\d+(?:[.,]\d+)?)\s*cl/i, multiplier: 10 },
    { regex: /(\d+(?:[.,]\d+)?)\s*l(?:\s|$)/i, multiplier: 1000 },
  ];

  for (const { regex, multiplier } of patterns) {
    const match = ingredientText.match(regex);
    if (match) {
      const value = parseFloat(match[1].replace(",", "."));
      return value * multiplier;
    }
  }

  // Si pas de quantité trouvée, retourner une valeur par défaut (100g)
  return 100;
}

// Liste des condiments basiques à ignorer pour le calcul nutritionnel
const CONDIMENTS_BASIQUES = [
  'sel', 'poivre', 'sel et poivre', 'sel et poivre au goût',
  'sel au goût', 'poivre au goût', 'épices', 'herbes',
  'herbes de provence', 'thym', 'laurier', 'persil',
  'ciboulette', 'basilic frais', 'coriandre fraîche'
];

// Vérifier si un ingrédient est un condiment basique
function isBasicCondiment(ingredientName) {
  const lower = ingredientName.toLowerCase().trim();

  // Vérification exacte
  if (CONDIMENTS_BASIQUES.includes(lower)) {
    return true;
  }

  // Vérification partielle
  return CONDIMENTS_BASIQUES.some(condiment =>
    lower.includes(condiment) || condiment.includes(lower)
  );
}

// Calculer nutrition pour une liste d'ingrédients (recette)
async function calculateRecipeNutrition(ingredients, servings = 2) {
  await loadFoodDatabase();

  const totals = {
    calories: 0,
    proteines: 0,
    glucides: 0,
    lipides: 0,
    fibres: 0,
    sucres: 0,
    sodium: 0,
    vitamines: {},
    mineraux: {},
  };

  const foundIngredients = [];
  const missingIngredients = [];

  for (const ing of ingredients) {
    // Ignorer les condiments basiques
    if (isBasicCondiment(ing)) {
      console.log("Condiment basique ignoré:", ing);
      continue;
    }

    // Utiliser la recherche avec fallback OpenFoodFacts
    const food = await findFoodWithFallback(ing);

    if (!food) {
      missingIngredients.push(ing);
      continue;
    }

    const grams = parseIngredientQuantity(ing);
    const ratio = grams / 100;

    // Macros
    totals.calories += (food.per100g.calories || 0) * ratio;
    totals.proteines += (food.per100g.proteines || 0) * ratio;
    totals.glucides += (food.per100g.glucides || 0) * ratio;
    totals.lipides += (food.per100g.lipides || 0) * ratio;
    totals.fibres += (food.per100g.fibres || 0) * ratio;
    totals.sucres += (food.per100g.sucres || 0) * ratio;
    totals.sodium += (food.per100g.sodium || 0) * ratio;

    // Vitamines (normaliser les unités : certaines sont en µg dans la DB)
    if (food.per100g.vitamines) {
      const vitaminesEnMicrogrammes = ['A', 'D', 'K', 'B9', 'B12']; // Ces vitamines sont en µg dans la DB

      for (const [vit, value] of Object.entries(food.per100g.vitamines)) {
        if (!totals.vitamines[vit]) totals.vitamines[vit] = 0;

        // Si la vitamine est en µg dans la DB, convertir en mg
        const normalizedValue = vitaminesEnMicrogrammes.includes(vit) ? value / 1000 : value;
        totals.vitamines[vit] += normalizedValue * ratio;
      }
    }

    // Minéraux (selenium est en µg dans la DB, déjà géré dans getTopMicronutrients)
    if (food.per100g.mineraux) {
      for (const [min, value] of Object.entries(food.per100g.mineraux)) {
        if (!totals.mineraux[min]) totals.mineraux[min] = 0;
        totals.mineraux[min] += value * ratio;
      }
    }

    foundIngredients.push({ name: ing, food: food.name, grams });
  }

  // Calculer par portion
  const perServing = {
    calories: Math.round(totals.calories / servings),
    proteines: Math.round(totals.proteines / servings * 10) / 10,
    glucides: Math.round(totals.glucides / servings * 10) / 10,
    lipides: Math.round(totals.lipides / servings * 10) / 10,
    fibres: Math.round(totals.fibres / servings * 10) / 10,
    sucres: Math.round(totals.sucres / servings * 10) / 10,
    sodium: Math.round(totals.sodium / servings * 1000) / 1000, // en grammes
    vitamines: {},
    mineraux: {},
  };

  // Vitamines & minéraux par portion
  for (const [key, value] of Object.entries(totals.vitamines)) {
    perServing.vitamines[key] = Math.round(value / servings * 10) / 10;
  }

  for (const [key, value] of Object.entries(totals.mineraux)) {
    perServing.mineraux[key] = Math.round(value / servings * 10) / 10;
  }

  return {
    total: totals,
    perServing,
    servings,
    foundIngredients,
    missingIngredients,
  };
}

// Estimer l'index glycémique d'une recette
function estimateGlycemicIndex(ingredients) {
  // Heuristique simple basée sur les ingrédients principaux
  const carbSources = [];

  for (const ing of ingredients) {
    const food = findFood(ing);
    if (food && food.per100g.glucides > 10) {
      carbSources.push({
        name: food.name,
        carbs: food.per100g.glucides,
        gi: food.gi,
        grams: parseIngredientQuantity(ing),
      });
    }
  }

  if (carbSources.length === 0) {
    return { level: "low", label: "Faible", explanation: "Peu de glucides" };
  }

  // Pondérer par quantité de glucides
  let weightedGI = 0;
  let totalCarbs = 0;

  for (const source of carbSources) {
    const carbGrams = (source.carbs / 100) * source.grams;
    totalCarbs += carbGrams;

    let giValue = 55; // moyen par défaut
    if (source.gi === "low") giValue = 40;
    if (source.gi === "high") giValue = 70;

    weightedGI += giValue * carbGrams;
  }

  const avgGI = totalCarbs > 0 ? weightedGI / totalCarbs : 55;

  let level, label, explanation;

  if (avgGI < 55) {
    level = "low";
    label = "Faible";
    explanation = "Absorption lente, bon pour la glycémie";
  } else if (avgGI < 70) {
    level = "medium";
    label = "Modéré";
    explanation = "Impact modéré sur la glycémie";
  } else {
    level = "high";
    label = "Élevé";
    explanation = "Absorption rapide, pic glycémique";
  }

  return { level, label, explanation, value: Math.round(avgGI) };
}

// Obtenir les top vitamines/minéraux avec %AJR
function getTopMicronutrients(vitamines, mineraux, count = 4) {
  // Apports journaliers recommandés (AJR) - TOUT EN mg
  const AJR = {
    // Vitamines (en mg)
    A: 0.8, // mg (800 µg)
    C: 80,
    D: 0.005, // mg (5 µg)
    E: 12,
    K: 0.075, // mg (75 µg)
    B1: 1.1,
    B2: 1.4,
    B3: 16,
    B6: 1.4,
    B9: 0.2, // mg (200 µg)
    B12: 0.0025, // mg (2.5 µg)

    // Minéraux (en mg)
    calcium: 800,
    fer: 14,
    magnesium: 375,
    phosphore: 700,
    potassium: 2000,
    zinc: 10,
    selenium: 0.055, // mg (55 µg) - ATTENTION: DB contient des µg, conversion nécessaire
  };

  const allMicros = [];

  // Vitamines
  for (const [key, value] of Object.entries(vitamines)) {
    if (value > 0 && AJR[key]) {
      const percent = Math.round((value / AJR[key]) * 100);
      allMicros.push({
        type: "vitamine",
        name: key.startsWith("B") ? `Vitamine ${key}` : `Vitamine ${key}`,
        value: Math.round(value * 100) / 100,
        unit: "mg",
        ajr: percent,
      });
    }
  }

  // Minéraux
  for (const [key, value] of Object.entries(mineraux)) {
    if (value > 0 && AJR[key]) {
      // CORRECTION: selenium est en µg dans la DB, convertir en mg
      let normalizedValue = value;
      if (key === "selenium") {
        normalizedValue = value / 1000; // µg → mg
      }

      const percent = Math.round((normalizedValue / AJR[key]) * 100);
      allMicros.push({
        type: "mineral",
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: key === "selenium" ? Math.round(value * 10) / 10 : Math.round(normalizedValue * 10) / 10,
        unit: key === "selenium" ? "µg" : "mg",
        ajr: percent,
      });
    }
  }

  // Trier par % AJR décroissant
  allMicros.sort((a, b) => b.ajr - a.ajr);

  return allMicros.slice(0, count);
}

// Générer un HTML d'affichage nutrition (pour recette)
function renderNutritionCard(nutrition, gi) {
  const { perServing, servings, missingIngredients } = nutrition;
  const topMicros = getTopMicronutrients(perServing.vitamines, perServing.mineraux, 4);

  const macrosHTML = `
    <div class="nutrition-macros">
      <div class="macro-item">
        <span class="macro-label">Calories</span>
        <span class="macro-value">${perServing.calories} kcal</span>
      </div>
      <div class="macro-item">
        <span class="macro-label">Protéines</span>
        <span class="macro-value">${perServing.proteines}g</span>
      </div>
      <div class="macro-item">
        <span class="macro-label">Glucides</span>
        <span class="macro-value">${perServing.glucides}g</span>
      </div>
      <div class="macro-item">
        <span class="macro-label">Lipides</span>
        <span class="macro-value">${perServing.lipides}g</span>
      </div>
    </div>
  `;

  const essentialsHTML = `
    <div class="nutrition-essentials">
      <div class="essential-item">
        <span class="essential-label">Fibres</span>
        <span class="essential-value">${perServing.fibres}g</span>
      </div>
      <div class="essential-item">
        <span class="essential-label">Sucres</span>
        <span class="essential-value">${perServing.sucres}g</span>
      </div>
      <div class="essential-item">
        <span class="essential-label">Sodium</span>
        <span class="essential-value">${Math.round(perServing.sodium * 1000)}mg</span>
      </div>
    </div>
  `;

  const microsHTML = topMicros.length > 0 ? `
    <div class="nutrition-micros">
      <h5>🌟 Top vitamines & minéraux</h5>
      ${topMicros.map(m => `
        <div class="micro-item">
          <span class="micro-name">${m.name} <small>(${m.value}${m.unit})</small></span>
          <div class="micro-bar-container">
            <div class="micro-bar" style="width: ${Math.min(m.ajr, 100)}%"></div>
          </div>
          <span class="micro-percent">${m.ajr}%</span>
        </div>
      `).join("")}
      <small class="ajr-note">% des Apports Journaliers Recommandés</small>
    </div>
  ` : "";

  const giHTML = gi ? `
    <div class="nutrition-gi">
      <span class="gi-label">Index Glycémique</span>
      <span class="gi-badge gi-${gi.level}">${gi.label}</span>
      <small class="gi-explanation">${gi.explanation}</small>
    </div>
  ` : "";

  // Note sur les ingrédients manquants (afficher les noms)
  const missingNote = missingIngredients && missingIngredients.length > 0 ? `
    <div class="missing-ingredients-info">
      <p class="missing-title">ℹ️ Ingrédients non trouvés dans la base :</p>
      <ul class="missing-list">
        ${missingIngredients.map(ing => `<li>${ing}</li>`).join('')}
      </ul>
      <small class="missing-note">Les valeurs nutritionnelles sont calculées sans ces ingrédients.</small>
    </div>
  ` : "";

  return `
    <div class="nutrition-card">
      <h4>📊 Valeurs nutritionnelles <small>(par portion - ${servings} portion${servings > 1 ? 's' : ''} au total)</small></h4>
      ${macrosHTML}
      ${essentialsHTML}
      ${microsHTML}
      ${giHTML}
      ${missingNote}
    </div>
  `;
}

