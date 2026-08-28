"use client";

type Documento={id:string;nome:string;categoria?:string|null;url:string;descricao?:string|null;criado_em?:string|null};
const label=(v?:string|null)=>(v||"outro").replaceAll("_"," ");
export function DocumentosPanel({documentos}:{documentos:Documento[]}){
 const cats=new Set(documentos.map(d=>label(d.categoria))).size;
 return <div className="space-y-5">
  <section className="grid gap-4 md:grid-cols-3"><Card label="Documentos" value={String(documentos.length)} detail="Arquivos vinculados ao cliente"/><Card label="Categorias" value={String(cats)} detail="Tipos de documentos registrados"/><Card label="Última atualização" value={documentos[0]?.criado_em?new Date(documentos[0].criado_em).toLocaleDateString("pt-BR"):"—"} detail="Documento mais recente"/></section>
  <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111316]"><div className="border-b border-white/[0.07] px-6 py-5"><p className="text-xs uppercase tracking-[0.15em] text-zinc-600">Arquivos</p><h3 className="mt-2 text-lg font-semibold text-zinc-100">Documentos do cliente</h3><p className="mt-1 text-xs text-zinc-600">Contratos, propostas, briefings, relatórios e materiais vinculados</p></div>
  {documentos.length?<div className="divide-y divide-white/[0.06]">{documentos.map(d=><div key={d.id} className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex items-center gap-3"><span className="text-lg">▤</span><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200">{d.nome}</p><p className="mt-1 text-xs text-zinc-600">{label(d.categoria)} · {d.criado_em?new Date(d.criado_em).toLocaleDateString("pt-BR"):"—"}</p></div></div>{d.descricao&&<p className="ml-8 mt-2 text-xs text-zinc-600">{d.descricao}</p>}</div><a href={d.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-[#d7b66f] transition hover:bg-white/5">Abrir documento ↗</a></div>)}</div>:<div className="p-12 text-center"><p className="text-sm text-zinc-500">Nenhum documento vinculado a este cliente.</p><p className="mt-2 text-xs text-zinc-700">Os arquivos adicionados à base Axven aparecerão aqui automaticamente.</p></div>}
  </section>
 </div>
}
function Card({label,value,detail}:{label:string;value:string;detail:string}){return <div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-5"><p className="text-[11px] uppercase tracking-[0.14em] text-zinc-600">{label}</p><p className="mt-3 text-2xl font-semibold text-zinc-100">{value}</p><p className="mt-2 text-xs text-zinc-600">{detail}</p></div>}
