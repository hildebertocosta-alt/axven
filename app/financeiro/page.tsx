"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "../components/dashboard/AppShell";
import { supabase } from "../lib/supabase";

type FinanceStatus = "Pago" | "Atrasado" | "Vence hoje" | "Vence em breve" | "Pendente";

type CanalAquisicao = "indicacao" | "instagram" | "whatsapp" | "prospeccao_ativa" | "site" | "google" | "outro";

type FinanceiroStatus = "pendente" | "pago" | "em_dia" | "atrasado" | "cancelado";
type StatusPagamento = "pago" | "em_dia" | "atrasado" | "cancelado";

const CANAL_OPTIONS: { value: CanalAquisicao; label: string }[] = [
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "prospeccao_ativa", label: "Prospecção ativa" },
  { value: "site", label: "Site" },
  { value: "google", label: "Google" },
  { value: "outro", label: "Outro" },
];

const COBRANCA_STATUS_OPTIONS: { value: FinanceiroStatus; label: string; className: string }[] = [
  { value: "pendente", label: "Pendente", className: "border-white/10 bg-white/5 text-zinc-300" },
  { value: "pago", label: "Pago", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" },
  { value: "em_dia", label: "Em dia", className: "border-sky-500/40 bg-sky-500/10 text-sky-200" },
  { value: "atrasado", label: "Atrasado", className: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
  { value: "cancelado", label: "Cancelado", className: "border-rose-500/40 bg-rose-500/10 text-rose-200" },
];

const STATUS_PAGAMENTO_OPTIONS = COBRANCA_STATUS_OPTIONS.filter(
  (option): option is { value: StatusPagamento; label: string; className: string } => option.value !== "pendente",
);

function getCobrancaStatusClass(status: FinanceiroStatus) {
  return COBRANCA_STATUS_OPTIONS.find((option) => option.value === status)?.className ?? "border-white/10 bg-white/5 text-zinc-200";
}

function getCobrancaStatusLabel(status: FinanceiroStatus) {
  return COBRANCA_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type PaymentItem = {
  id: string;
  clienteId: string;
  client: string;
  value: number;
  dueDay: number;
  rawStatus: FinanceiroStatus;
  computedStatus: FinanceStatus;
  paid: boolean;
  cancelled: boolean;
  overdue: boolean;
  dataRecebimento: string | null;
  recebidoComAtraso: boolean;
};

type FinanceRow = {
  id: string;
  cliente_id: string;
  valor: number;
  dia_vencimento: number;
  status: string;
  mes_referencia: string;
  data_recebimento: string | null;
};

type ClienteRow = {
  id: string;
  nome: string;
  honorarios: number | null;
  canal_aquisicao: CanalAquisicao | null;
  status_pagamento: StatusPagamento;
  data_fim_contrato: string | null;
};

type DespesaRow = {
  id: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  mes_referencia: string;
  data: string | null;
  cliente_id: string | null;
};

type RenewalInfo = { label: string; className: string; diff: number };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function saoPauloMonthKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(date);
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

function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMonthShort(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MESES_ABREV[month - 1]}/${String(year).slice(2)}`;
}

function isRecebidoComAtraso(mesReferencia: string, dueDay: number, dataRecebimento: string | null): boolean {
  if (!dataRecebimento) return false;
  const dataEsperada = `${mesReferencia}-${String(dueDay).padStart(2, "0")}`;
  return dataRecebimento > dataEsperada;
}

function getFinanceStatus(monthKey: string, dueDay: number, paid: boolean): FinanceStatus {
  if (paid) return "Pago";

  const currentMonth = saoPauloMonthKey(new Date());
  if (monthKey < currentMonth) return "Atrasado";
  if (monthKey > currentMonth) return "Pendente";

  const today = saoPauloDayOfMonth();
  if (today > dueDay) return "Atrasado";
  if (today === dueDay) return "Vence hoje";
  if (dueDay - today <= 3) return "Vence em breve";
  return "Pendente";
}

function getStatusClass(status: FinanceStatus) {
  switch (status) {
    case "Pago":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "Atrasado":
      return "border-rose-500/20 bg-rose-500/10 text-rose-200";
    case "Vence hoje":
      return "border-amber-500/20 bg-amber-500/10 text-amber-200";
    case "Vence em breve":
      return "border-orange-500/20 bg-orange-500/10 text-orange-200";
    default:
      return "border-zinc-500/20 bg-zinc-500/10 text-zinc-200";
  }
}

function getRenewalInfo(dateStr: string | null): RenewalInfo | null {
  if (!dateStr) return null;
  const today = new Date(`${saoPauloTodayKey()}T00:00:00-03:00`);
  const target = new Date(`${dateStr}T00:00:00-03:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff > 30) return null;
  if (diff <= 0) {
    return {
      label: diff === 0 ? "Vence hoje" : `Vencido há ${Math.abs(diff)}d`,
      className: "border-rose-500/30 bg-rose-500/10 text-rose-200",
      diff,
    };
  }
  return { label: `Renova em ${diff}d`, className: "border-amber-500/30 bg-amber-500/10 text-amber-200", diff };
}

export default function FinanceiroPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => saoPauloMonthKey(new Date()));
  const [financeiro, setFinanceiro] = useState<FinanceRow[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [despesas, setDespesas] = useState<DespesaRow[]>([]);

  const [showDespesaForm, setShowDespesaForm] = useState(false);
  const [despesaDescricao, setDespesaDescricao] = useState("");
  const [despesaValor, setDespesaValor] = useState("");
  const [despesaCategoria, setDespesaCategoria] = useState("");
  const [despesaData, setDespesaData] = useState("");
  const [despesaClienteId, setDespesaClienteId] = useState("");
  const [savingDespesa, setSavingDespesa] = useState(false);
  const [despesaError, setDespesaError] = useState<string | null>(null);

  const loadAll = async () => {
    const [{ data: financeiroData }, { data: clientesData }, { data: despesasData }] = await Promise.all([
      supabase.from("financeiro").select("*").order("dia_vencimento"),
      supabase
        .from("clientes")
        .select("id, nome, honorarios, canal_aquisicao, status_pagamento, data_fim_contrato")
        .order("nome"),
      supabase.from("despesas").select("*").order("data", { ascending: false }),
    ]);

    setFinanceiro(
      (financeiroData ?? []).map((item: FinanceRow) => ({
        ...item,
        valor: Number(item.valor ?? 0),
      })),
    );
    setClientes(
      (clientesData ?? []).map((item: ClienteRow) => ({
        id: item.id,
        nome: item.nome,
        honorarios: item.honorarios === null ? null : Number(item.honorarios),
        canal_aquisicao: item.canal_aquisicao ?? null,
        status_pagamento: item.status_pagamento ?? "em_dia",
        data_fim_contrato: item.data_fim_contrato ?? null,
      })),
    );
    setDespesas(
      (despesasData ?? []).map((item: DespesaRow) => ({
        ...item,
        valor: Number(item.valor ?? 0),
      })),
    );
  };

  useEffect(() => {
    (async () => {
      await fetch("/api/financeiro/gerar-cobrancas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes_referencia: selectedMonth }),
      }).catch(() => null);
      await loadAll();
    })();
  }, [selectedMonth]);

  const clienteNomeMap = useMemo(() => new Map(clientes.map((item) => [item.id, item.nome])), [clientes]);

  const payments: PaymentItem[] = useMemo(
    () =>
      financeiro
        .filter((entry) => entry.mes_referencia === selectedMonth)
        .map((entry) => {
          const rawStatus = ((entry.status || "pendente") as FinanceiroStatus);
          const paid = rawStatus === "pago";
          const cancelled = rawStatus === "cancelado";
          const computedStatus = getFinanceStatus(selectedMonth, entry.dia_vencimento ?? 0, paid);
          const overdue = rawStatus === "atrasado" || (rawStatus === "pendente" && computedStatus === "Atrasado");

          return {
            id: entry.id,
            clienteId: entry.cliente_id,
            client: clienteNomeMap.get(entry.cliente_id) ?? "Cliente sem nome",
            value: entry.valor,
            dueDay: entry.dia_vencimento ?? 0,
            rawStatus,
            computedStatus,
            paid,
            cancelled,
            overdue,
            dataRecebimento: entry.data_recebimento,
            recebidoComAtraso: isRecebidoComAtraso(entry.mes_referencia, entry.dia_vencimento ?? 0, entry.data_recebimento),
          };
        }),
    [financeiro, clienteNomeMap, selectedMonth],
  );

  const despesasMes = useMemo(
    () => despesas.filter((item) => item.mes_referencia === selectedMonth),
    [despesas, selectedMonth],
  );

  const summary = useMemo(() => {
    const toReceive = payments.reduce((sum, item) => sum + (item.paid || item.cancelled ? 0 : item.value), 0);
    const received = payments.reduce((sum, item) => sum + (item.paid ? item.value : 0), 0);
    const overdue = payments.reduce((sum, item) => sum + (item.overdue ? item.value : 0), 0);
    const receita = payments.reduce((sum, item) => sum + item.value, 0);
    const totalDespesas = despesasMes.reduce((sum, item) => sum + item.valor, 0);
    return { toReceive, received, overdue, receita, totalDespesas, margem: receita - totalDespesas };
  }, [payments, despesasMes]);

  const mrrPorCliente = useMemo(
    () => [...clientes].sort((a, b) => (b.honorarios ?? 0) - (a.honorarios ?? 0)),
    [clientes],
  );

  const mrrTotal = useMemo(() => clientes.reduce((sum, item) => sum + (item.honorarios ?? 0), 0), [clientes]);

  const receitaPorClienteMes = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((item) => {
      map.set(item.clienteId, (map.get(item.clienteId) ?? 0) + item.value);
    });
    return map;
  }, [payments]);

  const despesasPorClienteMes = useMemo(() => {
    const map = new Map<string, number>();
    despesasMes.forEach((item) => {
      if (!item.cliente_id) return;
      map.set(item.cliente_id, (map.get(item.cliente_id) ?? 0) + item.valor);
    });
    return map;
  }, [despesasMes]);

  const receitaAcumuladaPorCliente = useMemo(() => {
    const map = new Map<string, number>();
    financeiro.forEach((entry) => {
      if (entry.status !== "pago") return;
      map.set(entry.cliente_id, (map.get(entry.cliente_id) ?? 0) + entry.valor);
    });
    return map;
  }, [financeiro]);

  const canalStats = useMemo(() => {
    return CANAL_OPTIONS.map((option) => {
      const group = clientes.filter((cliente) => cliente.canal_aquisicao === option.value);
      const count = group.length;
      const ticketMedio = count ? group.reduce((sum, c) => sum + (c.honorarios ?? 0), 0) / count : 0;
      const ltv = count ? group.reduce((sum, c) => sum + (receitaAcumuladaPorCliente.get(c.id) ?? 0), 0) / count : 0;
      return { canal: option.value, label: option.label, count, ticketMedio, ltv };
    }).filter((stat) => stat.count > 0);
  }, [clientes, receitaAcumuladaPorCliente]);

  const receitaPorMesChart = useMemo(() => {
    const map = new Map<string, number>();
    financeiro.forEach((entry) => {
      map.set(entry.mes_referencia, (map.get(entry.mes_referencia) ?? 0) + entry.valor);
    });
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([mes, total]) => ({ mes, mesLabel: formatMonthShort(mes), total }));
  }, [financeiro]);

  const renewalAlerts = useMemo(() => {
    return clientes
      .map((cliente) => ({ cliente, info: getRenewalInfo(cliente.data_fim_contrato) }))
      .filter((item): item is { cliente: ClienteRow; info: RenewalInfo } => item.info !== null)
      .sort((a, b) => a.info.diff - b.info.diff);
  }, [clientes]);

  const isCurrentMonth = selectedMonth === saoPauloMonthKey(new Date());

  const updateStatusCobranca = async (clienteId: string, mesReferencia: string, novoStatus: StatusPagamento) => {
    const previousFinanceiro = financeiro;
    const previousClientes = clientes;
    const novaDataRecebimento = novoStatus === "pago" ? saoPauloTodayKey() : null;

    setFinanceiro((current) =>
      current.map((item) =>
        item.cliente_id === clienteId && item.mes_referencia === mesReferencia
          ? { ...item, status: novoStatus, data_recebimento: novaDataRecebimento }
          : item,
      ),
    );
    if (mesReferencia === saoPauloMonthKey(new Date())) {
      setClientes((current) => current.map((item) => (item.id === clienteId ? { ...item, status_pagamento: novoStatus } : item)));
    }

    try {
      const response = await fetch("/api/financeiro/atualizar-status-cobranca", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteId, mes_referencia: mesReferencia, novo_status: novoStatus }),
      });

      if (!response.ok) {
        setFinanceiro(previousFinanceiro);
        setClientes(previousClientes);
        return;
      }

      const payload = await response.json();
      if (payload?.financeiro) {
        const atualizado = { ...payload.financeiro, valor: Number(payload.financeiro.valor ?? 0) };
        setFinanceiro((current) => {
          const existe = current.some((item) => item.id === atualizado.id);
          return existe ? current.map((item) => (item.id === atualizado.id ? atualizado : item)) : [...current, atualizado];
        });
      }
    } catch {
      setFinanceiro(previousFinanceiro);
      setClientes(previousClientes);
    }
  };

  const updateCanal = async (clienteId: string, canal: CanalAquisicao) => {
    const previous = clientes;
    setClientes((current) => current.map((item) => (item.id === clienteId ? { ...item, canal_aquisicao: canal } : item)));

    const response = await fetch("/api/clientes/atualizar-canal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: clienteId, canal_aquisicao: canal }),
    });

    if (!response.ok) setClientes(previous);
  };

  const updateContrato = async (clienteId: string, dateValue: string) => {
    const previous = clientes;
    const value = dateValue || null;
    setClientes((current) => current.map((item) => (item.id === clienteId ? { ...item, data_fim_contrato: value } : item)));

    const response = await fetch("/api/clientes/atualizar-contrato", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: clienteId, data_fim_contrato: value }),
    });

    if (!response.ok) setClientes(previous);
  };

  const handleAddDespesa = async (event: React.FormEvent) => {
    event.preventDefault();
    setDespesaError(null);

    const descricaoTrim = despesaDescricao.trim();
    const valorNumber = Number(despesaValor);
    if (!descricaoTrim || !despesaValor || Number.isNaN(valorNumber) || valorNumber <= 0) {
      setDespesaError("Preencha descrição e um valor válido.");
      return;
    }
    if (!despesaData) {
      setDespesaError("Selecione a data da despesa.");
      return;
    }

    setSavingDespesa(true);
    try {
      const response = await fetch("/api/despesas/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: descricaoTrim,
          categoria: despesaCategoria.trim() || null,
          valor: valorNumber,
          data: despesaData,
          mes_referencia: despesaData.slice(0, 7),
          cliente_id: despesaClienteId || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setDespesaError(payload?.error ?? "Não foi possível salvar a despesa.");
        return;
      }

      setDespesas((prev) => [{ ...payload.despesa, valor: Number(payload.despesa.valor ?? 0) }, ...prev]);
      setDespesaDescricao("");
      setDespesaValor("");
      setDespesaCategoria("");
      setDespesaData("");
      setDespesaClienteId("");
      setShowDespesaForm(false);
    } finally {
      setSavingDespesa(false);
    }
  };

  return (
    <AppShell title="Financeiro · Recebimentos" subtitle="Controle de cobranças e recebimentos" activeLabel="Financeiro">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedMonth((month) => shiftMonth(month, -1))}
              aria-label="Mês anterior"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              ‹
            </button>
            <span className="min-w-[180px] text-center text-lg font-semibold text-white">{formatMonthLabel(selectedMonth)}</span>
            <button
              onClick={() => setSelectedMonth((month) => shiftMonth(month, 1))}
              aria-label="Próximo mês"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              ›
            </button>
          </div>
          {!isCurrentMonth ? (
            <button
              onClick={() => setSelectedMonth(saoPauloMonthKey(new Date()))}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Voltar para o mês atual
            </button>
          ) : null}
        </div>

        {renewalAlerts.length ? (
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-amber-200">Alertas de renovação</p>
                <p className="mt-1 text-xs text-amber-300/80">Contratos vencendo em até 30 dias ou já vencidos.</p>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-200">
                {renewalAlerts.length} {renewalAlerts.length === 1 ? "contrato" : "contratos"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {renewalAlerts.map(({ cliente, info }) => (
                <span key={cliente.id} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${info.className}`}>
                  {cliente.nome} · {info.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Receita do mês</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary.receita)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Despesas do mês</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary.totalDespesas)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Margem do mês</p>
            <p className={`mt-3 text-3xl font-semibold ${summary.margem >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {formatCurrency(summary.margem)}
            </p>
          </div>
          <div className="rounded-3xl border border-[#D85A30]/30 bg-[#D85A30]/10 p-5">
            <p className="text-sm text-[#f0a480]">MRR total da agência</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(mrrTotal)}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">A receber no mês</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary.toReceive)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Recebido</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary.received)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Em atraso</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary.overdue)}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div>
            <p className="text-sm font-medium text-zinc-400">Evolução de receita</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Faturamento mês a mês</h3>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={receitaPorMesChart} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="mesLabel" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tickFormatter={(value) => formatCurrency(Number(value))}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "rgba(255,255,255,0.1)", borderRadius: 12 }}
                  labelStyle={{ color: "#f4f4f5" }}
                  formatter={(value) => [formatCurrency(Number(value)), "Receita"]}
                />
                <Line type="monotone" dataKey="total" stroke="#D85A30" strokeWidth={2} dot={{ r: 4, fill: "#D85A30" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {receitaPorMesChart.length <= 1 ? (
            <p className="mt-3 text-xs text-zinc-500">O gráfico ganha mais contexto conforme novos meses de cobrança forem lançados.</p>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div>
            <h3 className="text-lg font-semibold text-white">MRR por cliente</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Receita recorrente, margem líquida do mês, canal de aquisição, status de pagamento e vencimento de contrato.
            </p>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">MRR mensal</th>
                  <th className="px-4 py-3 font-medium">Margem líquida (mês)</th>
                  <th className="px-4 py-3 font-medium">Canal de aquisição</th>
                  <th className="px-4 py-3 font-medium">Status de pagamento</th>
                  <th className="px-4 py-3 font-medium">Fim do contrato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-zinc-950/60 text-zinc-200">
                {mrrPorCliente.map((cliente) => {
                  const receitaCliente = receitaPorClienteMes.get(cliente.id) ?? 0;
                  const despesasCliente = despesasPorClienteMes.get(cliente.id) ?? 0;
                  const temMovimentoNoMes = receitaPorClienteMes.has(cliente.id) || despesasPorClienteMes.has(cliente.id);
                  const margemCliente = receitaCliente - despesasCliente;
                  const renewal = getRenewalInfo(cliente.data_fim_contrato);

                  return (
                    <tr key={cliente.id}>
                      <td className="px-4 py-3 font-medium text-white">{cliente.nome}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(cliente.honorarios ?? 0)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {temMovimentoNoMes ? (
                          <span className={margemCliente >= 0 ? "text-emerald-300" : "text-rose-300"}>
                            {formatCurrency(margemCliente)}
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={cliente.canal_aquisicao ?? ""}
                          onChange={(event) => updateCanal(cliente.id, event.target.value as CanalAquisicao)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none"
                        >
                          <option value="" disabled className="bg-zinc-900 text-white">
                            Selecionar
                          </option>
                          {CANAL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className="bg-zinc-900 text-white">
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={cliente.status_pagamento}
                          onChange={(event) =>
                            updateStatusCobranca(cliente.id, selectedMonth, event.target.value as StatusPagamento)
                          }
                          className={`rounded-xl border px-3 py-1.5 text-sm font-medium outline-none ${getCobrancaStatusClass(cliente.status_pagamento)}`}
                        >
                          {STATUS_PAGAMENTO_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className="bg-zinc-900 text-white">
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <input
                            type="date"
                            value={cliente.data_fim_contrato ?? ""}
                            onChange={(event) => updateContrato(cliente.id, event.target.value)}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none"
                          />
                          {renewal ? (
                            <span className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium ${renewal.className}`}>
                              {renewal.label}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Desempenho por canal de aquisição</h3>
            <p className="mt-1 text-sm text-zinc-400">Ticket médio (MRR contratado) e LTV (receita já recebida) por canal.</p>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Canal</th>
                  <th className="px-4 py-3 font-medium">Clientes</th>
                  <th className="px-4 py-3 font-medium">Ticket médio</th>
                  <th className="px-4 py-3 font-medium">LTV (receita acumulada média)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-zinc-950/60 text-zinc-200">
                {canalStats.length ? (
                  canalStats.map((stat) => (
                    <tr key={stat.canal}>
                      <td className="px-4 py-3 font-medium text-white">{stat.label}</td>
                      <td className="px-4 py-3">{stat.count}</td>
                      <td className="px-4 py-3">{formatCurrency(stat.ticketMedio)}</td>
                      <td className="px-4 py-3">{formatCurrency(stat.ltv)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-400">
                      Nenhum cliente com canal de aquisição definido ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Despesas do mês</h3>
              <p className="mt-1 text-sm text-zinc-400">Lançamentos de custos para {formatMonthLabel(selectedMonth)}.</p>
            </div>
            <button
              onClick={() => setShowDespesaForm((prev) => !prev)}
              className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30]/10 px-4 py-2 text-sm font-semibold text-[#f0a480] transition hover:bg-[#D85A30]/20"
            >
              {showDespesaForm ? "Cancelar" : "+ Nova despesa"}
            </button>
          </div>

          {showDespesaForm ? (
            <form onSubmit={handleAddDespesa} className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-2 xl:grid-cols-4">
              <input
                value={despesaDescricao}
                onChange={(event) => setDespesaDescricao(event.target.value)}
                placeholder="Descrição da despesa"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 xl:col-span-2"
              />
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                Valor (R$)
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={despesaValor}
                  onChange={(event) => setDespesaValor(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                Data
                <input
                  type="date"
                  value={despesaData}
                  onChange={(event) => setDespesaData(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <input
                value={despesaCategoria}
                onChange={(event) => setDespesaCategoria(event.target.value)}
                placeholder="Categoria (opcional)"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
              />
              <select
                value={despesaClienteId}
                onChange={(event) => setDespesaClienteId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none xl:col-span-2"
              >
                <option value="" className="bg-zinc-900 text-white">
                  Despesa da agência (sem cliente)
                </option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id} className="bg-zinc-900 text-white">
                    {cliente.nome}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-3 xl:col-span-4">
                <button
                  type="submit"
                  disabled={savingDespesa}
                  className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c14f28] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingDespesa ? "Salvando..." : "Salvar despesa"}
                </button>
                {despesaError ? <p className="text-sm text-rose-300">{despesaError}</p> : null}
              </div>
            </form>
          ) : null}

          <div className="mt-5 space-y-3">
            {despesasMes.length ? (
              despesasMes.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{item.descricao}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {item.categoria ? `${item.categoria} · ` : ""}
                      {item.cliente_id ? `${clienteNomeMap.get(item.cliente_id) ?? "Cliente"} · ` : ""}
                      {item.data ? new Date(`${item.data}T00:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Sem data"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-rose-200">{formatCurrency(item.valor)}</span>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-zinc-400">
                Nenhuma despesa lançada para {formatMonthLabel(selectedMonth)}.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Cobranças do mês</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Gerado automaticamente para todo cliente ativo. O status aqui e o da tabela &ldquo;MRR por cliente&rdquo; são o mesmo dado.
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Valor mensal</th>
                  <th className="px-4 py-3 font-medium">Dia de vencimento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-zinc-950/60 text-zinc-200">
                {payments.length ? (
                  payments.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-white">{item.client}</td>
                      <td className="px-4 py-3">{formatCurrency(item.value)}</td>
                      <td className="px-4 py-3">{item.dueDay}</td>
                      <td className="px-4 py-3">
                        {item.rawStatus === "pendente" ? (
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(item.computedStatus)}`}>
                            {item.computedStatus}
                          </span>
                        ) : (
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getCobrancaStatusClass(item.rawStatus)}`}>
                            {getCobrancaStatusLabel(item.rawStatus)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <select
                            value={item.rawStatus === "pendente" ? "" : item.rawStatus}
                            onChange={(event) =>
                              updateStatusCobranca(item.clienteId, selectedMonth, event.target.value as StatusPagamento)
                            }
                            className={`rounded-xl border px-3 py-1.5 text-sm font-medium outline-none ${
                              item.rawStatus === "pendente" ? "border-white/10 bg-white/5 text-zinc-300" : getCobrancaStatusClass(item.rawStatus)
                            }`}
                          >
                            {item.rawStatus === "pendente" ? (
                              <option value="" disabled className="bg-zinc-900 text-white">
                                Marcar como recebido
                              </option>
                            ) : null}
                            {STATUS_PAGAMENTO_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value} className="bg-zinc-900 text-white">
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {item.recebidoComAtraso ? (
                            <span className="w-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                              Recebido com atraso
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-zinc-400">
                      Nenhuma cobrança lançada para {formatMonthLabel(selectedMonth)}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
