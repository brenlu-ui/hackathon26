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

document.getElementById("analyze-btn").addEventListener("click", analyzeUsage);

function getInputValue(id) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) && value >= 0 ? value : 0;
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
    return;
  }

  const dailyUsage = calculateDailyUsage(values);
  const total = Object.values(dailyUsage).reduce((sum, n) => sum + n, 0);
  const perPerson = total / values.people;

  renderSummary(buildSummaryMarkup(dailyUsage, total, perPerson));
  const recommendations = buildRecommendations(values, dailyUsage, total, perPerson);
  renderRecommendations(recommendations);
  renderImpactPanel(total, perPerson, recommendations);
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
  const entries = Object.entries(dailyUsage)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<li>${labelFor(k)}: <strong>${v.toFixed(1)} gal/day</strong></li>`)
    .join("");

  const benchmark = 82; // typical U.S. indoor per-person estimate
  const benchmarkDelta = perPerson - benchmark;
  const benchmarkText =
    benchmarkDelta > 0
      ? `${benchmarkDelta.toFixed(1)} gal/day above benchmark`
      : `${Math.abs(benchmarkDelta).toFixed(1)} gal/day below benchmark`;

  return `
    <p><strong>Total estimated usage:</strong> ${total.toFixed(1)} gallons/day</p>
    <p><strong>Per person:</strong> ${perPerson.toFixed(1)} gallons/day (${benchmarkText})</p>
    <ul>${entries}</ul>
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
          Est. savings: <strong>${rec.savings.toFixed(1)} gal/day</strong>
        </p>
      </article>
    `)
    .join("");
}

function renderImpactPanel(total, perPerson, recommendations) {
  const meterMax = Math.max(220, Math.ceil(total / 10) * 10);
  const fillPercent = Math.min((total / meterMax) * 100, 100);
  const currentTagLeft = Math.min(Math.max(fillPercent, 8), 94);
  const possibleDailySavings = recommendations.reduce((sum, rec) => sum + rec.savings, 0);
  const monthlyGallonsSaved = possibleDailySavings * 30;
  const monthlyCostSaved = monthlyGallonsSaved * billing.costPerGallon;
  const projectedTotal = Math.max(total - possibleDailySavings, 0);
  const sloshRatio = fillPercent / 100;
  const waveHeight = 10 + sloshRatio * 14;
  const waveSpeed = 1 + sloshRatio * 1.3;

  const usageFill = document.getElementById("usage-fill");
  usageFill.style.width = `${fillPercent.toFixed(1)}%`;
  usageFill.style.setProperty("--wave-height", `${waveHeight.toFixed(1)}px`);
  usageFill.style.setProperty("--wave-speed-multiplier", waveSpeed.toFixed(2));
  document.getElementById("current-usage-tag").style.left = `${currentTagLeft.toFixed(1)}%`;
  document.getElementById("current-usage-tag").textContent = `Current: ${total.toFixed(1)} gal/day`;
  document.getElementById("meter-max-label").textContent = `${meterMax.toFixed(0)} gal/day`;
  document.getElementById("meter-mid-label").textContent = `${(meterMax / 2).toFixed(0)} gal/day`;
  document.getElementById("meter-min-label").textContent = "0 gal/day";

  const impactMetrics = `
    <p><strong>Potential daily savings:</strong> ${possibleDailySavings.toFixed(1)} gal/day</p>
    <p><strong>Projected new usage:</strong> ${projectedTotal.toFixed(1)} gal/day</p>
    <p><strong>Estimated monthly savings:</strong> ${monthlyGallonsSaved.toFixed(0)} gallons | $${monthlyCostSaved.toFixed(2)}</p>
    <p><strong>Per-person usage:</strong> ${perPerson.toFixed(1)} gal/day</p>
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
          <p>Save ${milestone.gallonsPerDay} gal/day (${monthlyWater} gal/month)</p>
          <p>Approx cost impact: $${monthlyCost.toFixed(2)}/month</p>
        </article>
      `;
    })
    .join("");
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
}

analyzeUsage();
