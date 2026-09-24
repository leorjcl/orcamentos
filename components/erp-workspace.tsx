"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { blankPricing, calculatePricing, validatePricing, type PricingInput } from "../lib/pricing";
import { Icon } from "./icon";
import { SimplePricing } from "./simple-pricing";
import { CostSettings } from "./cost-settings";
import { readPresets } from "../lib/presets";

type View = "dashboard" | "pricing" | "products" | "settings" | "receipts";
type Draft = { id: string; updatedAt: string; input: PricingInput };
const storageKey = "ygprint:pricing-drafts:v1";
const money = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const decimal = (n: number, digits = 2) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const categories = { "3d": "Impressão 3D", digital: "Impressão digital", outro: "Outros produtos" };
const nav = [
  { view: "dashboard", href: "/", label: "Visão geral", icon: "grid" },
  { view: "pricing", href: "/precificacao", label: "Precificação", icon: "calculator" },
  { view: "products", href: "/produtos", label: "Produtos e serviços", icon: "box" },
  { view: "receipts", href: "/recibos", label: "Recibos", icon: "file" },
];
const future = [["file", "Orçamentos e pedidos"], ["people", "Clientes"], ["printer", "Produção"], ["box", "Controle de estoque"], ["chart", "Relatórios e custos"]];

function readDrafts(): Draft[] {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 200) throw new Error("Arquivo de rascunhos inválido.");
  const ids = new Set<string>();
  for (const draft of data) {
    if (!draft || typeof draft.id !== "string" || typeof draft.updatedAt !== "string" || !Number.isFinite(Date.parse(draft.updatedAt)) || ids.has(draft.id)) throw new Error("Rascunho inválido.");
    ids.add(draft.id);
    validatePricing(draft.input);
    calculatePricing(draft.input);
  }
  return data;
}

function Stat({ title, value, note, icon }: { title: string; value: string; note: string; icon: string }) {
  return <section className="stat-card"><div className="stat-top"><span>{title}</span><span className="icon-tile"><Icon name={icon} /></span></div><strong className="stat-value">{value}</strong><p>{note}</p></section>;
}

