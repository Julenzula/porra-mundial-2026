import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/supabase/server";

export const dynamic = "force-dynamic";

type DbRow = Record<string, unknown>;

type ParticipantScore = {
  id: string;
  displayName: string;
  totalPoints: number;
  todayPoints: number;
  previousPosition: number | null;
  position: number;
  dailyPoints: Map<string, number>;
};

type ActivityInsert = {
  participant_id: string;
  date: string;
  type: string;
  flag: string;
  description: string;
  points: number;
};

type SnapshotInsert = {
  participant_id: string;
  date: string;
  total_points: number;
  position: number;
};

const TEAM_WIN_POINTS = 3;
const TEAM_DRAW_POINTS = 1;

export async function POST(request: NextRequest) {
  const unauthorized = authorizeRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await recalculatePorra();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error recalculando la porra.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function authorizeRequest(request: NextRequest) {
  const configuredSecret = process.env.RECALCULATE_SECRET;
  const providedSecret =
    request.headers.get("x-recalculate-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("secret");

  if (!configuredSecret && process.env.NODE_ENV === "development") return null;

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

async function recalculatePorra() {
  const supabase = createSupabaseServerClient();

  const [
    participantsResult,
    teamsResult,
    scorersResult,
    participantTeamsResult,
    participantScorersResult,
    rankingResult,
    matchesResult,
  ] = await Promise.all([
    supabase.from("participants").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("scorers").select("*"),
    supabase.from("participant_teams").select("*"),
    supabase.from("participant_scorers").select("*"),
    supabase.from("current_ranking").select("*"),
    supabase.from("matches").select("*").eq("status", "finished"),
  ]);

  const readError = [
    participantsResult.error,
    teamsResult.error,
    scorersResult.error,
    participantTeamsResult.error,
    participantScorersResult.error,
    rankingResult.error,
    matchesResult.error,
  ].find(Boolean);

  if (readError) throw new Error(readError.message);

  const participants = asRows(participantsResult.data);
  const teams = asRows(teamsResult.data);
  const scorers = asRows(scorersResult.data);
  const participantTeams = asRows(participantTeamsResult.data);
  const participantScorers = asRows(participantScorersResult.data);
  const currentRanking = asRows(rankingResult.data);
  const finishedMatches = asRows(matchesResult.data);

  const finishedMatchIds = finishedMatches.map(getId).filter(Boolean);
  const matchGoals = finishedMatchIds.length ? await fetchMatchGoals(finishedMatchIds) : [];
  const affectedDates = unique(finishedMatches.map(getMatchDate).filter(Boolean));

  const teamsById = indexById(teams);
  const scorersById = indexById(scorers);
  const currentRankingByParticipantId = indexByParticipantId(currentRanking);
  const participantScores = buildInitialScores(participants, currentRankingByParticipantId);
  const activityRows: ActivityInsert[] = [];

  for (const match of finishedMatches) {
    scoreMatch({
      match,
      goals: matchGoals.filter((goal) => getMatchId(goal) === getId(match)),
      teamsById,
      scorersById,
      participantTeams,
      participantScorers,
      participantScores,
      activityRows,
    });
  }

  const latestActivityDate = affectedDates.sort().at(-1) ?? null;
  const rankedParticipants = rankParticipants(Array.from(participantScores.values()));
  const rankingRows = rankedParticipants.map((participant) => ({
    participant_id: participant.id,
    total_points: participant.totalPoints,
    today_points: latestActivityDate ? participant.dailyPoints.get(latestActivityDate) ?? 0 : 0,
    position: participant.position,
    previous_position: participant.previousPosition,
  }));
  const snapshotRows = buildSnapshotRows(rankedParticipants, affectedDates);

  await regenerateActivity(supabase, affectedDates, activityRows);
  await regenerateSnapshots(supabase, affectedDates, snapshotRows);
  await upsertCurrentRanking(supabase, rankingRows);

  return {
    ok: true,
    finishedMatches: finishedMatches.length,
    activityRows: activityRows.length,
    snapshotRows: snapshotRows.length,
    rankingRows: rankingRows.length,
    affectedDates,
  };
}

async function fetchMatchGoals(matchIds: string[]) {
  const supabase = createSupabaseServerClient();
  const result = await supabase.from("match_goals").select("*").in("match_id", matchIds);
  if (result.error) throw new Error(result.error.message);
  return asRows(result.data);
}

function scoreMatch({
  match,
  goals,
  teamsById,
  scorersById,
  participantTeams,
  participantScorers,
  participantScores,
  activityRows,
}: {
  match: DbRow;
  goals: DbRow[];
  teamsById: Map<string, DbRow>;
  scorersById: Map<string, DbRow>;
  participantTeams: DbRow[];
  participantScorers: DbRow[];
  participantScores: Map<string, ParticipantScore>;
  activityRows: ActivityInsert[];
}) {
  const homeTeamId = getString(match, ["home_team_id", "homeTeamId", "team_home_id"], "");
  const awayTeamId = getString(match, ["away_team_id", "awayTeamId", "team_away_id"], "");
  const homeGoals = getNumber(match, ["home_score", "home_goals", "homeGoals"], 0);
  const awayGoals = getNumber(match, ["away_score", "away_goals", "awayGoals"], 0);
  const matchDate = getMatchDate(match);
  const teamResultPoints = new Map<string, number>([
    [homeTeamId, homeGoals > awayGoals ? TEAM_WIN_POINTS : homeGoals === awayGoals ? TEAM_DRAW_POINTS : 0],
    [awayTeamId, awayGoals > homeGoals ? TEAM_WIN_POINTS : homeGoals === awayGoals ? TEAM_DRAW_POINTS : 0],
  ]);
  const teamGoals = new Map<string, number>([
    [homeTeamId, homeGoals],
    [awayTeamId, awayGoals],
  ]);

  for (const pick of participantTeams) {
    const participantId = getParticipantId(pick);
    const teamId = getString(pick, ["team_id", "teamId"], "");
    if (!participantId || !teamId || !teamResultPoints.has(teamId)) continue;

    const team = teamsById.get(teamId);
    const resultPoints = teamResultPoints.get(teamId) ?? 0;
    const goalsPoints = teamGoals.get(teamId) ?? 0;

    if (resultPoints > 0) {
      addPoints({
        participantScores,
        activityRows,
        participantId,
        date: matchDate,
        type: resultPoints === TEAM_WIN_POINTS ? "team_win" : "team_draw",
        flag: getString(team, ["flag", "emoji"], "⚽"),
        description: `${getTeamName(team)} ${resultPoints === TEAM_WIN_POINTS ? "victoria" : "empate"}`,
        points: resultPoints,
      });
    }

    if (goalsPoints > 0) {
      addPoints({
        participantScores,
        activityRows,
        participantId,
        date: matchDate,
        type: "team_goals",
        flag: getString(team, ["flag", "emoji"], "⚽"),
        description: `${getTeamName(team)} marca ${goalsPoints} ${goalsPoints === 1 ? "gol" : "goles"}`,
        points: goalsPoints,
      });
    }
  }

  const validGoals = goals.filter((goal) => !isOwnGoal(goal) && !isPenaltyShootoutGoal(goal));

  for (const scorerPick of participantScorers) {
    const participantId = getParticipantId(scorerPick);
    const scorerId = getString(scorerPick, ["scorer_id", "scorerId"], "");
    if (!participantId || !scorerId) continue;

    const goalsScored = validGoals.filter((goal) => getScorerId(goal) === scorerId).length;
    if (!goalsScored) continue;

    const scorer = scorersById.get(scorerId);
    const weight = getScorerWeight(scorerPick, participantScorers);
    addPoints({
      participantScores,
      activityRows,
      participantId,
      date: matchDate,
      type: "scorer",
      flag: getString(scorer, ["flag", "emoji"], "⚽"),
      description: `${getScorerName(scorer)} marca${goalsScored > 1 ? ` x${goalsScored}` : ""}`,
      points: goalsScored * weight,
    });
  }
}

function addPoints({
  participantScores,
  activityRows,
  participantId,
  date,
  type,
  flag,
  description,
  points,
}: {
  participantScores: Map<string, ParticipantScore>;
  activityRows: ActivityInsert[];
  participantId: string;
  date: string;
  type: string;
  flag: string;
  description: string;
  points: number;
}) {
  const participant = participantScores.get(participantId);
  if (!participant || points === 0) return;

  participant.totalPoints += points;
  participant.dailyPoints.set(date, (participant.dailyPoints.get(date) ?? 0) + points);
  activityRows.push({ participant_id: participantId, date, type, flag, description, points });
}

function buildInitialScores(participants: DbRow[], rankingByParticipantId: Map<string, DbRow>) {
  return new Map(
    participants.map((participant) => {
      const id = getId(participant);
      const ranking = rankingByParticipantId.get(id);
      return [
        id,
        {
          id,
          displayName: getParticipantName(participant),
          totalPoints: 0,
          todayPoints: 0,
          previousPosition: getNullableNumber(ranking, ["position", "previous_position"]),
          position: 0,
          dailyPoints: new Map<string, number>(),
        },
      ];
    }),
  );
}

function rankParticipants(participants: ParticipantScore[]) {
  return participants
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (a.previousPosition !== null && b.previousPosition !== null) return a.previousPosition - b.previousPosition;
      if (a.previousPosition !== null) return -1;
      if (b.previousPosition !== null) return 1;
      return a.displayName.localeCompare(b.displayName);
    })
    .map((participant, index) => ({
      ...participant,
      position: index + 1,
      todayPoints: participant.todayPoints,
    }));
}

function buildSnapshotRows(participants: ParticipantScore[], dates: string[]): SnapshotInsert[] {
  return dates.flatMap((date) => {
    const snapshotParticipants = participants
      .map((participant) => ({
        participant,
        totalPoints: cumulativePointsUntil(participant.dailyPoints, date),
      }))
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (a.participant.previousPosition !== null && b.participant.previousPosition !== null) {
          return a.participant.previousPosition - b.participant.previousPosition;
        }
        if (a.participant.previousPosition !== null) return -1;
        if (b.participant.previousPosition !== null) return 1;
        return a.participant.displayName.localeCompare(b.participant.displayName);
      });

    return snapshotParticipants.map(({ participant, totalPoints }, index) => ({
      participant_id: participant.id,
      date,
      total_points: totalPoints,
      position: index + 1,
    }));
  });
}

