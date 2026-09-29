"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/app/lib/supabase";
import {
  ETAPA_PERDIDO,
  ETAPA_VENDA,
  MOTIVOS_PERDA,
  ordenarEtapas,
  traduzirErroEtapa,
  type EtapaCliente,
  type MotivoPerda,
  type TipoEtapa,
} from "@/app/lib/leadEtapas";
import { FILTRO_INICIAL, anunciosDosLeads, diasParado, estaParado, filtrarLeads, type FiltroLeads } from "@/app/lib/portalLeads";
import { LeadsLista } from "./LeadsLista";

export type Etapa = string;

export type LeadRow = {
  id: string;
  nome: string;
  telefone: string | null;
  etapa: Etapa;
  cliente_id: string;
  origem: string | null;
  criado_em: string;
  atualizado_em: string | null;
  pausado_ia: boolean;
  valor_conversao?: number | null;
  moeda?: string | null;
  data_conversao?: string | null;
  motivo_perda?: string | null;
  anuncio?: string | null;
  etapa_alterada_em?: string | null;
  plataforma?: string | null;
};

type Column = { key: string; label: string; tipo: TipoEtapa };

type PendingClosure = {
  lead: LeadRow;
  etapaAnterior: Etapa;
};

const ACCENT_POR_TIPO: Record<TipoEtapa, string> = {
  novo: "border-white/10 bg-zinc-950/80",
  qualificacao: "border-amber-500/20 bg-amber-500/5",
  oportunidade: "border-violet-500/20 bg-violet-500/5",
  venda: "border-emerald-500/20 bg-emerald-500/5",
  perdido: "border-rose-500/20 bg-rose-500/5",
};

const BADGE_POR_TIPO: Record<TipoEtapa, string> = {
  novo: "border-white/10 bg-white/5 text-zinc-300",
  qualificacao: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  oportunidade: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  venda: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  perdido: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

function montarColunas(etapas: EtapaCliente[]): Column[] {
  return ordenarEtapas(etapas).map((etapa) => ({ key: etapa.chave, label: etapa.nome, tipo: etapa.tipo }));
}

function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function LeadCard({
  lead,
  dragging = false,
  onTogglePausa,
  accessMode = "portal",
}: {
  lead: LeadRow;
  dragging?: boolean;
  onTogglePausa?: (lead: LeadRow) => void;
  accessMode?: AccessMode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab border text-sm transition active:cursor-grabbing ${accessMode === "internal"
        ? "rounded-xl border-white/[0.07] bg-[#111218] p-3.5 shadow-[0_12px_35px_rgba(0,0,0,.16)] hover:border-white/[0.12] hover:bg-[#13141b]"
        : "rounded-2xl border-white/10 bg-zinc-900/80 p-4 shadow-sm"} ${
        dragging ? "rotate-2 shadow-lg shadow-black/40" : ""
      }`}
    >
      <p className="font-medium text-white">{lead.nome}</p>
      <p className="mt-1 text-xs text-zinc-400">{lead.telefone ?? "Sem telefone"}</p>
      {lead.origem ? (
        <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
          {lead.origem}
        </span>
      ) : null}

      {lead.anuncio ? <p className="mt-2 truncate text-[11px] text-zinc-400">📣 {lead.anuncio}</p> : null}

      {lead.etapa !== ETAPA_VENDA && lead.etapa !== ETAPA_PERDIDO ? (
        (() => {
          const dias = diasParado(lead.etapa_alterada_em ?? lead.criado_em, new Date());
          return (
            <p className={`mt-1 text-[11px] ${dias > 3 ? "font-semibold text-amber-300" : "text-zinc-500"}`}>
              {dias === 0 ? "Atualizado hoje" : `Parado há ${dias} ${dias === 1 ? "dia" : "dias"}`}
            </p>
          );
        })()
      ) : null}

      {lead.etapa === ETAPA_VENDA && Number(lead.valor_conversao ?? 0) > 0 ? (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-emerald-300/70">Venda registrada</p>
          <p className="mt-1 font-semibold text-emerald-100">
            {formatCurrency(Number(lead.valor_conversao), lead.moeda ?? "BRL")}
          </p>
        </div>
      ) : null}

      {lead.etapa === ETAPA_PERDIDO && lead.motivo_perda ? (
        <span className="mt-3 inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-200">
          {MOTIVOS_PERDA.find((motivo) => motivo.chave === lead.motivo_perda)?.rotulo ?? lead.motivo_perda}
        </span>
      ) : null}

      {onTogglePausa && lead.pausado_ia ? (
        <span className="mt-2 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-200">
          🙋 Você assumiu essa conversa
        </span>
      ) : null}

      {onTogglePausa ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onTogglePausa(lead);
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition ${
              lead.pausado_ia
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                : "border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
            }`}
          >
            {lead.pausado_ia ? "🤖 Devolver pra IA" : "🙋 Assumir conversa"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function KanbanColumn({
  column,
  leads,
  onTogglePausa,
  accessMode = "portal",
}: {
  column: Column;
  leads: LeadRow[];
  onTogglePausa?: (lead: LeadRow) => void;
  accessMode?: AccessMode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div className={`flex flex-col ${accessMode === "internal" ? "min-w-0" : "min-w-[280px] flex-1"}`}>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_POR_TIPO[column.tipo]}`}>
            {column.label}
          </span>
        </div>
        <span className="text-xs text-zinc-500">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[200px] flex-1 flex-col gap-3 border p-3 transition ${accessMode === "internal" ? "rounded-2xl border-white/[0.07] bg-[#0d0e13]" : `rounded-3xl ${ACCENT_POR_TIPO[column.tipo]}`} ${
          isOver ? "ring-2 ring-violet-500/40" : ""
        }`}
      >
        <SortableContext items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onTogglePausa={onTogglePausa} accessMode={accessMode} />
          ))}
        </SortableContext>
        {leads.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-zinc-500">Nenhum lead nesta etapa</p>
        ) : null}
      </div>
    </div>
  );
}

