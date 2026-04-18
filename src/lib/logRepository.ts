import { addDays, format, startOfDay } from "date-fns";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ApplianceId } from "@/lib/appliances";
import { APPLIANCES } from "@/lib/appliances";
import { prisma } from "@/lib/db";

export type WaterLogInput = {
  appliance: ApplianceId;
  quantity: number;
  litersPerUnit: number;
  estimatedLiters: number;
  occurredAt: Date;
  notes?: string;
};

type PersistedLog = {
  id: string;
  appliance: ApplianceId;
  quantity: number;
  litersPerUnit: number;
  estimatedLiters: number;
  occurredAt: string;
  notes?: string;
};

const localStorePath = path.join(process.cwd(), ".data", "water-logs.json");
const shouldUsePrisma = Boolean(process.env.DATABASE_URL);

async function ensureLocalStore() {
  await fs.mkdir(path.dirname(localStorePath), { recursive: true });
  try {
    await fs.access(localStorePath);
  } catch {
    await fs.writeFile(localStorePath, JSON.stringify([]), "utf8");
  }
}

async function readLocalLogs() {
  await ensureLocalStore();
  const raw = await fs.readFile(localStorePath, "utf8");
  return JSON.parse(raw) as PersistedLog[];
}

async function writeLocalLogs(logs: PersistedLog[]) {
  await ensureLocalStore();
  await fs.writeFile(localStorePath, JSON.stringify(logs, null, 2), "utf8");
}

export async function createWaterLog(input: WaterLogInput) {
  if (!shouldUsePrisma) {
    const logs = await readLocalLogs();
    const log: PersistedLog = {
      id: randomUUID(),
      appliance: input.appliance,
      quantity: input.quantity,
      litersPerUnit: input.litersPerUnit,
      estimatedLiters: input.estimatedLiters,
      occurredAt: input.occurredAt.toISOString(),
      notes: input.notes,
    };
    logs.unshift(log);
    await writeLocalLogs(logs);
    return {
      ...log,
      occurredAt: new Date(log.occurredAt),
    };
  }

  return prisma.waterLog.create({
    data: {
      appliance: input.appliance,
      quantity: input.quantity,
      litersPerUnit: input.litersPerUnit,
      estimatedLiters: input.estimatedLiters,
      occurredAt: input.occurredAt,
      notes: input.notes,
    },
  });
}

export async function listWaterLogs(from?: Date, to?: Date) {
  if (!shouldUsePrisma) {
    const logs = (await readLocalLogs()).map((log) => ({
      ...log,
      occurredAt: new Date(log.occurredAt),
    }));
    return logs.filter((log) => {
      const timestamp = new Date(log.occurredAt);
      if (from && timestamp < from) return false;
      if (to && timestamp > to) return false;
      return true;
    });
  }

  return prisma.waterLog.findMany({
    where: {
      occurredAt:
        from || to
          ? {
              gte: from,
              lte: to,
            }
          : undefined,
    },
    orderBy: { occurredAt: "desc" },
  });
}

export async function updateWaterLog(id: string, input: Partial<WaterLogInput>) {
  if (!shouldUsePrisma) {
    const logs = await readLocalLogs();
    const index = logs.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("Log not found.");
    }
    const previous = logs[index];
    const updated: PersistedLog = {
      ...previous,
      appliance: input.appliance ?? previous.appliance,
      quantity: input.quantity ?? previous.quantity,
      litersPerUnit: input.litersPerUnit ?? previous.litersPerUnit,
      estimatedLiters: input.estimatedLiters ?? previous.estimatedLiters,
      occurredAt: input.occurredAt?.toISOString() ?? previous.occurredAt,
      notes: input.notes ?? previous.notes,
    };
    logs[index] = updated;
    await writeLocalLogs(logs);
    return {
      ...updated,
      occurredAt: new Date(updated.occurredAt),
    };
  }

  return prisma.waterLog.update({
    where: { id },
    data: input,
  });
}

export async function deleteWaterLog(id: string) {
  if (!shouldUsePrisma) {
    const logs = await readLocalLogs();
    await writeLocalLogs(logs.filter((item) => item.id !== id));
    return;
  }

  return prisma.waterLog.delete({
    where: { id },
  });
}

export async function getDashboardStats(days: number, from?: Date, to?: Date) {
  const now = new Date();
  const start = from ? startOfDay(from) : startOfDay(addDays(now, -(days - 1)));
  const end = to ?? now;
  const logs = await listWaterLogs(start, end);

  const totalLiters = logs.reduce((sum, log) => sum + Number(log.estimatedLiters), 0);
  const todayStart = startOfDay(now);
  const todayLiters = logs
    .filter((log) => new Date(log.occurredAt) >= todayStart)
    .reduce((sum, log) => sum + Number(log.estimatedLiters), 0);
  const windowDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const sevenDayAverage = totalLiters / windowDays;

  const applianceTotals = APPLIANCES.map((appliance) => {
    const liters = logs
      .filter((log) => log.appliance === appliance.id)
      .reduce((sum, log) => sum + Number(log.estimatedLiters), 0);
    return { appliance: appliance.id, label: appliance.label, liters: Number(liters.toFixed(2)) };
  });

  const topAppliance =
    applianceTotals.sort((a, b) => b.liters - a.liters)[0]?.label ?? "No usage yet";

  const dailyMap = new Map<string, number>();
  for (let index = 0; index < windowDays; index += 1) {
    const day = addDays(start, index);
    dailyMap.set(format(day, "yyyy-MM-dd"), 0);
  }
  logs.forEach((log) => {
    const dayKey = format(new Date(log.occurredAt), "yyyy-MM-dd");
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + Number(log.estimatedLiters));
  });

  const dailySeries = Array.from(dailyMap.entries()).map(([date, liters]) => ({
    date,
    liters: Number(liters.toFixed(2)),
  }));

  return {
    totalLiters: Number(totalLiters.toFixed(2)),
    todayLiters: Number(todayLiters.toFixed(2)),
    sevenDayAverage: Number(sevenDayAverage.toFixed(2)),
    topAppliance,
    applianceTotals,
    dailySeries,
    recentLogs: logs.slice(0, 10),
  };
}
