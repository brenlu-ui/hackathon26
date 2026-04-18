import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.household.upsert({
    where: { id: "single-household" },
    update: {},
    create: { id: "single-household", name: "Home" },
  });

  const defaults = [
    { appliance: "washing_machine", litersPerUnit: 65 },
    { appliance: "dishwasher", litersPerUnit: 22 },
    { appliance: "shower", litersPerUnit: 9 },
    { appliance: "toilet", litersPerUnit: 6 },
    { appliance: "kitchen_faucet", litersPerUnit: 7 },
    { appliance: "garden_hose", litersPerUnit: 15 },
  ] as const;

  for (const item of defaults) {
    await prisma.applianceDefault.upsert({
      where: { appliance: item.appliance },
      update: { litersPerUnit: item.litersPerUnit },
      create: item,
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
