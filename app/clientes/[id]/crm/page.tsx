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

  return (
    <AppShell title={cliente.nome} subtitle="CRM interno · Cliente 360" activeLabel="Clientes">
      <div className="space-y-5">
        <Link href={`/clientes/${cliente.id}`} className="text-sm text-zinc-400 hover:text-white">← Voltar ao Cliente 360</Link>
        <KanbanBoard clienteNome={cliente.nome} clienteId={cliente.id} accessMode="internal" initialLeads={leads} />
      </div>
    </AppShell>
  );
}
