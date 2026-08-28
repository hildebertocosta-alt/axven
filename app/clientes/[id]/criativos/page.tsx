"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "../../../components/dashboard/AppShell";
import { CriativosPanel } from "../CriativosPanel";

export default function ClienteCriativosPage() {
  const params = useParams<{ id: string }>();
  return (
    <AppShell title="Criativos" subtitle="Cliente 360º · Performance de criativos" activeLabel="Clientes">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <div>
          <Link href={`/clientes/${params.id}`} className="text-xs text-zinc-500 transition hover:text-[#d7b66f]">← Voltar ao Cliente 360º</Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#caa45c]">Axven · Cliente 360º</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">Criativos</h2>
          <p className="mt-2 text-sm text-zinc-500">Performance real dos anúncios vinculados à conta Meta do cliente.</p>
        </div>
        <CriativosPanel clienteId={params.id} />
      </div>
    </AppShell>
  );
}
