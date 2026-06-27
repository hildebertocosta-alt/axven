import { notFound } from "next/navigation";
import { AppShell } from "../../components/dashboard/AppShell";
import { supabase } from "../../lib/supabase";

type Props = {
  params: Promise<{ slug: string }>;
};

type ClienteRow = {
  id: string;
  nome: string;
  nicho: string | null;
  status: string | null;
  score: number | null;
  ctr_trend: number | null;
  budget_status: string | null;
  ultima_revisao: string | null;
  proxima_revisao: string | null;
  honorarios: number | null;
  dia_pagamento: number | null;
};

type AlertaRow = {
  id: string;
  tipo: string;
  mensagem: string;
  resolvido: boolean;
};

const statusClasses: Record<string, string> = {
  verificar: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  alerta: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  atencao: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  critico: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default async function ClientWorkspacePage({ params }: Props) {
  const { slug } = await params;
  const { data: clientes } = await supabase.from("clientes").select("*");
  const client = (clientes as ClienteRow[] | null)?.find((item) => slugify(item.nome) === slug);

  if (!client) {
    notFound();
  }

  const { data: alertas } = await supabase.from("alertas").select("*").eq("cliente_id", client.id).order("criado_em", { ascending: false });
  const rows = (alertas as AlertaRow[] | null) ?? [];

  return (
    <AppShell title={client.nome} subtitle="Workspace do cliente" activeLabel="Clientes">
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-violet-300">Visão geral</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{client.nome}</h2>
              <p className="mt-2 text-sm text-zinc-400">{client.nicho ?? "Sem nicho"}</p>
              <p className="mt-3 max-w-2xl text-sm text-zinc-400">
                Honorários: R$ {Number(client.honorarios ?? 0).toLocaleString("pt-BR")} · Dia de pagamento: {client.dia_pagamento ?? "—"}
              </p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-sm font-medium ${statusClasses[client.status ?? "verificar"] ?? statusClasses.verificar}`}>
              {client.status ?? "verificar"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Score</p>
            <p className="mt-3 text-3xl font-semibold text-white">{client.score ?? "—"}</p>
            <p className="mt-2 text-sm text-zinc-400">Oportunidade atual</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">CTR Trend</p>
            <p className="mt-3 text-2xl font-semibold text-white">{client.ctr_trend ?? "—"}</p>
            <p className="mt-2 text-sm text-zinc-400">Movimento de engajamento</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Budget</p>
            <p className="mt-3 text-2xl font-semibold text-white">{client.budget_status ?? "—"}</p>
            <p className="mt-2 text-sm text-zinc-400">Situação de spend</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <h3 className="text-lg font-semibold text-white">Alertas específicos</h3>
            <ul className="mt-4 space-y-3">
              {rows.length ? rows.map((alert) => (
                <li key={alert.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {alert.mensagem}
                </li>
              )) : <li className="text-sm text-zinc-400">Nenhum alerta cadastrado para este cliente.</li>}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <h3 className="text-lg font-semibold text-white">Recomendações da IA</h3>
            <ul className="mt-4 space-y-3">
              <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                Revisar os criativos e o budget do conjunto com melhor atratividade para o cliente.
              </li>
              <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                Comparar a performance do anúncio principal com a variação de apoio antes da próxima revisão.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
