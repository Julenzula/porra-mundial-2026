import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/supabase/server";
import { recalculatePorra } from "@/app/api/recalculate/engine";
import { isAdminAuthenticated } from "../auth";
import { parseAdminResult } from "../result-parser";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { input?: string } | null;
  if (!body?.input?.trim()) {
    return NextResponse.json({ ok: false, error: "No hay resultado para guardar." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const [teamsResult, scorersResult] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("scorers").select("*"),
    ]);

    const readError = teamsResult.error ?? scorersResult.error;
    if (readError) throw new Error(readError.message);

    const preview = parseAdminResult(body.input, teamsResult.data ?? [], scorersResult.data ?? []);
    if (!preview.valid || !preview.match) {
      return NextResponse.json({ ok: false, error: "El resultado tiene errores bloqueantes.", preview }, { status: 400 });
    }

    const matchInsert = {
      match_date: preview.match.matchDate,
      home_team_id: preview.match.homeTeamId,
      away_team_id: preview.match.awayTeamId,
      home_score: preview.match.homeGoals,
      away_score: preview.match.awayGoals,
      status: "finished",
    };

    const matchResult = await supabase.from("matches").insert(matchInsert).select("id").single();
    if (matchResult.error) throw new Error(matchResult.error.message);

    const matchId = String(matchResult.data.id);
    const goalRows = preview.goals.map((goal) => ({
      match_id: matchId,
      team_id: goal.teamId,
      scorer_id: goal.isPenaltyShootout ? null : goal.scorerId,
      player_name: goal.playerName,
      minute: goal.minute,
      is_own_goal: false,
      is_penalty: goal.isPenalty,
      is_extra_time: goal.isExtraTime,
      is_penalty_shootout: goal.isPenaltyShootout,
    }));

    if (goalRows.length) {
      const goalsResult = await supabase.from("match_goals").insert(goalRows);
      if (goalsResult.error) throw new Error(goalsResult.error.message);
    }

    const recalculate = await recalculatePorra();

    return NextResponse.json({
      ok: true,
      matchId,
      preview,
      recalculate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se ha podido guardar el resultado.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
