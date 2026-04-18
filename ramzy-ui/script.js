const rates = {
  showerGallonsPerMinute: 2.1,
  flushGallons: 1.6,
  laundryGallonsPerLoad: 20,
  dishwasherGallonsPerLoad: 6,
  outdoorGallonsPerMinute: 5,
  faucetGallonsPerMinute: 2.2
};
const billing = {
  costPerGallon: 0.015
};

const formIds = [
  "people",
  "shower-minutes",
  "flushes",
  "laundry-loads",
  "dishwasher-loads",
  "outdoor-minutes",
  "faucet-minutes"
];
let lastAnalysis = null;
const presetValues = {
  apartment: {
    people: 1,
    "shower-minutes": 7,
    flushes: 8,
    "laundry-loads": 3,
    "dishwasher-loads": 2,
    "outdoor-minutes": 0,
    "faucet-minutes": 4
  },
  family: {
    people: 4,
    "shower-minutes": 9,
    flushes: 28,
    "laundry-loads": 8,
    "dishwasher-loads": 7,
    "outdoor-minutes": 14,
    "faucet-minutes": 10
  },
  efficient: {
    people: 3,
    "shower-minutes": 5,
    flushes: 15,
    "laundry-loads": 4,
    "dishwasher-loads": 4,
    "outdoor-minutes": 5,
    "faucet-minutes": 2
  },
  reset: {
    people: 2,
    "shower-minutes": 8,
    flushes: 18,
    "laundry-loads": 5,
    "dishwasher-loads": 4,
    "outdoor-minutes": 10,
    "faucet-minutes": 6
  }
};
const usageMultipliers = {
  low: 0.85,
  average: 1,
  high: 1.2
};
const themeStorageKey = "waterwise-theme";
const optionalFieldInputIds = {
  dishwasher: "dishwasher-loads",
  outdoor: "outdoor-minutes",
  faucet: "faucet-minutes"
};

initTheme();
setupOptionalFields();

document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
document.getElementById("show-details").addEventListener("change", () => {
  if (lastAnalysis) {
    renderDetailedStats(lastAnalysis.values, lastAnalysis.dailyUsage, lastAnalysis.total, lastAnalysis.perPerson, lastAnalysis.recommendations);
  }
});
document.getElementById("onboarding-apply").addEventListener("click", applyOnboardingEstimate);
document.getElementById("onboarding-skip").addEventListener("click", closeOnboarding);
document.getElementById("reopen-onboarding").addEventListener("click", openOnboarding);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeOnboarding();
  }
});

function initTheme() {
  const storedTheme = localStorage.getItem(themeStorageKey);
  const preferredDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = storedTheme || (preferredDark ? "dark" : "light");
  setTheme(initialTheme);
}

function setTheme(theme) {
  const darkMode = theme === "dark";
  document.body.classList.toggle("dark-mode", darkMode);
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.textContent = darkMode ? "Light mode" : "Dark mode";
  }
}

function toggleTheme() {
  const darkMode = document.body.classList.contains("dark-mode");
  const nextTheme = darkMode ? "light" : "dark";
  setTheme(nextTheme);
  localStorage.setItem(themeStorageKey, nextTheme);
}

document.querySelectorAll(".step-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.target);
    if (!target) return;
    const direction = Number(button.dataset.dir) || 0;
    const stepValue = Number(target.step) || 1;
    const minValue = Number(target.min);
    const current = Number(target.value) || 0;
    const next = current + direction * stepValue;
    target.value = Number.isFinite(minValue) ? Math.max(minValue, next) : next;
    analyzeUsage();
  });
});

document.querySelectorAll(".chip-btn").forEach((button) => {
  if (button.id === "reopen-onboarding") return;
  button.addEventListener("click", () => {
    const preset = presetValues[button.dataset.preset];
    if (!preset) return;
    for (const id of Object.keys(preset)) {
      const input = document.getElementById(id);
      if (input) {
        input.value = preset[id];
      }
    }
    revealOptionalFieldsForValues(preset);
    analyzeUsage();
  });
});

