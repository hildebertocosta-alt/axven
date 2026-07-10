import { AppShell } from "../components/dashboard/AppShell";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { LeadsBoard, type LeadRow } from "./LeadsBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PipelinePage() {
  const { data: leads } = await supabaseAdmin
    .from("leads_comerciais")
    .select("id, nome, telefone, nicho, como_chegou, etapa, atualizado_em")
    .order("atualizado_em", { ascending: false });

  return (
    <AppShell title="CRM · Pipeline" subtitle="Leads comerciais (pré-fechamento)" activeLabel="CRM">
      <LeadsBoard initialLeads={(leads as LeadRow[] | null) ?? []} />
    </AppShell>
  );
}
