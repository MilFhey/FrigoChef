document.addEventListener("deviceready", onDeviceReady, false);

let selectedImageBase64 = null;
let isProcessing = false;
let activeTimers = {};

// Configuration
const CONFIG = {
  API_KEY: "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",
  API_URL: "https://api.openai.com/v1/chat/completions",
  MODEL: "gpt-4o-mini",
  MAX_TOKENS: 2500,
};

// Storage keys
const STORAGE_KEYS = {
  FAVORITES: "frigoChef_favorites",
  HISTORY: "frigoChef_history",
  SETTINGS: "frigoChef_settings",
  SHOPPING_LIST: "frigoChef_shoppingList",
};

// État de l'app
let appState = {
  favorites: [],
  history: [],
  settings: {
    dietaryFilters: [],
  },
  shoppingList: [],
};

// Filtres disponibles
const DIETARY_FILTERS = [
  { id: "vegetarian", label: "Végétarien", icon: "🥬", prompt: "végétarien (sans viande ni poisson)" },
  { id: "vegan", label: "Végan", icon: "🌱", prompt: "végan (sans aucun produit animal)" },
  { id: "gluten-free", label: "Sans gluten", icon: "🌾", prompt: "sans gluten" },
  { id: "lactose-free", label: "Sans lactose", icon: "🥛", prompt: "sans lactose ni produits laitiers" },
  { id: "halal", label: "Halal", icon: "☪️", prompt: "halal" },
  { id: "low-carb", label: "Low carb", icon: "🥑", prompt: "faible en glucides" },
  { id: "quick", label: "< 20 min", icon: "⚡", prompt: "rapide à préparer (moins de 20 minutes)" },
];

function onDeviceReady() {
  loadAppState();
  initEventListeners();
  initTextareaAutoResize();
  renderSettings();
  renderFavorites();
  renderHistory();
  renderShoppingList();
}

// --- PERSISTENCE ---
function loadAppState() {
  try {
    const favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    const history = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const shoppingList = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);

    if (favorites) appState.favorites = JSON.parse(favorites);
    if (history) appState.history = JSON.parse(history);
    if (settings) appState.settings = JSON.parse(settings);
    if (shoppingList) appState.shoppingList = JSON.parse(shoppingList);
  } catch (e) {
    console.error("Erreur chargement état:", e);
  }
}

function saveAppState() {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(appState.favorites));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(appState.history));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(appState.shoppingList));
  } catch (e) {
    console.error("Erreur sauvegarde état:", e);
  }
}

// --- EVENT LISTENERS ---
function initEventListeners() {
  document.getElementById("takePictureBtn").addEventListener("click", debounce(takePictureForChat, 300));
  document.getElementById("selectPictureBtn").addEventListener("click", debounce(selectPictureForChat, 300));
  document.getElementById("clearPictureBtn").addEventListener("click", clearPicture);
  document.getElementById("sendBtn").addEventListener("click", debounce(sendToOpenAI, 500));

  // Navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", handleNavigation);
  });

  // Fermer le clavier en tapant ailleurs
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".input-section")) {
      document.getElementById("question").blur();
    }
  });
}