function openOnboarding() {
  document.getElementById("onboarding-modal").classList.remove("hidden");
}

function closeOnboarding() {
  document.getElementById("onboarding-modal").classList.add("hidden");
}

function applyOnboardingEstimate() {
  const people = Math.max(1, Number(document.getElementById("onboarding-people").value) || 1);
  const showerHabit = document.getElementById("onboarding-showers").value;
  const outdoorHabit = document.getElementById("onboarding-outdoor").value;
  const usageLevel = document.getElementById("onboarding-usage").value;

  const showerMinutesMap = { quick: 5.5, average: 8, long: 11 };
  const outdoorMinutesMap = { none: 0, light: 8, frequent: 18 };
  const multiplier = usageMultipliers[usageLevel] || 1;

  const estimate = {
    people,
    "shower-minutes": showerMinutesMap[showerHabit] || 8,
    flushes: people * 5,
    "laundry-loads": Math.max(2, Math.round(people * 1.5)),
    "dishwasher-loads": Math.max(1, Math.round(people * 1.2)),
    "outdoor-minutes": outdoorMinutesMap[outdoorHabit] || 8,
    "faucet-minutes": Math.max(2, Math.round(people * 2.5))
  };

  for (const [id, baseValue] of Object.entries(estimate)) {
    const input = document.getElementById(id);
    if (!input) continue;
    const isPeople = id === "people";
    const adjusted = isPeople ? baseValue : baseValue * multiplier;
    const step = Number(input.step) || 1;
    const rounded = Math.round(adjusted / step) * step;
    input.value = rounded;
  }

  revealOptionalFieldsForValues(estimate);
  closeOnboarding();
  analyzeUsage();
}

function getInputValue(id) {
  const input = document.getElementById(id);
  if (!input) return 0;
  const value = Number(input.value);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function setupOptionalFields() {
  document.querySelectorAll(".add-field-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.dataset.field;
      showOptionalField(field, true);
      analyzeUsage();
    });
  });

  document.querySelectorAll(".remove-field-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.dataset.field;
      hideOptionalField(field, true);
      analyzeUsage();
    });
  });

  updateOptionalFieldButtons();
}

function showOptionalField(field, focusInput = false) {
  const wrapper = document.querySelector(`.optional-field[data-field="${field}"]`);
  if (!wrapper) return;
  wrapper.classList.remove("is-hidden");
  updateOptionalFieldButtons();
  if (focusInput) {
    const inputId = optionalFieldInputIds[field];
    const input = document.getElementById(inputId);
    if (input) input.focus();
  }
}

function hideOptionalField(field, resetValue = false) {
  const wrapper = document.querySelector(`.optional-field[data-field="${field}"]`);
  if (!wrapper) return;
  wrapper.classList.add("is-hidden");
  const inputId = optionalFieldInputIds[field];
  const input = document.getElementById(inputId);
  if (resetValue && input) {
    input.value = 0;
  }
  updateOptionalFieldButtons();
}

function updateOptionalFieldButtons() {
  document.querySelectorAll(".add-field-btn").forEach((button) => {
    const field = button.dataset.field;
    const wrapper = document.querySelector(`.optional-field[data-field="${field}"]`);
    if (!wrapper) return;
    button.style.display = wrapper.classList.contains("is-hidden") ? "inline-flex" : "none";
  });
}

function revealOptionalFieldsForValues(valuesByInputId) {
  for (const [field, inputId] of Object.entries(optionalFieldInputIds)) {
    const value = Number(valuesByInputId[inputId] ?? 0);
    if (value > 0) {
      showOptionalField(field, false);
    } else {
      hideOptionalField(field, false);
    }
  }
}

