// One-off, idempotent setup for this project's public Supabase Storage
// buckets: "covers" (title cover images, Journal Entry 35) and
// "profile-images" (user avatars/banners, Journal Entry 51). Safe to re-run.
// Run with: npm run setup:storage
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const BUCKETS = ["covers", "profile-images"];

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  for (const bucket of BUCKETS) {
    if (buckets.some((b) => b.name === bucket)) {
      console.log(`Bucket "${bucket}" already exists — nothing to do.`);
      continue;
    }

    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: "5MB",
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    });
    if (createError) throw createError;

    console.log(`Created public bucket "${bucket}".`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
