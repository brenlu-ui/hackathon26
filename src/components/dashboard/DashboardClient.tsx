"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WaterPipeFill } from "@/components/shared/WaterPipeFill";
import { APPLIANCES, type ApplianceId } from "@/lib/appliances";

type LogEntry = {
  id: string;
  appliance: string;
  quantity: number;
  litersPerUnit: number;
  estimatedLiters: number;
  occurredAt: string;
  notes?: string | null;
};

const COST_SAVINGS_RATIO = 0.6;
const COST_HIGH_RATIO = 0.9;

function getCostTone(cost: number, baselineCost: number) {
  if (baselineCost <= 0) return { tone: "is-near", label: "Average unavailable" };
  const ratio = cost / baselineCost;
  if (ratio < COST_SAVINGS_RATIO) return { tone: "is-below", label: "Cost-saving range" };
  if (ratio >= COST_HIGH_RATIO) return { tone: "is-above", label: "High-cost range" };
  return { tone: "is-near", label: "Average range" };
}

const APPLIANCE_SUGGESTIONS: Record<
  ApplianceId,
  {
    dailyThresholdLiters: number;
    aboveTip: string;
    highTip: string;
  }
> = {
  shower: {
    dailyThresholdLiters: 90,
    aboveTip: "Try reducing shower time by 1-2 minutes to lower daily usage.",
    highTip: "Shower usage is much higher than typical. Consider shorter showers and a low-flow showerhead.",
  },
  kitchen_faucet: {
    dailyThresholdLiters: 56,
    aboveTip: "Kitchen faucet use is above target. Turn off water while scrubbing dishes or produce.",
    highTip: "Kitchen faucet use is very high. Consider adding an aerator and batching rinsing tasks.",
  },
  toilet: {
    dailyThresholdLiters: 30,
    aboveTip: "Toilet water use is above target. Check for leaks and avoid unnecessary flushes.",
    highTip: "Toilet water use is very high. Inspect for silent leaks and consider a dual-flush upgrade.",
  },
  washing_machine: {
    dailyThresholdLiters: 65,
    aboveTip: "Washer usage is above target. Run full loads when possible.",
    highTip: "Washer usage is very high. Shift to fewer, full loads and use eco cycles.",
  },
  dishwasher: {
    dailyThresholdLiters: 22,
    aboveTip: "Dishwasher use is above target. Run full loads and use eco mode.",
    highTip: "Dishwasher use is much higher than target. Avoid pre-rinsing under running water.",
  },
  garden_hose: {
    dailyThresholdLiters: 60,
    aboveTip: "Outdoor water use is above target. Water plants in cooler hours to reduce waste.",
    highTip: "Outdoor water use is very high. Use drip irrigation or a timed nozzle to cut losses.",
  },
};

const HOUSEHOLD_APPLIANCES = new Set<ApplianceId>(["shower"]);

