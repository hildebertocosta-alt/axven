"use client";

import { useState } from "react";

type InsightRow = {
  id?: string;
  nome?: string;
  spend?: number;
  reach?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  frequency?: number;
  leads?: number;
  cpl?: number | null;
};

type MetaResponse = {
  fonte?: string;
  cliente?: { id?: string; nome?: string };
  periodo?: { inicio?: string; fim?: string };
  consolidado?: InsightRow;
  campanhas?: InsightRow[];
  anuncios?: InsightRow[];
  error?: string;
};

const INSTITUTO_CLIENTE_ID = "0e96745b-2f6f-4ded-890d-d909958be0af";

function moeda(value?: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function numero(value?: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

export default function MetaRelatoriosTestePage() {
  const [inicio, setInicio] = useState("2026-08-01");
  const [fim, setFim] = useState("2026-08-31");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<MetaResponse | null>(null);

  async function testar() {
    setLoading(true);
    setResultado(null);
    try {
      const response = await fetch("/api/relatorios/meta-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: INSTITUTO_CLIENTE_ID,
          periodo_inicio: inicio,
          periodo_fim: fim,
        }),
      });
      const data = (await response.json()) as MetaResponse;
      if (!response.ok) setResultado({ error: data.error || `Erro HTTP ${response.status}` });
      else setResultado(data);
    } catch (error) {
      setResultado({ error: error instanceof Error ? error.message : "Falha ao consultar Meta" });
    } finally {
      setLoading(false);
    }
  }

  const c = resultado?.consolidado;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-orange-400">Axven • Validação</div>
          <h1 className="mt-2 text-3xl font-semibold">Meta Ads → Relatórios V3</h1>
          <p className="mt-2 text-zinc-400">Teste controlado do Instituto da Indústria. Nenhum dado comercial é alterado nesta tela.</p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="text-sm text-zinc-300">Início
              <input className="mt-2 block w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </label>
            <label className="text-sm text-zinc-300">Fim
              <input className="mt-2 block w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </label>
            <button onClick={testar} disabled={loading} className="rounded-xl bg-orange-600 px-5 py-2.5 font-medium hover:bg-orange-500 disabled:opacity-50">
              {loading ? "Consultando Meta..." : "Puxar dados da Meta"}
            </button>
          </div>
        </section>

        {resultado?.error && (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <strong>Erro:</strong> {resultado.error}
          </section>
        )}

        {c && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <Metric label="Investimento" value={moeda(c.spend)} expected="Referência: R$ 2.271,85" />
              <Metric label="Leads" value={numero(c.leads)} expected="Referência: 420" />
              <Metric label="CPL" value={moeda(c.cpl)} />
              <Metric label="Cliques" value={numero(c.clicks)} />
              <Metric label="Alcance" value={numero(c.reach)} />
              <Metric label="Impressões" value={numero(c.impressions)} />
              <Metric label="CTR" value={c.ctr == null ? "—" : `${numero(c.ctr)}%`} />
              <Metric label="CPM" value={moeda(c.cpm)} />
            </section>

            <DataTable title="Campanhas" rows={resultado?.campanhas ?? []} />
            <DataTable title="Anúncios" rows={resultado?.anuncios ?? []} />
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, expected }: { label: string; value: string; expected?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {expected && <div className="mt-2 text-xs text-zinc-500">{expected}</div>}
    </div>
  );
}

function DataTable({ title, rows }: { title: string; rows: InsightRow[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
      <div className="border-b border-white/10 px-5 py-4 font-medium">{title} ({rows.length})</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-white/5 text-zinc-400">
            <tr><th className="px-4 py-3 text-left">Nome</th><th className="px-4 py-3 text-right">Invest.</th><th className="px-4 py-3 text-right">Leads</th><th className="px-4 py-3 text-right">CPL</th><th className="px-4 py-3 text-right">Cliques</th><th className="px-4 py-3 text-right">CTR</th><th className="px-4 py-3 text-right">CPM</th></tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id ?? row.nome ?? "row"}-${index}`} className="border-t border-white/5">
                <td className="px-4 py-3">{row.nome ?? row.id ?? "—"}</td>
                <td className="px-4 py-3 text-right">{moeda(row.spend)}</td>
                <td className="px-4 py-3 text-right">{numero(row.leads)}</td>
                <td className="px-4 py-3 text-right">{moeda(row.cpl)}</td>
                <td className="px-4 py-3 text-right">{numero(row.clicks)}</td>
                <td className="px-4 py-3 text-right">{row.ctr == null ? "—" : `${numero(row.ctr)}%`}</td>
                <td className="px-4 py-3 text-right">{moeda(row.cpm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
