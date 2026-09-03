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
            "a43f6da4-6918-4b4b-94f3-b2063e87b405",
            "692bbb9f-8760-466f-80ac-075412010545",
            "7985ea89-7b15-4cda-a4bd-f5340bcd6933",
            "ffab80f9-071f-4085-b503-62cc091ecf04"
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
    <p>JC Motos · Lais Obele Natal · Parmegiana de Garanhuns · Rei da Parmegiana</p>
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
