import { DashboardWorkspace } from "@/components/dashboard/DashboardWorkspace";
import { listWaterLogs } from "@/lib/logRepository";

export default async function Home() {
  const logs = await listWaterLogs();

  return (
    <DashboardWorkspace
      initialLogs={logs.map((log) => ({
        ...log,
        quantity: Number(log.quantity),
        litersPerUnit: Number(log.litersPerUnit),
        estimatedLiters: Number(log.estimatedLiters),
        occurredAt: new Date(log.occurredAt).toISOString(),
      }))}
    />
  );
}
