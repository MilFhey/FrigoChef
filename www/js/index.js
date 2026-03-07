document.addEventListener("deviceready", onDeviceReady, false);

let selectedImageBase64 = null;
let isProcessing = false;
let activeTimers = {};
let selectedPlateImageBase64 = null;
let selectedLabelImageBase64 = null;
let detectedIngredientsForValidation = null;
let chefMode = "basique"; // "basique" ou "etoile"

// Configuration
const CONFIG = {
  API_KEY:
    "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",
  API_URL: "https://api.openai.com/v1/chat/completions",
  MODEL: "gpt-4o-mini",
  MAX_TOKENS: 1500,
};

// Clés de stockage
const STORAGE_KEYS = {
  FAVORITES: "frigoChef_favorites",
  HISTORY: "frigoChef_history",
  SETTINGS: "frigoChef_settings",
  SHOPPING_LIST: "frigoChef_shoppingList",
  NUTRITION_HISTORY: "frigoChef_nutritionHistory",
  COMMUNITY: "frigoChef_community",
};

// État de l'app
let appState = {
  favorites: [],
  history: [],
  settings: {
    dietaryFilters: [],
    darkMode: false,
  },
  shoppingList: [],
  nutritionHistory: [],
  community: [],
};

// Filtres disponibles
const DIETARY_FILTERS = [
  {
    id: "vegetarian",
    label: "Végétarien",
    icon: "🥬",
    prompt: "végétarien (sans viande ni poisson)",
  },
  {
    id: "vegan",
    label: "Végan",
    icon: "🌱",
    prompt: "végan (sans aucun produit animal)",
  },
  {
    id: "gluten-free",
    label: "Sans gluten",
    icon: "🌾",
    prompt: "sans gluten",
  },
  {
    id: "lactose-free",
    label: "Sans lactose",
    icon: "🥛",
    prompt: "sans lactose ni produits laitiers",
  },
  { id: "halal", label: "Halal", icon: "☪️", prompt: "halal" },
  {
    id: "low-carb",
    label: "Low carb",
    icon: "🥑",
    prompt: "faible en glucides",
  },
  {
    id: "quick",
    label: "< 20 min",
    icon: "⚡",
    prompt: "rapide à préparer (moins de 20 minutes)",
  },
];

function onDeviceReady() {
  loadAppState();
  initEventListeners();
  initTextareaAutoResize();
  initNutritionAnalysisListeners();
  renderSettings();
  renderFavorites();
  renderHistory();
  renderShoppingList();
  renderNutritionHistory();

  // Charger la base de données alimentaire
  loadFoodDatabase().catch((err) =>
    console.error("Erreur chargement food_db:", err),
  );
}

// --- PERSISTENCE ---
function loadAppState() {
  try {
    const favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    const history = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const shoppingList = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
    const nutritionHistory = localStorage.getItem(
      STORAGE_KEYS.NUTRITION_HISTORY,
    );
    const community = localStorage.getItem(STORAGE_KEYS.COMMUNITY);

    if (favorites) appState.favorites = JSON.parse(favorites);
    if (history) appState.history = JSON.parse(history);
    if (settings) {
      appState.settings = JSON.parse(settings);
      if (appState.settings.darkMode) {
        document.body.classList.add("dark-theme");
      }
    }
    if (shoppingList) appState.shoppingList = JSON.parse(shoppingList);
    if (nutritionHistory)
      appState.nutritionHistory = JSON.parse(nutritionHistory);
    if (community) appState.community = JSON.parse(community);

    // Simuler quelques recettes si la communauté est vide (pour tester l'UI)
    if (appState.community.length === 0) {
      appState.community = [
        {
          nom: "Pâtes du Chef Anonyme",
          author: "Anonyme",
          publishedAt: new Date().toISOString(),
          temps: "15 min",
          difficulte: "Facile",
          portions: 2,
          calories_portion: 400,
          ingredients: ["200g de pâtes", "1 sauce tomate", "Fromage râpé"],
          etapes: [
            "Cuire les pâtes (10 min)",
            "Réchauffer la sauce (3 min)",
            "Mélanger avec le fromage (2 min)",
          ],
        },
      ];
    }
  } catch (e) {
    console.error("Erreur chargement état:", e);
  }
}

function saveAppState() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.FAVORITES,
      JSON.stringify(appState.favorites),
    );
    localStorage.setItem(
      STORAGE_KEYS.HISTORY,
      JSON.stringify(appState.history),
    );
    localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify(appState.settings),
    );
    localStorage.setItem(
      STORAGE_KEYS.SHOPPING_LIST,
      JSON.stringify(appState.shoppingList),
    );
    localStorage.setItem(
      STORAGE_KEYS.NUTRITION_HISTORY,
      JSON.stringify(appState.nutritionHistory),
    );
    localStorage.setItem(
      STORAGE_KEYS.COMMUNITY,
      JSON.stringify(appState.community),
    );
  } catch (e) {
    console.error("Erreur sauvegarde état:", e);
  }
}

// --- EVENT LISTENERS ---
function initEventListeners() {
  document
    .getElementById("takePictureBtn")
    .addEventListener("click", debounce(takePictureForChat, 300));
  document
    .getElementById("selectPictureBtn")
    .addEventListener("click", debounce(selectPictureForChat, 300));
  document
    .getElementById("clearPictureBtn")
    .addEventListener("click", clearPicture);
  document
    .getElementById("sendBtn")
    .addEventListener("click", debounce(sendToOpenAI, 500));

  // Sélection du mode chef
  document
    .getElementById("modeBasiqueBtn")
    .addEventListener("click", () => setChefMode("basique"));
  document
    .getElementById("modeEtoileBtn")
    .addEventListener("click", () => setChefMode("etoile"));

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

function setChefMode(mode) {
  chefMode = mode;

  // Mettre à jour l'UI
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (mode === "basique") {
    document.getElementById("modeBasiqueBtn").classList.add("active");
  } else {
    document.getElementById("modeEtoileBtn").classList.add("active");
  }

  // Feedback visuel
  const modeLabel = mode === "basique" ? "C'est la hess" : "Surprends-moi";
  showToast(`Mode "${modeLabel}" activé`);
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
  if (targetId === "view-community") renderCommunity();
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
  if (
    msg &&
    !msg.toLowerCase().includes("cancel") &&
    !msg.toLowerCase().includes("no image")
  ) {
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

  const timerBtn = document.querySelector(
    `[data-step-id="${stepId}"] .timer-btn`,
  );
  if (!timerBtn) return;

  // Récupérer le libellé de l'étape pour la notification
  const stepEl = document.querySelector(`[data-step-id="${stepId}"]`);
  const stepText = stepEl ? stepEl.textContent.replace(/\d{2}:\d{2}/, "").trim().substring(0, 60) : "Étape de cuisson";

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
        timerBtn.innerHTML = `<span>✅ Terminé !</span>`;

        // --- VIBRATION ---
        if (navigator.vibrate) {
          navigator.vibrate([300, 100, 300, 100, 300, 100, 500]);
        }

        // --- SON ---
        playTimerSound();

        // --- NOTIFICATION SYSTEME ---
        sendTimerNotification(stepText, duration);

        showToast("⏰ Timer terminé !");

        // Reset après 4 secondes
        setTimeout(() => {
          timerBtn.classList.remove("finished");
          timerBtn.innerHTML = `<span>⏱️ ${formatTime(duration)}</span>`;
        }, 4000);
      }
    }, 1000),
    duration: duration,
  };

  // Demander permission notification au premier démarrage
  requestNotificationPermission();
}

function stopTimer(stepId) {
  if (activeTimers[stepId]) {
    clearInterval(activeTimers[stepId].interval);
    const duration = activeTimers[stepId].duration;
    delete activeTimers[stepId];

    const timerBtn = document.querySelector(
      `[data-step-id="${stepId}"] .timer-btn`,
    );
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

// --- SON TIMER ---
function playTimerSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Séquence de 3 bips descendants
    const beeps = [
      { freq: 880, start: 0,    duration: 0.18 },
      { freq: 880, start: 0.25, duration: 0.18 },
      { freq: 1100, start: 0.5, duration: 0.4  },
    ];

    beeps.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    });

    // Fermer le contexte audio après 2s
    setTimeout(() => ctx.close().catch(() => {}), 2000);
  } catch (e) {
    console.warn("Son timer non disponible:", e);
  }
}

// --- NOTIFICATION SYSTEME ---
function requestNotificationPermission() {
  // Cordova local-notification (Android natif)
  if (window.cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local) {
    cordova.plugins.notification.local.requestPermission((granted) => {
      if (granted) {
        console.log("Permission notifications locales accordée");
      }
    });
    return;
  }
  // Fallback Web Notifications
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        showToast("🔔 Notifications activées !");
      }
    });
  }
}

// Compteur d'ID unique pour les notifications
let _notifId = 1;

function sendTimerNotification(stepText, duration) {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationLabel = mins > 0
    ? `${mins} min${secs > 0 ? ` ${secs}s` : ""}`
    : `${secs}s`;

  const title = "⏰ FrigoChef — Timer terminé !";
  const text  = `${durationLabel} écoulés — ${stepText}`;

  // ── Priorité 1 : Plugin Cordova (Android natif, app fermée) ──
  if (window.cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local) {
    try {
      cordova.plugins.notification.local.schedule({
        id:       _notifId++,
        title:    title,
        text:     text,
        icon:     "res://ic_launcher",
        smallIcon:"res://ic_launcher",
        sound:    true,
        vibrate:  true,
        priority: 2,         // HIGH
        foreground: true,    // afficher même app au premier plan
        // trigger immédiat (at: now)
        trigger:  { at: new Date() },
      });
    } catch (e) {
      console.warn("cordova-plugin-local-notification erreur:", e);
    }
    return;
  }

  // ── Priorité 2 : Web Notifications API (navigateur / fallback) ──
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const notif = new Notification(title, {
      body:             text,
      icon:             "img/logo.png",
      badge:            "img/logo.png",
      tag:              "frigochef-timer",
      requireInteraction: true,
      silent:           false,
    });
    setTimeout(() => notif.close(), 8000);
    notif.onclick = () => { window.focus(); notif.close(); };
  } catch (e) {
    console.warn("Web Notification impossible:", e);
  }
}

