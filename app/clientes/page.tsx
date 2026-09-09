import Link from "next/link";
import { AppShell } from "@/app/components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Cliente = { id:string; nome:string; nicho:string|null; status_pagamento:"pago"|"em_dia"|"atrasado"|"cancelado"; honorarios:number|null; telefone:string|null; data_fim_contrato:string|null };
const statusLabel={pago:"Pago",em_dia:"Em dia",atrasado:"Atrasado",cancelado:"Cancelado"};
const statusClass={pago:"border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300",em_dia:"border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300",atrasado:"border-amber-500/20 bg-amber-500/[0.08] text-amber-300",cancelado:"border-rose-500/20 bg-rose-500/[0.08] text-rose-300"};
function moeda(value:number|null){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(Number(value??0));}

export default async function ClientesPage(){
 const {data}=await supabaseAdmin.from("clientes").select("id,nome,nicho,status_pagamento,honorarios,telefone,data_fim_contrato").order("nome",{ascending:true});
 const clientes=(data??[]) as Cliente[]; const ativos=clientes.filter(c=>c.status_pagamento!=="cancelado"); const cancelados=clientes.filter(c=>c.status_pagamento==="cancelado"); const atrasados=clientes.filter(c=>c.status_pagamento==="atrasado"); const mrr=ativos.reduce((t,c)=>t+Number(c.honorarios??0),0);
 const cards=[{label:"Clientes ativos",value:String(ativos.length),hint:"Carteira operacional",accent:true},{label:"MRR ativo",value:moeda(mrr),hint:"Honorários recorrentes"},{label:"Atenção",value:String(atrasados.length),hint:"Clientes com pendência"},{label:"Cancelados",value:String(cancelados.length),hint:"Histórico da carteira"}];
 return <AppShell title="Clientes" subtitle="Carteira · Cliente 360" activeLabel="Clientes">
  <div className="space-y-5">
   <section className="overflow-hidden rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-[#0d0e13] via-[#0b0c10] to-[#160d0d] p-7 lg:p-8">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff7458]">CARTEIRA AXVEN</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white lg:text-4xl">Clientes sob controle.</h2><p className="mt-2 max-w-2xl text-sm text-zinc-500">Visão consolidada da base ativa, recorrência e saúde comercial da operação.</p></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2 text-xs text-zinc-500"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"/>Dados reais do CRM</div></div>
   </section>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((c,i)=><div key={c.label} className={`rounded-2xl border p-5 ${c.accent?"border-[#ff5a3c]/30 bg-gradient-to-br from-[#ff5a3c]/[0.09] to-[#0d0e13]":"border-white/[0.07] bg-[#0d0e13]"}`}><div className="flex items-center justify-between"><p className="text-xs text-zinc-500">{c.label}</p><span className={i===2&&atrasados.length>0?"text-amber-400":"text-emerald-400"}>↗</span></div><p className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-white">{c.value}</p><p className="mt-1 text-[11px] text-zinc-600">{c.hint}</p></div>)}</div>
   <section className="rounded-[24px] border border-white/[0.07] bg-[#0d0e13] p-5 lg:p-6">
    <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">OPERAÇÃO</p><h2 className="mt-1 text-lg font-semibold text-white">Base de clientes</h2></div><p className="text-xs text-zinc-600">{clientes.length} registros</p></div>
    <div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead className="border-y border-white/[0.06] text-left text-[10px] uppercase tracking-[0.14em] text-zinc-600"><tr><th className="px-3 py-3 font-medium">Cliente</th><th className="px-3 py-3 font-medium">Nicho</th><th className="px-3 py-3 font-medium">MRR</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Contrato</th><th className="px-3 py-3"/></tr></thead><tbody className="divide-y divide-white/[0.055]">{clientes.map(cliente=><tr key={cliente.id} className={`group transition hover:bg-white/[0.02] ${cliente.status_pagamento==="cancelado"?"opacity-45":""}`}><td className="px-3 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-xs font-semibold text-zinc-400">{cliente.nome.slice(0,1).toUpperCase()}</div><span className="font-medium text-zinc-200">{cliente.nome}</span></div></td><td className="px-3 py-4 text-zinc-500">{cliente.nicho??"—"}</td><td className="px-3 py-4 font-medium text-zinc-300">{moeda(cliente.honorarios)}</td><td className="px-3 py-4"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${statusClass[cliente.status_pagamento]}`}>{statusLabel[cliente.status_pagamento]}</span></td><td className="px-3 py-4 text-zinc-500">{cliente.data_fim_contrato?new Date(`${cliente.data_fim_contrato}T00:00:00-03:00`).toLocaleDateString("pt-BR"):"—"}</td><td className="px-3 py-4 text-right"><Link href={`/clientes/${cliente.id}`} className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-zinc-400 transition hover:border-[#ff5a3c]/30 hover:bg-[#ff5a3c]/10 hover:text-[#ff8a70]">Abrir 360 →</Link></td></tr>)}</tbody></table></div>
   </section>
  </div>
 </AppShell>;
}
