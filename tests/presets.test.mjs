import test from 'node:test';
import assert from 'node:assert/strict';
import { blankPricing, calculatePricing } from '../lib/pricing.ts';
import { emptyPresets, applyMaterial, applyMachine, changeQuantity, validatePresets, readPresets, writePresets, presetKey } from '../lib/presets.ts';
const paper={id:'paper',name:'Fotográfico A4',category:'digital',unit:'folha',price:47.2,packSize:100,widthCm:21,heightCm:29.7};
const printer={id:'printer',name:'Epson teste',category:'digital',value:1425,residual:0,usefulHours:5000,maintenanceHour:.1,powerWatts:13,ink:{text:.02,color:.12,photo:.35}};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('um cadastro de papel alimenta quantidade e custo sem repetir preço de pacote',()=>{
  const p=applyMaterial({...blankPricing,category:'digital',quantity:10},paper);
  assert.equal(p.materialUsed,10); close(calculatePricing(p).totalCost,4.72);
  const twice=changeQuantity(p,20); assert.equal(twice.materialUsed,20); close(calculatePricing(twice).totalCost,9.44);
});
test('perfil de tinta é escalonado pela área, faces e quantidade',()=>{
  const p=applyMachine(applyMaterial({...blankPricing,category:'digital',quantity:10,sides:2},paper),printer,'photo');
  close(calculatePricing(p).breakdown.find(r=>r.label==='Tinta estimada').value,7);
  close(calculatePricing({...p,widthCm:29.7,heightCm:42}).breakdown.find(r=>r.label==='Tinta estimada').value,14);
});
test('trocar para 3D não acrescenta tinta',()=>{
  const m={...printer,category:'3d'};
  const p=applyMachine({...blankPricing,category:'3d',inkCostPerA4:50,widthCm:21,heightCm:29.7},m,'photo');
  assert.equal(p.inkCostPerA4,undefined); assert.equal(calculatePricing(p).totalCost,0);
});
test('rascunho antigo mantém seu custo de tinta detalhado ao reabrir',()=>{
  const p={...blankPricing,category:'digital',quantity:100,widthCm:10,heightCm:20,sides:2,coveragePercent:50,inkMlM2:10,inkBottleMl:100,inkPrice:80};
  close(calculatePricing(p).totalCost,16);
  close(calculatePricing(JSON.parse(JSON.stringify(p))).totalCost,16);
});
test('atualizar preço do cadastro não recalcula silenciosamente o snapshot salvo',()=>{
  const p=applyMaterial({...blankPricing,category:'digital'},paper);
  const cost=calculatePricing(p).totalCost;
  const changed={...paper,price:100};
  close(calculatePricing(p).totalCost,cost); close(calculatePricing(applyMaterial(p,changed)).totalCost,1);
});
test('perfil não medido fica vazio e não herda a tinta da máquina anterior',()=>{
  const p=applyMachine({...blankPricing,category:'digital',inkCostPerA4:3,inkMlM2:30,inkPrice:100}, {...printer,ink:{text:null,color:null,photo:null}},'photo');
  assert.equal(p.inkCostPerA4,undefined); assert.equal(p.inkPrice,0);
});
test('cadastros rejeitam duplicação, embalagens vazias, perfis inválidos e categoria incompatível',()=>{
  const valid={...emptyPresets,materials:[paper],machines:[printer]}; validatePresets(valid);
  for(const invalid of [{...valid,materials:[paper,paper]},{...valid,materials:[{...paper,packSize:0}]},{...valid,machines:[{...printer,ink:{...printer.ink,photo:-1}}]},{...valid,shop:{...valid.shop,marginPercent:100}},{...valid,materials:[{...paper,unit:'g'}]}]) assert.throws(()=>validatePresets(invalid));
  assert.throws(()=>applyMaterial(blankPricing,paper)); assert.throws(()=>applyMachine(blankPricing,printer,'photo'));
});
test('salvamento local valida antes de gravar e conserva configuração se a escrita falhar',()=>{
  const data=new Map(); const previousStorage=globalThis.localStorage; const previousWindow=globalThis.window;
  try {
    globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
    globalThis.window={dispatchEvent:()=>{}};
    const value={...emptyPresets,materials:[paper],machines:[printer]}; writePresets(value);
    assert.deepEqual(readPresets(),value);
    assert.throws(()=>writePresets({...value,shop:{...value.shop,productiveHours:0}})); assert.deepEqual(readPresets(),value);
    globalThis.localStorage.setItem=()=>{throw new Error('quota');};
    assert.throws(()=>writePresets({...value,shopConfigured:true})); assert.deepEqual(readPresets(),value);
    data.set(presetKey,'{broken'); assert.throws(()=>readPresets()); assert.equal(data.get(presetKey),'{broken');
  } finally { if(previousStorage===undefined) delete globalThis.localStorage; else globalThis.localStorage=previousStorage; if(previousWindow===undefined) delete globalThis.window; else globalThis.window=previousWindow; }
});