// --- PORTIONS ---
function adjustPortions(
  recipeId,
  newPortions,
  originalPortions,
  originalIngredients,
) {
  const ratio = newPortions / originalPortions;
  const card = document.querySelector(`[data-recipe-id="${recipeId}"]`);
  if (!card) return;

  // Mettre à jour l'affichage des portions
  const portionDisplay = card.querySelector(".portion-value");
  if (portionDisplay) {
    portionDisplay.textContent = newPortions;
  }

  // Mettre à jour les calories — tag fallback (sans carte nutrition)
  const caloriesTag = card.querySelector(".tag.calories");
  if (caloriesTag) {
    const originalCalories = parseInt(caloriesTag.dataset.originalCalories) || 0;
    if (originalCalories > 0) {
      const totalCalories = Math.round(originalCalories * newPortions);
      caloriesTag.innerHTML = `🔥 ${originalCalories} kcal/pers · ${totalCalories} kcal total <small>(estimé IA)</small>`;
    }
  }

  // Mettre à jour la carte nutrition détaillée si elle existe
  const nutritionCard = card.querySelector(".nutrition-card");
  if (nutritionCard) {
    const calPerServing = parseInt(nutritionCard.dataset.caloriesPerServing) || 0;
    const origServings = parseInt(nutritionCard.dataset.originalServings) || originalPortions;

    // Mettre à jour le titre avec le nouveau nombre de portions
    const nutritionTitle = nutritionCard.querySelector("h4");
    if (nutritionTitle) {
      nutritionTitle.innerHTML = `📊 Valeurs nutritionnelles <small>(par portion · ${newPortions} portion${newPortions > 1 ? "s" : ""} au total)</small>`;
    }

    // Mettre à jour l'affichage des calories (par portion = inchangé, total = mis à jour)
    if (calPerServing > 0) {
      const totalCalNutrition = Math.round(calPerServing * newPortions);
      // Chercher le macro-item Calories
      nutritionCard.querySelectorAll(".macro-item").forEach((item) => {
        const label = item.querySelector(".macro-label");
        const value = item.querySelector(".macro-value");
        if (label && value && label.textContent.trim() === "Calories") {
          value.innerHTML = `${calPerServing} kcal/pers <small style="color:var(--text-muted,#888)">· ${totalCalNutrition} kcal total</small>`;
        }
      });
    }
  }

  // Recalculer les ingrédients
  const ingredientsList = card.querySelector(".ingredients-list");
  if (ingredientsList && originalIngredients) {
    const adjustedIngredients = originalIngredients.map((ing) => {
      return adjustIngredientQuantity(ing, ratio);
    });

    ingredientsList.innerHTML = adjustedIngredients
      .map(
        (ing, i) => `
        <li>
          <label>
            <input type="checkbox" id="ing-${recipeId}-${i}">
            <span>${escapeHtml(ing)}</span>
          </label>
          <button class="add-to-list-btn" data-ingredient="${escapeHtml(ing)}" aria-label="Ajouter à la liste">+</button>
        </li>
      `,
      )
      .join("");

    // Réattacher les listeners
    attachIngredientListeners(ingredientsList);
  }
}

function adjustIngredientQuantity(ingredient, ratio) {
  // Pattern 1: nombre + unité optionnelle + nom  (ex: "200g de poulet", "3 tomates", "1.5 oignon")
  const patternWithUnit = /^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l|cuillères?|càs|càc|cs|cc|pincées?|tranches?|gousses?|branches?|feuilles?|œufs?|oeufs?)\s+(.+)$/i;
  // Pattern 2: nombre + espace + reste (sans unité reconnue)
  const patternNoUnit = /^(\d+(?:[.,]\d+)?)\s+(.+)$/i;

  let match = ingredient.match(patternWithUnit);
  if (match) {
    const quantity = parseFloat(match[1].replace(",", "."));
    const newQuantity = Math.round(quantity * ratio * 10) / 10;
    const unit = match[2];
    const name = match[3];
    return `${newQuantity} ${unit} ${name}`;
  }

  match = ingredient.match(patternNoUnit);
  if (match) {
    const quantity = parseFloat(match[1].replace(",", "."));
    const newQuantity = Math.round(quantity * ratio * 10) / 10;
    const name = match[2];
    return `${newQuantity} ${name}`;
  }

  // Si pas de quantité trouvée, retourner tel quel
  return ingredient;
}

// --- LISTE DE COURSES ---
function addToShoppingList(ingredient) {
  // Nettoyer l'ingrédient (enlever quantités)
  const cleanIngredient = ingredient
    .replace(
      /^\d+(?:[.,]\d+)?\s*(kg|g|ml|cl|l|cuillères?|càs|càc|cs|cc)?\s*/i,
      "",
    )
    .trim();

  // Vérifier si déjà présent
  const exists = appState.shoppingList.some(
    (item) => item.name.toLowerCase() === cleanIngredient.toLowerCase(),
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
  appState.shoppingList = appState.shoppingList.filter(
    (item) => item.id !== itemId,
  );
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

  // Liste des exclusions par filtre
  const exclusions = [];
  activeFilters.forEach((id) => {
    switch (id) {
      case "vegetarian":
        exclusions.push(
          "viande",
          "poisson",
          "fruits de mer",
          "poulet",
          "bœuf",
          "porc",
          "jambon",
          "saucisse",
          "bacon",
        );
        break;
      case "vegan":
        exclusions.push(
          "viande",
          "poisson",
          "fruits de mer",
          "œufs",
          "lait",
          "fromage",
          "beurre",
          "crème",
          "yaourt",
          "miel",
          "poulet",
          "bœuf",
          "porc",
          "jambon",
          "saucisse",
          "bacon",
        );
        break;
      case "gluten-free":
        exclusions.push("pâtes", "pain", "farine de blé", "semoule");
        break;
      case "lactose-free":
        exclusions.push("lait", "fromage", "beurre", "crème", "yaourt");
        break;
    }
  });

  const exclusionsText =
    exclusions.length > 0
      ? `\n⛔ INGRÉDIENTS STRICTEMENT INTERDITS: ${exclusions.join(", ")}. Si un ingrédient interdit est dans la liste, NE PAS le  utiliser et proposer une alternative.`
      : "";

  return `\n🔒 CONTRAINTES OBLIGATOIRES: Les recettes doivent être ${filterPrompts.join(", ")}.${exclusionsText}`;
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
      <h4>🌙 Apparence</h4>
      <label class="theme-toggle">
        <span>Mode Sombre</span>
        <input type="checkbox" id="darkModeToggle" ${appState.settings.darkMode ? "checked" : ""}>
        <span class="toggle-slider"></span>
      </label>
    </div>

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

  document.getElementById("darkModeToggle")?.addEventListener("change", (e) => {
    const isDark = e.target.checked;
    appState.settings.darkMode = isDark;

    if (isDark) {
      document.body.classList.add("dark-theme");
      showToast("Mode sombre activé 🌙");
    } else {
      document.body.classList.remove("dark-theme");
      showToast("Mode clair activé ☀️");
    }
    saveAppState();
  });

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
        appState.settings.dietaryFilters =
          appState.settings.dietaryFilters.filter((id) => id !== filterId);
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

  document
    .getElementById("clearFavoritesBtn")
    ?.addEventListener("click", () => {
      if (confirm("Effacer tous les favoris ?")) {
        appState.favorites = [];
        saveAppState();
        renderFavorites();
        showToast("Favoris effacés");
      }
    });

  document
    .getElementById("clearShoppingBtn")
    ?.addEventListener("click", clearAllShoppingList);
}

// --- HISTORIQUE ---
function addToHistory(
  query,
  imageBase64,
  results,
  detectedIngredients = null,
  validatedIngredients = null,
  confidence = null,
  notes = null,
) {
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    query: query || "Scan de frigo",
    hasImage: !!imageBase64,
    imageData: imageBase64, // Sauvegarder l'image complète pour pouvoir refaire
    imageThumb: imageBase64 ? imageBase64.substring(0, 100) : null,
    results: results,
    detectedIngredients: detectedIngredients, // Ingrédients détectés par l'IA
    validatedIngredients: validatedIngredients, // Ingrédients validés/modifiés par l'utilisateur (NOUVEAU)
    confidence: confidence,
    notes: notes,
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

  const historyHTML = appState.history
    .map((entry) => {
      const date = new Date(entry.date);
      const formattedDate = date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      const recipesPreview =
        entry.results?.recettes
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
    })
    .join("");

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

  // Aller à la page d'accueil
  document.querySelector('[data-target="view-home"]').click();

  // ✅ CORRECTION : Attendre que la navigation soit complète avant de restaurer l'état
  setTimeout(() => {
    // Si c'était un scan de frigo avec image
    if (entry.hasImage && entry.imageData) {
      selectedImageBase64 = entry.imageData;

      // Afficher l'image
      const preview = document.getElementById("imagePreview");
      const img = preview.querySelector("img");
      const placeholder = preview.querySelector(".placeholder-content");
      const deleteBtn = document.getElementById("clearImageBtn");

      img.src = `data:image/jpeg;base64,${entry.imageData}`;
      img.style.display = "block";
      placeholder.style.display = "none";
      deleteBtn.style.display = "block";
      preview.classList.remove("empty");

      // Si des ingrédients ont été détectés/validés, les restaurer
      if (entry.validatedIngredients && entry.validatedIngredients.length > 0) {
        // Utiliser les ingrédients validés (finaux)
        detectedIngredientsForValidation = entry.validatedIngredients;

        // Restaurer aussi dans la barre de recherche
        document.getElementById("question").value =
          entry.validatedIngredients.join(", ");

        // Afficher l'écran de validation avec les ingrédients validés
        setTimeout(() => {
          showIngredientValidationScreen(
            entry.validatedIngredients,
            entry.confidence || "high",
            "Ingrédients validés restaurés depuis l'historique",
          );
        }, 100);

        showToast("✅ Photo et ingrédients validés restaurés");
      } else if (
        entry.detectedIngredients &&
        entry.detectedIngredients.length > 0
      ) {
        // Fallback sur les ingrédients détectés (si pas de validation)
        detectedIngredientsForValidation = entry.detectedIngredients;

        document.getElementById("question").value =
          entry.detectedIngredients.join(", ");

        setTimeout(() => {
          showIngredientValidationScreen(
            entry.detectedIngredients,
            entry.confidence || "medium",
            "Ingrédients détectés restaurés depuis l'historique",
          );
        }, 100);

        showToast("✅ Photo et ingrédients restaurés");
      } else {
        // Pas d'ingrédients sauvegardés, juste l'image
        showToast("📷 Image restaurée - Cliquez sur Analyser");
      }
    } else {
      // ✅ Recherche textuelle manuelle : restaurer les ingrédients validés
      if (entry.validatedIngredients && entry.validatedIngredients.length > 0) {
        // Restaurer dans la barre de recherche
        document.getElementById("question").value =
          entry.validatedIngredients.join(", ");

        detectedIngredientsForValidation = entry.validatedIngredients;

        // Afficher directement l'écran de validation
        setTimeout(() => {
          showIngredientValidationScreen(
            entry.validatedIngredients,
            "high",
            "Ingrédients restaurés depuis l'historique",
          );
        }, 100);

        showToast("✅ Ingrédients restaurés - Validez pour générer");
      } else if (entry.query && entry.query !== "Scan de frigo") {
        // Fallback : juste restaurer la query
        document.getElementById("question").value = entry.query;
        showToast("Recherche rechargée");
      } else {
        showToast("Impossible de restaurer cette recherche");
      }
    }
  }, 100);
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
  const existingIndex = appState.favorites.findIndex(
    (f) => f.nom === recipe.nom,
  );

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

  const favoritesHTML = appState.favorites
    .map((recipe) => createFavoriteAccordionHTML(recipe))
    .join("");

  container.innerHTML = `<div class="favorites-list">${favoritesHTML}</div>`;

  // Accordéon
  container.querySelectorAll(".fav-accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.closest(".fav-accordion-item");
      const body = item.querySelector(".fav-accordion-body");
      const isOpen = item.classList.contains("open");

      // Fermer tous les autres
      container.querySelectorAll(".fav-accordion-item.open").forEach((openItem) => {
        if (openItem !== item) {
          openItem.classList.remove("open");
          openItem.querySelector(".fav-accordion-body").style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove("open");
        body.style.maxHeight = null;
      } else {
        item.classList.add("open");
        body.style.maxHeight = body.scrollHeight + "px";
        setTimeout(() => {
          if (item.classList.contains("open")) {
            body.style.maxHeight = body.scrollHeight + "px";
          }
        }, 300);
      }
    });
  });

  // Boutons d'action dans les accordéons favoris
  container.querySelectorAll(".fav-accordion-item").forEach((item) => {
    const recipeName = item.dataset.recipeName;
    const recipe = appState.favorites.find((r) => r.nom === recipeName);
    if (!recipe) return;

    const recipeId = item.dataset.recipeId;
    const originalPortions = parseInt(item.dataset.originalPortions) || 2;
    const ingredientsJSON = (item.dataset.originalIngredients || "[]")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    const originalIngredients = JSON.parse(ingredientsJSON);

    // Contrôle portions
    let currentPortions = originalPortions;
    const minusBtn = item.querySelector(".fav-portion-btn.minus");
    const plusBtn = item.querySelector(".fav-portion-btn.plus");

    minusBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentPortions > 1) {
        currentPortions--;
        item.querySelector(".fav-portion-value").textContent = currentPortions;
        adjustFavPortions(item, recipeId, currentPortions, originalPortions, originalIngredients);
      }
    });

    plusBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentPortions < 12) {
        currentPortions++;
        item.querySelector(".fav-portion-value").textContent = currentPortions;
        adjustFavPortions(item, recipeId, currentPortions, originalPortions, originalIngredients);
      }
    });

    // Bouton retirer des favoris
    const removeFavBtn = item.querySelector(".fav-remove-btn");
    removeFavBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(recipe);
    });

    // Bouton partage
    const shareBtn = item.querySelector(".fav-share-btn");
    shareBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      shareRecipe(recipe);
    });

    // Bouton publier en communauté
    const publishBtn = item.querySelector(".fav-publish-btn");
    publishBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      publishToCommunity(recipe);
    });

    // Boutons ajout liste de courses
    item.querySelectorAll(".add-to-list-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        addToShoppingList(btn.dataset.ingredient);
      });
    });
  });
}

