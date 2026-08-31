import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const GRAPH_VERSION = "v21.0";
type Action = { action_type?: string; value?: string };

function actionValue(actions: Action[] | undefined, types: string[]) {
  if (!actions) return 0;
  for (const type of types) {
    const found = actions.find((item) => item.action_type === type);
    if (found?.value != null) return Number(found.value) || 0;
  }
  return 0;
}

function isoDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("cliente_id");
  const status = req.nextUrl.searchParams.get("status") || "active";
  const since = isoDate(req.nextUrl.searchParams.get("since"));
  const until = isoDate(req.nextUrl.searchParams.get("until"));
  if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatório" }, { status: 400 });
  if ((since && !until) || (!since && until)) return NextResponse.json({ error: "Informe data inicial e final" }, { status: 400 });

  const { data: cliente, error: clienteError } = await supabaseAdmin.from("clientes").select("id,nome,status,meta_account_id").eq("id", clienteId).single();
  if (clienteError || !cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  if (cliente.status === "cancelado") return NextResponse.json({ error: "Cliente fora da carteira ativa" }, { status: 403 });
  if (!cliente.meta_account_id) return NextResponse.json({ error: "Cliente sem conta Meta vinculada" }, { status: 400 });

  const { data: conexao } = await supabaseAdmin.from("integracao_meta").select("access_token").order("conectado_em", { ascending: false }).limit(1).maybeSingle();
  if (!conexao?.access_token) return NextResponse.json({ error: "Nenhuma conexão Meta ativa" }, { status: 400 });

  const accountId = String(cliente.meta_account_id).replace(/^act_/, "");
  const insightRange = since && until ? `time_range({since:'${since}',until:'${until}'})` : "date_preset(last_30d)";
  const fields = [
    "id","name","status","effective_status",
    "campaign{id,name}","adset{id,name}",
    "creative{id,name,thumbnail_url,image_url,object_story_spec}",
    `insights.${insightRange}{spend,impressions,reach,frequency,clicks,ctr,cpc,actions}`
  ].join(",");
  const params = new URLSearchParams({ fields, limit: "100", access_token: conexao.access_token });
  if (status === "active") params.set("filtering", JSON.stringify([{ field: "effective_status", operator: "IN", value: ["ACTIVE"] }]));
  else if (status === "paused") params.set("filtering", JSON.stringify([{ field: "effective_status", operator: "IN", value: ["PAUSED"] }]));

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/ads?${params.toString()}`, { cache: "no-store" });
  const payload = await res.json();
  if (!res.ok || payload.error) return NextResponse.json({ error: payload?.error?.message ?? "Erro ao buscar criativos Meta" }, { status: 502 });

  const criativos = (payload.data ?? []).map((ad: any) => {
    const insight = ad.insights?.data?.[0] ?? null;
    const leads = actionValue(insight?.actions, ["lead","onsite_conversion.lead_grouped","offsite_conversion.fb_pixel_lead"]);
    const mensagens = actionValue(insight?.actions, ["onsite_conversion.messaging_conversation_started_7d","onsite_conversion.messaging_first_reply"]);
    const spend = Number(insight?.spend ?? 0) || 0;
    const frequency = Number(insight?.frequency ?? 0) || 0;
    const ctr = Number(insight?.ctr ?? 0) || 0;
    const cpl = leads > 0 ? spend / leads : null;
    let diagnostico: "Escalando" | "Saudável" | "Atenção" | "Fadiga" | "Sem dados" = "Sem dados";
    if (spend > 0) {
      if (leads >= 3 && ctr >= 1.5 && frequency < 3) diagnostico = "Escalando";
      else if ((leads > 0 || mensagens > 0) && ctr >= 1) diagnostico = "Saudável";
      else if (frequency >= 3.5 || ctr < 0.8) diagnostico = "Fadiga";
      else diagnostico = "Atenção";
    }
    const spec = ad.creative?.object_story_spec ?? {};
    const linkData = spec.link_data ?? {};
    const videoData = spec.video_data ?? {};
    return {
      id: ad.id, name: ad.name, status: ad.status, effective_status: ad.effective_status,
      campaign: ad.campaign ?? null, adset: ad.adset ?? null,
      creative_id: ad.creative?.id ?? null, creative_name: ad.creative?.name ?? null,
      thumbnail_url: ad.creative?.thumbnail_url ?? ad.creative?.image_url ?? videoData.image_url ?? linkData.image_url ?? null,
      headline: linkData.name ?? videoData.title ?? null, body: linkData.message ?? videoData.message ?? null,
      spend, impressions: Number(insight?.impressions ?? 0) || 0, reach: Number(insight?.reach ?? 0) || 0,
      frequency, clicks: Number(insight?.clicks ?? 0) || 0, ctr, cpc: Number(insight?.cpc ?? 0) || 0,
      leads, mensagens, cpl, diagnostico,
    };
  });
  criativos.sort((a: any, b: any) => b.spend - a.spend);
  const periodo = since && until ? `${since.split("-").reverse().join("/")} → ${until.split("-").reverse().join("/")}` : "Últimos 30 dias";
  return NextResponse.json({ cliente: { id: cliente.id, nome: cliente.nome }, periodo, status, criativos });
}
