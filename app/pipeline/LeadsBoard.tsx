"use client";

import Link from "next/link";
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

export type Etapa = "novo_lead" | "qualificando" | "proposta_enviada" | "negociacao" | "fechado_ganho" | "perdido";

export type LeadRow = {
  id: string;
  nome: string | null;
  telefone: string;
  nicho: string | null;
  como_chegou: string | null;
  etapa: Etapa;
  atualizado_em: string;
};

type Column = { key: Etapa; label: string; accent: string };

const COLUMNS: Column[] = [
  { key: "novo_lead", label: "Novo Lead", accent: "border-white/10 bg-zinc-950/80" },
  { key: "qualificando", label: "Qualificando", accent: "border-sky-500/20 bg-sky-500/5" },
  { key: "proposta_enviada", label: "Proposta Enviada", accent: "border-amber-500/20 bg-amber-500/5" },
  { key: "negociacao", label: "Negociação", accent: "border-[#D85A30]/20 bg-[#D85A30]/5" },
  { key: "fechado_ganho", label: "Fechado (Ganho)", accent: "border-emerald-500/20 bg-emerald-500/5" },
  { key: "perdido", label: "Perdido", accent: "border-rose-500/20 bg-rose-500/5" },
];

const badgeClasses: Record<Etapa, string> = {
  novo_lead: "border-white/10 bg-white/5 text-zinc-300",
  qualificando: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  proposta_enviada: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  negociacao: "border-[#D85A30]/40 bg-[#D85A30]/15 text-[#f0a480]",
  fechado_ganho: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  perdido: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

function diasParado(atualizadoEm: string) {
  return Math.floor((Date.now() - new Date(atualizadoEm).getTime()) / 86400000);
}

function formatCanal(value: string | null) {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
}

function formatData(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function LeadCard({ lead, dragging = false }: { lead: LeadRow; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const parado = diasParado(lead.atualizado_em);
  const esfriando = parado > 5;
  const canal = formatCanal(lead.como_chegou);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab rounded-2xl border p-4 text-sm shadow-sm transition active:cursor-grabbing ${
        esfriando ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-zinc-900/80"
      } ${dragging ? "rotate-2 shadow-lg shadow-black/40" : ""}`}
    >
      <p className="font-medium text-white">{lead.nome ?? "Sem nome"}</p>
      <p className="mt-1 text-xs text-zinc-400">{lead.telefone}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canal ? (
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
            {canal}
          </span>
        ) : null}
        <span className="text-[11px] text-zinc-500">Último contato: {formatData(lead.atualizado_em)}</span>
      </div>

      {esfriando ? (
        <span className="mt-2 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
          Esfriando · {parado}d sem atualização
        </span>
      ) : null}
    </div>
  );
}

function KanbanColumn({ column, leads }: { column: Column; leads: LeadRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div className="flex min-w-[280px] flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClasses[column.key]}`}>
          {column.label}
        </span>
        <span className="text-xs text-zinc-500">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[200px] flex-1 flex-col gap-3 rounded-3xl border p-3 transition ${column.accent} ${
          isOver ? "ring-2 ring-[#D85A30]/40" : ""
        }`}
      >
        <SortableContext items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-zinc-500">Nenhum lead nesta etapa</p>
        ) : null}
      </div>
    </div>
  );
}

export function LeadsBoard({ initialLeads }: { initialLeads: LeadRow[] }) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);
  const [onboardingLead, setOnboardingLead] = useState<string | null>(null);

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
      prev.map((item) => (item.id === draggedLead.id ? { ...item, etapa: targetColumn, atualizado_em: updatedAt } : item)),
    );

    const response = await fetch("/api/leads-comerciais/atualizar-etapa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draggedLead.id, etapa: targetColumn }),
    });

    if (!response.ok) {
      setLeads(previousLeads);
      return;
    }

    if (targetColumn === "fechado_ganho") {
      setOnboardingLead(draggedLead.nome ?? "Lead");
    }
  }

  return (
    <div className="space-y-4">
      {onboardingLead ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#D85A30]/30 bg-[#D85A30]/10 px-5 py-4">
          <p className="text-sm text-[#f0a480]">
            🎉 <span className="font-semibold text-white">{onboardingLead}</span> fechou! Próximo passo sugerido: iniciar o
            onboarding do novo cliente.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard?novo_cliente=1&nome=${encodeURIComponent(onboardingLead)}`}
              className="rounded-full border border-[#D85A30]/40 bg-[#D85A30] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#c14f28]"
            >
              Cadastrar cliente
            </Link>
            <button onClick={() => setOnboardingLead(null)} className="text-sm text-zinc-400 transition hover:text-white">
              Dispensar
            </button>
          </div>
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLead(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((column) => (
            <KanbanColumn key={column.key} column={column} leads={leads.filter((lead) => lead.etapa === column.key)} />
          ))}
        </div>
        <DragOverlay>{activeLead ? <LeadCard lead={activeLead} dragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
