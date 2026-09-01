import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function nested(obj: any, path: string[]) { let value = obj; for (const key of path) value = value?.[key]; return value; }
function normalizePhone(value: unknown) { const raw = clean(value); if (!raw) return null; return raw.split("@")[0]?.replace(/\D/g, "") || null; }
function booleanValue(value: unknown) { if (typeof value === "boolean") return value; if (typeof value === "string") return ["true","1","sim","yes"].includes(value.toLowerCase()); return false; }
function numberValue(value: unknown) { if (typeof value === "number" && Number.isFinite(value)) return value; if (typeof value !== "string") return null; const normalized=value.replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,""); const parsed=Number(normalized); return Number.isFinite(parsed)?parsed:null; }
function findFirstKey(value: unknown, keys: string[]): string | null { if (!value || typeof value !== "object") return null; if (Array.isArray(value)) { for (const item of value) { const found=findFirstKey(item,keys); if(found)return found; } return null; } const obj=value as Record<string,unknown>; for(const key of keys){const candidate=obj[key];if(typeof candidate==="string"&&candidate.trim())return candidate.trim();if(typeof candidate==="number")return String(candidate);} for(const child of Object.values(obj)){const found=findFirstKey(child,keys);if(found)return found;} return null; }

async function enrichMeta(lead: any) {
  if (!lead?.anuncio_source_id) return { attempted: false, enriched: false, reason: "sem_source_id" };
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return { attempted: false, enriched: false, reason: "meta_token_ausente" };
  try {
    const version = process.env.META_GRAPH_VERSION || "v23.0";
    const params = new URLSearchParams({ fields: "id,name,campaign{name},adset{name},tracking_specs", access_token: token });
    const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(lead.anuncio_source_id)}?${params.toString()}`, { cache: "no-store" });
    const meta = await response.json().catch(() => null);
    if (!response.ok || !meta) return { attempted: true, enriched: false, reason: "meta_query_failed", status: response.status };
    const tracking = meta.tracking_specs ?? [];
    const update = {
      campanha: clean(meta.campaign?.name) || lead.campanha,
      conjunto: clean(meta.adset?.name) || lead.conjunto,
      anuncio: clean(meta.name) || lead.anuncio,
      page_id: findFirstKey(tracking,["page","page_id"]) || lead.page_id,
      pixel_id: findFirstKey(tracking,["fb_pixel","pixel","pixel_id"]) || lead.pixel_id,
      dataset_id: findFirstKey(tracking,["dataset","dataset_id"]) || lead.dataset_id,
      atualizado_em: new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin.from("leads").update(update).eq("id",lead.id).select("id,campanha,conjunto,anuncio,page_id,pixel_id,dataset_id").single();
    if (error) return { attempted: true, enriched: false, reason: "database_update_failed" };
    return { attempted: true, enriched: true, lead: data };
  } catch { return { attempted: true, enriched: false, reason: "unexpected_error" }; }
}

export async function POST(req: NextRequest) {
  const authError=validateWebhookSecret(req); if(authError)return authError;
  const body=await req.json().catch(()=>null); if(!body||typeof body!=="object")return NextResponse.json({error:"corpo invalido"},{status:400});
  const message=body.message??body.body?.message??{}; const chat=body.chat??body.body?.chat??{};
  const externalAdReply=nested(message,["content","contextInfo","externalAdReply"])??nested(body,["body","message","content","contextInfo","externalAdReply"])??{};
  const clienteId=clean(body.cliente_id); const clienteSlug=clean(body.cliente_slug); const metaAccountId=clean(body.meta_account_id)||clean(body.account_id);
  let clienteQuery=supabaseAdmin.from("clientes").select("id,nome,status,slug,meta_account_id");
  if(clienteId)clienteQuery=clienteQuery.eq("id",clienteId);else if(clienteSlug)clienteQuery=clienteQuery.eq("slug",clienteSlug);else if(metaAccountId)clienteQuery=clienteQuery.eq("meta_account_id",metaAccountId.replace(/^act_/,""));else return NextResponse.json({error:"informe cliente_id, cliente_slug ou meta_account_id"},{status:400});
  const {data:cliente,error:clienteError}=await clienteQuery.maybeSingle(); if(clienteError||!cliente)return NextResponse.json({error:"cliente nao encontrado"},{status:404}); if(cliente.status==="cancelado")return NextResponse.json({error:"cliente fora da carteira ativa"},{status:403});
  const telefone=normalizePhone(body.telefone)||normalizePhone(body.phone)||normalizePhone(body.whatsapp)||normalizePhone(message.chatid)||normalizePhone(message.sender_pn)||normalizePhone(chat.wa_chatid);
  const whatsappLid=clean(body.whatsapp_lid)||clean(body.lid)||clean(chat.wa_chatlid)?.replace(/@lid$/,"")||null;
  const ctwaclid=clean(body.ctwaclid)||clean(externalAdReply.ctwaClid); const anuncioSourceId=clean(body.anuncio_source_id)||clean(body.source_id)||clean(body.ad_id)||clean(externalAdReply.sourceID);
  const nome=clean(body.nome)||clean(body.name)||clean(message.senderName)||clean(chat.wa_name)||clean(chat.wa_contactName)||clean(chat.name)||"Lead sem nome";
  const origem=clean(body.origem)||clean(body.source)||(ctwaclid?"WhatsApp Ads":"Nao informada"); const tipoCaptacao=clean(body.tipo_captacao)||(origem.toLowerCase().includes("whatsapp")?"whatsapp":origem.toLowerCase().includes("org")?"organico":"formulario");
  const payload={cliente_id:cliente.id,nome,telefone,etapa:clean(body.etapa)||"lead",origem,tipo_captacao:tipoCaptacao,campanha:clean(body.campanha)||clean(body.campaign_name),conjunto:clean(body.conjunto)||clean(body.adset_name),anuncio:clean(body.anuncio)||clean(body.ad_name),plataforma:clean(body.plataforma)||clean(body.platform)||clean(externalAdReply.sourceApp),ctwaclid,anuncio_source_id:anuncioSourceId,whatsapp_lid:whatsappLid,page_id:clean(body.page_id),email:clean(body.email),qualificado:booleanValue(body.qualificado??body.qualified_lead),valor_conversao:numberValue(body.valor_conversao??body.valor??body.value),moeda:clean(body.moeda)||clean(body.currency),data_conversao:clean(body.data_conversao)||clean(body.data_compra),atualizado_em:new Date().toISOString()};
  let existingId:string|null=null;
  if(telefone){const {data}=await supabaseAdmin.from("leads").select("id").eq("cliente_id",cliente.id).eq("telefone",telefone).order("criado_em",{ascending:false}).limit(1).maybeSingle();existingId=data?.id??null;}
  if(!existingId&&whatsappLid){const {data}=await supabaseAdmin.from("leads").select("id").eq("cliente_id",cliente.id).eq("whatsapp_lid",whatsappLid).order("criado_em",{ascending:false}).limit(1).maybeSingle();existingId=data?.id??null;}
  if(!existingId&&ctwaclid){const {data}=await supabaseAdmin.from("leads").select("id").eq("cliente_id",cliente.id).eq("ctwaclid",ctwaclid).order("criado_em",{ascending:false}).limit(1).maybeSingle();existingId=data?.id??null;}
  let lead:any; let action:string; let status=200;
  if(existingId){const result=await supabaseAdmin.from("leads").update(payload).eq("id",existingId).select("id,nome,cliente_id,etapa,tipo_captacao,anuncio_source_id,ctwaclid,page_id,pixel_id,dataset_id,campanha,conjunto,anuncio").single();if(result.error)return NextResponse.json({error:result.error.message},{status:500});lead=result.data;action="updated";}
  else {const result=await supabaseAdmin.from("leads").insert({...payload,criado_em:new Date().toISOString(),pausado_ia:false,follow_up_enviado:false}).select("id,nome,cliente_id,etapa,tipo_captacao,anuncio_source_id,ctwaclid,page_id,pixel_id,dataset_id,campanha,conjunto,anuncio").single();if(result.error)return NextResponse.json({error:result.error.message},{status:500});lead=result.data;action="created";status=201;}
  const meta_enrichment=await enrichMeta(lead);
  return NextResponse.json({ok:true,action,lead,meta_enrichment},{status});
}