export function DashboardClient({
  logs,
  children,
  onLogCreated,
  householdSize,
  onHouseholdSizeChange,
}: {
  logs: LogEntry[];
  children?: ReactNode;
  onLogCreated?: (log: LogEntry) => void;
  householdSize: number;
  onHouseholdSizeChange?: (size: number) => void;
}) {
  const [pricePerLiter, setPricePerLiter] = useState(0.0015);
  const [quickAppliance, setQuickAppliance] = useState<ApplianceId>("washing_machine");
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickStatus, setQuickStatus] = useState("");
  const [alertNotice, setAlertNotice] = useState<{ count: number; labels: string[] } | null>(null);
  const alertsSectionRef = useRef<HTMLElement | null>(null);
  const initializedAlertTrackingRef = useRef(false);
  const previousTopLogIdRef = useRef<string | undefined>(undefined);
  const previousAlertKeySetRef = useRef<Set<string>>(new Set());
  const baselineHouseholdSize = 2.6;
  const householdScale = Math.max(householdSize, 1) / baselineHouseholdSize;
  const adjustedBenchmarkLiters = 1135 * householdScale;
  const summary = useMemo(() => {
    const totalLiters = logs.reduce((sum, log) => sum + Number(log.estimatedLiters), 0);
    const uniqueDays = new Set(logs.map((log) => new Date(log.occurredAt).toISOString().slice(0, 10))).size;
    const activeDays = Math.max(uniqueDays, 1);
    const estimatedDailyLiters = totalLiters / activeDays;

    const applianceTotals = APPLIANCES.map((appliance) => {
      const applianceLogs = logs.filter((log) => log.appliance === appliance.id);
      const liters = applianceLogs.reduce((sum, log) => sum + Number(log.estimatedLiters), 0);
      const quantity = applianceLogs.reduce((sum, log) => sum + Number(log.quantity), 0);
      const litersPerUnitTotal = applianceLogs.reduce(
        (sum, log) => sum + Number(log.litersPerUnit),
        0,
      );
      return {
        appliance: appliance.id,
        label: appliance.label,
        liters,
        quantity,
        litersPerUnitTotal,
      };
    });

    const topAppliance =
      [...applianceTotals].sort((a, b) => b.liters - a.liters)[0]?.label ?? "No usage yet";

    return {
      totalLiters,
      estimatedDailyLiters,
      activeDays,
      topAppliance,
      applianceTotals: applianceTotals.filter((item) => item.liters > 0),
    };
  }, [logs]);
  const dailyCost = summary.estimatedDailyLiters * pricePerLiter;
  const weeklyCost = dailyCost * 7;
  const monthlyCost = dailyCost * 30;
  const estimatedCost = summary.totalLiters * pricePerLiter;
  const baselineDailyCost = adjustedBenchmarkLiters * pricePerLiter;
  const baselineWeeklyCost = baselineDailyCost * 7;
  const baselineMonthlyCost = baselineDailyCost * 30;
  const dailyCostTone = getCostTone(dailyCost, baselineDailyCost);
  const weeklyCostTone = getCostTone(weeklyCost, baselineWeeklyCost);
  const monthlyCostTone = getCostTone(monthlyCost, baselineMonthlyCost);
  const quickApplianceMeta = APPLIANCES.find((item) => item.id === quickAppliance) ?? APPLIANCES[0];
  const quickQuantityLabel = quickApplianceMeta.mode === "duration" ? "Minutes" : "Cycles/Events";
  const isHouseholdApplicable = HOUSEHOLD_APPLIANCES.has(quickAppliance);
  const quickEffectiveQuantity = quickQuantity * (isHouseholdApplicable ? Math.max(1, householdSize) : 1);
  const quickEstimateLiters = quickEffectiveQuantity * quickApplianceMeta.defaultLiters;
  const quickQuantityStep = 1;
  const usageSuggestions = useMemo(() => {
    return summary.applianceTotals
      .map((item) => {
        const applianceId = item.appliance as ApplianceId;
        const config = APPLIANCE_SUGGESTIONS[applianceId];
        if (!config || summary.activeDays <= 0) return null;
        const dailyLiters = item.liters / summary.activeDays;
        if (dailyLiters <= config.dailyThresholdLiters) return null;
        const adjustedThreshold = config.dailyThresholdLiters * householdScale;
        if (dailyLiters <= adjustedThreshold) return null;
        const highUsage = dailyLiters > adjustedThreshold * 1.5;
        return {
          appliance: item.label,
          severity: highUsage ? "high" : "above",
          dailyLiters,
          threshold: adjustedThreshold,
          message: highUsage ? config.highTip : config.aboveTip,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => b.dailyLiters - a.dailyLiters);
  }, [householdScale, summary.activeDays, summary.applianceTotals]);
  const suggestionKeys = useMemo(
    () => usageSuggestions.map((item) => `${item.appliance}:${item.severity}`),
    [usageSuggestions],
  );

  function adjustQuickQuantity(direction: -1 | 1) {
    setQuickQuantity((current) => Math.max(1, current + direction * quickQuantityStep));
  }

  function adjustHouseholdSize(direction: -1 | 1) {
    onHouseholdSizeChange?.(Math.max(1, householdSize + direction));
  }

  function adjustPricePerLiter(direction: -1 | 1) {
    const step = 0.0001;
    const next = Math.max(0, Number((pricePerLiter + direction * step).toFixed(4)));
    setPricePerLiter(next);
  }

  function jumpToAlertsSection() {
    alertsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setAlertNotice(null);
  }

  useEffect(() => {
    const currentTopLogId = logs[0]?.id;
    const currentAlertKeySet = new Set(suggestionKeys);

    if (!initializedAlertTrackingRef.current) {
      initializedAlertTrackingRef.current = true;
      previousTopLogIdRef.current = currentTopLogId;
      previousAlertKeySetRef.current = currentAlertKeySet;
      return;
    }

    const previousTopLogId = previousTopLogIdRef.current;
    const entryWasAdded =
      Boolean(previousTopLogId) &&
      Boolean(currentTopLogId) &&
      currentTopLogId !== previousTopLogId &&
      logs.some((log) => log.id === previousTopLogId);

    if (entryWasAdded) {
      const previousAlertKeys = previousAlertKeySetRef.current;
      const newAlertIndexes = suggestionKeys
        .map((key, index) => ({ key, index }))
        .filter((item) => !previousAlertKeys.has(item.key))
        .map((item) => item.index);

      if (newAlertIndexes.length > 0) {
        const labels = newAlertIndexes
          .map((index) => usageSuggestions[index]?.appliance)
          .filter((label): label is string => Boolean(label));
        setAlertNotice({ count: newAlertIndexes.length, labels });
      }
    }

    previousTopLogIdRef.current = currentTopLogId;
    previousAlertKeySetRef.current = currentAlertKeySet;
  }, [logs, suggestionKeys, usageSuggestions]);

  async function submitQuickEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (quickQuantity <= 0 || (isHouseholdApplicable && householdSize <= 0)) {
      setQuickStatus("Enter values greater than zero.");
      return;
    }
    setQuickSaving(true);
    setQuickStatus("Saving...");
    const response = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appliance: quickAppliance,
        quantity: Number(quickEffectiveQuantity),
        litersPerUnit: Number(quickApplianceMeta.defaultLiters),
        occurredAt: new Date().toISOString(),
        notes: isHouseholdApplicable
          ? `Quick entry (${householdSize} people in household)`
          : "Quick entry",
      }),
    });
    if (!response.ok) {
      setQuickStatus("Could not save quick entry.");
      setQuickSaving(false);
      return;
    }
    const { log } = (await response.json()) as { log: LogEntry };
    onLogCreated?.(log);
    setQuickStatus("Saved.");
    setQuickQuantity(1);
    setQuickSaving(false);
  }

  return (
    <div className="grid">
      {alertNotice ? (
        <button type="button" className="ww-alert-toast" onClick={jumpToAlertsSection}>
          {alertNotice.count === 1
            ? `New usage alert: ${alertNotice.labels[0] ?? "source"}`
            : `${alertNotice.count} new usage alerts`}
        </button>
      ) : null}
      <section className="ww-cost-snapshot" aria-label="Estimated water costs">
        <article className="ww-cost-card">
          <p className="ww-cost-label">Daily cost</p>
          <p className={`ww-cost-value ${dailyCostTone.tone}`}>${dailyCost.toFixed(2)}</p>
          <p className={`ww-cost-indicator ${dailyCostTone.tone}`}>{dailyCostTone.label}</p>
        </article>
        <article className="ww-cost-card">
          <p className="ww-cost-label">Weekly cost</p>
          <p className={`ww-cost-value ${weeklyCostTone.tone}`}>${weeklyCost.toFixed(2)}</p>
          <p className={`ww-cost-indicator ${weeklyCostTone.tone}`}>{weeklyCostTone.label}</p>
        </article>
        <article className="ww-cost-card">
          <p className="ww-cost-label">Monthly cost</p>
          <p className={`ww-cost-value ${monthlyCostTone.tone}`}>${monthlyCost.toFixed(2)}</p>
          <p className={`ww-cost-indicator ${monthlyCostTone.tone}`}>{monthlyCostTone.label}</p>
        </article>
      </section>

      <div className="ww-layout">
        <aside className="ww-card ww-flow-section ww-impact-panel ww-step-primary">
          <p className="ww-start-hint">Start here</p>
          <h2>Watch your water flow</h2>
          <WaterPipeFill
            liters={summary.estimatedDailyLiters}
            dailyCostUsd={dailyCost}
            pricePerLiter={pricePerLiter}
            savingsBoundaryRatio={COST_SAVINGS_RATIO}
            highBoundaryRatio={COST_HIGH_RATIO}
            subtitle="The pipe reflects your estimated daily usage based on current logs."
            benchmarkLabel={`typical daily baseline for ${householdSize} people`}
            benchmarkLiters={adjustedBenchmarkLiters}
          />
          <div className="grid" style={{ marginTop: "0.75rem" }}>
            <p className="muted">
              <strong>Top source:</strong> {summary.topAppliance}
            </p>
            <p className="muted">
              <strong>Data window:</strong> {summary.activeDays} day(s) of usage logs
            </p>
          </div>

          <section>
            <h3>Appliance usage totals</h3>
            <div className="grid" style={{ marginTop: "0.6rem" }}>
              {summary.applianceTotals.length === 0 ? (
                <p className="muted">No appliance totals yet.</p>
              ) : (
                summary.applianceTotals.map((item) => (
                  <div
                    key={item.appliance}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "0.35rem 0.65rem",
                      alignItems: "center",
                    }}
                  >
                    <span>{item.label}</span>
                    <strong>{item.liters.toFixed(2)} L</strong>
                    <span className="muted">Total units</span>
                    <span className="muted" style={{ textAlign: "right" }}>
                      {item.quantity.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="ww-rate-settings">
            <h3>Current totals</h3>
            <div className="grid" style={{ marginTop: "0.7rem" }}>
              <p>
                <strong>Total tracked usage:</strong> {summary.totalLiters.toFixed(2)} L
              </p>
              <p>
                <strong>Estimated daily usage:</strong> {summary.estimatedDailyLiters.toFixed(2)} L/day
              </p>
              <p>
                <strong>Estimated total cost from tracked logs:</strong> ${estimatedCost.toFixed(2)}
              </p>
              <p>
                <strong>Projected monthly cost at this rate:</strong> ${monthlyCost.toFixed(2)}
              </p>
            </div>
          </section>
        </aside>

        <div className="ww-main-content">
          <section className="ww-card ww-flow-section">
            <h3>Quick entry</h3>
            <form className="ww-quick-entry" onSubmit={submitQuickEntry} style={{ marginTop: "0.55rem" }}>
              <label>
                Appliance
                <select
                  value={quickAppliance}
                  onChange={(event) => setQuickAppliance(event.target.value as ApplianceId)}
                >
                  {APPLIANCES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {quickQuantityLabel}
                <div className="ww-quick-stepper">
                  <button type="button" className="button button-secondary" onClick={() => adjustQuickQuantity(-1)}>
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    step={quickQuantityStep}
                    value={quickQuantity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setQuickQuantity(Number.isFinite(next) ? Math.max(1, next) : 1);
                    }}
                  />
                  <button type="button" className="button button-secondary" onClick={() => adjustQuickQuantity(1)}>
                    +
                  </button>
                </div>
              </label>
              <p className="muted">
                Estimated addition: <strong>{quickEstimateLiters.toFixed(2)} L</strong>
                {isHouseholdApplicable ? ` (${quickQuantity} x ${householdSize} people)` : ""}
              </p>
              <button type="submit" className="button button-primary" disabled={quickSaving}>
                {quickSaving ? "Saving..." : "Add quick entry"}
              </button>
              <p className="muted">{quickStatus}</p>
            </form>
          </section>

          <section className="ww-card ww-flow-section">
            <h3>Household and water rate settings</h3>
            <label style={{ marginTop: "0.5rem" }}>
              People in household
              <div className="ww-quick-stepper">
                <button type="button" className="button button-secondary" onClick={() => adjustHouseholdSize(-1)}>
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={householdSize}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    onHouseholdSizeChange?.(Number.isFinite(next) ? Math.max(1, Math.round(next)) : 1);
                  }}
                />
                <button type="button" className="button button-secondary" onClick={() => adjustHouseholdSize(1)}>
                  +
                </button>
              </div>
            </label>
            <label style={{ marginTop: "0.55rem" }}>
              Water price (USD per liter)
              <div className="ww-quick-stepper">
                <button type="button" className="button button-secondary" onClick={() => adjustPricePerLiter(-1)}>
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={pricePerLiter}
                  onChange={(event) => setPricePerLiter(Number(event.target.value) || 0)}
                />
                <button type="button" className="button button-secondary" onClick={() => adjustPricePerLiter(1)}>
                  +
                </button>
              </div>
            </label>
            <p className="muted" style={{ marginTop: "0.5rem" }}>
              Household size scales your baseline averages. Water price controls all cost estimates.
            </p>
          </section>

          <section ref={alertsSectionRef} className="ww-card ww-flow-section" id="usage-alerts">
            <h3>Usage alerts and suggestions</h3>
            {usageSuggestions.length === 0 ? (
              <p className="muted" style={{ marginTop: "0.6rem" }}>
                No high-usage alerts right now. Your tracked sources are within typical daily ranges.
              </p>
            ) : (
              <div className="ww-suggestion-list" style={{ marginTop: "0.8rem" }}>
                {usageSuggestions.map((item) => (
                  <article
                    key={item.appliance}
                    className={`ww-suggestion-item ${item.severity === "high" ? "is-high" : "is-above"}`}
                  >
                    <p>
                      <strong>{item.appliance} alert:</strong> {item.dailyLiters.toFixed(1)} L/day tracked (target{" "}
                      {item.threshold.toFixed(1)} L/day)
                    </p>
                    <p className="muted">{item.message}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          {children}
        </div>
      </div>
    </div>
  );
}
