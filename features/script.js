/*
  Household Water Usage Simulator
  ------------------------------------------------------------
  Core idea:
  - Player sets a custom water budget (any positive number).
  - Player logs household activities (minutes or counts).
  - Each date record consumes a calculated amount of liters.
  - Money spent is litersUsed * WATER_PRICE_PER_LITER.
  - The right-side bar shows remaining water as a % of the entered budget.

  The water bar uses a simple spring/point surface simulation so the surface:
  - reacts to changes (inertia/overshoot)
  - is disturbed when you log usage
  - calms down over time when idle
*/

// ====== Simple helpers ======
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

// ====== Easy-to-edit constants ======
/*
  Casual vs Advanced settings:
  - Casual mode uses DEFAULT_FIXTURE_SETTINGS (average household values).
  - Advanced mode lets the user override those values (stored in localStorage).
  - The simulator always calculates using the ACTIVE settings:
      - if advanced settings exist AND Advanced mode is selected => use custom
      - otherwise => use defaults
*/

// Default average fixture output rates (liters as the main unit)
const DEFAULT_FIXTURE_SETTINGS = {
  showerLPerMin: 7.57,
  bathroomSinkLPerMin: 5.68,
  kitchenSinkLPerMin: 8.33,
  toiletLPerFlush: 4.85,
  washerLPerCycle: 53.0,
  dishwasherLPerCycle: 12.11,
  waterPricePerLiter: 0.003,
};

// Casual-mode recommended daily thresholds (editable)
// These are compared against SAVED records (not repeated clicks).
// Week thresholds = daily × 7, Month thresholds = daily × daysInMonth.
const CASUAL_THRESHOLDS = {
  showerMinutes: 10,
  bathroomSinkMinutes: 4,
  kitchenSinkMinutes: 8,
  toiletFlushes: 5,
  washerCycles: 1,
  dishwasherCycles: 1,
};

// Low-water warning thresholds (as a % of budget)
const LOW_WATER_WARN_PCT = 0.2;
const VERY_LOW_WATER_WARN_PCT = 0.1;

const SOURCE_KEYS = [
  "showerMinutes",
  "kitchenSinkMinutes",
  "bathroomSinkMinutes",
  "toiletFlushes",
  "washerCycles",
  "dishwasherCycles",
];

// ====== DOM elements ======
const elWaterBar = document.querySelector(".waterbar");
const elWaterCanvas = document.getElementById("waterCanvas");
const elWaterValue = document.getElementById("waterValue");
const elWaterUnit = document.getElementById("waterUnit");
const elStatusText = document.getElementById("statusText");

const elBudgetInput = document.getElementById("budgetInput");
const elSetBudgetBtn = document.getElementById("setBudgetBtn");
const elResetBtn = document.getElementById("resetBtn");
const elClearInputsBtn = document.getElementById("clearInputsBtn");
const elClearInputsBtnHud = document.getElementById("clearInputsBtnHud");

// Tabs + date selection
const elTabDay = document.getElementById("tabDay");
const elTabWeek = document.getElementById("tabWeek");
const elTabMonth = document.getElementById("tabMonth");

// Casual / Advanced mode tabs
const elTabCasual = document.getElementById("tabCasual");
const elTabAdvanced = document.getElementById("tabAdvanced");
const elSettingsStatus = document.getElementById("settingsStatus");

// Advanced view
const elMainSimView = document.querySelector("main.sim[aria-label='Household water usage simulator']");
const elAdvancedView = document.getElementById("advancedView");
const elBackToSimBtn = document.getElementById("backToSimBtn");
const elSaveAdvancedBtn = document.getElementById("saveAdvancedBtn");
const elResetAdvancedBtn = document.getElementById("resetAdvancedBtn");
const elAdvancedStatus = document.getElementById("advancedStatus");

const elAdvShower = document.getElementById("advShower");
const elAdvBathroomSink = document.getElementById("advBathroomSink");
const elAdvKitchenSink = document.getElementById("advKitchenSink");
const elAdvToilet = document.getElementById("advToilet");
const elAdvWasher = document.getElementById("advWasher");
const elAdvDishwasher = document.getElementById("advDishwasher");
const elAdvPrice = document.getElementById("advPrice");

const elSelectedDateLabel = document.getElementById("selectedDateLabel");
const elRangeLabel = document.getElementById("rangeLabel");
const elDayInput = document.getElementById("dayInput");
const elWeekPicker = document.getElementById("weekPicker");
const elMonthPicker = document.getElementById("monthPicker");

// Source inputs + save
const elSrcShower = document.getElementById("srcShower");
const elSrcKitchen = document.getElementById("srcKitchenSink");
const elSrcBathroom = document.getElementById("srcBathroomSink");
const elSrcToilet = document.getElementById("srcToilet");
const elSrcWasher = document.getElementById("srcWasher");
const elSrcDishwasher = document.getElementById("srcDishwasher");
// (Outdoor hose removed to avoid made-up rates; add back with a real rate if you want.)

const elSaveBtn = document.getElementById("saveBtn");
const elSaveStatus = document.getElementById("saveStatus");

// Date navigation buttons
const elPrevBtn = document.getElementById("prevBtn");
const elTodayBtn = document.getElementById("todayBtn");
const elNextBtn = document.getElementById("nextBtn");

// Output-rate + calculation displays (per-source)
const elRateShower = document.getElementById("rateShower");
const elRateKitchen = document.getElementById("rateKitchenSink");
const elRateBathroom = document.getElementById("rateBathroomSink");
const elRateToilet = document.getElementById("rateToilet");
const elRateWasher = document.getElementById("rateWasher");
const elRateDishwasher = document.getElementById("rateDishwasher");

const elLitersShower = document.getElementById("litersShower");
const elLitersKitchen = document.getElementById("litersKitchenSink");
const elLitersBathroom = document.getElementById("litersBathroomSink");
const elLitersToilet = document.getElementById("litersToilet");
const elLitersWasher = document.getElementById("litersWasher");
const elLitersDishwasher = document.getElementById("litersDishwasher");

const elCostShower = document.getElementById("costShower");
const elCostKitchen = document.getElementById("costKitchenSink");
const elCostBathroom = document.getElementById("costBathroomSink");
const elCostToilet = document.getElementById("costToilet");
const elCostWasher = document.getElementById("costWasher");
const elCostDishwasher = document.getElementById("costDishwasher");

// Advice panel (Casual mode only)
const elAdviceCard = document.getElementById("adviceCard");
const elAdviceSummary = document.getElementById("adviceSummary");
const elAdviceList = document.getElementById("adviceList");

const elSummaryBudget = document.getElementById("summaryBudget");
const elSummaryUsed = document.getElementById("summaryUsed");
const elSummaryRemaining = document.getElementById("summaryRemaining");
const elSummaryCost = document.getElementById("summaryCost");
const elSummaryPct = document.getElementById("summaryPct");
const elLowWarning = document.getElementById("lowWarning");

const elHistory = document.getElementById("history");

// ====== Theme + settings drawer ======
const elSettingsBtn = document.getElementById("settingsBtn");
const elSettingsPanel = document.getElementById("settingsPanel");
const elSettingsCloseBtn = document.getElementById("settingsCloseBtn");
const elScrim = document.getElementById("scrim");
const elThemeLightBtn = document.getElementById("themeLightBtn");
const elThemeDarkBtn = document.getElementById("themeDarkBtn");
const elLangEnBtn = document.getElementById("langEnBtn");
const elLangEsBtn = document.getElementById("langEsBtn");
const elLangFrBtn = document.getElementById("langFrBtn");

const THEME_STORAGE_KEY = "water_sim_theme_v1";
const LANG_STORAGE_KEY = "water_sim_lang_v1";

