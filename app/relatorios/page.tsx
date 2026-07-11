"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "../components/dashboard/AppShell";

type ClienteRow = { id: string; nome: string; };
type RelatorioRow = {
  id: string;
  cliente_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  criado_em: string;
};

type MetricaCliente = {
  cliente_id: string;
  cliente_nome: string;
  tipo?: "ecommerce" | "lead";
  investimento?: number;
  alcance?: number;
  cliques?: number;
  leads?: number;
  cpl?: number | null;
  pedidos?: number;
  receita?: number;
  roi?: number | null;
  semConta?: boolean;
  erro?: string;
};

function formatDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export default function RelatoriosPage() {
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [relatorios, setRelatorios] = useState<RelatorioRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("gerar") === "1",
  );
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [metricas, setMetricas] = useState<MetricaCliente[]>([]);
  const [metricasConectado, setMetricasConectado] = useState(true);
  const [loadingMetricas, setLoadingMetricas] = useState(true);

  const loadRelatorios = async () => {
    const response = await fetch("/api/relatorios/list");
    const { relatorios: data, clientes: clientesData } = await response.json();
    setRelatorios(data ?? []);
    setClientes(clientesData ?? []);
    if (clientesData?.[0]) setSelectedClienteId(clientesData[0].id);
  };

  useEffect(() => {
    (async () => {
      await loadRelatorios();
    })();

    fetch("/api/relatorios/metricas-semana")
      .then((res) => res.json())
      .then((payload) => {
        setMetricasConectado(payload?.conectado ?? false);
        setMetricas(payload?.metricas ?? []);
      })
      .finally(() => setLoadingMetricas(false));
  }, []);

  const handleGerar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClienteId || !periodoInicio || !periodoFim) return;
    setLoading(true);
    setFeedback(null);

    const response = await fetch("/api/relatorios/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente_id: selectedClienteId, periodo_inicio: periodoInicio, periodo_fim: periodoFim }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok || data.error) {
      setFeedback({ type: "error", message: data.error ?? "Erro ao gerar relatório." });
      return;
    }

    setFeedback({ type: "success", message: `Relatório de ${data.relatorio.cliente_nome} gerado com sucesso!` });
    setIsModalOpen(false);
    loadRelatorios();
  };

  return (
    <AppShell title="Relatórios" subtitle="Gestão de entregas" activeLabel="Relatórios">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Relatórios por cliente</h2>
            <p className="mt-1 text-sm text-zinc-400">Gere e compartilhe relatórios com seus clientes.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20">
            Gerar relatório semanal
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Últimos 7 dias</h3>
            {!metricasConectado && !loadingMetricas ? (
              <Link
                href="/integracoes"
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
              >
                Conectar Meta Ads →
              </Link>
            ) : null}
          </div>

          {loadingMetricas ? (
            <p className="mt-3 text-sm text-zinc-400">Carregando métricas...</p>
          ) : !metricasConectado ? (
            <div className="mt-3 rounded-3xl border border-dashed border-white/10 bg-zinc-950/80 p-6 text-sm text-zinc-400">
              Nenhuma conexão Meta ativa. Conecte na aba Integrações pra ver as métricas da semana aqui.
            </div>
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {metricas.map((m) => (
                <div key={m.cliente_id} className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
                  <p className="font-semibold text-white">{m.cliente_nome}</p>

                  {m.semConta ? (
                    <p className="mt-3 text-sm text-zinc-500">Sem conta de anúncio vinculada.</p>
                  ) : m.erro ? (
                    <p className="mt-3 text-sm text-amber-300">{m.erro}</p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-zinc-500">Investimento</p>
                        <p className="font-medium text-white">{formatCurrency(m.investimento ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Alcance</p>
                        <p className="font-medium text-white">{new Intl.NumberFormat("pt-BR").format(m.alcance ?? 0)}</p>
                      </div>
                      {m.tipo === "ecommerce" ? (
                        <>
                          <div>
                            <p className="text-xs text-zinc-500">Pedidos</p>
                            <p className="font-medium text-white">{m.pedidos ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">ROI</p>
                            <p className="font-medium text-emerald-300">{m.roi ? `${m.roi.toFixed(1)}x` : "—"}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs text-zinc-500">Leads</p>
                            <p className="font-medium text-white">{m.leads ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Custo por lead</p>
                            <p className="font-medium text-emerald-300">{m.cpl ? formatCurrency(m.cpl) : "—"}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {feedback && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-rose-500/20 bg-rose-500/10 text-rose-200"}`}>
            {feedback.message}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-white">Gerar relatório semanal</h3>
              <p className="mt-1 text-sm text-zinc-400">Selecione o cliente e o período.</p>
              <form onSubmit={handleGerar} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Cliente</label>
                  <select value={selectedClienteId} onChange={(e) => setSelectedClienteId(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Data início</label>
                  <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Data fim</label>
                  <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-300">Cancelar</button>
                  <button type="submit" disabled={loading} className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 disabled:opacity-70">
                    {loading ? "Gerando..." : "Confirmar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {relatorios.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-950/80 p-8 text-center text-sm text-zinc-400">
              Nenhum relatório gerado ainda.
            </div>
          )}
          {relatorios.map((r) => (
            <Link key={r.id} href={`/relatorios/${r.id}`} className="block rounded-3xl border border-white/10 bg-zinc-950/80 p-5 transition hover:border-violet-500/30">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-white">{r.cliente_nome}</p>
                  <p className="mt-1 text-sm text-zinc-400">{formatDate(r.periodo_inicio)} a {formatDate(r.periodo_fim)}</p>
                </div>
                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">Ver relatório →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
