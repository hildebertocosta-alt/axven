"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { AppShell } from "../components/dashboard/AppShell";
import { AiPriorityBanner } from "../components/dashboard/AiPriorityBanner";
import { supabase } from "../lib/supabase";

type DashboardClient = {
  id: string;
  name: string;
  niche: string;
  score: number | null;
  status: string;
  ctrTrend: number | string | null;
  budgetStatus: string;
};

type DashboardAlert = {
  id: string;
  tipo: string;
  mensagem: string;
};

type DashboardCampaign = {
  id: string;
  nome: string;
  status: string;
  orcamento_diario: number | null;
  conjuntos: number | null;
};

type ReminderItem = {
  id: string;
  texto: string;
  concluido: boolean;
};

type TaskItem = {
  id: string;
  titulo: string;
  prioridade: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  concluido: boolean;
  criado_em: string;
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
    critico: "Crítico",
  };
  const normalized = normalizeStatus(value);
  return map[normalized] ?? value;
}

function sortTasks(tasks: TaskItem[]) {
  return [...tasks].sort((a, b) => {
    const priorityRank: Record<string, number> = { urgente: 1, alta: 2, normal: 3 };
    const priorityA = priorityRank[a.prioridade] ?? 3;
    const priorityB = priorityRank[b.prioridade] ?? 3;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
  });
}

function getPriorityStyles(priority: string) {
  switch (priority) {
    case "urgente":
      return "bg-rose-500";
    case "alta":
      return "bg-amber-500";
    default:
      return "bg-sky-500";
  }
}