// ====== i18n (translations) ======
const translations = {
  en: {
    appTitle: "Water Sustainability Dashboard",
    appSubtitle: "Manage water use, cost, and habits.",
    settings: "Settings",
    openSettings: "Open settings",
    closeSettings: "Close settings",
    theme: "Theme",
    lightMode: "Light",
    darkMode: "Dark",
    themeHint: "Your choice is saved on reload.",
    language: "Language",
    languageHint: "Language updates instantly and is saved.",

    casual: "Casual",
    advanced: "Advanced",
    day: "Day",
    week: "Week",
    month: "Month",

    date: "Date",
    selected: "Selected",
    prev: "Prev",
    today: "Today",
    next: "Next",

    budget: "Budget",
    budgetLiters: "Budget (liters)",
    startSession: "Start Session",
    reset: "Reset",
    save: "Save",
    clear: "Clear",
    clearInputs: "Clear inputs",

    waterSources: "Water sources",
    oneRecordRule: "Each date stores one saved record. Saving again with identical values won’t double-count.",
    outputRate: "Output rate",
    outputRateInfo:
      "Output rate means how much water a fixture releases. Showers/sinks use liters per minute, toilets use liters per flush, and washer/dishwasher use liters per cycle.",

    srcShower: "Shower (minutes)",
    srcKitchenSink: "Kitchen sink (minutes)",
    srcBathroomSink: "Bathroom sink (minutes)",
    srcToilet: "Toilet flushes (count)",
    srcWasher: "Washer (cycles)",
    srcDishwasher: "Dishwasher (cycles)",

    advice: "Advice",
    adviceHint: "Tips are based on recommended daily ranges and scale automatically for Week/Month views.",
    history: "History",
    historySubtitle: "Saved records & updates.",

    used: "Used",
    remaining: "Remaining",
    spent: "Spent",
    budgetLeft: "Budget left",
    waterBudget: "Water budget",

    advancedSettingsTitle: "Advanced Fixture Settings",
    advancedSettingsSubtitle:
      "Customize output rates and water price. These values are used in calculations until you reset them.",
    back: "Back",
    customOutputRates: "Custom output rates",
    advancedFormHint: "All values use liters (L). Enter numbers, then click Save.",
    saveAdvanced: "Save Advanced Settings",
    resetToDefaults: "Reset to Defaults",

    status_usingAverages: "Using average household values",
    status_usingCustom: "Using custom advanced settings",
    status_advUsingDefaults: "Advanced mode (currently using defaults)",

    msg_invalidBudget: "Please enter a valid budget (a number greater than 0).",
    msg_sessionStarted: (p) => `Session started with a budget of ${p.budget} liters.`,
    msg_inputsCleared: "Inputs cleared (not saved).",
    msg_setBudgetFirst: "Set a water budget first.",
    msg_noChanges: "No changes detected.",
    msg_notSavedExceeds: "Not saved: this change would exceed your water budget for this view.",
    msg_savedForDate: "Saved record for this date.",
    msg_updatedForDate: "Updated record for this date.",

    adv_editingCustom: "Editing custom settings.",
    adv_noCustomYet: "No custom settings yet. Defaults shown.",
    adv_savedCustom: "Saved custom settings.",
    adv_resetDefaults: "Reset to defaults. Custom settings cleared.",

    advice_normal: "Normal",
    advice_above: "Above average",
    advice_high: "High usage",
    time_today: "today",
    time_week: "this week",
    time_month: "this month",
    advice_niceJob: (p) => `Nice job — your water use stayed within normal ranges ${p.when}.`,
    advice_summary_ok: (p) => `You stayed within average ranges ${p.when}. Total: ${p.liters} L (≈ ${p.cost}).`,
    advice_summary_most: (p) => `Most of your water use came from ${p.a} and ${p.b} ${p.when}. Total: ${p.liters} L (≈ ${p.cost}).`,
    advice_intro: (p) => `Here are a few tips based on your saved usage ${p.when}.`,

    tip_shower_above: (p) =>
      `Your shower time was above average ${p.when}. Even a few minutes less can lower both water use and cost.`,
    tip_shower_high: (p) =>
      `Your shower time was much higher than average ${p.when}. Try shortening it to save water and money.`,
    tip_kitchen_above: (p) => `Kitchen sink use was above average ${p.when}. Small reductions can add up over time.`,
    tip_kitchen_high: (p) =>
      `Kitchen sink use was much higher than average ${p.when}. Turning off the tap when not needed can make a big difference.`,
    tip_bath_above: (p) =>
      `Bathroom sink use was above recommended ${p.when}. A small change each day can help.`,
    tip_bath_high: (p) =>
      `Bathroom sink use was much higher than recommended ${p.when}. Try shorter run times to reduce waste.`,
    tip_toilet_above: (p) =>
      `Your toilet flush count was above average ${p.when}. Reducing unnecessary flushes can help.`,
    tip_toilet_high: (p) =>
      `Your toilet flush count was much higher than average ${p.when}. If this happens often, consider checking for leaks.`,
    tip_washer_above: (p) =>
      `Laundry usage was above average ${p.when}. Combining loads can help save water.`,
    tip_washer_high: (p) =>
      `Laundry usage was much higher than average ${p.when}. Waiting for fuller loads may reduce water use.`,
    tip_dish_above: (p) =>
      `Dishwasher runs were above average ${p.when}. Waiting for fuller loads may help.`,
    tip_dish_high: (p) =>
      `Dishwasher runs were much higher than average ${p.when}. Running fuller loads can reduce water and cost.`,
  },
  es: {
    appTitle: "Panel de sostenibilidad del agua",
    appSubtitle: "Gestiona el uso de agua, el costo y tus hábitos.",
    settings: "Configuración",
    openSettings: "Abrir configuración",
    closeSettings: "Cerrar configuración",
    theme: "Tema",
    lightMode: "Claro",
    darkMode: "Oscuro",
    themeHint: "Tu elección se guarda al recargar.",
    language: "Idioma",
    languageHint: "El idioma se actualiza al instante y se guarda.",

    casual: "Casual",
    advanced: "Avanzado",
    day: "Día",
    week: "Semana",
    month: "Mes",

    date: "Fecha",
    selected: "Seleccionado",
    prev: "Anterior",
    today: "Hoy",
    next: "Siguiente",

    budget: "Presupuesto",
    budgetLiters: "Presupuesto (litros)",
    startSession: "Iniciar",
    reset: "Restablecer",
    save: "Guardar",
    clear: "Limpiar",
    clearInputs: "Limpiar entradas",

    waterSources: "Fuentes de agua",
    oneRecordRule:
      "Cada fecha guarda un solo registro. Guardar de nuevo con los mismos valores no suma dos veces.",
    outputRate: "Caudal",
    outputRateInfo:
      "El caudal es cuánta agua libera un dispositivo. Duchas y grifos usan litros por minuto, el inodoro litros por descarga y lavadora/lavavajillas litros por ciclo.",

    srcShower: "Ducha (minutos)",
    srcKitchenSink: "Fregadero de cocina (minutos)",
    srcBathroomSink: "Lavabo de baño (minutos)",
    srcToilet: "Descargas del inodoro (cantidad)",
    srcWasher: "Lavadora (ciclos)",
    srcDishwasher: "Lavavajillas (ciclos)",

    advice: "Consejos",
    adviceHint: "Los consejos se basan en rangos diarios recomendados y se ajustan para Semana/Mes.",
    history: "Historial",
    historySubtitle: "Registros guardados y actualizaciones.",

    used: "Usado",
    remaining: "Restante",
    spent: "Gastado",
    budgetLeft: "Presupuesto restante",
    waterBudget: "Presupuesto de agua",

    advancedSettingsTitle: "Ajustes avanzados de dispositivos",
    advancedSettingsSubtitle:
      "Personaliza caudales y el precio del agua. Estos valores se usan hasta que los restablezcas.",
    back: "Volver",
    customOutputRates: "Caudales personalizados",
    advancedFormHint: "Todos los valores usan litros (L). Ingresa números y guarda.",
    saveAdvanced: "Guardar ajustes avanzados",
    resetToDefaults: "Restablecer valores",

    status_usingAverages: "Usando valores promedio del hogar",
    status_usingCustom: "Usando ajustes avanzados personalizados",
    status_advUsingDefaults: "Modo avanzado (usando valores por defecto)",

    msg_invalidBudget: "Ingresa un presupuesto válido (un número mayor que 0).",
    msg_sessionStarted: (p) => `Sesión iniciada con un presupuesto de ${p.budget} litros.`,
    msg_inputsCleared: "Entradas limpiadas (no guardado).",
    msg_setBudgetFirst: "Primero define un presupuesto de agua.",
    msg_noChanges: "No se detectaron cambios.",
    msg_notSavedExceeds: "No guardado: este cambio superaría tu presupuesto para esta vista.",
    msg_savedForDate: "Registro guardado para esta fecha.",
    msg_updatedForDate: "Registro actualizado para esta fecha.",

    adv_editingCustom: "Editando ajustes personalizados.",
    adv_noCustomYet: "Aún no hay ajustes personalizados. Se muestran los valores por defecto.",
    adv_savedCustom: "Ajustes personalizados guardados.",
    adv_resetDefaults: "Restablecido a valores por defecto. Se borraron los ajustes personalizados.",

    advice_normal: "Normal",
    advice_above: "Por encima del promedio",
    advice_high: "Uso alto",
    time_today: "hoy",
    time_week: "esta semana",
    time_month: "este mes",
    advice_niceJob: (p) => `Buen trabajo: tu uso de agua estuvo dentro de rangos normales ${p.when}.`,
    advice_summary_ok: (p) => `Te mantuviste dentro de rangos promedio ${p.when}. Total: ${p.liters} L (≈ ${p.cost}).`,
    advice_summary_most: (p) =>
      `La mayor parte de tu uso de agua vino de ${p.a} y ${p.b} ${p.when}. Total: ${p.liters} L (≈ ${p.cost}).`,
    advice_intro: (p) => `Aquí tienes algunos consejos según tu uso guardado ${p.when}.`,

    tip_shower_above: (p) =>
      `Tu tiempo de ducha estuvo por encima del promedio ${p.when}. Reducir unos minutos puede bajar el uso y el costo.`,
    tip_shower_high: (p) =>
      `Tu tiempo de ducha fue mucho mayor que el promedio ${p.when}. Intenta acortarla para ahorrar agua y dinero.`,
    tip_kitchen_above: (p) =>
      `El uso del fregadero de cocina estuvo por encima del promedio ${p.when}. Pequeñas reducciones suman.`,
    tip_kitchen_high: (p) =>
      `El uso del fregadero de cocina fue mucho mayor que el promedio ${p.when}. Cerrar el grifo cuando no se usa ayuda mucho.`,
    tip_bath_above: (p) =>
      `El uso del lavabo de baño estuvo por encima de lo recomendado ${p.when}. Un pequeño cambio diario ayuda.`,
    tip_bath_high: (p) =>
      `El uso del lavabo de baño fue mucho mayor que lo recomendado ${p.when}. Intenta tiempos más cortos para reducir desperdicio.`,
    tip_toilet_above: (p) =>
      `Las descargas del inodoro estuvieron por encima del promedio ${p.when}. Reducir descargas innecesarias ayuda.`,
    tip_toilet_high: (p) =>
      `Las descargas del inodoro fueron mucho mayores que el promedio ${p.when}. Si pasa seguido, revisa posibles fugas.`,
    tip_washer_above: (p) =>
      `El uso de la lavadora estuvo por encima del promedio ${p.when}. Combinar cargas puede ahorrar agua.`,
    tip_washer_high: (p) =>
      `El uso de la lavadora fue mucho mayor que el promedio ${p.when}. Esperar a cargas más llenas puede reducir el consumo.`,
    tip_dish_above: (p) =>
      `El lavavajillas se usó por encima del promedio ${p.when}. Esperar a cargas más llenas puede ayudar.`,
    tip_dish_high: (p) =>
      `El lavavajillas se usó mucho más que el promedio ${p.when}. Cargas más llenas reducen agua y costo.`,
  },
  fr: {
    appTitle: "Tableau de bord eau durable",
    appSubtitle: "Suivez l’usage d’eau, le coût et vos habitudes.",
    settings: "Paramètres",
    openSettings: "Ouvrir les paramètres",
    closeSettings: "Fermer les paramètres",
    theme: "Thème",
    lightMode: "Clair",
    darkMode: "Sombre",
    themeHint: "Votre choix est conservé au rechargement.",
    language: "Langue",
    languageHint: "La langue se met à jour immédiatement et est enregistrée.",

    casual: "Casual",
    advanced: "Avancé",
    day: "Jour",
    week: "Semaine",
    month: "Mois",

    date: "Date",
    selected: "Sélectionné",
    prev: "Préc.",
    today: "Aujourd’hui",
    next: "Suiv.",

    budget: "Budget",
    budgetLiters: "Budget (litres)",
    startSession: "Démarrer",
    reset: "Réinitialiser",
    save: "Enregistrer",
    clear: "Effacer",
    clearInputs: "Effacer les champs",

    waterSources: "Sources d’eau",
    oneRecordRule:
      "Chaque date enregistre un seul relevé. Enregistrer à nouveau avec les mêmes valeurs ne double-compte pas.",
    outputRate: "Débit",
    outputRateInfo:
      "Le débit correspond à la quantité d’eau délivrée. Douches/robinets : litres par minute ; toilettes : litres par chasse ; lave-linge/lave-vaisselle : litres par cycle.",

    srcShower: "Douche (minutes)",
    srcKitchenSink: "Évier cuisine (minutes)",
    srcBathroomSink: "Lavabo (minutes)",
    srcToilet: "Chasses d’eau (nombre)",
    srcWasher: "Lave-linge (cycles)",
    srcDishwasher: "Lave-vaisselle (cycles)",

    advice: "Conseils",
    adviceHint: "Les conseils se basent sur des repères journaliers et s’adaptent pour Semaine/Mois.",
    history: "Historique",
    historySubtitle: "Enregistrements et mises à jour.",

    used: "Utilisé",
    remaining: "Restant",
    spent: "Coût",
    budgetLeft: "Budget restant",
    waterBudget: "Budget d’eau",

    advancedSettingsTitle: "Réglages avancés des équipements",
    advancedSettingsSubtitle:
      "Personnalisez les débits et le prix de l’eau. Ces valeurs sont utilisées jusqu’à réinitialisation.",
    back: "Retour",
    customOutputRates: "Débits personnalisés",
    advancedFormHint: "Toutes les valeurs sont en litres (L). Saisissez puis enregistrez.",
    saveAdvanced: "Enregistrer les réglages",
    resetToDefaults: "Valeurs par défaut",

    status_usingAverages: "Valeurs moyennes du foyer",
    status_usingCustom: "Réglages avancés personnalisés",
    status_advUsingDefaults: "Mode avancé (valeurs par défaut)",

    msg_invalidBudget: "Veuillez saisir un budget valide (un nombre supérieur à 0).",
    msg_sessionStarted: (p) => `Session démarrée avec un budget de ${p.budget} litres.`,
    msg_inputsCleared: "Champs effacés (non enregistré).",
    msg_setBudgetFirst: "Définissez d’abord un budget d’eau.",
    msg_noChanges: "Aucun changement détecté.",
    msg_notSavedExceeds: "Non enregistré : ce changement dépasserait votre budget pour cette vue.",
    msg_savedForDate: "Enregistrement sauvegardé pour cette date.",
    msg_updatedForDate: "Enregistrement mis à jour pour cette date.",

    adv_editingCustom: "Modification des réglages personnalisés.",
    adv_noCustomYet: "Pas encore de réglages personnalisés. Valeurs par défaut affichées.",
    adv_savedCustom: "Réglages personnalisés enregistrés.",
    adv_resetDefaults: "Réinitialisé aux valeurs par défaut. Réglages personnalisés supprimés.",

    advice_normal: "Normal",
    advice_above: "Au-dessus de la moyenne",
    advice_high: "Usage élevé",
    time_today: "aujourd’hui",
    time_week: "cette semaine",
    time_month: "ce mois-ci",
    advice_niceJob: (p) => `Bravo — votre usage d’eau est resté dans des valeurs normales ${p.when}.`,
    advice_summary_ok: (p) => `Vous êtes resté dans la moyenne ${p.when}. Total : ${p.liters} L (≈ ${p.cost}).`,
    advice_summary_most: (p) =>
      `La majorité de votre usage vient de ${p.a} et ${p.b} ${p.when}. Total : ${p.liters} L (≈ ${p.cost}).`,
    advice_intro: (p) => `Voici quelques conseils basés sur vos données enregistrées ${p.when}.`,

    tip_shower_above: (p) =>
      `Votre durée de douche est au-dessus de la moyenne ${p.when}. Réduire quelques minutes diminue l’eau et le coût.`,
    tip_shower_high: (p) =>
      `Votre durée de douche est bien au-dessus de la moyenne ${p.when}. Essayez de la raccourcir pour économiser.`,
    tip_kitchen_above: (p) =>
      `L’usage de l’évier cuisine est au-dessus de la moyenne ${p.when}. De petites réductions s’additionnent.`,
    tip_kitchen_high: (p) =>
      `L’usage de l’évier cuisine est bien au-dessus de la moyenne ${p.when}. Couper l’eau quand inutile aide beaucoup.`,
    tip_bath_above: (p) =>
      `L’usage du lavabo est au-dessus des repères ${p.when}. Un petit changement quotidien aide.`,
    tip_bath_high: (p) =>
      `L’usage du lavabo est bien au-dessus des repères ${p.when}. Essayez des durées plus courtes.`,
    tip_toilet_above: (p) =>
      `Le nombre de chasses est au-dessus de la moyenne ${p.when}. Réduire les chasses inutiles peut aider.`,
    tip_toilet_high: (p) =>
      `Le nombre de chasses est bien au-dessus de la moyenne ${p.when}. Si cela arrive souvent, pensez à vérifier une fuite.`,
    tip_washer_above: (p) =>
      `L’usage du lave-linge est au-dessus de la moyenne ${p.when}. Regrouper les lessives peut économiser de l’eau.`,
    tip_washer_high: (p) =>
      `L’usage du lave-linge est bien au-dessus de la moyenne ${p.when}. Attendre des charges plus pleines peut aider.`,
    tip_dish_above: (p) =>
      `Le lave-vaisselle est au-dessus de la moyenne ${p.when}. Attendre une charge pleine peut aider.`,
    tip_dish_high: (p) =>
      `Le lave-vaisselle est bien au-dessus de la moyenne ${p.when}. Des charges plus pleines réduisent eau et coût.`,
  },
};

