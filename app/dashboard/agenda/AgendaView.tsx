"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import type {
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";

export type Compromisso = {
  id: string;
  titulo: string;
  tipo: "pessoal" | "call_prospeccao" | "reuniao_cliente";
  data_hora: string;
  duracao_minutos: number | null;
  lead_comercial_id: string | null;
  status: string;
  leadNome: string | null;
};

function saoPauloDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function saoPauloTimeKey(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

// String "naive" (sem Z/offset) representando o horário de São Paulo do Date
// recebido. O FullCalendar, com timeZone="America/Sao_Paulo", interpreta uma
// string sem offset como já estando nesse fuso — é o formato confiável pra
// isso, diferente de mandar toISOString() (UTC) e torcer pra ele converter.
function saoPauloIsoLocal(date: Date) {
  return `${saoPauloDateKey(date)}T${saoPauloTimeKey(date)}:00`;
}

const tipoConfig: Record<
  Compromisso["tipo"],
  { label: string; badgeClass: string; bg: string; border: string; text: string }
> = {
  call_prospeccao: {
    label: "Call de prospecção",
    badgeClass: "border-[#D85A30]/40 bg-[#D85A30]/15 text-[#f0a480]",
    bg: "#D85A30",
    border: "#D85A30",
    text: "#ffffff",
  },
  pessoal: {
    label: "Pessoal",
    badgeClass: "border-white/10 bg-[#2C2C2A] text-zinc-300",
    bg: "#3f3f46",
    border: "#52525b",
    text: "#f4f4f5",
  },
  reuniao_cliente: {
    label: "Reunião com cliente",
    badgeClass: "border-indigo-500/40 bg-indigo-500/15 text-indigo-200",
    bg: "#4f46e5",
    border: "#4f46e5",
    text: "#ffffff",
  },
};

export function AgendaView({ initialCompromissos }: { initialCompromissos: Compromisso[] }) {
  const [compromissos, setCompromissos] = useState<Compromisso[]>(initialCompromissos);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState("60");
  const [tipo, setTipo] = useState<Compromisso["tipo"]>("pessoal");

  const events: EventInput[] = useMemo(
    () =>
      compromissos.map((item) => {
        const cfg = tipoConfig[item.tipo];
        const start = new Date(item.data_hora);
        const end = item.duracao_minutos
          ? new Date(start.getTime() + item.duracao_minutos * 60000)
          : undefined;
        const titleBase =
          item.tipo === "call_prospeccao" && item.leadNome
            ? `${item.titulo} — ${item.leadNome}`
            : item.titulo;
        return {
          id: item.id,
          title: titleBase,
          start: saoPauloIsoLocal(start),
          end: end ? saoPauloIsoLocal(end) : undefined,
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          textColor: cfg.text,
          extendedProps: { tipo: item.tipo, status: item.status },
        };
      }),
    [compromissos],
  );

  const resetForm = () => {
    setTitulo("");
    setData("");
    setHora("");
    setDuracao("60");
    setTipo("pessoal");
  };

  const closeForm = () => {
    resetForm();
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const startEdit = (item: Compromisso) => {
    const date = new Date(item.data_hora);
    setEditingId(item.id);
    setTitulo(item.titulo);
    setData(saoPauloDateKey(date));
    setHora(saoPauloTimeKey(date));
    setDuracao(item.duracao_minutos ? String(item.duracao_minutos) : "");
    setTipo(item.tipo);
    setError(null);
    setShowForm(true);
  };

  const openNewAt = (dateKey: string, timeKey: string) => {
    resetForm();
    setEditingId(null);
    setData(dateKey);
    setHora(timeKey);
    setError(null);
    setShowForm(true);
  };

  const handleDateClick = (info: DateClickArg) => {
    const [datePart, timePart] = info.dateStr.split("T");
    openNewAt(datePart, timePart ? timePart.slice(0, 5) : "09:00");
  };

  const handleEventClick = (info: EventClickArg) => {
    const item = compromissos.find((c) => c.id === info.event.id);
    if (item) startEdit(item);
  };

  const persistReschedule = async (id: string, dataHoraIso: string, duracaoMinutos: number | null) => {
    const item = compromissos.find((c) => c.id === id);
    if (!item) return false;

    const response = await fetch("/api/compromissos/atualizar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        titulo: item.titulo,
        tipo: item.tipo,
        data_hora: dataHoraIso,
        duracao_minutos: duracaoMinutos,
      }),
    });

    if (!response.ok) return false;

    const payload = await response.json();
    setCompromissos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...payload.compromisso, leadNome: c.leadNome } : c)),
    );
    return true;
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const novaDataHora = `${info.event.startStr}-03:00`;
    const duracaoMinutos = info.event.end
      ? Math.round((info.event.end.getTime() - info.event.start!.getTime()) / 60000)
      : null;
    const ok = await persistReschedule(info.event.id, novaDataHora, duracaoMinutos);
    if (!ok) info.revert();
  };

  const handleEventResize = async (info: EventResizeDoneArg) => {
    const novaDataHora = `${info.event.startStr}-03:00`;
    const duracaoMinutos = info.event.end
      ? Math.round((info.event.end.getTime() - info.event.start!.getTime()) / 60000)
      : null;
    const ok = await persistReschedule(info.event.id, novaDataHora, duracaoMinutos);
    if (!ok) info.revert();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const tituloTrim = titulo.trim();
    if (!tituloTrim || !data || !hora) {
      setError("Preencha título, data e horário.");
      return;
    }

    setSaving(true);
    try {
      const corpo = {
        titulo: tituloTrim,
        tipo,
        data_hora: `${data}T${hora}:00-03:00`,
        duracao_minutos: duracao ? Number(duracao) : null,
      };

      const response = editingId
        ? await fetch("/api/compromissos/atualizar", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, ...corpo }),
          })
        : await fetch("/api/compromissos/criar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo),
          });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? "Não foi possível salvar o compromisso.");
        return;
      }

      if (editingId) {
        setCompromissos((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, ...payload.compromisso, leadNome: item.leadNome } : item)),
        );
      } else {
        setCompromissos((prev) => [...prev, { ...payload.compromisso, leadNome: null }]);
      }

      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmado = window.confirm("Tem certeza que quer apagar este compromisso?");
    if (!confirmado) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/compromissos/apagar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) return;

      setCompromissos((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) closeForm();
    } finally {
      setDeleting(false);
    }
  };

  const renderEventContent = (arg: EventContentArg) => (
    <div className="flex w-full flex-col gap-0.5 overflow-hidden px-1 py-0.5 text-[11px] leading-tight">
      {arg.timeText ? <span className="font-semibold opacity-90">{arg.timeText}</span> : null}
      <span className="truncate font-medium">{arg.event.title}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#D85A30]">Sua agenda</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Compromissos e calls</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 sm:flex">
            {(Object.keys(tipoConfig) as Compromisso["tipo"][]).map((key) => (
              <span key={key} className="flex items-center gap-2 text-xs text-zinc-400">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: tipoConfig[key].bg }}
                />
                {tipoConfig[key].label}
              </span>
            ))}
          </div>
          <button
            onClick={() => (showForm ? closeForm() : openNewAt(saoPauloDateKey(new Date()), "09:00"))}
            className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30]/10 px-4 py-2 text-sm font-semibold text-[#f0a480] transition hover:bg-[#D85A30]/20"
          >
            {showForm ? (editingId ? "Cancelar edição" : "Cancelar") : "+ Novo compromisso"}
          </button>
        </div>
      </div>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="grid gap-3 rounded-3xl border border-white/10 bg-zinc-950/80 p-6 md:grid-cols-2 xl:grid-cols-4"
        >
          <input
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Título do compromisso"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 xl:col-span-2"
          />
          <input
            type="date"
            value={data}
            onChange={(event) => setData(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          />
          <input
            type="time"
            value={hora}
            onChange={(event) => setHora(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          />
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
            Duração (min)
            <input
              type="number"
              min={5}
              step={5}
              value={duracao}
              onChange={(event) => setDuracao(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <select
            value={tipo}
            onChange={(event) => setTipo(event.target.value as Compromisso["tipo"])}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="pessoal" className="bg-zinc-900 text-white">Pessoal</option>
            <option value="call_prospeccao" className="bg-zinc-900 text-white">Call de prospecção</option>
            <option value="reuniao_cliente" className="bg-zinc-900 text-white">Reunião com cliente</option>
          </select>

          <div className="flex items-center gap-3 xl:col-span-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c14f28] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar compromisso"}
            </button>
            {editingId ? (
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(editingId)}
                className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Apagando..." : "Apagar compromisso"}
              </button>
            ) : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </form>
      ) : null}

      <div className="axven-calendar rounded-3xl border border-white/10 bg-zinc-950/80 p-3 sm:p-5">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locales={[ptBrLocale]}
          locale="pt-br"
          timeZone="America/Sao_Paulo"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          buttonText={{ today: "Hoje", month: "Mês", week: "Semana", day: "Dia", list: "Lista" }}
          height="auto"
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          nowIndicator
          navLinks
          editable
          selectable
          dayMaxEvents
          weekends
          firstDay={0}
          events={events}
          eventContent={renderEventContent}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
        />
      </div>

      <p className="text-xs text-zinc-500">
        Dica: clique em um horário vazio pra criar um compromisso, clique em um existente pra editar, ou arraste
        pra remarcar.
      </p>
    </div>
  );
}
