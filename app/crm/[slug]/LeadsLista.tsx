"use client";

import { diasParado, estaParado } from "@/app/lib/portalLeads";
import type { EtapaCliente } from "@/app/lib/leadEtapas";
import type { LeadRow } from "./KanbanBoard";

type Props = {
  leads: LeadRow[];
  etapas: EtapaCliente[];
  encerradas: Set<string>;
  agora: Date;
  onMover: (lead: LeadRow, etapaDestino: string) => void;
};

export function LeadsLista({ leads, etapas, encerradas, agora, onMover }: Props) {
  const nomeEtapa = (chave: string) => etapas.find((etapa) => etapa.chave === chave)?.nome ?? chave;

  if (leads.length === 0) {
    return <p className="rounded-2xl border border-white/10 p-6 text-center text-sm text-zinc-400 md:hidden">Nenhum lead com esses filtros.</p>;
  }

  return (
    <ul className="space-y-3 md:hidden">
      {leads.map((lead) => {
        const parado = estaParado(lead, encerradas, agora);
        const dias = diasParado(lead.etapa_alterada_em ?? lead.criado_em, agora);
        return (
          <li key={lead.id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{lead.nome}</p>
                <p className="text-sm text-zinc-400">{lead.telefone ?? "Sem telefone"}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200">{nomeEtapa(lead.etapa)}</span>
            </div>
            {lead.anuncio ? <p className="mt-2 truncate text-xs text-zinc-400">📣 {lead.anuncio}</p> : null}
            {!encerradas.has(lead.etapa) ? (
              <p className={`mt-1 text-xs ${parado ? "font-semibold text-amber-300" : "text-zinc-500"}`}>
                {dias === 0 ? "Atualizado hoje" : `Parado há ${dias} ${dias === 1 ? "dia" : "dias"}`}
              </p>
            ) : null}
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Mover para</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {etapas
                .filter((etapa) => etapa.chave !== lead.etapa)
                .map((etapa) => (
                  <button
                    key={etapa.chave}
                    type="button"
                    onClick={() => onMover(lead, etapa.chave)}
                    className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white active:bg-white/15"
                  >
                    {etapa.nome}
                  </button>
                ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
