import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createAnonServerClient } from "@/lib/supabase/anon";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }
  const supabase = createAnonServerClient();
  const { error } = await supabase.from("events").select("id").limit(1);
  return NextResponse.json({ ok: !error });
}
