"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { blankPricing, calculatePricing, validatePricing, type PricingInput } from "../lib/pricing";
import { Icon } from "./icon";

type View = "dashboard" | "pricing" | "products" | "settings";
type Draft = { id: string; updatedAt: string; input: PricingInput };
const storageKey = "ygprint:pricing-drafts:v1";
const money = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const decimal = (n: number, digits = 2) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const categories = { "3d": "Impressão 3D", digital: "Impressão digital", outro: "Outros produtos" };
const nav = [
  { view: "dashboard", href: "/", label: "Visão geral", icon: "grid" },
  { view: "pricing", href: "/precificacao", label: "Precificação", icon: "calculator" },
  { view: "products", href: "/produtos", label: "Produtos e serviços", icon: "box" },
];
const future = [["file", "Orçamentos e pedidos"], ["people", "Clientes"], ["printer", "Produção e máquinas"], ["box", "Materiais e estoque"], ["chart", "Relatórios e custos"]];

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

function NumberField({ label, field, input, setInput, hint, min = 0, step = "any", max }: {
  label: string; field: keyof PricingInput; input: PricingInput;
  setInput: (input: PricingInput) => void; hint?: string; min?: number; step?: string; max?: number;
}) {
  return <label className="field">{label}<input type="number" name={field} min={min} max={max} step={step} required value={input[field]} onChange={event => setInput({ ...input, [field]: event.target.value === "" ? 0 : Number(event.target.value) })} />{hint && <small>{hint}</small>}</label>;
}

function Stat({ title, value, note, icon }: { title: string; value: string; note: string; icon: string }) {
  return <section className="stat-card"><div className="stat-top"><span>{title}</span><span className="icon-tile"><Icon name={icon} /></span></div><strong className="stat-value">{value}</strong><p>{note}</p></section>;
}