function adjustFavPortions(item, recipeId, newPortions, originalPortions, originalIngredients) {
  const ratio = newPortions / originalPortions;

  // Mettre à jour tag calories fallback
  const caloriesTag = item.querySelector(".fav-tag.fav-tag-calories");
  if (caloriesTag) {
    const origCal = parseInt(caloriesTag.dataset.originalCalories) || 0;
    if (origCal > 0) {
      caloriesTag.innerHTML = `🔥 ${origCal} kcal/pers · ${Math.round(origCal * newPortions)} kcal total`;
    }
  }

  // Mettre à jour la liste des ingrédients
  const ingredientsList = item.querySelector(".fav-ingredients-list");
  if (ingredientsList && originalIngredients) {
    const adjusted = originalIngredients.map((ing) => adjustIngredientQuantity(ing, ratio));
    ingredientsList.innerHTML = adjusted.map((ing, i) => `
      <li>
        <label>
          <input type="checkbox" id="fav-ing-${recipeId}-${i}">
          <span>${escapeHtml(ing)}</span>
        </label>
        <button class="add-to-list-btn" data-ingredient="${escapeHtml(ing)}" aria-label="Ajouter à la liste">+</button>
      </li>`).join("");
    // Réattacher les listeners d'ajout liste
    ingredientsList.querySelectorAll(".add-to-list-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        addToShoppingList(btn.dataset.ingredient);
      });
    });
  }

  // Recalculer taille accordéon après changement de contenu
  const body = item.querySelector(".fav-accordion-body");
  if (body && item.classList.contains("open")) {
    body.style.maxHeight = body.scrollHeight + "px";
  }
}

