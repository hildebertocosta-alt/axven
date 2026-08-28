"use client";

import { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  nome?: string | null;
  telefone?: string | null;
  etapa?: string | null;
  origem?: string | null;
  campanha?: string | null;
  conjunto?: string | null;
  anuncio?: string | null;
  plataforma?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
};

type LeadsData = {
  resumo: { total: number; ultimos_30_dias: number; qualificados: number; agendados: number; vendas: number };
  etapas: Record<string, number>;
  origens: Record<string, number>;
  leads: Lead[];
};

const labelEtapa = (etapa?: string | null) => (etapa || "sem etapa").replaceAll("_", " ");
const dataHora = (valor?: string | null) => valor ? new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export function LeadsPanel({ clienteId, metaLeads30d }: { clienteId: string; metaLeads30d: number | null }) {
  const [data, setData] = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const response = await fetch(`/api/clientes/leads?cliente_id=${encodeURIComponent(clienteId)}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Falha ao carregar leads");
        setData(payload);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao carregar leads");
      } finally {
        setLoading(false);
      }
    })();
  }, [clienteId]);

  const origemPrincipal = useMemo(() => {
    if (!data) return "—";
    const item = Object.entries(data.origens).sort((a, b) => b[1] - a[1])[0];
    return item ? `${item[0]} · ${item[1]}` : "—";
  }, [data]);

  if (loading) return <section className="rounded-2xl border border-white/[0.07] bg-[#111316] p-8 text-sm text-zinc-500">Carregando leads registrados no CRM...</section>;
  if (erro || !data) return <section className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-300">{erro || "Não foi possível carregar os leads."}</section>;

  const diferenca = metaLeads30d != null ? metaLeads30d - data.resumo.ultimos_30_dias : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-[#caa45c]">CRM do cliente</p>
          <h3 className="mt-2 text-xl font-semibold text-zinc-100">Leads registrados</h3>
          <p className="mt-1 text-sm text-zinc-600">Dados salvos na tabela de leads e vinculados diretamente a este cliente.</p>
        </div>
        <div className="text-xs text-zinc-600">Origem principal: <span className="text-zinc-400">{origemPrincipal}</span></div>
      </div>

      {metaLeads30d != null && diferenca !== null && diferenca !== 0 && (
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.06] p-4 text-sm text-amber-200/80">
          A Meta contabiliza {metaLeads30d} leads nos últimos 30 dias, enquanto o CRM possui {data.resumo.ultimos_30_dias} registros nesse período. Diferença atual: {Math.abs(diferenca)}. Isso indica que parte dos leads ainda não está sendo gravada no CRM deste cliente.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Total CRM", data.resumo.total],
          ["Últimos 30 dias", data.resumo.ultimos_30_dias],
          ["Qualificados", data.resumo.qualificados],
          ["Agendados", data.resumo.agendados],
          ["Vendas", data.resumo.vendas],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-white/[0.07] bg-[#111316] p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-zinc-100">{String(value)}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111316]">
        <div className="border-b border-white/[0.07] px-6 py-5">
          <h3 className="text-lg font-semibold text-zinc-100">Histórico de leads</h3>
          <p className="mt-1 text-xs text-zinc-600">Origem, etapa e atribuição disponíveis no CRM</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#0c0e10] text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              <tr><th className="px-6 py-3">Lead</th><th className="px-4 py-3">Etapa</th><th className="px-4 py-3">Origem</th><th className="px-4 py-3">Campanha</th><th className="px-4 py-3">Anúncio</th><th className="px-4 py-3">Entrada</th></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {data.leads.map((lead) => (
                <tr key={lead.id} className="text-zinc-300">
                  <td className="px-6 py-4"><p className="font-medium text-zinc-200">{lead.nome || "Sem nome"}</p><p className="mt-1 text-xs text-zinc-600">{lead.telefone || "—"}</p></td>
                  <td className="px-4 py-4"><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase text-zinc-400">{labelEtapa(lead.etapa)}</span></td>
                  <td className="px-4 py-4">{lead.origem || lead.plataforma || "—"}</td>
                  <td className="px-4 py-4">{lead.campanha || "—"}</td>
                  <td className="px-4 py-4">{lead.anuncio || "—"}</td>
                  <td className="px-4 py-4 text-xs text-zinc-500">{dataHora(lead.criado_em)}</td>
                </tr>
              ))}
              {data.leads.length === 0 && <tr><td colSpan={6} className="px-6 py-10 text-center text-zinc-600">Nenhum lead registrado para este cliente.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
