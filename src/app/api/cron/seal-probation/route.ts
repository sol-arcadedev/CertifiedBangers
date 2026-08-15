import { NextResponse } from "next/server";
import { runSealProbationCheck } from "@/lib/seal-probation";

// Invoked by Vercel Cron (vercel.json, Entry 36) once daily. Vercel signs
// cron requests with a Bearer token matching CRON_SECRET — reject anything
// else so this endpoint can't be hit by the public to spam-run the job.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSealProbationCheck();
  return NextResponse.json(result);
}
