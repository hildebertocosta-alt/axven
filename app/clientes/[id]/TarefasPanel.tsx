"use client";

type Tarefa = Record<string, unknown> & { id:string; titulo?:string|null; prioridade?:string|null; concluido?:boolean|null; criado_em?:string|null; prazo?:string|null; data_limite?:string|null; descricao?:string|null };
const date=(v:unknown)=>typeof v==="string"&&v?new Date(v.length===10?`${v}T12:00:00`:v).toLocaleDateString("pt-BR"):"—";

export function TarefasPanel({ tarefas }:{ tarefas:Tarefa[] }){
 const abertas=tarefas.filter(t=>!t.concluido); const concluidas=tarefas.filter(t=>t.concluido); const altas=abertas.filter(t=>["alta","urgente"].includes(String(t.prioridade||"").toLowerCase()));
 return <div className="space-y-5">
  <section className="grid gap-4 md:grid-cols-3">
   <Card label="Tarefas abertas" value={String(abertas.length)} detail="Pendências operacionais" />
   <Card label="Prioridade alta" value={String(altas.length)} detail="Exigem atenção" />
   <Card label="Concluídas" value={String(concluidas.length)} detail="No histórico carregado" />
  </section>
  <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111316]">
   <div className="border-b border-white/[0.07] px-6 py-5"><p className="text-xs uppercase tracking-[0.15em] text-zinc-600">Operação</p><h3 className="mt-2 text-lg font-semibold text-zinc-100">Tarefas do cliente</h3><p className="mt-1 text-xs text-zinc-600">Acompanhamento das atividades registradas na Axven</p></div>
   <div className="divide-y divide-white/[0.06]">{tarefas.map(t=><div key={t.id} className="grid gap-3 px-6 py-5 md:grid-cols-[1fr_130px_130px_120px] md:items-center"><div><p className={`text-sm font-medium ${t.concluido?"text-zinc-600 line-through":"text-zinc-200"}`}>{t.titulo||"Tarefa sem título"}</p>{typeof t.descricao==="string"&&t.descricao&&<p className="mt-1 text-xs text-zinc-600">{t.descricao}</p>}</div><div><span className={`rounded-full border px-2.5 py-1 text-xs ${priorityClass(t.prioridade)}`}>{t.prioridade||"normal"}</span></div><p className="text-xs text-zinc-500">Prazo: {date(t.prazo??t.data_limite)}</p><span className={`text-xs font-medium ${t.concluido?"text-emerald-400":"text-amber-300"}`}>{t.concluido?"✓ Concluída":"● Aberta"}</span></div>)}</div>
   {!tarefas.length&&<div className="p-10 text-center"><p className="text-sm text-zinc-500">Nenhuma tarefa registrada para este cliente.</p><p className="mt-2 text-xs text-zinc-700">Quando houver tarefas no Supabase, elas aparecerão aqui automaticamente.</p></div>}
  </section>
 </div>;
}
function priorityClass(v:unknown){const p=String(v||"").toLowerCase();if(p==="alta"||p==="urgente")return "border-rose-500/20 bg-rose-500/10 text-rose-300";if(p==="media"||p==="média")return "border-amber-500/20 bg-amber-500/10 text-amber-300";return "border-white/10 bg-white/5 text-zinc-400"}
function Card({label,value,detail}:{label:string;value:string;detail:string}){return <div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-5"><p className="text-[11px] uppercase tracking-[0.14em] text-zinc-600">{label}</p><p className="mt-3 text-2xl font-semibold text-zinc-100">{value}</p><p className="mt-2 text-xs text-zinc-600">{detail}</p></div>}
