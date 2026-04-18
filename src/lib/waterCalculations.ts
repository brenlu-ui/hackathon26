import type { ApplianceId } from "@/lib/appliances";
import { getAppliance } from "@/lib/appliances";

export function calculateEstimatedLiters(
  appliance: ApplianceId,
  quantity: number,
  overrideRate?: number,
) {
  const applianceConfig = getAppliance(appliance);
  if (!applianceConfig) {
    throw new Error("Unsupported appliance.");
  }

  const rate = overrideRate ?? applianceConfig.defaultLiters;
  if (quantity <= 0 || rate <= 0) {
    throw new Error("Quantity and rate must be positive.");
  }

  return Number((quantity * rate).toFixed(2));
}
