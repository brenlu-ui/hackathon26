import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";
import { listWaterLogs } from "@/lib/logRepository";

export default async function Home() {
  const logs = await listWaterLogs();

  return (
    <div className="grid">
      <section className="panel">
        <h2>Dashboard 📊</h2>
        <p className="muted">View water usage totals and appliance breakdown for your home 🏠💧.</p>
      </section>
      <DashboardWorkspace
        initialLogs={logs.map((log) => ({
          ...log,
          quantity: Number(log.quantity),
          litersPerUnit: Number(log.litersPerUnit),
          estimatedLiters: Number(log.estimatedLiters),
          occurredAt: new Date(log.occurredAt).toISOString(),
        }))}
      />
    </div>
  );
}