function createFavoriteAccordionHTML(recipe) {
  const recipeId = recipe.id || Date.now() + Math.random();
  const portions = recipe.portions || 2;
  const calories = recipe.calories_portion || null;
  const savedAt = recipe.savedAt
    ? new Date(recipe.savedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    : "";

  // Aperçu ingrédients (3 premiers)
  const ingPreview = (recipe.ingredients || []).slice(0, 3).map((i) => escapeHtml(i)).join(", ");
  const ingMore = recipe.ingredients && recipe.ingredients.length > 3
    ? ` <span class="acc-ing-more">+${recipe.ingredients.length - 3}</span>` : "";

  // Ingrédients complets
  const ingredientsHTML = (recipe.ingredients || []).map((ing, i) => `
    <li>
      <label>
        <input type="checkbox" id="fav-ing-${recipeId}-${i}">
        <span>${escapeHtml(ing)}</span>
      </label>
      <button class="add-to-list-btn" data-ingredient="${escapeHtml(ing)}" aria-label="Ajouter à la liste">+</button>
    </li>`).join("");

  // Étapes
  const stepsHTML = (recipe.etapes || []).map((step, i) => {
    const stepId = `fav-step-${recipeId}-${i}`;
    const timerDuration = parseTimeFromStep(step);
    const timerBtn = timerDuration
      ? `<button class="timer-btn" onclick="toggleTimer('${stepId}', ${timerDuration})"><span>⏱️ ${formatTime(timerDuration)}</span></button>`
      : "";
    return `<li data-step-id="${stepId}">${escapeHtml(step)}${timerBtn}</li>`;
  }).join("");

  const astuceHTML = recipe.astuce_chef
    ? `<div class="chef-tip"><span class="tip-icon">💡</span> ${escapeHtml(recipe.astuce_chef)}</div>` : "";

  const caloriesTag = calories
    ? `<span class="fav-tag fav-tag-calories" data-original-calories="${calories}">🔥 ${calories} kcal/pers</span>` : "";

  const ingredientsJSON = JSON.stringify(recipe.ingredients || [])
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;");

  return `
    <div class="fav-accordion-item" data-recipe-name="${escapeHtml(recipe.nom)}" data-recipe-id="${recipeId}" data-original-portions="${portions}" data-original-ingredients="${ingredientsJSON}">
      <div class="fav-accordion-header">
        <div class="acc-header-main">
          <div class="acc-title-row">
            <h3 class="acc-recipe-name">${escapeHtml(recipe.nom)}</h3>
            <span class="acc-chevron">›</span>
          </div>
          <div class="acc-meta">
            <span class="fav-tag">⏱️ ${escapeHtml(recipe.temps || "?")}</span>
            <span class="fav-tag">👨‍🍳 ${escapeHtml(recipe.difficulte || "Moyen")}</span>
            ${caloriesTag}
            ${savedAt ? `<span class="fav-tag fav-tag-date">💾 ${savedAt}</span>` : ""}
          </div>
          <div class="acc-ing-preview">🛒 <span>${ingPreview}${ingMore}</span></div>
        </div>
      </div>

      <div class="fav-accordion-body">
        <div class="acc-body-inner">

          <!-- Contrôle des portions -->
          <div class="fav-portion-control">
            <span class="fav-portion-label">👥 Portions :</span>
            <div class="fav-portion-buttons">
              <button class="fav-portion-btn minus">−</button>
              <span class="fav-portion-value">${portions}</span>
              <button class="fav-portion-btn plus">+</button>
            </div>
          </div>

          <h4>🛒 Ingrédients</h4>
          <ul class="ingredients-list fav-ingredients-list">${ingredientsHTML}</ul>

          <h4>📝 Préparation</h4>
          <ol class="steps-list">${stepsHTML}</ol>

          ${astuceHTML}

          <div class="acc-actions">
            <button class="action-btn fav-remove-btn active" aria-label="Retirer des favoris" title="Retirer des favoris">
              <span>❤️</span>
            </button>
            <button class="action-btn fav-share-btn" aria-label="Partager" title="Partager">
              <span>📤</span>
            </button>
            <button class="action-btn fav-publish-btn" aria-label="Publier" title="Publier dans la communauté">
              <span>🌍</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- PARTAGE ---
function shareRecipe(recipe) {
  const shareText = formatRecipeForShare(recipe);

  if (navigator.share) {
    navigator
      .share({
        title: recipe.nom,
        text: shareText,
      })
      .catch((err) => {
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
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast("Recette copiée !");
      })
      .catch(() => {
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
  // Nouvelle logique: détecter les ingrédients d'abord, puis afficher l'écran de validation
  await detectIngredientsOnly();
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

// ===========================
// NOUVEAUX AJOUTS
// ===========================

// --- VALIDATION DES INGRÉDIENTS DÉTECTÉS ---

async function detectIngredientsOnly() {
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
    return;
  }

  isProcessing = true;
  const originalBtnHTML = sendBtn.innerHTML;
  sendBtn.disabled = true;
  sendBtn.innerHTML = `<span class="loader-mini"></span> Analyse...`;

  responseArea.innerHTML = `
    <div class="loading-state">
      <div class="chef-loader">👨‍🍳</div>
      <p>Le chef identifie les ingrédients...</p>
    </div>
  `;

  const systemPrompt = `Tu es un assistant qui analyse des photos de frigo ou des descriptions d'ingrédients.

MISSION: Détecter et lister UNIQUEMENT les ingrédients visibles/mentionnés avec une estimation de quantité si possible.

RÈGLES:
- Sois précis et exhaustif
- Si quantité visible/estimable, l'indiquer (ex: "200g de poulet", "3 œufs")
- Sinon juste le nom (ex: "tomates", "lait")
- Ignore les condiments basiques (sel, poivre) sauf s'ils sont explicitement mentionnés

RÉPONSE EN JSON UNIQUEMENT:
{
  "ingredients_detectes": [
    "200g de poulet",
    "3 tomates",
    "oignons",
    "riz"
  ],
  "confidence": "high" | "medium" | "low",
  "notes": "Commentaire optionnel si image floue ou ambiguë"
}`;

  const userText =
    "Identifie les ingrédients." + (question ? " Info: " + question : "");

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
        temperature: 0.5,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsedData = JSON.parse(content);

    detectedIngredientsForValidation = parsedData.ingredients_detectes || [];
    showIngredientValidationScreen(
      detectedIngredientsForValidation,
      parsedData.confidence,
      parsedData.notes,
    );
  } catch (err) {
    console.error("Erreur détection ingrédients:", err);
    responseArea.innerHTML = `
      <div class="error-card">
        <span class="error-icon">😕</span>
        <p>Impossible de détecter les ingrédients</p>
        <small>${err.message}</small>
        <button class="retry-btn" onclick="detectIngredientsOnly()">Réessayer</button>
      </div>
    `;
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalBtnHTML;
  }
}

// --- VALIDATION DES INGRÉDIENTS DÉTECTÉS ---

async function detectIngredientsOnly() {
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
    return;
  }

  isProcessing = true;
  const originalBtnHTML = sendBtn.innerHTML;
  sendBtn.disabled = true;
  sendBtn.innerHTML = `<span class="loader-mini"></span> Analyse...`;

  responseArea.innerHTML = `
    <div class="loading-state">
      <div class="chef-loader">👨‍🍳</div>
      <p>Le chef identifie les ingrédients...</p>
    </div>
  `;

  const systemPrompt = `Tu es un assistant qui analyse des photos de frigo ou des descriptions d'ingrédients.

MISSION: Détecter et lister UNIQUEMENT les ingrédients visibles/mentionnés avec une estimation de quantité si possible.

RÈGLES:
- Sois précis et exhaustif
- Si quantité visible/estimable, l'indiquer (ex: "200g de poulet", "3 œufs")
- Sinon juste le nom (ex: "tomates", "lait")
- Ignore les condiments basiques (sel, poivre) sauf s'ils sont explicitement mentionnés

RÉPONSE EN JSON UNIQUEMENT:
{
  "ingredients_detectes": [
    "200g de poulet",
    "3 tomates",
    "oignons",
    "riz"
  ],
  "confidence": "high" | "medium" | "low",
  "notes": "Commentaire optionnel si image floue ou ambiguë"
}`;

  const userText =
    "Identifie les ingrédients." + (question ? " Info: " + question : "");

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
        temperature: 0.5,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    console.log("JSON ingrédients reçu:", content);

    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (jsonErr) {
      console.error("Erreur parsing JSON ingrédients:", jsonErr);

      try {
        const cleanedContent = content
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t");

        parsedData = JSON.parse(cleanedContent);
        console.log("JSON ingrédients nettoyé et parsé");
      } catch (cleanErr) {
        throw new Error(`JSON invalide: ${jsonErr.message}`);
      }
    }

    detectedIngredientsForValidation = parsedData.ingredients_detectes || [];
    showIngredientValidationScreen(
      detectedIngredientsForValidation,
      parsedData.confidence,
      parsedData.notes,
    );
  } catch (err) {
    console.error("Erreur détection ingrédients:", err);
    responseArea.innerHTML = `
      <div class="error-card">
        <span class="error-icon">😕</span>
        <p>Impossible de détecter les ingrédients</p>
        <small>${err.message}</small>
        <button class="retry-btn" onclick="detectIngredientsOnly()">Réessayer</button>
      </div>
    `;
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalBtnHTML;
  }
}

function showIngredientValidationScreen(ingredients, confidence, notes) {
  const responseArea = document.getElementById("responseArea");

  let confidenceBadge = "";
  if (confidence === "high")
    confidenceBadge =
      '<span class="confidence-badge high">✅ Confiance élevée</span>';
  else if (confidence === "medium")
    confidenceBadge =
      '<span class="confidence-badge medium">⚠️ Confiance moyenne</span>';
  else if (confidence === "low")
    confidenceBadge =
      '<span class="confidence-badge low">⚠️ Confiance faible</span>';

  const ingredientsHTML = ingredients
    .map(
      (ing, i) => `
    <div class="ingredient-validation-item" data-index="${i}">
      <input type="text" class="ingredient-input" value="${escapeHtml(ing)}" data-index="${i}">
      <button class="ingredient-delete-btn" onclick="removeValidationIngredient(${i})">✕</button>
    </div>
  `,
    )
    .join("");

  responseArea.innerHTML = `
    <div class="ingredient-validation-card">
      <h3>🔍 Ingrédients détectés</h3>
      ${confidenceBadge}
      ${notes ? `<p class="validation-notes">${escapeHtml(notes)}</p>` : ""}

      <div class="ingredient-validation-list">
        ${ingredientsHTML}
      </div>

      <button class="add-ingredient-btn" onclick="addValidationIngredient()">
        + Ajouter un ingrédient
      </button>

      <div class="validation-actions">
        <button class="validation-btn cancel" onclick="cancelValidation()">
          Annuler
        </button>
        <button class="validation-btn confirm" onclick="confirmIngredientsAndGenerateRecipes()">
          Valider et générer les recettes ✨
        </button>
      </div>
    </div>
  `;
}

function removeValidationIngredient(index) {
  const item = document.querySelector(`[data-index="${index}"]`);
  if (item) {
    item.remove();
  }
}

function addValidationIngredient() {
  const list = document.querySelector(".ingredient-validation-list");
  const newId = `ingredient-${Date.now()}`; // ID unique basé sur timestamp
  const newItem = document.createElement("div");
  newItem.className = "ingredient-validation-item";
  newItem.dataset.id = newId;
  newItem.innerHTML = `
    <input type="text" class="ingredient-input" placeholder="Nom de l'ingrédient" data-id="${newId}">
    <button class="ingredient-delete-btn" onclick="removeValidationIngredientById('${newId}')">✕</button>
  `;
  list.appendChild(newItem);
  newItem.querySelector("input").focus();
}

function removeValidationIngredientById(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.remove();
  }
}

function removeValidationIngredient(index) {
  // Garder pour compatibilité avec les anciens éléments
  const items = document.querySelectorAll(".ingredient-validation-item");
  if (items[index]) {
    items[index].remove();
  }
}

function cancelValidation() {
  detectedIngredientsForValidation = null;
  document.getElementById("responseArea").innerHTML = "";
  showToast("Validation annulée");
}

// Protection XSS - Fonction utilitaire
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function confirmIngredientsAndGenerateRecipes() {
  // Récupérer les valeurs finales depuis les inputs
  const inputs = document.querySelectorAll(".ingredient-input");
  const finalIngredients = Array.from(inputs)
    .map((input) => input.value.trim())
    .filter((v) => v.length > 0);

  if (finalIngredients.length === 0) {
    showToast("Ajoutez au moins un ingrédient");
    return;
  }

  // ✅ VÉRIFICATION DES FILTRES : Bloquer si ingrédient interdit
  const activeFilters = appState.settings.dietaryFilters;
  if (activeFilters.length > 0) {
    const forbiddenIngredients = [];

    activeFilters.forEach((filterId) => {
      const forbiddenList = {
        vegetarian: [
          "viande",
          "poisson",
          "fruits de mer",
          "poulet",
          "boeuf",
          "bœuf",
          "porc",
          "jambon",
          "saucisse",
          "bacon",
          "canard",
          "agneau",
          "veau",
          "lapin",
          "thon",
          "saumon",
          "crevette",
        ],
        vegan: [
          "viande",
          "poisson",
          "fruits de mer",
          "oeuf",
          "œuf",
          "lait",
          "fromage",
          "beurre",
          "crème",
          "creme",
          "yaourt",
          "miel",
          "poulet",
          "boeuf",
          "bœuf",
          "porc",
          "jambon",
          "saucisse",
          "bacon",
          "canard",
          "agneau",
          "veau",
          "lapin",
          "thon",
          "saumon",
          "crevette",
          "parmesan",
          "mozzarella",
          "emmental",
        ],
        "gluten-free": [
          "pâtes",
          "pates",
          "pain",
          "farine de blé",
          "farine de ble",
          "semoule",
          "blé",
          "ble",
          "orge",
        ],
        "lactose-free": [
          "lait",
          "fromage",
          "beurre",
          "crème",
          "creme",
          "yaourt",
          "parmesan",
          "mozzarella",
          "emmental",
          "chèvre",
          "chevre",
        ],
      };

      const forbidden = forbiddenList[filterId] || [];

      finalIngredients.forEach((ing) => {
        const ingLower = ing.toLowerCase();
        forbidden.forEach((forbiddenItem) => {
          if (ingLower.includes(forbiddenItem)) {
            forbiddenIngredients.push({ ingredient: ing, raison: filterId });
          }
        });
      });
    });

    if (forbiddenIngredients.length > 0) {
      const filterLabels = {
        vegetarian: "végétarien",
        vegan: "végan",
        "gluten-free": "sans gluten",
        "lactose-free": "sans lactose",
      };

      const messages = forbiddenIngredients
        .map(
          (f) =>
            `❌ "${f.ingredient}" (incompatible avec le filtre ${filterLabels[f.raison]})`,
        )
        .join("<br>");

      const responseArea = document.getElementById("responseArea");
      responseArea.innerHTML = `
        <div class="error-card">
          <span class="error-icon">🚫</span>
          <h3>Ingrédients incompatibles</h3>
          <p>${messages}</p>
          <p style="margin-top: 1rem;">Veuillez retirer ces ingrédients ou désactiver les filtres dans les paramètres.</p>
          <button class="retry-btn" onclick="showIngredientValidationScreen(${JSON.stringify(finalIngredients).replace(/"/g, "&quot;")}, 'medium', 'Certains ingrédients sont incompatibles avec vos filtres')">
            Retour à la validation
          </button>
        </div>
      `;
      showToast("⚠️ Ingrédients incompatibles avec vos filtres");
      return;
    }
  }

  detectedIngredientsForValidation = finalIngredients;

  // ✅ Mettre à jour la barre de recherche avec les ingrédients finaux
  document.getElementById("question").value = finalIngredients.join(", ");

  // Générer les recettes avec les ingrédients validés
  await generateRecipesFromValidatedIngredients(finalIngredients);
}

async function generateRecipesFromValidatedIngredients(ingredients) {
  const responseArea = document.getElementById("responseArea");
  const sendBtn = document.getElementById("sendBtn");

  if (isProcessing) return;
  isProcessing = true;

  const originalBtnHTML = sendBtn.innerHTML;
  sendBtn.disabled = true;
  sendBtn.innerHTML = `<span class="loader-mini"></span> Génération...`;

  responseArea.innerHTML = `
    <div class="loading-state">
      <div class="chef-loader">👨‍🍳</div>
      <p>Le chef crée vos recettes...</p>
    </div>
  `;

  const filtersPrompt = getActiveFiltersPrompt();
  const ingredientsList = ingredients.join(", ");

  // Choisir le prompt selon le mode du chef
  let systemPrompt;

  if (chefMode === "etoile") {
    // Mode "Surprends-moi" - Chef étoilé créatif
    systemPrompt = `Tu es Chef Claude, un chef étoilé MICHELIN passionné, créatif et audacieux.

MISSION: Créer 2 recettes EXCEPTIONNELLES et DIFFÉRENTES avec les ingrédients fournis.

INGRÉDIENTS DISPONIBLES: ${ingredientsList}

🌟 EXIGENCES DE CRÉATIVITÉ (IMPÉRATIF):
- Les 2 recettes doivent être TRÈS DIFFÉRENTES (cuisines du monde variées: française, italienne, asiatique, méditerranéenne, indienne, mexicaine, etc.)
- ÉVITE les recettes trop basiques ou répétitives (poêlée, sauté, simple grillé)
- Propose des techniques culinaires variées: wok, four, poché, mariné, rôti, braisé, papillote, etc.
- Utilise des assaisonnements créatifs et des associations audacieuses
- Pense comme un chef étoilé: présentation, textures contrastées, équilibre des saveurs

