"use client";

import { useEffect, useState } from "react";

type Criativo = {
  id: string; name: string; status?: string | null; effective_status?: string | null;
  campaign?: { id: string; name: string } | null; adset?: { id: string; name: string } | null;
  thumbnail_url?: string | null; headline?: string | null; body?: string | null;
  spend: number; impressions: number; reach: number; frequency: number; clicks: number; ctr: number; cpc: number;
  leads: number; mensagens: number; cpl: number | null; diagnostico: "Escalando" | "Saudável" | "Atenção" | "Fadiga" | "Sem dados";
};
type Data = { periodo: string; criativos: Criativo[] };
const money = (v: number, digits = 2) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: digits }).format(v);
const num = (v: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v);
const badge: Record<string, string> = {
  Escalando: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  Saudável: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  Atenção: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  Fadiga: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  "Sem dados": "border-white/10 bg-white/5 text-zinc-500",
};

export function CriativosPanel({ clienteId }: { clienteId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  async function carregar() {
    setLoading(true); setErro(null);
    try {
      const res = await fetch(`/api/clientes/criativos?cliente_id=${encodeURIComponent(clienteId)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao carregar criativos");
      setData(json);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao carregar criativos"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, [clienteId]);
  if (loading) return <div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-8 text-sm text-zinc-500">Carregando criativos da Meta...</div>;
  if (erro) return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">{erro}</div>;
  const items = data?.criativos ?? [];
  const ativos = items.filter((x) => x.effective_status === "ACTIVE" || x.status === "ACTIVE").length;
  const investimento = items.reduce((s, x) => s + x.spend, 0);
  const leads = items.reduce((s, x) => s + x.leads, 0);
  const melhor = [...items].filter((x) => x.spend > 0).sort((a,b) => (b.leads - a.leads) || (b.ctr - a.ctr))[0];
  return <div className="space-y-5">
    <div className="flex items-end justify-between"><div><p className="text-xs uppercase tracking-[0.15em] text-zinc-600">Meta Ads · {data?.periodo}</p><h3 className="mt-2 text-xl font-semibold">Biblioteca de performance</h3></div><button onClick={carregar} className="text-xs text-[#d7b66f] hover:text-[#e3c77f]">Atualizar dados</button></div>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[["Criativos", String(items.length), `${ativos} ativos`],["Investimento", money(investimento), "No período"],["Leads", String(leads), leads ? `CPL médio ${money(investimento / leads)}` : "Sem leads atribuídos"],["Destaque", melhor?.name ?? "—", melhor ? `${melhor.leads} leads · CTR ${num(melhor.ctr)}%` : "Sem dados"]].map(([a,b,c]) => <div key={a} className="rounded-2xl border border-white/[0.07] bg-[#111316] p-5"><p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{a}</p><p className="mt-3 truncate text-xl font-semibold text-zinc-100">{b}</p><p className="mt-2 text-xs text-zinc-600">{c}</p></div>)}
    </section>
    <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {items.map((x) => <article key={x.id} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111316]">
        <div className="aspect-[16/9] bg-[#0b0d0f]">{x.thumbnail_url ? <img src={x.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-zinc-700">Prévia indisponível</div>}</div>
        <div className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-100">{x.name}</p><p className="mt-1 truncate text-xs text-zinc-600">{x.campaign?.name ?? "—"} · {x.adset?.name ?? "—"}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] ${badge[x.diagnostico]}`}>{x.diagnostico}</span></div>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">{[["Invest.",money(x.spend)],["Leads",String(x.leads)],["CPL",x.cpl != null ? money(x.cpl) : "—"],["CTR",`${num(x.ctr)}%`],["Freq.",num(x.frequency)],["Cliques",String(x.clicks)]].map(([k,v]) => <div key={k}><p className="text-[9px] uppercase tracking-wider text-zinc-700">{k}</p><p className="mt-1 text-xs font-medium text-zinc-300">{v}</p></div>)}</div>
        </div>
      </article>)}
    </section>
    {!items.length && <div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-8 text-center text-sm text-zinc-600">Nenhum anúncio encontrado na conta Meta vinculada.</div>}
  </div>;
}