let currentLanguage = "en";

function t(key, params) {
  const dict = translations[currentLanguage] || translations.en;
  const fallback = translations.en;
  const value = dict[key] ?? fallback[key] ?? key;
  if (typeof value === "function") return value(params || {});
  return String(value);
}

function setLanguage(lang) {
  currentLanguage = translations[lang] ? lang : "en";
  try {
    localStorage.setItem(LANG_STORAGE_KEY, currentLanguage);
  } catch {
    // ignore
  }
  // Update segmented pressed state
  if (elLangEnBtn) elLangEnBtn.setAttribute("aria-pressed", String(currentLanguage === "en"));
  if (elLangEsBtn) elLangEsBtn.setAttribute("aria-pressed", String(currentLanguage === "es"));
  if (elLangFrBtn) elLangFrBtn.setAttribute("aria-pressed", String(currentLanguage === "fr"));
  renderI18n();
}

function loadLanguage() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch {
    // ignore
  }
  return "en";
}

function renderI18n() {
  // Update static UI text nodes
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const key = el.getAttribute("data-i18n");
    if (!key) continue;
    el.textContent = t(key);
  }

  // Update aria-label helper keys
  for (const el of document.querySelectorAll("[data-i18n-aria]")) {
    const key = el.getAttribute("data-i18n-aria");
    if (!key) continue;
    el.setAttribute("aria-label", t(key));
  }

  // Mode tabs labels (kept as textContent because they are buttons)
  elTabCasual.textContent = t("casual");
  elTabAdvanced.textContent = t("advanced");

  // Re-render dynamic areas using new language
  renderSettingsStatus();
  renderOutputRatesUI();
  updatePerSourceCalcUI();
  renderAdviceUI();
  renderHistory();
}

function setTheme(theme) {
  // theme: "light" | "dark"
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }

  // Update segmented state
  if (elThemeLightBtn) elThemeLightBtn.setAttribute("aria-pressed", String(theme !== "dark"));
  if (elThemeDarkBtn) elThemeDarkBtn.setAttribute("aria-pressed", String(theme === "dark"));

  // Sync canvas colors for the new theme
  syncWaterThemeColors();
}