function initTextareaAutoResize() {
  const textarea = document.getElementById("question");
  textarea.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function handleNavigation(e) {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((nav) => {
    nav.classList.remove("active");
    nav.setAttribute("aria-selected", "false");
  });
  e.currentTarget.classList.add("active");
  e.currentTarget.setAttribute("aria-selected", "true");

  document.querySelectorAll(".view-section").forEach((view) => {
    view.classList.remove("active");
  });

  const targetId = e.currentTarget.getAttribute("data-target");
  const targetView = document.getElementById(targetId);
  if (targetView) {
    targetView.classList.add("active");
  }

  // Rafraîchir les vues si nécessaire
  if (targetId === "view-favorites") renderFavorites();
  if (targetId === "view-history") renderHistory();
  if (targetId === "view-shopping") renderShoppingList();
}

// --- CAMERA & GALERIE ---
function takePictureForChat() {
  if (isProcessing) return;

  navigator.camera.getPicture(onPictureSuccess, onCameraFail, {
    quality: 70,
    destinationType: Camera.DestinationType.DATA_URL,
    sourceType: Camera.PictureSourceType.CAMERA,
    encodingType: Camera.EncodingType.JPEG,
    mediaType: Camera.MediaType.PICTURE,
    correctOrientation: true,
    targetWidth: 800,
    targetHeight: 800,
  });
}

function selectPictureForChat() {
  if (isProcessing) return;

  navigator.camera.getPicture(onPictureSuccess, onCameraFail, {
    quality: 70,
    destinationType: Camera.DestinationType.DATA_URL,
    sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
    encodingType: Camera.EncodingType.JPEG,
    mediaType: Camera.MediaType.PICTURE,
    correctOrientation: true,
    targetWidth: 800,
    targetHeight: 800,
  });
}

function onPictureSuccess(imageData) {
  let cleanBase64 = imageData.startsWith("data:image")
    ? imageData.split(",")[1]
    : imageData;
  cleanBase64 = cleanBase64.replace(/\s/g, "");
  selectedImageBase64 = cleanBase64;

  const wrapper = document.getElementById("imagePreview");
  wrapper.classList.remove("empty");
  wrapper.innerHTML = `<img src="data:image/jpeg;base64,${selectedImageBase64}" class="preview-img" alt="Aperçu de votre frigo">`;

  document.getElementById("clearPictureBtn").style.display = "flex";

  if (navigator.vibrate) navigator.vibrate(50);
}

function clearPicture() {
  selectedImageBase64 = null;
  const wrapper = document.getElementById("imagePreview");
  wrapper.classList.add("empty");
  wrapper.innerHTML = `
    <div class="placeholder-content">
      <span class="icon">📸</span>
      <p>Montrez-moi votre frigo</p>
    </div>`;
  document.getElementById("clearPictureBtn").style.display = "none";
}

function onCameraFail(msg) {
  console.error("Erreur caméra:", msg);
  if (msg && !msg.toLowerCase().includes("cancel") && !msg.toLowerCase().includes("no image")) {
    showToast("Impossible d'accéder à la caméra");
  }
}

// --- TOAST NOTIFICATION ---
function showToast(message, duration = 3000) {
  const existingToast = document.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- TIMER ---
function parseTimeFromStep(stepText) {
  // Cherche des patterns comme "5 min", "2 minutes", "30 sec", "(3 min)"
  const patterns = [
    /\((\d+)\s*min(?:utes?)?\)/i,
    /(\d+)\s*min(?:utes?)?/i,
    /\((\d+)\s*sec(?:ondes?)?\)/i,
    /(\d+)\s*sec(?:ondes?)?/i,
  ];

  for (const pattern of patterns) {
    const match = stepText.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      if (pattern.source.includes("sec")) {
        return value; // secondes
      }
      return value * 60; // convertir minutes en secondes
    }
  }
  return null;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function startTimer(stepId, duration) {
  // Arrêter le timer existant si présent
  if (activeTimers[stepId]) {
    clearInterval(activeTimers[stepId].interval);
  }

  const timerBtn = document.querySelector(`[data-step-id="${stepId}"] .timer-btn`);
  if (!timerBtn) return;

  let remaining = duration;
  timerBtn.classList.add("running");
  timerBtn.innerHTML = `<span class="timer-display">${formatTime(remaining)}</span>`;

  activeTimers[stepId] = {
    interval: setInterval(() => {
      remaining--;
      timerBtn.innerHTML = `<span class="timer-display">${formatTime(remaining)}</span>`;

      if (remaining <= 0) {
        clearInterval(activeTimers[stepId].interval);
        delete activeTimers[stepId];
        timerBtn.classList.remove("running");
        timerBtn.classList.add("finished");
        timerBtn.innerHTML = `<span>✅ Terminé!</span>`;

        // Notification sonore/vibration
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
        showToast("⏰ Timer terminé !");

        // Reset après 3 secondes
        setTimeout(() => {
          timerBtn.classList.remove("finished");
          timerBtn.innerHTML = `<span>⏱️ ${formatTime(duration)}</span>`;
        }, 3000);
      }
    }, 1000),
    duration: duration,
  };
}

function stopTimer(stepId) {
  if (activeTimers[stepId]) {
    clearInterval(activeTimers[stepId].interval);
    const duration = activeTimers[stepId].duration;
    delete activeTimers[stepId];

    const timerBtn = document.querySelector(`[data-step-id="${stepId}"] .timer-btn`);
    if (timerBtn) {
      timerBtn.classList.remove("running");
      timerBtn.innerHTML = `<span>⏱️ ${formatTime(duration)}</span>`;
    }
  }
}

function toggleTimer(stepId, duration) {
  if (activeTimers[stepId]) {
    stopTimer(stepId);
  } else {
    startTimer(stepId, duration);
  }
}

// --- PORTIONS ---
function adjustPortions(recipeId, newPortions, originalPortions, originalIngredients) {
  const ratio = newPortions / originalPortions;
  const card = document.querySelector(`[data-recipe-id="${recipeId}"]`);
  if (!card) return;

  // Mettre à jour l'affichage des portions
  const portionDisplay = card.querySelector(".portion-value");
  if (portionDisplay) {
    portionDisplay.textContent = newPortions;
  }

  // Mettre à jour les calories
  const caloriesTag = card.querySelector(".tag.calories");
  if (caloriesTag) {
    const originalCalories = parseInt(caloriesTag.dataset.originalCalories) || 0;
    // Les calories par portion restent les mêmes, mais on peut afficher le total
    caloriesTag.innerHTML = `🔥 ${originalCalories} kcal/pers`;
  }

  // Recalculer les ingrédients
  const ingredientsList = card.querySelector(".ingredients-list");
  if (ingredientsList && originalIngredients) {
    const adjustedIngredients = originalIngredients.map((ing) => {
      return adjustIngredientQuantity(ing, ratio);
    });

    ingredientsList.innerHTML = adjustedIngredients
      .map((ing, i) => `
        <li>
          <label>
            <input type="checkbox" id="ing-${recipeId}-${i}">
            <span>${escapeHtml(ing)}</span>
          </label>
          <button class="add-to-list-btn" data-ingredient="${escapeHtml(ing)}" aria-label="Ajouter à la liste">+</button>
        </li>
      `)
      .join("");

    // Réattacher les listeners
    attachIngredientListeners(ingredientsList);
  }
}

function adjustIngredientQuantity(ingredient, ratio) {
  // Pattern pour trouver les quantités numériques
  const patterns = [
    /^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l|cuillères?|càs|càc|cs|cc|pincées?|tranches?|gousses?|branches?|feuilles?|œufs?|oeufs?)?\s+(.*)$/i,
    /^(\d+(?:[.,]\d+)?)\s+(.*)$/i,
  ];

  for (const pattern of patterns) {
    const match = ingredient.match(pattern);
    if (match) {
      let quantity = parseFloat(match[1].replace(",", "."));
      const newQuantity = Math.round(quantity * ratio * 10) / 10; // Arrondir à 1 décimale
      
      if (match[3]) {
        // Avec unité
        return `${newQuantity} ${match[2]} ${match[3]}`;
      } else {
        // Sans unité
        return `${newQuantity} ${match[2]}`;
      }
    }
  }

  // Si pas de quantité trouvée, retourner tel quel
  return ingredient;
}

// --- LISTE DE COURSES ---
function addToShoppingList(ingredient) {
  // Nettoyer l'ingrédient (enlever quantités)
  const cleanIngredient = ingredient.replace(/^\d+(?:[.,]\d+)?\s*(kg|g|ml|cl|l|cuillères?|càs|càc|cs|cc)?\s*/i, "").trim();

  // Vérifier si déjà présent
  const exists = appState.shoppingList.some(
    (item) => item.name.toLowerCase() === cleanIngredient.toLowerCase()
  );

  if (exists) {
    showToast("Déjà dans la liste !");
    return;
  }

  appState.shoppingList.push({
    id: Date.now(),
    name: cleanIngredient,
    fullText: ingredient,
    checked: false,
    addedAt: new Date().toISOString(),
  });

  saveAppState();
  showToast("Ajouté à la liste 🛒");
}

function removeFromShoppingList(itemId) {
  appState.shoppingList = appState.shoppingList.filter((item) => item.id !== itemId);
  saveAppState();
  renderShoppingList();
}

function toggleShoppingItem(itemId) {
  const item = appState.shoppingList.find((i) => i.id === itemId);
  if (item) {
    item.checked = !item.checked;
    saveAppState();
    renderShoppingList();
  }
}

function clearCheckedItems() {
  appState.shoppingList = appState.shoppingList.filter((item) => !item.checked);
  saveAppState();
  renderShoppingList();
  showToast("Articles cochés supprimés");
}

function clearAllShoppingList() {
  if (confirm("Vider toute la liste de courses ?")) {
    appState.shoppingList = [];
    saveAppState();
    renderShoppingList();
    showToast("Liste vidée");
  }
}

function shareShoppingList() {
  if (appState.shoppingList.length === 0) {
    showToast("La liste est vide !");
    return;
  }

  const uncheckedItems = appState.shoppingList.filter((item) => !item.checked);
  let text = "🛒 Liste de courses\n\n";
  uncheckedItems.forEach((item) => {
    text += `• ${item.fullText || item.name}\n`;
  });
  text += "\n— Frigo Chef 👨‍🍳";

  if (navigator.share) {
    navigator.share({ title: "Liste de courses", text: text }).catch(() => {
      fallbackShare(text);
    });
  } else {
    fallbackShare(text);
  }
}

function renderShoppingList() {
  const container = document.getElementById("shopping-content");
  if (!container) return;

  if (appState.shoppingList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🛒</span>
        <p>Liste de courses vide</p>
        <small>Ajoutez des ingrédients depuis les recettes</small>
      </div>
    `;
    return;
  }

  const unchecked = appState.shoppingList.filter((i) => !i.checked);
  const checked = appState.shoppingList.filter((i) => i.checked);

  let html = `
    <div class="shopping-actions">
      <button class="shopping-action-btn share" onclick="shareShoppingList()">
        📤 Partager
      </button>
      <button class="shopping-action-btn clear" onclick="clearCheckedItems()">
        🗑️ Supprimer cochés
      </button>
    </div>
    <div class="shopping-items">
  `;

  unchecked.forEach((item) => {
    html += `
      <div class="shopping-item" data-id="${item.id}">
        <label class="shopping-checkbox">
          <input type="checkbox" onchange="toggleShoppingItem(${item.id})">
          <span class="shopping-name">${escapeHtml(item.fullText || item.name)}</span>
        </label>
        <button class="shopping-delete" onclick="removeFromShoppingList(${item.id})">✕</button>
      </div>
    `;
  });

  if (checked.length > 0) {
    html += `<div class="shopping-divider">Terminé (${checked.length})</div>`;
    checked.forEach((item) => {
      html += `
        <div class="shopping-item checked" data-id="${item.id}">
          <label class="shopping-checkbox">
            <input type="checkbox" checked onchange="toggleShoppingItem(${item.id})">
            <span class="shopping-name">${escapeHtml(item.fullText || item.name)}</span>
          </label>
          <button class="shopping-delete" onclick="removeFromShoppingList(${item.id})">✕</button>
        </div>
      `;
    });
  }

  html += "</div>";
  container.innerHTML = html;
}

function attachIngredientListeners(container) {
  container.querySelectorAll(".add-to-list-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const ingredient = btn.dataset.ingredient;
      addToShoppingList(ingredient);
      btn.classList.add("added");
      btn.textContent = "✓";
      setTimeout(() => {
        btn.classList.remove("added");
        btn.textContent = "+";
      }, 1500);
    });
  });
}

// --- FILTRES ALIMENTAIRES ---
function getActiveFiltersPrompt() {
  const activeFilters = appState.settings.dietaryFilters;
  if (activeFilters.length === 0) return "";

  const filterPrompts = activeFilters
    .map((id) => DIETARY_FILTERS.find((f) => f.id === id)?.prompt)
    .filter(Boolean);

  return `\nCONTRAINTES OBLIGATOIRES: Les recettes doivent être ${filterPrompts.join(", ")}.`;
}

function renderSettings() {
  const container = document.getElementById("settings-content");
  if (!container) return;

  const filtersHTML = DIETARY_FILTERS.map((filter) => {
    const isActive = appState.settings.dietaryFilters.includes(filter.id);
    return `
      <label class="filter-chip ${isActive ? "active" : ""}" data-filter="${filter.id}">
        <input type="checkbox" ${isActive ? "checked" : ""}>
        <span class="filter-icon">${filter.icon}</span>
        <span class="filter-label">${filter.label}</span>
      </label>
    `;
  }).join("");

  container.innerHTML = `
    <div class="settings-section">
      <h4>🥗 Préférences alimentaires</h4>
      <p class="settings-hint">Les recettes respecteront ces contraintes</p>
      <div class="filters-grid">
        ${filtersHTML}
      </div>
    </div>
    
    <div class="settings-section">
      <h4>🗑️ Données</h4>
      <button class="settings-btn danger" id="clearHistoryBtn">
        Effacer l'historique
      </button>
      <button class="settings-btn danger" id="clearFavoritesBtn">
        Effacer les favoris
      </button>
      <button class="settings-btn danger" id="clearShoppingBtn">
        Vider la liste de courses
      </button>
    </div>
  `;

  // Event listeners pour les filtres
  container.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const filterId = chip.dataset.filter;
      const checkbox = chip.querySelector("input");
      checkbox.checked = !checkbox.checked;
      chip.classList.toggle("active", checkbox.checked);

      if (checkbox.checked) {
        if (!appState.settings.dietaryFilters.includes(filterId)) {
          appState.settings.dietaryFilters.push(filterId);
        }
      } else {
        appState.settings.dietaryFilters = appState.settings.dietaryFilters.filter((id) => id !== filterId);
      }
      saveAppState();
      showToast(checkbox.checked ? "Filtre activé" : "Filtre désactivé");
    });
  });

  // Boutons de suppression
  document.getElementById("clearHistoryBtn")?.addEventListener("click", () => {
    if (confirm("Effacer tout l'historique ?")) {
      appState.history = [];
      saveAppState();
      renderHistory();
      showToast("Historique effacé");
    }
  });

  document.getElementById("clearFavoritesBtn")?.addEventListener("click", () => {
    if (confirm("Effacer tous les favoris ?")) {
      appState.favorites = [];
      saveAppState();
      renderFavorites();
      showToast("Favoris effacés");
    }
  });

  document.getElementById("clearShoppingBtn")?.addEventListener("click", clearAllShoppingList);
}

// --- HISTORIQUE ---
function addToHistory(query, imageBase64, results) {
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    query: query || "Scan de frigo",
    hasImage: !!imageBase64,
    imageThumb: imageBase64 ? imageBase64.substring(0, 100) : null,
    results: results,
  };

  appState.history.unshift(entry);
  if (appState.history.length > 10) {
    appState.history = appState.history.slice(0, 10);
  }
  saveAppState();
}

function renderHistory() {
  const container = document.getElementById("history-content");
  if (!container) return;

  if (appState.history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p>Aucune recherche récente</p>
        <small>Vos dernières recherches apparaîtront ici</small>
      </div>
    `;
    return;
  }

  const historyHTML = appState.history.map((entry) => {
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const recipesPreview = entry.results?.recettes
      ?.slice(0, 2)
      .map((r) => r.nom)
      .join(", ") || "Aucune recette";

    return `
      <div class="history-card" data-history-id="${entry.id}">
        <div class="history-header">
          <span class="history-icon">${entry.hasImage ? "📷" : "✏️"}</span>
          <div class="history-info">
            <p class="history-query">${escapeHtml(entry.query)}</p>
            <small class="history-date">${formattedDate}</small>
          </div>
        </div>
        <p class="history-preview">${escapeHtml(recipesPreview)}</p>
        <div class="history-actions">
          <button class="history-btn replay" data-id="${entry.id}">
            🔄 Refaire
          </button>
          <button class="history-btn view" data-id="${entry.id}">
            👁️ Voir
          </button>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = historyHTML;

  container.querySelectorAll(".history-btn.replay").forEach((btn) => {
    btn.addEventListener("click", () => replayHistory(btn.dataset.id));
  });

  container.querySelectorAll(".history-btn.view").forEach((btn) => {
    btn.addEventListener("click", () => viewHistoryResults(btn.dataset.id));
  });
}

function replayHistory(historyId) {
  const entry = appState.history.find((h) => h.id === parseInt(historyId));
  if (!entry) return;

  document.querySelector('[data-target="view-home"]').click();
  document.getElementById("question").value = entry.query !== "Scan de frigo" ? entry.query : "";
  showToast("Recherche rechargée - appuyez sur le bouton");
}

function viewHistoryResults(historyId) {
  const entry = appState.history.find((h) => h.id === parseInt(historyId));
  if (!entry || !entry.results) return;

  document.querySelector('[data-target="view-home"]').click();

  setTimeout(() => {
    renderRecipes(entry.results, false);
  }, 300);
}

// --- FAVORIS ---
function toggleFavorite(recipe) {
  const existingIndex = appState.favorites.findIndex((f) => f.nom === recipe.nom);

  if (existingIndex >= 0) {
    appState.favorites.splice(existingIndex, 1);
    showToast("Retiré des favoris");
  } else {
    const favoriteRecipe = {
      ...recipe,
      id: Date.now(),
      savedAt: new Date().toISOString(),
    };
    appState.favorites.unshift(favoriteRecipe);
    showToast("Ajouté aux favoris ❤️");
  }

  saveAppState();
  renderFavorites();
}

function isFavorite(recipeName) {
  return appState.favorites.some((f) => f.nom === recipeName);
}

function renderFavorites() {
  const container = document.getElementById("favorites-content");
  if (!container) return;

  if (appState.favorites.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">❤️</span>
        <p>Aucune recette favorite</p>
        <small>Appuyez sur le cœur pour sauvegarder une recette</small>
      </div>
    `;
    return;
  }

  const favoritesHTML = appState.favorites.map((recipe) => {
    return createRecipeCardHTML(recipe, true);
  }).join("");

  container.innerHTML = `<div class="favorites-grid">${favoritesHTML}</div>`;
  attachRecipeCardListeners(container);
}

// --- PARTAGE ---
function shareRecipe(recipe) {
  const shareText = formatRecipeForShare(recipe);

  if (navigator.share) {
    navigator.share({
      title: recipe.nom,
      text: shareText,
    }).catch((err) => {
      if (err.name !== "AbortError") {
        fallbackShare(shareText);
      }
    });
  } else {
    fallbackShare(shareText);
  }
}

function formatRecipeForShare(recipe) {
  let text = `🍽️ ${recipe.nom}\n`;
  text += `⏱️ ${recipe.temps} | 👨‍🍳 ${recipe.difficulte || "Moyen"}`;
  if (recipe.portions) text += ` | 👥 ${recipe.portions} pers`;
  if (recipe.calories_portion) text += ` | 🔥 ${recipe.calories_portion} kcal`;
  text += "\n\n";

  text += `📝 Ingrédients:\n`;
  recipe.ingredients.forEach((ing) => {
    text += `• ${ing}\n`;
  });

  text += `\n👩‍🍳 Préparation:\n`;
  recipe.etapes.forEach((step, i) => {
    text += `${i + 1}. ${step}\n`;
  });

  if (recipe.astuce_chef) {
    text += `\n💡 Astuce: ${recipe.astuce_chef}\n`;
  }

  text += `\n— Généré par Frigo Chef 👨‍🍳`;

  return text;
}

function fallbackShare(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Recette copiée !");
    }).catch(() => {
      showToast("Erreur lors de la copie");
    });
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showToast("Recette copiée !");
  }
}