function DraftTable({ drafts, search = "" }: { drafts: Draft[]; search?: string }) {
  const filtered = drafts.filter(d => d.input.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  if (!filtered.length) return <div className="empty-state"><span className="empty-icon"><Icon name="box" size={30} /></span><h3>{search ? "Nenhum produto encontrado" : "Seu primeiro preço começa aqui"}</h3><p>{search ? "Experimente buscar por outro nome." : "Calcule os custos de um produto e salve um rascunho para comparar depois."}</p>{!search && <Link className="primary" href="/precificacao"><Icon name="plus" size={17} /> Precificar produto</Link>}</div>;
  return <div className="table-scroll"><table><thead><tr><th>Produto / serviço</th><th>Custo unit.</th><th>Venda sugerida</th><th>Margem estimada</th><th></th></tr></thead><tbody>{filtered.map(draft => {
    const result = calculatePricing(draft.input);
    return <tr key={draft.id}><td><div className="product-cell"><span className="icon-tile"><Icon name={draft.input.category === "3d" ? "box" : "printer"} /></span><div><strong>{draft.input.name}</strong><small>{categories[draft.input.category]} · lote de {draft.input.quantity}</small></div></div></td><td>{money(result.unitCost)}</td><td><strong>{money(result.unitPrice)}</strong></td><td><span className="badge green">{decimal(result.actualMargin)}%</span></td><td><Link className="text-link" aria-label={`Editar ${draft.input.name}`} href={`/precificacao?rascunho=${encodeURIComponent(draft.id)}`}>Editar <Icon name="arrow" size={15} /></Link><Link className="text-link duplicate-link" aria-label={`Duplicar ${draft.input.name}`} href={`/precificacao?modelo=${encodeURIComponent(draft.id)}`}>Duplicar</Link></td></tr>;
  })}</tbody></table></div>;
}

export function ErpWorkspace({ view }: { view: View }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [input, setInput] = useState<PricingInput>({ ...blankPricing });
  const [draftId, setDraftId] = useState<string | null>(null);
  const [fromTemplate, setFromTemplate] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    function load() {
      try {
        const data = readDrafts(); setDrafts(data); setStorageError(false); return data;
      } catch {
        setStorageError(true);
        setNotice("Não foi possível ler os rascunhos deste navegador. Os dados existentes não foram substituídos.");
        return [];
      }
    }
    // Browser storage is hydrated only after SSR; hydration never writes to storage.
    const hydrate = () => {
      const data = load();
      const query = new URLSearchParams(window.location.search);
      const templateId = query.get("modelo");
      const id = query.get("rascunho") || templateId;
      const draft = data.find(item => item.id === id);
      if (draft && templateId) setFromTemplate(true);
      if (view === "pricing" && draft) { setInput({ ...draft.input, name: templateId ? `${draft.input.name.slice(0, 150)} (cópia)` : draft.input.name }); setDraftId(templateId ? null : draft.id); }
      if (view === "pricing" && !draft) {
        try { const presets = readPresets(); setInput({ ...blankPricing, ...presets.shop, category: "digital" }); }
        catch { setNotice("Não foi possível carregar as configurações. Revise em Configurações."); }
      }
      if (view === "pricing" && id && !draft) setNotice("Este rascunho não foi encontrado neste navegador.");
      setReady(true);
    };
    hydrate();
    const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) load(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [view]);

  let result: ReturnType<typeof calculatePricing> | null = null;
  try { result = calculatePricing(input); } catch { /* SimplePricing displays validation errors. */ }

  function changeInput(next: PricingInput) { setInput(next); setNotice(""); }

  function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    if (!result || !ready || storageError) return;
    if (!input.name.trim()) { setNotice("Informe o nome do produto para salvar."); return; }
    if (result.totalCost <= 0) { setNotice("Informe os custos do produto antes de salvar."); return; }
    try {
      const current = readDrafts();
      const id = draftId || crypto.randomUUID();
      const draft: Draft = { id, updatedAt: new Date().toISOString(), input: { ...input, name: input.name.trim() } };
      const next = [draft, ...current.filter(item => item.id !== id)];
      if (next.length > 200) { setNotice("Limite de 200 rascunhos locais atingido. Exporte uma cópia antes de continuar."); return; }
      localStorage.setItem(storageKey, JSON.stringify(next));
      setDrafts(next); setDraftId(id);
      setNotice("Rascunho salvo neste navegador. Você já pode encontrá-lo em Produtos e serviços.");
    } catch { setNotice("Não foi possível salvar. Verifique se o navegador permite armazenamento local ou se há espaço disponível."); }
  }

  function exportDrafts() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), drafts }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "ygprint-rascunhos.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const titles = { dashboard: "Visão geral", pricing: "Precificação", products: "Produtos e serviços", settings: "Configurações", receipts: "Recibos" };
  const meanCost = drafts.length ? drafts.reduce((sum, draft) => sum + calculatePricing(draft.input).unitCost, 0) / drafts.length : 0;
  const meanPrice = drafts.length ? drafts.reduce((sum, draft) => sum + calculatePricing(draft.input).unitPrice, 0) / drafts.length : 0;

  return <div className="erp-shell">
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    {menuOpen && <button className="nav-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
      <Link className="brand" href="/"><span className="brand-mark">YG<span /></span><span><strong>YGPrint</strong><small>GESTÃO & PRODUÇÃO</small></span></Link>
      <div className="nav-label">SEU NEGÓCIO</div>
      <nav aria-label="Navegação principal">{nav.map(item => <Link key={item.view} className={view === item.view ? "active" : ""} aria-current={view === item.view ? "page" : undefined} href={item.href} onClick={() => setMenuOpen(false)}><Icon name={item.icon} />{item.label}{item.view === "pricing" && <span className="nav-dot" />}</Link>)}
        <div className="nav-label next-label">PRÓXIMAS ETAPAS</div>
        {future.map(([icon, label]) => <span className="nav-pending" key={label}><Icon name={icon} /><span>{label}</span><small>Em breve</small></span>)}
      </nav>
      <div className="sidebar-bottom"><Link className={view === "settings" ? "settings-link active" : "settings-link"} href="/configuracoes"><Icon name="settings" /> Custos e cadastros</Link><div className="local-status"><span className="status-dot" /> Prévia local <span>v0.3</span></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button><span>Workspace</span><span className="slash">/</span><strong>{titles[view]}</strong></div><div className="topbar-right"><span className="badge blue"><span className="status-dot" /> Ambiente de desenvolvimento</span><div className="profile"><span className="avatar">YG</span><span><strong>YGPrint</strong><small>Painel de gestão</small></span></div></div></header>
      <main id="main-content" className="main-content">
        <div className="local-banner"><Icon name="file" size={17} /><span><strong>Prévia do novo ERP.</strong> Rascunhos ficam apenas neste navegador. A conexão com o WordPress ainda não está ativa.</span></div>
        {notice && <div className="notice" role="status"><div>{notice}{notice.startsWith("Rascunho salvo") && <Link href="/produtos"> Ver produtos →</Link>}</div><button type="button" aria-label="Fechar mensagem" onClick={() => setNotice("")}>×</button></div>}
        {view === "dashboard" && <>
          <div className="page-heading"><div><div className="eyebrow">CONTROLE QUE FAZ A DIFERENÇA</div><h1>Seu negócio, em perspectiva<span className="blue-period">.</span></h1><p>Da matéria-prima ao preço final, cada detalhe conta.</p></div><Link className="primary" href="/precificacao"><Icon name="plus" size={18} /> Nova precificação</Link></div>
          <div className="stats-grid"><Stat title="Produtos precificados" value={ready ? String(drafts.length) : "…"} note="Rascunhos neste navegador" icon="box" /><Stat title="Custo médio unitário" value={ready && drafts.length ? money(meanCost) : "—"} note="Média das suas simulações" icon="calculator" /><Stat title="Venda média sugerida" value={ready && drafts.length ? money(meanPrice) : "—"} note="Média das suas simulações" icon="chart" /><Stat title="Pedidos em produção" value="—" note="Aguardando conexão com o ERP" icon="printer" /></div>
          <div className="dashboard-grid"><div className="main-column"><section className="pricing-invite"><div className="invite-copy"><span className="badge light">PRECIFICAÇÃO INTELIGENTE</span><h2>Preço bom é preço<br />que paga cada detalhe.</h2><p>Some materiais, tempo de produção e despesas.<br />Veja sua margem antes de vender.</p><Link href="/precificacao">Calcular meu primeiro preço <Icon name="arrow" size={18} /></Link></div><div className="price-illustration" aria-hidden="true"><div className="illustration-icon"><Icon name="calculator" size={31} /></div><span>Seu preço de venda</span><strong>Custo + lucro</strong><div className="illustration-line"><i /><i /><i /></div><small>Clareza em cada cálculo</small></div></section>
          <section className="panel"><div className="panel-heading"><div><h2><Icon name="box" /> Precificações recentes</h2><p>Seus produtos e as últimas simulações de custo.</p></div><Link className="text-link" href="/produtos">Ver todos <Icon name="arrow" size={15} /></Link></div>{ready ? <DraftTable drafts={drafts.slice(0, 5)} /> : <p className="loading">Carregando rascunhos…</p>}<div className="panel-footer"><span>{drafts.length} rascunhos locais</span><span>Atualização imediata após salvar</span></div></section></div>
          <aside className="right-column"><section className="panel checklist"><h2>Vamos organizar a casa</h2><p>Uma etapa de cada vez.</p><div className="checklist-item done"><span><Icon name="check" size={16} /></span><div><strong>Identidade do painel</strong><small>Nova base visual da YGPrint</small></div></div><Link href="/precificacao" className={`checklist-item ${drafts.length ? "done" : ""}`}><span>{drafts.length ? <Icon name="check" size={16} /> : "2"}</span><div><strong>Precificar um produto</strong><small>Simule e salve seu primeiro preço</small></div><Icon name="arrow" size={16} /></Link><div className="checklist-item pending"><span>3</span><div><strong>Conectar o WordPress</strong><small>Próxima etapa do projeto</small></div></div></section><section className="panel tip-card"><span className="icon-tile"><Icon name="calculator" /></span><h2>Margem não é markup</h2><p>Um produto que custa R$ 70 e é vendido por R$ 100 tem <strong>30% de margem</strong> antes de impostos e taxas, e <strong>markup de 1,43×</strong>.</p><Link className="text-link" href="/precificacao">Explorar o cálculo <Icon name="arrow" size={15} /></Link></section><div className="connection-card"><span className="status-dot amber" /><div><strong>Integração pendente</strong><p>api.ygprint.com.br</p><Link href="/configuracoes">Ver organização do sistema →</Link></div></div></aside></div>
        </>}
        {view === "pricing" && <>
          <div className="page-heading"><div><div className="eyebrow">CUSTOS CLAROS. DECISÕES MELHORES.</div><h1>{draftId ? "Editar precificação" : "Nova precificação"}</h1><p>Escolha o material e a impressora. Os custos já vêm preenchidos.</p></div><Link className="secondary" href="/produtos">Meus rascunhos <Icon name="arrow" size={16} /></Link></div>
          <SimplePricing input={input} onChange={changeInput} onSave={saveDraft} canSave={ready && !storageError} existing={!!draftId || fromTemplate} />
        </>}
        {view === "products" && <><div className="page-heading"><div><div className="eyebrow">CATÁLOGO EM CONSTRUÇÃO</div><h1>Produtos e serviços</h1><p>Rascunhos de precificação salvos neste navegador.</p></div><Link className="primary" href="/precificacao"><Icon name="plus" size={18} /> Nova precificação</Link></div><section className="panel"><div className="panel-heading"><label className="search-field"><Icon name="search" size={18} /><input type="search" aria-label="Buscar produto pelo nome" placeholder="Buscar produto pelo nome…" value={search} onChange={e => setSearch(e.target.value)} /></label><button className="secondary" disabled={!ready || !drafts.length || storageError} onClick={exportDrafts}><Icon name="download" size={17} /> Exportar rascunhos</button></div>{ready ? <DraftTable drafts={drafts} search={search} /> : <p className="loading">Carregando rascunhos…</p>}<div className="panel-footer">{drafts.length} rascunhos · Não sincronizados com outros dispositivos</div></section><p className="helper left">Apagar os dados do navegador remove os rascunhos. A exportação gera uma cópia JSON; a importação será adicionada na etapa de integração.</p></>}
        {view === "receipts" && <section aria-label="Gerador de recibos">
          <div className="page-heading"><div><h1>Recibos</h1><p>Preencha, confira e imprima no modelo YGPrint.</p></div><a className="secondary" href="/recibos/index.html" target="_blank" rel="noopener noreferrer">Abrir em tela cheia</a></div>
          <iframe title="Gerador de recibos YGPrint" src="/recibos/index.html" style={{ width: "100%", height: "max(850px, calc(100dvh - 210px))", border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }} />
        </section>}
        {view === "settings" && <CostSettings drafts={drafts} onNotice={setNotice} />}
        <footer className="page-footer"><span>YGPrint <span>·</span> Gestão que acompanha sua produção.</span><span>Primeira etapa do novo ERP</span></footer>
      </main>
    </div>
  </div>;
}
