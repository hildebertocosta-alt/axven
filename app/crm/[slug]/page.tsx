import { notFound } from "next/navigation";
import { AppShell } from "../../components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { KanbanBoard, type LeadRow } from "./KanbanBoard";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 1000;

type Props = {
  params: Promise<{ slug: string }>;
};

type ClienteRow = {
  id: string;
  nome: string;
  slug: string;
};

async function fetchAllLeads(clienteId: string) {
  const leads: LeadRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("id, nome, telefone, etapa, cliente_id, origem, criado_em, atualizado_em, pausado_ia, valor_conversao, moeda, data_conversao")
      .eq("cliente_id", clienteId)
      .order("criado_em", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data ?? []) as LeadRow[];
    leads.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return leads;
}

export default async function CrmKanbanPage({ params }: Props) {
  const { slug } = await params;

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, slug")
    .eq("slug", slug)
    .single();

  if (!cliente) {
    notFound();
  }

  const leads = await fetchAllLeads((cliente as ClienteRow).id);

  return (
    <AppShell
      title={(cliente as ClienteRow).nome}
      subtitle="CRM · Kanban de leads"
      activeLabel="Kanban"
      actions={<LogoutButton />}
      variant="portal"
      sidebarItems={[
        { label: "Kanban", href: `/crm/${slug}`, icon: "🧲" },
        { label: "Conversas", href: `/crm/${slug}/conversas`, icon: "💬" },
        { label: "Disparo", href: `/crm/${slug}/disparo`, icon: "📣" },
      ]}
    >
      <KanbanBoard clienteNome={(cliente as ClienteRow).nome} initialLeads={leads} />
    </AppShell>
  );
}
