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

export type Etapa = "lead" | "qualificado" | "agendado" | "proposta_enviada" | "fechado" | "nao_fechou" | "desqualificado";

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
};

type Column = { key: Etapa; label: string; accent: string };

type PendingClosure = {
  lead: LeadRow;
  etapaAnterior: Etapa;
};

const COLUMNS: Column[] = [
  { key: "lead", label: "Lead", accent: "border-white/10 bg-zinc-950/80" },
  { key: "qualificado", label: "Qualificado", accent: "border-amber-500/20 bg-amber-500/5" },
  { key: "agendado", label: "Agendado", accent: "border-violet-500/20 bg-violet-500/5" },
  { key: "proposta_enviada", label: "Proposta Enviada", accent: "border-sky-500/20 bg-sky-500/5" },
  { key: "fechado", label: "Fechado", accent: "border-emerald-500/20 bg-emerald-500/5" },
  { key: "nao_fechou", label: "Não Fechou", accent: "border-orange-500/20 bg-orange-500/5" },
  { key: "desqualificado", label: "Desqualificado", accent: "border-rose-500/20 bg-rose-500/5" },
];

const badgeClasses: Record<Etapa, string> = {
  lead: "border-white/10 bg-white/5 text-zinc-300",
  qualificado: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  agendado: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  proposta_enviada: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  fechado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  nao_fechou: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  desqualificado: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

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
}: {
  lead: LeadRow;
  dragging?: boolean;
  onTogglePausa?: (lead: LeadRow) => void;
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
      className={`cursor-grab rounded-2xl border border-white/10 bg-zinc-900/80 p-4 text-sm shadow-sm transition active:cursor-grabbing ${
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

      {lead.etapa === "fechado" && Number(lead.valor_conversao ?? 0) > 0 ? (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-emerald-300/70">Venda registrada</p>
          <p className="mt-1 font-semibold text-emerald-100">
            {formatCurrency(Number(lead.valor_conversao), lead.moeda ?? "BRL")}
          </p>
        </div>
      ) : null}

      {lead.pausado_ia ? (
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
}: {
  column: Column;
  leads: LeadRow[];
  onTogglePausa: (lead: LeadRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div className="flex min-w-[280px] flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClasses[column.key]}`}>
            {column.label}
          </span>
        </div>
        <span className="text-xs text-zinc-500">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[200px] flex-1 flex-col gap-3 rounded-3xl border p-3 transition ${column.accent} ${
          isOver ? "ring-2 ring-violet-500/40" : ""
        }`}
      >
        <SortableContext items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onTogglePausa={onTogglePausa} />
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

export function KanbanBoard({ clienteNome, initialLeads }: { clienteNome: string; initialLeads: LeadRow[] }) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);
  const [pendingClosure, setPendingClosure] = useState<PendingClosure | null>(null);
  const [saleValue, setSaleValue] = useState("");
  const [saleDate, setSaleDate] = useState(localToday());
  const [closing, setClosing] = useState(false);
  const [closureError, setClosureError] = useState<string | null>(null);

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const draggedLead = leads.find((item) => item.id === active.id);
    if (!draggedLead) return;

    const targetColumn = COLUMNS.find((col) => col.key === over.id)?.key
      ?? leads.find((item) => item.id === over.id)?.etapa;

    if (!targetColumn || targetColumn === draggedLead.etapa) return;

    if (targetColumn === "fechado") {
      setPendingClosure({ lead: draggedLead, etapaAnterior: draggedLead.etapa });
      setSaleValue(draggedLead.valor_conversao ? String(draggedLead.valor_conversao) : "");
      setSaleDate(draggedLead.data_conversao ? draggedLead.data_conversao.slice(0, 10) : localToday());
      setClosureError(null);
      return;
    }

    const previousLeads = leads;
    const updatedAt = new Date().toISOString();

    setLeads((prev) =>
      prev.map((item) => (item.id === draggedLead.id ? { ...item, etapa: targetColumn, atualizado_em: updatedAt } : item)),
    );

    const { error } = await supabase
      .from("leads")
      .update({ etapa: targetColumn, atualizado_em: updatedAt })
      .eq("id", draggedLead.id);

    if (error) {
      setLeads(previousLeads);
      return;
    }

    notifyStageChange(draggedLead, draggedLead.etapa, targetColumn);
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
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Entre novamente no CRM.");

      const response = await fetch(`/api/crm/leads/${pendingClosure.lead.id}/fechar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
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
                etapa: "fechado",
                valor_conversao: Number(leadAtualizado.valor_conversao ?? normalizedValue),
                moeda: String(leadAtualizado.moeda ?? "BRL"),
                data_conversao: String(leadAtualizado.data_conversao ?? `${saleDate}T12:00:00-03:00`),
                atualizado_em: String(leadAtualizado.atualizado_em ?? new Date().toISOString()),
              }
            : item,
        ),
      );

      notifyStageChange(pendingClosure.lead, pendingClosure.etapaAnterior, "fechado");
      setPendingClosure(null);
      setSaleValue("");
    } catch (error) {
      setClosureError(error instanceof Error ? error.message : "Falha ao registrar fechamento.");
    } finally {
      setClosing(false);
    }
  }

  async function handleTogglePausa(lead: LeadRow) {
    const novoPausado = !lead.pausado_ia;
    const previousLeads = leads;

    setLeads((prev) => prev.map((item) => (item.id === lead.id ? { ...item, pausado_ia: novoPausado } : item)));

    const { error } = await supabase.from("leads").update({ pausado_ia: novoPausado }).eq("id", lead.id);

    if (error) {
      setLeads(previousLeads);
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLead(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.key}
              column={column}
              leads={leads.filter((lead) => lead.etapa === column.key)}
              onTogglePausa={handleTogglePausa}
            />
          ))}
        </div>
        <DragOverlay>{activeLead ? <LeadCard lead={activeLead} dragging /> : null}</DragOverlay>
      </DndContext>

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
    </>
  );
}
