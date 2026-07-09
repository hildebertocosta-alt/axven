import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { AUTH_COOKIE_NAME, createSessionToken } from "@/app/lib/authSession";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const expected = process.env.AUTH_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "AUTH_PASSWORD não configurado no servidor" }, { status: 500 });
  }

  const providedBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);
  const valid =
    providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);

  if (!valid) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
