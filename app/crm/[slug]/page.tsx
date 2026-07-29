import { notFound } from "next/navigation";
import { AppShell } from "../../components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { KanbanBoard, type LeadRow } from "./KanbanBoard";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
};

type ClienteRow = {
  id: string;
  nome: string;
  slug: string;
};

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

  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("id, nome, telefone, etapa, cliente_id, origem, criado_em, atualizado_em, pausado_ia")
    .eq("cliente_id", (cliente as ClienteRow).id)
    .order("criado_em", { ascending: false });

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
      <KanbanBoard clienteNome={(cliente as ClienteRow).nome} initialLeads={(leads as LeadRow[] | null) ?? []} />
    </AppShell>
  );
}