export default function DashboardPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dashboardClients, setDashboardClients] = useState<DashboardClient[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [campaigns, setCampaigns] = useState<DashboardCampaign[]>([]);
  const [reminderInput, setReminderInput] = useState("");
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskClientId, setTaskClientId] = useState("");
  const [taskClientName, setTaskClientName] = useState("");
  const [removingTaskId, setRemovingTaskId] = useState<string | null>(null);

  const loadDashboard = async () => {
    const [{ data: clientes }, { data: alertas }, { data: campanhas }, { data: lembretes }, { data: tarefas }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("alertas").select("*").order("criado_em", { ascending: false }).limit(5),
      supabase.from("campanhas").select("*").order("data_inicio", { ascending: false }).limit(5),
      supabase.from("lembretes").select("*").order("criado_em", { ascending: false }),
      supabase.from("tarefas").select("*").eq("concluido", false),
    ]);

    setDashboardClients(
      (clientes ?? []).map((client: any) => ({
        id: client.id,
        name: client.nome,
        niche: client.nicho ?? "Sem nicho",
        score: client.score ?? null,
        status: client.status ?? "verificar",
        ctrTrend: client.ctr_trend ?? null,
        budgetStatus: client.budget_status ?? "sem dados",
      })),
    );
    setAlerts((alertas ?? []).map((item: any) => ({ id: item.id, tipo: item.tipo, mensagem: item.mensagem })));
    setCampaigns((campanhas ?? []).map((item: any) => ({ id: item.id, nome: item.nome, status: item.status ?? "ativo", orcamento_diario: item.orcamento_diario ?? null, conjuntos: item.conjuntos ?? null })));
    setReminders((lembretes ?? []).map((item: any) => ({ id: item.id, texto: item.texto, concluido: item.concluido })));
    setTasks(sortTasks((tarefas ?? []) as TaskItem[]));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const comparisonData = useMemo(
    () =>
      dashboardClients.map((client) => ({
        name: client.name,
        score: client.score,
        color: client.score === null ? "#9ca3af" : client.score >= 80 ? "#34d399" : client.score >= 60 ? "#fbbf24" : "#f43f5e",
      })),
    [dashboardClients],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
      setLastUpdated(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setRefreshing(false);
    }
  };

  const addReminder = async () => {
    const trimmed = reminderInput.trim();
    if (!trimmed) return;
    const { data } = await supabase.from("lembretes").insert({ texto: trimmed, concluido: false }).select("*").single();
    if (data) {
      setReminders((prev) => [{ id: data.id, texto: data.texto, concluido: data.concluido }, ...prev]);
    }
    setReminderInput("");
  };

  const toggleReminder = async (id: string) => {
    const item = reminders.find((entry) => entry.id === id);
    if (!item) return;
    const { data } = await supabase.from("lembretes").update({ concluido: !item.concluido }).eq("id", id).select("*").single();
    if (data) {
      setReminders((prev) => prev.map((entry) => (entry.id === id ? { ...entry, concluido: data.concluido } : entry)));
    }
  };

  const deleteReminder = async (id: string) => {
    await supabase.from("lembretes").delete().eq("id", id);
    setReminders((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = taskTitle.trim();
    if (!trimmed) return;

    const selectedClient = dashboardClients.find((client) => client.id === taskClientId);
    const response = await fetch("/api/tarefas/criar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: trimmed,
        prioridade: "normal",
        cliente_id: taskClientId || null,
        cliente_nome: (selectedClient?.name ?? taskClientName) || null,
      }),
    });

    if (!response.ok) return;

    const payload = await response.json();
    if (payload?.tarefa) {
      setTasks((prev) => sortTasks([payload.tarefa, ...prev]));
      setTaskTitle("");
      setTaskClientId("");
      setTaskClientName("");
    }
  };

  const handleCompleteTask = async (id: string) => {
    setRemovingTaskId(id);
    setTimeout(async () => {
      const response = await fetch("/api/tarefas/concluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setTasks((prev) => prev.filter((task) => task.id !== id));
      }
      setRemovingTaskId(null);
    }, 180);
  };

  const pendingTasksCount = tasks.filter((task) => !task.concluido).length;

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
            Você tem {Math.max(dashboardClients.length, 7)} prioridades para hoje.
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
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-200">
                {pendingTasksCount} tarefas pendentes hoje
              </span>
            </div>

            <form onSubmit={handleCreateTask} className="mt-5 flex flex-col gap-3 md:flex-row">
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Adicionar uma nova tarefa"
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
              />
              <select
                value={taskClientId}
                onChange={(event) => {
                  const selected = dashboardClients.find((client) => client.id === event.target.value);
                  setTaskClientId(event.target.value);
                  setTaskClientName(selected?.name ?? "");
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="" className="bg-zinc-900 text-white">Selecionar cliente</option>
                {dashboardClients.map((client) => (
                  <option key={client.id} value={client.id} className="bg-zinc-900 text-white">
                    {client.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
              >
                Adicionar
              </button>
            </form>

            <ul className="mt-5 space-y-3">
              {tasks.length ? tasks.map((task) => (
                <li
                  key={task.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 transition ${removingTaskId === task.id ? "opacity-0" : "opacity-100"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${getPriorityStyles(task.prioridade)}`} />
                    <div>
                      <p className="font-medium text-white">{task.titulo}</p>
                      {task.cliente_nome ? (
                        <span className="mt-1 inline-flex rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-200">
                          {task.cliente_nome}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                  >
                    ✓ Concluído
                  </button>
                </li>
              )) : <li className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-400">Nenhuma tarefa pendente no momento.</li>}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
              <p className="text-sm font-medium text-zinc-400">Alertas de operações</p>
              <div className="mt-4 space-y-3">
                {alerts.length ? alerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    <div className="font-medium">{alert.mensagem}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-amber-300/80">{alert.tipo}</div>
                  </div>
                )) : <p className="text-sm text-zinc-400">Nenhum alerta registrado.</p>}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
              <p className="text-sm font-medium text-zinc-400">Campanhas ativas</p>
              <div className="mt-4 space-y-3">
                {campaigns.length ? campaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                    <div className="font-medium text-white">{campaign.nome}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{campaign.status} · {campaign.conjuntos ?? 0} conjuntos</div>
                  </div>
                )) : <p className="text-sm text-zinc-400">Nenhuma campanha cadastrada.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-400">Performance consolidada</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Visualização dinâmica dos clientes conectados ao Supabase</h3>
            </div>
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-200">
              Dados reais
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
                      normalizeStatus(client.status) === "critico"
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
              {reminders.filter((item) => !item.concluido).length} pendentes
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
              <li key={item.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${item.concluido ? "border-emerald-500/20 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleReminder(item.id)}
                    className={`h-5 w-5 rounded-full border text-xs ${item.concluido ? "border-emerald-400 bg-emerald-400 text-zinc-950" : "border-zinc-500 text-transparent"}`}
                  >
                    ✓
                  </button>
                  <span className={`text-sm ${item.concluido ? "text-emerald-200 line-through" : "text-zinc-300"}`}>{item.texto}</span>
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
