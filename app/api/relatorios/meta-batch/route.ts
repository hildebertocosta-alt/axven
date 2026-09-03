import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const GRAPH_VERSION = "v21.0";
const FIELDS = "spend,reach,impressions,clicks,ctr,cpc,cpm,frequency,actions";
const LEAD_PRIORITY = ["lead","onsite_conversion.lead_grouped","offsite_conversion.fb_pixel_lead","onsite_conversion.messaging_conversation_started_7d"];

type Action = { action_type?: string; value?: string };
type Insight = { spend?: string; reach?: string; impressions?: string; clicks?: string; ctr?: string; cpc?: string; cpm?: string; frequency?: string; actions?: Action[] };

const n = (v: unknown) => { const x = Number(v ?? 0); return Number.isFinite(x) ? x : 0; };
const leads = (actions: Action[] = []) => { for (const t of LEAD_PRIORITY) { const a = actions.find(x => x.action_type === t && n(x.value) > 0); if (a) return n(a.value); } return 0; };

async function accountInsight(accountId: string, token: string, inicio: string, fim: string) {
  const p = new URLSearchParams({ fields: FIELDS, level: "account", time_range: JSON.stringify({ since: inicio, until: fim }), access_token: token });
  const r = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights?${p}`, { cache: "no-store" });
  const body = await r.json() as { data?: Insight[]; error?: { message?: string } };
  if (!r.ok || body.error) throw new Error(body.error?.message ?? "Falha Meta Ads");
  const x = body.data?.[0]; if (!x) return null;
  const l = leads(x.actions); const investimento = n(x.spend);
  return { investimento, alcance:n(x.reach), impressoes:n(x.impressions), cliques:n(x.clicks), ctr:n(x.ctr), cpc:n(x.cpc), cpm:n(x.cpm), frequencia:n(x.frequency), leads:l, cpl:l ? investimento/l : null };
}

export async function POST(req: NextRequest) {
  try {
    const { periodo_inicio, periodo_fim, cliente_ids } = await req.json();
    if (!periodo_inicio || !periodo_fim) return NextResponse.json({ error:"periodo_inicio e periodo_fim são obrigatórios" }, { status:400 });
    const { data: meta } = await supabaseAdmin.from("integracao_meta").select("access_token,expires_at").order("conectado_em",{ascending:false}).limit(1).maybeSingle();
    if (!meta?.access_token) return NextResponse.json({ error:"Nenhuma conexão Meta ativa" },{status:400});
    if (meta.expires_at && new Date(meta.expires_at) <= new Date()) return NextResponse.json({ error:"Conexão Meta expirada" },{status:401});
    let q = supabaseAdmin.from("clientes").select("id,nome,status,meta_account_id").not("meta_account_id","is",null);
    if (Array.isArray(cliente_ids) && cliente_ids.length) q = q.in("id", cliente_ids);
    const { data: clientes, error } = await q; if (error) throw error;
    const resultados = [];
    for (const c of clientes ?? []) {
      try { resultados.push({ cliente:{id:c.id,nome:c.nome,status:c.status}, meta:await accountInsight(c.meta_account_id,meta.access_token,periodo_inicio,periodo_fim), erro:null }); }
      catch (e) { resultados.push({ cliente:{id:c.id,nome:c.nome,status:c.status}, meta:null, erro:e instanceof Error ? e.message : "Erro" }); }
    }
    return NextResponse.json({ fonte:"Meta Ads", periodo:{inicio:periodo_inicio,fim:periodo_fim}, resultados });
  } catch (e) { return NextResponse.json({ error:e instanceof Error ? e.message : "Erro inesperado" },{status:502}); }
}
