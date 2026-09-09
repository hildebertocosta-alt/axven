import Link from "next/link";
import { AppShell } from "@/app/components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Cliente = {
  id: string;
  nome: string;
  nicho: string | null;
  status_pagamento: "pago" | "em_dia" | "atrasado" | "cancelado";
  honorarios: number | null;
  telefone: string | null;
  data_fim_contrato: string | null;
};

const statusLabel = {
  pago: "Pago",
  em_dia: "Em dia",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

const statusClass = {
  pago: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  em_dia: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  atrasado: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  cancelado: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

function moeda(value: number | null) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

export default async function ClientesPage() {
  const { data } = await supabaseAdmin
    .from("clientes")
    .select("id,nome,nicho,status_pagamento,honorarios,telefone,data_fim_contrato")
    .order("nome", { ascending: true });

  const clientes = (data ?? []) as Cliente[];
  const ativos = clientes.filter((c) => c.status_pagamento !== "cancelado");
  const cancelados = clientes.filter((c) => c.status_pagamento === "cancelado");
  const mrr = ativos.reduce((total, c) => total + Number(c.honorarios ?? 0), 0);

  return (
    <AppShell title="Clientes" subtitle="Gestão e Cliente 360" activeLabel="Clientes">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5"><p className="text-sm text-zinc-400">Clientes ativos</p><p className="mt-3 text-3xl font-semibold text-white">{ativos.length}</p></div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5"><p className="text-sm text-zinc-400">MRR ativo</p><p className="mt-3 text-3xl font-semibold text-white">{moeda(mrr)}</p></div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5"><p className="text-sm text-zinc-400">Cancelados</p><p className="mt-3 text-3xl font-semibold text-white">{cancelados.length}</p></div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div><h2 className="text-lg font-semibold text-white">Base de clientes</h2><p className="mt-1 text-sm text-zinc-400">Abra um cliente para acessar a visão operacional consolidada.</p></div>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-zinc-400"><tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Nicho</th><th className="px-4 py-3">Honorários</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Contrato</th><th className="px-4 py-3"></th></tr></thead>
              <tbody className="divide-y divide-white/10 bg-zinc-950/60 text-zinc-200">
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className={cliente.status_pagamento === "cancelado" ? "opacity-60" : ""}>
                    <td className="px-4 py-3 font-medium text-white">{cliente.nome}</td>
                    <td className="px-4 py-3">{cliente.nicho ?? "—"}</td>
                    <td className="px-4 py-3">{moeda(cliente.honorarios)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass[cliente.status_pagamento]}`}>{statusLabel[cliente.status_pagamento]}</span></td>
                    <td className="px-4 py-3">{cliente.data_fim_contrato ? new Date(`${cliente.data_fim_contrato}T00:00:00-03:00`).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-3 text-right"><Link href={`/clientes/${cliente.id}`} className="rounded-full border border-[#D85A30]/30 bg-[#D85A30]/10 px-3 py-1.5 text-xs font-semibold text-[#f0a480]">Cliente 360</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