📋 RÈGLES STRICTES:
- Utilise PRINCIPALEMENT ces ingrédients + condiments de base (sel, poivre, huile d'olive, beurre, ail, oignon, gingembre, sauce soja, citron)
- Pour les condiments basiques (sel, poivre, huile), liste-les SIMPLEMENT sans quantité (ex: "sel", "poivre", "huile d'olive")
- Sois PRÉCIS sur les quantités des ingrédients principaux (en grammes/ml)
- Indique le temps à la fin de CHAQUE étape entre parenthèses
- Les 2 recettes doivent avoir des profils gustatifs DISTINCTS
${filtersPrompt}

💡 INSPIRATION:
- Recette 1: Peut être fusion, raffinée, ou traditionnelle réinventée
- Recette 2: Doit être d'une AUTRE cuisine ou technique que la recette 1

RÉPONSE EN JSON UNIQUEMENT (strict):
{
  "recettes": [
    {
      "nom": "Nom CRÉATIF et appétissant",
      "temps": "25 min",
      "temps_prep": "10 min",
      "temps_cuisson": "15 min",
      "difficulte": "Facile" | "Moyen" | "Difficile",
      "portions": 2,
      "calories_portion": 450,
      "ingredients": ["200g de poulet coupé en cubes", "huile d'olive", "sel", "poivre", "etc."],
      "etapes": ["Préchauffer le four à 180°C (2 min)", "Couper les légumes en brunoise (5 min)", "Saisir à feu vif (3 min)", "etc."],
      "astuce_chef": "Conseil de PRO pour sublimer le plat (technique, timing, présentation)"
    },
    {
      "nom": "Nom DIFFÉRENT, d'une AUTRE cuisine/technique",
      "temps": "30 min",
      "temps_prep": "15 min",
      "temps_cuisson": "15 min",
      "difficulte": "Moyen",
      "portions": 2,
      "calories_portion": 380,
      "ingredients": ["..."],
      "etapes": ["..."],
      "astuce_chef": "..."
    }
  ],
  "suggestion": "Message encourageant et inspirant du chef"
}`;
  } else {
    // Mode "C'est la hess" - Chef pédagogue et pragmatique
    systemPrompt = `Tu es Chef Claude, un chef pédagogue et pragmatique qui aide les gens avec peu d'ingrédients.

MISSION: Créer 2 recettes SIMPLES et RÉALISTES avec les ingrédients fournis.

INGRÉDIENTS DISPONIBLES: ${ingredientsList}

🍳 PHILOSOPHIE "C'EST LA HESS":
- Recettes SIMPLES et accessibles à tous
- Peu d'ustensiles nécessaires
- Techniques basiques (poêle, casserole, four)
- Temps de préparation raisonnable
- Pas de complications inutiles

📋 RÈGLES STRICTES:
- Utilise UNIQUEMENT ces ingrédients + basiques (sel, poivre, huile, beurre, ail, oignon)
- Pour les condiments basiques (sel, poivre, huile), liste-les SIMPLEMENT sans quantité (ex: "sel", "poivre", "huile")
- Sois précis sur les quantités des ingrédients principaux
- Inclus le temps entre parenthèses à la fin de chaque étape
${filtersPrompt}

💡 STYLE:
- Recettes réconfortantes et rassasiantes
- Explications claires pour débutants
- Astuces pour économiser et éviter le gaspillage

RÉPONSE EN JSON UNIQUEMENT:
{
  "recettes": [
    {
      "nom": "Nom simple et appétissant",
      "temps": "25 min",
      "temps_prep": "10 min",
      "temps_cuisson": "15 min",
      "difficulte": "Facile",
      "portions": 2,
      "calories_portion": 450,
      "ingredients": ["200g de poulet", "huile", "sel", "poivre"],
      "etapes": ["Étape 1 (2 min)", "Étape 2 (8 min)"],
      "astuce_chef": "Conseil pratique pour réussir"
    }
  ],
  "suggestion": "Message encourageant"
}`;
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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Crée 2 recettes avec ces ingrédients." },
        ],
        temperature: chefMode === "etoile" ? 0.9 : 0.6,
        max_tokens: CONFIG.MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    console.log("JSON recettes reçu:", content);

    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (jsonErr) {
      console.error("Erreur parsing JSON recettes:", jsonErr);
      console.error("Contenu JSON problématique:", content.substring(0, 200));

      try {
        // Nettoyage avancé
        let cleanedContent = content;

        // Supprimer les caractères de contrôle
        cleanedContent = cleanedContent.replace(
          /[\u0000-\u001F\u007F-\u009F]/g,
          "",
        );

        // Si le JSON est entouré de ```json et ```, les retirer
        if (cleanedContent.includes("```json")) {
          cleanedContent = cleanedContent
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "");
        }

        // Trim
        cleanedContent = cleanedContent.trim();

        parsedData = JSON.parse(cleanedContent);
        console.log("JSON recettes nettoyé et parsé avec succès");
      } catch (cleanErr) {
        console.error("Échec parsing même après nettoyage:", cleanErr);
        throw new Error(`JSON invalide: ${jsonErr.message}`);
      }
    }

    // Ajouter à l'historique avec ingrédients détectés ET validés
    addToHistory(
      document.getElementById("question").value.trim() || "Scan de frigo",
      selectedImageBase64,
      parsedData,
      detectedIngredientsForValidation, // Ingrédients détectés initialement
      ingredients, // Ingrédients validés/modifiés (NOUVEAU)
      "medium",
      null,
    );

    // Calculer et afficher avec nutrition
    await renderRecipesWithNutrition(parsedData, true);
  } catch (err) {
    console.error("Erreur génération recettes:", err);
    responseArea.innerHTML = `
      <div class="error-card">
        <span class="error-icon">😕</span>
        <p>Impossible de générer les recettes</p>
        <small>${err.message}</small>
        <button class="retry-btn" onclick="confirmIngredientsAndGenerateRecipes()">Réessayer</button>
      </div>
    `;
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalBtnHTML;
  }
}

// --- RENDER RECETTES AVEC NUTRITION ---

