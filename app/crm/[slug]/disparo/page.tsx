import { notFound } from "next/navigation";
import { AppShell } from "../../../components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { LogoutButton } from "../LogoutButton";
import { DisparoView, type LeadParaFiltro, type DisparoRow } from "./DisparoView";

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

export default async function CrmDisparoPage({ params }: Props) {
  const { slug } = await params;

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, slug")
    .eq("slug", slug)
    .single();

  if (!cliente) {
    notFound();
  }

  const clienteId = (cliente as ClienteRow).id;

  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("id, etapa, telefone")
    .eq("cliente_id", clienteId);

  const { data: disparos } = await supabaseAdmin
    .from("disparos")
    .select("id, mensagem, filtro_etapas, total_leads, enviados, falhas, status, criado_em, concluido_em")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false })
    .limit(20);

  return (
    <AppShell
      title={(cliente as ClienteRow).nome}
      subtitle="CRM · Disparo de ofertas"
      activeLabel="Disparo"
      actions={<LogoutButton />}
      variant="portal"
      sidebarItems={[
        { label: "Kanban", href: `/crm/${slug}`, icon: "🧲" },
        { label: "Conversas", href: `/crm/${slug}/conversas`, icon: "💬" },
        { label: "Disparo", href: `/crm/${slug}/disparo`, icon: "📣" },
      ]}
    >
      <DisparoView leads={(leads as LeadParaFiltro[] | null) ?? []} initialDisparos={(disparos as DisparoRow[] | null) ?? []} />
    </AppShell>
  );
}
