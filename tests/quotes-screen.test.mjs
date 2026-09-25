import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
const require=createRequire(import.meta.url);
const dom=new JSDOM('<div id="root"></div>',{url:'https://erp.test/orcamentos'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const testModule={exports:{}};let authenticated=false, requests=[],fail=false;
const code=ts.transpileModule(readFileSync('components/quotes-orders.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mockFetch=async(url)=>{
 requests.push(url);
 if(!authenticated)return Response.json({message:'Entre para acessar.'},{status:401});
 if(url.endsWith('/me'))return Response.json({features:['quotes-orders-v1']});
 if(fail)return Response.json({message:'Falha de conexão'},{status:502});
 const order={id:'9',number:'0009',date:'2026-09-25',validUntil:'2026-09-30',clientName:'Cliente de teste',status:url.includes('scope=quotes')?'Orçamento':'Em Produção',total:100,deposit:0,balance:100};
 return Response.json({items:[order],total:1,page:1,pages:1});
};
vm.runInNewContext(code,{module:testModule,exports:testModule.exports,require:name=>name==='./icon'?{Icon:()=>null}:require(name),fetch:mockFetch,URLSearchParams,URL,Blob,window:dom.window,document:dom.window.document,FormData:dom.window.FormData,AbortController,confirm:()=>true,setTimeout,console});
const root=createRoot(document.getElementById('root'));
async function click(text){const el=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(el,text);await act(async()=>{el.click();await new Promise(r=>setTimeout(r,10));});}
try {
 await act(async()=>{root.render(React.createElement(testModule.exports.QuotesOrders));await new Promise(r=>setTimeout(r,10));});
 assert.match(document.body.textContent,/Entre para acessar os orçamentos/);
 authenticated=true;await act(async()=>{document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,20));});
 assert.match(document.body.textContent,/Cliente de teste/);assert.ok(requests.some(s=>s.includes('scope=quotes')));
 await click('Pedidos');assert.ok(requests.at(-1).includes('scope=orders'));assert.match(document.body.textContent,/Em Produção/);
 await click('Abrir pedido');assert.equal(document.querySelector('iframe').getAttribute('src'),'/ordens-servico/index.html?id=9');
 await click('← Voltar à lista');assert.match(document.body.textContent,/Cliente de teste/);
 fail=true;await click('Filtrar');assert.match(document.body.textContent,/Falha de conexão/);assert.doesNotMatch(document.body.textContent,/Cliente de teste/);
 console.log('OK: tela React exige login, separa listas, abre pedido e remove dados antigos ao falhar a consulta.');
} finally {await act(async()=>root.unmount());dom.window.close();}
