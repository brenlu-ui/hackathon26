import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applianceIdSet } from "@/lib/appliances";
import { calculateEstimatedLiters } from "@/lib/waterCalculations";
import { deleteWaterLog, updateWaterLog } from "@/lib/logRepository";

const updateLogSchema = z.object({
  appliance: z
    .string()
    .refine((value) => applianceIdSet.has(value as never), "Invalid appliance")
    .optional(),
  quantity: z.number().positive().optional(),
  litersPerUnit: z.number().positive().optional(),
  occurredAt: z.string().datetime().optional(),
  notes: z.string().max(300).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const maybeEstimatedLiters =
    data.appliance && data.quantity && data.litersPerUnit
      ? calculateEstimatedLiters(data.appliance as never, data.quantity, data.litersPerUnit)
      : undefined;

  const log = await updateWaterLog(id, {
    appliance: data.appliance as never,
    quantity: data.quantity,
    litersPerUnit: data.litersPerUnit,
    estimatedLiters: maybeEstimatedLiters,
    occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    notes: data.notes,
  });

  return NextResponse.json({ log });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteWaterLog(id);
  return NextResponse.json({ ok: true });
}
