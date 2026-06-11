export type TeamPick = {
  flag: string;
  name: string;
  points: number;
};

export type ScorerPick = {
  flag: string;
  name: string;
  goals: number;
  points: number;
};

export type Participant = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  totalPoints: number;
  todayPoints: number;
  teams: TeamPick[];
  scorers: ScorerPick[];
};

export type ActivityEvent = {
  type: "team_win" | "team_draw" | "team_loss" | "team_goals" | "scorer" | "bonus";
  flag: string;
  description: string;
  points: number;
};

export type ActivityDay = {
  date: string;
  events: ActivityEvent[];
  total: number;
};

export type EvolutionPoint = {
  date: string;
  scores: Record<string, number>;
};

export const FIFA_COLORS = {
  black: "#000000",
  red: "#E8002D",
  blue: "#003DA5",
  purple: "#7B2D8B",
  cyan: "#00A2C7",
  lime: "#B8D800",
  green: "#006847",
  maroon: "#5C0000",
  whatsapp: "#25D366",
};

export const PARTICIPANTS: Participant[] = [
  {
    id: "julen",
    name: "Julen",
    avatar: "J",
    color: FIFA_COLORS.black,
    totalPoints: 48,
    todayPoints: 8,
    teams: [
      { flag: "🇪🇸", name: "España", points: 12 },
      { flag: "🇫🇷", name: "Francia", points: 10 },
      { flag: "🇵🇹", name: "Portugal", points: 8 },
      { flag: "🇳🇴", name: "Noruega", points: 6 },
      { flag: "🇨🇿", name: "Rep. Checa", points: 4 },
    ],
    scorers: [
      { flag: "🇫🇷", name: "Mbappe", goals: 4, points: 8 },
      { flag: "🇪🇸", name: "Oyarzabal", goals: 2, points: 4 },
      { flag: "🇵🇹", name: "C. Ronaldo", goals: 1, points: 2 },
    ],
  },
  {
    id: "unai",
    name: "Unai",
    avatar: "U",
    color: FIFA_COLORS.red,
    totalPoints: 45,
    todayPoints: 3,
    teams: [
      { flag: "🇦🇷", name: "Argentina", points: 11 },
      { flag: "🇧🇷", name: "Brasil", points: 9 },
      { flag: "🇩🇪", name: "Alemania", points: 8 },
      { flag: "🇧🇪", name: "Belgica", points: 5 },
      { flag: "🇲🇦", name: "Marruecos", points: 4 },
    ],
    scorers: [
      { flag: "🇦🇷", name: "Messi", goals: 3, points: 6 },
      { flag: "🇵🇱", name: "Lewandowski", goals: 2, points: 4 },
      { flag: "🏴", name: "Bellingham", goals: 1, points: 2 },
    ],
  },
  {
    id: "xabi",
    name: "Xabi",
    avatar: "X",
    color: FIFA_COLORS.blue,
    totalPoints: 42,
    todayPoints: -1,
    teams: [
      { flag: "🏴", name: "Inglaterra", points: 10 },
      { flag: "🇮🇹", name: "Italia", points: 9 },
      { flag: "🇳🇱", name: "Paises Bajos", points: 8 },
      { flag: "🇺🇸", name: "Estados Unidos", points: 4 },
      { flag: "🇯🇵", name: "Japon", points: 3 },
    ],
    scorers: [
      { flag: "🏴", name: "Kane", goals: 3, points: 6 },
      { flag: "🇪🇬", name: "Salah", goals: 2, points: 4 },
      { flag: "🇺🇸", name: "Pulisic", goals: 1, points: 2 },
    ],
  },
  {
    id: "mikel",
    name: "Mikel",
    avatar: "M",
    color: FIFA_COLORS.purple,
    totalPoints: 38,
    todayPoints: 5,
    teams: [
      { flag: "🇺🇾", name: "Uruguay", points: 9 },
      { flag: "🇲🇽", name: "Mexico", points: 8 },
      { flag: "🇸🇳", name: "Senegal", points: 7 },
      { flag: "🇨🇭", name: "Suiza", points: 5 },
      { flag: "🇭🇷", name: "Croacia", points: 4 },
    ],
    scorers: [
      { flag: "🇺🇾", name: "D. Nunez", goals: 2, points: 4 },
      { flag: "🇲🇽", name: "Lozano", goals: 2, points: 4 },
      { flag: "🇸🇳", name: "Mane", goals: 1, points: 2 },
    ],
  },
  {
    id: "gorka",
    name: "Gorka",
    avatar: "G",
    color: FIFA_COLORS.cyan,
    totalPoints: 35,
    todayPoints: 2,
    teams: [
      { flag: "🇨🇴", name: "Colombia", points: 8 },
      { flag: "🇲🇽", name: "Mexico", points: 7 },
      { flag: "🇬🇭", name: "Ghana", points: 6 },
      { flag: "🇨🇷", name: "Costa Rica", points: 4 },
      { flag: "🇦🇺", name: "Australia", points: 3 },
    ],
    scorers: [
      { flag: "🇧🇷", name: "Vinicius", goals: 2, points: 4 },
      { flag: "🇳🇴", name: "Haaland", goals: 2, points: 4 },
      { flag: "🇨🇴", name: "James R.", goals: 1, points: 2 },
    ],
  },
  {
    id: "ander",
    name: "Ander",
    avatar: "A",
    color: FIFA_COLORS.green,
    totalPoints: 30,
    todayPoints: 0,
    teams: [
      { flag: "🇪🇸", name: "España", points: 8 },
      { flag: "🇲🇽", name: "Mexico", points: 7 },
      { flag: "🇸🇦", name: "Arabia S.", points: 6 },
      { flag: "🇨🇱", name: "Chile", points: 5 },
      { flag: "🇬🇷", name: "Grecia", points: 4 },
    ],
    scorers: [
      { flag: "🇪🇸", name: "Morata", goals: 2, points: 4 },
      { flag: "🇲🇽", name: "H. Lozano", goals: 1, points: 2 },
      { flag: "🇸🇦", name: "Al-Dawsari", goals: 1, points: 2 },
    ],
  },
  {
    id: "inaki",
    name: "Inaki",
    avatar: "I",
    color: FIFA_COLORS.lime,
    totalPoints: 26,
    todayPoints: 2,
    teams: [
      { flag: "🇩🇪", name: "Alemania", points: 7 },
      { flag: "🇨🇦", name: "Canada", points: 6 },
      { flag: "🇰🇷", name: "Corea Sur", points: 5 },
      { flag: "🇵🇦", name: "Panama", points: 4 },
      { flag: "🇹🇿", name: "Tanzania", points: 4 },
    ],
    scorers: [
      { flag: "🇩🇪", name: "Wirtz", goals: 2, points: 4 },
      { flag: "🇨🇦", name: "David", goals: 1, points: 2 },
      { flag: "🇰🇷", name: "Son", goals: 1, points: 2 },
    ],
  },
  {
    id: "aitor",
    name: "Aitor",
    avatar: "A2",
    color: FIFA_COLORS.maroon,
    totalPoints: 22,
    todayPoints: 1,
    teams: [
      { flag: "🇳🇬", name: "Nigeria", points: 6 },
      { flag: "🇪🇨", name: "Ecuador", points: 5 },
      { flag: "🏴", name: "Escocia", points: 4 },
      { flag: "🇹🇳", name: "Tunez", points: 4 },
      { flag: "🇧🇴", name: "Bolivia", points: 3 },
    ],
    scorers: [
      { flag: "🇳🇬", name: "Osimhen", goals: 1, points: 2 },
      { flag: "🇪🇨", name: "Valencia", goals: 1, points: 2 },
      { flag: "🏴", name: "Adams", goals: 1, points: 2 },
    ],
  },
];

