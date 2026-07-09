"use client";

import { useMemo, useState } from "react";

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

function dateKey(iso: string) {
  return saoPauloDateKey(new Date(iso));
}

function localDateKey(date: Date) {
  return saoPauloDateKey(date);
}

function formatDiaLabel(key: string) {
  const now = new Date();
  const amanha = new Date(now);
  amanha.setDate(amanha.getDate() + 1);

  if (key === localDateKey(now)) return "Hoje";
  if (key === localDateKey(amanha)) return "Amanhã";

  const date = new Date(`${key}T00:00:00-03:00`);
  const label = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatHora(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

function formatDuracao(minutos: number | null) {
  if (!minutos) return null;
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

function sortCompromissos(items: Compromisso[]) {
  return [...items].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
}

function groupByDay(items: Compromisso[]) {
  const groups = new Map<string, Compromisso[]>();
  for (const item of items) {
    const key = dateKey(item.data_hora);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

const tipoBadge: Record<Compromisso["tipo"], { label: string; className: string }> = {
  call_prospeccao: {
    label: "Call de prospecção",
    className: "border-[#D85A30]/40 bg-[#D85A30]/15 text-[#f0a480]",
  },
  pessoal: {
    label: "Pessoal",
    className: "border-white/10 bg-[#2C2C2A] text-zinc-300",
  },
  reuniao_cliente: {
    label: "Reunião com cliente",
    className: "border-indigo-500/40 bg-indigo-500/15 text-indigo-200",
  },
};

export function AgendaView({ initialCompromissos }: { initialCompromissos: Compromisso[] }) {
  const [compromissos, setCompromissos] = useState<Compromisso[]>(initialCompromissos);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState("60");
  const [tipo, setTipo] = useState<Compromisso["tipo"]>("pessoal");

  const grupos = useMemo(() => groupByDay(sortCompromissos(compromissos)), [compromissos]);

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

    const response = await fetch("/api/compromissos/apagar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) return;

    setCompromissos((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) closeForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#D85A30]">Próximos compromissos</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Sua agenda, do hoje em diante</h2>
        </div>
        <button
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30]/10 px-4 py-2 text-sm font-semibold text-[#f0a480] transition hover:bg-[#D85A30]/20"
        >
          {showForm ? (editingId ? "Cancelar edição" : "Cancelar") : "+ Novo compromisso"}
        </button>
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
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </form>
      ) : null}

      {grupos.length ? (
        <div className="space-y-6">
          {grupos.map(([key, items]) => (
            <div key={key} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
                {formatDiaLabel(key)}
              </h3>
              <div className="space-y-3">
                {items.map((item) => {
                  const badge = tipoBadge[item.tipo];
                  const duracaoLabel = formatDuracao(item.duracao_minutos);
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 shrink-0 text-sm font-semibold text-white">
                          {formatHora(item.data_hora)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{item.titulo}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                            {duracaoLabel ? <span>{duracaoLabel}</span> : null}
                            {item.tipo === "call_prospeccao" && item.leadNome ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300">
                                {item.leadNome}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          aria-label="Remarcar compromisso"
                          title="Remarcar"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          aria-label="Apagar compromisso"
                          title="Apagar"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 text-sm text-rose-300 transition hover:bg-rose-500/20"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-zinc-400">
          Nenhum compromisso agendado para hoje ou os próximos dias.
        </div>
      )}
    </div>
  );
}
