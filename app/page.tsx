"use client";

import { useMemo, useState } from "react";

type Item = { id: number; description: string; details: string; quantity: number; unitPrice: number };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const initialItems: Item[] = [
  { id: 1, description: "Cartão de visita", details: "Papel fotográfico 230 g · 4x0 · 9 × 5 cm", quantity: 100, unitPrice: 0.45 },
  { id: 2, description: "Plastificação A4", details: "Polaseal 0,05 mm · acabamento brilho", quantity: 2, unitPrice: 7.5 },
];

export default function Home() {
  const [items, setItems] = useState(initialItems);
  const [discount, setDiscount] = useState(5);
  const [saved, setSaved] = useState(false);
  const [issueDate, setIssueDate] = useState("2026-08-24");
  const [validUntil, setValidUntil] = useState("2026-09-01");
  const [payment, setPayment] = useState("Pix");
  const [productionTime, setProductionTime] = useState("3 dias úteis após aprovação");
  const [notes, setNotes] = useState("A produção será iniciada após a aprovação da arte e a confirmação do pagamento.");
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);
  const total = Math.max(0, subtotal - discount);
  const formatDate = (date: string) => date.split("-").reverse().join("/");

  function updateItem(id: number, field: keyof Item, value: string | number) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
    setSaved(false);
  }

  function addItem() {
    setItems((current) => [...current, { id: Date.now(), description: "Novo serviço", details: "Informe material, tamanho e acabamento", quantity: 1, unitPrice: 0 }]);
  }

  return (
    <>
    <main className="app-shell screen-only">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">YG</span><div><strong>YGPrint</strong><small>Orçamentos</small></div></div>
        <nav aria-label="Navegação principal">
          <button><span>▦</span> Visão geral</button>
          <button><span>♙</span> Clientes</button>
          <button className="active"><span>▤</span> Orçamentos</button>
          <button><span>▣</span> Produtos e serviços</button>
        </nav>
        <div className="sidebar-footer"><span className="avatar">LR</span><div><strong>Leonardo</strong><small>Administrador</small></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">ORÇAMENTOS / NOVO</p><h1>Novo orçamento</h1><p>Preencha os dados e gere uma proposta profissional para o cliente.</p></div>
          <div className="top-actions"><button className="secondary" onClick={() => window.print()}>Visualizar PDF</button><button className="primary" onClick={() => setSaved(true)}>Salvar orçamento</button></div>
        </header>
        {saved && <div className="success" role="status">Orçamento YG-ORC-2026-0001 salvo com sucesso.</div>}

        <div className="content-grid">
          <div className="form-column">
            <section className="card">
              <div className="section-heading"><span>1</span><div><h2>Cliente</h2><p>Selecione um cliente cadastrado.</p></div></div>
              <div className="field-grid">
                <label className="wide">Cliente<select defaultValue="mariana"><option value="mariana">Mariana Souza · (81) 99942-1840</option><option>Consumidor não identificado</option></select></label>
                <label>Emissão<input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} /></label>
                <label>Validade<input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label>
              </div>
            </section>

            <section className="card">
              <div className="section-heading"><span>2</span><div><h2>Itens do orçamento</h2><p>Adicione produtos, materiais e acabamentos.</p></div></div>
              <div className="items">
                {items.map((item, index) => (
                  <div className="item" key={item.id}>
                    <div className="item-number">{String(index + 1).padStart(2, "0")}</div>
                    <div className="item-main">
                      <input aria-label={`Descrição do item ${index + 1}`} value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} />
                      <input className="details" aria-label={`Detalhes do item ${index + 1}`} value={item.details} onChange={(e) => updateItem(item.id, "details", e.target.value)} />
                    </div>
                    <label>Qtd.<input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))} /></label>
                    <label>Valor unit.<input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))} /></label>
                    <strong>{money.format(item.quantity * item.unitPrice)}</strong>
                    <button className="remove" aria-label={`Remover ${item.description}`} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>×</button>
                  </div>
                ))}
              </div>
              <button className="add-item" onClick={addItem}>+ Adicionar produto ou serviço</button>
            </section>

            <section className="card">
              <div className="section-heading"><span>3</span><div><h2>Condições</h2><p>Defina pagamento, prazo e observações.</p></div></div>
              <div className="field-grid">
                <label>Forma de pagamento<select value={payment} onChange={(event) => setPayment(event.target.value)}><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></label>
                <label>Prazo de produção<input value={productionTime} onChange={(event) => setProductionTime(event.target.value)} /></label>
                <label className="wide">Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
              </div>
            </section>
          </div>

          <aside className="summary-card">
            <div className="quote-badge">YG-ORC-2026-0001</div><h2>Resumo</h2>
            <div className="summary-row"><span>Subtotal</span><strong>{money.format(subtotal)}</strong></div>
            <label className="discount">Desconto (R$)<input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></label>
            <div className="summary-total"><span>Total</span><strong>{money.format(total)}</strong></div>
            <div className="client-preview"><small>CLIENTE</small><strong>Mariana Souza</strong><span>(81) 99942-1840</span></div>
            <button className="primary full" onClick={() => window.print()}>Gerar PDF</button>
            <p className="helper">O PDF usará a identidade visual da YGPrint e ficará pronto para compartilhar.</p>
          </aside>
        </div>
      </section>
    </main>

    <article className="print-document" aria-label="Orçamento para impressão">
      <header className="pdf-header">
        <div className="pdf-brand"><div className="pdf-logo">YG</div><div><strong>YGPrint</strong><span>Impressões de qualidade</span></div></div>
        <div className="pdf-title"><span>ORÇAMENTO</span><strong>YG-ORC-2026-0001</strong></div>
      </header>

      <section className="pdf-meta">
        <div><small>CLIENTE</small><strong>Mariana Souza</strong><span>Telefone: (81) 99942-1840</span></div>
        <div><small>EMISSÃO</small><strong>{formatDate(issueDate)}</strong></div>
        <div><small>VALIDADE</small><strong>{formatDate(validUntil)}</strong></div>
      </section>

      <section className="pdf-section">
        <h2>Produtos e serviços</h2>
        <table>
          <thead><tr><th>Descrição</th><th className="center">Qtd.</th><th className="right">Valor unit.</th><th className="right">Total</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.description}</strong><span>{item.details}</span></td>
                <td className="center">{item.quantity}</td>
                <td className="right">{money.format(item.unitPrice)}</td>
                <td className="right"><strong>{money.format(item.quantity * item.unitPrice)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="pdf-bottom">
        <div className="pdf-conditions">
          <h2>Condições comerciais</h2>
          <p><strong>Forma de pagamento:</strong> {payment}</p>
          <p><strong>Prazo de produção:</strong> {productionTime}</p>
          <p><strong>Observações:</strong> {notes}</p>
        </div>
        <div className="pdf-totals">
          <div><span>Subtotal</span><strong>{money.format(subtotal)}</strong></div>
          <div><span>Desconto</span><strong>- {money.format(discount)}</strong></div>
          <div className="grand-total"><span>Valor total</span><strong>{money.format(total)}</strong></div>
        </div>
      </section>

      <section className="pdf-approval">
        <p>Ao aprovar este orçamento, o cliente declara estar de acordo com os itens, valores e condições apresentados.</p>
        <div className="signature"><span></span><strong>Aprovação do cliente</strong></div>
      </section>

      <footer className="pdf-footer">
        <div><strong>YGPrint</strong><span>Dados empresariais, endereço, CPF/CNPJ e contatos serão inseridos nas configurações do sistema.</span></div>
        <span>erp.ygprint.com.br</span>
      </footer>
    </article>
    </>
  );
}