export const EVOLUTION_DATA: EvolutionPoint[] = [
  { date: "5 jun", scores: { Julen: 22, Unai: 25, Xabi: 20, Mikel: 15, Gorka: 10, Ander: 12, Inaki: 8, Aitor: 5 } },
  { date: "6 jun", scores: { Julen: 26, Unai: 28, Xabi: 24, Mikel: 19, Gorka: 15, Ander: 16, Inaki: 12, Aitor: 9 } },
  { date: "7 jun", scores: { Julen: 31, Unai: 30, Xabi: 29, Mikel: 23, Gorka: 18, Ander: 20, Inaki: 15, Aitor: 12 } },
  { date: "8 jun", scores: { Julen: 36, Unai: 35, Xabi: 34, Mikel: 27, Gorka: 22, Ander: 24, Inaki: 18, Aitor: 15 } },
  { date: "9 jun", scores: { Julen: 40, Unai: 40, Xabi: 38, Mikel: 31, Gorka: 28, Ander: 27, Inaki: 21, Aitor: 18 } },
  { date: "10 jun", scores: { Julen: 46, Unai: 42, Xabi: 43, Mikel: 36, Gorka: 33, Ander: 30, Inaki: 24, Aitor: 21 } },
  { date: "11 jun", scores: { Julen: 48, Unai: 45, Xabi: 42, Mikel: 38, Gorka: 35, Ander: 30, Inaki: 26, Aitor: 22 } },
];

