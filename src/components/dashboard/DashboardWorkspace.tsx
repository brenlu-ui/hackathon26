"use client";

import { useState } from "react";
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

  return (
    <>
      <DashboardClient logs={logs} />
      <section id="log-usage" className="panel">
        <h2>Manual Log Entry</h2>
        <p className="muted" style={{ marginTop: "0.3rem", marginBottom: "0.8rem" }}>
          Add, edit, and manage usage entries directly from the dashboard.
        </p>
        <LogUsageForm recentLogs={logs} onLogsChange={setLogs} />
      </section>
    </>
  );
}
