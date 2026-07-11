"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { AppShell } from "../components/dashboard/AppShell";
import { supabase } from "../lib/supabase";
// NOTE: `supabase` (anon client) is retained only for the lembretes add/toggle/delete
// calls below, which already fail silently (pre-existing bug, out of scope for this fix).

type StatusPagamento = "pago" | "em_dia" | "atrasado" | "cancelado";

type ClienteRow = {
  id: string;
  nome: string;
  nicho: string | null;
  score: number | null;
  status: string | null;
  status_pagamento: StatusPagamento;
  honorarios: number | null;
  data_fim_contrato: string | null;
};

type FinanceiroRow = {
  id: string;
  cliente_id: string;
  valor: number;
  dia_vencimento: number;
  status: string;
};

type LembreteRow = {
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function saoPauloMonthKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function saoPauloDayOfMonth() {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", day: "2-digit" }).format(new Date()));
}

function saoPauloTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isCobrancaAtrasada(status: string, diaVencimento: number) {
  if (status === "atrasado") return true;
  if (status !== "pendente") return false;
  return saoPauloDayOfMonth() > diaVencimento;
}

function diasParaVencimentoContrato(dataFimContrato: string) {
  const today = new Date(`${saoPauloTodayKey()}T00:00:00-03:00`);
  const target = new Date(`${dataFimContrato}T00:00:00-03:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
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
    ativo: "Ativo",
  };
  return map[normalizeStatus(value)] ?? value;
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
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [financeiroMes, setFinanceiroMes] = useState<FinanceiroRow[]>([]);
  const [despesasMesTotal, setDespesasMesTotal] = useState(0);
  const [reminderInput, setReminderInput] = useState("");
  const [reminders, setReminders] = useState<LembreteRow[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskClientId, setTaskClientId] = useState("");
  const [taskClientName, setTaskClientName] = useState("");
  const [removingTaskId, setRemovingTaskId] = useState<string | null>(null);

  const [showNovoCliente, setShowNovoCliente] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("novo_cliente") === "1",
  );
  const [novoClienteNome, setNovoClienteNome] = useState(
    () => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("nome")) || "",
  );
  const [novoClienteNicho, setNovoClienteNicho] = useState("");
  const [novoClienteHonorarios, setNovoClienteHonorarios] = useState("");
  const [novoClienteDiaPagamento, setNovoClienteDiaPagamento] = useState("5");
  const [savingCliente, setSavingCliente] = useState(false);
  const [clienteError, setClienteError] = useState<string | null>(null);

  const loadDashboard = async () => {
    const mesAtual = saoPauloMonthKey();

    await fetch("/api/financeiro/gerar-cobrancas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes_referencia: mesAtual }),
    }).catch(() => null);

    const response = await fetch("/api/dashboard/data");
    const { clientes: clientesData, financeiro: financeiroData, despesas: despesasData, lembretes, tarefas } =
      await response.json();

    setClientes(
      (clientesData ?? []).map((item: ClienteRow) => ({
        ...item,
        honorarios: item.honorarios === null ? null : Number(item.honorarios),
      })),
    );
    setFinanceiroMes((financeiroData ?? []).map((item: FinanceiroRow) => ({ ...item, valor: Number(item.valor ?? 0) })));
    setDespesasMesTotal((despesasData ?? []).reduce((sum: number, item: { valor: number }) => sum + Number(item.valor ?? 0), 0));
    setReminders((lembretes ?? []).map((item: LembreteRow) => ({ id: item.id, texto: item.texto, concluido: item.concluido })));
    setTasks(sortTasks((tarefas ?? []) as TaskItem[]));
  };

  useEffect(() => {
    (async () => {
      await loadDashboard();
    })();
  }, []);

  const comparisonData = useMemo(
    () =>
      clientes.map((client) => ({
        name: client.nome,
        score: client.score,
        color: client.score === null ? "#71717a" : client.score >= 80 ? "#34d399" : client.score >= 60 ? "#fbbf24" : "#f43f5e",
      })),
    [clientes],
  );

  const mrrTotal = useMemo(() => clientes.reduce((sum, c) => sum + (c.honorarios ?? 0), 0), [clientes]);

  const clientesAtivos = useMemo(() => clientes.filter((c) => c.status_pagamento !== "cancelado").length, [clientes]);

  const receitaMes = useMemo(() => financeiroMes.reduce((sum, item) => sum + item.valor, 0), [financeiroMes]);

  const margemMes = receitaMes - despesasMesTotal;

  const cobrancasAtraso = useMemo(() => {
    const atrasadas = financeiroMes.filter((item) => isCobrancaAtrasada(item.status, item.dia_vencimento ?? 0));
    return { count: atrasadas.length, total: atrasadas.reduce((sum, item) => sum + item.valor, 0) };
  }, [financeiroMes]);

  const contratosVencendo = useMemo(
    () =>
      clientes.filter((c) => {
        if (!c.data_fim_contrato) return false;
        return diasParaVencimentoContrato(c.data_fim_contrato) <= 30;
      }).length,
    [clientes],
  );

  const pendingTasksCount = tasks.filter((task) => !task.concluido).length;

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

    const selectedClient = clientes.find((client) => client.id === taskClientId);
    const response = await fetch("/api/tarefas/criar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: trimmed,
        prioridade: "normal",
        cliente_id: taskClientId || null,
        cliente_nome: (selectedClient?.nome ?? taskClientName) || null,
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

  const handleCreateCliente = async (event: React.FormEvent) => {
    event.preventDefault();
    setClienteError(null);

    const nomeTrim = novoClienteNome.trim();
    if (!nomeTrim) {
      setClienteError("Informe o nome do cliente.");
      return;
    }

    setSavingCliente(true);
    try {
      const response = await fetch("/api/clientes/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeTrim,
          nicho: novoClienteNicho.trim() || null,
          honorarios: novoClienteHonorarios ? Number(novoClienteHonorarios) : null,
          dia_pagamento: novoClienteDiaPagamento ? Number(novoClienteDiaPagamento) : 5,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setClienteError(payload?.error ?? "Não foi possível cadastrar o cliente.");
        return;
      }

      const novoCliente: ClienteRow = {
        ...payload.cliente,
        honorarios: payload.cliente.honorarios === null ? null : Number(payload.cliente.honorarios),
      };
      setClientes((prev) => [...prev, novoCliente].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovoClienteNome("");
      setNovoClienteNicho("");
      setNovoClienteHonorarios("");
      setNovoClienteDiaPagamento("5");
      setShowNovoCliente(false);
    } finally {
      setSavingCliente(false);
    }
  };

  return (
    <AppShell
      title="Dashboard"
      subtitle="Axven Marketing Hub"
      activeLabel="Dashboard"
      actions={
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="group relative flex items-center gap-2 overflow-hidden rounded-2xl border border-[#D85A30]/30 bg-gradient-to-r from-[#D85A30]/20 via-[#D85A30]/10 to-transparent px-4 py-2 text-sm font-medium text-[#f0a480] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] transition hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(216,90,48,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition duration-700 group-hover:translate-x-full" />
          {refreshing ? (
            <span className="relative h-4 w-4 animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-[#f0a480] border-t-transparent" />
          ) : (
            <span className="relative text-base transition group-hover:rotate-180">↻</span>
          )}
          <span className="relative">Atualizar dados</span>
        </button>
      }
      sidebarStatus={{ lastUpdated: lastUpdated ? lastUpdated.replace("às ", "") : null }}
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-[#D85A30]">Visão geral</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            {pendingTasksCount > 0
              ? `Você tem ${pendingTasksCount} tarefa${pendingTasksCount === 1 ? "" : "s"} pendente${pendingTasksCount === 1 ? "" : "s"} hoje.`
              : "Nenhuma tarefa pendente — tudo em dia."}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <Link
            href="/financeiro"
            className="rounded-3xl border border-[#D85A30]/30 bg-[#D85A30]/10 p-5 transition hover:border-[#D85A30]/50"
          >
            <p className="text-sm text-[#f0a480]">MRR total da agência</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(mrrTotal)}</p>
          </Link>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Clientes ativos</p>
            <p className="mt-3 text-3xl font-semibold text-white">{clientesAtivos}</p>
          </div>

          <Link href="/financeiro" className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 transition hover:border-white/20">
            <p className="text-sm text-zinc-400">Margem do mês</p>
            <p className={`mt-3 text-3xl font-semibold ${margemMes >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {formatCurrency(margemMes)}
            </p>
          </Link>

          <Link
            href="/financeiro"
            className={`rounded-3xl border p-5 transition ${
              cobrancasAtraso.count > 0
                ? "border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50"
                : "border-white/10 bg-zinc-950/80 hover:border-white/20"
            }`}
          >
            <p className={`text-sm ${cobrancasAtraso.count > 0 ? "text-amber-200" : "text-zinc-400"}`}>Cobranças em atraso</p>
            <p className="mt-3 text-3xl font-semibold text-white">{cobrancasAtraso.count}</p>
            <p className="mt-1 text-xs text-zinc-400">{formatCurrency(cobrancasAtraso.total)}</p>
          </Link>

          <Link
            href="/financeiro"
            className={`rounded-3xl border p-5 transition ${
              contratosVencendo > 0
                ? "border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50"
                : "border-white/10 bg-zinc-950/80 hover:border-white/20"
            }`}
          >
            <p className={`text-sm ${contratosVencendo > 0 ? "text-amber-200" : "text-zinc-400"}`}>Contratos vencendo (30d)</p>
            <p className="mt-3 text-3xl font-semibold text-white">{contratosVencendo}</p>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/relatorios?gerar=1"
            className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 transition hover:border-[#D85A30]/40 hover:bg-[#D85A30]/5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D85A30]/15 text-lg text-[#f0a480]">📄</span>
            <p className="mt-3 font-semibold text-white">Gerar relatório semanal</p>
            <p className="mt-1 text-sm text-zinc-400">Cria e compartilha um relatório com o cliente.</p>
          </Link>

          <Link
            href="/financeiro?nova_despesa=1"
            className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 transition hover:border-[#D85A30]/40 hover:bg-[#D85A30]/5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D85A30]/15 text-lg text-[#f0a480]">💸</span>
            <p className="mt-3 font-semibold text-white">Lançar nova despesa</p>
            <p className="mt-1 text-sm text-zinc-400">Registra um custo do mês atual.</p>
          </Link>

          <button
            onClick={() => setShowNovoCliente(true)}
            className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 text-left transition hover:border-[#D85A30]/40 hover:bg-[#D85A30]/5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D85A30]/15 text-lg text-[#f0a480]">➕</span>
            <p className="mt-3 font-semibold text-white">Cadastrar novo cliente</p>
            <p className="mt-1 text-sm text-zinc-400">Adiciona um cliente novo à operação.</p>
          </button>
        </div>

        {showNovoCliente ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Novo cliente</h3>
              <button onClick={() => setShowNovoCliente(false)} className="text-sm text-zinc-400 transition hover:text-white">
                Cancelar
              </button>
            </div>
            <form onSubmit={handleCreateCliente} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={novoClienteNome}
                onChange={(event) => setNovoClienteNome(event.target.value)}
                placeholder="Nome do cliente"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 xl:col-span-2"
              />
              <input
                value={novoClienteNicho}
                onChange={(event) => setNovoClienteNicho(event.target.value)}
                placeholder="Nicho (opcional)"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
              />
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                Honorários mensais (R$)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={novoClienteHonorarios}
                  onChange={(event) => setNovoClienteHonorarios(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                Dia de vencimento
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={novoClienteDiaPagamento}
                  onChange={(event) => setNovoClienteDiaPagamento(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                />
              </label>

              <div className="flex items-center gap-3 xl:col-span-4">
                <button
                  type="submit"
                  disabled={savingCliente}
                  className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c14f28] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCliente ? "Salvando..." : "Salvar cliente"}
                </button>
                {clienteError ? <p className="text-sm text-rose-300">{clienteError}</p> : null}
              </div>
            </form>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Tarefas do dia</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Ações prioritárias</h3>
              </div>
              <span className="rounded-full border border-[#D85A30]/30 bg-[#D85A30]/10 px-3 py-1 text-sm text-[#f0a480]">
                {pendingTasksCount} pendentes
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
                  const selected = clientes.find((client) => client.id === event.target.value);
                  setTaskClientId(event.target.value);
                  setTaskClientName(selected?.nome ?? "");
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="" className="bg-zinc-900 text-white">Selecionar cliente</option>
                {clientes.map((client) => (
                  <option key={client.id} value={client.id} className="bg-zinc-900 text-white">
                    {client.nome}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30]/10 px-4 py-3 text-sm font-semibold text-[#f0a480] transition hover:bg-[#D85A30]/20"
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
                        <span className="mt-1 inline-flex rounded-full border border-[#D85A30]/20 bg-[#D85A30]/10 px-2.5 py-0.5 text-xs text-[#f0a480]">
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

          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Pendências & Lembretes</h3>
                <p className="mt-1 text-sm text-zinc-400">Próximos passos da operação.</p>
              </div>
              <span className="rounded-full border border-[#D85A30]/30 bg-[#D85A30]/10 px-3 py-1 text-sm text-[#f0a480]">
                {reminders.filter((item) => !item.concluido).length} pendentes
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row">
              <input
                value={reminderInput}
                onChange={(event) => setReminderInput(event.target.value)}
                placeholder="Adicionar novo lembrete"
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
              />
              <button
                onClick={addReminder}
                className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30]/10 px-4 py-3 text-sm font-semibold text-[#f0a480] transition hover:bg-[#D85A30]/20"
              >
                Adicionar
              </button>
            </div>

            <ul className="mt-5 space-y-3">
              {reminders.length ? reminders.map((item) => (
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
              )) : <li className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-400">Nenhum lembrete no momento.</li>}
            </ul>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Clientes em foco</h3>
            </div>

            <div className="mt-5 grid gap-4">
              {clientes.map((client) => (
                <div key={client.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{client.nome}</p>
                      <p className="mt-1 text-sm text-zinc-400">{client.nicho ?? "Sem nicho"}</p>
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
                      normalizeStatus(client.status ?? "verificar") === "critico"
                        ? "bg-rose-500/10 text-rose-200"
                        : normalizeStatus(client.status ?? "verificar") === "alerta" || normalizeStatus(client.status ?? "verificar") === "atencao"
                          ? "bg-amber-500/10 text-amber-200"
                          : "bg-emerald-500/10 text-emerald-200"
                    }`}>
                      Status: {formatStatus(client.status ?? "verificar")}
                    </span>
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
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
