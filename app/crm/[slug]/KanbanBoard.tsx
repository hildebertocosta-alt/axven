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

export type Etapa = "lead" | "qualificado" | "agendado" | "proposta_enviada" | "fechado";

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
};

type Column = { key: Etapa; label: string; accent: string };

const COLUMNS: Column[] = [
  { key: "lead", label: "Lead", accent: "border-white/10 bg-zinc-950/80" },
  { key: "qualificado", label: "Qualificado", accent: "border-amber-500/20 bg-amber-500/5" },
  { key: "agendado", label: "Agendado", accent: "border-violet-500/20 bg-violet-500/5" },
  { key: "proposta_enviada", label: "Proposta Enviada", accent: "border-sky-500/20 bg-sky-500/5" },
  { key: "fechado", label: "Fechado", accent: "border-emerald-500/20 bg-emerald-500/5" },
];

const badgeClasses: Record<Etapa, string> = {
  lead: "border-white/10 bg-white/5 text-zinc-300",
  qualificado: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  agendado: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  proposta_enviada: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  fechado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

    const previousLeads = leads;
    const updatedAt = new Date().toISOString();

    setLeads((prev) =>
      prev.map((item) => (item.id === draggedLead.id ? { ...item, etapa: targetColumn, atualizado_em: updatedAt } : item))
    );

    const { error } = await supabase
      .from("leads")
      .update({ etapa: targetColumn, atualizado_em: updatedAt })
      .eq("id", draggedLead.id);

    if (error) {
      setLeads(previousLeads);
      return;
    }

    fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: draggedLead.id,
        cliente_id: draggedLead.cliente_id,
        cliente_nome: clienteNome,
        etapa_anterior: draggedLead.etapa,
        etapa_nova: targetColumn,
        telefone: draggedLead.telefone,
        origem: draggedLead.origem,
      }),
    }).catch((err) => console.error("Falha ao notificar n8n:", err));
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
  );
}