function analyzeUsage() {
  const values = {
    people: getInputValue("people"),
    showerMinutes: getInputValue("shower-minutes"),
    flushes: getInputValue("flushes"),
    laundryLoadsPerWeek: getInputValue("laundry-loads"),
    dishwasherLoadsPerWeek: getInputValue("dishwasher-loads"),
    outdoorMinutes: getInputValue("outdoor-minutes"),
    faucetMinutes: getInputValue("faucet-minutes")
  };

  if (values.people < 1) {
    renderSummary("<p>Please set household size to at least 1.</p>");
    renderRecommendations([]);
    renderImpactPanel(0, 0, []);
    renderCostSnapshot(0);
    renderDetailedStats(values, {}, 0, 0, []);
    return;
  }

  const dailyUsage = calculateDailyUsage(values);
  const total = Object.values(dailyUsage).reduce((sum, n) => sum + n, 0);
  const perPerson = total / values.people;

  renderSummary(buildSummaryMarkup(dailyUsage, total, perPerson));
  const recommendations = buildRecommendations(values, dailyUsage, total, perPerson);
  renderCostSnapshot(total);
  renderRecommendations(recommendations);
  renderImpactPanel(total, perPerson, recommendations);
  renderDetailedStats(values, dailyUsage, total, perPerson, recommendations);
  lastAnalysis = { values, dailyUsage, total, perPerson, recommendations };
}

function calculateDailyUsage(values) {
  return {
    showers: values.people * values.showerMinutes * rates.showerGallonsPerMinute,
    toilet: values.flushes * rates.flushGallons,
    laundry: (values.laundryLoadsPerWeek / 7) * rates.laundryGallonsPerLoad,
    dishwasher: (values.dishwasherLoadsPerWeek / 7) * rates.dishwasherGallonsPerLoad,
    outdoor: values.outdoorMinutes * rates.outdoorGallonsPerMinute,
    faucets: values.faucetMinutes * rates.faucetGallonsPerMinute
  };
}

function buildSummaryMarkup(dailyUsage, total, perPerson) {
  const benchmark = 82; // typical U.S. indoor per-person estimate
  const benchmarkDelta = perPerson - benchmark;
  const benchmarkText =
    benchmarkDelta > 0
      ? `${benchmarkDelta.toFixed(1)} gal/day above a typical benchmark`
      : `${Math.abs(benchmarkDelta).toFixed(1)} gal/day below a typical benchmark`;
  const topCategory = Object.entries(dailyUsage).sort((a, b) => b[1] - a[1])[0];
  const topCategoryLabel = topCategory ? labelFor(topCategory[0]) : "N/A";
  const topCategoryValue = topCategory ? topCategory[1].toFixed(1) : "0.0";
  const dailyCost = total * billing.costPerGallon;
  const monthlyUsage = total * 30;
  const monthlyCost = monthlyUsage * billing.costPerGallon;
  const yearlyCost = monthlyCost * 12;

  return `
    <p><strong>Estimated water cost:</strong> about $${dailyCost.toFixed(2)} per day.</p>
    <p><strong>At this pace:</strong> around $${monthlyCost.toFixed(2)} per month ($${yearlyCost.toFixed(0)} per year).</p>
    <p><strong>Biggest source:</strong> ${topCategoryLabel} (${topCategoryValue} gal/day).</p>
    <p><strong>Usage context:</strong> ${total.toFixed(1)} gal/day and ${benchmarkText}.</p>
  `;
}

