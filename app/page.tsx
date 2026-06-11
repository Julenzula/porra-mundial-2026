"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FIFA_COLORS,
  type ActivityDay,
  type EvolutionPoint,
  type Participant,
} from "./data";
import { fetchPorraData, type PorraData } from "./supabase/porra-data";

type TabId = "ranking" | "actividad" | "evolucion" | "participantes" | "compartir";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "ranking", label: "Ranking", icon: "🏆" },
  { id: "actividad", label: "Actividad", icon: "▦" },
  { id: "evolucion", label: "Evolución", icon: "↗" },
  { id: "participantes", label: "Equipos", icon: "◎" },
  { id: "compartir", label: "Compartir", icon: "💬" },
];

const RANK_COLORS = [
  FIFA_COLORS.green,
  FIFA_COLORS.red,
  FIFA_COLORS.blue,
  FIFA_COLORS.purple,
  FIFA_COLORS.cyan,
  FIFA_COLORS.green,
  FIFA_COLORS.lime,
  FIFA_COLORS.maroon,
];

const EVENT_CONFIG = {
  team_win: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Victoria" },
  team_draw: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Empate" },
  team_loss: { bg: "bg-red-50", text: "text-[#E8002D]", label: "Derrota" },
  team_goals: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Goles" },
  scorer: { bg: "bg-purple-50", text: "text-purple-700", label: "Goleador" },
  bonus: { bg: "bg-lime-50", text: "text-lime-700", label: "Bonus" },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("ranking");
  const [data, setData] = useState<PorraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const porraData = await fetchPorraData();
        if (!cancelled) setData(porraData);
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "No se han podido cargar los datos.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => data?.participants ?? [], [data]);

  const message = useMemo(
    () =>
      data
        ? buildShareMessage(sorted, data.biggestRiser, data.topScorer, data.topTeam)
        : "",
    [data, sorted],
  );

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <main className="min-h-screen bg-neutral-200 text-neutral-950">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-white shadow-2xl shadow-black/10">
        <Hero onShare={shareToWhatsApp} />
        <TabNav activeTab={activeTab} onChange={setActiveTab} />

        {loading && <LoadingState />}
        {error && !loading && <ErrorState message={error} />}
        {data && !loading && !error && (
          <>
            {activeTab === "ranking" && <Ranking participants={sorted} />}
            {activeTab === "actividad" && (
              <Activity participants={sorted} activityByParticipant={data.activityByParticipant} />
            )}
            {activeTab === "evolucion" && (
              <Evolution participants={sorted} evolutionData={data.evolutionData} />
            )}
            {activeTab === "participantes" && <Participants participants={sorted} />}
            {activeTab === "compartir" && <WhatsAppShare message={message} onShare={shareToWhatsApp} />}
          </>
        )}

        <div className="h-8" />
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <section className="bg-white px-4 py-10">
      <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-8 text-center">
        <p className="font-display text-xl font-black uppercase tracking-normal text-neutral-900">Cargando porra</p>
        <p className="mt-2 text-sm text-neutral-500">Leyendo datos de Supabase...</p>
      </div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="bg-white px-4 py-10">
      <div className="rounded-2xl border border-[#E8002D]/25 bg-red-50 px-4 py-8 text-center">
        <p className="font-display text-xl font-black uppercase tracking-normal text-[#E8002D]">Error cargando datos</p>
        <p className="mt-2 text-sm text-red-900/70">{message}</p>
      </div>
    </section>
  );
}

function Hero({ onShare }: { onShare: () => void }) {
  return (
    <header className="bg-white">
      <div className="relative h-[188px] overflow-hidden">
        <PatternRings />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60" />
        <div className="absolute inset-0 flex flex-col justify-end px-4 pb-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ff4d6d]" />
                <span className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#ff4d6d]">
                  En vivo
                </span>
                <span className="text-xs text-white/40">·</span>
                <span className="text-[0.65rem] text-white/75">11 junio · Jornada 7</span>
              </div>
              <h1 className="font-display text-[3rem] font-black uppercase leading-[0.86] tracking-normal text-white drop-shadow">
                Porra
                <span className="block text-[#ff4d6d]">Mundial 2026</span>
              </h1>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5 pb-1">
              <button className="rounded-lg border border-white/50 bg-white/15 px-3 py-2 text-[0.7rem] font-semibold text-white backdrop-blur">
                ↻ Actualizar
              </button>
              <button
                onClick={onShare}
                className="rounded-lg bg-[#25D366] px-3 py-2 text-[0.7rem] font-bold text-white"
              >
                💬 Compartir
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-2">
        <p className="truncate text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Donde cojones esta Curacao?
        </p>
        <p className="shrink-0 rounded border border-black/10 bg-black/[0.04] px-2 py-0.5 text-[0.58rem] font-semibold text-neutral-500">
          Act. 11 jun · 08:00
        </p>
      </div>
    </header>
  );
}

