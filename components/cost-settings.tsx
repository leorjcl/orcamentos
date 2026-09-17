"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { blankPricing, calculatePricing, type PricingInput } from "../lib/pricing";
import { emptyPresets, readPresets, writePresets, type Machine, type Material, type Shop } from "../lib/presets";
import { NumericField } from "./numeric-field";
import { usePresets } from "./use-presets";
import { Icon } from "./icon";
const money = (v: number) => Number.isFinite(v) ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
const materialTemplate: Material = { id: "", name: "", category: "digital", unit: "folha", price: 0, packSize: 100, widthCm: 21, heightCm: 29.7 };
const machineTemplate: Machine = { id: "", name: "", category: "digital", value: 0, residual: 0, usefulHours: 5000, maintenanceHour: 0, powerWatts: 0, ink: { text: null, color: null, photo: null } };
type Tab = "loja" | "materiais" | "impressoras";
export function CostSettings({ drafts, onNotice }: { drafts: { id: string; input: PricingInput }[]; onNotice: (text: string) => void }) {
  const { presets, loaded, error } = usePresets();
  const [tab, setTab] = useState<Tab>("loja");
  const [shop, setShop] = useState<Shop>(emptyPresets.shop);
  const [material, setMaterial] = useState<Material>(materialTemplate);
  const [machine, setMachine] = useState<Machine>(machineTemplate);
  useEffect(() => {
    const hydrate = () => {
      const hash = window.location.hash.slice(1);
      if (["loja", "materiais", "impressoras"].includes(hash)) setTab(hash as Tab);
      try { setShop(readPresets().shop); } catch { /* usePresets displays the read error. */ }
    };
    hydrate();
  }, []);
  function switchTab(next: Tab) { setTab(next); window.history.replaceState(null, "", `#${next}`); }
  function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      const latest = readPresets();
      if (tab === "loja") { writePresets({ ...latest, shop, shopConfigured: true }); }
      if (tab === "materiais") {
        const item = { ...material, id: material.id || crypto.randomUUID(), name: material.name.trim() };
        writePresets({ ...latest, materials: [...latest.materials.filter(m => m.id !== item.id), item] }); setMaterial(item);
      }
      if (tab === "impressoras") {
        const item = { ...machine, id: machine.id || crypto.randomUUID(), name: machine.name.trim() };
        writePresets({ ...latest, machines: [...latest.machines.filter(m => m.id !== item.id), item] }); setMachine(item);
      }
      onNotice("Configuração salva neste navegador. Ela estará disponível nas novas precificações.");
    } catch (e) { onNotice(e instanceof Error ? e.message : "Não foi possível salvar a configuração."); }
  }
  function copyDraft(id: string) {
    const p = drafts.find(d => d.id === id)?.input;
    if (!p) return;
    if (tab === "loja") {
      const next = { ...emptyPresets.shop };
      for (const key of Object.keys(next) as (keyof Shop)[]) next[key] = p[key];
      setShop(next);
    } else if (tab === "materiais") setMaterial({ id: "", name: p.materialName || p.name, category: p.category, unit: p.category === "digital" ? "folha" : p.category === "3d" ? "g" : "un", price: p.materialPrice, packSize: p.packSize, widthCm: p.widthCm, heightCm: p.heightCm });
    else setMachine({ ...machineTemplate, name: p.machineName || "", category: p.category, value: p.machineValue, residual: p.residualValue, usefulHours: p.usefulHours, maintenanceHour: p.maintenanceHour, powerWatts: p.powerWatts,
      ink: { text: null, color: null, photo: p.inkCostPerA4 ?? null } });
    onNotice("Dados copiados para o formulário. Revise e salve. O rascunho original permanece com os mesmos valores.");
  }
  const shopField = (key: keyof Shop, label: string, hint?: string, min = 0, max = 1e9) => <NumericField label={label} value={shop[key]} min={min} max={max} hint={hint} onChange={n => setShop({ ...shop, [key]: n ?? 0 })} />;
  const machineField = (key: "value" | "residual" | "usefulHours" | "maintenanceHour" | "powerWatts", label: string, hint?: string, min = 0) => <NumericField label={label} value={machine[key]} hint={hint} min={min} onChange={n => setMachine({ ...machine, [key]: n ?? 0 })} />;
  let shopError = "";
  try { calculatePricing({ ...blankPricing, ...shop }); } catch (e) { shopError = e instanceof Error ? e.message : "Confira os valores da loja."; }
  return <>
    <div className="page-heading"><div><div className="eyebrow">CADASTRE UMA VEZ. USE EM CADA PRODUTO.</div><h1>Custos e cadastros</h1><p>Atualize aqui os valores que se repetem nas suas precificações.</p></div><Link href="/precificacao" className="primary">Precificar produto <Icon name="arrow" size={16} /></Link></div>
    <div className="settings-tabs" aria-label="Seções de configuração">{(["loja", "materiais", "impressoras"] as Tab[]).map((t, i) => <button type="button" key={t} className={tab === t ? "selected" : ""} aria-pressed={tab === t} onClick={() => switchTab(t)}><span>{i + 1}</span>{t === "loja" ? "Minha loja" : t === "materiais" ? "Materiais" : "Impressoras"}</button>)}</div>
    {error && <p className="calculation-error" role="alert">{error}</p>}
    {loaded && !error && <div className="preset-layout"><form key={`${tab}-${material.id}-${machine.id}`} onSubmit={save} className="panel form-panel">
      {drafts.length > 0 && <details className="fold reuse-draft"><summary>Reaproveitar valores de um rascunho</summary><label className="field">Escolha o rascunho<select defaultValue="" onChange={e => { copyDraft(e.target.value); e.target.value = ""; }}><option value="">Selecione para preencher este cadastro</option>{drafts.map(d => <option value={d.id} key={d.id}>{d.input.name}</option>)}</select><small>Os valores são copiados para revisão; nada é salvo automaticamente. Tinta no formato antigo deve ser calibrada antes de preencher os novos perfis.</small></label></details>}
      {tab === "loja" && <><h2>Quanto custa manter sua loja?</h2><p className="section-help">Estas configurações serão usadas em todos os novos produtos.</p><div className="fields">
        {shopField("fixedMonthly", "Despesas fixas por mês (R$)", "Some as despesas que ainda não estão nos materiais ou nas impressoras.")}
        {shopField("productiveHours", "Horas de produção por mês", "Horas efetivas usadas no rateio. 160 é apenas um exemplo editável.", 0.01)}
        {shopField("marginPercent", "Margem de lucro padrão (%)", "Percentual sobre o preço de venda.", 0, 99.99)}
      </div><div className="inherited-strip">Parcela da loja: <strong>{money(shop.fixedMonthly / shop.productiveHours)} por hora de máquina</strong></div>
      <details className="fold"><summary>Energia, mão de obra e taxas</summary><div className="fields">
        {shopField("laborHour", "Mão de obra adicional (R$/h)", "Se sua retirada já está nas despesas fixas, deixe zero para não somar novamente.")}
        {shopField("electricityKwh", "Energia efetiva (R$/kWh)", "Com solar, use o custo efetivo. Se a conta inteira já está nos fixos, evite duplicá-la aqui.")}
        {shopField("taxesPercent", "Impostos sobre venda (%)", undefined, 0, 99.99)}{shopField("feesPercent", "Taxas e comissões (%)", undefined, 0, 99.99)}
      </div></details><p className="helper left">O custo fixo é distribuído pelo tempo de máquina. A base mensal precisa representar todas as horas de produção que participarão desse rateio.</p></>}
      {tab === "materiais" && <><h2>{material.id ? "Editar material" : "Cadastrar material"}</h2><p className="section-help">Ex.: papel fotográfico A4 180 g, pacote com 100 folhas.</p><div className="fields">
        <label className="field span-two">Nome do material<input required maxLength={160} value={material.name} placeholder="Papel fotográfico A4 180 g" onChange={e => setMaterial({ ...material, name: e.target.value })} /></label>
        <label className="field">Tipo<select value={material.category} onChange={e => { const category = e.target.value as Material["category"]; setMaterial({ ...material, category, unit: category === "3d" ? "g" : category === "digital" ? "folha" : "un", packSize: category === "3d" ? 1000 : 100 }); }}><option value="digital">Papel / impressão digital</option><option value="3d">Filamento / impressão 3D</option><option value="outro">Outro material</option></select></label>
        <NumericField label="Preço do pacote ou rolo (R$)" value={material.price} onChange={n => setMaterial({ ...material, price: n ?? 0 })} />
        <NumericField label={material.unit === "folha" ? "Folhas no pacote" : material.unit === "g" ? "Gramas no rolo" : "Quantidade na embalagem"} value={material.packSize} min={0.0001} onChange={n => setMaterial({ ...material, packSize: n ?? 0 })} />
        {material.category === "outro" && <label className="field">Unidade<select value={material.unit} onChange={e => setMaterial({ ...material, unit: e.target.value as Material["unit"] })}><option value="un">Unidade</option><option value="g">Grama</option><option value="m2">Metro quadrado</option></select></label>}
        {material.category === "digital" && <><label className="field">Formato<select value={material.widthCm === 21 && material.heightCm === 29.7 ? "A4" : material.widthCm === 29.7 && material.heightCm === 42 ? "A3" : "custom"} onChange={e => { if (e.target.value === "A4") setMaterial({ ...material, widthCm: 21, heightCm: 29.7 }); if (e.target.value === "A3") setMaterial({ ...material, widthCm: 29.7, heightCm: 42 }); if (e.target.value === "custom") setMaterial({ ...material, widthCm: 10, heightCm: 15 }); }}><option>A4</option><option>A3</option><option value="custom">Personalizado</option></select></label><NumericField label="Largura da folha (cm)" value={material.widthCm} min={0.01} onChange={n => setMaterial({ ...material, widthCm: n ?? 0 })} /><NumericField label="Altura da folha (cm)" value={material.heightCm} min={0.01} onChange={n => setMaterial({ ...material, heightCm: n ?? 0 })} /></>}
      </div><div className="inherited-strip">Custo por {material.unit}: <strong>{money(material.price / material.packSize)}</strong></div></>}
      {tab === "impressoras" && <><h2>{machine.id ? "Editar impressora" : "Cadastrar impressora"}</h2><p className="section-help">Configure os custos do equipamento uma vez.</p><div className="fields"><label className="field span-two">Nome da impressora<input required maxLength={160} value={machine.name} placeholder="Ex.: Epson L4360 ou Bambu Lab A1 Mini" onChange={e => setMachine({ ...machine, name: e.target.value })} /></label><label className="field">Tipo<select value={machine.category} onChange={e => setMachine({ ...machine, category: e.target.value as Machine["category"] })}><option value="digital">Impressão digital</option><option value="3d">Impressão 3D</option><option value="outro">Outro equipamento</option></select></label>{machineField("value", "Preço de compra (R$)")}</div>
      {machine.category === "digital" && <details className="fold" open><summary>Tinta por tipo de impressão</summary><p className="section-help">Custo estimado somente de tinta para uma face A4. Preencha com uma medição da sua impressora; deixe vazio enquanto não souber.</p><div className="fields">
        {([['text', 'Texto'], ['color', 'Colorida'], ['photo', 'Foto / arte cheia']] as const).map(([key, name]) => <NumericField key={key} optional label={`${name} (R$/A4)`} value={machine.ink[key]} onChange={n => setMachine({ ...machine, ink: { ...machine.ink, [key]: n } })} />)}
      </div><details className="fold"><summary>Como obter esse custo?</summary><p className="section-help">Em um teste com várias páginas do mesmo perfil: custo da tinta consumida ÷ número de faces A4 impressas. Para medir o custo consumido, use ml gastos × preço do frasco ÷ ml do frasco. Registre cada perfil separadamente. O rendimento anunciado para documentos não determina o consumo de fotografias.</p></details></details>}
      <details className="fold"><summary>Desgaste, manutenção e energia</summary><div className="fields">{machineField("usefulHours", "Vida útil estimada (horas)", "5.000 h é um exemplo para revisar, não um dado do fabricante.", 0.01)}{machineField("residual", "Valor estimado de revenda (R$)")}{machineField("maintenanceHour", "Reserva de manutenção (R$/h)")}{machineField("powerWatts", "Potência média em uso (W)")}</div></details></>}
      {tab === "loja" && shopError && <p className="calculation-error" role="alert">{shopError}</p>}<div className="settings-actions"><button type="submit" className="primary" disabled={tab === "loja" && !!shopError}><Icon name="check" size={17} /> Salvar {tab === "loja" ? "configurações da loja" : tab === "materiais" ? "material" : "impressora"}</button>{tab !== "loja" && <button type="button" className="secondary" onClick={() => tab === "materiais" ? setMaterial({ ...materialTemplate }) : setMachine({ ...machineTemplate, ink: { text: null, color: null, photo: null } })}>Novo cadastro</button>}</div>
      <p className="helper left">Salvar aqui não altera os preços dos rascunhos existentes. Eles guardam os custos usados no cálculo.</p>
    </form><aside className="preset-sidebar panel form-panel"><h2>{tab === "loja" ? "Configure uma vez" : "Seus cadastros"}</h2>
      {tab === "loja" ? <><p className="section-help">Depois, selecione o material e a impressora na tela do produto. O sistema preenche os custos.</p><div className="inherited-strip">Loja: {presets.shopConfigured ? "configurada" : "a configurar"}<br />Materiais: {presets.materials.length}<br />Impressoras: {presets.machines.length}</div></> : <div className="preset-list">{(tab === "materiais" ? presets.materials : presets.machines).map(item => <button type="button" key={item.id} onClick={() => { if (tab === "materiais") setMaterial(structuredClone(item as Material)); else setMachine(structuredClone(item as Machine)); }}><Icon name={tab === "materiais" ? "box" : "printer"} size={18} /><span>{item.name}</span><small>Editar</small></button>)}{!(tab === "materiais" ? presets.materials : presets.machines).length && <p className="section-help">Seu primeiro cadastro aparecerá aqui.</p>}</div>}
      <p className="helper left">Dados locais deste navegador. A integração com WordPress continua pendente.</p>
    </aside></div>}
  </>;
}
