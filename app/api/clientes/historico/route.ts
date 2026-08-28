import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

type Evento={id:string;tipo:string;titulo:string;detalhe:string;data:string};
export async function GET(request:NextRequest){
 const clienteId=request.nextUrl.searchParams.get("cliente_id");
 if(!clienteId)return NextResponse.json({error:"Cliente não informado"},{status:400});
 const [{data:cliente},{data:leads},{data:tarefas},{data:financeiro},{data:documentos}] = await Promise.all([
  supabaseAdmin.from("clientes").select("id,nome").eq("id",clienteId).maybeSingle(),
  supabaseAdmin.from("leads").select("id,nome,etapa,origem,criado_em,atualizado_em").eq("cliente_id",clienteId).order("criado_em",{ascending:false}).limit(40),
  supabaseAdmin.from("tarefas").select("id,titulo,concluido,criado_em").eq("cliente_id",clienteId).order("criado_em",{ascending:false}).limit(30),
  supabaseAdmin.from("financeiro").select("id,valor,status,mes_referencia,criado_em").eq("cliente_id",clienteId).order("criado_em",{ascending:false}).limit(20),
  supabaseAdmin.from("documentos").select("id,nome,categoria,criado_em").eq("cliente_id",clienteId).order("criado_em",{ascending:false}).limit(20)
 ]);
 if(!cliente)return NextResponse.json({error:"Cliente não encontrado"},{status:404});
 const eventos:Evento[]=[];
 for(const x of leads??[])if(x.criado_em)eventos.push({id:`lead-${x.id}`,tipo:"Lead",titulo:`Novo lead: ${x.nome}`,detalhe:[x.etapa,x.origem].filter(Boolean).join(" · ")||"Lead registrado",data:x.criado_em});
 for(const x of tarefas??[])if(x.criado_em)eventos.push({id:`tarefa-${x.id}`,tipo:"Tarefa",titulo:x.titulo||"Tarefa criada",detalhe:x.concluido?"Concluída":"Registrada",data:x.criado_em});
 for(const x of financeiro??[])if(x.criado_em)eventos.push({id:`fin-${x.id}`,tipo:"Financeiro",titulo:`Financeiro ${x.mes_referencia||""}`.trim(),detalhe:`R$ ${Number(x.valor||0).toLocaleString("pt-BR",{minimumFractionDigits:2})} · ${x.status||"sem status"}`,data:x.criado_em});
 for(const x of documentos??[])if(x.criado_em)eventos.push({id:`doc-${x.id}`,tipo:"Documento",titulo:x.nome,detalhe:x.categoria||"Documento adicionado",data:x.criado_em});
 eventos.sort((a,b)=>new Date(b.data).getTime()-new Date(a.data).getTime());
 return NextResponse.json({cliente_id:clienteId,total:eventos.length,eventos:eventos.slice(0,100)});
}
