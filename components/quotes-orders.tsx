"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";

type Order = { id: string; number: string; date: string; deliveryDate: string; validUntil?: string; clientName: string; status: string; total: number; deposit: number; balance: number; approvedAt?: string };
type Page = { items: Order[]; total: number; page: number; pages: number };
const quoteStatuses = ["Orçamento", "Aguardando Aprovação", "Recusado"];
const orderStatuses = ["Em Produção", "Pronto para Retirada", "Entregue", "Cancelado"];
const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (s?: string) => s ? s.split("-").reverse().join("/") : "—";
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
async function api(path: string, method = "GET", body?: unknown, signal?: AbortSignal) {
  const response = await fetch(`/api/erp/${path}`, { method, signal, cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({ message: "Resposta inesperada. Confira a publicação da aplicação." }));
  if (!response.ok) throw Object.assign(new Error(data.message || "Não foi possível consultar o WordPress."), { status: response.status });
  return data;
}
function csv(value: unknown) { let s = String(value ?? ""); if (/^\s*[=+\-@]|^[\t\r\n]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; }
export function QuotesOrders() {
  const [scope, setScope] = useState("quotes");
  const [filters, setFilters] = useState({ q: "", status: "", from: "", to: "" });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editor, setEditor] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const query = new URLSearchParams({ ...filters, scope }).toString();

  useEffect(() => {
    const controller = new AbortController();
    api('me', 'GET', undefined, controller.signal).then(session => {
      if (!session.features?.includes('quotes-orders-v1')) throw new Error('Atualize o plugin YGPrint ERP API para a versão 0.2.0 no WordPress.');
      return api(`orders?${query}&page=${page}`, "GET", undefined, controller.signal);
    })
      .then((result: Page) => { setData(result); setLogin(false); setMessage(""); })
      .catch((error: Error & { status?: number }) => { if (!controller.signal.aborted) { setData(null); setLogin(error.status === 401); setMessage(error.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, reload]);
  useEffect(() => {
    function onSaved(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== "ygprint:order-saved") return;
      setReload(n => n + 1);
    }
    window.addEventListener("message", onSaved);
    return () => window.removeEventListener("message", onSaved);
  }, []);
  function refresh() { setLoading(true); setReload(n => n + 1); }
  function tab(next: string) { setScope(next); setPage(1); setFilters({ ...filters, status: "" }); setDraftFilters({ ...filters, status: "" }); setLoading(true); }
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setMessage("");
    const form = event.currentTarget, values = new FormData(form);
    try { await api("login", "POST", { username: values.get("username"), password: values.get("password") }); refresh(); }
    catch (e) { setMessage((e as Error).message); }
    finally { (form.elements.namedItem("password") as HTMLInputElement).value = ""; setBusy(false); }
  }
  async function exportCsv() {
    if (busy) return; setBusy(true); setMessage("");
    try {
      const rows: unknown[][] = [["Número", "Cliente", "Emissão", "Validade", "Entrega", "Status", "Total", "Recebido", "Saldo"]];
      let current = 1, result: Page;
      do { result = await api(`orders?${query}&page=${current}`); for (const o of result.items) rows.push([o.number, o.clientName, date(o.date), date(o.validUntil), date(o.deliveryDate), o.status, money(o.total), money(o.deposit), money(o.balance)]); current++; } while (current <= result.pages);
      const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(r => r.map(csv).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = scope === "quotes" ? "ygprint-orcamentos.csv" : "ygprint-pedidos.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  if (editor) return <section>
    <div className="page-heading"><div><h1>{scope === "quotes" ? "Orçamento" : "Pedido e ordem de serviço"}</h1><p>Salve para gravar no WordPress. Use Imprimir / PDF para gerar o documento.</p></div><button className="secondary" onClick={() => { if (confirm("Confira se salvou as alterações antes de voltar. Voltar à lista?")) { setEditor(null); refresh(); } }}>← Voltar à lista</button></div>
    <iframe ref={frame} title="Editar orçamento ou pedido" src={editor} className="orders-editor" />
  </section>;
  return <section>
    <div className="page-heading"><div><div className="eyebrow">DO ORÇAMENTO À ENTREGA</div><h1>Orçamentos e pedidos</h1><p>Aprove uma proposta e acompanhe o mesmo registro na produção.</p></div>{!login && <button className="primary" onClick={() => { setScope("quotes"); setEditor("/ordens-servico/index.html?mode=quote"); }}><Icon name="plus" size={18} /> Novo orçamento</button>}</div>
    {message && <div className="notice" role="status">{message}</div>}
    {login ? <form onSubmit={signIn} className="panel form-panel orders-login"><h2>Entre para acessar os orçamentos</h2><p className="section-help">Use sua conta administradora do WordPress da gráfica.</p><div className="fields"><label className="field">Usuário ou e-mail<input name="username" autoComplete="username" required /></label><label className="field">Senha<input name="password" type="password" autoComplete="current-password" required /></label></div><div className="settings-actions"><button className="primary" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button></div></form> : <>
      <div className="settings-tabs" aria-label="Tipo de registro"><button className={scope === "quotes" ? "selected" : ""} aria-pressed={scope === "quotes"} onClick={() => tab("quotes")}>Orçamentos</button><button className={scope === "orders" ? "selected" : ""} aria-pressed={scope === "orders"} onClick={() => tab("orders")}>Pedidos</button></div>
      <section className="panel">
        <form className="orders-filters" onSubmit={e => { e.preventDefault(); if (draftFilters.from && draftFilters.to && draftFilters.from > draftFilters.to) { setMessage("A data inicial deve ser anterior à final."); return; } setFilters(draftFilters); setPage(1); refresh(); }}>
          <label className="field">Cliente ou número<input value={draftFilters.q} onChange={e => setDraftFilters({ ...draftFilters, q: e.target.value })} placeholder="Buscar…" /></label>
          <label className="field">Status<select value={draftFilters.status} onChange={e => setDraftFilters({ ...draftFilters, status: e.target.value })}><option value="">Todos</option>{(scope === "quotes" ? quoteStatuses : orderStatuses).map(s => <option key={s}>{s}</option>)}</select></label>
          <label className="field">Emissão de<input type="date" value={draftFilters.from} onChange={e => setDraftFilters({ ...draftFilters, from: e.target.value })} /></label>
          <label className="field">Até<input type="date" value={draftFilters.to} onChange={e => setDraftFilters({ ...draftFilters, to: e.target.value })} /></label>
          <button className="primary" disabled={loading}>Filtrar</button><button className="secondary" type="button" disabled={busy || loading || !data} onClick={exportCsv}>Exportar CSV</button>
        </form>
        {loading ? <p className="loading">Consultando o WordPress…</p> : !data ? <div className="empty-state"><p>Não foi possível carregar os registros.</p><button className="secondary" onClick={refresh}>Tentar novamente</button></div> : !data.items.length ? <div className="empty-state"><h3>Nenhum {scope === "quotes" ? "orçamento" : "pedido"} encontrado</h3><p>{scope === "quotes" ? "Crie um orçamento ou ajuste os filtros." : "Os orçamentos aprovados e as ordens de serviço aparecem aqui."}</p></div> : <div className="table-scroll"><table><thead><tr><th>Número / emissão</th><th>Cliente</th><th>{scope === "quotes" ? "Validade" : "Entrega prevista"}</th><th>Status</th><th>Total</th>{scope === "orders" && <th>Recebido / saldo</th>}<th>Ações</th></tr></thead><tbody>{data.items.map(o => <tr key={o.id}><td><strong>#{o.number}</strong><small className="orders-meta">{date(o.date)}</small></td><td className="orders-client">{o.clientName}</td><td>{date(scope === "quotes" ? o.validUntil : o.deliveryDate)}{scope === "quotes" && o.status !== "Recusado" && o.validUntil && o.validUntil < today() && <small className="orders-expired">Vencido · revise a validade</small>}</td><td><span className={`badge ${o.status === "Entregue" ? "green" : "blue"}`}>{o.status}</span>{o.approvedAt && <small className="orders-meta">Originado de orçamento</small>}</td><td><strong>{money(o.total)}</strong></td>{scope === "orders" && <td>{money(o.deposit)}<small className="orders-meta">Saldo: {money(o.balance)}</small></td>}<td><button className="secondary" onClick={() => setEditor(`/ordens-servico/index.html?id=${encodeURIComponent(o.id)}${scope === "quotes" ? "&mode=quote" : ""}`)}>{scope === "quotes" ? "Abrir / aprovar" : "Abrir pedido"}</button></td></tr>)}</tbody></table></div>}
        <div className="panel-footer orders-pager"><span>{data?.total ?? 0} registros · Salvos no WordPress</span><div><button className="secondary" disabled={loading || page <= 1} onClick={() => { setPage(page - 1); setLoading(true); }}>Anterior</button><span>Página {page} de {Math.max(1, data?.pages ?? 1)}</span><button className="secondary" disabled={loading || !data || page >= data.pages} onClick={() => { setPage(page + 1); setLoading(true); }}>Próxima</button></div></div>
      </section>
      <p className="helper left">Orçamentos não representam vendas confirmadas. A aprovação inicia a produção com o mesmo número. Pagamentos e recibos ficam no pedido; relatórios financeiros estão em Ordens de serviço → Relatórios.</p>
    </>}
  </section>;
}
