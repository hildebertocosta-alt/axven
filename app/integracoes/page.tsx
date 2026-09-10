import { AppShell } from "../components/dashboard/AppShell";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { IntegracoesView, type ClienteMetaRow, type ConexaoMeta } from "./IntegracoesView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { searchParams: Promise<{ status?: string; detalhe?: string }> };
const GRAPH_VERSION = "v21.0";

async function connectionWorks(accessToken: string | undefined, expiresAt: string | null | undefined) {
  if (!accessToken || (expiresAt && new Date(expiresAt) <= new Date())) return false;
  try {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me?fields=id`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default async function IntegracoesPage({ searchParams }: Props) {
  const { status, detalhe } = await searchParams;
  const [{ data: conexao }, { data: clientes }] = await Promise.all([
    supabaseAdmin.from("integracao_meta").select("meta_user_nome, conectado_em, expires_at, access_token").order("conectado_em", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from("clientes").select("id, nome, meta_account_id").order("nome"),
  ]);
  const lista = (clientes as ClienteMetaRow[] | null) ?? [];
  const vinculados = lista.filter((cliente) => Boolean(cliente.meta_account_id)).length;
  const conexaoValida = await connectionWorks(conexao?.access_token, conexao?.expires_at);
  const conexaoExpirada = Boolean(conexao?.expires_at && new Date(conexao.expires_at) <= new Date());
  const conexaoPublica = conexao ? { meta_user_nome: conexao.meta_user_nome, conectado_em: conexao.conectado_em, expires_at: conexao.expires_at } : null;

  return <AppShell title="Integrações" subtitle="Infraestrutura · conexões e contas" activeLabel="Integrações">
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-[#0d0e13] via-[#0b0c10] to-[#160d0d] p-7 lg:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff7458]">INFRAESTRUTURA</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-3xl font-semibold tracking-[-0.04em] text-white lg:text-4xl">Conexões da operação.</h2><p className="mt-2 max-w-2xl text-sm text-zinc-500">Gerencie a conexão Meta e o vínculo das contas de anúncio sem expor credenciais.</p></div><div className="flex gap-2"><Metric label="Meta" value={conexaoValida ? "Conectada" : conexaoExpirada ? "Expirada" : conexao ? "Indisponível" : "Pendente"} active={conexaoValida}/><Metric label="Contas vinculadas" value={`${vinculados}/${lista.length}`} /></div></div>
      </section>
      <IntegracoesView conexao={(conexaoPublica as ConexaoMeta | null) ?? null} conexaoValida={conexaoValida} conexaoExpirada={conexaoExpirada} clientesIniciais={lista} statusRedirect={status ?? null} detalheRedirect={detalhe ?? null} />
    </div>
  </AppShell>;
}

function Metric({label,value,active=false}:{label:string;value:string;active?:boolean}) { return <div className={`min-w-32 rounded-xl border px-4 py-3 ${active ? "border-emerald-500/20 bg-emerald-500/[0.06]" : "border-white/[0.07] bg-white/[0.025]"}`}><p className="text-[10px] text-zinc-600">{label}</p><p className={`mt-1 text-sm font-semibold ${active ? "text-emerald-300" : "text-white"}`}>{value}</p></div> }
