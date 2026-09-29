import { notFound } from "next/navigation";
import { AppShell } from "../../components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { KanbanBoard, type LeadRow } from "./KanbanBoard";
import { LogoutButton } from "./LogoutButton";
import type { EtapaCliente } from "@/app/lib/leadEtapas";
import { PortalTabs } from "./PortalTabs";
import { semLeadsDeTeste } from "@/app/lib/portalResultado";
import { portalSidebarItems } from "./portalNav";

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
  atendimento_ia: boolean;
};

async function fetchAllLeads(clienteId: string) {
  const leads: LeadRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("id, nome, telefone, etapa, cliente_id, origem, criado_em, atualizado_em, pausado_ia, valor_conversao, moeda, data_conversao, motivo_perda, anuncio, etapa_alterada_em, plataforma, campanha, respostas_formulario")
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
    .select("id, nome, slug, atendimento_ia")
    .eq("slug", slug)
    .single();

  if (!cliente) {
    notFound();
  }

  const [leads, { data: etapas, error: etapasError }] = await Promise.all([
    fetchAllLeads((cliente as ClienteRow).id).then((todos) => semLeadsDeTeste(todos)),
    supabaseAdmin
      .from("cliente_etapas")
      .select("chave, nome, tipo, ordem")
      .eq("cliente_id", (cliente as ClienteRow).id)
      .eq("ativo", true),
  ]);
  if (etapasError) throw etapasError;

  return (
    <AppShell
      title={(cliente as ClienteRow).nome}
      subtitle="Seus leads"
      activeLabel="Leads"
      actions={<LogoutButton />}
      variant="portal"
      sidebarItems={portalSidebarItems(slug)}
    >
      <PortalTabs slug={slug} active="leads" />
      <KanbanBoard clienteNome={(cliente as ClienteRow).nome} initialLeads={leads} etapas={(etapas ?? []) as EtapaCliente[]} atendimentoIa={(cliente as ClienteRow).atendimento_ia} />
    </AppShell>
  );
}