const N8N_WEBHOOK_URL = "https://n8n.hildeberto.digital/webhook/crm-lead-etapa1";

type AccessMode = "internal" | "portal";

type KanbanBoardProps = {
  clienteNome: string;
  initialLeads: LeadRow[];
  etapas: EtapaCliente[];
  accessMode?: AccessMode;
  clienteId?: string;
  atendimentoIa?: boolean;
};

export function KanbanBoard({ clienteNome, initialLeads, etapas, accessMode = "portal", clienteId, atendimentoIa = false }: KanbanBoardProps) {
  const columns = montarColunas(etapas);
  const etapasOrdenadas = ordenarEtapas(etapas);
  const encerradas = new Set(etapas.filter((etapa) => etapa.tipo === "venda" || etapa.tipo === "perdido").map((etapa) => etapa.chave));
  const [filtro, setFiltro] = useState<FiltroLeads>(FILTRO_INICIAL);
  const agora = new Date();
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);
  const [pendingClosure, setPendingClosure] = useState<PendingClosure | null>(null);
  const [saleValue, setSaleValue] = useState("");
  const [saleDate, setSaleDate] = useState(localToday());
  const [closing, setClosing] = useState(false);
  const [closureError, setClosureError] = useState<string | null>(null);
  const [pendingLoss, setPendingLoss] = useState<PendingClosure | null>(null);
  const [lossReason, setLossReason] = useState<MotivoPerda | "">("");
  const [lossDetail, setLossDetail] = useState("");
  const [lossError, setLossError] = useState<string | null>(null);
  const [savingLoss, setSavingLoss] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function notifyStageChange(lead: LeadRow, etapaAnterior: Etapa, etapaNova: Etapa) {
    fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: lead.id,
        cliente_id: lead.cliente_id,
        cliente_nome: clienteNome,
        etapa_anterior: etapaAnterior,
        etapa_nova: etapaNova,
        telefone: lead.telefone,
        origem: lead.origem,
      }),
    }).catch((err) => console.error("Falha ao notificar n8n:", err));
  }

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((item) => item.id === event.active.id);
    setActiveLead(lead ?? null);
  }

  async function moverPara(lead: LeadRow, targetColumn: string) {
    if (!targetColumn || targetColumn === lead.etapa) return;

    if (targetColumn === ETAPA_VENDA) {
      setPendingClosure({ lead, etapaAnterior: lead.etapa });
      setSaleValue(lead.valor_conversao ? String(lead.valor_conversao) : "");
      setSaleDate(lead.data_conversao ? lead.data_conversao.slice(0, 10) : localToday());
      setClosureError(null);
      return;
    }

    if (targetColumn === ETAPA_PERDIDO) {
      setPendingLoss({ lead, etapaAnterior: lead.etapa });
      setLossReason("");
      setLossDetail("");
      setLossError(null);
      return;
    }

    const previousLeads = leads;
    const updatedAt = new Date().toISOString();

    setLeads((prev) =>
      prev.map((item) => (item.id === lead.id ? { ...item, etapa: targetColumn, motivo_perda: null, etapa_alterada_em: updatedAt, atualizado_em: updatedAt } : item)),
    );

    const error = accessMode === "internal"
      ? await updateInternalLead(lead.id, { etapa: targetColumn })
      : (await supabase.from("leads").update({ etapa: targetColumn, atualizado_em: updatedAt }).eq("id", lead.id)).error;

    if (error) {
      setLeads(previousLeads);
      return;
    }

    if (accessMode === "portal") {
      notifyStageChange(lead, lead.etapa, targetColumn);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const draggedLead = leads.find((item) => item.id === active.id);
    if (!draggedLead) return;

    const targetColumn = columns.find((col) => col.key === over.id)?.key
      ?? leads.find((item) => item.id === over.id)?.etapa;

    if (targetColumn) await moverPara(draggedLead, targetColumn);
  }

  async function confirmClosure() {
    if (!pendingClosure || closing) return;

    const normalizedValue = Number(saleValue.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      setClosureError("Informe um valor de venda válido.");
      return;
    }
    if (!saleDate) {
      setClosureError("Informe a data da venda.");
      return;
    }

    setClosing(true);
    setClosureError(null);

    try {
      const accessToken = accessMode === "portal" ? (await supabase.auth.getSession()).data.session?.access_token : null;
      if (accessMode === "portal" && !accessToken) throw new Error("Sessão expirada. Entre novamente no CRM.");
      const endpoint = accessMode === "internal"
        ? `/api/clientes/${clienteId}/crm/leads/${pendingClosure.lead.id}`
        : `/api/crm/leads/${pendingClosure.lead.id}/fechar`;
      const response = await fetch(endpoint, {
        method: accessMode === "internal" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          ...(accessMode === "internal" ? { etapa: ETAPA_VENDA } : {}),
          valor: normalizedValue,
          moeda: "BRL",
          data_conversao: `${saleDate}T12:00:00-03:00`,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Falha ao registrar fechamento.");

      const leadAtualizado = payload.lead as Partial<LeadRow>;
      setLeads((prev) =>
        prev.map((item) =>
          item.id === pendingClosure.lead.id
            ? {
                ...item,
                etapa: ETAPA_VENDA,
                valor_conversao: Number(leadAtualizado.valor_conversao ?? normalizedValue),
                moeda: String(leadAtualizado.moeda ?? "BRL"),
                data_conversao: String(leadAtualizado.data_conversao ?? `${saleDate}T12:00:00-03:00`),
                atualizado_em: String(leadAtualizado.atualizado_em ?? new Date().toISOString()),
                etapa_alterada_em: String(leadAtualizado.atualizado_em ?? new Date().toISOString()),
              }
            : item,
        ),
      );

      if (accessMode === "portal") {
        notifyStageChange(pendingClosure.lead, pendingClosure.etapaAnterior, ETAPA_VENDA);
      }
      setPendingClosure(null);
      setSaleValue("");
    } catch (error) {
      setClosureError(error instanceof Error ? error.message : "Falha ao registrar fechamento.");
    } finally {
      setClosing(false);
    }
  }

  async function confirmLoss() {
    if (!pendingLoss || savingLoss) return;
    if (!lossReason) {
      setLossError("Escolha o motivo da perda.");
      return;
    }

    setSavingLoss(true);
    setLossError(null);
    const detalhe = lossDetail.trim() || null;
    const atualizadoEm = new Date().toISOString();

    const error = accessMode === "internal"
      ? await updateInternalLead(pendingLoss.lead.id, { etapa: ETAPA_PERDIDO, motivo: lossReason, motivo_detalhe: detalhe })
      : (await supabase
          .from("leads")
          .update({ etapa: ETAPA_PERDIDO, motivo_perda: lossReason, motivo_perda_detalhe: detalhe, atualizado_em: atualizadoEm })
          .eq("id", pendingLoss.lead.id)).error;

    setSavingLoss(false);

    if (error) {
      setLossError(accessMode === "internal" ? error.message : traduzirErroEtapa(error.message).mensagem);
      return;
    }

    setLeads((prev) =>
      prev.map((item) =>
        item.id === pendingLoss.lead.id
          ? { ...item, etapa: ETAPA_PERDIDO, motivo_perda: lossReason, etapa_alterada_em: atualizadoEm, atualizado_em: atualizadoEm }
          : item,
      ),
    );

    if (accessMode === "portal") {
      notifyStageChange(pendingLoss.lead, pendingLoss.etapaAnterior, ETAPA_PERDIDO);
    }
    setPendingLoss(null);
  }

  async function handleTogglePausa(lead: LeadRow) {
    const novoPausado = !lead.pausado_ia;
    const previousLeads = leads;

    setLeads((prev) => prev.map((item) => (item.id === lead.id ? { ...item, pausado_ia: novoPausado } : item)));

    const error = accessMode === "internal"
      ? await updateInternalLead(lead.id, { pausado_ia: novoPausado })
      : (await supabase.from("leads").update({ pausado_ia: novoPausado }).eq("id", lead.id)).error;

    if (error) {
      setLeads(previousLeads);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filtro.etapa}
          onChange={(event) => setFiltro((atual) => ({ ...atual, etapa: event.target.value }))}
          className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="todas">Todas as etapas</option>
          {etapasOrdenadas.map((etapa) => (
            <option key={etapa.chave} value={etapa.chave}>{etapa.nome}</option>
          ))}
        </select>
        <select
          value={filtro.anuncio}
          onChange={(event) => setFiltro((atual) => ({ ...atual, anuncio: event.target.value }))}
          className="max-w-[220px] rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="todos">Todos os anúncios</option>
          {anunciosDosLeads(leads).map((nome) => (
            <option key={nome} value={nome}>{nome}</option>
          ))}
        </select>
        <select
          value={filtro.chegada}
          onChange={(event) => setFiltro((atual) => ({ ...atual, chegada: event.target.value as FiltroLeads["chegada"] }))}
          className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="todos">Chegaram quando quiser</option>
          <option value="7">Chegaram nos últimos 7 dias</option>
          <option value="30">Chegaram nos últimos 30 dias</option>
        </select>
        <button
          type="button"
          onClick={() => setFiltro((atual) => ({ ...atual, soParados: !atual.soParados }))}
          className={`rounded-xl border px-3 py-2 text-sm font-medium ${filtro.soParados ? "border-amber-400/50 bg-amber-400/15 text-amber-200" : "border-white/10 text-zinc-300"}`}
        >
          Parados há mais de 3 dias ({leads.filter((lead) => estaParado(lead, encerradas, agora)).length})
        </button>
      </div>

      <LeadsLista
        leads={filtrarLeads(leads, filtro, encerradas, agora)}
        etapas={etapasOrdenadas}
        encerradas={encerradas}
        agora={agora}
        onMover={moverPara}
        onTogglePausa={atendimentoIa ? handleTogglePausa : undefined}
      />

      <div className="hidden md:block">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveLead(null)}
        >
          <div className={accessMode === "internal" ? "grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "flex gap-4 overflow-x-auto pb-2"}>
            {columns.map((column) => (
              <KanbanColumn
                key={column.key}
                column={column}
                leads={filtrarLeads(leads, filtro, encerradas, agora).filter((lead) => lead.etapa === column.key)}
                onTogglePausa={atendimentoIa ? handleTogglePausa : undefined}
                accessMode={accessMode}
              />
            ))}
          </div>
          <DragOverlay>{activeLead ? <LeadCard lead={activeLead} dragging accessMode={accessMode} /> : null}</DragOverlay>
        </DndContext>
      </div>

      {pendingClosure ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onPointerDown={(event) => event.stopPropagation()}>
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/20 bg-zinc-950 p-6 shadow-2xl shadow-black/60">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Registrar venda</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{pendingClosure.lead.nome}</h3>
            <p className="mt-2 text-sm text-zinc-400">Para mover para Fechado, registre o valor e a data real da venda.</p>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-zinc-300">
                <span className="mb-2 block">Valor da venda (R$)</span>
                <input
                  value={saleValue}
                  onChange={(event) => setSaleValue(event.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 2500,00"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500/40"
                />
              </label>
              <label className="block text-sm text-zinc-300">
                <span className="mb-2 block">Data da venda</span>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(event) => setSaleDate(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500/40"
                />
              </label>
            </div>

            {closureError ? <p className="mt-4 text-sm text-rose-300">{closureError}</p> : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={closing}
                onClick={() => {
                  setPendingClosure(null);
                  setClosureError(null);
                }}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={closing}
                onClick={confirmClosure}
                className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {closing ? "Salvando..." : "Confirmar venda"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingLoss ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onPointerDown={(event) => event.stopPropagation()}>
          <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-zinc-950 p-6 shadow-2xl shadow-black/60">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">Registrar perda</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{pendingLoss.lead.nome}</h3>
            <p className="mt-2 text-sm text-zinc-400">Saber por que o lead não fechou mostra onde melhorar.</p>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-zinc-300">
                <span className="mb-2 block">Motivo da perda</span>
                <select
                  value={lossReason}
                  onChange={(event) => setLossReason(event.target.value as MotivoPerda | "")}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-rose-500/40"
                >
                  <option value="">Escolha um motivo</option>
                  {MOTIVOS_PERDA.map((motivo) => (
                    <option key={motivo.chave} value={motivo.chave}>{motivo.rotulo}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-zinc-300">
                <span className="mb-2 block">Detalhe (opcional)</span>
                <textarea
                  value={lossDetail}
                  onChange={(event) => setLossDetail(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Ex.: achou caro, vai pensar"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-rose-500/40"
                />
              </label>
            </div>

            {lossError ? <p className="mt-4 text-sm text-rose-300">{lossError}</p> : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={savingLoss}
                onClick={() => {
                  setPendingLoss(null);
                  setLossError(null);
                }}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingLoss}
                onClick={confirmLoss}
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-rose-400 disabled:opacity-50"
              >
                {savingLoss ? "Salvando..." : "Confirmar perda"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  async function updateInternalLead(leadId: string, body: Record<string, unknown>) {
    if (!clienteId) return new Error("Cliente interno não informado.");
    const response = await fetch(`/api/clientes/${clienteId}/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return null;
    const payload = await response.json().catch(() => null);
    return new Error(payload?.error ?? "Falha ao atualizar lead.");
  }
}
