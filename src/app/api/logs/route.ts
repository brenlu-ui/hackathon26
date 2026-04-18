import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applianceIdSet } from "@/lib/appliances";
import { calculateEstimatedLiters } from "@/lib/waterCalculations";
import { createWaterLog, listWaterLogs } from "@/lib/logRepository";

const createLogSchema = z.object({
  appliance: z.string().refine((value) => applianceIdSet.has(value as never), "Invalid appliance"),
  quantity: z.number().positive(),
  litersPerUnit: z.number().positive(),
  occurredAt: z.string().datetime(),
  notes: z.string().max(300).optional(),
});

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const logs = await listWaterLogs(from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  return NextResponse.json({ logs });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const estimatedLiters = calculateEstimatedLiters(
    parsed.data.appliance as never,
    parsed.data.quantity,
    parsed.data.litersPerUnit,
  );

  const log = await createWaterLog({
    appliance: parsed.data.appliance as never,
    quantity: parsed.data.quantity,
    litersPerUnit: parsed.data.litersPerUnit,
    estimatedLiters,
    occurredAt: new Date(parsed.data.occurredAt),
    notes: parsed.data.notes,
  });

  return NextResponse.json({ log }, { status: 201 });
}
