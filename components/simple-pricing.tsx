"use client";
import Link from "next/link";
import { blankPricing, calculatePricing, type PricingInput } from "../lib/pricing";
import { applyMachine, applyMaterial, changeQuantity } from "../lib/presets";
import { NumericField } from "./numeric-field";
import { usePresets } from "./use-presets";
import { Icon } from "./icon";
const money = (n: number) => Number.isFinite(n) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
export function SimplePricing({ input, onChange, onSave, canSave, existing }: {
  input: PricingInput; onChange: (next: PricingInput) => void; onSave: (e: React.FormEvent) => void; canSave: boolean; existing: boolean;
}) {
  const { presets, loaded, error } = usePresets();
  let result: ReturnType<typeof calculatePricing> | null = null;
  let calculationError = "";
  try { result = calculatePricing(input); } catch(e) { calculationError = e instanceof Error ? e.message : "Confira os valores."; }
  const materials = presets.materials.filter(m => m.category === input.category);
  const machines = presets.machines.filter(m => m.category === input.category);
  const savedMaterial = existing && !input.materialId;
  const savedMachine = existing && !input.machineId;
  const field = (key: keyof PricingInput, label: string, hint?: string, min = 0, max = 1e9) => <NumericField label={label} value={input[key] as number} min={min} max={max} hint={hint} onChange={n => onChange({ ...input, [key]: n ?? 0 })} />;
  const warnings: string[] = [];
  if (!existing && !presets.shopConfigured) warnings.push("Configure as despesas da loja para incluir o rateio.");
  if (input.materialPrice === 0) warnings.push("O custo do material está zerado.");
  if (input.category === "digital" && (result?.breakdown.find(row => row.label === "Tinta estimada")?.value ?? 0) === 0) warnings.push("A tinta está sem custo calculado. Configure o perfil na impressora antes de usar este preço para vender.");
  if (input.machineMinutes === 0) warnings.push("O tempo de máquina está zerado; desgaste, energia e rateio não entram no total.");
  function refreshCosts() {
    let next = { ...input, ...presets.shop };
    const material = materials.find(m => m.id === input.materialId);
    const machine = machines.find(m => m.id === input.machineId);
    if (material) next = { ...applyMaterial(next, material), materialUsed: input.materialUsed, widthCm: input.widthCm, heightCm: input.heightCm };
    if (machine) next = applyMachine(next, machine, input.inkProfile ?? "photo");
    onChange(next);
  }
  return <form className="pricing-layout simple-pricing" onSubmit={onSave}>
    <section className="panel form-panel service-panel">
      <div className="section-title"><span><Icon name="printer" size={19} /></span><div><h2>Dados do produto</h2><p>Escolha os cadastros e informe o que muda neste serviço.</p></div></div>
      {error && <p role="alert" className="calculation-error">{error}</p>}
      {loaded && !error && (!presets.materials.length || !presets.machines.length || !presets.shopConfigured) && <div className="setup-hint"><Icon name="settings" size={19} /><div><strong>Primeiro uso? Cadastre os custos uma vez.</strong><p>Depois, os valores serão preenchidos ao selecionar os cadastros.</p><Link href="/configuracoes">Configurar loja, materiais e impressoras →</Link>{existing && <small>Em Configurações, você pode reaproveitar os valores deste rascunho.</small>}</div></div>}
      <div className="fields">
        <label className="field span-two">Nome do produto<input required maxLength={160} value={input.name} placeholder="Ex.: Impressão fotográfica A4" onChange={e => onChange({ ...input, name: e.target.value })} /></label>
        <label className="field">Tipo de serviço<select value={input.category} onChange={e => onChange({ ...blankPricing, ...presets.shop, name: input.name, category: e.target.value as PricingInput["category"] })}><option value="digital">Impressão em papel</option><option value="3d">Impressão 3D</option><option value="outro">Outro produto</option></select></label>
        <NumericField label={input.category === "digital" ? "Quantidade de impressos" : "Quantidade de peças"} integer min={1} value={input.quantity} onChange={n => onChange(changeQuantity(input, n ?? 1))} />
        <label className="field">{input.category === "3d" ? "Filamento" : "Material"}<select required={!savedMaterial} value={input.materialId ?? ""} onChange={e => { const m = materials.find(m => m.id === e.target.value); if (m) onChange(applyMaterial(input, m)); }}><option value="" disabled>{savedMaterial ? "Material guardado no rascunho" : "Selecione o material"}</option>{input.materialId && !materials.some(m => m.id === input.materialId) && <option value={input.materialId}>{input.materialName} · custo guardado</option>}{materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><small>{input.materialPrice > 0 ? `${money(input.materialPrice / input.packSize)} por unidade de consumo` : <Link href="/configuracoes#materiais">Cadastrar material →</Link>}</small></label>
        <label className="field">Impressora<select required={!savedMachine} value={input.machineId ?? ""} onChange={e => { const m = machines.find(m => m.id === e.target.value); if (m) onChange(applyMachine(input, m, input.inkProfile ?? "photo")); }}><option value="" disabled>{savedMachine ? "Máquina guardada no rascunho" : "Selecione a impressora"}</option>{input.machineId && !machines.some(m => m.id === input.machineId) && <option value={input.machineId}>{input.machineName} · custo guardado</option>}{machines.map(m => <option value={m.id} key={m.id}>{m.name}</option>)}</select><small><Link href="/configuracoes#impressoras">Cadastrar ou editar impressora →</Link></small></label>
        {input.category === "digital" ? <><label className="field">Tipo de impressão<select value={input.inkProfile ?? "legacy"} onChange={e => { const m = machines.find(m => m.id === input.machineId); if (m) onChange(applyMachine(input, m, e.target.value as "text" | "color" | "photo")); }} disabled={!machines.some(m => m.id === input.machineId)}>{!input.inkProfile && <option value="legacy">{existing ? "Estimativa guardada no rascunho" : "Selecione a impressora primeiro"}</option>}<option value="text">Texto</option><option value="color">Colorida</option><option value="photo">Foto / arte cheia</option></select></label><label className="field">Lados impressos<select value={input.sides} onChange={e => onChange({ ...input, sides: Number(e.target.value) })}><option value="1">Somente frente</option><option value="2">Frente e verso</option></select></label></> : field("materialUsed", input.category === "3d" ? "Filamento total do lote (g)" : "Material total do lote", input.category === "3d" ? "Copie do fatiador; inclua suportes e purga." : "Use a mesma unidade do cadastro.")}
        {field("machineMinutes", "Tempo de impressão do lote (min)", "Tempo total para produzir todas as unidades, incluindo preparação da máquina.")}
        {field("laborMinutes", "Seu tempo de trabalho no lote (min)", "Somente trabalho ativo: preparar arquivo, cortar, embalar. Usado se houver mão de obra adicional configurada.")}
      </div>
      <div className="inherited-strip"><Icon name="check" size={16} /><div><strong>Custos preenchidos pelos cadastros</strong><span>Loja: {money(input.fixedMonthly / input.productiveHours)}/h · Margem: {num(input.marginPercent)}%</span>{existing && <small>Este rascunho mantém os valores da última gravação.</small>}</div>{presets.shopConfigured && <button type="button" className="text-link" onClick={refreshCosts}>Aplicar custos atuais</button>}</div>
      <details className="fold"><summary>Ajustes deste produto <span>Margem, acabamento e consumo</span></summary><div className="fields">
        {field("marginPercent", "Margem de lucro (%)", undefined, 0, 99.99)}{field("finishing", "Acabamento e terceiros do lote (R$)")}{field("packaging", "Embalagens do lote (R$)")}{field("wastePercent", "Material extra para perdas (%)", "Somente reserva de material e tinta.", 0, 100)}
        {input.category === "digital" && <>{field("materialUsed", "Folhas consumidas pelo lote", "Padrão: uma folha por impresso. Ajuste se houver aproveitamento ou várias folhas por produto.")}{field("widthCm", "Largura impressa por unidade (cm)")}{field("heightCm", "Altura impressa por unidade (cm)")}</>}
      </div><p className="helper left">Ao mudar a quantidade, o consumo de papel acompanha a proporção atual. Confira os tempos totais do novo lote.</p></details>
    </section>
    <aside className="pricing-summary"><section className="panel"><div className="summary-heading"><span className="icon-tile"><Icon name="calculator" /></span><h2>Resultado</h2></div>
      {calculationError && <p className="calculation-error" role="alert">{calculationError}</p>}
      {result && <><div className="selling-price"><span>{warnings.length ? "PREÇO PARCIAL POR UNIDADE" : "VENDA SUGERIDA POR UNIDADE"}</span><strong>{money(result.unitPrice)}</strong><small>Total do lote: {money(result.saleTotal)}</small></div>
        <div className="breakdown"><div><span>Custo por unidade</span><strong>{money(result.unitCost)}</strong></div><div><span>Lucro estimado por unidade</span><strong>{money(result.profit / input.quantity)}</strong></div><div><span>Margem estimada</span><strong>{num(result.actualMargin)}%</strong></div></div>
        {warnings.length > 0 && <div className="incomplete-costs"><strong>Falta conferir</strong><ul>{warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
        <button className="primary full" type="submit" disabled={!canSave || !loaded || !!error || result.totalCost <= 0}><Icon name="check" size={17} />{existing ? "Salvar alterações" : "Salvar precificação"}</button><p className="helper">Rascunho salvo neste navegador.</p>
        <details className="fold"><summary>Ver composição do custo</summary><div className="breakdown">{result.breakdown.map(row => <div key={row.label}><span>{row.label}</span><strong>{money(row.value)}</strong></div>)}<div className="subtotal"><span>Custo total do lote</span><strong>{money(result.totalCost)}</strong></div><div><span>Impostos do lote</span><strong>{money(result.taxes)}</strong></div><div><span>Taxas do lote</span><strong>{money(result.fees)}</strong></div><div><span>Markup multiplicador</span><strong>{num(result.markup)}×</strong></div></div><p className="helper left">Rateio da loja: {money(input.fixedMonthly)} ÷ {num(input.productiveHours)} h × ({num(input.machineMinutes)} min ÷ 60) = <strong>{money(result.breakdown.find(r => r.label === "Rateio de custos fixos")?.value ?? 0)}</strong>.</p>{input.category === "digital" && <p className="helper left">Tinta estimada pela área e pelo perfil informado. A4 equivale a 21 × 29,7 cm. Não há leitura automática da arte.</p>}</details>
      </>}
    </section></aside>
  </form>;
}
