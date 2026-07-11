import { AppShell } from "../components/dashboard/AppShell";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { IntegracoesView, type ClienteMetaRow, type ConexaoMeta } from "./IntegracoesView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{ status?: string; detalhe?: string }>;
};

export default async function IntegracoesPage({ searchParams }: Props) {
  const { status, detalhe } = await searchParams;

  const [{ data: conexao }, { data: clientes }] = await Promise.all([
    supabaseAdmin
      .from("integracao_meta")
      .select("meta_user_nome, conectado_em, expires_at")
      .order("conectado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin.from("clientes").select("id, nome, meta_account_id").order("nome"),
  ]);

  return (
    <AppShell title="Integrações" subtitle="Conexões de anúncio da agência" activeLabel="Integrações">
      <IntegracoesView
        conexao={(conexao as ConexaoMeta | null) ?? null}
        clientesIniciais={(clientes as ClienteMetaRow[] | null) ?? []}
        statusRedirect={status ?? null}
        detalheRedirect={detalhe ?? null}
      />
    </AppShell>
  );
}