function cumulativePointsUntil(pointsByDate: Map<string, number>, date: string) {
  return Array.from(pointsByDate.entries()).reduce((sum, [activityDate, points]) => {
    return activityDate <= date ? sum + points : sum;
  }, 0);
}

async function regenerateActivity(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  dates: string[],
  rows: ActivityInsert[],
) {
  if (!dates.length) return;

  const deleteResult = await supabase.from("daily_activity").delete().in("date", dates);
  if (deleteResult.error) throw new Error(deleteResult.error.message);

  if (rows.length) {
    const insertResult = await supabase.from("daily_activity").insert(rows);
    if (insertResult.error) throw new Error(insertResult.error.message);
  }
}

async function regenerateSnapshots(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  dates: string[],
  rows: SnapshotInsert[],
) {
  if (!dates.length) return;

  const deleteResult = await supabase.from("ranking_snapshots").delete().in("date", dates);
  if (deleteResult.error) throw new Error(deleteResult.error.message);

  if (rows.length) {
    const insertResult = await supabase.from("ranking_snapshots").insert(rows);
    if (insertResult.error) throw new Error(insertResult.error.message);
  }
}

async function upsertCurrentRanking(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  rows: Array<{
    participant_id: string;
    total_points: number;
    today_points: number;
    position: number;
    previous_position: number | null;
  }>,
) {
  if (!rows.length) return;

  const result = await supabase.from("current_ranking").upsert(rows, { onConflict: "participant_id" });
  if (result.error) throw new Error(result.error.message);
}

