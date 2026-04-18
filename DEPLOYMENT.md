## Vercel + Postgres Deployment

1. Create a managed Postgres database (Neon, Supabase, or Vercel Postgres).
2. In Vercel project settings, set environment variable:
   - `DATABASE_URL`
3. Trigger first deployment.
4. Run migrations against production database:
   - `npx prisma migrate deploy`
5. Seed optional starter data:
   - `npm run prisma:seed`

The app is configured to auto-run `prisma generate` on install via `postinstall`.
