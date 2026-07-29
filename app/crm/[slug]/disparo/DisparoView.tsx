"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export type Etapa = "lead" | "qualificado" | "agendado" | "proposta_enviada" | "fechado";

export type LeadParaFiltro = {
  id: string;
  etapa: Etapa;
  telefone: string | null;
};

export type DisparoStatus = "em_andamento" | "concluido" | "cancelado";

export type DisparoRow = {
  id: string;
  mensagem: string;
  filtro_etapas: Etapa[];
  total_leads: number;
  enviados: number;
  falhas: number;
  status: DisparoStatus;
  criado_em: string;
  concluido_em: string | null;
};

const ETAPAS: { key: Etapa; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "qualificado", label: "Qualificado" },
  { key: "agendado", label: "Agendado" },
  { key: "proposta_enviada", label: "Proposta Enviada" },
  { key: "fechado", label: "Fechado" },
];

const ETAPAS_PADRAO: Etapa[] = ["lead", "qualificado", "agendado", "proposta_enviada"];

const statusLabel: Record<DisparoStatus, string> = {
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusBadge: Record<DisparoStatus, string> = {
  em_andamento: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  concluido: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  cancelado: "border-white/10 bg-white/5 text-zinc-400",
};

function formatDataHora(value: string) {
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function DisparoView({ leads, initialDisparos }: { leads: LeadParaFiltro[]; initialDisparos: DisparoRow[] }) {
  const [mensagem, setMensagem] = useState("");
  const [etapasSelecionadas, setEtapasSelecionadas] = useState<Set<Etapa>>(new Set(ETAPAS_PADRAO));
  const [disparos, setDisparos] = useState<DisparoRow[]>(initialDisparos);
  const [confirmando, setConfirmando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  const leadsAlvo = useMemo(
    () => leads.filter((lead) => lead.telefone && etapasSelecionadas.has(lead.etapa)),
    [leads, etapasSelecionadas],
  );

  const temEmAndamento = disparos.some((d) => d.status === "em_andamento");

  useEffect(() => {
    if (!temEmAndamento) return;

    const intervalo = setInterval(async () => {
      const { data } = await supabase
        .from("disparos")
        .select("id, mensagem, filtro_etapas, total_leads, enviados, falhas, status, criado_em, concluido_em")
        .order("criado_em", { ascending: false })
        .limit(20);

      if (data) setDisparos(data as DisparoRow[]);
    }, 10000);

    return () => clearInterval(intervalo);
  }, [temEmAndamento]);

  function toggleEtapa(etapa: Etapa) {
    setEtapasSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(etapa)) novo.delete(etapa);
      else novo.add(etapa);
      return novo;
    });
  }

  async function handleDisparar() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }

    setCriando(true);
    setErro(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      setErro("Sessão expirada, atualize a página e tente de novo.");
      setCriando(false);
      return;
    }

    const response = await fetch("/api/crm/disparos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ mensagem: mensagem.trim(), etapas: Array.from(etapasSelecionadas) }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setErro(payload?.error ?? "Não foi possível criar o disparo.");
      setCriando(false);
      setConfirmando(false);
      return;
    }

    setDisparos((prev) => [payload.disparo as DisparoRow, ...prev]);
    setMensagem("");
    setConfirmando(false);
    setCriando(false);
  }

  async function handleCancelar(id: string) {
    setCancelandoId(id);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      setCancelandoId(null);
      return;
    }

    const response = await fetch(`/api/crm/disparos/${id}/cancelar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const payload = await response.json().catch(() => null);

    if (response.ok && payload?.disparo) {
      setDisparos((prev) => prev.map((d) => (d.id === id ? { ...d, ...(payload.disparo as DisparoRow) } : d)));
    }

    setCancelandoId(null);
  }

  const emAndamento = disparos.filter((d) => d.status === "em_andamento");
  const historico = disparos.filter((d) => d.status !== "em_andamento");
  const tempoEstimadoMin = Math.round((leadsAlvo.length * 120) / 60);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
        <h3 className="text-lg font-semibold text-white">Nova oferta</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Manda a mesma mensagem pra vários leads da base, aos poucos (1 a 3 min de intervalo entre cada um) pra não
          arriscar o número no WhatsApp.
        </p>

        <textarea
          value={mensagem}
          onChange={(event) => {
            setMensagem(event.target.value);
            setConfirmando(false);
          }}
          placeholder="Escreva a oferta... Use {{nome}} pra personalizar com o primeiro nome do lead."
          rows={4}
          className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
        />

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Quem recebe</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ETAPAS.map((etapa) => {
              const ativa = etapasSelecionadas.has(etapa.key);
              const qtd = leads.filter((lead) => lead.telefone && lead.etapa === etapa.key).length;
              return (
                <button
                  key={etapa.key}
                  onClick={() => {
                    toggleEtapa(etapa.key);
                    setConfirmando(false);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    ativa
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  {etapa.label} ({qtd})
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <p className="text-zinc-300">
            <span className="font-semibold text-white">{leadsAlvo.length}</span> leads vão receber essa mensagem
            {leadsAlvo.length > 0 ? (
              <span className="text-zinc-500"> · tempo estimado ~{tempoEstimadoMin} min</span>
            ) : null}
          </p>
        </div>

        {erro ? <p className="mt-3 text-xs text-rose-300">{erro}</p> : null}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleDisparar}
            disabled={!mensagem.trim() || leadsAlvo.length === 0 || criando}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              confirmando
                ? "border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            }`}
          >
            {criando
              ? "Disparando..."
              : confirmando
                ? `Confirmar disparo pra ${leadsAlvo.length} leads?`
                : `Disparar pra ${leadsAlvo.length} leads`}
          </button>
          {confirmando ? (
            <button onClick={() => setConfirmando(false)} className="text-xs text-zinc-400 hover:text-white">
              Cancelar
            </button>
          ) : null}
        </div>
      </div>

      {emAndamento.length > 0 ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <h3 className="text-lg font-semibold text-white">Em andamento</h3>
          <div className="mt-4 space-y-4">
            {emAndamento.map((disparo) => {
              const progresso = disparo.total_leads > 0 ? (disparo.enviados / disparo.total_leads) * 100 : 0;
              return (
                <div key={disparo.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-zinc-200 line-clamp-2">{disparo.mensagem}</p>
                    <button
                      onClick={() => handleCancelar(disparo.id)}
                      disabled={cancelandoId === disparo.id}
                      className="shrink-0 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {cancelandoId === disparo.id ? "Cancelando..." : "Cancelar"}
                    </button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${progresso}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">
                    {disparo.enviados} de {disparo.total_leads} enviados
                    {disparo.falhas > 0 ? <span className="text-rose-300"> · {disparo.falhas} falharam</span> : null}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
        <h3 className="text-lg font-semibold text-white">Histórico</h3>
        {historico.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">Nenhum disparo concluído ou cancelado ainda.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {historico.map((disparo) => (
              <div key={disparo.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge[disparo.status]}`}>
                    {statusLabel[disparo.status]}
                  </span>
                  <span className="text-xs text-zinc-500">{formatDataHora(disparo.criado_em)}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-300 line-clamp-2">{disparo.mensagem}</p>
                <p className="mt-2 text-xs text-zinc-400">
                  {disparo.enviados} de {disparo.total_leads} enviados
                  {disparo.falhas > 0 ? <span className="text-rose-300"> · {disparo.falhas} falharam</span> : null}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
