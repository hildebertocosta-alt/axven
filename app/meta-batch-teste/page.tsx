"use client";

import { useState } from "react";

export default function MetaBatchTestePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function executar() {
    setLoading(true); setError(""); setData(null);
    try {
      const r = await fetch("/api/relatorios/meta-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodo_inicio: "2026-08-01",
          periodo_fim: "2026-08-31",
          cliente_ids: [
            "fb49219f-62ff-46be-b183-b5096654a99c",
            "1b5b59aa-c29f-43fc-91e6-bf20855430b3",
            "0e8666ef-a557-49b3-9677-71fb529a99ce",
            "89d834fc-c013-4510-b062-0d5de4b9f0b3"
          ]
        })
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Falha na consulta");
      setData(body);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoading(false); }
  }

  return <main style={{padding:32,fontFamily:"Arial",maxWidth:1200,margin:"auto"}}>
    <h1>Meta Batch — Agosto 2026</h1>
    <p>Face e Corpo · Dra. Gabriela Brito · OBELE · Camilo Imóveis</p>
    <button onClick={executar} disabled={loading} style={{padding:"12px 18px",cursor:"pointer"}}>{loading ? "Consultando Meta..." : "Consultar agosto"}</button>
    {error && <p style={{marginTop:20}}>Erro: {error}</p>}
    {data?.resultados && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16,marginTop:24}}>
      {data.resultados.map((r:any)=><section key={r.cliente.id} style={{border:"1px solid #ddd",borderRadius:12,padding:18}}>
        <h2 style={{fontSize:18}}>{r.cliente.nome}</h2>
        {r.erro ? <p>Erro: {r.erro}</p> : r.meta ? <>
          <p><b>Investimento:</b> R$ {r.meta.investimento.toFixed(2)}</p>
          <p><b>Leads:</b> {r.meta.leads}</p>
          <p><b>CPL:</b> {r.meta.cpl == null ? "—" : `R$ ${r.meta.cpl.toFixed(2)}`}</p>
          <p><b>Alcance:</b> {r.meta.alcance}</p>
          <p><b>Impressões:</b> {r.meta.impressoes}</p>
          <p><b>Cliques:</b> {r.meta.cliques}</p>
          <p><b>CTR:</b> {r.meta.ctr.toFixed(2)}%</p>
          <p><b>CPM:</b> R$ {r.meta.cpm.toFixed(2)}</p>
        </> : <p>Sem dados no período.</p>}
      </section>)}
    </div>}
  </main>;
}