function loadTheme() {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (t === "dark" || t === "light") return t;
  } catch {
    // ignore
  }
  return "light";
}

function openSettings(open) {
  if (!elSettingsPanel || !elScrim) return;
  if (open) {
    elSettingsPanel.classList.remove("settings--hidden");
    elScrim.classList.remove("scrim--hidden");
  } else {
    elSettingsPanel.classList.add("settings--hidden");
    elScrim.classList.add("scrim--hidden");
  }
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function cssVarRgba(name, fallback) {
  return cssVar(name, fallback);
}

function syncWaterThemeColors() {
  // Keep the water visualization aligned with theme variables.
  // (The canvas renderer uses these values.)
  WATER_PHYS.tankBg = cssVar("--tank-bg", WATER_PHYS.tankBg);
  WATER_PHYS.tankBorder = cssVarRgba("--tank-border", WATER_PHYS.tankBorder);
  WATER_PHYS.waterColorTop = cssVar("--water-top", WATER_PHYS.waterColorTop);
  WATER_PHYS.waterColorBottom = cssVar("--water-bottom", WATER_PHYS.waterColorBottom);
  WATER_PHYS.surfaceLine = cssVarRgba("--surface-line", WATER_PHYS.surfaceLine);
  WATER_PHYS.surfaceGlow = cssVarRgba("--surface-glow", WATER_PHYS.surfaceGlow);
  WATER_PHYS.redZoneLine = cssVarRgba("--red-zone-line", WATER_PHYS.redZoneLine);
  WATER_PHYS.redZoneFill = cssVarRgba("--red-zone-fill", WATER_PHYS.redZoneFill);
}

// ====== Simulator state ======
/*
  IMPORTANT DATA RULE:
  - Each date has ONE record stored under YYYY-MM-DD.
  - Saving with identical values does nothing (no double-counting).
  - If values change, we overwrite that date record and totals update by difference.
*/
const sim = {
  budget: 0,
  started: false,

  // Casual / advanced settings mode
  settingsMode: /** @type {"casual" | "advanced"} */ ("casual"),

  // Mode + date selection
  mode: /** @type {"day" | "week" | "month"} */ ("day"),
  selectedDate: new Date(), // always a specific date

  // Records keyed by YYYY-MM-DD
  records: /** @type {Record<string, { showerMinutes:number; kitchenSinkMinutes:number; bathroomSinkMinutes:number; toiletFlushes:number; washerCycles:number; dishwasherCycles:number }>} */ ({}),

  // History messages about saves/updates (not usage stacking)
  // Store a messageKey so the UI can translate history when language changes.
  history: /** @type {Array<{ when: number; dateKey: string; messageKey?: string; message?: string; liters: number; cost: number }>} */ ([]),

  lastFrameMs: performance.now(),
};

const STORAGE_KEY = "water_sim_records_v1";
const SETTINGS_STORAGE_KEY = "water_sim_fixture_settings_v1";

const fixtureState = {
  custom: /** @type {null | typeof DEFAULT_FIXTURE_SETTINGS} */ (null),
};

function loadFixtureSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      fixtureState.custom = null;
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      fixtureState.custom = null;
      return;
    }
    fixtureState.custom = {
      showerLPerMin: Number(parsed.showerLPerMin) || DEFAULT_FIXTURE_SETTINGS.showerLPerMin,
      bathroomSinkLPerMin: Number(parsed.bathroomSinkLPerMin) || DEFAULT_FIXTURE_SETTINGS.bathroomSinkLPerMin,
      kitchenSinkLPerMin: Number(parsed.kitchenSinkLPerMin) || DEFAULT_FIXTURE_SETTINGS.kitchenSinkLPerMin,
      toiletLPerFlush: Number(parsed.toiletLPerFlush) || DEFAULT_FIXTURE_SETTINGS.toiletLPerFlush,
      washerLPerCycle: Number(parsed.washerLPerCycle) || DEFAULT_FIXTURE_SETTINGS.washerLPerCycle,
      dishwasherLPerCycle: Number(parsed.dishwasherLPerCycle) || DEFAULT_FIXTURE_SETTINGS.dishwasherLPerCycle,
      waterPricePerLiter: Number(parsed.waterPricePerLiter) || DEFAULT_FIXTURE_SETTINGS.waterPricePerLiter,
    };
  } catch {
    fixtureState.custom = null;
  }
}

function saveFixtureSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    fixtureState.custom = settings;
  } catch {
    // ignore
  }
}

function clearFixtureSettings() {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    // ignore
  }
  fixtureState.custom = null;
}

function activeFixtureSettings() {
  // Casual mode always uses defaults.
  // Advanced mode uses custom if present; otherwise defaults.
  if (sim.settingsMode === "casual") return DEFAULT_FIXTURE_SETTINGS;
  return fixtureState.custom || DEFAULT_FIXTURE_SETTINGS;
}

function renderSettingsStatus() {
  if (!elSettingsStatus) return;
  const usingCustom = sim.settingsMode === "advanced" && !!fixtureState.custom;
  if (sim.settingsMode === "casual") {
    elSettingsStatus.textContent = t("status_usingAverages");
  } else if (usingCustom) {
    elSettingsStatus.textContent = t("status_usingCustom");
  } else {
    elSettingsStatus.textContent = t("status_advUsingDefaults");
  }
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const incoming = parsed.records || {};
      // Basic migration: ensure each record has expected keys and ignore unknowns.
      const next = {};
      for (const key of Object.keys(incoming)) {
        const r = incoming[key] || {};
        next[key] = {
          showerMinutes: Number(r.showerMinutes) || 0,
          kitchenSinkMinutes: Number(r.kitchenSinkMinutes) || 0,
          bathroomSinkMinutes: Number(r.bathroomSinkMinutes) || 0,
          toiletFlushes: Number(r.toiletFlushes) || 0,
          washerCycles: Number(r.washerCycles) || 0,
          dishwasherCycles: Number(r.dishwasherCycles) || 0,
        };
      }
      sim.records = next;
      sim.budget = Number(parsed.budget) || 0; // budget is now liters
      sim.started = sim.budget > 0;
    }
  } catch {
    // ignore storage errors
  }
}

function saveRecords() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        budget: sim.budget,
        records: sim.records,
      })
    );
  } catch {
    // ignore storage errors
  }
}

function dateKeyFromDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateFromKey(key) {
  const [y, m, d] = key.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1);
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(date) {
  // Monday-based week
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMon = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMon);
  return d;
}

