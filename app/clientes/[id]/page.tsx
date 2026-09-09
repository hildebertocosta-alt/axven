import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

type Cliente = {
  id: string;
  nome: string;
  nicho: string | null;
  status_pagamento: "pago" | "em_dia" | "atrasado" | "cancelado";
  honorarios: number | null;
  telefone: string | null;
  canal_aquisicao: string | null;
  data_fim_contrato: string | null;
  dia_pagamento: number | null;
  slug: string | null;
};

const statusLabel = { pago: "Pago", em_dia: "Em dia", atrasado: "Atrasado", cancelado: "Cancelado" };
const statusClass = {
  pago: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  em_dia: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  atrasado: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  cancelado: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

function moeda(value: number | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

export default async function Cliente360Page({ params }: Props) {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from("clientes")
    .select("id,nome,nicho,status_pagamento,honorarios,telefone,canal_aquisicao,data_fim_contrato,dia_pagamento,slug")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const cliente = data as Cliente;

  const [leads, relatorios, tarefas, documentos, financeiro] = await Promise.all([
    supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("cliente_id", id),
    supabaseAdmin.from("relatorios").select("id", { count: "exact", head: true }).eq("cliente_id", id),
    supabaseAdmin.from("tarefas").select("id", { count: "exact", head: true }).eq("cliente_id", id).eq("concluido", false),
    supabaseAdmin.from("documentos").select("id", { count: "exact", head: true }).eq("cliente_id", id),
    supabaseAdmin.from("financeiro").select("valor,status").eq("cliente_id", id),
  ]);

  const recebida = (financeiro.data ?? []).filter((item) => item.status === "pago").reduce((sum, item) => sum + Number(item.valor ?? 0), 0);
  const cancelado = cliente.status_pagamento === "cancelado";

  return (
    <AppShell title={cliente.nome} subtitle="Cliente 360" activeLabel="Clientes">
      <div className="space-y-6">
        {cancelado ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5">
            <p className="text-sm font-semibold text-rose-200">Cliente cancelado</p>
            <p className="mt-1 text-sm text-rose-200/75">A operação está preservada para histórico. O acesso do portal permanece bloqueado enquanto o status estiver cancelado.</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/clientes" className="text-sm text-zinc-400 hover:text-white">← Voltar para clientes</Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-white">{cliente.nome}</h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass[cliente.status_pagamento]}`}>{statusLabel[cliente.status_pagamento]}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">{cliente.nicho ?? "Nicho não informado"}</p>
          </div>
          {!cancelado && cliente.slug ? <Link href={`/crm/${cliente.slug}`} className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30]/10 px-4 py-2 text-sm font-semibold text-[#f0a480]">Abrir CRM do cliente</Link> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5"><p className="text-sm text-zinc-400">Leads</p><p className="mt-3 text-3xl font-semibold text-white">{leads.count ?? 0}</p></div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5"><p className="text-sm text-zinc-400">Tarefas abertas</p><p className="mt-3 text-3xl font-semibold text-white">{tarefas.count ?? 0}</p></div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5"><p className="text-sm text-zinc-400">Relatórios</p><p className="mt-3 text-3xl font-semibold text-white">{relatorios.count ?? 0}</p></div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5"><p className="text-sm text-zinc-400">Documentos</p><p className="mt-3 text-3xl font-semibold text-white">{documentos.count ?? 0}</p></div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5"><p className="text-sm text-zinc-400">Receita recebida</p><p className="mt-3 text-3xl font-semibold text-white">{moeda(recebida)}</p></div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <h3 className="text-lg font-semibold text-white">Comercial e contrato</h3>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-zinc-500">Honorários</dt><dd className="mt-1 font-medium text-white">{moeda(cliente.honorarios)}</dd></div>
              <div><dt className="text-zinc-500">Dia de pagamento</dt><dd className="mt-1 font-medium text-white">{cliente.dia_pagamento ?? "—"}</dd></div>
              <div><dt className="text-zinc-500">Canal de aquisição</dt><dd className="mt-1 font-medium text-white">{cliente.canal_aquisicao ?? "—"}</dd></div>
              <div><dt className="text-zinc-500">Fim do contrato</dt><dd className="mt-1 font-medium text-white">{cliente.data_fim_contrato ? new Date(`${cliente.data_fim_contrato}T00:00:00-03:00`).toLocaleDateString("pt-BR") : "—"}</dd></div>
            </dl>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <h3 className="text-lg font-semibold text-white">Contato e operação</h3>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-zinc-500">WhatsApp</dt><dd className="mt-1 font-medium text-white">{cliente.telefone ?? "—"}</dd></div>
              <div><dt className="text-zinc-500">Portal CRM</dt><dd className="mt-1 font-medium text-white">{cancelado ? "Bloqueado — cliente cancelado" : cliente.slug ? `/crm/${cliente.slug}` : "Não configurado"}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
