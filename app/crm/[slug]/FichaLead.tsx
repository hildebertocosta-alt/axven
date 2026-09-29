"use client";

import { formatarChegada, formatarRespostas, linkWhatsApp } from "@/app/lib/portalLeads";
import type { LeadRow } from "./KanbanBoard";

type Props = {
  lead: LeadRow;
  nomeEtapa: string;
  onFechar: () => void;
};

// Ficha do lead: sobe de baixo no celular e abre na lateral no computador.
export function FichaLead({ lead, nomeEtapa, onFechar }: Props) {
  const respostas = formatarRespostas(lead.respostas_formulario);
  const whatsapp = linkWhatsApp(lead.telefone);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-stretch md:justify-end" onClick={onFechar}>
      <aside
        role="dialog"
        aria-label={`Ficha de ${lead.nome}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Ficha do lead</p>
            <h3 className="mt-1 truncate text-xl font-semibold text-white">{lead.nome}</h3>
            <p className="text-sm text-zinc-400">{lead.telefone ?? "Sem telefone"}</p>
          </div>
          <button type="button" onClick={onFechar} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-300">
            Fechar
          </button>
        </div>

        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950"
          >
            Abrir no WhatsApp
          </a>
        ) : null}

        <dl className="mt-5 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-zinc-500">Etapa</dt>
          <dd className="text-white">{nomeEtapa}</dd>
          <dt className="text-zinc-500">Chegou em</dt>
          <dd className="text-white">{formatarChegada(lead.criado_em)}</dd>
          <dt className="text-zinc-500">Anúncio</dt>
          <dd className="text-white">{lead.anuncio ?? "—"}</dd>
          <dt className="text-zinc-500">Campanha</dt>
          <dd className="text-white">{lead.campanha ?? "—"}</dd>
          <dt className="text-zinc-500">Origem</dt>
          <dd className="text-white">{lead.origem ?? "—"}</dd>
        </dl>

        <h4 className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-400">Respostas do formulário</h4>
        {respostas.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {respostas.map((item) => (
              <li key={item.pergunta} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-zinc-400">{item.pergunta}</p>
                <p className="mt-1 text-sm font-medium text-white">{item.resposta}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Este lead não tem respostas de formulário (chegou pelo WhatsApp ou antes de 25/09/2026).
          </p>
        )}
      </aside>
    </div>
  );
}