function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatDateLong(d) {
  return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function setSaveStatus(text) {
  if (!elSaveStatus) return;
  elSaveStatus.textContent = text;
}

function setSaveStatusKey(key, params) {
  setSaveStatus(t(key, params));
}

function renderOutputRatesUI() {
  // Show output rates next to each source (visible numbers in the UI)
  const s = activeFixtureSettings();
  if (elRateShower) elRateShower.textContent = `${s.showerLPerMin} L/min`;
  if (elRateKitchen) elRateKitchen.textContent = `${s.kitchenSinkLPerMin} L/min`;
  if (elRateBathroom) elRateBathroom.textContent = `${s.bathroomSinkLPerMin} L/min`;
  if (elRateToilet) elRateToilet.textContent = `${s.toiletLPerFlush} L/flush`;
  if (elRateWasher) elRateWasher.textContent = `${s.washerLPerCycle} L/cycle`;
  if (elRateDishwasher) elRateDishwasher.textContent = `${s.dishwasherLPerCycle} L/cycle`;
}

function updatePerSourceCalcUI() {
  // For each source:
  // liters used = input amount × output rate
  // cost = liters used × waterPricePerLiter
  const rec = readFormRecord();
  const s = activeFixtureSettings();

  const showerL = rec.showerMinutes * s.showerLPerMin;
  const kitchenL = rec.kitchenSinkMinutes * s.kitchenSinkLPerMin;
  const bathL = rec.bathroomSinkMinutes * s.bathroomSinkLPerMin;
  const toiletL = rec.toiletFlushes * s.toiletLPerFlush;
  const washerL = rec.washerCycles * s.washerLPerCycle;
  const dishL = rec.dishwasherCycles * s.dishwasherLPerCycle;

  if (elLitersShower) elLitersShower.textContent = String(round2(showerL));
  if (elLitersKitchen) elLitersKitchen.textContent = String(round2(kitchenL));
  if (elLitersBathroom) elLitersBathroom.textContent = String(round2(bathL));
  if (elLitersToilet) elLitersToilet.textContent = String(round2(toiletL));
  if (elLitersWasher) elLitersWasher.textContent = String(round2(washerL));
  if (elLitersDishwasher) elLitersDishwasher.textContent = String(round2(dishL));

  if (elCostShower) elCostShower.textContent = formatMoney(showerL * s.waterPricePerLiter);
  if (elCostKitchen) elCostKitchen.textContent = formatMoney(kitchenL * s.waterPricePerLiter);
  if (elCostBathroom) elCostBathroom.textContent = formatMoney(bathL * s.waterPricePerLiter);
  if (elCostToilet) elCostToilet.textContent = formatMoney(toiletL * s.waterPricePerLiter);
  if (elCostWasher) elCostWasher.textContent = formatMoney(washerL * s.waterPricePerLiter);
  if (elCostDishwasher) elCostDishwasher.textContent = formatMoney(dishL * s.waterPricePerLiter);
}

function pushHistory(entry) {
  sim.history.unshift(entry);
  sim.history = sim.history.slice(0, 20);
  renderHistory();
}

function renderHistory() {
  if (!elHistory) return;
  if (!sim.started || sim.history.length === 0) {
    elHistory.innerHTML = `<div class="hint">No saves yet. Pick a date, enter values, and click Save.</div>`;
    return;
  }

  elHistory.innerHTML = "";
  for (const h of sim.history) {
    const item = document.createElement("div");
    item.className = "historyItem";

    const top = document.createElement("div");
    top.className = "historyItem__top";

    const left = document.createElement("div");
    left.textContent = `${h.dateKey}`;

    const right = document.createElement("div");
    right.textContent = `${round2(h.liters)} L`;

    top.appendChild(left);
    top.appendChild(right);

    const bottom = document.createElement("div");
    bottom.className = "historyItem__bottom";
    const msg = h.messageKey ? t(h.messageKey) : h.message || "";
    bottom.textContent = `${msg} • Cost: ${formatMoney(h.cost)}`;

    item.appendChild(top);
    item.appendChild(bottom);
    elHistory.appendChild(item);
  }
}

function emptyRecord() {
  return {
    showerMinutes: 0,
    kitchenSinkMinutes: 0,
    bathroomSinkMinutes: 0,
    toiletFlushes: 0,
    washerCycles: 0,
    dishwasherCycles: 0,
  };
}

function readFormRecord() {
  // Convert inputs to numbers (default 0). Clamp at 0 and use integers.
  const n = (el) => clamp(Math.floor(Number(el.value) || 0), 0, 10_000);
  return {
    showerMinutes: n(elSrcShower),
    kitchenSinkMinutes: n(elSrcKitchen),
    bathroomSinkMinutes: n(elSrcBathroom),
    toiletFlushes: n(elSrcToilet),
    washerCycles: n(elSrcWasher),
    dishwasherCycles: n(elSrcDishwasher),
  };
}

function writeFormRecord(rec) {
  elSrcShower.value = rec.showerMinutes ? String(rec.showerMinutes) : "";
  elSrcKitchen.value = rec.kitchenSinkMinutes ? String(rec.kitchenSinkMinutes) : "";
  elSrcBathroom.value = rec.bathroomSinkMinutes ? String(rec.bathroomSinkMinutes) : "";
  elSrcToilet.value = rec.toiletFlushes ? String(rec.toiletFlushes) : "";
  elSrcWasher.value = rec.washerCycles ? String(rec.washerCycles) : "";
  elSrcDishwasher.value = rec.dishwasherCycles ? String(rec.dishwasherCycles) : "";
}

function recordEquals(a, b) {
  return SOURCE_KEYS.every((k) => Number(a[k]) === Number(b[k]));
}

function litersForRecord(rec) {
  // liters used = usage amount × output rate
  const s = activeFixtureSettings();
  return (
    rec.showerMinutes * s.showerLPerMin +
    rec.kitchenSinkMinutes * s.kitchenSinkLPerMin +
    rec.bathroomSinkMinutes * s.bathroomSinkLPerMin +
    rec.toiletFlushes * s.toiletLPerFlush +
    rec.washerCycles * s.washerLPerCycle +
    rec.dishwasherCycles * s.dishwasherLPerCycle
  );
}

function rangeForMode(mode, selectedDate) {
  if (mode === "day") {
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    return { start, end: start };
  }
  if (mode === "week") {
    const start = startOfWeek(selectedDate);
    const end = addDays(start, 6);
    return { start, end };
  }
  const start = monthStart(selectedDate);
  const end = monthEnd(selectedDate);
  return { start, end };
}

function keysInRange(start, end) {
  const keys = [];
  let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (d <= last) {
    keys.push(dateKeyFromDate(d));
    d = addDays(d, 1);
  }
  return keys;
}

function totalLitersForRange(start, end) {
  let total = 0;
  for (const key of keysInRange(start, end)) {
    const rec = sim.records[key];
    if (rec) total += litersForRecord(rec);
  }
  return total;
}

function usageTotalsForRange(start, end) {
  // Totals in input units (minutes/flushes/cycles), not liters.
  const totals = emptyRecord();
  for (const key of keysInRange(start, end)) {
    const rec = sim.records[key];
    if (!rec) continue;
    totals.showerMinutes += rec.showerMinutes;
    totals.kitchenSinkMinutes += rec.kitchenSinkMinutes;
    totals.bathroomSinkMinutes += rec.bathroomSinkMinutes;
    totals.toiletFlushes += rec.toiletFlushes;
    totals.washerCycles += rec.washerCycles;
    totals.dishwasherCycles += rec.dishwasherCycles;
  }
  return totals;
}

function usedUnitsCurrentView() {
  if (!sim.started) return 0;
  const { start, end } = rangeForMode(sim.mode, sim.selectedDate);
  return totalLitersForRange(start, end);
}

function remainingUnitsCurrentView() {
  if (!sim.started) return 0;
  return clamp(sim.budget - usedUnitsCurrentView(), 0, sim.budget);
}

function remainingPctCurrentView() {
  if (!sim.started || sim.budget <= 0) return 0;
  return clamp(remainingUnitsCurrentView() / sim.budget, 0, 1);
}

function updateSummaryUI() {
  if (!sim.started) {
    elSummaryBudget.textContent = "—";
    elSummaryUsed.textContent = "—";
    elSummaryRemaining.textContent = "—";
    elSummaryCost.textContent = "—";
    elSummaryPct.textContent = "—";
    elLowWarning.textContent = "";
    return;
  }

  const { start, end } = rangeForMode(sim.mode, sim.selectedDate);
  const used = totalLitersForRange(start, end);
  const rem = clamp(sim.budget - used, 0, sim.budget);
  const pct = sim.budget > 0 ? (rem / sim.budget) * 100 : 0;
  const cost = used * activeFixtureSettings().waterPricePerLiter;

  elSummaryBudget.textContent = `${round2(sim.budget)} L`;
  elSummaryUsed.textContent = `${round2(used)} L`;
  elSummaryRemaining.textContent = `${round2(rem)} L`;
  elSummaryCost.textContent = formatMoney(cost);
  elSummaryPct.textContent = `${Math.round(pct)}%`;

  if (rem <= 0) {
    elLowWarning.textContent = "Out of water for this view. Reduce usage or reset.";
  } else if (pct <= VERY_LOW_WATER_WARN_PCT * 100) {
    elLowWarning.textContent = "Very low water remaining. Consider reducing high-usage sources.";
  } else if (pct <= LOW_WATER_WARN_PCT * 100) {
    elLowWarning.textContent = "Low water remaining. Try saving water to stay within budget.";
  } else {
    elLowWarning.textContent = "";
  }
}

function updateHudUI() {
  if (!sim.started) {
    elWaterValue.textContent = "—";
    elWaterUnit.textContent = "/ —";
    elStatusText.textContent = "Set a water budget to start the session.";
    return;
  }

  const { start, end } = rangeForMode(sim.mode, sim.selectedDate);
  const used = totalLitersForRange(start, end);
  const rem = clamp(sim.budget - used, 0, sim.budget);
  const pct = sim.budget > 0 ? (rem / sim.budget) * 100 : 0;

  elWaterValue.textContent = String(Math.ceil(rem));
  elWaterUnit.textContent = `/ ${Math.ceil(sim.budget)}`;

  if (rem <= 0) {
    elStatusText.textContent = "Out of water for this view. Reduce usage or reset.";
  } else {
    elStatusText.textContent = `${sim.mode.toUpperCase()} view • Budget left: ${Math.round(
      pct
    )}% • Money spent: ${formatMoney(used * activeFixtureSettings().waterPricePerLiter)}`;
  }
}

function severityFor(value, threshold) {
  if (threshold <= 0) return "normal";
  if (value <= threshold) return "normal";
  if (value <= threshold * 1.5) return "above";
  return "high";
}

function adviceMessagesForCurrentView() {
  // Advice only exists in Casual mode (no judging in Advanced mode).
  if (!sim.started || sim.settingsMode !== "casual") return { summary: "", items: [] };

  const { start, end } = rangeForMode(sim.mode, sim.selectedDate);
  const totals = usageTotalsForRange(start, end);

  const days =
    sim.mode === "day"
      ? 1
      : sim.mode === "week"
        ? 7
        : monthEnd(sim.selectedDate).getDate();

  // Scale thresholds by time range
  const thr = {
    showerMinutes: CASUAL_THRESHOLDS.showerMinutes * days,
    bathroomSinkMinutes: CASUAL_THRESHOLDS.bathroomSinkMinutes * days,
    kitchenSinkMinutes: CASUAL_THRESHOLDS.kitchenSinkMinutes * days,
    toiletFlushes: CASUAL_THRESHOLDS.toiletFlushes * days,
    washerCycles: CASUAL_THRESHOLDS.washerCycles * days,
    dishwasherCycles: CASUAL_THRESHOLDS.dishwasherCycles * days,
  };

  const sev = {
    showerMinutes: severityFor(totals.showerMinutes, thr.showerMinutes),
    kitchenSinkMinutes: severityFor(totals.kitchenSinkMinutes, thr.kitchenSinkMinutes),
    bathroomSinkMinutes: severityFor(totals.bathroomSinkMinutes, thr.bathroomSinkMinutes),
    toiletFlushes: severityFor(totals.toiletFlushes, thr.toiletFlushes),
    washerCycles: severityFor(totals.washerCycles, thr.washerCycles),
    dishwasherCycles: severityFor(totals.dishwasherCycles, thr.dishwasherCycles),
  };

  const s = activeFixtureSettings(); // in casual this is defaults
  const price = s.waterPricePerLiter;

  // Determine biggest contributors (by liters)
  const litersBySource = [
    { key: "showerMinutes", label: "shower", liters: totals.showerMinutes * s.showerLPerMin },
    { key: "kitchenSinkMinutes", label: "kitchen sink", liters: totals.kitchenSinkMinutes * s.kitchenSinkLPerMin },
    { key: "bathroomSinkMinutes", label: "bathroom sink", liters: totals.bathroomSinkMinutes * s.bathroomSinkLPerMin },
    { key: "toiletFlushes", label: "toilet", liters: totals.toiletFlushes * s.toiletLPerFlush },
    { key: "washerCycles", label: "washer", liters: totals.washerCycles * s.washerLPerCycle },
    { key: "dishwasherCycles", label: "dishwasher", liters: totals.dishwasherCycles * s.dishwasherLPerCycle },
  ].sort((a, b) => b.liters - a.liters);

  const top1 = litersBySource[0];
  const top2 = litersBySource[1];

  /** @type {Array<{source:string; severity:"normal"|"above"|"high"; message:string}>} */
  const items = [];

  const timeWord = sim.mode === "day" ? t("time_today") : sim.mode === "week" ? t("time_week") : t("time_month");

  // Helper to add message
  function add(source, severity, message) {
    items.push({ source, severity, message });
  }

  // Shower
  if (sev.showerMinutes !== "normal") {
    const msg =
      sev.showerMinutes === "high"
        ? t("tip_shower_high", { when: timeWord })
        : t("tip_shower_above", { when: timeWord });
    add(t("srcShower").replace(" (minutes)", ""), sev.showerMinutes, msg);
  }

  // Kitchen sink
  if (sev.kitchenSinkMinutes !== "normal") {
    const msg =
      sev.kitchenSinkMinutes === "high"
        ? t("tip_kitchen_high", { when: timeWord })
        : t("tip_kitchen_above", { when: timeWord });
    add(t("srcKitchenSink").replace(" (minutes)", ""), sev.kitchenSinkMinutes, msg);
  }

  // Bathroom sink
  if (sev.bathroomSinkMinutes !== "normal") {
    const msg =
      sev.bathroomSinkMinutes === "high"
        ? t("tip_bath_high", { when: timeWord })
        : t("tip_bath_above", { when: timeWord });
    add(t("srcBathroomSink").replace(" (minutes)", ""), sev.bathroomSinkMinutes, msg);
  }

  // Toilet
  if (sev.toiletFlushes !== "normal") {
    const msg =
      sev.toiletFlushes === "high"
        ? t("tip_toilet_high", { when: timeWord })
        : t("tip_toilet_above", { when: timeWord });
    add(t("srcToilet").replace(" (count)", ""), sev.toiletFlushes, msg);
  }

  // Washer / Dishwasher
  if (sev.washerCycles !== "normal") {
    const msg =
      sev.washerCycles === "high"
        ? t("tip_washer_high", { when: timeWord })
        : t("tip_washer_above", { when: timeWord });
    add(t("srcWasher").replace(" (cycles)", ""), sev.washerCycles, msg);
  }

  if (sev.dishwasherCycles !== "normal") {
    const msg =
      sev.dishwasherCycles === "high"
        ? t("tip_dish_high", { when: timeWord })
        : t("tip_dish_above", { when: timeWord });
    add(t("srcDishwasher").replace(" (cycles)", ""), sev.dishwasherCycles, msg);
  }

  // Encouraging feedback if nothing is above average
  if (items.length === 0) {
    items.push({
      source: "Overall",
      severity: "normal",
      message: t("advice_niceJob", { when: timeWord }),
    });
  }

  // Summary sentence (extra polish)
  const totalLiters = totalLitersForRange(start, end);
  const totalCost = totalLiters * price;
  let summary = "";
  if (items.length === 1 && items[0].severity === "normal") {
    summary = t("advice_summary_ok", {
      when: timeWord,
      liters: round2(totalLiters),
      cost: formatMoney(totalCost),
    });
  } else if (top1 && top2) {
    summary = t("advice_summary_most", {
      a: top1.label,
      b: top2.label,
      when: timeWord,
      liters: round2(totalLiters),
      cost: formatMoney(totalCost),
    });
  } else {
    summary = t("advice_intro", { when: timeWord });
  }

  return { summary, items };
}

function renderAdviceUI() {
  if (!elAdviceCard || !elAdviceSummary || !elAdviceList) return;

  // Only show advice in Casual mode
  if (sim.settingsMode !== "casual") {
    elAdviceCard.style.display = "none";
    return;
  }
  elAdviceCard.style.display = "block";

  const { summary, items } = adviceMessagesForCurrentView();
  elAdviceSummary.textContent = summary;
  elAdviceList.innerHTML = "";

  for (const a of items) {
    const li = document.createElement("li");
    li.className = `adviceItem adviceItem--${a.severity}`;

    const title = document.createElement("div");
    title.className = "adviceItem__title";
    const sevLabel =
      a.severity === "high" ? t("advice_high") : a.severity === "above" ? t("advice_above") : t("advice_normal");
    title.textContent = `${a.source} — ${sevLabel}`;

    const text = document.createElement("div");
    text.className = "adviceItem__text";
    text.textContent = a.message;

    li.appendChild(title);
    li.appendChild(text);
    elAdviceList.appendChild(li);
  }
}

function updateAllUI() {
  renderDateUI();
  updateSummaryUI();
  updateHudUI();
  updatePerSourceCalcUI();
  renderAdviceUI();
}

// ====== Budget flow ======
function startSession() {
  const raw = Number(elBudgetInput.value);
  const budget = Number.isFinite(raw) ? Math.floor(raw) : 0;
  if (budget <= 0) {
    setSaveStatusKey("msg_invalidBudget");
    return;
  }

  sim.budget = budget;
  sim.started = true;
  waterPhysicsKick(0.8); // little splash to show it’s “alive”

  setSaveStatusKey("msg_sessionStarted", { budget });
  renderHistory();
  updateAllUI();
  saveRecords();
}

function resetSimulation() {
  sim.budget = 0;
  sim.started = false;
  sim.records = {};
  sim.history = [];
  waterSurface.lastBaseY = null;

  elBudgetInput.value = "";
  clearInputs();
  renderHistory();
  updateAllUI();
  saveRecords();
}

// ====== Date UI + record save logic ======
function setMode(mode) {
  sim.mode = mode;
  elTabDay.setAttribute("aria-selected", String(mode === "day"));
  elTabWeek.setAttribute("aria-selected", String(mode === "week"));
  elTabMonth.setAttribute("aria-selected", String(mode === "month"));

  // Show/hide pickers
  document.getElementById("dayPicker").style.display = mode === "day" ? "block" : "none";
  elWeekPicker.style.display = mode === "week" ? "grid" : "none";
  elMonthPicker.style.display = mode === "month" ? "grid" : "none";

  // When switching modes, keep the same selectedDate.
  loadSelectedDateRecordIntoForm();
  updateAllUI();
}

function showAdvancedView(show) {
  // Separate page-like view inside the single page
  if (!elAdvancedView || !elMainSimView) return;
  if (show) {
    elMainSimView.classList.add("sim--hidden");
    elAdvancedView.classList.remove("sim--hidden");
  } else {
    elAdvancedView.classList.add("sim--hidden");
    elMainSimView.classList.remove("sim--hidden");
  }
}

function setSettingsMode(mode) {
  sim.settingsMode = mode;
  elTabCasual.setAttribute("aria-selected", String(mode === "casual"));
  elTabAdvanced.setAttribute("aria-selected", String(mode === "advanced"));
  renderSettingsStatus();
  renderOutputRatesUI();
  updatePerSourceCalcUI();
  updateAllUI();
}

function writeAdvancedFormFromSettings(settings) {
  elAdvShower.value = String(settings.showerLPerMin);
  elAdvBathroomSink.value = String(settings.bathroomSinkLPerMin);
  elAdvKitchenSink.value = String(settings.kitchenSinkLPerMin);
  elAdvToilet.value = String(settings.toiletLPerFlush);
  elAdvWasher.value = String(settings.washerLPerCycle);
  elAdvDishwasher.value = String(settings.dishwasherLPerCycle);
  elAdvPrice.value = String(settings.waterPricePerLiter);
}

function readAdvancedForm() {
  const num = (el, fallback) => {
    const v = Number(el.value);
    if (!Number.isFinite(v) || v <= 0) return fallback;
    return Math.round(v * 100) / 100;
  };
  const price = Number(elAdvPrice.value);
  return {
    showerLPerMin: num(elAdvShower, DEFAULT_FIXTURE_SETTINGS.showerLPerMin),
    bathroomSinkLPerMin: num(elAdvBathroomSink, DEFAULT_FIXTURE_SETTINGS.bathroomSinkLPerMin),
    kitchenSinkLPerMin: num(elAdvKitchenSink, DEFAULT_FIXTURE_SETTINGS.kitchenSinkLPerMin),
    toiletLPerFlush: num(elAdvToilet, DEFAULT_FIXTURE_SETTINGS.toiletLPerFlush),
    washerLPerCycle: num(elAdvWasher, DEFAULT_FIXTURE_SETTINGS.washerLPerCycle),
    dishwasherLPerCycle: num(elAdvDishwasher, DEFAULT_FIXTURE_SETTINGS.dishwasherLPerCycle),
    waterPricePerLiter:
      Number.isFinite(price) && price >= 0 ? Math.round(price * 1000) / 1000 : DEFAULT_FIXTURE_SETTINGS.waterPricePerLiter,
  };
}

function setAdvancedStatus(text) {
  if (!elAdvancedStatus) return;
  elAdvancedStatus.textContent = text;
}

function setAdvancedStatusKey(key, params) {
  setAdvancedStatus(t(key, params));
}

function setSelectedDate(d) {
  sim.selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (elDayInput) elDayInput.value = dateKeyFromDate(sim.selectedDate);
  loadSelectedDateRecordIntoForm();
  updateAllUI();
}

function moveSelection(direction) {
  // direction: -1 (prev) or +1 (next)
  if (sim.mode === "day") {
    setSelectedDate(addDays(sim.selectedDate, direction));
    return;
  }
  if (sim.mode === "week") {
    setSelectedDate(addDays(sim.selectedDate, direction * 7));
    return;
  }
  // month
  setSelectedDate(new Date(sim.selectedDate.getFullYear(), sim.selectedDate.getMonth() + direction, sim.selectedDate.getDate()));
}

function renderWeekPicker() {
  if (!elWeekPicker) return;
  elWeekPicker.innerHTML = "";
  const start = startOfWeek(sim.selectedDate);
  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dayChip";
    btn.setAttribute("aria-selected", String(isSameDay(day, sim.selectedDate)));

    const dow = document.createElement("div");
    dow.className = "dayChip__dow";
    dow.textContent = dows[i];

    const dd = document.createElement("div");
    dd.className = "dayChip__day";
    dd.textContent = String(day.getDate());

    btn.appendChild(dow);
    btn.appendChild(dd);
    btn.addEventListener("click", () => setSelectedDate(day));
    elWeekPicker.appendChild(btn);
  }
}

