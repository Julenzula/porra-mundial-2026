import {
  FIFA_COLORS,
  type ActivityDay,
  type ActivityEvent,
  type EvolutionPoint,
  type Participant,
  type ScorerPick,
  type TeamPick,
} from "../data";
import { createSupabaseBrowserClient } from "./client";

type DbRow = Record<string, unknown>;
type RankedParticipant = Participant & { rankingPosition: number };

export type PorraData = {
  participants: Participant[];
  activityByParticipant: Record<string, ActivityDay[]>;
  evolutionData: EvolutionPoint[];
  biggestRiser: { name: string; points: number };
  topScorer: { name: string; flag: string; goals: number };
  topTeam: { name: string; flag: string; points: number };
};

const DEFAULT_COLORS = [
  FIFA_COLORS.black,
  FIFA_COLORS.red,
  FIFA_COLORS.blue,
  FIFA_COLORS.purple,
  FIFA_COLORS.cyan,
  FIFA_COLORS.green,
  FIFA_COLORS.lime,
  FIFA_COLORS.maroon,
];

export async function fetchPorraData(): Promise<PorraData> {
  const supabase = createSupabaseBrowserClient();

  const [
    participantsResult,
    teamsResult,
    scorersResult,
    participantTeamsResult,
    participantScorersResult,
    rankingResult,
    snapshotsResult,
    activityResult,
  ] = await Promise.all([
    supabase.from("participants").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("scorers").select("*"),
    supabase.from("participant_teams").select("*"),
    supabase.from("participant_scorers").select("*"),
    supabase.from("current_ranking").select("*"),
    supabase.from("ranking_snapshots").select("*"),
    supabase.from("daily_activity").select("*"),
  ]);

  const error = [
    participantsResult.error,
    teamsResult.error,
    scorersResult.error,
    participantTeamsResult.error,
    participantScorersResult.error,
    rankingResult.error,
    snapshotsResult.error,
    activityResult.error,
  ].find(Boolean);

  if (error) {
    throw new Error(error.message);
  }

  const participantRows = asRows(participantsResult.data);
  const teamRows = asRows(teamsResult.data);
  const scorerRows = asRows(scorersResult.data);
  const participantTeamRows = asRows(participantTeamsResult.data);
  const participantScorerRows = asRows(participantScorersResult.data);
  const rankingRows = asRows(rankingResult.data);
  const snapshotRows = asRows(snapshotsResult.data);
  const activityRows = asRows(activityResult.data);

  if (!participantRows.length) {
    throw new Error("Supabase no devolvio participantes.");
  }

  const teamsById = indexById(teamRows);
  const scorersById = indexById(scorerRows);
  const rankingByParticipantId = indexByParticipantId(rankingRows);

  const participants: RankedParticipant[] = participantRows
    .map((row, index) => {
      const id = getId(row);
      const ranking = rankingByParticipantId.get(id);
      const name = getString(row, ["name", "display_name", "participant_name"], `Participante ${index + 1}`);

      return {
        id,
        name,
        avatar: getString(row, ["avatar", "initials"], initials(name)),
        color: getString(row, ["color", "hex_color"], DEFAULT_COLORS[index % DEFAULT_COLORS.length]),
        totalPoints: getNumber(ranking, ["total_points", "totalPoints", "points", "total"], 0),
        todayPoints: getNumber(ranking, ["today_points", "todayPoints", "daily_points", "dailyPoints"], 0),
        rankingPosition: getNumber(ranking, ["position", "rank", "ranking_position", "rankingPosition"], index + 1),
        teams: buildTeams(id, participantTeamRows, teamsById),
        scorers: buildScorers(id, participantScorerRows, scorersById),
      };
    })
    .sort((a, b) => a.rankingPosition - b.rankingPosition);

  return {
    participants,
    activityByParticipant: buildActivity(activityRows, participants, teamsById, scorersById),
    evolutionData: buildEvolution(snapshotRows, participants),
    biggestRiser: getBiggestRiser(participants),
    topScorer: getTopScorer(participants),
    topTeam: getTopTeam(participants),
  };
}

function buildTeams(participantId: string, relationRows: DbRow[], teamsById: Map<string, DbRow>): TeamPick[] {
  return relationRows
    .filter((row) => getParticipantId(row) === participantId)
    .map((row) => {
      const team = teamsById.get(getForeignId(row, ["team_id", "teamId"]));
      return {
        flag: getString(team, ["flag", "emoji"], "🏳️"),
        name: getString(team, ["name", "team_name"], "Equipo"),
        points: getNumber(row, ["points", "total_points", "current_points"], 0),
      };
    });
}

function buildScorers(participantId: string, relationRows: DbRow[], scorersById: Map<string, DbRow>): ScorerPick[] {
  return relationRows
    .filter((row) => getParticipantId(row) === participantId)
    .map((row) => {
      const scorer = scorersById.get(getForeignId(row, ["scorer_id", "scorerId"]));
      return {
        flag: getString(scorer, ["flag", "emoji"], "⚽"),
        name: getString(scorer, ["name", "scorer_name"], "Goleador"),
        goals: getNumber(row, ["goals", "goal_count"], getNumber(scorer, ["goals"], 0)),
        points: getNumber(row, ["points", "total_points", "current_points"], 0),
      };
    });
}