function PatternRings() {
  const rings = [
    ["w-[1100px] h-[820px] rounded-[130px] bg-[#003DA5]"],
    ["w-[960px] h-[720px] rounded-[116px] bg-[#B8D800]"],
    ["w-[820px] h-[620px] rounded-[102px] bg-[#7B2D8B]"],
    ["w-[680px] h-[520px] rounded-[88px] bg-[#00A2C7]"],
    ["w-[560px] h-[420px] rounded-[76px] bg-[#E8002D]"],
    ["w-[440px] h-[330px] rounded-[64px] bg-[#5C0000]"],
    ["w-[330px] h-[248px] rounded-[52px] bg-[#B8D800]"],
    ["w-[230px] h-[172px] rounded-[40px] bg-[#006847]"],
    ["w-[140px] h-[100px] rounded-[26px] bg-[#E8002D]"],
  ];

  return (
    <>
      {rings.map(([className], index) => (
        <div
          key={index}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${className}`}
        />
      ))}
    </>
  );
}

function TabNav({ activeTab, onChange }: { activeTab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="sticky top-0 z-30 border-b border-black/10 bg-white/95 backdrop-blur-xl">
      <div className="flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              aria-label={`Ver ${tab.label}`}
              data-tab={tab.id}
              className="relative flex min-w-[86px] shrink-0 items-center justify-center gap-1.5 px-3 py-3.5"
            >
              <span className={`text-[0.82rem] ${active ? "opacity-100" : "opacity-35"}`}>{tab.icon}</span>
              <span className={`text-[0.72rem] ${active ? "font-bold text-black" : "font-medium text-neutral-400"}`}>
                {tab.label}
              </span>
              {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#E8002D]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SectionTitle({ label, aside }: { label: string; aside?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pb-3 pt-4">
      <h2 className="font-display text-xs font-black uppercase tracking-[0.15em] text-neutral-400">{label}</h2>
      {aside && <p className="text-xs text-neutral-400">{aside}</p>}
    </div>
  );
}

function Ranking({ participants }: { participants: Participant[] }) {
  const leader = participants[0];
  return (
    <section className="bg-white">
      <SectionTitle label="Clasificacion · Jornada 7" aside={`${participants.length} participantes`} />

      <article className="mx-4 mb-3 overflow-hidden rounded-2xl bg-[#006847] px-5 py-5 text-white">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1.5 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-white/65">🏆 Lider · Jornada 7</p>
            <h3 className="font-display text-[2.65rem] font-black uppercase leading-none tracking-normal">
              {leader.name}
            </h3>
          </div>
          <div className="text-right">
            <p className="font-display text-[3.6rem] font-black leading-none tracking-normal">{leader.totalPoints}</p>
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/55">puntos</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Flags participant={leader} />
          <p className="text-xs font-bold text-white/90">↗ +{leader.todayPoints} hoy</p>
        </div>
      </article>

      <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-black/10">
        {participants.slice(1).map((participant, index) => {
          const position = index + 2;
          const color = RANK_COLORS[index + 1];
          return (
            <article key={participant.id} className="relative border-b border-black/[0.06] last:border-0">
              <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r" style={{ background: color }} />
              <div className="flex items-center gap-3 px-4 py-3">
                <p className="w-5 shrink-0 text-center font-display text-lg font-black" style={{ color }}>
                  {position}
                </p>
                <Avatar participant={participant} color={color} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-xl font-extrabold leading-none">{participant.name}</h3>
                  <Flags participant={participant} small />
                </div>
                <DailyPoints points={participant.todayPoints} />
                <div className="w-11 shrink-0 text-right">
                  <p className="font-display text-3xl font-black leading-none tracking-normal" style={{ color }}>
                    {participant.totalPoints}
                  </p>
                  <p className="text-[0.52rem] font-semibold uppercase tracking-[0.1em] text-neutral-400">pts</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="pb-4 text-center text-xs text-neutral-300">Actualizado 11 jun · 08:00</p>
    </section>
  );
}

function Activity({
  participants,
  activityByParticipant,
}: {
  participants: Participant[];
  activityByParticipant: Record<string, ActivityDay[]>;
}) {
  const [selectedId, setSelectedId] = useState(participants[0]?.id ?? "");
  const effectiveSelectedId = participants.some((participant) => participant.id === selectedId)
    ? selectedId
    : participants[0]?.id ?? "";
  const selected = participants.find((p) => p.id === effectiveSelectedId) ?? participants[0];
  const days = selected ? activityByParticipant[selected.id] ?? [] : [];

  if (!selected) return null;

  return (
    <section className="bg-white">
      <SectionTitle label="Actividad · Ultimos movimientos" aside="Supabase" />
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {participants.map((participant) => {
          const active = participant.id === effectiveSelectedId;
          return (
            <button
              key={participant.id}
              onClick={() => setSelectedId(participant.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 ${
                active ? "border-black bg-black text-white" : "border-black/10 bg-white text-neutral-700"
              }`}
            >
              <span className="font-display text-sm font-black">{participant.avatar}</span>
              <span className="text-xs font-semibold">{participant.name}</span>
            </button>
          );
        })}
      </div>
      <div className="border-y border-black/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar participant={selected} color={selected.color} square />
            <div>
              <h3 className="font-display text-2xl font-black uppercase leading-none">{selected.name}</h3>
              <p className="mt-1 text-xs text-neutral-500">{selected.totalPoints} pts totales</p>
            </div>
          </div>
          <DailyPoints points={selected.todayPoints} large />
        </div>
      </div>
      <div className="space-y-3 px-4 py-4">
        {days.map((day, index) => (
          <DayCard key={day.date} day={day} isToday={index === 0} />
        ))}
      </div>
    </section>
  );
}

