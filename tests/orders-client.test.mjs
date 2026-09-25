import {JSDOM} from 'jsdom';import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import vm from 'node:vm';
const root='public/ordens-servico/';const source=fs.readFileSync(root+'index.html','utf8');
const dom=new JSDOM(source,{url:'https://ygprint.test/ordens-servico/index.html',runScripts:'outside-only'});const w=dom.window;
w.structuredClone=structuredClone;w.alert=()=>{};w.confirm=()=>true;w.print=()=>{};
let requests=[], saved, payments=[],failSave=false;
const company={name:'YGPrint Teste',cnpj:'',address:'',contact:'',logo:''};
w.fetch=async(url,options)=>{
 requests.push({url,options});let status=200,data={};const method=options.method;
 if(url.endsWith('/me')) data={name:'Admin'};
 else if(url.endsWith('/company'))data=company;
 else if(url.includes('/orders?page='))data={items:saved?[saved]:[],page:1,pages:1,total:saved?1:0};
 else if(url.endsWith('/orders')&&method==='POST'){
  if(failSave){status=500;data={message:'Erro simulado'};}else{
   data={...JSON.parse(options.body),id:'1',number:'0001',version:1,company,total:90,subtotal:100,balance:70};saved=data;
  }
 } else if(url.endsWith('/orders/1/payments')&&method==='GET') data=payments;
 else if(url.endsWith('/orders/1'))data=saved;
 else throw new Error('Unexpected '+url);
 return {ok:status<400,status,json:async()=>data};
};
const context=dom.getInternalVMContext();const evaluate=s=>vm.runInContext(s,context);evaluate(fs.readFileSync(root+'model.js','utf8'));evaluate(fs.readFileSync(root+'server.js','utf8'));
const tick=()=>new Promise(r=>setTimeout(r,25));
(async()=>{
 await tick();assert.equal(w.document.getElementById('appMain').hidden,false);
 w.document.getElementById('clientName').value='Cliente';w.document.getElementById('osDeposit').value='20';w.document.getElementById('osDiscount').value='10';
 evaluate("currentItems=[{id:1,description:'<img src=x onerror=alert(1)>',material:'Papel',qty:2,unitPrice:50}]");w.renderPreview();assert.equal(w.document.querySelector('#prevItemsTable img'),null);
 failSave=true;await evaluate('saveOS()');assert.equal(evaluate('currentOsId'),null);assert.equal(w.localStorage.length,0);
 failSave=false;await evaluate('saveOS()');assert.equal(evaluate('currentOsId'),'1');assert.equal(w.document.getElementById('osNumber').value,'0001');assert.equal(w.document.getElementById('osDeposit').readOnly,true);
 assert.equal(evaluate('dirty'),false);await evaluate("editOS('1')");assert.equal(w.document.getElementById('clientName').value,'Cliente');
 // Fresh DOM print markup must remain byte-identical to the supplied model.

 const fresh=new JSDOM(source);
 assert.equal(crypto.createHash('sha256').update(fresh.window.document.getElementById('printableArea').outerHTML).digest('hex'),'f8ae9657a06d0f7c7e84d0dc488976096e06cfed09d35aa27c5ef5ae97c10fc4');
 for(const id of ['osNumber','osStatus','osDate','osDeliveryDate','clientName','clientPhone','clientDocument','osPaymentMethod','osDeposit','osDiscount','osNotes','searchOs','filterStatus','companyLogoInput','cfgCompName','cfgCompCnpj','cfgCompContact','cfgCompAddress']) assert.ok(fresh.window.document.getElementById(id),id);
 console.log('OK: inicialização, erro sem falso salvamento, salvar/reabrir, HTML escapado, campos preservados, documento impresso idêntico.');
 dom.window.close();fresh.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;dom.window.close();});
