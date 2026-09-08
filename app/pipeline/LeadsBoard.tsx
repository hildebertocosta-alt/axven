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

export type Etapa = "lead" | "qualificado" | "agendado" | "proposta_enviada" | "fechado" | "nao_fechou" | "desqualificado";

export type LeadRow = {
  id: string;
  nome: string | null;
  telefone: string;
  nicho: string | null;
  como_chegou: string | null;
  etapa: Etapa;
  atualizado_em: string;
  pausado_ia: boolean;
  campanha?: string | null;
  campaign_id?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  qualificado?: boolean;
  agendado_em?: string | null;
  venda_em?: string | null;
  valor_venda?: number | null;
  moeda?: string | null;
};

type Column = { key: Etapa; label: string; accent: string };

const COLUMNS: Column[] = [
  { key: "lead", label: "Lead", accent: "border-white/10 bg-zinc-950/80" },
  { key: "qualificado", label: "Qualificado", accent: "border-sky-500/20 bg-sky-500/5" },
  { key: "agendado", label: "Agendado", accent: "border-violet-500/20 bg-violet-500/5" },
  { key: "proposta_enviada", label: "Proposta enviada", accent: "border-amber-500/20 bg-amber-500/5" },
  { key: "fechado", label: "Fechado", accent: "border-emerald-500/20 bg-emerald-500/5" },
  { key: "nao_fechou", label: "Não fechou", accent: "border-rose-500/20 bg-rose-500/5" },
  { key: "desqualificado", label: "Desqualificado", accent: "border-zinc-600/30 bg-zinc-800/40" },
];

const badgeClasses: Record<Etapa, string> = {
  lead: "border-white/10 bg-white/5 text-zinc-300",
  qualificado: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  agendado: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  proposta_enviada: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  fechado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  nao_fechou: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  desqualificado: "border-zinc-500/30 bg-zinc-700/20 text-zinc-400",
};

function formatData(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(value?: number | null, moeda = "BRL") {
  if (value == null) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda || "BRL" }).format(value);
}

function LeadCard({ lead, dragging = false, onMove }: { lead: LeadRow; dragging?: boolean; onMove?: (lead: LeadRow, etapa: Etapa) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`cursor-grab rounded-2xl border border-white/10 bg-zinc-900/80 p-4 text-sm shadow-sm transition active:cursor-grabbing ${dragging ? "rotate-2 shadow-lg shadow-black/40" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-white">{lead.nome ?? "Sem nome"}</p>
          {lead.nicho ? <p className="mt-1 text-xs text-zinc-400">{lead.nicho}</p> : null}
        </div>
        {lead.qualificado ? <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-200">Qualificado</span> : null}
      </div>
      <p className="mt-2 text-xs text-zinc-400">{lead.telefone}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-400">
        {lead.como_chegou ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{lead.como_chegou}</span> : null}
        {lead.campanha ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{lead.campanha}</span> : null}
      </div>
      {lead.agendado_em ? <p className="mt-3 text-[11px] text-violet-200">📅 {formatData(lead.agendado_em)}</p> : null}
      {lead.valor_venda != null ? <p className="mt-2 text-xs font-medium text-emerald-200">💰 {formatCurrency(lead.valor_venda, lead.moeda ?? "BRL")}</p> : null}
      {lead.venda_em ? <p className="mt-1 text-[10px] text-emerald-300/70">Venda em {formatData(lead.venda_em)}</p> : null}
      <p className="mt-3 text-[10px] text-zinc-600">Atualizado {formatData(lead.atualizado_em)}</p>

      {onMove ? (
        <select
          value={lead.etapa}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            const etapa = event.target.value as Etapa;
            if (etapa !== lead.etapa) onMove(lead, etapa);
          }}
          className="mt-4 w-full cursor-pointer rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-[#D85A30]/60"
        >
          {COLUMNS.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
        </select>
      ) : null}
    </div>
  );
}

function KanbanColumn({ column, leads, onMove }: { column: Column; leads: LeadRow[]; onMove: (lead: LeadRow, etapa: Etapa) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <div className="flex min-w-[280px] flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClasses[column.key]}`}>{column.label}</span>
        <span className="text-xs text-zinc-500">{leads.length}</span>
      </div>
      <div ref={setNodeRef} className={`flex min-h-[220px] flex-1 flex-col gap-3 rounded-3xl border p-3 transition ${column.accent} ${isOver ? "ring-2 ring-[#D85A30]/40" : ""}`}>
        <SortableContext items={leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => <LeadCard key={lead.id} lead={lead} onMove={onMove} />)}
        </SortableContext>
        {leads.length === 0 ? <p className="px-1 py-6 text-center text-xs text-zinc-500">Nenhum lead nesta etapa</p> : null}
      </div>
    </div>
  );
}

