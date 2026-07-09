import { AppShell } from "@/app/components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { AgendaView, type Compromisso } from "./AgendaView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function inicioDeHoje() {
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${hoje}T00:00:00-03:00`;
}

type CompromissoRow = {
  id: string;
  titulo: string;
  tipo: Compromisso["tipo"];
  data_hora: string;
  duracao_minutos: number | null;
  lead_comercial_id: string | null;
  status: string;
  leads_comerciais: { nome: string } | { nome: string }[] | null;
};

export default async function AgendaPage() {
  const { data } = await supabaseAdmin
    .from("compromissos")
    .select("id, titulo, tipo, data_hora, duracao_minutos, lead_comercial_id, status, leads_comerciais(nome)")
    .gte("data_hora", inicioDeHoje())
    .order("data_hora", { ascending: true });

  const rows = (data ?? []) as unknown as CompromissoRow[];

  const compromissos: Compromisso[] = rows.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    tipo: item.tipo,
    data_hora: item.data_hora,
    duracao_minutos: item.duracao_minutos,
    lead_comercial_id: item.lead_comercial_id,
    status: item.status,
    leadNome: Array.isArray(item.leads_comerciais)
      ? item.leads_comerciais[0]?.nome ?? null
      : item.leads_comerciais?.nome ?? null,
  }));

  return (
    <AppShell title="Agenda" subtitle="Axven Marketing Hub" activeLabel="Agenda">
      <AgendaView initialCompromissos={compromissos} />
    </AppShell>
  );
}
