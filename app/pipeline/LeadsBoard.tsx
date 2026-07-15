"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export type Etapa =
  | "novo_lead"
  | "qualificando"
  | "proposta_enviada"
  | "negociacao"
  | "fechado_ganho"
  | "perdido"
  | "numero_invalido";

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
  { key: "numero_invalido", label: "Número Inválido", accent: "border-zinc-600/30 bg-zinc-800/40" },
];

const badgeClasses: Record<Etapa, string> = {
  novo_lead: "border-white/10 bg-white/5 text-zinc-300",
  qualificando: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  proposta_enviada: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  negociacao: "border-[#D85A30]/40 bg-[#D85A30]/15 text-[#f0a480]",
  fechado_ganho: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  perdido: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  numero_invalido: "border-zinc-500/30 bg-zinc-700/20 text-zinc-400",
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

function LeadCard({
  lead,
  dragging = false,
  onOpenMessages,
}: {
  lead: LeadRow;
  dragging?: boolean;
  onOpenMessages?: (lead: LeadRow) => void;
}) {
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

      {onOpenMessages ? (
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onOpenMessages(lead);
          }}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          💬 Ver conversa
        </button>
      ) : null}
    </div>
  );
}

function KanbanColumn({
  column,
  leads,
  onOpenMessages,
}: {
  column: Column;
  leads: LeadRow[];
  onOpenMessages: (lead: LeadRow) => void;
}) {
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
            <LeadCard key={lead.id} lead={lead} onOpenMessages={onOpenMessages} />
          ))}
        </SortableContext>
        {leads.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-zinc-500">Nenhum lead nesta etapa</p>
        ) : null}
      </div>
    </div>
  );
}

type MensagemRow = { id: string; remetente: string; mensagem: string; criado_em: string };

function LeadMessagesModal({ lead, onClose }: { lead: LeadRow; onClose: () => void }) {
  const [messages, setMessages] = useState<MensagemRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const response = await fetch(`/api/leads-comerciais/${lead.id}/mensagens`);
      const payload = await response.json().catch(() => ({ mensagens: [] }));
      setMessages(payload?.mensagens ?? []);
      setLoading(false);
    })();
  }, [lead.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{lead.nome ?? "Sem nome"}</h3>
            <p className="mt-1 text-sm text-zinc-400">{lead.telefone}</p>
          </div>
          <button onClick={onClose} className="text-sm text-zinc-400 transition hover:text-white">
            Fechar
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <p className="py-6 text-center text-sm text-zinc-400">Carregando conversa...</p>
          ) : messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Nenhuma mensagem registrada pra esse lead ainda.</p>
          ) : (
            messages.map((msg) => {
              const isIa = msg.remetente === "ia";
              return (
                <div key={msg.id} className={`flex ${isIa ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      isIa ? "bg-[#D85A30]/20 text-[#f0a480]" : "border border-white/10 bg-white/5 text-zinc-200"
                    }`}
                  >
                    <p>{msg.mensagem}</p>
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(msg.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const CANAL_MANUAL_OPTIONS = [
  { value: "indicacao", label: "Indicação" },
  { value: "evento", label: "Evento / Networking" },
  { value: "whatsapp", label: "WhatsApp direto" },
  { value: "instagram", label: "Instagram" },
  { value: "outro", label: "Outro" },
];

export function LeadsBoard({ initialLeads }: { initialLeads: LeadRow[] }) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);
  const [onboardingLead, setOnboardingLead] = useState<string | null>(null);
  const [viewingLead, setViewingLead] = useState<LeadRow | null>(null);

  const [showNovoLead, setShowNovoLead] = useState(false);
  const [novoLeadNome, setNovoLeadNome] = useState("");
  const [novoLeadTelefone, setNovoLeadTelefone] = useState("");
  const [novoLeadNicho, setNovoLeadNicho] = useState("");
  const [novoLeadCanal, setNovoLeadCanal] = useState("indicacao");
  const [savingLead, setSavingLead] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleCreateLead = async (event: React.FormEvent) => {
    event.preventDefault();
    setLeadError(null);

    const telefoneTrim = novoLeadTelefone.replace(/\D/g, "");
    if (!telefoneTrim) {
      setLeadError("Informe o telefone (com DDD).");
      return;
    }

    setSavingLead(true);
    try {
      const response = await fetch("/api/leads-comerciais/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoLeadNome.trim() || null,
          telefone: telefoneTrim,
          nicho: novoLeadNicho.trim() || null,
          como_chegou: novoLeadCanal,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setLeadError(payload?.error ?? "Não foi possível cadastrar o lead.");
        return;
      }

      setLeads((prev) => [payload.lead, ...prev]);
      setNovoLeadNome("");
      setNovoLeadTelefone("");
      setNovoLeadNicho("");
      setNovoLeadCanal("indicacao");
      setShowNovoLead(false);
    } finally {
      setSavingLead(false);
    }
  };

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
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowNovoLead(true)}
          className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30]/10 px-4 py-2 text-sm font-semibold text-[#f0a480] transition hover:bg-[#D85A30]/20"
        >
          + Novo lead
        </button>
      </div>

      {showNovoLead ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Novo lead manual</h3>
            <button onClick={() => setShowNovoLead(false)} className="text-sm text-zinc-400 transition hover:text-white">
              Cancelar
            </button>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Pra leads que chegaram fora do disparo automático (indicação, evento, contato direto).
          </p>
          <form onSubmit={handleCreateLead} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={novoLeadNome}
              onChange={(event) => setNovoLeadNome(event.target.value)}
              placeholder="Nome (opcional)"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
            />
            <input
              value={novoLeadTelefone}
              onChange={(event) => setNovoLeadTelefone(event.target.value)}
              placeholder="Telefone (com DDD)"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
            />
            <input
              value={novoLeadNicho}
              onChange={(event) => setNovoLeadNicho(event.target.value)}
              placeholder="Nicho (opcional)"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
            />
            <select
              value={novoLeadCanal}
              onChange={(event) => setNovoLeadCanal(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            >
              {CANAL_MANUAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-zinc-900 text-white">
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-3 xl:col-span-4">
              <button
                type="submit"
                disabled={savingLead}
                className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c14f28] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingLead ? "Salvando..." : "Salvar lead"}
              </button>
              {leadError ? <p className="text-sm text-rose-300">{leadError}</p> : null}
            </div>
          </form>
        </div>
      ) : null}

      {viewingLead ? <LeadMessagesModal lead={viewingLead} onClose={() => setViewingLead(null)} /> : null}

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
            <KanbanColumn
              key={column.key}
              column={column}
              leads={leads.filter((lead) => lead.etapa === column.key)}
              onOpenMessages={setViewingLead}
            />
          ))}
        </div>
        <DragOverlay>{activeLead ? <LeadCard lead={activeLead} dragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
