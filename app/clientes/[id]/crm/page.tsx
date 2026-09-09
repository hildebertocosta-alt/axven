import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/app/components/dashboard/AppShell";
import { KanbanBoard, type LeadRow } from "@/app/crm/[slug]/KanbanBoard";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/app/lib/authSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };
const PAGE_SIZE = 1000;

async function fetchAllLeads(clienteId: string) {
  const leads: LeadRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("id,nome,telefone,etapa,cliente_id,origem,criado_em,atualizado_em,pausado_ia,valor_conversao,moeda,data_conversao")
      .eq("cliente_id", clienteId)
      .order("criado_em", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    leads.push(...((data ?? []) as LeadRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return leads;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ClienteCrmInternoPage({ params }: Props) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) redirect("/login");
  const { id } = await params;
  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id,nome,slug,status_pagamento")
    .eq("id", id)
    .single();

  if (!cliente || cliente.status_pagamento === "cancelado") notFound();

  const leads = await fetchAllLeads(cliente.id);
  const closedLeads = leads.filter((lead) => lead.etapa === "fechado");
  const revenue = closedLeads.reduce((total, lead) => total + Number(lead.valor_conversao ?? 0), 0);
  const metrics = [
    { label: "Leads", value: leads.length, hint: "Total no pipeline" },
    { label: "Qualificados", value: leads.filter((lead) => lead.etapa === "qualificado").length, hint: "Em qualificação" },
    { label: "Agendados", value: leads.filter((lead) => lead.etapa === "agendado").length, hint: "Com agenda confirmada" },
    { label: "Fechados", value: closedLeads.length, hint: formatCurrency(revenue), accent: true },
  ];

  return (
    <AppShell title={cliente.nome} subtitle="Cliente 360 · CRM interno" activeLabel="Clientes">
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-[#0d0e13] via-[#0a0b0f] to-[#160d0d] p-6 lg:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#ff5a3c]/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link href={`/clientes/${cliente.id}`} className="text-[11px] text-zinc-600 transition hover:text-zinc-300">
                ← Voltar ao Cliente 360
              </Link>
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ff7458]">PIPELINE DO CLIENTE</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white lg:text-4xl">Operação comercial em tempo real.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
                Qualificação, agenda, proposta e receita organizadas no fluxo oficial do CRM Axven.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.7)]" />
              Acesso interno seguro
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className={`rounded-2xl border p-5 ${metric.accent ? "border-[#ff5a3c]/25 bg-[#ff5a3c]/[0.055]" : "border-white/[0.07] bg-[#0d0e13]"}`}>
              <p className="text-[11px] text-zinc-600">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{metric.value}</p>
              <p className="mt-1 text-[10px] text-zinc-600">{metric.hint}</p>
            </div>
          ))}
        </div>

        <section className="rounded-[24px] border border-white/[0.07] bg-[#0b0c10] p-3 sm:p-4 lg:p-5">
          <div className="mb-5 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">FUNIL COMERCIAL</p>
              <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-white">Kanban de leads</h3>
            </div>
            <p className="text-xs text-zinc-600">Arraste um card para atualizar a etapa</p>
          </div>
          <KanbanBoard clienteNome={cliente.nome} clienteId={cliente.id} accessMode="internal" initialLeads={leads} />
        </section>
      </div>
    </AppShell>
  );
}