function DraftTable({ drafts, search = "" }: { drafts: Draft[]; search?: string }) {
  const filtered = drafts.filter(d => d.input.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  if (!filtered.length) return <div className="empty-state"><span className="empty-icon"><Icon name="box" size={30} /></span><h3>{search ? "Nenhum produto encontrado" : "Seu primeiro preço começa aqui"}</h3><p>{search ? "Experimente buscar por outro nome." : "Calcule os custos de um produto e salve um rascunho para comparar depois."}</p>{!search && <Link className="primary" href="/precificacao"><Icon name="plus" size={17} /> Precificar produto</Link>}</div>;
  return <div className="table-scroll"><table><thead><tr><th>Produto / serviço</th><th>Custo unit.</th><th>Venda sugerida</th><th>Margem estimada</th><th></th></tr></thead><tbody>{filtered.map(draft => {
    const result = calculatePricing(draft.input);
    return <tr key={draft.id}><td><div className="product-cell"><span className="icon-tile"><Icon name={draft.input.category === "3d" ? "box" : "printer"} /></span><div><strong>{draft.input.name}</strong><small>{categories[draft.input.category]} · lote de {draft.input.quantity}</small></div></div></td><td>{money(result.unitCost)}</td><td><strong>{money(result.unitPrice)}</strong></td><td><span className="badge green">{decimal(result.actualMargin)}%</span></td><td><Link className="text-link" aria-label={`Editar ${draft.input.name}`} href={`/precificacao?rascunho=${encodeURIComponent(draft.id)}`}>Editar <Icon name="arrow" size={15} /></Link></td></tr>;
  })}</tbody></table></div>;
}

export function ErpWorkspace({ view }: { view: View }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [input, setInput] = useState<PricingInput>({ ...blankPricing });
  const [draftId, setDraftId] = useState<string | null>(null);
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
      const id = new URLSearchParams(window.location.search).get("rascunho");
      const draft = data.find(item => item.id === id);
      if (view === "pricing" && draft) { setInput(draft.input); setDraftId(draft.id); }
      if (view === "pricing" && id && !draft) setNotice("Este rascunho não foi encontrado neste navegador.");
      setReady(true);
    };
    hydrate();
    const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) load(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [view]);

  let result: ReturnType<typeof calculatePricing> | null = null;
  let calculationError = "";
  try { result = calculatePricing(input); } catch (error) { calculationError = error instanceof Error ? error.message : "Confira os valores informados."; }

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

  const titles = { dashboard: "Visão geral", pricing: "Precificação", products: "Produtos e serviços", settings: "Configurações" };
  const field = (key: keyof PricingInput, label: string, hint?: string, min = 0, step = "any", max?: number) => <NumberField key={key} field={key} label={label} hint={hint} min={min} step={step} max={max} input={input} setInput={changeInput} />;
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
      <div className="sidebar-bottom"><Link className={view === "settings" ? "settings-link active" : "settings-link"} href="/configuracoes"><Icon name="settings" /> Configurações</Link><div className="local-status"><span className="status-dot" /> Prévia local <span>v0.2</span></div></div>
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
          <div className="page-heading"><div><div className="eyebrow">CUSTOS CLAROS. DECISÕES MELHORES.</div><h1>{draftId ? "Editar precificação" : "Nova precificação"}</h1><p>Descubra quanto custa produzir e quanto cobrar pelo seu trabalho.</p></div><Link className="secondary" href="/produtos">Meus rascunhos <Icon name="arrow" size={16} /></Link></div>
          <form className="pricing-layout" onSubmit={saveDraft}><div className="form-column">
            <section className="panel form-panel"><div className="section-title"><span>01</span><div><h2>O que vamos produzir?</h2><p>Informe o lote que você quer precificar.</p></div></div><div className="fields"><label className="field span-two">Nome do produto<input name="name" required maxLength={160} placeholder="Ex.: Letra G para letreiro" value={input.name} onChange={e => changeInput({ ...input, name: e.target.value })} /></label><label className="field">Tipo de produção<select value={input.category} onChange={e => changeInput({ ...input, category: e.target.value as PricingInput["category"] })}>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{field("quantity", "Quantidade de peças no lote", undefined, 1, "1")}</div><div className="inline-note">Consumo de material, tempos, acabamento e embalagem devem considerar <strong>o lote inteiro</strong>.</div></section>
            <section className="panel form-panel"><div className="section-title"><span>02</span><div><h2>Matéria-prima e consumíveis</h2><p>Use a mesma unidade na embalagem e no consumo.</p></div></div><div className="fields">{field("materialPrice", "Preço da embalagem (R$)", "Inclua frete de compra proporcional.")}{field("packSize", input.category === "3d" ? "Filamento na embalagem (g)" : "Conteúdo da embalagem (un., g ou m²)", undefined, 0.0001)}{field("materialUsed", input.category === "3d" ? "Filamento para o lote (g)" : "Consumo total do lote", input.category === "3d" ? "Inclua suportes, purga e brim." : "Mesma unidade da embalagem.")}{field("wastePercent", "Reserva adicional de material (%)", "Acrescenta material e tinta; não modela reimpressões.", 0, "any", 100)}</div></section>
            {input.category === "digital" && <section className="panel form-panel"><div className="section-title"><span>+</span><div><h2>Consumo estimado de tinta</h2><p>Área impressa × cobertura × consumo calibrado.</p></div></div><div className="fields">{field("widthCm", "Largura por peça (cm)")}{field("heightCm", "Altura por peça (cm)")}<label className="field">Faces impressas<select value={input.sides} onChange={e => changeInput({ ...input, sides: Number(e.target.value) })}><option value="1">Uma face</option><option value="2">Duas faces</option></select></label>{field("coveragePercent", "Cobertura média (%)", "Mesma cobertura média nas faces.", 0, "any", 100)}{field("inkMlM2", "Consumo a 100% (ml/m²)", "Calibre com sua impressora, mídia e qualidade.")}{field("inkPrice", "Preço do frasco de tinta (R$)")}{field("inkBottleMl", "Volume do frasco (ml)", "Use custo médio por ml para misturas de cores.", 0.0001)}</div><div className="inline-note">Estimativa: {decimal(result?.areaM2 || 0, 4)} m² e {decimal(result?.inkMl || 0, 3)} ml antes da reserva. Não inclui limpezas automáticas; inclua esse custo na manutenção. Não há análise automática da arte nesta etapa.</div></section>}
            <section className="panel form-panel"><div className="section-title"><span>03</span><div><h2>Máquina, tempo e energia</h2><p>O tempo de máquina também tem custo.</p></div></div><div className="fields">{field("machineMinutes", "Tempo de máquina do lote (min)", "Inclua preparação que ocupa a máquina.")}{field("machineValue", "Valor de aquisição da máquina (R$)")}{field("residualValue", "Valor residual estimado (R$)")}{field("usefulHours", "Vida útil produtiva (horas)", "5.000 h é um exemplo editável, não uma especificação.", 0.0001)}{field("maintenanceHour", "Reserva de manutenção (R$/h)")}{field("powerWatts", "Potência média em uso (W)")}{field("electricityKwh", "Energia efetiva (R$/kWh)", "Com energia solar, informe seu custo efetivo estimado.")}</div></section>
            <section className="panel form-panel"><div className="section-title"><span>04</span><div><h2>Trabalho e despesas</h2><p>Separe seu tempo de trabalho do tempo da máquina.</p></div></div><div className="fields">{field("laborMinutes", "Trabalho ativo no lote (min)")}{field("laborHour", "Valor da mão de obra (R$/h)")}{field("fixedMonthly", "Despesas fixas mensais (R$)", "Ex.: aluguel, internet e despesas administrativas.")}{field("productiveHours", "Horas produtivas mensais (h)", "Base de rateio para as horas de máquina do lote.", 0.0001)}{field("finishing", "Acabamento e terceiros do lote (R$)")}{field("packaging", "Embalagens do lote (R$)")}</div><div className="inline-note">Evite duplicidade: não inclua nos custos fixos a mão de obra, energia, depreciação ou manutenção já lançadas acima. A reserva de material não cobre falhas de impressão completas.</div></section>
            <section className="panel form-panel"><div className="section-title"><span>05</span><div><h2>Taxas e margem de venda</h2><p>Percentuais calculados sobre o valor de venda.</p></div></div><div className="fields three-fields">{field("taxesPercent", "Impostos (%)", undefined, 0, "any", 99.99)}{field("feesPercent", "Taxas e comissões (%)", undefined, 0, "any", 99.99)}{field("marginPercent", "Margem desejada (%)", undefined, 0, "any", 99.99)}</div><div className="formula">Preço = custo ÷ (1 − impostos − taxas − margem)</div></section>
          </div><aside className="pricing-summary"><section className="panel"><div className="summary-heading"><span className="icon-tile"><Icon name="calculator" /></span><h2>Seu preço, explicado</h2></div>{calculationError && <p className="calculation-error" role="alert">{calculationError}</p>}{result && <><div className="selling-price"><span>VENDA SUGERIDA POR PEÇA</span><strong>{money(result.unitPrice)}</strong><small>Lote de {input.quantity} peças · {money(result.saleTotal)}</small></div><div className="breakdown">{result.breakdown.filter(row => row.value > 0).map(row => <div key={row.label}><span>{row.label}</span><strong>{money(row.value)}</strong></div>)}{result.totalCost === 0 && <p>Preencha os custos para começar a simulação.</p>}<div className="subtotal"><span>Custo total do lote</span><strong>{money(result.totalCost)}</strong></div><div><span>Custo por peça</span><strong>{money(result.unitCost)}</strong></div><div><span>Impostos sobre a venda</span><strong>{money(result.taxes)}</strong></div><div><span>Taxas sobre a venda</span><strong>{money(result.fees)}</strong></div></div><div className="profit-row"><span>Lucro estimado do lote</span><strong>{money(result.profit)}</strong></div><div className="summary-metrics"><div><span>Margem estimada</span><strong>{decimal(result.actualMargin)}%</strong></div><div><span>Markup multiplicador</span><strong>{decimal(result.markup)}×</strong></div></div></>}<button className="primary full" disabled={!ready || storageError || !result || result.totalCost <= 0} type="submit"><Icon name="check" size={18} /> {draftId ? "Atualizar rascunho local" : "Salvar rascunho local"}</button><p className="helper">Disponível em Produtos e serviços após salvar. Este rascunho não é um cadastro no WordPress.</p></section><div className="summary-tip"><Icon name="clock" size={18} /><p>O preço acompanha suas alterações. Confira todos os custos antes de enviar uma proposta ao cliente.</p></div></aside></form>
        </>}
        {view === "products" && <><div className="page-heading"><div><div className="eyebrow">CATÁLOGO EM CONSTRUÇÃO</div><h1>Produtos e serviços</h1><p>Rascunhos de precificação salvos neste navegador.</p></div><Link className="primary" href="/precificacao"><Icon name="plus" size={18} /> Nova precificação</Link></div><section className="panel"><div className="panel-heading"><label className="search-field"><Icon name="search" size={18} /><input type="search" aria-label="Buscar produto pelo nome" placeholder="Buscar produto pelo nome…" value={search} onChange={e => setSearch(e.target.value)} /></label><button className="secondary" disabled={!ready || !drafts.length || storageError} onClick={exportDrafts}><Icon name="download" size={17} /> Exportar rascunhos</button></div>{ready ? <DraftTable drafts={drafts} search={search} /> : <p className="loading">Carregando rascunhos…</p>}<div className="panel-footer">{drafts.length} rascunhos · Não sincronizados com outros dispositivos</div></section><p className="helper left">Apagar os dados do navegador remove os rascunhos. A exportação gera uma cópia JSON; a importação será adicionada na etapa de integração.</p></>}
        {view === "settings" && <><div className="page-heading"><div><div className="eyebrow">BASE DO NOVO SISTEMA</div><h1>Configurações</h1><p>A organização definida para a YGPrint.</p></div><span className="badge amber-badge">Integração pendente</span></div><div className="settings-grid"><section className="panel form-panel"><h2>Endereços planejados</h2><dl className="settings-list"><div><dt>Painel de gestão · Next.js</dt><dd>erp.ygprint.com.br</dd></div><div><dt>Dados e API · WordPress</dt><dd>api.ygprint.com.br</dd></div><div><dt>Banco de dados</dt><dd>MySQL da hospedagem Hostinger</dd></div></dl><p className="helper left">Esta prévia ainda não se comunica com esses endereços.</p></section><section className="panel form-panel"><h2>Próximas etapas</h2><ol className="roadmap"><li>Confirmar a instalação do WordPress no novo subdomínio e a hospedagem do Next.js.</li><li>Criar a API do ERP com autenticação e permissões de acesso.</li><li>Salvar produtos, materiais e máquinas no banco de dados.</li><li>Conectar orçamentos, pedidos, estoque e produção.</li></ol></section></div></>}
        <footer className="page-footer"><span>YGPrint <span>·</span> Gestão que acompanha sua produção.</span><span>Primeira etapa do novo ERP</span></footer>
      </main>
    </div>
  </div>;
}