function buildRecommendations(values, dailyUsage, total, perPerson) {
  const recs = [];

  const showerSavings = values.people * Math.max(values.showerMinutes - 5, 0) * rates.showerGallonsPerMinute;
  if (showerSavings > 0.5) {
    recs.push(makeRec("Shorten showers to ~5 minutes",
      "Behavioral",
      "High",
      showerSavings,
      "Use a 5-minute timer and pause water while soaping."
    ));
  }

  const faucetSavings = Math.min(values.faucetMinutes, 5) * rates.faucetGallonsPerMinute;
  if (faucetSavings > 0.5) {
    recs.push(makeRec("Turn off tap while brushing/soaping",
      "Behavioral",
      "Very high",
      faucetSavings,
      "A zero-cost habit with immediate water savings."
    ));
  }

  const outdoorSavings = values.outdoorMinutes * rates.outdoorGallonsPerMinute * 0.4;
  if (dailyUsage.outdoor > 10) {
    recs.push(makeRec("Shift outdoor watering to dawn/dusk + drip irrigation",
      "Low-cost equipment",
      "Medium",
      outdoorSavings,
      "Reduces evaporation losses while keeping plant health stable."
    ));
  }

  if (values.laundryLoadsPerWeek > 2) {
    const laundrySavings = (values.laundryLoadsPerWeek / 7) * rates.laundryGallonsPerLoad * 0.25;
    recs.push(makeRec("Run laundry only with full loads",
      "Behavioral",
      "Very high",
      laundrySavings,
      "Cut cycles by consolidating loads across the week."
    ));
  }

  if (values.dishwasherLoadsPerWeek > 0) {
    const dishSavings = (values.dishwasherLoadsPerWeek / 7) * rates.dishwasherGallonsPerLoad * 0.2;
    recs.push(makeRec("Skip pre-rinsing dishes",
      "Behavioral",
      "High",
      dishSavings,
      "Scrape food instead of rinsing under running water."
    ));
  }

  if (perPerson > 82) {
    recs.push(makeRec("Install WaterSense showerheads/aerators",
      "One-time retrofit",
      "Medium",
      total * 0.08,
      "Low-cost upgrades that reduce flow without major comfort loss."
    ));
  }

  if (recs.length === 0) {
    recs.push(makeRec("Maintain current habits and monitor monthly",
      "Maintenance",
      "High",
      total * 0.03,
      "Your profile is already efficient; regular tracking prevents rebound usage."
    ));
  }

  return recs.sort((a, b) => b.score - a.score).slice(0, 6);
}

function makeRec(title, type, feasibility, savings, details) {
  const feasibilityWeight = {
    "Very high": 1.25,
    "High": 1.1,
    "Medium": 1.0,
    "Low": 0.8
  }[feasibility] || 1;

  return {
    title,
    type,
    feasibility,
    savings,
    details,
    score: savings * feasibilityWeight
  };
}

function renderSummary(markup) {
  document.getElementById("summary").innerHTML = markup;
}

function renderCostSnapshot(totalGallonsPerDay) {
  const daily = totalGallonsPerDay * billing.costPerGallon;
  const weekly = daily * 7;
  const monthly = daily * 30;

  document.getElementById("cost-daily").textContent = `$${daily.toFixed(2)}`;
  document.getElementById("cost-weekly").textContent = `$${weekly.toFixed(2)}`;
  document.getElementById("cost-monthly").textContent = `$${monthly.toFixed(2)}`;
}

function renderRecommendations(recommendations) {
  const container = document.getElementById("recommendations");
  if (recommendations.length === 0) {
    container.innerHTML = "<p>No recommendation data available.</p>";
    return;
  }

  container.innerHTML = recommendations
    .map((rec) => `
      <article class="rec-item">
        <h3>${rec.title}</h3>
        <p>${rec.details}</p>
        <p class="meta">
          Feasibility: <strong>${rec.feasibility}</strong> |
          Type: <strong>${rec.type}</strong> |
          Est. savings: <strong>$${(rec.savings * billing.costPerGallon * 30).toFixed(2)}/month</strong> (${rec.savings.toFixed(1)} gal/day)
        </p>
      </article>
    `)
    .join("");
}