async function renderRecipesWithNutrition(
  data,
  animate = true,
  isOffline = false,
) {
  const container = document.getElementById("responseArea");

  const offlineNotice = container.querySelector(".offline-notice");
  container.innerHTML = "";
  if (offlineNotice && isOffline) {
    container.appendChild(offlineNotice);
  }

  window._currentRecipes = data.recettes;

  // Afficher les filtres actifs
  const activeFilters = appState.settings.dietaryFilters;
  if (activeFilters.length > 0) {
    const filtersDiv = document.createElement("div");
    filtersDiv.className = "active-filters-display";
    const filterLabels = activeFilters
      .map((id) => {
        const filter = DIETARY_FILTERS.find((f) => f.id === id);
        return filter
          ? `<span class="filter-badge">${filter.icon} ${filter.label}</span>`
          : "";
      })
      .filter(Boolean)
      .join("");
    filtersDiv.innerHTML = `
      <div class="filters-header">
        <span class="filters-icon">🔒</span>
        <span class="filters-title">Filtres actifs :</span>
      </div>
      <div class="filters-list">${filterLabels}</div>
    `;
    container.appendChild(filtersDiv);
  }

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

  // Cartes Recettes avec calcul nutrition
  for (let index = 0; index < data.recettes.length; index++) {
    const recipe = data.recettes[index];

    // Calculer nutrition pour cette recette
    let nutrition = null;
    let gi = null;

    try {
      nutrition = await calculateRecipeNutrition(
        recipe.ingredients,
        recipe.portions || 2,
      );
      gi = estimateGlycemicIndex(recipe.ingredients);
      console.log(
        "Nutrition calculée pour",
        recipe.nom,
        ":",
        nutrition ? "OUI" : "NON",
      );
    } catch (err) {
      console.warn("Erreur calcul nutrition pour", recipe.nom, err);
    }

    const cardWrapper = document.createElement("div");
    cardWrapper.innerHTML = createRecipeCardHTML(recipe, false, nutrition, gi);
    const card = cardWrapper.firstElementChild;

    if (animate) {
      card.style.animationDelay = `${index * 0.15}s`;
    } else {
      card.style.animation = "none";
      card.style.opacity = "1";
      card.style.transform = "none";
    }

    container.appendChild(card);
  }

  attachRecipeCardListeners(container);

  if (animate) {
    setTimeout(() => {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
}

function createRecipeCardHTML(
  recipe,
  isFav = false,
  nutrition = null,
  gi = null,
) {
  const recipeId = recipe.id || Date.now() + Math.random();
  const favoriteClass = isFavorite(recipe.nom) ? "active" : "";
  const portions = recipe.portions || 2;
  const calories = recipe.calories_portion || null;

  const ingredientsHTML = recipe.ingredients
    .map(
      (ing, i) => `
      <li>
        <label>
          <input type="checkbox" id="ing-${recipeId}-${i}">
          <span>${escapeHtml(ing)}</span>
        </label>
        <button class="add-to-list-btn" data-ingredient="${escapeHtml(ing)}" aria-label="Ajouter à la liste">+</button>
      </li>
    `,
    )
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

  // Tags (temps et difficulté)
  // Note: On n'affiche plus les calories ici car elles sont dans la carte nutrition
  let tagsHTML = `
    <span class="tag time">⏱️ ${escapeHtml(recipe.temps)}</span>
    <span class="tag level">👨‍🍳 ${escapeHtml(recipe.difficulte || "Moyen")}</span>
  `;

  if (recipe.author) {
    tagsHTML += `<span class="tag author">👤 Par ${escapeHtml(recipe.author)}</span>`;
  }

  // Si pas de nutrition calculée, afficher les calories de l'IA en fallback
  if (!nutrition && calories) {
    tagsHTML += `<span class="tag calories" data-original-calories="${calories}">🔥 ${calories} kcal/pers <small>(estimé IA)</small></span>`;
  }

  // Astuce chef
  const astuceHTML = recipe.astuce_chef
    ? `<div class="chef-tip"><span class="tip-icon">💡</span> ${escapeHtml(recipe.astuce_chef)}</div>`
    : "";

  // Nutrition card (si disponible)
  const nutritionHTML = nutrition ? renderNutritionCard(nutrition, gi) : "";
  console.log(
    "Nutrition HTML pour",
    recipe.nom,
    ":",
    nutritionHTML ? "GÉNÉRÉ" : "VIDE",
  );

  // Échapper le JSON pour l'attribut HTML
  const ingredientsJSON = JSON.stringify(recipe.ingredients)
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;");

  return `
    <article class="recipe-card" data-recipe-id="${recipeId}" data-recipe-name="${escapeHtml(recipe.nom)}" data-original-portions="${portions}" data-original-ingredients="${ingredientsJSON}">
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

        ${nutritionHTML}
      </div>
      
      <div class="card-actions">
        <button class="action-btn favorite-btn ${favoriteClass}" aria-label="Ajouter aux favoris">
          <span>${favoriteClass ? "❤️" : "🤍"}</span>
        </button>
        <button class="action-btn share-btn" aria-label="Partager">
          <span>📤</span>
        </button>
        ${
          !recipe.author
            ? `
        <button class="action-btn publish-btn" aria-label="Publier à la communauté" title="Publier">
          <span>🌍</span>
        </button>
        `
            : ""
        }
      </div>
    </article>
  `;
}

function attachRecipeCardListeners(container) {
  container.querySelectorAll(".recipe-card").forEach((card) => {
    const recipeName = card.dataset.recipeName;
    const recipeId = card.dataset.recipeId;
    const originalPortions = parseInt(card.dataset.originalPortions) || 2;

    // Décoder les entités HTML avant de parser le JSON
    const ingredientsJSON = (card.dataset.originalIngredients || "[]")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    const originalIngredients = JSON.parse(ingredientsJSON);

    const recipe = findRecipeByName(recipeName);

    // Bouton favori
    const favoriteBtn = card.querySelector(".favorite-btn");
    if (recipe) {
      favoriteBtn?.addEventListener("click", () => {
        toggleFavorite(recipe);
        const isNowFav = isFavorite(recipe.nom);
        favoriteBtn.classList.toggle("active", isNowFav);
        favoriteBtn.querySelector("span").textContent = isNowFav ? "❤️" : "🤍";
      });

      // Bouton partage
      const shareBtn = card.querySelector(".share-btn");
      shareBtn?.addEventListener("click", () => shareRecipe(recipe));

      // Bouton de publication dans la communauté
      const publishBtn = card.querySelector(".publish-btn");
      publishBtn?.addEventListener("click", () => publishToCommunity(recipe));
    }

    // Contrôle portions
    let currentPortions = originalPortions;
    const minusBtn = card.querySelector(".portion-btn.minus");
    const plusBtn = card.querySelector(".portion-btn.plus");

    minusBtn?.addEventListener("click", () => {
      if (currentPortions > 1) {
        currentPortions--;
        adjustPortions(
          recipeId,
          currentPortions,
          originalPortions,
          originalIngredients,
        );
      }
    });

    plusBtn?.addEventListener("click", () => {
      if (currentPortions < 12) {
        currentPortions++;
        adjustPortions(
          recipeId,
          currentPortions,
          originalPortions,
          originalIngredients,
        );
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

  const fromCommunity = appState.community.find((r) => r.nom === name);
  if (fromCommunity) return fromCommunity;

  return window._currentRecipes?.find((r) => r.nom === name);
}

// --- ANALYSE NUTRITIONNELLE (ASSIETTE & PRODUIT) ---

function initNutritionAnalysisListeners() {
  // Mode selector
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".mode-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".analysis-mode-content")
        .forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      const mode = btn.dataset.mode;
      document.getElementById(`analysis-${mode}-mode`).classList.add("active");
    });
  });

  // Analyse assiette
  document
    .getElementById("takePlateBtn")
    ?.addEventListener("click", () => takePictureFor("plate"));
  document
    .getElementById("selectPlateBtn")
    ?.addEventListener("click", () => selectPictureFor("plate"));
  document
    .getElementById("clearPlateBtn")
    ?.addEventListener("click", () => clearPictureFor("plate"));
  document
    .getElementById("analyzePlateBtn")
    ?.addEventListener("click", analyzePlate);

  // Analyse produit
  document
    .getElementById("scanBarcodeBtn")
    ?.addEventListener("click", scanProductBarcode);
  document
    .getElementById("searchBarcodeBtn")
    ?.addEventListener("click", searchManualBarcode);
  document
    .getElementById("manualBarcodeInput")
    ?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchManualBarcode();
      }
    });
  document
    .getElementById("takeLabelBtn")
    ?.addEventListener("click", () => takePictureFor("label"));
  document
    .getElementById("selectLabelBtn")
    ?.addEventListener("click", () => selectPictureFor("label"));
  document
    .getElementById("clearLabelBtn")
    ?.addEventListener("click", () => clearPictureFor("label"));
  document
    .getElementById("analyzeLabelBtn")
    ?.addEventListener("click", analyzeLabel);
}

function takePictureFor(type) {
  navigator.camera.getPicture(
    (imageData) => onAnalysisPictureSuccess(imageData, type),
    onCameraFail,
    {
      quality: 70,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.CAMERA,
      encodingType: Camera.EncodingType.JPEG,
      mediaType: Camera.MediaType.PICTURE,
      correctOrientation: true,
      targetWidth: 800,
      targetHeight: 800,
    },
  );
}

function selectPictureFor(type) {
  navigator.camera.getPicture(
    (imageData) => onAnalysisPictureSuccess(imageData, type),
    onCameraFail,
    {
      quality: 70,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
      encodingType: Camera.EncodingType.JPEG,
      mediaType: Camera.MediaType.PICTURE,
      correctOrientation: true,
      targetWidth: 800,
      targetHeight: 800,
    },
  );
}

function onAnalysisPictureSuccess(imageData, type) {
  let cleanBase64 = imageData.startsWith("data:image")
    ? imageData.split(",")[1]
    : imageData;
  cleanBase64 = cleanBase64.replace(/\s/g, "");

  if (type === "plate") {
    selectedPlateImageBase64 = cleanBase64;
    const wrapper = document.getElementById("plateImagePreview");
    wrapper.classList.remove("empty");
    wrapper.innerHTML = `<img src="data:image/jpeg;base64,${cleanBase64}" class="preview-img">`;
    document.getElementById("clearPlateBtn").style.display = "flex";
    document.getElementById("analyzePlateBtn").disabled = false;
  } else if (type === "label") {
    selectedLabelImageBase64 = cleanBase64;
    const wrapper = document.getElementById("labelImagePreview");
    wrapper.classList.remove("empty");
    wrapper.innerHTML = `<img src="data:image/jpeg;base64,${cleanBase64}" class="preview-img">`;
    document.getElementById("clearLabelBtn").style.display = "flex";
    document.getElementById("analyzeLabelBtn").disabled = false;
  }

  if (navigator.vibrate) navigator.vibrate(50);
}

function clearPictureFor(type) {
  if (type === "plate") {
    selectedPlateImageBase64 = null;
    const wrapper = document.getElementById("plateImagePreview");
    wrapper.classList.add("empty");
    wrapper.innerHTML = `<div class="placeholder-content"><span class="icon">🍽️</span><p>Prenez une photo de votre assiette</p></div>`;
    document.getElementById("clearPlateBtn").style.display = "none";
    document.getElementById("analyzePlateBtn").disabled = true;
  } else if (type === "label") {
    selectedLabelImageBase64 = null;
    const wrapper = document.getElementById("labelImagePreview");
    wrapper.classList.add("empty");
    wrapper.innerHTML = `<div class="placeholder-content"><span class="icon">🏷️</span><p>Photo de l'étiquette nutritionnelle</p></div>`;
    document.getElementById("clearLabelBtn").style.display = "none";
    document.getElementById("analyzeLabelBtn").disabled = true;
  }
}

async function analyzePlate() {
  if (!selectedPlateImageBase64) return;

  const resultArea = document.getElementById("plateAnalysisResult");
  const analyzeBtn = document.getElementById("analyzePlateBtn");
  const originalHTML = analyzeBtn.innerHTML;

  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = `<span class="loader-mini"></span> Analyse...`;

  resultArea.innerHTML = `<div class="loading-state"><div class="chef-loader">🔬</div><p>Analyse de l'assiette...</p></div>`;

  const systemPrompt = `Tu es un nutritionniste expert qui analyse des photos de repas avec une GRANDE PRÉCISION.

MISSION: Identifier TOUS les aliments visibles, même les sauces et condiments, et estimer les quantités.

🔍 RÈGLES D'IDENTIFICATION (TRÈS IMPORTANT):
1. **Sauces et condiments**: Détecte TOUJOURS les sauces (tomate, crème, vinaigrette, huile, etc.)
2. **Légumes individuels**: Même s'ils sont mélangés, identifie CHAQUE légume séparément
   - Exemple: "légumes mélangés" → liste "carottes", "courgettes", "poivrons" individuellement
3. **Viandes/Poissons**: Identifie le type exact (poulet, saucisse, jambon, etc.)
4. **Féculents**: Précise le type (riz blanc, pâtes, pommes de terre, etc.)
5. **Fromages et laitages**: N'oublie pas le fromage râpé, crème fraîche, etc.

📏 RÈGLES DE QUANTITÉ:
- Références standards: paume = 100g viande, poing = 150g légumes, poignée = 30g fromage
- Sauces: estime en ml puis convertis en grammes (10ml = 10g environ)
- Sois réaliste mais précis

⚠️ SI INCERTAIN:
- Indique "confidence": "low" si angle/éclairage difficile
- Mentionne dans "notes" ce qui rend l'estimation difficile

EXEMPLE DE RÉPONSE:
{
  "aliments": [
    {"nom": "poulet grillé", "quantite_g": 150},
    {"nom": "sauce tomate", "quantite_g": 30},
    {"nom": "carottes", "quantite_g": 50},
    {"nom": "courgettes", "quantite_g": 50},
    {"nom": "poivrons", "quantite_g": 30},
    {"nom": "fromage râpé", "quantite_g": 15}
  ],
  "notes": "Plat avec sauce tomate visible, légumes mélangés identifiés individuellement",
  "confiance": "high"
}

RÉPONSE EN JSON UNIQUEMENT (format strict ci-dessus):`;

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONFIG.API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyse cette assiette et estime les quantités.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${selectedPlateImageBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.5,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) throw new Error(`Erreur ${response.status}`);

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Calculer nutrition totale
    await loadFoodDatabase();
    const totals = {
      calories: 0,
      proteines: 0,
      glucides: 0,
      lipides: 0,
      fibres: 0,
      sucres: 0,
      sodium: 0,
    };
    const foundFoods = [];

    for (const item of result.aliments) {
      const food = findFood(item.nom);
      if (food) {
        const ratio = item.quantite_g / 100;
        totals.calories += food.per100g.calories * ratio;
        totals.proteines += food.per100g.proteines * ratio;
        totals.glucides += food.per100g.glucides * ratio;
        totals.lipides += food.per100g.lipides * ratio;
        totals.fibres += food.per100g.fibres * ratio;
        totals.sucres += food.per100g.sucres * ratio;
        totals.sodium += food.per100g.sodium * ratio;
        foundFoods.push({ ...item, found: true });
      } else {
        foundFoods.push({ ...item, found: false });
      }
    }

    // Verdict simple
    let verdict = "Équilibré";
    if (totals.calories > 800) verdict = "Très calorique";
    else if (totals.lipides > 30) verdict = "Riche en graisses";
    else if (totals.sucres > 25) verdict = "Riche en sucres";
    else if (totals.proteines > 30 && totals.fibres > 8)
      verdict = "Très équilibré";

    const alimentsHTML = foundFoods
      .map(
        (f, index) => `
      <div class="plate-item ${f.found ? "" : "not-found"}">
        <span class="plate-item-name">${escapeHtml(f.nom)}</span>
        <span class="plate-item-qty">${f.quantite_g}g</span>
        ${!f.found ? '<small class="data-warning">⚠️ Données nutritionnelles non disponibles</small>' : ""}
        <button class="remove-item-btn" data-index="${index}" title="Retirer">✕</button>
      </div>
    `,
      )
      .join("");

    resultArea.innerHTML = `
      <div class="plate-analysis-card">
        <div class="analysis-disclaimer">
          <span class="disclaimer-icon">⚠️</span>
          <small>Estimation approximative basée sur l'analyse visuelle</small>
        </div>

        <h4>🍽️ Composition détectée</h4>
        <div class="plate-items-list" id="plateItemsList">
          ${alimentsHTML}
        </div>

        <!-- Ajouter un ingrédient manuellement -->
        <div class="add-ingredient-section">
          <button class="add-ingredient-btn" id="addPlateIngredientBtn">
            <span>➕</span> Ajouter un ingrédient manquant
          </button>
          <div class="manual-ingredient-form" id="manualIngredientForm" style="display: none;">
            <input type="text" id="manualIngredientName" placeholder="Nom de l'ingrédient (ex: sauce tomate)" />
            <input type="number" id="manualIngredientQty" placeholder="Quantité (g)" min="1" />
            <div class="form-actions">
              <button class="btn-confirm" id="confirmAddIngredient">✓ Ajouter</button>
              <button class="btn-cancel" id="cancelAddIngredient">✕</button>
            </div>
          </div>
        </div>

        <h4>📊 Nutrition totale</h4>
        <div class="nutrition-macros">
          <div class="macro-item"><span class="macro-label">Calories</span><span class="macro-value">${Math.round(totals.calories)} kcal</span></div>
          <div class="macro-item"><span class="macro-label">Protéines</span><span class="macro-value">${Math.round(totals.proteines * 10) / 10}g</span></div>
          <div class="macro-item"><span class="macro-label">Glucides</span><span class="macro-value">${Math.round(totals.glucides * 10) / 10}g</span></div>
          <div class="macro-item"><span class="macro-label">Lipides</span><span class="macro-value">${Math.round(totals.lipides * 10) / 10}g</span></div>
        </div>

        <div class="plate-verdict">
          <span class="verdict-label">Verdict:</span>
          <span class="verdict-badge">${verdict}</span>
        </div>

        ${result.notes ? `<p class="analysis-notes">${escapeHtml(result.notes)}</p>` : ""}
      </div>
    `;

    // Stocker les données pour modification ultérieure
    resultArea.dataset.plateData = JSON.stringify({
      aliments: foundFoods,
      totals,
    });

    // Attacher les event listeners pour ajouter/retirer ingrédients
    attachPlateModificationListeners();

    // Sauvegarder dans l'historique
    addToNutritionHistory({
      type: "plate",
      date: new Date().toISOString(),
      imageThumb: selectedPlateImageBase64.substring(0, 100),
      data: result,
      nutrition: totals,
      verdict,
    });
  } catch (err) {
    console.error("Erreur analyse assiette:", err);
    resultArea.innerHTML = `<div class="error-card"><span class="error-icon">😕</span><p>Erreur lors de l'analyse</p><small>${err.message}</small></div>`;
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = originalHTML;
  }
}

