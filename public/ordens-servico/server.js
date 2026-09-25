/* YGPrint: only confirmed API responses become saved records. No local fallback. */
let serverCompany = {}, currentVersion = 0, createKey = crypto.randomUUID(), dirty = false;
let logoLoading = false;
let pendingLogo = null, page = 1, pages = 1, busy = false, paymentKey = crypto.randomUUID();
const initialQuery = new URLSearchParams(location.search);
const quoteMode = initialQuery.get('mode') === 'quote';
let approvedAt = '', savedStatus = '', openingInitial = true;
const isQuote = status => ['Orçamento','Aguardando Aprovação','Recusado'].includes(status);
function notifyParent() { if (window.parent !== window) window.parent.postMessage({type:'ygprint:order-saved'},location.origin); }
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => Number(n).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
function localDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function notice(message) { $('serverNotice').hidden=false; $('serverNotice').textContent=message; }
function showLogin(message) { $('loginPanel').hidden=false; $('appMain').hidden=true; $('appHeader').hidden=true; $('loginMessage').textContent=message; }
async function api(path, method='GET', data) {
  const response=await fetch('/api/erp/'+path,{method,cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
  let result; try { result=await response.json(); } catch { throw new Error('Resposta inesperada. Confira se a atualização foi publicada.'); }
  if (!response.ok) { if (response.status===401) showLogin('Sua sessão expirou. Entre novamente; o formulário foi mantido nesta aba.'); throw new Error(result.message || 'Não foi possível concluir a operação.'); }
  return result;
}
function guarded(fn) { return async function(...args) { if (busy) return; busy=true; try { return await fn(...args); } catch(e) { notice(e.message); if (!$('loginPanel').hidden) $('loginMessage').textContent=e.message; } finally { busy=false; } }; }
let searchTimer, listRequest=0;
function queueSearch() { clearTimeout(searchTimer); searchTimer=setTimeout(()=>{page=1;refreshOrders().catch(e=>notice(e.message));},300); }
async function refreshOrders() {
  const seq=++listRequest;
  const q=encodeURIComponent($('searchOs').value), status=$('filterStatus').value;
  const result=await api(`orders?page=${page}&q=${q}${status==='Todos'?'':'&status='+encodeURIComponent(status)}`);
  if(seq!==listRequest) return; osList=result.items; pages=result.pages;
  renderOsTable();
  let pager=$('osPager'); if (!pager) { pager=document.createElement('div');pager.id='osPager';pager.className='flex gap-3 p-3 text-sm';$('viewList').appendChild(pager); }
  pager.replaceChildren();
  const prev=document.createElement('button'), next=document.createElement('button'), label=document.createElement('span');
  prev.textContent='← Anterior';prev.disabled=page<=1; prev.onclick=guarded(async()=>{page--;await refreshOrders();});
  next.textContent='Próxima →';next.disabled=page>=pages; next.onclick=guarded(async()=>{page++;await refreshOrders();});
  label.textContent=`Página ${page} de ${Math.max(1,pages)} · ${result.total} ordens encontradas.`;
  pager.append(prev,label,next);
}
async function startSession(preserve=false) {
  const session=await api('me');
  if(quoteMode && !session.features?.includes('quotes-orders-v1')) throw new Error('Atualize o plugin YGPrint ERP API para 0.2.0 no WordPress.');
  serverCompany=await api('company');
  if (!preserve) {companyConfig=structuredClone(serverCompany);fillCompanyForm();resetForm();}
  if (openingInitial && /^\d+$/.test(initialQuery.get('id')||'')) {loadOrder(await api('orders/'+initialQuery.get('id')));await loadPayments();}
  openingInitial=false;
  await refreshOrders();
  $('loginPanel').hidden=true; $('appMain').hidden=false; $('appHeader').hidden=false;
  notice('Conectado ao WordPress. Ordens e recebimentos são salvos no banco.');
}
$('loginForm').addEventListener('submit',e=>{e.preventDefault(); guarded(async()=>{
  const password=$('loginPassword').value;
  try {await api('login','POST',{username:$('loginUser').value,password}); await startSession(Boolean(currentOsId || dirty));} finally {$('loginPassword').value='';}
})();});
const logout=guarded(async()=>{ if(dirty && !confirm('Há alterações não salvas. Sair?')) return;await api('logout','POST',{});location.reload(); });
function formData() {
  return {requestKey:createKey,version:currentVersion,validUntil:$('quoteValidUntil').value,status:$('osStatus').value,date:$('osDate').value,deliveryDate:$('osDeliveryDate').value,clientName:$('clientName').value,clientPhone:$('clientPhone').value,clientDocument:$('clientDocument').value,paymentMethod:$('osPaymentMethod').value,deposit:Number($('osDeposit').value||0),discount:Number($('osDiscount').value||0),notes:$('osNotes').value,items:currentItems};
}
function loadOrder(os) {
  currentOsId=os.id;currentVersion=os.version;approvedAt=os.approvedAt||'';savedStatus=os.status;companyConfig=os.company;renderCompanyInfo();
  const fields={quoteValidUntil:'validUntil',osNumber:'number',osStatus:'status',osDate:'date',osDeliveryDate:'deliveryDate',clientName:'clientName',clientPhone:'clientPhone',clientDocument:'clientDocument',osPaymentMethod:'paymentMethod',osDeposit:'deposit',osDiscount:'discount',osNotes:'notes'};
  for(const [id,key] of Object.entries(fields)) $(id).value=os[key]??'';
  currentItems=structuredClone(os.items).map((x,i)=>({...x,id:i+1}));dirty=false;renderItemRows();renderPreview();
  $('osDeposit').readOnly=true;$('osDeposit').title='Total recebido. Registre novos pagamentos abaixo.';$('paymentPanel').hidden=isQuote(os.status);syncQuoteUI();
  $('paymentDate').value=localDate(new Date());$('paymentAmount').value='';paymentKey=crypto.randomUUID();
}
const saveOS=guarded(async()=>{
  if (!currentOsId && !serverCompany.name) throw new Error('Cadastre os dados da empresa primeiro.');
  const saved=await api(currentOsId?`orders/${currentOsId}`:'orders',currentOsId?'PUT':'POST',formData());
  loadOrder(saved);notifyParent();notice(`${isQuote(saved.status)?'Orçamento':'O.S.'} #${saved.number} salvo no banco de dados.`);
  await loadPayments();await refreshOrders();
});
const editOS=guarded(async id=>{
  if(dirty && !confirm('Descartar as alterações não salvas?')) return;
  const os=await api(`orders/${id}`);loadOrder(os);switchTab('newOs');await loadPayments();
});
const deleteOS=guarded(async id=>{
  if(dirty && !confirm('Descartar as alterações não salvas para encerrar este registro?')) return;
  if(!confirm('Encerrar este registro? Orçamentos serão marcados como recusados e pedidos como cancelados. Recebimentos precisam de estorno antes. O histórico será mantido.')) return;
  const os=await api(`orders/${id}`);
  const saved=await api(`orders/${id}`,'PUT',{...os,status:isQuote(os.status)?'Recusado':'Cancelado',requestKey:crypto.randomUUID()});
  if(currentOsId===id) loadOrder(saved);
  await refreshOrders();notifyParent();notice('Registro encerrado e preservado no histórico.');
});
function createNewOs() { if(dirty && !confirm('Descartar alterações não salvas?')) return;resetForm();switchTab('newOs'); }
async function loadPayments() {
  const payments=await api(`orders/${currentOsId}/payments`); const box=$('paymentsList');box.replaceChildren();
  if(!payments.length) {box.textContent='Nenhum recebimento registrado.';return;}
  $('paymentPanel').hidden=false;
  $('paymentAmount').closest('.flex').hidden=isQuote($('osStatus').value) || $('osStatus').value==='Cancelado';
  for(const p of payments) {
    const line=document.createElement('div');line.className='flex flex-wrap gap-3 border-t pt-2';
    const label=document.createElement('span');label.textContent=`${formatDate(p.paid_date)} · ${p.method} · ${money(p.amount_cents/100)}${p.voided_at?' · ESTORNADO':''}`;line.append(label);
    const link=document.createElement('a');link.textContent='Abrir recibo';link.className='text-blue-700 underline';link.href=`/recibos/index.html?pagamento=${p.id}`;link.target='_blank';link.rel='noopener';line.append(link);
    if(!p.voided_at) {const btn=document.createElement('button');btn.textContent='Estornar';btn.className='text-red-700';btn.onclick=guarded(async()=>{
      const reason=prompt('Motivo do estorno (mínimo de 5 caracteres). Isto não faz transferência bancária.');if(!reason)return;
      await api(`payments/${p.id}/void`,'POST',{reason});loadOrder(await api(`orders/${currentOsId}`));await loadPayments();await refreshOrders();notifyParent();notice('Estorno registrado no banco.');
    });line.append(btn);} box.append(line);
  }
}
const registerPayment=guarded(async()=>{
  if(dirty) throw new Error('Salve a ordem antes de registrar um pagamento.');
  const result=await api(`orders/${currentOsId}/payments`,'POST',{requestKey:paymentKey,amount:Number($('paymentAmount').value),date:$('paymentDate').value,method:$('paymentMethod').value});
  loadOrder(result.order);await loadPayments();await refreshOrders();notifyParent();notice('Pagamento salvo. O recibo está disponível na lista de recebimentos.');
});
const approveQuote=guarded(async()=>{
  if (!currentOsId || dirty) throw new Error('Salve o orçamento antes de aprovar.');
  if (!confirm('O cliente aprovou os valores e o prazo? Confirmar inicia a produção deste pedido.')) return;
  const saved=await api(`orders/${currentOsId}/approve`,'POST',{version:currentVersion});
  loadOrder(saved);notifyParent();await loadPayments();await refreshOrders();notice(`Orçamento aprovado. Pedido / O.S. #${saved.number} em produção. Recebimentos já estão disponíveis abaixo.`);
});
function syncQuoteUI() {
  const status=$('osStatus').value, quote=isQuote(status);
  $('quotePanel').hidden=!quote;
  $('approveQuoteButton').hidden=!currentOsId || status==='Recusado';
  $('saveLabel').textContent=quote?'Salvar orçamento':'Salvar O.S.';
  $('osDeposit').readOnly=Boolean(currentOsId)||quote;
  if (!currentOsId && quote) $('osDeposit').value='';
  $('approvalInfo').hidden=!approvedAt;
  $('approvalInfo').textContent=approvedAt?'Orçamento aprovado em '+approvedAt+' (UTC). Este pedido mantém o mesmo número.':'';
  const allowed=savedStatus ? (isQuote(savedStatus)?['Orçamento','Aguardando Aprovação','Recusado']:({
    'Em Produção':['Em Produção','Pronto para Retirada','Cancelado'],
    'Pronto para Retirada':['Em Produção','Pronto para Retirada','Entregue','Cancelado'],
    'Entregue':['Entregue'], 'Cancelado':['Cancelado']
  }[savedStatus]||[savedStatus])) : (quoteMode?['Orçamento','Aguardando Aprovação','Recusado']:null);
  for (const option of $('osStatus').options) option.disabled=Boolean(allowed && !allowed.includes(option.value));
  $('paymentAmount').closest('.flex').hidden=quote||status==='Cancelado';
  // Keep the original OS print structure. Only quote wording and validity differ.
  const title=$('prevOsNum').parentElement;
  title.firstChild.textContent=quote?'Orçamento Nº ':'O.S. Nº ';
  const stub=$('prevCanhotoOs').parentElement;
  stub.firstChild.textContent=quote?'Orçamento Nº ':'Comprovante de Retirada - O.S. Nº ';
  let validity=$('prevQuoteValidity');
  if (quote && !validity) {validity=document.createElement('p');validity.id='prevQuoteValidity';validity.className='text-[10px] font-semibold text-slate-700';$('prevOsDelivery').parentElement.after(validity);}
  if (validity) {if (!quote) validity.remove();else validity.textContent='Válido até: '+formatDate($('quoteValidUntil').value);}
  const terms=$('printableArea').querySelector('div.text-slate-400.leading-tight');
  if(terms) {if(!terms.dataset.original)terms.dataset.original=terms.textContent;if(quote)terms.textContent='Proposta sujeita à aprovação dentro da validade. A produção começa após a confirmação dos valores, do prazo e da arte/modelo final.';else terms.textContent=terms.dataset.original;}
}
function printOS() {
  if(!currentOsId || dirty) {notice('Salve a ordem antes de imprimir.');return;}
  window.print();
}
const saveCompanyConfig=guarded(async()=>{
  if(logoLoading) throw new Error('Aguarde o carregamento da logo.');
  const next={name:$('cfgCompName').value,cnpj:$('cfgCompCnpj').value,address:$('cfgCompAddress').value,contact:$('cfgCompContact').value,logo:pendingLogo??serverCompany.logo};
  serverCompany=await api('company','PUT',next);pendingLogo=null;
  if(!currentOsId) {companyConfig=structuredClone(serverCompany);renderCompanyInfo();}
  notice('Empresa salva no WordPress. Ordens antigas preservam os dados da emissão.');
});
function switchTab(tab) {
  $('viewReports').classList.add('hidden');
  if(tab==='reports') { for(const id of ['viewNewOs','viewList','viewCompany']) $(id).classList.add('hidden');$('viewReports').classList.remove('hidden');return; }
  if(tab==='company') {const saved=companyConfig;companyConfig=structuredClone(serverCompany);fillCompanyForm();companyConfig=saved;renderCompanyInfo();}
  switchTabOriginal(tab);
  if(tab==='list') guarded(refreshOrders)();
}
function reportQuery() {const from=$('reportFrom').value,to=$('reportTo').value;if(!from||!to||from>to)throw new Error('Informe um período válido.');return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;}
const loadReport=guarded(async()=>{
  const r=await api('reports?'+reportQuery());const box=$('reportContent');box.replaceChildren();
  const p=document.createElement('p');p.className='font-bold';p.textContent=`Recebimentos válidos: ${money(r.received)} · Saldo atual: ${money(r.outstanding)} · Estornos registrados no período (UTC): ${money(r.voided)}`;box.append(p);
  const table=document.createElement('table');table.className='w-full text-sm mt-4';
  table.innerHTML='<thead><tr><th>Status</th><th>Ordens emitidas</th><th>Valor</th></tr></thead>';
  for(const row of r.byStatus){const tr=document.createElement('tr');for(const value of [row.status,row.quantity,money(row.cents/100)]){const td=document.createElement('td');td.className='border-t p-2';td.textContent=value;tr.append(td);}table.append(tr);}box.append(table);
});
function csvValue(v) {let s=String(v??'');if(/^[\s]*[=+\-@]|^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
const exportReport=guarded(async()=>{
  const query=reportQuery();let i=1,result,rows=[['OS','Emissão','Entrega','Cliente','Status','Total','Recebido','Saldo']];
  do {result=await api(`orders?${query}&page=${i}`);for(const o of result.items) rows.push([o.number,o.date,o.deliveryDate,o.clientName,o.status,o.total,o.deposit,o.balance]);i++;}while(i<=result.pages);
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(csvValue).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ygprint-ordens.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
$('viewNewOs').addEventListener('input',e=>{if(!e.target.closest('#paymentPanel')) dirty=true;});
$('viewNewOs').addEventListener('change',e=>{if(!e.target.closest('#paymentPanel')) dirty=true;});
window.addEventListener('DOMContentLoaded',()=>{
 const today=localDate(new Date());$('reportFrom').value=today.slice(0,8)+'01';$('reportTo').value=today;
 guarded(async()=>{await startSession();})();
});
