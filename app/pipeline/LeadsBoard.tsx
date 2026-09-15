"use client";

import { useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, closestCorners, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type Etapa = "lead" | "qualificado" | "agendado" | "proposta_enviada" | "fechado" | "nao_fechou" | "desqualificado";
export type LeadEvent = { id:string; lead_id:string; tipo_evento:string; etapa_anterior:Etapa|null; etapa_nova:Etapa|null; motivo:string|null; metadata:Record<string,unknown>; criado_em:string };
export type Booking = { id:string; lead_id:string; inicio:string; fim:string; timezone:string; status:string; criado_em:string };
export type LeadRow = {
  id:string; nome:string|null; whatsapp:string; telefone:string; clinica:string|null; nicho:string|null; instagram:string|null;
  landing_page:string|null; origem_url:string|null; como_chegou:string|null; faturamento_faixa:string; investimento_ads_faixa:string;
  desafio_principal:string; novos_pacientes_faixa:string|null; qualificado:boolean; motivo_desqualificacao:string|null;
  utm_source:string|null; utm_medium:string|null; utm_campaign:string|null; utm_content:string|null; fbclid:string|null;
  campaign_id:string|null; adset_id:string|null; ad_id:string|null; etapa:Etapa; agendado_em:string|null;
  venda_em:string|null; valor_venda:number|null; moeda:string|null; criado_em:string; atualizado_em:string;
  booking:Booking|null; events:LeadEvent[];
};

type Column={key:Etapa;label:string;accent:string};
const COLUMNS:Column[]=[
  {key:"lead",label:"Lead",accent:"border-white/10 bg-zinc-950/80"},{key:"qualificado",label:"Qualificado",accent:"border-sky-500/20 bg-sky-500/5"},
  {key:"agendado",label:"Agendado",accent:"border-violet-500/20 bg-violet-500/5"},{key:"proposta_enviada",label:"Proposta enviada",accent:"border-amber-500/20 bg-amber-500/5"},
  {key:"fechado",label:"Fechado",accent:"border-emerald-500/20 bg-emerald-500/5"},{key:"nao_fechou",label:"Não fechou",accent:"border-rose-500/20 bg-rose-500/5"},
  {key:"desqualificado",label:"Desqualificado",accent:"border-zinc-600/30 bg-zinc-800/40"},
];
const labelEtapa=(value:Etapa|null)=>COLUMNS.find((item)=>item.key===value)?.label??value??"—";
const fmt=(value?:string|null)=>value?new Date(value).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"—";
const dinheiro=(value?:number|null,moeda="BRL")=>value==null?"—":new Intl.NumberFormat("pt-BR",{style:"currency",currency:moeda||"BRL"}).format(value);

function LeadCard({lead,onMove,onOpen,dragging=false}:{lead:LeadRow;onMove?:(lead:LeadRow,etapa:Etapa)=>void;onOpen?:()=>void;dragging?:boolean}){
  const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:lead.id});
  return <div ref={setNodeRef} style={{transform:CSS.Transform.toString(transform),transition,opacity:isDragging?.4:1}} {...attributes} {...listeners}
    role="button" tabIndex={0} onKeyDown={(event)=>{if((event.key==="Enter"||event.key===" ")&&!isDragging){event.preventDefault();onOpen?.()}}}
    onClick={()=>{if(!isDragging)onOpen?.()}} className={`cursor-grab rounded-2xl border border-white/10 bg-zinc-900/80 p-4 text-sm shadow-sm transition hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#ff6846]/40 active:cursor-grabbing ${dragging?"rotate-2 shadow-xl":""}`}>
    <div className="flex items-start justify-between gap-2"><div><p className="font-medium text-white">{lead.nome||"Sem nome"}</p>{lead.clinica?<p className="mt-1 text-xs text-zinc-400">{lead.clinica}</p>:null}</div>{lead.qualificado?<span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-200">Qualificado</span>:null}</div>
    <p className="mt-2 text-xs text-zinc-400">{lead.whatsapp}</p>
    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-400">{lead.como_chegou?<span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{lead.como_chegou}</span>:null}{lead.utm_campaign?<span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{lead.utm_campaign}</span>:null}</div>
    {lead.agendado_em?<p className="mt-3 text-[11px] text-violet-200">Agenda: {fmt(lead.agendado_em)}</p>:null}
    {lead.valor_venda!=null?<p className="mt-2 text-xs font-medium text-emerald-200">{dinheiro(lead.valor_venda,lead.moeda||"BRL")}</p>:null}
    <p className="mt-3 text-[10px] text-zinc-600">Atualizado {fmt(lead.atualizado_em)}</p>
    {onMove?<select value={lead.etapa} onPointerDown={(e)=>e.stopPropagation()} onClick={(e)=>e.stopPropagation()} onChange={(e)=>{e.stopPropagation();const etapa=e.target.value as Etapa;if(etapa!==lead.etapa)onMove(lead,etapa)}} className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
      {COLUMNS.map((column)=><option key={column.key} value={column.key}>{column.label}</option>)}
    </select>:null}
  </div>;
}