function attachPlateModificationListeners() {
  const addBtn = document.getElementById("addPlateIngredientBtn");
  const form = document.getElementById("manualIngredientForm");
  const confirmBtn = document.getElementById("confirmAddIngredient");
  const cancelBtn = document.getElementById("cancelAddIngredient");

  // Afficher le formulaire
  addBtn?.addEventListener("click", () => {
    form.style.display = "block";
    document.getElementById("manualIngredientName").focus();
  });

  // Annuler
  cancelBtn?.addEventListener("click", () => {
    form.style.display = "none";
    document.getElementById("manualIngredientName").value = "";
    document.getElementById("manualIngredientQty").value = "";
  });

  // Ajouter l'ingrédient
  confirmBtn?.addEventListener("click", async () => {
    const name = document.getElementById("manualIngredientName").value.trim();
    const qty = parseInt(document.getElementById("manualIngredientQty").value);

    if (!name || !qty || qty < 1) {
      showToast("⚠️ Veuillez remplir tous les champs");
      return;
    }

    // Rechercher l'aliment dans la base
    await loadFoodDatabase();
    const food = await findFoodWithFallback(name);

    if (!food) {
      showToast(`⚠️ "${name}" non trouvé dans la base`);
      return;
    }

    // Ajouter à la liste
    const resultArea = document.getElementById("plateAnalysisResult");
    const plateData = JSON.parse(resultArea.dataset.plateData);

    plateData.aliments.push({ nom: name, quantite_g: qty, found: true });

    // Recalculer nutrition
    await recalculatePlateNutrition();

    // Réinitialiser le formulaire
    form.style.display = "none";
    document.getElementById("manualIngredientName").value = "";
    document.getElementById("manualIngredientQty").value = "";

    showToast(`✅ "${name}" ajouté !`);
  });

  // Boutons de suppression
  document.querySelectorAll(".remove-item-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      const resultArea = document.getElementById("plateAnalysisResult");
      const plateData = JSON.parse(resultArea.dataset.plateData);

      const removed = plateData.aliments.splice(index, 1);
      showToast(`✓ "${removed[0].nom}" retiré`);

      await recalculatePlateNutrition();
    });
  });
}

async function recalculatePlateNutrition() {
  const resultArea = document.getElementById("plateAnalysisResult");
  const plateData = JSON.parse(resultArea.dataset.plateData);

  // Recalculer nutrition
  const totals = {
    calories: 0,
    proteines: 0,
    glucides: 0,
    lipides: 0,
    fibres: 0,
    sucres: 0,
    sodium: 0,
  };
  const foundFoods = [];

  for (const item of plateData.aliments) {
    const food = await findFoodWithFallback(item.nom);
    if (food) {
      const ratio = item.quantite_g / 100;
      totals.calories += food.per100g.calories * ratio;
      totals.proteines += food.per100g.proteines * ratio;
      totals.glucides += food.per100g.glucides * ratio;
      totals.lipides += food.per100g.lipides * ratio;
      totals.fibres += food.per100g.fibres * ratio;
      totals.sucres += food.per100g.sucres * ratio;
      totals.sodium += food.per100g.sodium * ratio;
      foundFoods.push({ ...item, found: true });
    } else {
      foundFoods.push({ ...item, found: false });
    }
  }

  // Verdict
  let verdict = "Équilibré";
  if (totals.calories > 800) verdict = "Très calorique";
  else if (totals.lipides > 30) verdict = "Riche en graisses";
  else if (totals.sucres > 25) verdict = "Riche en sucres";
  else if (totals.proteines > 30 && totals.fibres > 8)
    verdict = "Très équilibré";

  // Réafficher
  const alimentsHTML = foundFoods
    .map(
      (f, index) => `
    <div class="plate-item ${f.found ? "" : "not-found"}">
      <span class="plate-item-name">${escapeHtml(f.nom)}</span>
      <span class="plate-item-qty">${f.quantite_g}g</span>
      ${!f.found ? '<small class="data-warning">⚠️ Données nutritionnelles non disponibles</small>' : ""}
      <button class="remove-item-btn" data-index="${index}" title="Retirer">✕</button>
    </div>
  `,
    )
    .join("");

  resultArea.innerHTML = `
    <div class="plate-analysis-card">
      <div class="analysis-disclaimer">
        <span class="disclaimer-icon">⚠️</span>
        <small>Estimation approximative basée sur l'analyse visuelle</small>
      </div>

      <h4>🍽️ Composition détectée</h4>
      <div class="plate-items-list" id="plateItemsList">
        ${alimentsHTML}
      </div>

      <div class="add-ingredient-section">
        <button class="add-ingredient-btn" id="addPlateIngredientBtn">
          <span>➕</span> Ajouter un ingrédient manquant
        </button>
        <div class="manual-ingredient-form" id="manualIngredientForm" style="display: none;">
          <input type="text" id="manualIngredientName" placeholder="Nom de l'ingrédient (ex: sauce tomate)" />
          <input type="number" id="manualIngredientQty" placeholder="Quantité (g)" min="1" />
          <div class="form-actions">
            <button class="btn-confirm" id="confirmAddIngredient">✓ Ajouter</button>
            <button class="btn-cancel" id="cancelAddIngredient">✕</button>
          </div>
        </div>
      </div>

      <h4>📊 Nutrition totale</h4>
      <div class="nutrition-macros">
        <div class="macro-item"><span class="macro-label">Calories</span><span class="macro-value">${Math.round(totals.calories)} kcal</span></div>
        <div class="macro-item"><span class="macro-label">Protéines</span><span class="macro-value">${Math.round(totals.proteines * 10) / 10}g</span></div>
        <div class="macro-item"><span class="macro-label">Glucides</span><span class="macro-value">${Math.round(totals.glucides * 10) / 10}g</span></div>
        <div class="macro-item"><span class="macro-label">Lipides</span><span class="macro-value">${Math.round(totals.lipides * 10) / 10}g</span></div>
      </div>

      <div class="plate-verdict">
        <span class="verdict-label">Verdict:</span>
        <span class="verdict-badge">${verdict}</span>
      </div>
    </div>
  `;

  // Mettre à jour les données stockées
  resultArea.dataset.plateData = JSON.stringify({
    aliments: foundFoods,
    totals,
  });

  // Réattacher les listeners
  attachPlateModificationListeners();
}

async function scanProductBarcode() {
  try {
    const barcode = await scanBarcode();
    showToast("Code-barres scanné !");

    const resultArea = document.getElementById("productAnalysisResult");
    resultArea.innerHTML = `<div class="loading-state"><div class="chef-loader">🔬</div><p>Recherche du produit...</p></div>`;

    const product = await getProductByBarcode(barcode);

    if (!product) {
      resultArea.innerHTML = `<div class="error-card"><span class="error-icon">😕</span><p>Produit non trouvé</p><small>Code-barres: ${barcode}</small></div>`;
      return;
    }

    displayProductAnalysis(product);

    addToNutritionHistory({
      type: "product",
      date: new Date().toISOString(),
      barcode: barcode,
      data: product,
    });
  } catch (err) {
    console.error("Erreur scan:", err);
    if (!err.message.includes("annulé")) {
      showToast("Erreur lors du scan");
    }
  }
}

async function searchManualBarcode() {
  const input = document.getElementById("manualBarcodeInput");
  const barcode = input.value.trim();

  // Validation du code-barres
  if (!barcode) {
    showToast("⚠️ Veuillez saisir un code-barres");
    input.focus();
    return;
  }

  if (!/^\d{8,13}$/.test(barcode)) {
    showToast("⚠️ Code-barres invalide (8-13 chiffres requis)");
    input.focus();
    return;
  }

  try {
    showToast("🔍 Recherche en cours...");

    const resultArea = document.getElementById("productAnalysisResult");
    resultArea.innerHTML = `<div class="loading-state"><div class="chef-loader">🔬</div><p>Recherche du produit...</p></div>`;

    const product = await getProductByBarcode(barcode);

    if (!product) {
      resultArea.innerHTML = `
        <div class="error-card">
          <span class="error-icon">😕</span>
          <p>Produit non trouvé</p>
          <small>Code-barres: ${barcode}</small>
          <small class="hint">Vérifiez que vous avez bien saisi tous les chiffres</small>
        </div>`;
      return;
    }

    showToast("✅ Produit trouvé !");
    displayProductAnalysis(product);

    addToNutritionHistory({
      type: "product",
      date: new Date().toISOString(),
      barcode: barcode,
      data: product,
    });

    // Vider le champ après succès
    input.value = "";
  } catch (err) {
    console.error("Erreur recherche manuelle:", err);
    showToast("❌ Erreur lors de la recherche");

    const resultArea = document.getElementById("productAnalysisResult");
    resultArea.innerHTML = `
      <div class="error-card">
        <span class="error-icon">😕</span>
        <p>Erreur lors de la recherche</p>
        <small>${err.message}</small>
      </div>`;
  }
}

async function analyzeLabel() {
  if (!selectedLabelImageBase64) return;

  const resultArea = document.getElementById("productAnalysisResult");
  const analyzeBtn = document.getElementById("analyzeLabelBtn");
  const originalHTML = analyzeBtn.innerHTML;

  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = `<span class="loader-mini"></span> Analyse...`;

  resultArea.innerHTML = `<div class="loading-state"><div class="chef-loader">🔬</div><p>Lecture de l'étiquette...</p></div>`;

  const systemPrompt = `Tu es un expert en lecture d'étiquettes nutritionnelles.

MISSION: Extraire les informations du tableau nutritionnel visible sur la photo.

RÈGLES:
- Valeurs pour 100g/100ml
- Si plusieurs colonnes, prends "pour 100g"
- Si illisible, indique "N/A"

RÉPONSE EN JSON UNIQUEMENT:
{
  "nom_produit": "Nom si visible",
  "nutriments_100g": {
    "calories": 350,
    "proteines": 12,
    "glucides": 45,
    "sucres": 8,
    "lipides": 15,
    "lipides_satures": 3,
    "fibres": 5,
    "sel": 1.2
  },
  "ingredients": "Liste si visible",
  "lisibilite": "good" | "partial" | "poor"
}`;

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONFIG.API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extrais les données nutritionnelles de cette étiquette.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${selectedLabelImageBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) throw new Error(`Erreur ${response.status}`);

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Créer un objet compatible avec computeHealthVerdict
    const fakeProduct = {
      productName: result.nom_produit || "Produit analysé",
      nutrimentsPer100g: {
        calories: result.nutriments_100g.calories || 0,
        proteines: result.nutriments_100g.proteines || 0,
        glucides: result.nutriments_100g.glucides || 0,
        sucres: result.nutriments_100g.sucres || 0,
        lipides: result.nutriments_100g.lipides || 0,
        lipidesSatures: result.nutriments_100g.lipides_satures || 0,
        fibres: result.nutriments_100g.fibres || 0,
        sodium: (result.nutriments_100g.sel || 0) / 2.5,
        sel: result.nutriments_100g.sel || 0,
      },
      nutriscoreGrade: null,
      novaGroup: null,
    };

    displayProductAnalysis(fakeProduct);

    addToNutritionHistory({
      type: "label",
      date: new Date().toISOString(),
      imageThumb: selectedLabelImageBase64.substring(0, 100),
      data: fakeProduct,
    });
  } catch (err) {
    console.error("Erreur analyse étiquette:", err);
    resultArea.innerHTML = `<div class="error-card"><span class="error-icon">😕</span><p>Erreur lors de l'analyse</p><small>${err.message}</small></div>`;
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = originalHTML;
  }
}

