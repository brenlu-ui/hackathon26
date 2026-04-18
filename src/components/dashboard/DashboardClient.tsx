"use client";

import { useMemo, useState } from "react";
import { WaterPipeFill } from "@/components/shared/WaterPipeFill";
import { APPLIANCES } from "@/lib/appliances";

type LogEntry = {
  id: string;
  appliance: string;
  quantity: number;
  litersPerUnit: number;
  estimatedLiters: number;
  occurredAt: string;
  notes?: string | null;
};

export function DashboardClient({ logs }: { logs: LogEntry[] }) {
  const [pricePerLiter, setPricePerLiter] = useState(0.0015);
  const summary = useMemo(() => {
    const totalLiters = logs.reduce((sum, log) => sum + Number(log.estimatedLiters), 0);

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
      topAppliance,
      applianceTotals: applianceTotals.filter((item) => item.liters > 0),
    };
  }, [logs]);
  const estimatedCost = summary.totalLiters * pricePerLiter;

  return (
    <div className="grid">
      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <article className="panel">
          <p className="muted">Total Water Usage 💧</p>
          <h2>{summary.totalLiters.toFixed(2)} L</h2>
        </article>
        <article className="panel">
          <p className="muted">Price Per Liter 💵</p>
          <h2>${pricePerLiter.toFixed(4)}</h2>
        </article>
        <article className="panel">
          <p className="muted">Estimated Water Cost 🧾</p>
          <h2>${estimatedCost.toFixed(2)}</h2>
        </article>
        <article className="panel">
          <p className="muted">Top Appliance 🏆</p>
          <h2 style={{ fontSize: "1rem" }}>{summary.topAppliance}</h2>
        </article>
      </section>

      <section className="panel">
        <h3>Cost Calculator 🧮</h3>
        <label style={{ marginTop: "0.6rem" }}>
          Price per liter (USD)
          <input
            type="number"
            min={0}
            step="0.0001"
            value={pricePerLiter}
            onChange={(event) => setPricePerLiter(Number(event.target.value) || 0)}
          />
        </label>
        <p className="muted" style={{ marginTop: "0.6rem" }}>
          Total cost = total liters x price per liter
        </p>
      </section>

      <section className="panel">
        <h3>Predicted Water Usage Pipe 🚰</h3>
        <WaterPipeFill
          liters={summary.totalLiters}
          subtitle="Predicted usage is calculated from all log entries (quantity x liters per unit)."
          benchmarkLabel="U.S. household daily average"
          benchmarkLiters={1135}
        />
      </section>

      <section className="panel">
        <h3>Appliance Usage Totals 🧺🍽️🚿</h3>
        <div className="grid" style={{ marginTop: "0.8rem" }}>
          {summary.applianceTotals.length === 0 ? (
            <p className="muted">No appliance totals yet 📭.</p>
          ) : (
            summary.applianceTotals.map((item) => (
              <div
                key={item.appliance}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "0.4rem 0.75rem",
                  alignItems: "center",
                }}
              >
                <span>🔹 {item.label}</span>
                <strong>{item.liters.toFixed(2)} L</strong>
                <span className="muted">Total units</span>
                <span className="muted" style={{ textAlign: "right" }}>
                  {item.quantity.toFixed(2)}
                </span>
                <span className="muted">Liters/unit sum</span>
                <span className="muted" style={{ textAlign: "right" }}>
                  {item.litersPerUnitTotal.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