// --- INTELLIGENCE ARTIFICIELLE ---
async function sendToOpenAI() {
  if (isProcessing) return;

  const question = document.getElementById("question").value.trim();
  const responseArea = document.getElementById("responseArea");
  const sendBtn = document.getElementById("sendBtn");

  if (!question && !selectedImageBase64) {
    showToast("Ajoutez une photo ou une description !");
    return;
  }

  if (!navigator.onLine) {
    showToast("Pas de connexion internet");
    showOfflineRecipes();
    return;
  }

  isProcessing = true;
  const originalBtnHTML = sendBtn.innerHTML;
  sendBtn.disabled = true;
  sendBtn.innerHTML = `<span class="loader-mini"></span> Recherche...`;

  responseArea.innerHTML = `
    <div class="loading-state">
      <div class="chef-loader">👨‍🍳</div>
      <p>Le chef analyse les ingrédients...</p>
    </div>
  `;

  const filtersPrompt = getActiveFiltersPrompt();

  const systemPrompt = `Tu es Chef Claude, un chef passionné et pédagogue qui adore créer des recettes avec ce qu'on a sous la main.

MISSION: Analyser les ingrédients disponibles (image ou texte) et proposer 2 recettes réalisables, savoureuses et adaptées au niveau débutant/intermédiaire.

RÈGLES:
- Utilise UNIQUEMENT les ingrédients visibles/mentionnés + basiques (sel, poivre, huile, beurre, ail, oignon)
- Si un ingrédient clé manque, suggère une alternative entre parenthèses
- Privilégie les recettes équilibrées et de saison
- Sois précis sur les quantités (grammes, cuillères, etc.)
- IMPORTANT: Inclus le temps en minutes entre parenthèses à la fin de chaque étape, ex: "Faire revenir les oignons (5 min)"
${filtersPrompt}

RÉPONSE EN JSON UNIQUEMENT:
{
  "ingredients_detectes": ["ingrédient 1", "ingrédient 2"],
  "recettes": [
    {
      "nom": "Nom appétissant de la recette",
      "temps": "25 min",
      "temps_prep": "10 min",
      "temps_cuisson": "15 min",
      "difficulte": "Facile",
      "portions": 2,
      "calories_portion": 450,
      "ingredients": [
        "200g de poulet",
        "1 cuillère à soupe d'huile d'olive"
      ],
      "etapes": [
        "Couper le poulet en dés de 2cm (2 min)",
        "Faire chauffer l'huile à feu moyen (1 min)",
        "Faire revenir le poulet jusqu'à coloration (8 min)"
      ],
      "astuce_chef": "Un conseil pro pour réussir le plat"
    }
  ],
  "suggestion": "Conseil si ingrédients limités ou message encourageant"
}

Si le frigo semble vide ou les ingrédients insuffisants, propose quand même des idées créatives avec ce qui est disponible.`;

  const userText = "Voici ce que j'ai. Propose 2 recettes." + (question ? " Note: " + question : "");

  let messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: [] },
  ];

  if (selectedImageBase64) {
    messages[1].content.push({ type: "text", text: userText });
    messages[1].content.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${selectedImageBase64}` },
    });
  } else {
    messages[1].content.push({ type: "text", text: userText });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONFIG.API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: CONFIG.MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erreur ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Réponse invalide de l'API");
    }

    const content = data.choices[0].message.content;
    const parsedData = JSON.parse(content);

    if (!parsedData.recettes || !Array.isArray(parsedData.recettes)) {
      throw new Error("Format de recettes invalide");
    }

    addToHistory(question, selectedImageBase64, parsedData);
    renderRecipes(parsedData, true);
  } catch (err) {
    console.error("Erreur API:", err);

    let errorMessage = "Une erreur est survenue";
    if (err.name === "AbortError") {
      errorMessage = "La requête a pris trop de temps";
    } else if (err.message.includes("Failed to fetch") || err.message.includes("Network")) {
      errorMessage = "Vérifiez votre connexion internet";
      showOfflineRecipes();
      return;
    } else if (err.message) {
      errorMessage = err.message;
    }

    responseArea.innerHTML = `
      <div class="error-card">
        <span class="error-icon">😕</span>
        <p>Oups, le chef a fait brûler le plat.</p>
        <small>${errorMessage}</small>
        <button class="retry-btn" onclick="sendToOpenAI()">Réessayer</button>
      </div>
    `;
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalBtnHTML;
  }
}

// --- MODE HORS-LIGNE ---
function showOfflineRecipes() {
  const responseArea = document.getElementById("responseArea");

  if (appState.favorites.length === 0) {
    responseArea.innerHTML = `
      <div class="offline-notice">
        <span class="offline-icon">📴</span>
        <h3>Mode hors-ligne</h3>
        <p>Sauvegardez des recettes en favoris pour y accéder sans internet.</p>
      </div>
    `;
    return;
  }

  responseArea.innerHTML = `
    <div class="offline-notice">
      <span class="offline-icon">📴</span>
      <h3>Mode hors-ligne</h3>
      <p>Voici vos recettes favorites disponibles :</p>
    </div>
  `;

  const offlineRecipes = {
    ingredients_detectes: [],
    recettes: appState.favorites.slice(0, 4),
  };

  renderRecipes(offlineRecipes, false, true);
}

// --- AFFICHAGE DES CARTES ---
function createRecipeCardHTML(recipe, isFav = false) {
  const recipeId = recipe.id || Date.now() + Math.random();
  const favoriteClass = isFavorite(recipe.nom) ? "active" : "";
  const portions = recipe.portions || 2;
  const calories = recipe.calories_portion || null;

  const ingredientsHTML = recipe.ingredients
    .map((ing, i) => `
      <li>
        <label>
          <input type="checkbox" id="ing-${recipeId}-${i}">
          <span>${escapeHtml(ing)}</span>
        </label>
        <button class="add-to-list-btn" data-ingredient="${escapeHtml(ing)}" aria-label="Ajouter à la liste">+</button>
      </li>
    `)
    .join("");

  const stepsHTML = recipe.etapes
    .map((step, i) => {
      const stepId = `step-${recipeId}-${i}`;
      const timerDuration = parseTimeFromStep(step);
      const timerBtn = timerDuration
        ? `<button class="timer-btn" onclick="toggleTimer('${stepId}', ${timerDuration})"><span>⏱️ ${formatTime(timerDuration)}</span></button>`
        : "";
      return `<li data-step-id="${stepId}">${escapeHtml(step)}${timerBtn}</li>`;
    })
    .join("");

  // Tags avec calories
  let tagsHTML = `
    <span class="tag time">⏱️ ${escapeHtml(recipe.temps)}</span>
    <span class="tag level">👨‍🍳 ${escapeHtml(recipe.difficulte || "Moyen")}</span>
  `;
  if (calories) {
    tagsHTML += `<span class="tag calories" data-original-calories="${calories}">🔥 ${calories} kcal</span>`;
  }

  // Astuce chef
  const astuceHTML = recipe.astuce_chef
    ? `<div class="chef-tip"><span class="tip-icon">💡</span> ${escapeHtml(recipe.astuce_chef)}</div>`
    : "";

  return `
    <article class="recipe-card" data-recipe-id="${recipeId}" data-recipe-name="${escapeHtml(recipe.nom)}" data-original-portions="${portions}" data-original-ingredients='${JSON.stringify(recipe.ingredients)}'>
      <div class="card-header">
        <h3>${escapeHtml(recipe.nom)}</h3>
        <div class="meta-tags">
          ${tagsHTML}
        </div>
      </div>
      
      <div class="portion-control">
        <span class="portion-label">👥 Portions:</span>
        <div class="portion-buttons">
          <button class="portion-btn minus" data-recipe-id="${recipeId}">−</button>
          <span class="portion-value">${portions}</span>
          <button class="portion-btn plus" data-recipe-id="${recipeId}">+</button>
        </div>
      </div>
      
      <div class="card-body">
        <h4>🛒 Ingrédients</h4>
        <ul class="ingredients-list">${ingredientsHTML}</ul>

        <h4>📝 Préparation</h4>
        <ol class="steps-list">${stepsHTML}</ol>
        
        ${astuceHTML}
      </div>
      
      <div class="card-actions">
        <button class="action-btn favorite-btn ${favoriteClass}" aria-label="Ajouter aux favoris">
          <span>${favoriteClass ? "❤️" : "🤍"}</span>
        </button>
        <button class="action-btn share-btn" aria-label="Partager">
          <span>📤</span>
        </button>
      </div>
    </article>
  `;
}

function attachRecipeCardListeners(container) {
  container.querySelectorAll(".recipe-card").forEach((card) => {
    const recipeName = card.dataset.recipeName;
    const recipeId = card.dataset.recipeId;
    const originalPortions = parseInt(card.dataset.originalPortions) || 2;
    const originalIngredients = JSON.parse(card.dataset.originalIngredients || "[]");

    const recipe = findRecipeByName(recipeName);
    if (!recipe) return;

    // Bouton favori
    const favoriteBtn = card.querySelector(".favorite-btn");
    favoriteBtn?.addEventListener("click", () => {
      toggleFavorite(recipe);
      const isNowFav = isFavorite(recipe.nom);
      favoriteBtn.classList.toggle("active", isNowFav);
      favoriteBtn.querySelector("span").textContent = isNowFav ? "❤️" : "🤍";
    });

    // Bouton partage
    const shareBtn = card.querySelector(".share-btn");
    shareBtn?.addEventListener("click", () => shareRecipe(recipe));

    // Contrôle portions
    let currentPortions = originalPortions;
    const minusBtn = card.querySelector(".portion-btn.minus");
    const plusBtn = card.querySelector(".portion-btn.plus");

    minusBtn?.addEventListener("click", () => {
      if (currentPortions > 1) {
        currentPortions--;
        adjustPortions(recipeId, currentPortions, originalPortions, originalIngredients);
      }
    });

    plusBtn?.addEventListener("click", () => {
      if (currentPortions < 12) {
        currentPortions++;
        adjustPortions(recipeId, currentPortions, originalPortions, originalIngredients);
      }
    });

    // Boutons ajouter à la liste
    attachIngredientListeners(card);
  });
}

function findRecipeByName(name) {
  const fromFavorites = appState.favorites.find((r) => r.nom === name);
  if (fromFavorites) return fromFavorites;

  for (const entry of appState.history) {
    const fromHistory = entry.results?.recettes?.find((r) => r.nom === name);
    if (fromHistory) return fromHistory;
  }

  return window._currentRecipes?.find((r) => r.nom === name);
}

function renderRecipes(data, animate = true, isOffline = false) {
  const container = document.getElementById("responseArea");

  const offlineNotice = container.querySelector(".offline-notice");
  container.innerHTML = "";
  if (offlineNotice && isOffline) {
    container.appendChild(offlineNotice);
  }

  window._currentRecipes = data.recettes;

  // Suggestion du chef
  if (data.suggestion) {
    const suggestionDiv = document.createElement("div");
    suggestionDiv.className = "chef-suggestion";
    suggestionDiv.innerHTML = `<span class="suggestion-icon">💬</span> ${escapeHtml(data.suggestion)}`;
    container.appendChild(suggestionDiv);
  }

  // Analyse (Badges)
  if (!isOffline && data.ingredients_detectes?.length > 0) {
    const analysisDiv = document.createElement("div");
    analysisDiv.className = "analysis-summary";
    analysisDiv.innerHTML = `<strong>Vu dans le frigo :</strong> ${data.ingredients_detectes.join(", ")}`;
    container.appendChild(analysisDiv);
  }

  // Cartes Recettes
  data.recettes.forEach((recipe, index) => {
    const cardWrapper = document.createElement("div");
    cardWrapper.innerHTML = createRecipeCardHTML(recipe);
    const card = cardWrapper.firstElementChild;

    if (animate) {
      card.style.animationDelay = `${index * 0.15}s`;
    } else {
      card.style.animation = "none";
      card.style.opacity = "1";
      card.style.transform = "none";
    }

    container.appendChild(card);
  });

  attachRecipeCardListeners(container);

  if (animate) {
    setTimeout(() => {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
}

// Protection XSS
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Écouter les changements de connexion
window.addEventListener("online", () => {
  showToast("Connexion rétablie ✅");
});

window.addEventListener("offline", () => {
  showToast("Mode hors-ligne 📴");
});