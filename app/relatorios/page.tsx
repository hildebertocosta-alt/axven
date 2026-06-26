"use client";

import { useState } from "react";
import { AppShell } from "../components/dashboard/AppShell";
import { clients, reports as initialReports } from "../lib/mockData";

type ReportItem = {
  client: string;
  status: string;
  when: string;
  period?: string;
};

function getStatusClasses(status: string) {
  switch (status) {
    case "Enviado":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "Pendente":
      return "border-amber-500/20 bg-amber-500/10 text-amber-200";
    case "Em revisão":
      return "border-sky-500/20 bg-sky-500/10 text-sky-200";
    case "Gerado agora":
      return "border-violet-500/20 bg-violet-500/10 text-violet-200";
    default:
      return "border-white/10 bg-white/5 text-zinc-300";
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export default function RelatoriosPage() {
  const [reports, setReports] = useState<ReportItem[]>(() => initialReports.map((report) => ({ ...report })));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(clients[0]?.name ?? "");
  const [selectedPeriod, setSelectedPeriod] = useState("Essa semana");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleGenerateReport = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client: selectedClient, period: selectedPeriod }),
      });

      const data = await response.json();
      const today = formatDate(new Date());

      setReports((current) => [
        {
          client: data.client ?? selectedClient,
          status: "Gerado agora",
          when: today,
          period: data.period ?? selectedPeriod,
        },
        ...current,
      ]);

      setFeedback(`Relatório de ${data.client ?? selectedClient} gerado com sucesso`);
      setIsModalOpen(false);
    } catch {
      setFeedback("Não foi possível gerar o relatório neste momento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Relatórios" subtitle="Gestão de entregas" activeLabel="Relatórios">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Relatórios por cliente</h2>
            <p className="mt-1 text-sm text-zinc-400">Acompanhe o status das entregas semanais e gere novos relatórios.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
          >
            Gerar relatório semanal
          </button>
        </div>

        {feedback ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {feedback}
          </div>
        ) : null}

        {isModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-white">Gerar relatório semanal</h3>
              <p className="mt-1 text-sm text-zinc-400">Selecione o cliente e o período para gerar o resumo.</p>

              <form onSubmit={handleGenerateReport} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Cliente</label>
                  <select
                    value={selectedClient}
                    onChange={(event) => setSelectedClient(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.name}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Período</label>
                  <select
                    value={selectedPeriod}
                    onChange={(event) => setSelectedPeriod(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="Essa semana">Essa semana</option>
                    <option value="Semana passada">Semana passada</option>
                    <option value="Últimos 7 dias">Últimos 7 dias</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-zinc-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Gerando..." : "Confirmar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4">
          {reports.map((report, index) => (
            <div key={`${report.client}-${index}`} className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-white">{report.client}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Atualizado {report.when}
                    {report.period ? ` · ${report.period}` : ""}
                  </p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-sm ${getStatusClasses(report.status)}`}>
                  {report.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
