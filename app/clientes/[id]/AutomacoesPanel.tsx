"use client";

import { useEffect, useState } from "react";

type Execution = { id?: string; status?: string; startedAt?: string; stoppedAt?: string; workflowId?: string };
type Workflow = { id?: string; name?: string; active?: boolean; updatedAt?: string };
type Data = { workflow?: Workflow | null; executions?: Execution[]; error?: string };

export function AutomacoesPanel({ clienteId }: { clienteId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/clientes/automacoes?cliente_id=${encodeURIComponent(clienteId)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao consultar automações");
      setData(j);
    } catch (e) {
      setData({ error: e instanceof Error ? e.message : "Falha ao consultar automações" });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [clienteId]);
  if (loading) return <div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-6 text-sm text-zinc-500">Consultando saúde das automações...</div>;
  if (data?.error) return <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6"><p className="text-sm font-medium text-amber-300">Integração n8n ainda não disponível</p><p className="mt-2 text-xs text-zinc-500">{data.error}</p><button onClick={load} className="mt-4 text-xs text-[#d7b66f]">↻ Tentar novamente</button></div>;

  const executions = data?.executions ?? [];
  const success = executions.filter(x => x.status === "success").length;
  const errors = executions.filter(x => ["error", "failed", "crashed"].includes(x.status ?? "")).length;
  const rate = executions.length ? Math.round((success / executions.length) * 100) : null;
  const last = executions[0];
  const healthy = Boolean(data?.workflow?.active) && errors === 0;

  return <div className="space-y-5">
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card label="Status geral" value={healthy ? "Operacional" : data?.workflow?.active ? "Atenção" : "Inativo"} detail={data?.workflow?.active ? "Workflow ativo no n8n" : "Workflow desativado"} />
      <Card label="Execuções" value={String(executions.length)} detail="Amostra recente" />
      <Card label="Taxa de sucesso" value={rate == null ? "—" : `${rate}%`} detail={`${success} sucesso · ${errors} erro`} />
      <Card label="Última execução" value={last?.status ?? "—"} detail={last?.startedAt ? new Date(last.startedAt).toLocaleString("pt-BR") : "Sem execução disponível"} />
    </section>
    <section className="rounded-2xl border border-white/[0.07] bg-[#111316] p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.15em] text-zinc-600">n8n</p><h3 className="mt-2 text-lg font-semibold text-zinc-100">{data?.workflow?.name ?? "Workflow do cliente"}</h3><p className="mt-2 text-xs text-zinc-600">ID {data?.workflow?.id ?? "—"}</p></div><button onClick={load} className="text-xs text-[#d7b66f]">↻ Atualizar</button></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-zinc-600"><tr className="border-b border-white/[0.06]"><th className="pb-3 font-medium">Execução</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Início</th><th className="pb-3 font-medium">Fim</th></tr></thead><tbody>{executions.slice(0, 10).map((x, i) => <tr key={x.id ?? i} className="border-b border-white/[0.04] text-zinc-400"><td className="py-3">{x.id ?? "—"}</td><td className="py-3">{x.status ?? "—"}</td><td className="py-3">{x.startedAt ? new Date(x.startedAt).toLocaleString("pt-BR") : "—"}</td><td className="py-3">{x.stoppedAt ? new Date(x.stoppedAt).toLocaleString("pt-BR") : "—"}</td></tr>)}</tbody></table>{!executions.length && <p className="py-8 text-center text-zinc-600">Nenhuma execução disponível.</p>}</div>
    </section>
  </div>;
}

function Card({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-5"><p className="text-[11px] uppercase tracking-[0.14em] text-zinc-600">{label}</p><p className="mt-3 text-2xl font-semibold text-zinc-100">{value}</p><p className="mt-2 text-xs text-zinc-600">{detail}</p></div>; }