function KanbanColumn({column,leads,onMove,onOpen}:{column:Column;leads:LeadRow[];onMove:(lead:LeadRow,etapa:Etapa)=>void;onOpen:(lead:LeadRow)=>void}){
  const {setNodeRef,isOver}=useDroppable({id:column.key});
  return <div className="flex min-w-[280px] flex-1 flex-col"><div className="mb-3 flex items-center justify-between px-1"><span className="text-xs font-medium text-zinc-300">{column.label}</span><span className="text-xs text-zinc-500">{leads.length}</span></div>
    <div ref={setNodeRef} className={`flex min-h-[220px] flex-1 flex-col gap-3 rounded-3xl border p-3 ${column.accent} ${isOver?"ring-2 ring-[#D85A30]/40":""}`}><SortableContext items={leads.map((lead)=>lead.id)} strategy={verticalListSortingStrategy}>{leads.map((lead)=><LeadCard key={lead.id} lead={lead} onMove={onMove} onOpen={()=>onOpen(lead)}/>)}</SortableContext>{!leads.length?<p className="py-6 text-center text-xs text-zinc-500">Nenhum lead</p>:null}</div>
  </div>;
}

function Field({label,value}:{label:string;value:React.ReactNode}){return <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p><div className="mt-1 break-words text-sm text-zinc-200">{value||"—"}</div></div>}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section><h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff7458]">{title}</h3><div className="grid gap-2 sm:grid-cols-2">{children}</div></section>}

function DetailDrawer({lead,onClose}:{lead:LeadRow;onClose:()=>void}){
  return <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose}><aside onClick={(e)=>e.stopPropagation()} className="ml-auto h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#090a0d] p-5 shadow-2xl sm:p-7">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-[#ff7458]">Detalhes do lead</p><h2 className="mt-2 text-2xl font-semibold text-white">{lead.nome}</h2></div><button onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300">Fechar</button></div>
    <div className="mt-7 space-y-7">
      <Section title="Identificação"><Field label="WhatsApp" value={lead.whatsapp}/><Field label="Instagram / clínica" value={[lead.instagram,lead.clinica].filter(Boolean).join(" · ")}/><Field label="Entrada" value={fmt(lead.criado_em)}/><Field label="Landing page" value={lead.landing_page}/></Section>
      <Section title="Diagnóstico"><Field label="Faturamento" value={lead.faturamento_faixa}/><Field label="Investimento em anúncios" value={lead.investimento_ads_faixa}/><Field label="Principal desafio" value={lead.desafio_principal}/><Field label="Novos pacientes/mês" value={lead.novos_pacientes_faixa}/><Field label="Qualificado" value={lead.qualificado?"Sim":"Não"}/><Field label="Resultado da qualificação" value={lead.motivo_desqualificacao}/></Section>
      <Section title="Atribuição"><Field label="Origem" value={lead.como_chegou}/><Field label="UTM source / medium" value={[lead.utm_source,lead.utm_medium].filter(Boolean).join(" / ")}/><Field label="UTM campaign" value={lead.utm_campaign}/><Field label="UTM content" value={lead.utm_content}/><Field label="Campaign ID" value={lead.campaign_id}/><Field label="Adset ID" value={lead.adset_id}/><Field label="Ad ID" value={lead.ad_id}/><Field label="fbclid" value={lead.fbclid}/></Section>
      <Section title="Agendamento"><Field label="Status" value={lead.booking?.status}/><Field label="Data e horário" value={lead.booking?fmt(lead.booking.inicio):fmt(lead.agendado_em)}/><Field label="Término" value={lead.booking?fmt(lead.booking.fim):null}/><Field label="Timezone" value={lead.booking?.timezone}/></Section>
      <Section title="Comercial"><Field label="Etapa atual" value={labelEtapa(lead.etapa)}/><Field label="Venda" value={dinheiro(lead.valor_venda,lead.moeda||"BRL")}/><Field label="Data da venda" value={fmt(lead.venda_em)}/><Field label="Última atualização" value={fmt(lead.atualizado_em)}/></Section>
      <section><h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff7458]">Timeline</h3><div className="space-y-2">{lead.events.length?lead.events.map((event)=><div key={event.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-sm text-zinc-200">{labelEtapa(event.etapa_anterior)} → {labelEtapa(event.etapa_nova)}</p>{event.motivo?<p className="mt-1 text-xs text-zinc-400">Motivo: {event.motivo}</p>:null}<p className="mt-2 text-[10px] text-zinc-600">{fmt(event.criado_em)}</p></div>):<p className="text-sm text-zinc-500">Nenhum evento registrado após a implantação da timeline.</p>}</div></section>
    </div>
  </aside></div>;
}

