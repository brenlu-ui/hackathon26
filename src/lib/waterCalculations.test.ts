import { describe, expect, it } from "vitest";
import { calculateEstimatedLiters } from "@/lib/waterCalculations";

describe("calculateEstimatedLiters", () => {
  it("calculates liters for duration-based appliance", () => {
    expect(calculateEstimatedLiters("shower", 10, 9)).toBe(90);
  });

  it("calculates liters for cycle-based appliance", () => {
    expect(calculateEstimatedLiters("washing_machine", 2, 65)).toBe(130);
  });

  it("throws for invalid quantity", () => {
    expect(() => calculateEstimatedLiters("toilet", 0, 6)).toThrow();
  });
});