function renderMonthPicker() {
  if (!elMonthPicker) return;
  elMonthPicker.innerHTML = "";

  const heads = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (const h of heads) {
    const div = document.createElement("div");
    div.className = "calHead";
    div.textContent = h;
    elMonthPicker.appendChild(div);
  }

  const first = monthStart(sim.selectedDate);
  const last = monthEnd(sim.selectedDate);
  const firstMonBased = (first.getDay() + 6) % 7; // 0 for Mon

  // Leading blanks
  for (let i = 0; i < firstMonBased; i++) {
    const blank = document.createElement("div");
    blank.className = "calDay calDay--muted";
    blank.textContent = "";
    elMonthPicker.appendChild(blank);
  }

  for (let day = 1; day <= last.getDate(); day++) {
    const d = new Date(first.getFullYear(), first.getMonth(), day);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calDay";
    btn.textContent = String(day);
    btn.setAttribute("aria-selected", String(isSameDay(d, sim.selectedDate)));
    btn.addEventListener("click", () => setSelectedDate(d));
    elMonthPicker.appendChild(btn);
  }
}

function renderDateUI() {
  if (!elSelectedDateLabel || !elRangeLabel) return;
  elSelectedDateLabel.textContent = formatDateLong(sim.selectedDate);

  const { start, end } = rangeForMode(sim.mode, sim.selectedDate);
  const rangeText =
    sim.mode === "day"
      ? "Single day"
      : `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(
          undefined,
          { month: "short", day: "numeric", year: start.getFullYear() === end.getFullYear() ? undefined : "numeric" }
        )}`;
  elRangeLabel.textContent = sim.mode === "month" ? `${sim.selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : rangeText;

  if (sim.mode === "week") renderWeekPicker();
  if (sim.mode === "month") renderMonthPicker();
}

function loadSelectedDateRecordIntoForm() {
  const key = dateKeyFromDate(sim.selectedDate);
  const rec = sim.records[key] || emptyRecord();
  writeFormRecord(rec);
  updatePerSourceCalcUI();
}

function clearInputs() {
  writeFormRecord(emptyRecord());
  setSaveStatusKey("msg_inputsCleared");
  updatePerSourceCalcUI();
}

function saveForSelectedDate() {
  if (!sim.started) {
    setSaveStatusKey("msg_setBudgetFirst");
    return;
  }

  const key = dateKeyFromDate(sim.selectedDate);
  const current = readFormRecord();
  const prev = sim.records[key] || emptyRecord();

  if (recordEquals(current, prev)) {
    setSaveStatusKey("msg_noChanges");
    return;
  }

  // Compute delta and enforce budget when increasing usage
  const { start, end } = rangeForMode(sim.mode, sim.selectedDate);
  const rangeUsed = totalLitersForRange(start, end);
  const prevLiters = litersForRecord(prev);
  const nextLiters = litersForRecord(current);
  const delta = nextLiters - prevLiters;

  // If this save would increase usage beyond budget, block (but allow decreases).
  if (delta > 0 && rangeUsed + delta > sim.budget) {
    setSaveStatusKey("msg_notSavedExceeds");
    return;
  }

  sim.records[key] = current;
  saveRecords();

  const msgKey = prevLiters === 0 ? "msg_savedForDate" : "msg_updatedForDate";
  const cost = nextLiters * activeFixtureSettings().waterPricePerLiter;
  pushHistory({ when: Date.now(), dateKey: key, messageKey: msgKey, liters: nextLiters, cost });

  // Kick water animation based on how big the change was vs budget
  const pctKick = sim.budget > 0 ? Math.abs(delta) / sim.budget : 0.1;
  waterPhysicsKick(0.6 + pctKick * 8);

  setSaveStatusKey(msgKey);
  updateAllUI();
}

// ====== Water bar liquid physics (surface points + damping) ======
/*
  Tweak-friendly physics knobs:
  - stiffness: returns surface toward the target level
  - damping: how quickly it calms down
  - spread: neighbor coupling ("sloshing")
  - disturbanceStrength: how strong a "kick" is when you log usage

  Visual knobs:
  - tankBg, tankBorder
  - waterColorTop, waterColorBottom
  - surfaceLine, surfaceGlow
  - visualAmplitude
*/
const WATER_PHYS = {
  // Physics
  pointSpacingPx: 12,
  stiffness: 0.028,
  damping: 0.045,
  spread: 0.20,
  disturbanceStrength: 1.0,

  // Visual-only (readability)
  visualAmplitude: 1.5,

  // Colors
  tankBg: "#eef4ff",
  tankBorder: "rgba(10, 12, 18, 0.85)",
  waterColorTop: "#27d5ff",
  waterColorBottom: "#156bff",
  surfaceLine: "rgba(255, 255, 255, 0.95)",
  surfaceGlow: "rgba(120, 220, 255, 0.55)",

  // Low-water visuals
  redZoneLine: "rgba(255, 77, 77, 0.65)",
  redZoneFill: "rgba(255, 77, 77, 0.10)",
};

const waterRender = {
  ctx: /** @type {CanvasRenderingContext2D | null} */ (null),
  dpr: 1,
  w: 0, // logical pixels
  h: 0, // logical pixels
};

const waterSurface = {
  points: /** @type {Array<{ y: number; vy: number }>} */ ([]),
  lastW: 0,
  lastH: 0,
  // Energy decays over time; while > 0 we add small disturbances.
  energy: 0,
  // Track last target height so we can react to level-change speed (realistic slosh)
  lastBaseY: null, // number | null
};

function waterPhysicsKick(strength) {
  // Add "energy" so the surface keeps wobbling for a bit.
  waterSurface.energy = clamp(waterSurface.energy + strength * WATER_PHYS.disturbanceStrength, 0, 12);
}

function resizeWaterCanvasToDisplaySize() {
  if (!elWaterCanvas) return;
  const ctx = elWaterCanvas.getContext("2d");
  if (!ctx) return;
  waterRender.ctx = ctx;

  const rect = elWaterCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const logicalW = Math.max(1, Math.round(rect.width));
  const logicalH = Math.max(1, Math.round(rect.height));
  const pixelW = Math.max(1, Math.round(logicalW * dpr));
  const pixelH = Math.max(1, Math.round(logicalH * dpr));

  const sizeChanged = elWaterCanvas.width !== pixelW || elWaterCanvas.height !== pixelH;
  if (!sizeChanged) return;

  elWaterCanvas.width = pixelW;
  elWaterCanvas.height = pixelH;
  waterRender.dpr = dpr;
  waterRender.w = logicalW;
  waterRender.h = logicalH;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function ensureSurfacePoints() {
  const w = waterRender.w;
  const h = waterRender.h;
  if (w <= 0 || h <= 0) return;

  if (waterSurface.points.length > 0 && waterSurface.lastW === w && waterSurface.lastH === h) return;

  waterSurface.lastW = w;
  waterSurface.lastH = h;
  const count = Math.max(3, Math.floor(w / WATER_PHYS.pointSpacingPx) + 1);
  waterSurface.points = new Array(count).fill(0).map(() => ({ y: 0, vy: 0 }));
}

function disturbSurfaceImpulse(strength, atIndex) {
  const pts = waterSurface.points;
  if (pts.length === 0) return;
  const i = clamp(Math.round(atIndex), 0, pts.length - 1);
  pts[i].vy += strength;
}

function simulateSurface(dt, baseY) {
  const pts = waterSurface.points;
  if (pts.length === 0) return;

  // Initialize points on first run
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].y === 0 && pts[i].vy === 0) pts[i].y = baseY;
  }

  // If we have stored energy, add small random impulses.
  // This represents "liquid inertia" continuing after a change.
  if (waterSurface.energy > 0) {
    const mid = (pts.length - 1) * 0.5;
    const strength = waterSurface.energy * 0.22;
    disturbSurfaceImpulse((Math.random() - 0.5) * strength, mid + (Math.random() - 0.5) * 6);
    disturbSurfaceImpulse((Math.random() - 0.5) * strength * 0.7, mid * 0.35 + (Math.random() - 0.5) * 4);

    // Energy decays => surface settles naturally
    waterSurface.energy = Math.max(0, waterSurface.energy - dt * 2.2);
  }

  const stiffness = WATER_PHYS.stiffness;
  const damping = WATER_PHYS.damping;
  const spread = WATER_PHYS.spread;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dy = baseY - p.y;
    p.vy += dy * stiffness;

    // Damping (scaled for stable feel across fps)
    p.vy *= Math.max(0, 1 - damping * (dt * 60));
    p.y += p.vy * (dt * 60);
  }

  // Neighbor spread (sloshing)
  const leftDeltas = new Array(pts.length).fill(0);
  const rightDeltas = new Array(pts.length).fill(0);
  const passes = 2;

  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < pts.length; i++) {
      if (i > 0) {
        leftDeltas[i] = spread * (pts[i].y - pts[i - 1].y);
        pts[i - 1].vy += leftDeltas[i] * (dt * 60);
      }
      if (i < pts.length - 1) {
        rightDeltas[i] = spread * (pts[i].y - pts[i + 1].y);
        pts[i + 1].vy += rightDeltas[i] * (dt * 60);
      }
    }
  }
}

function drawWater(dtSeconds) {
  const ctx = waterRender.ctx;
  if (!ctx) return;
  const w = waterRender.w;
  const h = waterRender.h;
  if (w <= 0 || h <= 0) return;

  ensureSurfacePoints();

  // If no session, show empty tank
  const level = sim.started ? remainingPctCurrentView() : 0;
  const baseY = (1 - level) * h;

  ctx.clearRect(0, 0, w, h);

  // 1) Tank background + border (clear contrast)
  ctx.save();
  ctx.fillStyle = WATER_PHYS.tankBg;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 2;
  ctx.strokeStyle = WATER_PHYS.tankBorder;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.restore();

  // Red-zone marker (warning threshold)
  if (sim.started) {
    const warnY = (1 - LOW_WATER_WARN_PCT) * h;
    ctx.save();
    ctx.fillStyle = WATER_PHYS.redZoneFill;
    ctx.fillRect(0, warnY, w, h - warnY);
    ctx.strokeStyle = WATER_PHYS.redZoneLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, warnY);
    ctx.lineTo(w, warnY);
    ctx.stroke();
    ctx.restore();
  }

  if (!sim.started || level <= 0) return;

  // Physics reacts to level changes.
  // If the level drops quickly, we inject more energy (stronger slosh).
  const dt = clamp(dtSeconds, 0, 0.05);
  if (waterSurface.lastBaseY == null) {
    waterSurface.lastBaseY = baseY;
  } else {
    const deltaY = baseY - waterSurface.lastBaseY; // + means level went down (target moved down)
    const speedPxPerSec = Math.abs(deltaY) / Math.max(0.001, dt);

    // Convert speed to a normalized "disturbance" amount.
    // Bigger speed => more slosh, then it naturally stabilizes via damping.
    const speedNorm = clamp(speedPxPerSec / 220, 0, 1); // tweak divisor to tune sensitivity

    // Only disturb noticeably when the target is actually moving.
    if (speedNorm > 0.02) {
      waterSurface.energy = clamp(waterSurface.energy + speedNorm * 3.0, 0, 12);

      // Add a directional impulse so it "tilts/sloshes" instead of only rippling.
      // When the water level drops (target moves down), the surface tends to lag (inertia),
      // causing a little overshoot and wobble.
      const mid = (waterSurface.points.length - 1) * 0.5;
      const sign = deltaY >= 0 ? -1 : 1;
      disturbSurfaceImpulse(sign * speedNorm * 0.9, mid);
      disturbSurfaceImpulse(-sign * speedNorm * 0.6, mid * 0.35);
    }

    waterSurface.lastBaseY = baseY;
  }

  simulateSurface(dt, baseY);

  const pts = waterSurface.points;
  const count = pts.length;
  const dx = count <= 1 ? w : w / (count - 1);

  // Visual amplitude (easier to read motion)
  const amp = WATER_PHYS.visualAmplitude;
  function surfaceY(i) {
    const raw = pts[i].y;
    const boosted = baseY + (raw - baseY) * amp;
    return clamp(boosted, 0, h);
  }

  // 2) Water body
  const grad = ctx.createLinearGradient(0, baseY, 0, h);
  grad.addColorStop(0, WATER_PHYS.waterColorTop);
  grad.addColorStop(1, WATER_PHYS.waterColorBottom);

  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, surfaceY(0));
  for (let i = 0; i < count; i++) ctx.lineTo(i * dx, surfaceY(i));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle depth shading
  ctx.save();
  const depth = ctx.createLinearGradient(0, baseY, 0, h);
  depth.addColorStop(0, "rgba(0, 0, 0, 0.00)");
  depth.addColorStop(1, "rgba(0, 0, 0, 0.12)");
  ctx.fillStyle = depth;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.restore();

  // 3) Very visible surface line (glow + bright edge)
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.strokeStyle = WATER_PHYS.surfaceGlow;
  ctx.lineWidth = 7;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const x = i * dx;
    const y = surfaceY(i);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = WATER_PHYS.surfaceLine;
  ctx.lineWidth = 3.5;
  ctx.globalAlpha = 0.98;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const x = i * dx;
    const y = surfaceY(i);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // Glass shine (lightweight)
  ctx.save();
  const shine = ctx.createLinearGradient(0, 0, w * 0.35, 0);
  shine.addColorStop(0, "rgba(255, 255, 255, 0.30)");
  shine.addColorStop(1, "rgba(255, 255, 255, 0.00)");
  ctx.fillStyle = shine;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, 0, w * 0.35, h);
  ctx.restore();
}

// ====== Main loop ======
function loop(nowMs) {
  const dtSeconds = (nowMs - sim.lastFrameMs) / 1000;
  sim.lastFrameMs = nowMs;

  resizeWaterCanvasToDisplaySize();
  drawWater(dtSeconds);

  requestAnimationFrame(loop);
}

// ====== Events ======
elSetBudgetBtn.addEventListener("click", startSession);
elResetBtn.addEventListener("click", resetSimulation);
elClearInputsBtn.addEventListener("click", clearInputs);
elClearInputsBtnHud.addEventListener("click", clearInputs);
elSaveBtn.addEventListener("click", saveForSelectedDate);

elTabDay.addEventListener("click", () => setMode("day"));
elTabWeek.addEventListener("click", () => setMode("week"));
elTabMonth.addEventListener("click", () => setMode("month"));

elDayInput.addEventListener("change", () => {
  if (!elDayInput.value) return;
  setSelectedDate(dateFromKey(elDayInput.value));
});

elPrevBtn.addEventListener("click", () => moveSelection(-1));
elNextBtn.addEventListener("click", () => moveSelection(1));
elTodayBtn.addEventListener("click", () => setSelectedDate(new Date()));

// Convenience: pressing Enter in budget input starts session
elBudgetInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startSession();
});

// ====== Start ======
loadRecords();
loadFixtureSettings();
setTheme(loadTheme());
syncWaterThemeColors();
setLanguage(loadLanguage());
if (sim.started) {
  elBudgetInput.value = String(sim.budget);
}
elDayInput.value = dateKeyFromDate(sim.selectedDate);
setMode("day");
renderOutputRatesUI();
renderSettingsStatus();

// Live updates: as you type, show liters + cost per source
for (const el of [elSrcShower, elSrcKitchen, elSrcBathroom, elSrcToilet, elSrcWasher, elSrcDishwasher]) {
  el.addEventListener("input", updatePerSourceCalcUI);
}

// Mode navigation
elTabCasual.addEventListener("click", () => {
  setSettingsMode("casual");
  showAdvancedView(false);
});
elTabAdvanced.addEventListener("click", () => {
  setSettingsMode("advanced");
  writeAdvancedFormFromSettings(fixtureState.custom || DEFAULT_FIXTURE_SETTINGS);
  setAdvancedStatusKey(fixtureState.custom ? "adv_editingCustom" : "adv_noCustomYet");
  showAdvancedView(true);
});

elBackToSimBtn.addEventListener("click", () => {
  showAdvancedView(false);
});

elSaveAdvancedBtn.addEventListener("click", () => {
  const settings = readAdvancedForm();
  saveFixtureSettings(settings);
  setAdvancedStatusKey("adv_savedCustom");
  renderSettingsStatus();
  renderOutputRatesUI();
  updateAllUI();
});

elResetAdvancedBtn.addEventListener("click", () => {
  clearFixtureSettings();
  writeAdvancedFormFromSettings(DEFAULT_FIXTURE_SETTINGS);
  setAdvancedStatusKey("adv_resetDefaults");
  renderSettingsStatus();
  renderOutputRatesUI();
  updateAllUI();
});

// Settings drawer + theme
elSettingsBtn.addEventListener("click", () => openSettings(true));
elSettingsCloseBtn.addEventListener("click", () => openSettings(false));
elScrim.addEventListener("click", () => openSettings(false));

elThemeLightBtn.addEventListener("click", () => setTheme("light"));
elThemeDarkBtn.addEventListener("click", () => setTheme("dark"));
elLangEnBtn.addEventListener("click", () => setLanguage("en"));
elLangEsBtn.addEventListener("click", () => setLanguage("es"));
elLangFrBtn.addEventListener("click", () => setLanguage("fr"));

renderHistory();
updateAllUI();
resizeWaterCanvasToDisplaySize();
requestAnimationFrame(loop);

