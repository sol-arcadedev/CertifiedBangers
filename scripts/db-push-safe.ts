// Wrapper for `prisma db push` that also restores the raw-SQL-managed
// indexes it would otherwise silently drop (Entry 58: db push reconciles
// the DB to exactly match schema.prisma, and titles_search_vector_idx
// plus the four DESC NULLS LAST sort indexes have no @@index declaration
// — that's unavoidable, Prisma's schema DSL can't express either). Makes
// the safe sequence the default path instead of relying on remembering
// to re-run scripts/add-search-index.ts and scripts/add-sort-indexes.ts
// by hand after every push.
//
// Also handles the session-pooler requirement for db push itself
// (transaction-mode pooling, port 6543, doesn't support the session-level
// advisory locks schema changes need — Entry 45) by deriving it from
// DATABASE_URL automatically; the two index scripts already do this
// themselves internally, so only this step needs the override here.
//
// Run with: npm run db:push
import "dotenv/config";
import { execFileSync } from "node:child_process";

function run(command: string, args: string[], env?: NodeJS.ProcessEnv) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { stdio: "inherit", shell: true, env: env ?? process.env });
}

const sessionPoolerUrl = process.env.DATABASE_URL!.replace(":6543/", ":5432/");

run("npx", ["prisma", "db", "push"], { ...process.env, DATABASE_URL: sessionPoolerUrl });
run("npx", ["tsx", "scripts/add-search-index.ts"]);
run("npx", ["tsx", "scripts/add-sort-indexes.ts"]);

console.log("\ndb push + reindex complete.");
