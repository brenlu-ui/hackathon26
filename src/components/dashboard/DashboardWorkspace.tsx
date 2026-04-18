"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { LogUsageForm } from "@/components/forms/LogUsageForm";

type LogEntry = {
  id: string;
  appliance: string;
  quantity: number;
  litersPerUnit: number;
  estimatedLiters: number;
  occurredAt: string;
  notes?: string | null;
};

export function DashboardWorkspace({ initialLogs }: { initialLogs: LogEntry[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [householdSize, setHouseholdSize] = useState(() => {
    if (typeof window === "undefined") return 1;
    const storedSize = window.localStorage.getItem("waterwise-household-size");
    const parsed = Number(storedSize);
    return storedSize && Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
  });
  const [showHouseholdPrompt, setShowHouseholdPrompt] = useState(() => {
    if (typeof window === "undefined") return false;
    const storedSize = window.localStorage.getItem("waterwise-household-size");
    const parsed = Number(storedSize);
    return !(storedSize && Number.isFinite(parsed) && parsed > 0);
  });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const storedTheme = window.localStorage.getItem("waterwise-theme");
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return storedTheme ? storedTheme === "dark" : preferredDark;
  });

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  function toggleTheme() {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    document.body.classList.toggle("dark-mode", nextDarkMode);
    window.localStorage.setItem("waterwise-theme", nextDarkMode ? "dark" : "light");
  }

  function updateHouseholdSize(nextSize: number) {
    const safe = Math.max(1, Math.round(nextSize));
    setHouseholdSize(safe);
    window.localStorage.setItem("waterwise-household-size", String(safe));
  }

  function submitHouseholdPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateHouseholdSize(householdSize);
    setShowHouseholdPrompt(false);
  }

  return (
    <div className="ww-app">
      {showHouseholdPrompt ? (
        <div className="ww-modal-backdrop" role="presentation">
          <div className="ww-modal-card" role="dialog" aria-modal="true" aria-labelledby="household-size-title">
            <h2 id="household-size-title">Set household size</h2>
            <p className="muted" style={{ marginTop: "0.45rem" }}>
              This helps personalize average water usage ranges and benchmark cost comparisons.
            </p>
            <form onSubmit={submitHouseholdPrompt} className="grid" style={{ marginTop: "0.8rem" }}>
              <label>
                Number of people in household
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={householdSize}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setHouseholdSize(Number.isFinite(next) ? Math.max(1, Math.round(next)) : 1);
                  }}
                />
              </label>
              <button type="submit" className="button button-primary">
                Save and continue
              </button>
            </form>
          </div>
        </div>
      ) : null}
      <header className="ww-hero">
        <div className="ww-hero-top">
          <h1>WaterWise Tracker</h1>
          <button type="button" className="ww-theme-toggle" onClick={toggleTheme}>
            <span>Switch theme</span>
          </button>
        </div>
        <p>Track your household usage, understand cost impact, and spot practical savings quickly.</p>
      </header>
      <DashboardClient
        logs={logs}
        onLogCreated={(log) => setLogs((current) => [log, ...current])}
        householdSize={householdSize}
        onHouseholdSizeChange={updateHouseholdSize}
      >
        <section id="log-usage" className="ww-card ww-flow-section">
          <details className="ww-manual-dropdown">
            <summary className="ww-manual-summary">
              <span>Manual log entry (optional)</span>
            </summary>
            <p className="muted" style={{ marginTop: "0.3rem", marginBottom: "0.8rem" }}>
              Add, edit, and manage usage entries directly from your dashboard.
            </p>
            <LogUsageForm recentLogs={logs} onLogsChange={setLogs} />
          </details>
        </section>
      </DashboardClient>
    </div>
  );
}
