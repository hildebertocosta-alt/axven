import { notFound } from "next/navigation";
import { AppShell } from "../../components/dashboard/AppShell";
import { clients } from "../../lib/mockData";

type Props = {
  params: Promise<{ slug: string }>;
};

const statusClasses: Record<string, string> = {
  verificar: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  alerta: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  atenção: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  crítico: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

export default async function ClientWorkspacePage({ params }: Props) {
  const { slug } = await params;
  const client = clients.find((item) => item.slug === slug);

  if (!client) {
    notFound();
  }

  return (
    <AppShell title={client.name} subtitle="Workspace do cliente" activeLabel="Clientes">
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-violet-300">Visão geral</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{client.name}</h2>
              <p className="mt-2 text-sm text-zinc-400">{client.niche}</p>
              <p className="mt-3 max-w-2xl text-sm text-zinc-400">{client.summary}</p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-sm font-medium ${statusClasses[client.status]}`}>
              {client.status}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Score</p>
            <p className="mt-3 text-3xl font-semibold text-white">{client.metrics.score}</p>
            <p className="mt-2 text-sm text-zinc-400">Oportunidade atual</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">CTR Trend</p>
            <p className="mt-3 text-2xl font-semibold text-white">{client.metrics.ctrTrend}</p>
            <p className="mt-2 text-sm text-zinc-400">Movimento de engajamento</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Budget</p>
            <p className="mt-3 text-2xl font-semibold text-white">{client.metrics.budgetStatus}</p>
            <p className="mt-2 text-sm text-zinc-400">Situação de spend</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <h3 className="text-lg font-semibold text-white">Alertas específicos</h3>
            <ul className="mt-4 space-y-3">
              {client.alerts.map((alert) => (
                <li key={alert} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {alert}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <h3 className="text-lg font-semibold text-white">Recomendações da IA</h3>
            <ul className="mt-4 space-y-3">
              {client.recommendations.map((item) => (
                <li key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
