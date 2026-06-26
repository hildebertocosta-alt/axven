"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { AppShell } from "../components/dashboard/AppShell";
import { AiPriorityBanner } from "../components/dashboard/AiPriorityBanner";
import { alertsFeed, clients as fallbackClients, todayTasks } from "../lib/mockData";

type DashboardClient = {
  id: string;
  name: string;
  niche: string;
  score: number | null;
  status: string;
  ctrTrend: number | string | null;
  budgetStatus: string;
  alerts: string[];
};

function formatTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function normalizeStatus(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "");
}

function formatStatus(value: string) {
  const map: Record<string, string> = {
    verificar: "Verificar",
    alerta: "Alerta",
    atencao: "Atenção",
    atencao2: "Atenção",
    critico: "Crítico",
    critico2: "Crítico",
  };
  const normalized = normalizeStatus(value);
  const key = normalized === "atencao" || normalized === "atencao" ? "atencao" : normalized === "critico" ? "critico" : normalized;
  return map[key] ?? value;
}

export default function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dashboardClients, setDashboardClients] = useState<DashboardClient[]>(
    fallbackClients.map((client) => ({
      id: client.slug,
      name: client.name,
      niche: client.niche,
      score: typeof client.opportunityScore === "number" ? client.opportunityScore : null,
      status: client.status,
      ctrTrend: client.ctrTrend,
      budgetStatus: client.budgetStatus,
      alerts: client.alerts,
    })),
  );
  const [reminderInput, setReminderInput] = useState("");
  const [reminders, setReminders] = useState<Array<{ id: number; text: string; done: boolean }>>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("growthwave-reminders");
    if (stored) {
      try {
        setReminders(JSON.parse(stored));
      } catch {
        setReminders([]);
      }
    } else {
      setReminders([
        { id: 1, text: "Integrar Supermetrics para gráficos semanais por cliente", done: true },
        { id: 2, text: "Retirar dados fictícios do dashboard (leads, receita, agendamentos)", done: true },
        { id: 3, text: "Publicar no Vercel com domínio próprio", done: true },
      ]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("growthwave-reminders", JSON.stringify(reminders));
  }, [reminders]);

  const comparisonData = useMemo(() => [
    { name: "Marquinhos Estilos", score: 95, color: "#34d399" },
    { name: "Edson Da Hora", score: 86, color: "#34d399" },
    { name: "Dra. Gabriela Brito", score: 71, color: "#fbbf24" },
    { name: "Face e Corpo", score: null, color: "#9ca3af" },
    { name: "Ejetec", score: 100, color: "#9ca3af" },
    { name: "Tritão Náutica", score: 100, color: "#9ca3af" },
    { name: "Rei da Parmegiana", score: 100, color: "#9ca3af" },
    { name: "Beatriz Lima Nutri", score: 100, color: "#9ca3af" },
  ], []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/refresh-data");
      const data = await response.json();
      setDashboardClients(data.clients ?? []);
      setLastUpdated(formatTime(data.lastUpdated) ? `às ${formatTime(data.lastUpdated)}` : null);
    } finally {
      setRefreshing(false);
    }
  };

  const addReminder = () => {
    const trimmed = reminderInput.trim();
    if (!trimmed) return;
    setReminders((prev) => [{ id: Date.now(), text: trimmed, done: false }, ...prev]);
    setReminderInput("");
  };

  const toggleReminder = (id: number) => {
    setReminders((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const deleteReminder = (id: number) => {
    setReminders((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <AppShell
      title="Dashboard"
      subtitle="Growthwave Marketing Hub"
      activeLabel="Dashboard"
      actions={
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="group relative flex items-center gap-2 overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-600/20 via-violet-500/10 to-cyan-500/10 px-4 py-2 text-sm font-medium text-violet-100 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] transition hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(139,92,246,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition duration-700 group-hover:translate-x-full" />
          {refreshing ? (
            <span className="relative h-4 w-4 animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-violet-200 border-t-transparent" />
          ) : (
            <span className="relative text-base transition group-hover:rotate-180">↻</span>
          )}
          <span className="relative">Atualizar dados</span>
        </button>
      }
      sidebarStatus={{ lastUpdated: lastUpdated ? lastUpdated.replace("às ", "") : null }}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-violet-300">Bom dia, Junior 👋</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Você tem 7 prioridades para hoje.
          </h2>
        </div>

        <AiPriorityBanner />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Tarefas do dia</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Ações prioritárias</h3>
              </div>
              <span className="text-sm text-zinc-500">⏱ 1h35</span>
            </div>

            <ul className="mt-5 space-y-3">
              {todayTasks.map((task) => (
                <li key={task.title}>
                  <Link
                    href={task.href}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 transition hover:border-violet-500/30 hover:bg-violet-500/10"
                  >
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-400" />
                    <span>{task.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <p className="text-sm font-medium text-zinc-400">Alertas de operações</p>
            <div className="mt-4 space-y-3">
              {alertsFeed.map((alert) => (
                <div
                  key={alert.title}
                  className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
                >
                  <div className="font-medium">{alert.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-amber-300/80">{alert.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-400">Performance consolidada</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Clique em um cliente para ver os detalhes de performance</h3>
            </div>
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-200">
              Sem dados inventados
            </span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Clientes em foco</h3>
              <Link href="/clientes" className="text-sm font-medium text-violet-300">
                Ver todos
              </Link>
            </div>

            <div className="mt-5 grid gap-4">
              {dashboardClients.map((client) => (
                <div key={client.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{client.name}</p>
                      <p className="mt-1 text-sm text-zinc-400">{client.niche}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      client.score === null
                        ? "border-zinc-500/20 bg-zinc-500/10 text-zinc-200"
                        : client.score >= 85
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                          : client.score >= 70
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                            : "border-rose-500/20 bg-rose-500/10 text-rose-200"
                    }`}>
                      {client.score ?? "—"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-300">
                    <span className={`rounded-full px-3 py-1 ${
                      normalizeStatus(client.status) === "critico" || normalizeStatus(client.status) === "critico"
                        ? "bg-rose-500/10 text-rose-200"
                        : normalizeStatus(client.status) === "alerta" || normalizeStatus(client.status) === "atencao"
                          ? "bg-amber-500/10 text-amber-200"
                          : "bg-emerald-500/10 text-emerald-200"
                    }`}>
                      Status: {formatStatus(client.status)}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1">CTR: {typeof client.ctrTrend === "number" ? `${client.ctrTrend}%` : client.ctrTrend ?? "sem dados"}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">Budget: {client.budgetStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Score de oportunidade · Meta Ads</h3>
              <span className="text-sm text-zinc-500">Comparativo</span>
            </div>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} layout="vertical" margin={{ top: 10, right: 20, left: 16, bottom: 10 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#f4f4f5", fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{ backgroundColor: "#09090b", borderColor: "rgba(255,255,255,0.1)", borderRadius: 12 }}
                    formatter={(value) => [`${value === undefined || value === null ? "—" : value}`, "Score"]}
                  />
                  <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                    {comparisonData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color ?? (entry.score === null ? "#71717a" : entry.score >= 80 ? "#34d399" : entry.score >= 60 ? "#fbbf24" : "#f43f5e")} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Pendências & Lembretes</h3>
              <p className="mt-1 text-sm text-zinc-400">Organize os próximos passos e mantenha o fluxo da operação alinhado.</p>
            </div>
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-200">
              {reminders.filter((item) => !item.done).length} pendentes
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <input
              value={reminderInput}
              onChange={(event) => setReminderInput(event.target.value)}
              placeholder="Adicionar novo lembrete"
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-zinc-500"
            />
            <button
              onClick={addReminder}
              className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
            >
              Adicionar
            </button>
          </div>

          <ul className="mt-5 space-y-3">
            {reminders.map((item) => (
              <li key={item.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${item.done ? "border-emerald-500/20 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleReminder(item.id)}
                    className={`h-5 w-5 rounded-full border text-xs ${item.done ? "border-emerald-400 bg-emerald-400 text-zinc-950" : "border-zinc-500 text-transparent"}`}
                  >
                    ✓
                  </button>
                  <span className={`text-sm ${item.done ? "text-emerald-200 line-through" : "text-zinc-300"}`}>{item.text}</span>
                </div>
                <button
                  onClick={() => deleteReminder(item.id)}
                  className="text-sm text-zinc-500 transition hover:text-rose-300"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
