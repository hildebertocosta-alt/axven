"use client";

import { useEffect, useState } from "react";

type Criativo = {
  id:string; name:string; status?:string|null; effective_status?:string|null;
  campaign?:{id:string;name:string}|null; adset?:{id:string;name:string}|null; thumbnail_url?:string|null;
  spend:number; frequency:number; clicks:number; ctr:number; leads:number; cpl:number|null;
  diagnostico:"Escalando"|"Saudável"|"Atenção"|"Fadiga"|"Sem dados";
};
type Data={periodo:string;status:string;criativos:Criativo[]};
type StatusFiltro="active"|"paused"|"all";
const money=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:2}).format(v);
const num=(v:number)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(v);
const badge:Record<string,string>={Escalando:"border-emerald-500/20 bg-emerald-500/10 text-emerald-300",Saudável:"border-sky-500/20 bg-sky-500/10 text-sky-300",Atenção:"border-amber-500/20 bg-amber-500/10 text-amber-300",Fadiga:"border-rose-500/20 bg-rose-500/10 text-rose-300","Sem dados":"border-white/10 bg-white/5 text-zinc-500"};

function dateOffset(days:number){const d=new Date();d.setDate(d.getDate()-days);return d.toISOString().slice(0,10)}

export function CriativosPanel({clienteId}:{clienteId:string}){
  const [data,setData]=useState<Data|null>(null); const [loading,setLoading]=useState(true); const [erro,setErro]=useState<string|null>(null);
  const [status,setStatus]=useState<StatusFiltro>("active"); const [preset,setPreset]=useState("30");
  const [since,setSince]=useState(dateOffset(29)); const [until,setUntil]=useState(new Date().toISOString().slice(0,10));

  async function carregar(nextStatus=status,nextPreset=preset,nextSince=since,nextUntil=until){
    setLoading(true);setErro(null);
    try{
      const qs=new URLSearchParams({cliente_id:clienteId,status:nextStatus});
      if(nextPreset!=="30"){qs.set("since",nextSince);qs.set("until",nextUntil)}
      const res=await fetch(`/api/clientes/criativos?${qs.toString()}`,{cache:"no-store"}); const json=await res.json();
      if(!res.ok)throw new Error(json.error||"Falha ao carregar criativos"); setData(json);
    }catch(e){setErro(e instanceof Error?e.message:"Falha ao carregar criativos")}finally{setLoading(false)}
  }
  useEffect(()=>{carregar("active","30",since,until)},[clienteId]);

  function periodo(value:string){
    setPreset(value); let s=since,u=new Date().toISOString().slice(0,10);
    if(value!=="custom"){const dias=Number(value);s=dateOffset(dias-1);setSince(s);setUntil(u);carregar(status,value,s,u)}
  }
  function mudarStatus(value:StatusFiltro){setStatus(value);carregar(value,preset,since,until)}
  const items=data?.criativos??[]; const investimento=items.reduce((s,x)=>s+x.spend,0); const leads=items.reduce((s,x)=>s+x.leads,0);
  const melhor=[...items].filter(x=>x.spend>0).sort((a,b)=>(b.leads-a.leads)||(b.ctr-a.ctr))[0];

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs uppercase tracking-[0.15em] text-zinc-600">Meta Ads · {data?.periodo??"—"}</p><h3 className="mt-2 text-xl font-semibold">Biblioteca de performance</h3></div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={status} onChange={e=>mudarStatus(e.target.value as StatusFiltro)} className="h-9 rounded-lg border border-white/10 bg-[#111316] px-3 text-xs text-zinc-300 outline-none"><option value="active">Ativos</option><option value="paused">Pausados</option><option value="all">Todos</option></select>
        {["7","14","30","custom"].map(p=><button key={p} onClick={()=>periodo(p)} className={`h-9 rounded-lg border px-3 text-xs ${preset===p?"border-[#caa45c]/50 bg-[#caa45c]/10 text-[#d7b66f]":"border-white/10 text-zinc-500 hover:text-zinc-300"}`}>{p==="custom"?"Personalizado":`${p} dias`}</button>)}
        <button onClick={()=>carregar()} className="h-9 px-2 text-xs text-[#d7b66f]">↻ Atualizar</button>
      </div>
    </div>
    {preset==="custom"&&<div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/[0.07] bg-[#111316] p-4"><label className="text-[10px] uppercase tracking-wider text-zinc-600">Data inicial<input type="date" value={since} onChange={e=>setSince(e.target.value)} className="mt-2 block h-9 rounded-lg border border-white/10 bg-[#0c0e10] px-3 text-xs text-zinc-300"/></label><label className="text-[10px] uppercase tracking-wider text-zinc-600">Data final<input type="date" value={until} onChange={e=>setUntil(e.target.value)} className="mt-2 block h-9 rounded-lg border border-white/10 bg-[#0c0e10] px-3 text-xs text-zinc-300"/></label><button onClick={()=>carregar(status,"custom",since,until)} className="h-9 rounded-lg bg-[#caa45c] px-4 text-xs font-semibold text-[#111214]">Aplicar período</button></div>}
    {loading&&<div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-8 text-sm text-zinc-500">Carregando criativos da Meta...</div>}
    {erro&&<div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">{erro}</div>}
    {!loading&&!erro&&<>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[["Criativos",String(items.length),status==="active"?"Somente ativos":status==="paused"?"Somente pausados":"Todos os status"],["Investimento",money(investimento),"No período selecionado"],["Leads",String(leads),leads?`CPL médio ${money(investimento/leads)}`:"Sem leads atribuídos"],["Destaque",melhor?.name??"—",melhor?`${melhor.leads} leads · CTR ${num(melhor.ctr)}%`:"Sem dados"]].map(([a,b,c])=><div key={a} className="rounded-2xl border border-white/[0.07] bg-[#111316] p-5"><p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{a}</p><p className="mt-3 truncate text-xl font-semibold text-zinc-100">{b}</p><p className="mt-2 text-xs text-zinc-600">{c}</p></div>)}</section>
      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{items.map(x=><article key={x.id} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111316]"><div className="aspect-[16/9] bg-[#0b0d0f]">{x.thumbnail_url?<img src={x.thumbnail_url} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-xs text-zinc-700">Prévia indisponível</div>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-100">{x.name}</p><p className="mt-1 truncate text-xs text-zinc-600">{x.campaign?.name??"—"} · {x.adset?.name??"—"}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] ${badge[x.diagnostico]}`}>{x.diagnostico}</span></div><div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">{[["Invest.",money(x.spend)],["Leads",String(x.leads)],["CPL",x.cpl!=null?money(x.cpl):"—"],["CTR",`${num(x.ctr)}%`],["Freq.",num(x.frequency)],["Cliques",String(x.clicks)]].map(([k,v])=><div key={k}><p className="text-[9px] uppercase tracking-wider text-zinc-700">{k}</p><p className="mt-1 text-xs font-medium text-zinc-300">{v}</p></div>)}</div></div></article>)}</section>
      {!items.length&&<div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-8 text-center text-sm text-zinc-600">Nenhum criativo encontrado para os filtros selecionados.</div>}
    </>}
  </div>
}
