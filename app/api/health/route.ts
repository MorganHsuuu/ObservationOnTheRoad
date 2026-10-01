import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { keepDailySnapshots } from "@/lib/snapshots";
import { createAnonServerClient } from "@/lib/supabase/anon";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }
  if (request.headers.get("x-vercel-cron") === "1") {
    await keepDailySnapshots();
  }
  const supabase = createAnonServerClient();
  const { error } = await supabase.from("events").select("id").limit(1);
  return NextResponse.json({ ok: !error });
}
