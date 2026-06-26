import Link from "next/link";
import { AppShell } from "../components/dashboard/AppShell";
import { clients } from "../lib/mockData";

function normalizeStatus(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "");
}

const statusClasses: Record<string, string> = {
  verificar: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.08)]",
  alerta: "border-amber-500/25 bg-amber-500/10 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.08)]",
  atencao: "border-orange-500/25 bg-orange-500/10 text-orange-200 shadow-[0_0_18px_rgba(249,115,22,0.08)]",
  critico: "border-rose-500/25 bg-rose-500/10 text-rose-200 shadow-[0_0_18px_rgba(244,63,94,0.08)]",
};

const scoreClasses: Record<string, string> = {
  pending: "border-zinc-500/25 bg-zinc-500/10 text-zinc-200",
  strong: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  medium: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  danger: "border-rose-500/25 bg-rose-500/10 text-rose-200",
};

function getScoreBadgeClass(score: number | string) {
  if (score === "Pendente") return scoreClasses.pending;
  if (Number(score) >= 85) return scoreClasses.strong;
  if (Number(score) >= 70) return scoreClasses.medium;
  return scoreClasses.danger;
}

function getStatusClass(status: string) {
  return statusClasses[normalizeStatus(status)] ?? statusClasses.verificar;
}

export default function ClientesPage() {
  return (
    <AppShell title="Clientes" subtitle="Operação e acompanhamento" activeLabel="Clientes">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Base de clientes</h2>
            <p className="mt-1 text-sm text-zinc-400">Visão rápida de performance e status de cada conta.</p>
          </div>
          <div className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-200">
            8 contas ativas
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {clients.map((client) => (
            <div key={client.id} className={`rounded-3xl border bg-zinc-950/80 p-5 transition hover:border-violet-500/30 ${getStatusClass(client.status)}`}> 
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{client.name}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{client.niche}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${getStatusClass(client.status)}`}>
                  {client.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Score</p>
                  <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold ${getScoreBadgeClass(client.opportunityScore)}`}>
                    {client.opportunityScore}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Última revisão</p>
                  <p className="mt-2 text-sm font-semibold text-white">{client.lastReview}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-zinc-300">
                <div>CTR: {client.ctrTrend}</div>
                <div>Budget: {client.budgetStatus}</div>
              </div>

              <div className="mt-4 text-sm text-zinc-400">{client.summary}</div>

              <Link href={`/clientes/${client.slug}`} className="mt-4 inline-flex rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-200">
                Ver workspace
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