function displayProductAnalysis(product) {
  const verdict = computeHealthVerdict(product);
  const n = product.nutrimentsPer100g;

  const nutriscoreHTML = product.nutriscoreGrade
    ? `<div class="nutriscore-badge nutriscore-${product.nutriscoreGrade.toLowerCase()}">${product.nutriscoreGrade.toUpperCase()}</div>`
    : "";

  const novaHTML = product.novaGroup
    ? `<div class="nova-badge nova-${product.novaGroup}">NOVA ${product.novaGroup}</div>`
    : "";

  const issuesHTML =
    verdict.issues.length > 0
      ? `<div class="verdict-issues"><h5>⚠️ Points d'attention</h5><ul>${verdict.issues.map((i) => `<li>${i}</li>`).join("")}</ul></div>`
      : "";

  const positivesHTML =
    verdict.positives.length > 0
      ? `<div class="verdict-positives"><h5>✅ Points positifs</h5><ul>${verdict.positives.map((p) => `<li>${p}</li>`).join("")}</ul></div>`
      : "";

  const resultArea = document.getElementById("productAnalysisResult");
  resultArea.innerHTML = `
    <div class="product-analysis-card">
      <h3>${escapeHtml(product.productName)}</h3>
      ${product.brands ? `<p class="product-brand">${escapeHtml(product.brands)}</p>` : ""}

      <div class="product-scores">
        ${nutriscoreHTML}
        ${novaHTML}
      </div>

      <div class="verdict-main">
        <span class="verdict-badge-large ${verdict.verdict}">${verdict.badge} ${verdict.message}</span>
      </div>

      ${issuesHTML}
      ${positivesHTML}

      <h4>📊 Valeurs nutritionnelles (pour 100g)</h4>
      <div class="nutrition-table">
        <div class="nutrition-row"><span>Énergie</span><span>${n.calories} kcal</span></div>
        <div class="nutrition-row"><span>Protéines</span><span>${n.proteines}g</span></div>
        <div class="nutrition-row"><span>Glucides</span><span>${n.glucides}g</span></div>
        <div class="nutrition-row"><span>dont sucres</span><span>${n.sucres}g</span></div>
        <div class="nutrition-row"><span>Lipides</span><span>${n.lipides}g</span></div>
        <div class="nutrition-row"><span>dont saturés</span><span>${n.lipidesSatures}g</span></div>
        <div class="nutrition-row"><span>Fibres</span><span>${n.fibres || "N/A"}g</span></div>
        <div class="nutrition-row"><span>Sel</span><span>${n.sel}g</span></div>
      </div>
    </div>
  `;
}

function addToNutritionHistory(entry) {
  appState.nutritionHistory.unshift(entry);
  if (appState.nutritionHistory.length > 10) {
    appState.nutritionHistory = appState.nutritionHistory.slice(0, 10);
  }
  saveAppState();
  renderNutritionHistory();
}

function renderNutritionHistory() {
  const container = document.getElementById("nutritionHistoryContent");
  if (!container) return;

  if (appState.nutritionHistory.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><p>Aucune analyse récente</p></div>`;
    return;
  }

  const historyHTML = appState.nutritionHistory
    .map((entry, i) => {
      const date = new Date(entry.date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      const icon = entry.type === "plate" ? "🍽️" : "🏷️";
      const title =
        entry.type === "plate"
          ? "Analyse d'assiette"
          : entry.type === "product"
            ? "Produit scanné"
            : "Étiquette analysée";

      return `
      <div class="nutrition-history-item">
        <span class="history-icon">${icon}</span>
        <div class="history-info">
          <p class="history-title">${title}</p>
          <small>${date}</small>
        </div>
      </div>
    `;
    })
    .join("");

  container.innerHTML = historyHTML;
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

// Écouter les changements de connexion
window.addEventListener("online", () => {
  showToast("Connexion rétablie ✅");
});

window.addEventListener("offline", () => {
  showToast("Mode hors-ligne 📴");
});

// --- COMMUNAUTÉ ---
function publishToCommunity(recipe) {
  // Vérifier si elle n'est pas déjà publiée
  const alreadyPublished = appState.community.some((r) => r.nom === recipe.nom);
  if (alreadyPublished) {
    showToast("Tu as déjà partagé cette recette !");
    return;
  }

  // Créer une copie de la recette avec les infos communautaires
  const publicRecipe = {
    ...recipe,
    id: Date.now() + Math.random(),
    author: "Anonyme",
    publishedAt: new Date().toISOString(),
  };

  appState.community.unshift(publicRecipe);
  saveAppState();

  showToast("Recette publiée dans la communauté ! 🌍");
}

function renderCommunity() {
  const container = document.getElementById("community-content");
  if (!container) return;

  if (appState.community.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🌍</span>
        <p>La communauté est vide</p>
        <small>Sois le premier à partager une recette !</small>
      </div>
    `;
    return;
  }

  // Trier par date de publication (les plus récentes d'abord)
  const sortedCommunity = [...appState.community].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  );

  const communityHTML = sortedCommunity
    .map((recipe) => createCommunityAccordionHTML(recipe))
    .join("");

  container.innerHTML = `<div class="community-list">${communityHTML}</div>`;

  // Gestion de l'accordéon
  container.querySelectorAll(".community-accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.closest(".community-accordion-item");
      const body = item.querySelector(".community-accordion-body");
      const isOpen = item.classList.contains("open");

      // Fermer tous les autres
      container.querySelectorAll(".community-accordion-item.open").forEach((openItem) => {
        if (openItem !== item) {
          openItem.classList.remove("open");
          openItem.querySelector(".community-accordion-body").style.maxHeight = null;
        }
      });

      // Toggle celui-ci
      if (isOpen) {
        item.classList.remove("open");
        body.style.maxHeight = null;
      } else {
        item.classList.add("open");
        body.style.maxHeight = body.scrollHeight + "px";
        // Réajuster si le contenu change (ex: images chargées)
        setTimeout(() => {
          if (item.classList.contains("open")) {
            body.style.maxHeight = body.scrollHeight + "px";
          }
        }, 300);
      }
    });
  });

  // Boutons favoris et partage dans les accordéons
  container.querySelectorAll(".community-accordion-item").forEach((item) => {
    const recipeName = item.dataset.recipeName;
    const recipe = appState.community.find((r) => r.nom === recipeName);
    if (!recipe) return;

    const favBtn = item.querySelector(".acc-favorite-btn");
    if (favBtn) {
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(recipe);
        const isNowFav = isFavorite(recipe.nom);
        favBtn.classList.toggle("active", isNowFav);
        favBtn.querySelector("span").textContent = isNowFav ? "❤️" : "🤍";
      });
    }

    const shareBtn = item.querySelector(".acc-share-btn");
    if (shareBtn) {
      shareBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        shareRecipe(recipe);
      });
    }

    // Boutons ajout liste de courses
    item.querySelectorAll(".add-to-list-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        addToShoppingList(btn.dataset.ingredient);
      });
    });
  });
}

function createCommunityAccordionHTML(recipe) {
  const recipeId = recipe.id || Date.now() + Math.random();
  const portions = recipe.portions || 2;
  const calories = recipe.calories_portion || null;
  const author = recipe.author || "Anonyme";
  const publishedAt = recipe.publishedAt
    ? new Date(recipe.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const isFav = isFavorite(recipe.nom);

  // Résumé ingrédients (les 3 premiers)
  const ingPreview = (recipe.ingredients || [])
    .slice(0, 3)
    .map((i) => escapeHtml(i))
    .join(", ");
  const ingMore = recipe.ingredients && recipe.ingredients.length > 3
    ? ` <span class="acc-ing-more">+${recipe.ingredients.length - 3}</span>`
    : "";

  // Ingrédients complets
  const ingredientsHTML = (recipe.ingredients || [])
    .map((ing, i) => `
      <li>
        <label>
          <input type="checkbox" id="acc-ing-${recipeId}-${i}">
          <span>${escapeHtml(ing)}</span>
        </label>
        <button class="add-to-list-btn" data-ingredient="${escapeHtml(ing)}" aria-label="Ajouter à la liste">+</button>
      </li>`)
    .join("");

  // Étapes
  const stepsHTML = (recipe.etapes || [])
    .map((step, i) => {
      const stepId = `acc-step-${recipeId}-${i}`;
      const timerDuration = parseTimeFromStep(step);
      const timerBtn = timerDuration
        ? `<button class="timer-btn" onclick="toggleTimer('${stepId}', ${timerDuration})"><span>⏱️ ${formatTime(timerDuration)}</span></button>`
        : "";
      return `<li data-step-id="${stepId}">${escapeHtml(step)}${timerBtn}</li>`;
    })
    .join("");

  // Astuce chef
  const astuceHTML = recipe.astuce_chef
    ? `<div class="chef-tip"><span class="tip-icon">💡</span> ${escapeHtml(recipe.astuce_chef)}</div>`
    : "";

  // Calories tag
  const caloriesTag = calories
    ? `<span class="acc-tag">🔥 ${calories} kcal/pers</span>`
    : "";

  return `
    <div class="community-accordion-item" data-recipe-name="${escapeHtml(recipe.nom)}">
      <div class="community-accordion-header">
        <div class="acc-header-main">
          <div class="acc-title-row">
            <h3 class="acc-recipe-name">${escapeHtml(recipe.nom)}</h3>
            <span class="acc-chevron">›</span>
          </div>
          <div class="acc-meta">
            <span class="acc-tag">⏱️ ${escapeHtml(recipe.temps || "?")}</span>
            <span class="acc-tag">👨‍🍳 ${escapeHtml(recipe.difficulte || "Moyen")}</span>
            ${caloriesTag}
            <span class="acc-tag acc-tag-author">👤 ${escapeHtml(author)}</span>
            ${publishedAt ? `<span class="acc-tag acc-tag-date">📅 ${publishedAt}</span>` : ""}
          </div>
          <div class="acc-ing-preview">
            🛒 <span>${ingPreview}${ingMore}</span>
          </div>
        </div>
      </div>

      <div class="community-accordion-body">
        <div class="acc-body-inner">
          <h4>🛒 Ingrédients <small>(${portions} portion${portions > 1 ? "s" : ""})</small></h4>
          <ul class="ingredients-list">${ingredientsHTML}</ul>

          <h4>📝 Préparation</h4>
          <ol class="steps-list">${stepsHTML}</ol>

          ${astuceHTML}

          <div class="acc-actions">
            <button class="action-btn acc-favorite-btn ${isFav ? "active" : ""}" aria-label="Ajouter aux favoris">
              <span>${isFav ? "❤️" : "🤍"}</span>
            </button>
            <button class="action-btn acc-share-btn" aria-label="Partager">
              <span>📤</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
