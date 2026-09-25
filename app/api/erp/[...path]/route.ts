import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const cookieName = "ygprint_erp_session";
const headers = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie" };
const routes: Record<string, RegExp[]> = {
  GET: [/^me$/, /^company$/, /^orders$/, /^orders\/\d+$/, /^orders\/\d+\/payments$/, /^receipts\/\d+$/, /^reports$/],
  POST: [/^orders\/\d+\/approve$/, /^login$/, /^logout$/, /^orders$/, /^orders\/\d+\/payments$/, /^payments\/\d+\/void$/],
  PUT: [/^company$/, /^orders\/\d+$/],
};
async function handler(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });
  if (!routes[req.method]?.some(r => r.test(path))) return json({ message: "Rota não permitida." }, 404);
  // Both JSON and exact origin are required for mutations, including login (login-CSRF).
  if (req.method !== "GET" && (req.headers.get("origin") !== (process.env.YGPRINT_APP_ORIGIN || req.nextUrl.origin) || !req.headers.get("content-type")?.startsWith("application/json"))) {
    return json({ message: "Origem da solicitação inválida." }, 403);
  }
  const configured = process.env.YGPRINT_WP_API_URL;
  if (!configured) return json({ message: "Conexão pendente: configure YGPRINT_WP_API_URL na hospedagem e instale o plugin YGPrint ERP API." }, 503);
  const token = req.cookies.get(cookieName)?.value;
  if (path !== "login" && !token) return json({ message: "Entre para acessar as ordens." }, 401);
  let rawBody: string | undefined;
  if (req.method !== "GET") {
    if (Number(req.headers.get("content-length")) > 2_000_000) return json({ message: "Dados muito grandes." }, 413);
    rawBody = await req.text();
    if (Buffer.byteLength(rawBody) > 2_000_000) return json({ message: "Dados muito grandes." }, 413);
    try { JSON.parse(rawBody); } catch { return json({ message: "JSON inválido." }, 400); }
  }
  try {
    const base = new URL(configured.endsWith("/") ? configured : `${configured}/`);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) return json({ message: "Configure uma URL HTTPS válida para a API WordPress." }, 503);
    const url = new URL(path, base);
    for (const key of ["page", "from", "to", "status", "q", "scope"]) { const value = req.nextUrl.searchParams.get(key); if (value) url.searchParams.set(key, value); }
    const upstream = await fetch(url, {
      method: req.method, body: rawBody, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000),
      headers: { "Content-Type": "application/json", "Accept": "application/json", ...(token && path !== "login" ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      const response = json({ message: typeof data.message === "string" ? data.message : "Não foi possível concluir no WordPress." }, upstream.status);
      if (upstream.status === 401) response.cookies.delete(cookieName);
      return response;
    }
    if (path === "login") {
      if (typeof data.token !== "string" || !/^[a-f0-9]{64}$/.test(data.token)) throw new Error("Invalid session");
      const response = json({ name: data.name });
      response.cookies.set(cookieName, data.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 3600 });
      return response;
    }
    const response = json(data);
    if (path === "logout") response.cookies.delete(cookieName);
    return response;
  } catch { return json({ message: "Não foi possível comunicar com o WordPress. Verifique a conexão e a instalação do plugin. Nenhum salvamento foi confirmado." }, 502); }
}
export { handler as GET, handler as POST, handler as PUT };
