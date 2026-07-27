"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export type Etapa = "lead" | "qualificado" | "agendado" | "proposta_enviada" | "fechado";

export type LeadResumo = {
  id: string;
  nome: string;
  telefone: string | null;
  etapa: Etapa;
  pausado_ia: boolean;
  criado_em: string;
  atualizado_em: string | null;
};

type MensagemRow = {
  id: string;
  remetente: string;
  mensagem: string;
  criado_em: string;
};

const etapaLabel: Record<Etapa, string> = {
  lead: "Lead",
  qualificado: "Qualificado",
  agendado: "Agendado",
  proposta_enviada: "Proposta Enviada",
  fechado: "Fechado",
};

const etapaBadge: Record<Etapa, string> = {
  lead: "border-white/10 bg-white/5 text-zinc-300",
  qualificado: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  agendado: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  proposta_enviada: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  fechado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

function formatDataHora(value: string) {
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function ultimaAtividade(lead: LeadResumo) {
  const value = lead.atualizado_em ?? lead.criado_em;
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function ConversasView({ initialLeads }: { initialLeads: LeadResumo[] }) {
  const [leads, setLeads] = useState<LeadResumo[]>(initialLeads);
  const [selectedId, setSelectedId] = useState<string | null>(initialLeads[0]?.id ?? null);
  const [messages, setMessages] = useState<MensagemRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedId) ?? null, [leads, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let cancelado = false;
    setLoadingMessages(true);

    (async () => {
      const { data } = await supabase
        .from("leads_mensagens")
        .select("id, remetente, mensagem, criado_em")
        .eq("lead_id", selectedId)
        .order("criado_em", { ascending: true });

      if (!cancelado) {
        setMessages((data as MensagemRow[] | null) ?? []);
        setLoadingMessages(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [selectedId]);

  async function handleTogglePausa(lead: LeadResumo) {
    const novoPausado = !lead.pausado_ia;
    const previousLeads = leads;
    setBusy(true);

    setLeads((prev) => prev.map((item) => (item.id === lead.id ? { ...item, pausado_ia: novoPausado } : item)));

    const { error } = await supabase.from("leads").update({ pausado_ia: novoPausado }).eq("id", lead.id);

    if (error) {
      setLeads(previousLeads);
    }
    setBusy(false);
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-10 text-center">
        <p className="text-sm text-zinc-400">Nenhum lead com conversa registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="w-full max-w-xs shrink-0 space-y-2 overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950/80 p-3" style={{ maxHeight: "70vh" }}>
        {leads.map((lead) => (
          <button
            key={lead.id}
            onClick={() => setSelectedId(lead.id)}
            className={`w-full rounded-2xl border p-3 text-left text-sm transition ${
              selectedId === lead.id
                ? "border-white/20 bg-white/10"
                : "border-white/5 bg-transparent hover:bg-white/5"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-white">{lead.nome || "Sem nome"}</p>
              {lead.pausado_ia ? <span className="text-xs">🙋</span> : null}
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">{lead.telefone ?? "Sem telefone"}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${etapaBadge[lead.etapa]}`}>
                {etapaLabel[lead.etapa]}
              </span>
              <span className="text-[10px] text-zinc-500">{ultimaAtividade(lead)}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
        {!selectedLead ? (
          <p className="m-auto text-sm text-zinc-400">Selecione um lead pra ver a conversa.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedLead.nome || "Sem nome"}</h3>
                <p className="mt-1 text-sm text-zinc-400">{selectedLead.telefone ?? "Sem telefone"}</p>
              </div>
              <button
                onClick={() => handleTogglePausa(selectedLead)}
                disabled={busy}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                  selectedLead.pausado_ia
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                    : "border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
                }`}
              >
                {selectedLead.pausado_ia ? "🤖 Devolver pra IA" : "🙋 Assumir conversa"}
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "58vh" }}>
              {loadingMessages ? (
                <p className="py-6 text-center text-sm text-zinc-400">Carregando conversa...</p>
              ) : messages.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">Nenhuma mensagem registrada pra esse lead ainda.</p>
              ) : (
                messages.map((msg) => {
                  const isIa = msg.remetente === "ia";
                  return (
                    <div key={msg.id} className={`flex ${isIa ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          isIa ? "bg-violet-500/20 text-violet-100" : "border border-white/10 bg-white/5 text-zinc-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.mensagem}</p>
                        <p className="mt-1 text-[10px] opacity-60">{formatDataHora(msg.criado_em)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