function ReasonModal({lead,etapa,onCancel,onSave}:{lead:LeadRow;etapa:Etapa;onCancel:()=>void;onSave:(motivo:string)=>Promise<void>}){
  const [motivo,setMotivo]=useState("");const [saving,setSaving]=useState(false);
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4"><form onSubmit={async(e)=>{e.preventDefault();if(!motivo.trim())return;setSaving(true);await onSave(motivo.trim());setSaving(false)}} className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6"><h3 className="text-xl font-semibold text-white">{labelEtapa(etapa)} · {lead.nome}</h3><label className="mt-5 block text-xs text-zinc-400">Motivo</label><textarea required maxLength={500} value={motivo} onChange={(e)=>setMotivo(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"/><div className="mt-5 flex gap-2"><button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/10 p-3 text-zinc-300">Cancelar</button><button disabled={saving} className="flex-1 rounded-xl bg-[#ff6846] p-3 font-medium text-black">{saving?"Salvando...":"Confirmar"}</button></div></form></div>;
}

function ClosingModal({lead,onCancel,onSave}:{lead:LeadRow;onCancel:()=>void;onSave:(payload:Record<string,unknown>)=>Promise<void>}){
  const [valor,setValor]=useState("");const [moeda,setMoeda]=useState("BRL");const [data,setData]=useState(new Date().toISOString().slice(0,10));const [saving,setSaving]=useState(false);
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4"><form onSubmit={async(e)=>{e.preventDefault();setSaving(true);await onSave({valor_venda:Number(valor.replace(",",".")),moeda,venda_em:`${data}T12:00:00-03:00`});setSaving(false)}} className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6"><h3 className="text-xl font-semibold text-white">Registrar venda · {lead.nome}</h3><input required inputMode="decimal" value={valor} onChange={(e)=>setValor(e.target.value)} placeholder="Valor" className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white"/><div className="mt-3 grid grid-cols-2 gap-3"><select value={moeda} onChange={(e)=>setMoeda(e.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 p-3 text-white"><option>BRL</option><option>USD</option><option>EUR</option></select><input required type="date" value={data} onChange={(e)=>setData(e.target.value)} className="rounded-xl border border-white/10 bg-zinc-900 p-3 text-white"/></div><div className="mt-5 flex gap-2"><button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/10 p-3 text-zinc-300">Cancelar</button><button disabled={saving} className="flex-1 rounded-xl bg-emerald-500 p-3 font-medium text-black">{saving?"Salvando...":"Fechar venda"}</button></div></form></div>;
}

export function LeadsBoard({initialLeads}:{initialLeads:LeadRow[]}){
  const [leads,setLeads]=useState(initialLeads);const [active,setActive]=useState<LeadRow|null>(null);const [detailId,setDetailId]=useState<string|null>(null);const [pending,setPending]=useState<{lead:LeadRow;etapa:Etapa}|null>(null);const [error,setError]=useState<string|null>(null);
  const [search,setSearch]=useState("");const [stage,setStage]=useState("todas");const [origin,setOrigin]=useState("todas");const [campaign,setCampaign]=useState("todas");
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}));
  const origins=useMemo(()=>[...new Set(leads.map((lead)=>lead.como_chegou).filter(Boolean) as string[])].sort(),[leads]);
  const campaigns=useMemo(()=>[...new Set(leads.map((lead)=>lead.utm_campaign).filter(Boolean) as string[])].sort(),[leads]);
  const visible=useMemo(()=>leads.filter((lead)=>{const term=search.trim().toLowerCase();return (!term||lead.nome?.toLowerCase().includes(term)||lead.whatsapp.includes(term))&&(stage==="todas"||lead.etapa===stage)&&(origin==="todas"||lead.como_chegou===origin)&&(campaign==="todas"||lead.utm_campaign===campaign)}),[leads,search,stage,origin,campaign]);
  const detail=leads.find((lead)=>lead.id===detailId)??null;

  async function mutate(lead:LeadRow,etapa:Etapa,extra:Record<string,unknown>={}){
    setError(null);const response=await fetch("/api/crm/axven/leads/atualizar-etapa",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:lead.id,etapa,...extra})});const payload=await response.json().catch(()=>null);
    if(!response.ok){setError(payload?.error||"Não foi possível atualizar a etapa.");return false}
    setLeads((current)=>current.map((item)=>item.id===lead.id?{...item,...payload.lead,events:payload.event?[payload.event,...item.events]:item.events}:item));return true;
  }
  async function request(lead:LeadRow,etapa:Etapa){if(etapa===lead.etapa)return;if(etapa==="fechado"||etapa==="nao_fechou"||etapa==="desqualificado"){setPending({lead,etapa});return}await mutate(lead,etapa)}
  function dragEnd(event:DragEndEvent){setActive(null);if(!event.over)return;const lead=leads.find((item)=>item.id===event.active.id);const target=COLUMNS.find((item)=>item.key===event.over?.id)?.key??leads.find((item)=>item.id===event.over?.id)?.etapa;if(lead&&target)void request(lead,target)}

  return <div>
    <div className="mb-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-zinc-400">Leads reais da aquisição Axven.</p><p className="mt-1 text-xs text-zinc-600">Clique no card para abrir diagnóstico e timeline.</p></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">{visible.length} leads</span></div>
      <div className="mt-4 grid gap-2 md:grid-cols-4"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar nome ou WhatsApp" className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"/><select value={stage} onChange={(e)=>setStage(e.target.value)} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="todas">Todas as etapas</option>{COLUMNS.map((item)=><option key={item.key} value={item.key}>{item.label}</option>)}</select><select value={origin} onChange={(e)=>setOrigin(e.target.value)} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="todas">Todas as origens</option>{origins.map((item)=><option key={item}>{item}</option>)}</select><select value={campaign} onChange={(e)=>setCampaign(e.target.value)} className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="todas">Todas as campanhas</option>{campaigns.map((item)=><option key={item}>{item}</option>)}</select></div>
    </div>
    {error?<div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>:null}
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e:DragStartEvent)=>setActive(leads.find((item)=>item.id===e.active.id)??null)} onDragEnd={dragEnd}><div className="flex gap-4 overflow-x-auto pb-5">{COLUMNS.map((column)=><KanbanColumn key={column.key} column={column} leads={visible.filter((lead)=>lead.etapa===column.key)} onMove={request} onOpen={(lead)=>setDetailId(lead.id)}/>)}</div><DragOverlay>{active?<div className="w-[280px]"><LeadCard lead={active} dragging/></div>:null}</DragOverlay></DndContext>
    {detail?<DetailDrawer lead={detail} onClose={()=>setDetailId(null)}/>:null}
    {pending?.etapa==="fechado"?<ClosingModal lead={pending.lead} onCancel={()=>setPending(null)} onSave={async(extra)=>{if(await mutate(pending.lead,"fechado",extra))setPending(null)}}/>:null}
    {pending&&pending.etapa!=="fechado"?<ReasonModal lead={pending.lead} etapa={pending.etapa} onCancel={()=>setPending(null)} onSave={async(motivo)=>{if(await mutate(pending.lead,pending.etapa,{motivo}))setPending(null)}}/>:null}
  </div>;
}
