import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

function clean(v: unknown) { return typeof v === "string" && v.trim() ? v.trim() : null; }
function phone(v: unknown) { const x=clean(v); return x ? x.split("@")[0].replace(/\D/g,"") || null : null; }
function hash(v: string) { return crypto.createHash("sha256").update(v).digest("hex"); }

export async function POST(req: NextRequest) {
  const authError=validateWebhookSecret(req); if(authError)return authError;
  const body=await req.json().catch(()=>null); if(!body||typeof body!=="object")return NextResponse.json({error:"corpo invalido"},{status:400});
  const clienteId=clean(body.cliente_id), clienteSlug=clean(body.cliente_slug), leadId=clean(body.lead_id), telefone=phone(body.telefone);
  const eventName=body.event_name === "LeadSubmitted" ? "LeadSubmitted" : body.event_name === "Purchase" ? "Purchase" : null;
  if(!eventName)return NextResponse.json({error:"event_name deve ser LeadSubmitted ou Purchase"},{status:400});
  if(!clienteId&&!clienteSlug)return NextResponse.json({error:"informe cliente_id ou cliente_slug"},{status:400});
  if(!leadId&&!telefone)return NextResponse.json({error:"informe lead_id ou telefone"},{status:400});

  let cq=supabaseAdmin.from("clientes").select("id,nome,status,pixel_id"); cq=clienteId?cq.eq("id",clienteId):cq.eq("slug",clienteSlug!);
  const {data:cliente}=await cq.maybeSingle(); if(!cliente)return NextResponse.json({error:"cliente nao encontrado"},{status:404}); if(cliente.status==="cancelado")return NextResponse.json({error:"cliente fora da carteira ativa"},{status:403});
  const fields="id,nome,telefone,email,criado_em,valor_conversao,moeda,data_conversao,ctwaclid,page_id,pixel_id,dataset_id";
  let lead:any=null;
  if(leadId){const {data}=await supabaseAdmin.from("leads").select(fields).eq("cliente_id",cliente.id).eq("id",leadId).maybeSingle();lead=data;}
  if(!lead&&telefone){const {data}=await supabaseAdmin.from("leads").select(fields).eq("cliente_id",cliente.id).eq("telefone",telefone).order("criado_em",{ascending:false}).limit(1).maybeSingle();lead=data;}
  if(!lead)return NextResponse.json({error:"lead nao encontrado"},{status:404});
  if(!lead.telefone||!lead.ctwaclid||!lead.page_id)return NextResponse.json({error:"lead nao esta pronto para CAPI",missing:[!lead.telefone?"telefone":null,!lead.ctwaclid?"ctwaclid":null,!lead.page_id?"page_id":null].filter(Boolean)},{status:409});
  if(eventName==="Purchase"&&(lead.valor_conversao==null||!lead.data_conversao))return NextResponse.json({error:"Purchase sem conversao registrada"},{status:409});
  const dataset=lead.dataset_id||lead.pixel_id||cliente.pixel_id; if(!dataset)return NextResponse.json({error:"pixel/dataset nao identificado"},{status:409});

  const eventTime=Math.floor(new Date(eventName==="Purchase"?lead.data_conversao:lead.criado_em).getTime()/1000);
  const prefix=eventName==="Purchase"?"purchase":"leadsubmitted"; const eventId=`${prefix}_${lead.id}_${eventTime}`;
  const {data:already}=await supabaseAdmin.from("capi_eventos").select("id,status,enviado_em").eq("event_id",eventId).eq("status","enviado").maybeSingle();
  if(already)return NextResponse.json({ok:true,action:"deduplicated",sent_to_meta:false,event_id:eventId,audit:already});

  const userData:any={ph:[hash(lead.telefone)],ctwa_clid:lead.ctwaclid,page_id:lead.page_id}; if(lead.email)userData.em=[hash(String(lead.email).trim().toLowerCase())];
  const event:any={event_name:eventName,event_time:eventTime,event_id:eventId,action_source:"business_messaging",messaging_channel:"whatsapp",user_data:userData};
  if(eventName==="Purchase")event.custom_data={currency:lead.moeda||"BRL",value:Number(lead.valor_conversao)};

  // Hard safety gate: real Meta sending is impossible unless explicitly enabled in server environment.
  if(process.env.META_CAPI_SEND_ENABLED!=="true") {
    return NextResponse.json({ok:true,action:"blocked_by_safety_gate",mode:"send_disabled",sent_to_meta:false,event_id:eventId,dataset_id:dataset,event});
  }
  const token=process.env.META_ACCESS_TOKEN; if(!token)return NextResponse.json({error:"META_ACCESS_TOKEN nao configurado"},{status:500});
  const version=process.env.META_GRAPH_VERSION||"v23.0"; const metaBody:any={data:[event]}; const testCode=clean(process.env.META_CAPI_TEST_EVENT_CODE); if(testCode)metaBody.test_event_code=testCode;
  const response=await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(dataset)}/events?access_token=${encodeURIComponent(token)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(metaBody),cache:"no-store"});
  const result=await response.json().catch(()=>null); const status=response.ok?"enviado":"erro"; const now=new Date().toISOString();
  const {data:audit,error:auditError}=await supabaseAdmin.from("capi_eventos").upsert({cliente_id:cliente.id,lead_id:lead.id,event_name:eventName,event_id:eventId,status,payload:{request:metaBody,response:result,http_status:response.status},erro:response.ok?null:(result?.error?.message||"falha Meta CAPI"),enviado_em:response.ok?now:null},{onConflict:"event_id,status"}).select("id,event_id,status,criado_em,enviado_em").single();
  if(auditError)return NextResponse.json({error:"falha ao registrar auditoria CAPI",meta_http_status:response.status},{status:500});
  return NextResponse.json({ok:response.ok,action:response.ok?"sent":"meta_error",mode:testCode?"meta_test_event":"meta_live",sent_to_meta:true,event_id:eventId,meta_http_status:response.status,meta_response:result,audit},{status:response.ok?200:502});
}
