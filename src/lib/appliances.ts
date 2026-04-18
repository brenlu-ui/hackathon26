export const APPLIANCES = [
  { id: "washing_machine", label: "Washing Machine", mode: "cycle", defaultLiters: 65 },
  { id: "dishwasher", label: "Dishwasher", mode: "cycle", defaultLiters: 22 },
  { id: "shower", label: "Shower", mode: "duration", defaultLiters: 9 },
  { id: "toilet", label: "Toilet", mode: "cycle", defaultLiters: 6 },
  { id: "kitchen_faucet", label: "Kitchen Faucet", mode: "duration", defaultLiters: 7 },
  { id: "garden_hose", label: "Garden Hose", mode: "duration", defaultLiters: 15 },
] as const;

export type ApplianceId = (typeof APPLIANCES)[number]["id"];
export type ApplianceMode = (typeof APPLIANCES)[number]["mode"];

export const applianceIdSet = new Set(APPLIANCES.map((item) => item.id));

export function getAppliance(appliance: ApplianceId) {
  return APPLIANCES.find((item) => item.id === appliance);
}
