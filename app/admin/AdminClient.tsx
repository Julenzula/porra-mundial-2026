"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Issue = { level: "error" | "warning" | "info"; message: string };
type Preview = {
  valid: boolean;
  match: {
    homeTeam: string;
    awayTeam: string;
    homeGoals: number;
    awayGoals: number;
  } | null;
  goals: Array<{
    playerName: string;
    minute: string | null;
    teamName: string;
    scorerMatched: boolean;
  }>;
  notes: string[];
  issues: Issue[];
};

const PLACEHOLDER = `PARTIDO:
Portugal 2-0 República Checa

GOLES:
Portugal:
* Cristiano Ronaldo 34'
* Bruno Fernandes 72'

República Checa:
* Sin goles

NOTAS:
* No hubo goles en tanda de penaltis.`;

export function AdminClient({
  initialAuthenticated,
  configError,
}: {
  initialAuthenticated: boolean;
  configError: string | null;
}) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [password, setPassword] = useState("");
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (authenticated) textareaRef.current?.focus();
  }, [authenticated]);

  async function login() {
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      setStatus("error");
      setMessage(data.error ?? "No se ha podido iniciar sesión.");
      setPassword("");
      return;
    }

    setAuthenticated(true);
    setStatus("idle");
    router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setPassword("");
    setPreview(null);
    setStatus("idle");
    router.refresh();
  }

  async function interpret() {
    setStatus("loading");
    setMessage("");
    setPreview(null);

    const response = await fetch("/api/admin/parse-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      setStatus("error");
      setMessage(data.error ?? "No se ha podido interpretar el resultado.");
      return;
    }

    setPreview(data.preview);
    setStatus("idle");
  }

  async function confirm() {
    setStatus("saving");
    setMessage("");

    const response = await fetch("/api/admin/import-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      setStatus("error");
      setMessage(data.error ?? "No se ha podido guardar el resultado.");
      if (data.preview) setPreview(data.preview);
      return;
    }

    setStatus("success");
    setMessage("Resultado guardado y ranking recalculado.");
    setPreview(data.preview);
  }

  return (
    <main className="min-h-screen bg-[#f2f2f5] text-neutral-950">
      <div className="mx-auto min-h-screen w-full max-w-[480px]">
        <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 px-5 pb-4 pt-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#E8002D] to-[#9b0020] text-white">
              ⚑
            </div>
            <div>
              <h1 className="font-display text-xl font-black uppercase leading-none tracking-normal">ADMIN</h1>
              <p className="mt-1 text-[0.68rem] text-neutral-500">Carga resultados y recalcula la porra</p>
            </div>
            <span className="ml-auto rounded-full border border-[#E8002D]/15 bg-[#E8002D]/10 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#E8002D]">
              Solo administradores
            </span>
          </div>
        </header>

        <div className="px-4 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/" className="text-[0.78rem] text-neutral-500">
              ← Porra pública
            </Link>
            {authenticated && (
              <button onClick={logout} className="text-xs text-neutral-400">
                Cerrar sesión
              </button>
            )}
          </div>

          {configError ? (
            <AdminCard>
              <div className="p-6 text-center">
                <h2 className="font-display text-2xl font-black uppercase text-[#E8002D]">Configuración incompleta</h2>
                <p className="mt-2 text-sm text-neutral-600">{configError}</p>
              </div>
            </AdminCard>
          ) : authenticated ? (
            <AdminPanel
              input={input}
              setInput={(value) => {
                setInput(value);
                setPreview(null);
                setStatus("idle");
                setMessage("");
              }}
              preview={preview}
              status={status}
              message={message}
              textareaRef={textareaRef}
              onInterpret={interpret}
              onConfirm={confirm}
              onReset={() => {
                setInput("");
                setPreview(null);
                setStatus("idle");
                setMessage("");
              }}
            />
          ) : (
            <LoginPanel
              password={password}
              setPassword={setPassword}
              status={status}
              message={message}
              onSubmit={login}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function LoginPanel({
  password,
  setPassword,
  status,
  message,
  onSubmit,
}: {
  password: string;
  setPassword: (value: string) => void;
  status: string;
  message: string;
  onSubmit: () => void;
}) {
  return (
    <AdminCard>
      <div className="flex flex-col items-center gap-5 px-6 py-8">
        <div className="grid h-[72px] w-[72px] place-items-center rounded-3xl bg-gradient-to-br from-[#E8002D] to-[#9b0020] text-3xl text-white shadow-lg shadow-red-500/20">
          🔒
        </div>
        <div className="text-center">
          <h2 className="font-display text-3xl font-black uppercase leading-none">Acceso Admin</h2>
          <p className="mt-2 text-sm text-neutral-500">Introduce la contraseña para cargar resultados</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && password.trim() && onSubmit()}
            placeholder="Contraseña"
            className="w-full rounded-[14px] border border-black/10 bg-neutral-50 px-4 py-4 text-base outline-none focus:border-[#E8002D]/50"
          />
          {message && <p className="text-sm text-[#E8002D]">{message}</p>}
          <button
            onClick={onSubmit}
            disabled={!password.trim() || status === "loading"}
            className="w-full rounded-[14px] bg-gradient-to-br from-[#E8002D] to-[#b50023] py-4 font-display text-lg font-black uppercase tracking-[0.06em] text-white disabled:bg-none disabled:bg-black/10 disabled:text-neutral-400"
          >
            {status === "loading" ? "Cargando..." : "Entrar"}
          </button>
        </div>
        <p className="text-center text-xs text-neutral-400">La app pública sigue siendo solo de lectura</p>
      </div>
    </AdminCard>
  );
}

function AdminPanel({
  input,
  setInput,
  preview,
  status,
  message,
  textareaRef,
  onInterpret,
  onConfirm,
  onReset,
}: {
  input: string;
  setInput: (value: string) => void;
  preview: Preview | null;
  status: string;
  message: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInterpret: () => void;
  onConfirm: () => void;
  onReset: () => void;
}) {
  const canConfirm = Boolean(preview?.valid && status !== "saving" && status !== "success");

  return (
    <div className="flex flex-col gap-4 pb-10">
      <AdminCard noPad>
        <CardHeader title="Pegar resultado" subtitle="Copia y pega el resultado del partido" />
        <div className="flex flex-col gap-3 p-5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={PLACEHOLDER}
            rows={13}
            className="w-full resize-none rounded-[14px] border border-black/10 bg-neutral-50 p-4 font-mono text-[0.78rem] leading-6 text-neutral-900 outline-none focus:border-[#E8002D]/50"
          />
          <button
            onClick={onInterpret}
            disabled={!input.trim() || status === "loading"}
            className="w-full rounded-[14px] bg-neutral-950 py-4 font-display text-base font-black uppercase tracking-[0.05em] text-white disabled:bg-black/10 disabled:text-neutral-400"
          >
            {status === "loading" ? "Interpretando..." : "Interpretar resultado"}
          </button>
        </div>
      </AdminCard>

      {preview && <PreviewCard preview={preview} />}

      {preview && (
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="w-full rounded-2xl bg-gradient-to-br from-[#00b060] to-[#007040] py-4 font-display text-lg font-black uppercase tracking-[0.05em] text-white shadow-lg shadow-emerald-500/20 disabled:bg-none disabled:bg-black/10 disabled:text-neutral-400 disabled:shadow-none"
          >
            {status === "saving" ? "Guardando..." : "Confirmar, guardar y recalcular"}
          </button>
          {message && <p className={`text-center text-sm ${status === "success" ? "text-emerald-700" : "text-[#E8002D]"}`}>{message}</p>}
          {status === "success" && (
            <button onClick={onReset} className="rounded-xl bg-black/5 px-4 py-3 text-sm font-semibold text-neutral-600">
              Cargar otro resultado
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewCard({ preview }: { preview: Preview }) {
  const errors = preview.issues.filter((issue) => issue.level === "error");
  const warnings = preview.issues.filter((issue) => issue.level === "warning");
  const infos = preview.issues.filter((issue) => issue.level === "info");

  return (
    <AdminCard noPad>
      <CardHeader title="Preview posterior" subtitle="Revisa antes de confirmar" />
      <div className="flex flex-col gap-4 p-5">
        {preview.match && (
          <div className="flex items-center gap-3 rounded-2xl bg-neutral-950 p-4 text-white">
            <div className="flex-1 text-right font-display text-lg font-black uppercase leading-none">{preview.match.homeTeam}</div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 font-display text-3xl font-black">
              {preview.match.homeGoals}-{preview.match.awayGoals}
            </div>
            <div className="flex-1 font-display text-lg font-black uppercase leading-none">{preview.match.awayTeam}</div>
          </div>
        )}

        {preview.goals.length > 0 && (
          <div>
            <h3 className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-neutral-400">Goles detectados</h3>
            <div className="flex flex-col gap-2">
              {preview.goals.map((goal, index) => (
                <div key={`${goal.playerName}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {goal.playerName}
                      {!goal.scorerMatched && (
                        <span className="ml-2 rounded-md bg-yellow-100 px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.06em] text-yellow-800">
                          Sin pts
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-400">{goal.teamName}</p>
                  </div>
                  {goal.minute && <span className="text-xs text-neutral-400">{goal.minute}&apos;</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {[...errors, ...warnings, ...infos].map((issue, index) => (
          <IssueRow key={`${issue.message}-${index}`} issue={issue} />
        ))}

        {preview.valid && !warnings.length && !infos.length && (
          <IssueRow issue={{ level: "info", message: "Resultado interpretado correctamente." }} />
        )}
      </div>
    </AdminCard>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E8002D]/10 text-[#E8002D]">▣</div>
      <div>
        <h2 className="font-display text-lg font-black uppercase leading-none">{title}</h2>
        <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const styles = {
    error: "border-[#E8002D]/20 bg-red-50 text-[#c00020]",
    warning: "border-yellow-300/40 bg-yellow-50 text-yellow-800",
    info: "border-cyan-300/40 bg-cyan-50 text-cyan-800",
  }[issue.level];

  return <div className={`rounded-2xl border p-3 text-sm leading-5 ${styles}`}>{issue.message}</div>;
}

function AdminCard({ children, noPad = false }: { children: React.ReactNode; noPad?: boolean }) {
  return (
    <section className={`overflow-hidden rounded-[20px] border border-black/[0.07] bg-white shadow-lg shadow-black/[0.04] ${noPad ? "" : "p-0"}`}>
      {children}
    </section>
  );
}