function DayCard({ day, isToday }: { day: ActivityDay; isToday: boolean }) {
  return (
    <article className={`overflow-hidden rounded-xl border ${isToday ? "border-[#E8002D]/30" : "border-black/10"}`}>
      <div className={`flex items-center justify-between px-4 py-3 ${isToday ? "bg-[#E8002D]/[0.04]" : "bg-white"}`}>
        <div className="flex items-center gap-2">
          {isToday && <span className="h-1.5 w-1.5 rounded-full bg-[#E8002D]" />}
          <h3 className={`text-sm font-bold ${isToday ? "text-[#E8002D]" : "text-neutral-800"}`}>
            {isToday ? `Hoy · ${day.date}` : day.date}
          </h3>
          <span className="text-[0.68rem] text-neutral-400">{day.events.length} eventos</span>
        </div>
        <DailyPoints points={day.total} />
      </div>
      <div className="border-t border-black/[0.06]">
        {day.events.map((event, index) => {
          const config = EVENT_CONFIG[event.type];
          return (
            <div key={`${event.description}-${index}`} className="flex items-center justify-between gap-3 border-b border-black/[0.05] px-4 py-2.5 last:border-0">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${config.bg}`}>{event.flag}</span>
                <div className="min-w-0">
                  <p className="truncate text-[0.78rem] font-medium text-neutral-900">{event.description}</p>
                  <p className={`text-[0.62rem] font-bold uppercase tracking-[0.06em] ${config.text}`}>{config.label}</p>
                </div>
              </div>
              <Points points={event.points} />
            </div>
          );
        })}
      </div>
    </article>
  );
}

function Evolution({
  participants,
  evolutionData,
}: {
  participants: Participant[];
  evolutionData: EvolutionPoint[];
}) {
  const max = Math.max(60, ...participants.map((participant) => participant.totalPoints));
  const width = 360;
  const height = 220;
  const padding = { top: 16, right: 14, bottom: 28, left: 28 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const pointsFor = (name: string) =>
    evolutionData.map((point, index) => {
      const divisor = Math.max(evolutionData.length - 1, 1);
      const x = padding.left + (index / divisor) * chartWidth;
      const y = padding.top + chartHeight - ((point.scores[name] ?? 0) / max) * chartHeight;
      return `${x},${y}`;
    }).join(" ");

  return (
    <section className="bg-white">
      <SectionTitle label="Evolucion · Ultimas 7 jornadas" />
      <div className="px-4">
        <div className="overflow-hidden rounded-2xl border border-black/10">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-black/[0.06] px-4 py-4">
            {participants.map((participant, index) => (
              <div key={participant.id} className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: RANK_COLORS[index] }} />
                <span className="text-xs font-medium text-neutral-600">{participant.name}</span>
              </div>
            ))}
          </div>
          <div className="bg-neutral-50 px-2 py-3">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full" role="img" aria-label="Evolucion de puntos por participante">
              {[0, 20, 40, 60].map((tick) => {
                const y = padding.top + chartHeight - (tick / max) * chartHeight;
                return (
                  <g key={tick}>
                    <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(0,0,0,0.06)" strokeDasharray="4 4" />
                    <text x={padding.left - 8} y={y + 3} textAnchor="end" className="fill-neutral-400 text-[9px]">
                      {tick}
                    </text>
                  </g>
                );
              })}
              {evolutionData.map((point, index) => {
                const divisor = Math.max(evolutionData.length - 1, 1);
                const x = padding.left + (index / divisor) * chartWidth;
                return (
                  <text key={point.date} x={x} y={height - 8} textAnchor="middle" className="fill-neutral-400 text-[9px]">
                    {point.date.replace(" ", "\n")}
                  </text>
                );
              })}
              {participants.map((participant, index) => (
                <polyline
                  key={participant.id}
                  fill="none"
                  points={pointsFor(participant.name)}
                  stroke={RANK_COLORS[index]}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={index === 0 ? 3 : 1.8}
                />
              ))}
              {participants.slice(0, 4).flatMap((participant, participantIndex) =>
                evolutionData.map((point, index) => {
                  const divisor = Math.max(evolutionData.length - 1, 1);
                  const x = padding.left + (index / divisor) * chartWidth;
                  const y = padding.top + chartHeight - ((point.scores[participant.name] ?? 0) / max) * chartHeight;
                  return <circle key={`${participant.id}-${point.date}`} cx={x} cy={y} r={2.4} fill={RANK_COLORS[participantIndex]} />;
                }),
              )}
            </svg>
          </div>
        </div>
      </div>
      <div className="px-4 pb-5 pt-3">
        <div className="overflow-hidden rounded-2xl border border-black/10">
          {participants.map((participant, index) => (
            <div key={participant.id} className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-2.5 last:border-0">
              <span className="w-4 text-center font-display text-base font-black" style={{ color: RANK_COLORS[index] }}>
                {index + 1}
              </span>
              <span className="h-2 w-2 rounded-full" style={{ background: RANK_COLORS[index] }} />
              <span className="flex-1 font-display text-lg font-bold">{participant.name}</span>
              <span className="font-display text-2xl font-black leading-none" style={{ color: RANK_COLORS[index] }}>
                {participant.totalPoints}
              </span>
              <span className="text-xs font-semibold text-neutral-400">pts</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Participants({ participants }: { participants: Participant[] }) {
  const [openId, setOpenId] = useState(participants[0].id);

  return (
    <section className="bg-white">
      <SectionTitle label="Participantes · Equipos y goleadores" />
      <div className="px-4 pb-5">
        <div className="overflow-hidden rounded-2xl border border-black/10">
          {participants.map((participant, index) => {
            const open = participant.id === openId;
            const color = RANK_COLORS[index];
            return (
              <article key={participant.id} className={`relative border-b border-black/[0.06] last:border-0 ${open ? "bg-neutral-50" : "bg-white"}`}>
                {open && <span className="absolute left-0 inset-y-0 w-[3px]" style={{ background: color }} />}
                <button className="flex w-full items-center gap-3 px-4 py-4 text-left" onClick={() => setOpenId(open ? "" : participant.id)}>
                  <span className="w-5 text-center font-display text-base font-black" style={{ color }}>{index + 1}</span>
                  <Avatar participant={participant} color={color} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-xl font-extrabold leading-none">{participant.name}</h3>
                    <Flags participant={participant} small />
                  </div>
                  <span className="font-display text-3xl font-black leading-none tracking-normal" style={{ color: open ? color : "#000" }}>
                    {participant.totalPoints}
                  </span>
                  <span className={`text-sm text-neutral-400 transition ${open ? "rotate-180" : ""}`}>⌄</span>
                </button>
                {open && (
                  <div className="border-t border-black/[0.06] px-4 pb-4">
                    <PickList title="Equipos elegidos">
                      {participant.teams.map((team) => (
                        <Row key={team.name} left={`${team.flag} ${team.name}`} right={`+${team.points} pts`} color={color} />
                      ))}
                    </PickList>
                    <PickList title="Goleadores">
                      {participant.scorers.map((scorer) => (
                        <Row key={scorer.name} left={`⚽ ${scorer.name}`} meta={`${scorer.flag} ${scorer.goals}g`} right={`+${scorer.points} pts`} color={FIFA_COLORS.green} />
                      ))}
                    </PickList>
                    <div className="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-3">
                      <span className="text-[0.58rem] font-bold uppercase tracking-[0.15em] text-neutral-400">Total</span>
                      <span className="font-display text-2xl font-black leading-none" style={{ color }}>{participant.totalPoints} PTS</span>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WhatsAppShare({ message, onShare }: { message: string; onShare: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="bg-white">
      <SectionTitle label="Compartir · WhatsApp" />
      <div className="px-4 pb-10">
        <div className="mb-3 overflow-hidden rounded-2xl border border-black/10">
          <div className="flex items-center justify-between border-b border-black/[0.06] bg-neutral-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[#25D366]">💬</span>
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-neutral-400">Vista previa</span>
            </div>
            <button onClick={handleCopy} className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-600">
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap px-4 py-4 font-sans text-[0.75rem] leading-7 text-neutral-700">
            {message.replaceAll("*", "").replaceAll("_", "")}
          </pre>
        </div>
        <button
          onClick={onShare}
          className="w-full rounded-2xl bg-[#25D366] py-4 font-display text-base font-black uppercase tracking-[0.06em] text-white"
        >
          💬 Compartir en WhatsApp
        </button>
      </div>
    </section>
  );
}

function PickList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h4 className="mb-2 text-[0.58rem] font-bold uppercase tracking-[0.15em] text-neutral-400">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ left, meta, right, color }: { left: string; meta?: string; right: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <p className="min-w-0 truncate text-sm text-neutral-700">
        {left} {meta && <span className="ml-1 text-xs text-neutral-400">{meta}</span>}
      </p>
      <p className="shrink-0 text-xs font-bold" style={{ color }}>{right}</p>
    </div>
  );
}

function Avatar({ participant, color, square = false }: { participant: Participant; color: string; square?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center border font-display font-black ${square ? "h-11 w-11 rounded-xl text-lg text-white" : "h-8 w-8 rounded-full text-sm"}`}
      style={{
        background: square ? color : `${color}12`,
        borderColor: square ? color : color,
        color: square ? "#fff" : color,
      }}
    >
      {participant.avatar}
    </span>
  );
}

function Flags({ participant, small = false }: { participant: Participant; small?: boolean }) {
  return (
    <div className={`flex gap-1 ${small ? "mt-1" : ""}`}>
      {participant.teams.slice(0, 5).map((team) => (
        <span key={`${participant.id}-${team.name}`} className={small ? "text-xs leading-none" : "text-lg leading-none"} title={team.name}>
          {team.flag}
        </span>
      ))}
    </div>
  );
}

function DailyPoints({ points, large = false }: { points: number; large?: boolean }) {
  const positive = points > 0;
  const neutral = points === 0;
  const color = positive ? "text-emerald-700" : neutral ? "text-neutral-500" : "text-[#E8002D]";
  const bg = positive ? "bg-emerald-50" : neutral ? "bg-neutral-100" : "bg-red-50";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full ${bg} ${large ? "px-2.5 py-1 text-xl" : "px-2 py-0.5 text-xs"} font-extrabold ${color}`}>
      {positive ? "↗" : neutral ? "−" : "↘"} {positive ? `+${points}` : neutral ? "0" : points}
    </span>
  );
}

function Points({ points }: { points: number }) {
  return (
    <span className={`w-10 shrink-0 text-right text-sm font-bold ${points >= 0 ? "text-emerald-700" : "text-[#E8002D]"}`}>
      {points > 0 ? `+${points}` : points}
    </span>
  );
}

function buildShareMessage(
  sorted: Participant[],
  biggestRiser: { name: string; points: number },
  topScorer: { name: string; flag: string; goals: number },
  topTeam: { name: string; flag: string; points: number },
) {
  const medals = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8."];
  return [
    "🏆 *PORRA MUNDIAL 2026*",
    "📅 11 junio · Jornada 7",
    "─────────────────",
    ...sorted.map(
      (participant, index) =>
        `${medals[index]} *${participant.name}* — ${participant.totalPoints} pts${
          participant.todayPoints > 0 ? ` _(+${participant.todayPoints})_` : ""
        }`,
    ),
    "─────────────────",
    `🔥 Mayor subida: *${biggestRiser.name}* +${biggestRiser.points}`,
    `⚽ Top goleador: *${topScorer.name}* ${topScorer.flag} ${topScorer.goals} goles`,
    `🌍 Top equipo: *${topTeam.flag} ${topTeam.name}* +${topTeam.points}`,
    "",
    "💪 ¡Vamos que podemos!",
  ].join("\n");
}
