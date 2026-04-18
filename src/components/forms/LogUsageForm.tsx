"use client";

import { useMemo, useState } from "react";
import { APPLIANCES, type ApplianceId } from "@/lib/appliances";

const durationLabels: ApplianceId[] = ["shower", "kitchen_faucet", "garden_hose"];

type LogEntry = {
  id: string;
  appliance: string;
  quantity: number;
  litersPerUnit: number;
  estimatedLiters: number;
  occurredAt: string;
  notes?: string | null;
};

export function LogUsageForm({
  recentLogs,
  onLogsChange,
}: {
  recentLogs: LogEntry[];
  onLogsChange?: (logs: LogEntry[]) => void;
}) {
  const [appliance, setAppliance] = useState<ApplianceId>("washing_machine");
  const [quantity, setQuantity] = useState(1);
  const [litersPerUnit, setLitersPerUnit] = useState(65);
  const [occurredAt, setOccurredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [localLogs, setLocalLogs] = useState(recentLogs);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editLitersPerUnit, setEditLitersPerUnit] = useState(1);
  const [editNotes, setEditNotes] = useState("");
  const displayedLogs = onLogsChange ? recentLogs : localLogs;

  function updateLogs(next: LogEntry[] | ((current: LogEntry[]) => LogEntry[])) {
    if (onLogsChange) {
      const resolved = typeof next === "function" ? next(recentLogs) : next;
      onLogsChange?.(resolved);
      return;
    }
    setLocalLogs((current) => (typeof next === "function" ? next(current) : next));
  }

  const quantityLabel = useMemo(
    () => (durationLabels.includes(appliance) ? "Minutes" : "Cycles/Events"),
    [appliance],
  );

  const stableDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }),
    [],
  );
  function onApplianceChange(next: ApplianceId) {
    setAppliance(next);
    const selected = APPLIANCES.find((item) => item.id === next);
    if (selected) {
      setLitersPerUnit(selected.defaultLiters);
      setQuantity(1);
    }
  }

  async function submitLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (quantity <= 0 || litersPerUnit <= 0) {
      setStatus("Quantity and liters per unit must be greater than zero.");
      return;
    }
    setIsSaving(true);
    setStatus("Saving...");

    const response = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appliance,
        quantity: Number(quantity),
        litersPerUnit: Number(litersPerUnit),
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
        notes: notes || undefined,
      }),
    });

    if (!response.ok) {
      setStatus("Could not save log.");
      setIsSaving(false);
      return;
    }

    const { log } = (await response.json()) as { log: LogEntry };
    updateLogs((current) => [log, ...current].slice(0, 10));
    setNotes("");
    setStatus("Saved.");
    setIsSaving(false);
  }

  async function removeLog(id: string) {
    const response = await fetch(`/api/logs/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setStatus("Delete failed.");
      return;
    }
    updateLogs((current) => current.filter((item) => item.id !== id));
    setStatus("Log deleted.");
  }

  function beginEdit(log: LogEntry) {
    setEditingLogId(log.id);
    setEditQuantity(Number(log.quantity));
    setEditLitersPerUnit(Number(log.litersPerUnit));
    setEditNotes(log.notes ?? "");
  }

  function cancelEdit() {
    setEditingLogId(null);
  }

  async function saveEdit(log: LogEntry) {
    if (editQuantity <= 0 || editLitersPerUnit <= 0) {
      setStatus("Edited values must be greater than zero.");
      return;
    }
    const response = await fetch(`/api/logs/${log.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appliance: log.appliance,
        quantity: Number(editQuantity),
        litersPerUnit: Number(editLitersPerUnit),
        occurredAt: new Date(log.occurredAt).toISOString(),
        notes: editNotes || undefined,
      }),
    });
    if (!response.ok) {
      setStatus("Update failed.");
      return;
    }
    const payload = (await response.json()) as { log: LogEntry };
    updateLogs((current) => current.map((item) => (item.id === log.id ? payload.log : item)));
    setStatus("Log updated.");
    setEditingLogId(null);
  }

  return (
    <div className="grid two-column">
      <section className="ww-card ww-flow-section">
        <h2>Log water usage</h2>
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Enter manual usage by appliance.
        </p>
        <form onSubmit={submitLog} className="grid">
          <label>
            Appliance
            <select value={appliance} onChange={(event) => onApplianceChange(event.target.value as ApplianceId)}>
              {APPLIANCES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {quantityLabel}
            <input
              type="number"
              min={1}
              step="0.1"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              required
            />
          </label>
          <label>
            Liters per unit
            <input
              type="number"
              min={0.1}
              step="0.1"
              value={litersPerUnit}
              onChange={(event) => setLitersPerUnit(Number(event.target.value))}
              required
            />
          </label>
          <p className="muted">Estimated: {(quantity * litersPerUnit).toFixed(2)} L</p>
          <label>
            Timestamp
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </label>
          <label>
            Notes
            <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <button className="button button-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save log"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          {status}
        </p>
      </section>

      <section className="ww-card">
        <h3>Recent logs</h3>
        <div className="grid" style={{ marginTop: "1rem" }}>
          {displayedLogs.length === 0 ? (
            <p className="muted">No logs yet.</p>
          ) : (
            displayedLogs.map((log) => (
              <article key={log.id} className="ww-card" style={{ padding: "0.75rem" }}>
                <p>
                  <strong>{log.appliance.replaceAll("_", " ")}</strong> - {Number(log.estimatedLiters).toFixed(2)} L
                </p>
                <p className="muted">{stableDateFormatter.format(new Date(log.occurredAt))} UTC</p>
                {editingLogId === log.id ? (
                  <div className="grid" style={{ marginTop: "0.5rem" }}>
                    <label>
                      Quantity
                      <input
                        type="number"
                        min={0.1}
                        step="0.1"
                        value={editQuantity}
                        onChange={(event) => setEditQuantity(Number(event.target.value))}
                      />
                    </label>
                    <label>
                      Liters per unit
                      <input
                        type="number"
                        min={0.1}
                        step="0.1"
                        value={editLitersPerUnit}
                        onChange={(event) => setEditLitersPerUnit(Number(event.target.value))}
                      />
                    </label>
                    <label>
                      Notes
                      <textarea rows={2} value={editNotes} onChange={(event) => setEditNotes(event.target.value)} />
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="button" className="button button-primary" onClick={() => saveEdit(log)}>
                        Save
                      </button>
                      <button type="button" className="button button-secondary" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => beginEdit(log)}
                    style={{ marginTop: "0.5rem", marginRight: "0.5rem" }}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => removeLog(log.id)}
                  style={{ marginTop: "0.5rem" }}
                >
                  Delete
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
