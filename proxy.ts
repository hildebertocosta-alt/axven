import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/app/lib/authSession";

const PUBLIC_API_PREFIXES = ["/api/auth/"];

function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  // /crm/* tem seu próprio sistema de autenticação (portal do cliente), tratado abaixo.
  if (pathname.startsWith("/crm")) return true;
  // /relatorios/[id] é o link público de relatório compartilhado com o cliente.
  if (/^\/relatorios\/[^/]+$/.test(pathname)) return true;
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Autenticação do hub interno — protege tudo por padrão, exceto as exceções públicas acima.
  if (!isPublicPath(pathname)) {
    const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!verifySessionToken(sessionCookie)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Autenticação do portal do cliente (/crm/[slug]) — inalterada.
  if (pathname.startsWith("/crm/") && pathname !== "/crm/login") {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet, headers) => {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
          },
        },
      }
    );

    const slug = pathname.split("/")[2];
    if (!slug) {
      return response;
    }

    const deny = () => NextResponse.redirect(new URL("/crm/login?erro=acesso_negado", request.url));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/crm/login", request.url));
    }

    const { data: vinculo } = await supabase
      .from("crm_usuarios")
      .select("cliente_id")
      .eq("user_id", user.id)
      .single();

    if (!vinculo) {
      return deny();
    }

    const { data: cliente } = await supabase.from("clientes").select("id").eq("slug", slug).single();

    if (!cliente || cliente.id !== vinculo.cliente_id) {
      return deny();
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