function buildActivity(
  activityRows: DbRow[],
  participants: Participant[],
  teamsById: Map<string, DbRow>,
  scorersById: Map<string, DbRow>,
): Record<string, ActivityDay[]> {
  const byParticipant: Record<string, ActivityDay[]> = {};

  for (const participant of participants) {
    const rows = activityRows.filter((row) => getParticipantId(row) === participant.id);

    if (!rows.length) {
      byParticipant[participant.id] = [
        {
          date: "Hoy",
          total: participant.todayPoints,
          events: [
            {
              type: "team_draw",
              flag: participant.teams[0]?.flag ?? "⚽",
              description: participant.todayPoints ? "Puntuacion actualizada" : "Jornada sin cambios",
              points: participant.todayPoints,
            },
          ],
        },
      ];
      continue;
    }

    const grouped = new Map<string, ActivityEvent[]>();
    for (const row of rows) {
      const date = formatDate(getString(row, ["date", "activity_date", "day", "created_at"], "Hoy"));
      const events = grouped.get(date) ?? [];
      events.push({
        type: normalizeEventType(getString(row, ["activity_type", "type", "event_type"], "bonus")),
        flag: getActivityFlag(row, teamsById, scorersById),
        description: getString(row, ["description", "title", "label", "event"], "Evento de puntuacion"),
        points: getNumber(row, ["points", "value"], 0),
      });
      grouped.set(date, events);
    }

    byParticipant[participant.id] = Array.from(grouped.entries()).map(([date, events]) => ({
      date,
      events,
      total: events.reduce((sum, event) => sum + event.points, 0),
    }));
  }

  return byParticipant;
}

function buildEvolution(snapshotRows: DbRow[], participants: Participant[]): EvolutionPoint[] {
  if (!snapshotRows.length) {
    return [
      {
        date: "Hoy",
        scores: Object.fromEntries(participants.map((participant) => [participant.name, participant.totalPoints])),
      },
    ];
  }

  const participantNameById = new Map(participants.map((participant) => [participant.id, participant.name]));
  const grouped = new Map<string, Record<string, number>>();

  for (const row of snapshotRows) {
    const participantName = participantNameById.get(getParticipantId(row));
    if (!participantName) continue;

    const date = formatDate(getString(row, ["snapshot_date", "date", "day", "created_at"], "Hoy"));
    const scores = grouped.get(date) ?? {};
    scores[participantName] = getNumber(row, ["total_points", "totalPoints", "points", "total"], 0);
    grouped.set(date, scores);
  }

  return Array.from(grouped.entries()).map(([date, scores]) => ({ date, scores }));
}

function getBiggestRiser(participants: Participant[]) {
  const participant = [...participants].sort((a, b) => b.todayPoints - a.todayPoints)[0];
  return { name: participant?.name ?? "N/A", points: participant?.todayPoints ?? 0 };
}

function getTopScorer(participants: Participant[]) {
  const scorer = participants
    .flatMap((participant) => participant.scorers)
    .sort((a, b) => b.goals - a.goals || b.points - a.points)[0];

  return {
    name: scorer?.name ?? "N/A",
    flag: scorer?.flag ?? "⚽",
    goals: scorer?.goals ?? 0,
  };
}

function getTopTeam(participants: Participant[]) {
  const team = participants
    .flatMap((participant) => participant.teams)
    .sort((a, b) => b.points - a.points)[0];

  return {
    name: team?.name ?? "N/A",
    flag: team?.flag ?? "🏳️",
    points: team?.points ?? 0,
  };
}

function getActivityFlag(row: DbRow, teamsById: Map<string, DbRow>, scorersById: Map<string, DbRow>) {
  const team = teamsById.get(getString(row, ["source_team", "team_id", "teamId"], ""));
  if (team) return getString(team, ["flag", "emoji"], "⚽");

  const scorer = scorersById.get(getString(row, ["source_player", "source_scorer", "scorer_id", "scorerId"], ""));
  if (scorer) return getString(scorer, ["flag", "emoji"], "⚽");

  return "⚽";
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

function getId(row: DbRow | undefined) {
  return getString(row, ["id", "uuid"], "");
}

function getParticipantId(row: DbRow | undefined) {
  return getForeignId(row, ["participant_id", "participantId", "id"]);
}

function getForeignId(row: DbRow | undefined, keys: string[]) {
  return getString(row, keys, "");
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeEventType(value: string): ActivityEvent["type"] {
  if (["team_win", "team_draw", "team_loss", "team_goals", "scorer", "bonus"].includes(value)) {
    return value as ActivityEvent["type"];
  }

  return "bonus";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
  })
    .format(date)
    .replace(".", "");
}