function asRows(data: unknown): DbRow[] {
  return Array.isArray(data) ? (data as DbRow[]) : [];
}

function indexById(rows: DbRow[]) {
  return new Map(rows.map((row) => [getId(row), row]));
}

function indexByParticipantId(rows: DbRow[]) {
  return new Map(rows.map((row) => [getParticipantId(row), row]));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function getId(row: DbRow | undefined) {
  return getString(row, ["id", "uuid"], "");
}

function getParticipantId(row: DbRow | undefined) {
  return getString(row, ["participant_id", "participantId", "id"], "");
}

function getMatchId(row: DbRow | undefined) {
  return getString(row, ["match_id", "matchId"], "");
}

function getScorerId(row: DbRow | undefined) {
  return getString(row, ["scorer_id", "scorerId", "player_id", "playerId"], "");
}

function getMatchDate(row: DbRow) {
  const value = getString(row, ["date", "match_date", "kickoff_at", "played_at"], "");
  if (!value) return "unknown";
  return value.slice(0, 10);
}

function getTeamName(row: DbRow | undefined) {
  return getString(row, ["name", "team_name"], "Equipo");
}

function getScorerName(row: DbRow | undefined) {
  return getString(row, ["name", "scorer_name", "display_name"], "Goleador");
}

function getParticipantName(row: DbRow | undefined) {
  return getString(row, ["display_name", "name", "participant_name"], "Participante");
}

function getScorerWeight(row: DbRow, allScorerPicks: DbRow[]) {
  const slot = getString(row, ["slot", "scorer_slot", "type"], "").toUpperCase();
  if (slot === "G1") return 1;
  if (slot === "G2") return 2;
  if (slot === "G3") return 3;

  const explicitPosition = getNumber(row, ["position", "rank", "order", "pick_order"], 0);
  if (explicitPosition >= 1 && explicitPosition <= 3) return explicitPosition;

  const participantId = getParticipantId(row);
  const participantPicks = allScorerPicks.filter((pick) => getParticipantId(pick) === participantId);
  const fallbackIndex = participantPicks.findIndex((pick) => pick === row);
  return Math.min(Math.max(fallbackIndex + 1, 1), 3);
}

function isPenaltyShootoutGoal(row: DbRow) {
  const period = getString(row, ["period", "goal_period", "phase"], "").toLowerCase();
  return (
    getBoolean(row, ["is_penalty_shootout", "penalty_shootout", "isShootout"]) ||
    period.includes("shootout") ||
    period.includes("tanda")
  );
}

function isOwnGoal(row: DbRow) {
  return getBoolean(row, ["is_own_goal", "own_goal", "isOwnGoal"]);
}

function getString(row: DbRow | undefined, keys: string[], fallback: string) {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }

  return fallback;
}

function getNumber(row: DbRow | undefined, keys: string[], fallback: number) {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }

  return fallback;
}

function getNullableNumber(row: DbRow | undefined, keys: string[]) {
  const value = getNumber(row, keys, Number.NaN);
  return Number.isFinite(value) ? value : null;
}

function getBoolean(row: DbRow | undefined, keys: string[]) {
  if (!row) return false;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["true", "1", "yes", "si"].includes(value.toLowerCase());
    if (typeof value === "number") return value === 1;
  }

  return false;
}
