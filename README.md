# CertifiedBanger

A community-curated review platform for manga/manhwa. See
[`Projectinformation/README.md`](./Projectinformation/README.md) for the full project brief and
[`Projectinformation/Requirements_Engineering.docx`](./Projectinformation/Requirements_Engineering.docx)
for the consolidated requirements spec, architecture, data model, work packages, and user stories.
Every product/architecture decision behind this app is traced in
[`Projectinformation/Development_Journal.docx`](./Projectinformation/Development_Journal.docx).

## Stack

Next.js (TypeScript, App Router) · PostgreSQL via Supabase (Auth + Storage bundled) · Prisma ·
Vercel (hosting + Cron). Full rationale in the Requirements doc, Section 5.

## Getting Started

1. Copy `.env.example` to `.env` and fill in your Supabase project's connection string and API keys.
2. Install dependencies: `npm install`
3. Push the schema to your database: `npx prisma db push`
4. Seed the Category/SealType tables: `npx prisma db seed`
5. Run the dev server: `npm run dev`, then open [http://localhost:3000](http://localhost:3000)

## Project Structure

- `src/app/` — Next.js App Router pages and API routes / server actions
- `src/lib/prisma.ts` — Prisma Client singleton (Postgres driver adapter)
- `prisma/schema.prisma` — data model (see Requirements doc, Section 7, for the annotated version)
- `prisma/seed.ts` — seeds the data-driven Category and SealType tables
- `Projectinformation/` — project brief, requirements spec, and development journal
