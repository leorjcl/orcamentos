import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {NextRequest} from 'next/server.js';
const require=createRequire(import.meta.url);
const source=readFileSync('app/api/erp/[...path]/route.ts','utf8');
function proxy(fetch,env={YGPRINT_WP_API_URL:'https://api.ygprint.test/wp-json/ygprint-erp/v1',NODE_ENV:'production'}) {
 const testModule={exports:{}};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module:testModule,exports:testModule.exports,require,process:{env},fetch,URL,Buffer,AbortSignal});
 return testModule.exports;
}
const context=path=>({params:Promise.resolve({path:path.split('/')})});
test('proxy bloqueia sessão ausente, rotas desconhecidas e origem cruzada sem chamar WordPress',async()=>{
 const p=proxy(()=>{throw new Error('fetch não deveria ocorrer');});
 assert.equal((await p.GET(new NextRequest('https://erp.test/api/erp/orders'),context('orders'))).status,401);
 assert.equal((await p.POST(new NextRequest('https://erp.test/api/erp/login',{method:'POST',headers:{origin:'https://outro.test','content-type':'application/json'},body:'{}'}),context('login'))).status,403);
 assert.equal((await p.GET(new NextRequest('https://erp.test/api/erp/users'),context('users'))).status,404);
});
test('login guarda token somente em cookie HttpOnly e retorna dados sem segredo',async()=>{
 const p=proxy(async()=>Response.json({name:'Admin',token:'a'.repeat(64)}));
 const r=await p.POST(new NextRequest('https://erp.test/api/erp/login',{method:'POST',headers:{origin:'https://erp.test','content-type':'application/json'},body:'{"username":"test","password":"example"}'}),context('login'));
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{name:'Admin'});
 const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly/i);assert.match(cookie,/Secure/i);assert.match(cookie,/SameSite=lax/i);
 assert.match(r.headers.get('cache-control'),/no-store/);
});
test('proxy envia token ao servidor, usa no-store e mantém erro de conflito',async()=>{
 const p=proxy(async(url,opt)=>{assert.equal(url.hostname,'api.ygprint.test');assert.equal(opt.cache,'no-store');assert.equal(opt.headers.Authorization,'Bearer '+'a'.repeat(64));return Response.json({message:'Conflito'},{status:409});});
 const r=await p.PUT(new NextRequest('https://erp.test/api/erp/orders/1',{method:'PUT',headers:{origin:'https://erp.test','content-type':'application/json',cookie:'ygprint_erp_session='+'a'.repeat(64)},body:'{}'}),context('orders/1'));
 assert.equal(r.status,409);assert.deepEqual(await r.json(),{message:'Conflito'});
});
test('aprovação exige mesma origem e filtro de orçamentos chega ao WordPress',async()=>{
 let calls=0;
 const p=proxy(async(url,opt)=>{calls++;if(opt.method==='GET')assert.equal(url.searchParams.get('scope'),'quotes');else assert.equal(url.pathname,'/wp-json/ygprint-erp/v1/orders/3/approve');return Response.json({ok:true});});
 const headers={origin:'https://erp.test','content-type':'application/json',cookie:'ygprint_erp_session='+'a'.repeat(64)};
 assert.equal((await p.POST(new NextRequest('https://erp.test/api/erp/orders/3/approve',{method:'POST',headers:{...headers,origin:'https://outro.test'},body:'{"version":1}'}),context('orders/3/approve'))).status,403);
 assert.equal(calls,0);
 assert.equal((await p.POST(new NextRequest('https://erp.test/api/erp/orders/3/approve',{method:'POST',headers,body:'{"version":1}'}),context('orders/3/approve'))).status,200);
 await p.GET(new NextRequest('https://erp.test/api/erp/orders?scope=quotes',{headers}),context('orders'));assert.equal(calls,2);
});
