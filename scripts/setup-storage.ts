// One-off, idempotent setup for the Supabase Storage bucket that holds title
// cover images (Journal Entry 35). Safe to re-run.
// Run with: npm run setup:storage
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "covers";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  if (buckets.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" already exists — nothing to do.`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  });
  if (createError) throw createError;

  console.log(`Created public bucket "${BUCKET}".`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
