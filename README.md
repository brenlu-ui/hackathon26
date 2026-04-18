## Water Tracker MVP

Next.js web app for a single household to manually track water usage by appliance and view dashboard insights.

## Features

- Appliance logging for washing machine, dishwasher, shower, toilet, kitchen faucet, and garden hose
- Dashboard KPIs (today total, range total, average, top appliance)
- Daily consumption and appliance share charts
- Edit/delete for recent logs
- Date-range filtering including custom range

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the app:
   ```bash
   npm run dev
   ```

If `DATABASE_URL` is not set, the app falls back to local file storage at `.data/water-logs.json`.

## Postgres + Prisma

Use managed Postgres for deployment:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Tests

```bash
npm run test
npm run test:e2e
```
