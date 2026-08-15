# CertifiedBanger

A community-curated review platform for manga/manhwa. See
[`Projectinformation/README.md`](./Projectinformation/README.md) for the full project brief and
[`Projectinformation/Requirements_Engineering.docx`](./Projectinformation/Requirements_Engineering.docx)
for the consolidated requirements spec, architecture, data model, work packages, and user stories.
Every product/architecture decision behind this app is traced in
[`Projectinformation/Development_Journal.docx`](./Projectinformation/Development_Journal.docx).
The current database schema is diagrammed in
[`Projectinformation/Database_ERM.md`](./Projectinformation/Database_ERM.md).

## Stack

Next.js (TypeScript, App Router) · PostgreSQL via Supabase (Auth + Storage bundled) · Prisma ·
Vercel (hosting + Cron). Full rationale in the Requirements doc, Section 5.

## Getting Started

1. Copy `.env.example` to `.env` and fill in your Supabase project's connection string and API
   keys, plus a random `CRON_SECRET` (e.g. `openssl rand -hex 32`) — set the same value in your
   Vercel project's environment variables once deployed, so Vercel Cron can call
   `/api/cron/seal-probation` (Entry 12/36).
2. Install dependencies: `npm install`
3. Push the schema to your database: `npx prisma db push`
4. Seed the Category/SealType tables: `npx prisma db seed`
5. Create the Storage bucket for title cover images: `npm run setup:storage`
6. Run the dev server: `npm run dev`, then open [http://localhost:3000](http://localhost:3000)
7. Register an account in the browser, then promote it to Main Admin (there's no UI for this —
   bootstrapping the first admin has to happen out of band):
   `npm run promote-admin -- <your-username> MAIN_ADMIN`
8. Optional: populate the catalog with a curated set of well-known titles imported from AniList
   (Journal Entry 44), so the site isn't empty by default: `npm run seed:titles`

## Project Structure

- `src/app/` — Next.js App Router pages and API routes / server actions
- `src/lib/prisma.ts` — Prisma Client singleton (Postgres driver adapter)
- `prisma/schema.prisma` — data model (see Requirements doc, Section 7, for the annotated version)
- `prisma/seed.ts` — seeds the data-driven Category and SealType tables
- `Projectinformation/` — project brief, requirements spec, and development journal
