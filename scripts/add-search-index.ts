// One-off DDL: adds a trigger-maintained, indexed full-text search column
// to titles (a persisted GENERATED ALWAYS AS column isn't usable here —
// Postgres requires the generation expression to be IMMUTABLE, and
// to_tsvector() is only STABLE; a BEFORE INSERT/UPDATE trigger is the
// standard workaround). Run against the session pooler (port 5432), not
// the transaction pooler (6543) the app uses at runtime — ALTER
// TABLE/CREATE INDEX need session-level locks the transaction pooler
// doesn't support (established finding from Entry 45's schema push).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const sessionPoolerUrl = process.env.DATABASE_URL!.replace(":6543/", ":5432/");
const adapter = new PrismaPg({ connectionString: sessionPoolerUrl });
const prisma = new PrismaClient({ adapter });

const SEARCH_EXPR = (row: "" | "NEW.") => `
  to_tsvector('english',
    coalesce(${row}name, '') || ' ' ||
    coalesce(${row}"titleRomaji", '') || ' ' ||
    coalesce(${row}"titleEnglish", '') || ' ' ||
    coalesce(${row}"titleNative", '') || ' ' ||
    coalesce(${row}author, '') || ' ' ||
    coalesce(array_to_string(${row}genres, ' '), '') || ' ' ||
    coalesce(array_to_string(${row}synonyms, ' '), '')
  )
`;

async function main() {
  console.log("Adding searchVector column...");
  await prisma.$executeRawUnsafe(`ALTER TABLE titles ADD COLUMN IF NOT EXISTS "searchVector" tsvector`);

  console.log("Creating trigger function...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION titles_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW."searchVector" := ${SEARCH_EXPR("NEW.")};
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  console.log("Creating trigger...");
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS titles_search_vector_trigger ON titles`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER titles_search_vector_trigger
      BEFORE INSERT OR UPDATE ON titles
      FOR EACH ROW EXECUTE FUNCTION titles_search_vector_update()
  `);

  console.log("Backfilling existing rows...");
  await prisma.$executeRawUnsafe(`UPDATE titles SET "searchVector" = ${SEARCH_EXPR("")}`);

  console.log("Creating GIN index...");
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS titles_search_vector_idx ON titles USING GIN ("searchVector")`,
  );

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