function renderImpactPanel(total, perPerson, recommendations) {
  const meterMax = Math.max(220, Math.ceil(total / 10) * 10);
  const fillPercent = Math.min((total / meterMax) * 100, 100);
  const currentTagLeft = Math.min(Math.max(fillPercent, 6), 96);
  const possibleDailySavings = recommendations.reduce((sum, rec) => sum + rec.savings, 0);
  const monthlyGallonsSaved = possibleDailySavings * 30;
  const monthlyCostSaved = monthlyGallonsSaved * billing.costPerGallon;
  const projectedTotal = Math.max(total - possibleDailySavings, 0);
  const sloshRatio = fillPercent / 100;
  const waveHeight = 13 + sloshRatio * 20;
  const waveSpeed = 0.85 + sloshRatio * 1.2;
  const waveBob = 2 + sloshRatio * 5.2;

  const usageFill = document.getElementById("usage-fill");
  usageFill.style.width = `${fillPercent.toFixed(1)}%`;
  usageFill.style.setProperty("--wave-height", `${waveHeight.toFixed(1)}px`);
  usageFill.style.setProperty("--wave-speed-multiplier", waveSpeed.toFixed(2));
  usageFill.style.setProperty("--wave-bob", `${waveBob.toFixed(2)}px`);
  document.getElementById("current-usage-tag").style.left = `${currentTagLeft.toFixed(1)}%`;
  document.getElementById("current-usage-tag").textContent = `Now: $${(total * billing.costPerGallon).toFixed(2)}/day`;
  document.getElementById("meter-max-label").textContent = `${meterMax.toFixed(0)} gal/day`;
  document.getElementById("meter-mid-label").textContent = `${(meterMax / 2).toFixed(0)} gal/day`;
  document.getElementById("meter-min-label").textContent = "0 gal/day";

  const impactMetrics = `
    <p><strong>You could save:</strong> about $${monthlyCostSaved.toFixed(2)} per month</p>
    <p><strong>Estimated daily water cost after changes:</strong> $${(projectedTotal * billing.costPerGallon).toFixed(2)}/day</p>
    <p><strong>Water context:</strong> ${possibleDailySavings.toFixed(1)} gal/day saved (${monthlyGallonsSaved.toFixed(0)} gal/month)</p>
  `;
  document.getElementById("impact-metrics").innerHTML = impactMetrics;

  const milestoneData = [
    { name: "Starter", gallonsPerDay: 10 },
    { name: "Steady Saver", gallonsPerDay: 25 },
    { name: "Water Champion", gallonsPerDay: 40 }
  ];

  document.getElementById("milestones").innerHTML = milestoneData
    .map((milestone) => {
      const achieved = possibleDailySavings >= milestone.gallonsPerDay;
      const monthlyWater = milestone.gallonsPerDay * 30;
      const monthlyCost = monthlyWater * billing.costPerGallon;
      return `
        <article class="milestone ${achieved ? "achieved" : ""}">
          <h3>${achieved ? "Unlocked" : "Target"}: ${milestone.name}</h3>
          <p>Save about $${monthlyCost.toFixed(2)}/month</p>
          <p>Water reduced: ${milestone.gallonsPerDay} gal/day (${monthlyWater} gal/month)</p>
        </article>
      `;
    })
    .join("");
}

function renderDetailedStats(values, dailyUsage, total, perPerson, recommendations) {
  const detailsContainer = document.getElementById("detailed-stats");
  const detailsEnabled = document.getElementById("show-details").checked;
  if (!detailsEnabled) {
    detailsContainer.innerHTML = "";
    return;
  }

  const recommendationSavings = recommendations.reduce((sum, rec) => sum + rec.savings, 0);
  const annualSavingsGallons = recommendationSavings * 365;
  const annualSavingsCost = annualSavingsGallons * billing.costPerGallon;
  const breakdown = Object.keys(dailyUsage).length
    ? Object.entries(dailyUsage)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => `<p>${labelFor(key)}: ${value.toFixed(1)} gal/day</p>`)
      .join("")
    : "<p>No detailed usage data available.</p>";

  detailsContainer.innerHTML = `
    <p><strong>Detailed stats</strong></p>
    <p>Household size: ${values.people || 0}</p>
    <p>Per-person daily use: ${perPerson.toFixed(1)} gal/day</p>
    <p>Possible annual savings: ${annualSavingsGallons.toFixed(0)} gal/year ($${annualSavingsCost.toFixed(2)}/year)</p>
    ${breakdown}
    <p>Assumed water rate: $${billing.costPerGallon.toFixed(3)} per gallon</p>
  `;
}

function labelFor(key) {
  const labels = {
    showers: "Showers",
    toilet: "Toilet",
    laundry: "Laundry",
    dishwasher: "Dishwasher",
    outdoor: "Outdoor watering",
    faucets: "Faucets"
  };
  return labels[key] || key;
}

for (const id of formIds) {
  document.getElementById(id).addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      analyzeUsage();
    }
  });
  document.getElementById(id).addEventListener("input", analyzeUsage);
}

analyzeUsage();
