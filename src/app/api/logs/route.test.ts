import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/logs/route";

const { mockCreateWaterLog, mockListWaterLogs } = vi.hoisted(() => ({
  mockCreateWaterLog: vi.fn(),
  mockListWaterLogs: vi.fn(),
}));

vi.mock("@/lib/logRepository", () => ({
  createWaterLog: mockCreateWaterLog,
  listWaterLogs: mockListWaterLogs,
}));

describe("/api/logs route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a water log on POST", async () => {
    mockCreateWaterLog.mockResolvedValue({ id: "abc123", estimatedLiters: 90 });

    const request = new NextRequest("http://localhost/api/logs", {
      method: "POST",
      body: JSON.stringify({
        appliance: "shower",
        quantity: 10,
        litersPerUnit: 9,
        occurredAt: new Date().toISOString(),
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.log.id).toBe("abc123");
    expect(mockCreateWaterLog).toHaveBeenCalledTimes(1);
  });

  it("lists logs on GET", async () => {
    mockListWaterLogs.mockResolvedValue([{ id: "log1" }, { id: "log2" }]);
    const request = new NextRequest("http://localhost/api/logs");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.logs).toHaveLength(2);
    expect(mockListWaterLogs).toHaveBeenCalledTimes(1);
  });
});
