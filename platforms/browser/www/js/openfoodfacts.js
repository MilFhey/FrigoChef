// OpenFoodFacts API Integration
// Docs: https://wiki.openfoodfacts.org/API

const OFF_API = {
  BASE_URL: "https://world.openfoodfacts.org/api/v2",
  USER_AGENT: "FrigoChef/1.0 (Mobile App)",
};

// Scan barcode avec plugin Cordova
async function scanBarcode() {
  return new Promise((resolve, reject) => {
    if (!window.cordova || !cordova.plugins || !cordova.plugins.barcodeScanner) {
      reject(new Error("Scanner non disponible"));
      return;
    }

    cordova.plugins.barcodeScanner.scan(
      (result) => {
        if (result.cancelled) {
          reject(new Error("Scan annulé"));
        } else {
          resolve(result.text);
        }
      },
      (error) => {
        reject(new Error("Erreur scan: " + error));
      },
      {
        preferFrontCamera: false,
        showFlipCameraButton: true,
        showTorchButton: true,
        prompt: "Scannez le code-barres du produit",
      }
    );
  });
}

// Récupérer un produit par code-barres
async function getProductByBarcode(barcode) {
  try {
    const response = await fetch(`${OFF_API.BASE_URL}/product/${barcode}.json`, {
      headers: {
        "User-Agent": OFF_API.USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 1) {
      return null; // Produit non trouvé
    }

    return mapOFFProductToNutrition(data.product);
  } catch (err) {
    console.error("Erreur OpenFoodFacts:", err);
    throw err;
  }
}

// Rechercher des produits par nom
async function searchProducts(query, limit = 10) {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      page_size: limit,
      fields: "code,product_name,brands,nutriscore_grade,nova_group,image_url",
    });

    const response = await fetch(`${OFF_API.BASE_URL}/search?${params}`, {
      headers: {
        "User-Agent": OFF_API.USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.products || [];
  } catch (err) {
    console.error("Erreur recherche OpenFoodFacts:", err);
    throw err;
  }
}

// Mapper un produit OFF vers notre format nutrition
function mapOFFProductToNutrition(product) {
  const nutriments = product.nutriments || {};

  // Normaliser les unités (OpenFoodFacts peut avoir _100g ou _serving)
  const nutrition = {
    productName: product.product_name || "Produit inconnu",
    brands: product.brands || "",
    barcode: product.code || "",
    imageUrl: product.image_url || product.image_front_url || null,

    // Données brutes
    nutrimentsPer100g: {
      calories: safeFloat(nutriments["energy-kcal_100g"]) || safeFloat(nutriments["energy_100g"]) / 4.184 || 0,
      proteines: safeFloat(nutriments.proteins_100g) || 0,
      glucides: safeFloat(nutriments.carbohydrates_100g) || 0,
      sucres: safeFloat(nutriments.sugars_100g) || 0,
      lipides: safeFloat(nutriments.fat_100g) || 0,
      lipidesSatures: safeFloat(nutriments["saturated-fat_100g"]) || 0,
      fibres: safeFloat(nutriments.fiber_100g) || 0,
      sodium: safeFloat(nutriments.sodium_100g) || safeFloat(nutriments.salt_100g) / 2.5 || 0,
      sel: safeFloat(nutriments.salt_100g) || safeFloat(nutriments.sodium_100g) * 2.5 || 0,
    },

    // Scores
    nutriscoreGrade: product.nutriscore_grade || null,
    nutriscoreScore: product.nutriscore_score || null,
    novaGroup: product.nova_group || null,

    // Ingrédients & labels
    ingredients: product.ingredients_text || "",
    allergens: product.allergens_tags || [],
    labels: product.labels_tags || [],

    // Portion
    servingSize: product.serving_size || null,
    servingQuantity: product.serving_quantity || null,
  };

  return nutrition;
}

// Calculer le verdict santé (sain / limite / occasionnel)
function computeHealthVerdict(nutrition) {
  const n = nutrition.nutrimentsPer100g;
  let score = 0;
  let issues = [];
  let positives = [];

  // --- Points négatifs ---

  // Trop de sucres
  if (n.sucres > 22.5) {
    score -= 3;
    issues.push("Très riche en sucres");
  } else if (n.sucres > 12.5) {
    score -= 2;
    issues.push("Riche en sucres");
  }

  // Trop de sel
  if (n.sel > 1.5 || n.sodium > 0.6) {
    score -= 3;
    issues.push("Très salé");
  } else if (n.sel > 0.9 || n.sodium > 0.36) {
    score -= 2;
    issues.push("Salé");
  }

  // Trop de graisses saturées
  if (n.lipidesSatures > 5) {
    score -= 2;
    issues.push("Riche en graisses saturées");
  }

  // Calories élevées (contexte: snacks/plats préparés)
  if (n.calories > 500 && nutrition.novaGroup >= 3) {
    score -= 1;
    issues.push("Très calorique");
  }

  // --- NOVA & Nutriscore ---

  // NOVA (transformation)
  if (nutrition.novaGroup === 4) {
    score -= 3;
    issues.push("Ultra-transformé");
  } else if (nutrition.novaGroup === 3) {
    score -= 1;
  }

  // Nutriscore
  if (nutrition.nutriscoreGrade) {
    const grade = nutrition.nutriscoreGrade.toLowerCase();
    if (grade === "a") {
      score += 3;
      positives.push("Excellent Nutri-Score (A)");
    } else if (grade === "b") {
      score += 1;
      positives.push("Bon Nutri-Score (B)");
    } else if (grade === "d") {
      score -= 1;
    } else if (grade === "e") {
      score -= 2;
      issues.push("Nutri-Score défavorable (E)");
    }
  }

  // --- Points positifs ---

  // Fibres
  if (n.fibres > 6) {
    score += 2;
    positives.push("Riche en fibres");
  } else if (n.fibres > 3) {
    score += 1;
    positives.push("Source de fibres");
  }

  // Protéines
  if (n.proteines > 12) {
    score += 1;
    positives.push("Riche en protéines");
  }

  // --- Verdict final ---

  let verdict = "limit"; // par défaut
  let badge = "⚠️";
  let message = "À consommer avec modération";

  if (score >= 2) {
    verdict = "healthy";
    badge = "✅";
    message = "Bon choix nutritionnel";
  } else if (score <= -4) {
    verdict = "occasional";
    badge = "⛔";
    message = "À limiter (occasionnel)";
  }

  return {
    verdict,
    badge,
    message,
    score,
    issues,
    positives,
  };
}

// Adapter la portion (de 100g vers une portion réelle)
function scaleToServing(nutritionPer100g, grams) {
  const ratio = grams / 100;
  const scaled = {};

  for (const [key, value] of Object.entries(nutritionPer100g)) {
    scaled[key] = Math.round(value * ratio * 10) / 10;
  }

  return scaled;
}

// Helper: conversion safe float
function safeFloat(value) {
  if (value === null || value === undefined || value === "") return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

