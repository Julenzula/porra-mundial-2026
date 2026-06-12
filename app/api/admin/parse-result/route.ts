import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/supabase/server";
import { isAdminAuthenticated } from "../auth";
import { parseAdminResult } from "../result-parser";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { input?: string } | null;
  if (!body?.input?.trim()) {
    return NextResponse.json({ ok: false, error: "No hay resultado para interpretar." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const [teamsResult, scorersResult] = await Promise.all([
    supabase.from("teams").select("*"),
    supabase.from("scorers").select("*"),
  ]);

  const error = teamsResult.error ?? scorersResult.error;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    preview: parseAdminResult(body.input, teamsResult.data ?? [], scorersResult.data ?? []),
  });
}
