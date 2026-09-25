import {JSDOM} from 'jsdom';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const root='public/ordens-servico/';
const dom=new JSDOM(fs.readFileSync(root+'index.html','utf8'),{url:'https://ygprint.test/ordens-servico/index.html?mode=quote',runScripts:'outside-only'});
const w=dom.window, context=dom.getInternalVMContext(), evaluate=s=>vm.runInContext(s,context);
w.structuredClone=structuredClone;w.confirm=()=>true;w.print=()=>{};
const company={name:'YGPrint',cnpj:'',contact:'',address:'',logo:''};
let saved, failApprove=true, approvalRequests=0;
w.fetch=async(url,options)=>{
 let status=200,data;
 if(url.endsWith('/me'))data={name:'Admin',features:['quotes-orders-v1']};
 else if(url.endsWith('/company'))data=company;
 else if(url.includes('/orders?page='))data={items:saved?[saved]:[],page:1,pages:1,total:saved?1:0};
 else if(url.endsWith('/payments'))data=[];
 else if(url.endsWith('/orders')){saved={...JSON.parse(options.body),id:'3',number:'0003',version:1,company,subtotal:50,total:50,deposit:0,balance:50};data=saved;}
 else if(url.endsWith('/approve')){
  approvalRequests++;
  if(failApprove){status=409;data={message:'O orçamento mudou. Reabra antes de aprovar.'};}
  else {saved={...saved,status:'Em Produção',version:2,approvedAt:'2026-09-25 12:00:00'};data=saved;}
 }else throw new Error(url);
 return {ok:status<400,status,json:async()=>data};
};
evaluate(fs.readFileSync(root+'model.js','utf8'));evaluate(fs.readFileSync(root+'server.js','utf8'));
try {
 await new Promise(r=>setTimeout(r,30));
 const $=id=>w.document.getElementById(id);
 assert.equal($('appMain').hidden,false);assert.equal($('osStatus').value,'Orçamento');assert.equal($('quotePanel').hidden,false);assert.equal($('osDeposit').readOnly,true);
 assert.ok($('prevQuoteValidity').textContent.includes('Válido até:'));
 assert.equal($('prevOsNum').parentElement.firstChild.textContent,'Orçamento Nº ');
 assert.ok(w.document.querySelector('div.text-slate-400.leading-tight').textContent.includes('Proposta sujeita'));
 $('clientName').value='Cliente teste';evaluate("currentItems=[{id:1,description:'Fotos',material:'Papel',qty:1,unitPrice:50}]");
 await evaluate('approveQuote()');assert.equal(approvalRequests,0);
 await evaluate('saveOS()');assert.equal(saved.validUntil,$('quoteValidUntil').value);assert.equal($('paymentPanel').hidden,true);
 await evaluate('approveQuote()');assert.equal($('osStatus').value,'Orçamento');assert.match($('serverNotice').textContent,/mudou/);
 failApprove=false;await evaluate('approveQuote()');assert.equal(evaluate('currentOsId'),'3');assert.equal($('osStatus').value,'Em Produção');assert.equal($('paymentPanel').hidden,false);assert.equal($('quotePanel').hidden,true);assert.equal($('prevQuoteValidity'),null);
 assert.equal($('prevOsNum').parentElement.firstChild.textContent,'O.S. Nº ');
 assert.equal([...$('osStatus').options].find(x=>x.value==='Orçamento').disabled,true);
 console.log('OK: novo orçamento, validade impressa, bloqueio sem salvar, conflito de aprovação sem falso sucesso e pedido com mesmo número.');
} finally {dom.window.close();}
