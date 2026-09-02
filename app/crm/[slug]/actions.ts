"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const ETAPAS_VALIDAS = new Set([
  "lead",
  "qualificado",
  "agendado",
  "proposta_enviada",
  "fechado",
  "nao_fechou",
  "desqualificado",
]);

export async function atualizarEtapaLead(input: {
  slug: string;
  leadId: string;
  etapa: string;
}) {
  if (!input.slug || !input.leadId || !ETAPAS_VALIDAS.has(input.etapa)) {
    return { ok: false as const, error: "dados_invalidos" };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "unauthorized" };

  const { data: vinculo } = await supabase
    .from("crm_usuarios")
    .select("cliente_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vinculo) return { ok: false as const, error: "acesso_negado" };

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id,status,status_pagamento")
    .eq("slug", input.slug)
    .maybeSingle();

  if (!cliente || cliente.id !== vinculo.cliente_id) {
    return { ok: false as const, error: "acesso_negado" };
  }

  if (cliente.status === "cancelado" || cliente.status_pagamento === "cancelado") {
    return { ok: false as const, error: "cliente_inativo" };
  }

  const atualizadoEm = new Date().toISOString();
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .update({ etapa: input.etapa, atualizado_em: atualizadoEm })
    .eq("id", input.leadId)
    .eq("cliente_id", cliente.id)
    .select("id,etapa,atualizado_em")
    .maybeSingle();

  if (error || !lead) {
    return { ok: false as const, error: error?.message || "lead_nao_encontrado" };
  }

  return { ok: true as const, lead };
}
