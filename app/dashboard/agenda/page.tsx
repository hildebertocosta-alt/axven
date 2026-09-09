import { AppShell } from "@/app/components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { AgendaView, type Compromisso } from "./AgendaView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function inicioDeHoje() {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return `${hoje}T00:00:00-03:00`;
}

type CompromissoRow = { id:string; titulo:string; tipo:Compromisso["tipo"]; data_hora:string; duracao_minutos:number|null; lead_comercial_id:string|null; status:string; leads_comerciais:{nome:string}|{nome:string}[]|null };

export default async function AgendaPage() {
  const { data } = await supabaseAdmin.from("compromissos").select("id, titulo, tipo, data_hora, duracao_minutos, lead_comercial_id, status, leads_comerciais(nome)").gte("data_hora", inicioDeHoje()).order("data_hora", { ascending: true });
  const rows = (data ?? []) as unknown as CompromissoRow[];
  const compromissos: Compromisso[] = rows.map((item) => ({ id:item.id, titulo:item.titulo, tipo:item.tipo, data_hora:item.data_hora, duracao_minutos:item.duracao_minutos, lead_comercial_id:item.lead_comercial_id, status:item.status, leadNome:Array.isArray(item.leads_comerciais) ? item.leads_comerciais[0]?.nome ?? null : item.leads_comerciais?.nome ?? null }));
  const hoje = compromissos.filter((item) => new Date(item.data_hora).toLocaleDateString("en-CA", { timeZone:"America/Sao_Paulo" }) === new Date().toLocaleDateString("en-CA", { timeZone:"America/Sao_Paulo" })).length;
  const calls = compromissos.filter((item) => item.tipo === "call_prospeccao").length;
  const reunioes = compromissos.filter((item) => item.tipo === "reuniao_cliente").length;

  return <AppShell title="Agenda" subtitle="Operação · compromissos e calls" activeLabel="Agenda">
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-[#0d0e13] via-[#0b0c10] to-[#160d0d] p-7 lg:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff7458]">AGENDA OPERACIONAL</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-3xl font-semibold tracking-[-0.04em] text-white lg:text-4xl">Tempo sob controle.</h2><p className="mt-2 max-w-2xl text-sm text-zinc-500">Calls, reuniões e compromissos da operação Axven em uma única visão.</p></div><div className="flex gap-2"><Metric label="Hoje" value={hoje}/><Metric label="Calls" value={calls}/><Metric label="Reuniões" value={reunioes}/></div></div>
      </section>
      <AgendaView initialCompromissos={compromissos} />
    </div>
  </AppShell>;
}

function Metric({label,value}:{label:string;value:number}) { return <div className="min-w-20 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-center"><p className="text-[10px] text-zinc-600">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value}</p></div> }
