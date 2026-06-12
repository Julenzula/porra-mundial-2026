type DbRow = Record<string, unknown>;

export type ParsedGoal = {
  playerName: string;
  minute: string | null;
  teamSide: "home" | "away";
  teamName: string;
  teamId: string | null;
  scorerId: string | null;
  scorerMatched: boolean;
  isPenalty: boolean;
  isExtraTime: boolean;
  isPenaltyShootout: boolean;
};

export type ParsedMatchPreview = {
  valid: boolean;
  match: {
    homeTeam: string;
    awayTeam: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeGoals: number;
    awayGoals: number;
    matchDate: string;
  } | null;
  goals: ParsedGoal[];
  notes: string[];
  issues: Array<{ level: "error" | "warning" | "info"; message: string }>;
};

export function parseAdminResult(raw: string, teams: DbRow[], scorers: DbRow[]): ParsedMatchPreview {
  const issues: ParsedMatchPreview["issues"] = [];
  const lines = raw.split("\n").map((line) => line.trim());
  const nonEmpty = lines.filter(Boolean);

  const partidoIndex = nonEmpty.findIndex((line) => /^PARTIDO\s*:/i.test(line));
  if (partidoIndex === -1) {
    return emptyPreview([{ level: "error", message: 'Falta la seccion "PARTIDO:" con el marcador.' }]);
  }

  const matchLine = nonEmpty[partidoIndex + 1] ?? "";
  const scoreMatch = matchLine.match(/^(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+)$/);
  if (!scoreMatch) {
    return emptyPreview([
      {
        level: "error",
        message: `No se puede leer el marcador en: "${matchLine}". Formato esperado: "Portugal 2-0 Republica Checa".`,
      },
    ]);
  }

  const homeTeam = scoreMatch[1].trim();
  const homeGoals = Number(scoreMatch[2]);
  const awayGoals = Number(scoreMatch[3]);
  const awayTeam = scoreMatch[4].trim();
  const homeTeamRow = findByName(teams, homeTeam);
  const awayTeamRow = findByName(teams, awayTeam);

  if (!homeTeamRow) {
    issues.push({ level: "error", message: `"${homeTeam}" no existe en teams. No se puede confirmar.` });
  }
  if (!awayTeamRow) {
    issues.push({ level: "error", message: `"${awayTeam}" no existe en teams. No se puede confirmar.` });
  }

  const goalsIndex = nonEmpty.findIndex((line) => /^GOLES\s*:/i.test(line));
  const notesIndex = nonEmpty.findIndex((line) => /^NOTAS\s*:/i.test(line));
  const parsedGoals: ParsedGoal[] = [];

  if (goalsIndex !== -1) {
    let currentSide: "home" | "away" | null = null;
    const end = notesIndex > goalsIndex ? notesIndex : nonEmpty.length;

    for (let index = goalsIndex + 1; index < end; index += 1) {
      const line = nonEmpty[index];
      const heading = line.replace(/:$/, "");

      if (sameName(heading, homeTeam)) {
        currentSide = "home";
        continue;
      }
      if (sameName(heading, awayTeam)) {
        currentSide = "away";
        continue;
      }
      if (!/^[*\-·•]/.test(line)) continue;

      const goalText = line.replace(/^[*\-·•]\s*/, "");
      if (/sin goles|no hubo goles/i.test(goalText)) continue;
      if (!currentSide) {
        issues.push({ level: "warning", message: `Gol sin equipo detectado: "${goalText}".` });
        continue;
      }

      const isPenaltyShootout = /tanda|penaltis?|shootout/i.test(goalText);
      const isPenalty =
        (/\((?:p|penalti|penalty)\)/i.test(goalText) || /\bpen(?:alti|alty)\b/i.test(goalText)) && !isPenaltyShootout;
      const isExtraTime = /pr[oó]rroga|extra\s*time|\bET\b/i.test(goalText);
      const goalWithoutTags = goalText
        .replace(/\((?:p|penalti|penalty|pr[oó]rroga|extra time|et|tanda|penaltis?|shootout)\)/gi, "")
        .replace(/\b(?:penalti|penalty|pr[oó]rroga|extra time|tanda|penaltis?|shootout)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      const minuteMatch = goalWithoutTags.match(/\s+(\d{1,3}(?:\+\d{1,2})?)['’′]?\s*$/);
      const playerName = goalWithoutTags.replace(/\s+\d{1,3}(?:\+\d{1,2})?['’′]?\s*$/, "").trim();
      if (isPenaltyShootout) {
        issues.push({
          level: "info",
          message: `${playerName || goalText} parece de tanda de penaltis. Se guardara marcado como tanda y no puntuara.`,
        });
      }
      const scorer = findByName(scorers, playerName);
      if (!scorer) {
        issues.push({
          level: "info",
          message: `${playerName} no existe en scorers. Se guardara con scorer_id null y no sumara como goleador.`,
        });
      }

      parsedGoals.push({
        playerName,
        minute: minuteMatch?.[1] ?? null,
        teamSide: currentSide,
        teamName: currentSide === "home" ? homeTeam : awayTeam,
        teamId: currentSide === "home" ? getId(homeTeamRow) : getId(awayTeamRow),
        scorerId: scorer ? getId(scorer) : null,
        scorerMatched: Boolean(scorer),
        isPenalty,
        isExtraTime,
        isPenaltyShootout,
      });
    }
  } else if (homeGoals + awayGoals > 0) {
    issues.push({ level: "warning", message: 'No se encontro la seccion "GOLES:". Se guardara el marcador sin goleadores.' });
  }

  const homeParsedGoals = parsedGoals.filter((goal) => goal.teamSide === "home").length;
  const awayParsedGoals = parsedGoals.filter((goal) => goal.teamSide === "away").length;
  if (goalsIndex !== -1 && homeParsedGoals !== homeGoals) {
    issues.push({
      level: "warning",
      message: `${homeTeam}: el marcador dice ${homeGoals} gol(es), pero se detectaron ${homeParsedGoals}.`,
    });
  }
  if (goalsIndex !== -1 && awayParsedGoals !== awayGoals) {
    issues.push({
      level: "warning",
      message: `${awayTeam}: el marcador dice ${awayGoals} gol(es), pero se detectaron ${awayParsedGoals}.`,
    });
  }

  const notes = parseNotes(nonEmpty, notesIndex);
  if (notes.some((note) => /tanda|penaltis/i.test(note))) {
    issues.push({ level: "info", message: "Las tandas de penaltis no se guardan como goles puntuables." });
  }

  const matchDate = new Date().toISOString().slice(0, 10);

  return {
    valid: !issues.some((issue) => issue.level === "error"),
    match: {
      homeTeam,
      awayTeam,
      homeTeamId: getId(homeTeamRow),
      awayTeamId: getId(awayTeamRow),
      homeGoals,
      awayGoals,
      matchDate,
    },
    goals: parsedGoals,
    notes,
    issues,
  };
}

function emptyPreview(issues: ParsedMatchPreview["issues"]): ParsedMatchPreview {
  return { valid: false, match: null, goals: [], notes: [], issues };
}

function parseNotes(lines: string[], notesIndex: number) {
  if (notesIndex === -1) return [];

  return lines
    .slice(notesIndex + 1)
    .filter((line) => /^[*\-·•]/.test(line))
    .map((line) => line.replace(/^[*\-·•]\s*/, ""));
}

function findByName(rows: DbRow[], name: string) {
  const normalized = normalizeName(name);
  return rows.find((row) => {
    const rowName = normalizeName(getString(row, ["name", "display_name", "team_name", "scorer_name"], ""));
    return rowName === normalized || rowName.includes(normalized) || normalized.includes(rowName);
  });
}

function sameName(a: string, b: string) {
  return normalizeName(a) === normalizeName(b);
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function getId(row: DbRow | undefined) {
  return getString(row, ["id", "uuid"], "") || null;
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