export const ACTIVITY_DATA: Record<string, ActivityDay[]> = {
  julen: [
    {
      date: "11 jun",
      total: 8,
      events: [
        { type: "team_win", flag: "🇵🇹", description: "Portugal victoria", points: 3 },
        { type: "team_goals", flag: "🇵🇹", description: "Portugal marca 2 goles", points: 2 },
        { type: "scorer", flag: "🇵🇹", description: "C. Ronaldo marca", points: 3 },
      ],
    },
    {
      date: "10 jun",
      total: 6,
      events: [
        { type: "team_win", flag: "🇪🇸", description: "España victoria", points: 3 },
        { type: "team_goals", flag: "🇪🇸", description: "España marca 3 goles", points: 3 },
        { type: "team_draw", flag: "🇫🇷", description: "Francia empata", points: 1 },
        { type: "team_loss", flag: "🇨🇿", description: "Rep. Checa eliminada", points: -4 },
        { type: "scorer", flag: "🇫🇷", description: "Mbappe marca", points: 3 },
      ],
    },
    {
      date: "9 jun",
      total: 7,
      events: [
        { type: "team_win", flag: "🇫🇷", description: "Francia victoria", points: 3 },
        { type: "scorer", flag: "🇫🇷", description: "Mbappe doblete", points: 6 },
        { type: "team_loss", flag: "🇳🇴", description: "Noruega derrota", points: -2 },
      ],
    },
  ],
};

export const RECENT_ACTIVITY = PARTICIPANTS.map((participant) => ({
  participant,
  days:
    ACTIVITY_DATA[participant.id] ??
    [
      {
        date: "11 jun",
        total: participant.todayPoints,
        events: participant.todayPoints
          ? [
              {
                type: participant.todayPoints > 0 ? "team_win" : "team_loss",
                flag: participant.teams[0].flag,
                description: `${participant.teams[0].name} actualiza puntuacion`,
                points: participant.todayPoints,
              },
            ]
          : [{ type: "team_draw", flag: participant.teams[0].flag, description: "Jornada sin cambios", points: 0 }],
      },
    ],
}));

export const TOP_SCORER = { name: "Mbappe", flag: "🇫🇷", goals: 4 };
export const TOP_TEAM = { name: "España", flag: "🇪🇸", points: 12 };
export const BIGGEST_RISER = { name: "Julen", points: 8 };