function ClosingModal({ lead, onCancel, onSaved }: { lead: LeadRow; onCancel: () => void; onSaved: (lead: LeadRow) => void }) {
  const [valor, setValor] = useState(lead.valor_venda ? String(lead.valor_venda) : "");
  const [moeda, setMoeda] = useState(lead.moeda || "BRL");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number(valor.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Informe um valor de venda válido.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch("/api/crm/axven/leads/atualizar-etapa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, etapa: "fechado", valor_venda: parsed, moeda, venda_em: `${data}T12:00:00-03:00` }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setError(payload?.error ?? "Não foi possível registrar o fechamento.");
      return;
    }
    onSaved({ ...lead, ...payload.lead, etapa: "fechado" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Registrar venda</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{lead.nome ?? "Lead"}</h3>
          </div>
          <button type="button" onClick={onCancel} className="text-sm text-zinc-400 hover:text-white">Cancelar</button>
        </div>
        <label className="mt-6 block text-xs text-zinc-400">Valor da venda</label>
        <input autoFocus inputMode="decimal" value={valor} onChange={(event) => setValor(event.target.value)} placeholder="2500,00" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-500/50" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400">Moeda</label>
            <select value={moeda} onChange={(event) => setMoeda(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-white"><option value="BRL">BRL</option><option value="USD">USD</option><option value="EUR">EUR</option></select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Data da venda</label>
            <input type="date" value={data} onChange={(event) => setData(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-white" />
          </div>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        <button disabled={saving} className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-3 font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50">{saving ? "Salvando..." : "Confirmar fechamento"}</button>
      </form>
    </div>
  );
}

export function LeadsBoard({ initialLeads }: { initialLeads: LeadRow[] }) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);
  const [closingLead, setClosingLead] = useState<LeadRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(event: DragStartEvent) {
    setActiveLead(leads.find((item) => item.id === event.active.id) ?? null);
  }

  async function updateStage(lead: LeadRow, etapa: Etapa) {
    const previous = lead.etapa;
    setError(null);
    setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, etapa } : item));
    const response = await fetch("/api/crm/axven/leads/atualizar-etapa", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, etapa }) });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, etapa: previous } : item));
      setError(payload?.error ?? "Não foi possível atualizar a etapa do lead.");
    }
  }

  async function requestStageChange(lead: LeadRow, etapa: Etapa) {
    if (etapa === lead.etapa) return;
    if (etapa === "fechado") {
      setClosingLead(lead);
      return;
    }
    await updateStage(lead, etapa);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;
    const draggedLead = leads.find((item) => item.id === active.id);
    if (!draggedLead) return;
    const targetColumn = COLUMNS.find((column) => column.key === over.id)?.key ?? leads.find((item) => item.id === over.id)?.etapa;
    if (!targetColumn) return;
    await requestStageChange(draggedLead, targetColumn);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-zinc-400">Leads reais da aquisição Axven, sem duplicação no CRM de clientes.</p><p className="mt-1 text-xs text-zinc-600">Use “Mover para...” no card ou arraste entre as etapas. Em Fechado, informe valor, data e moeda.</p></div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">{leads.length} leads</span>
      </div>
      {error ? <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-5">{COLUMNS.map((column) => <KanbanColumn key={column.key} column={column} leads={leads.filter((lead) => lead.etapa === column.key)} onMove={requestStageChange} />)}</div>
        <DragOverlay>{activeLead ? <div className="w-[280px]"><LeadCard lead={activeLead} dragging /></div> : null}</DragOverlay>
      </DndContext>
      {closingLead ? <ClosingModal lead={closingLead} onCancel={() => setClosingLead(null)} onSaved={(saved) => { setLeads((current) => current.map((item) => item.id === saved.id ? saved : item)); setClosingLead(null); setError(null); }} /> : null}
    </div>
  );
}
