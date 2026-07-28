import { notFound } from "next/navigation";
import { AppShell } from "../../../components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { LogoutButton } from "../LogoutButton";
import { ConversasView, type LeadResumo } from "./ConversasView";

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

export default async function CrmConversasPage({ params }: Props) {
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
    .select(
      "id, nome, telefone, etapa, pausado_ia, criado_em, atualizado_em, origem, campanha, conjunto, anuncio, plataforma, ctwaclid, anuncio_source_id",
    )
    .eq("cliente_id", (cliente as ClienteRow).id)
    .order("atualizado_em", { ascending: false, nullsFirst: false })
    .order("criado_em", { ascending: false });

  return (
    <AppShell
      title={(cliente as ClienteRow).nome}
      subtitle="CRM · Conversas com leads"
      activeLabel="Conversas"
      actions={<LogoutButton />}
      variant="portal"
      sidebarItems={[
        { label: "Kanban", href: `/crm/${slug}`, icon: "🧲" },
        { label: "Conversas", href: `/crm/${slug}/conversas`, icon: "💬" },
      ]}
    >
      <ConversasView initialLeads={(leads as LeadResumo[] | null) ?? []} />
    </AppShell>
  );
}
