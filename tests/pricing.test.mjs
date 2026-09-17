import test from 'node:test';
import assert from 'node:assert/strict';
import { blankPricing, calculatePricing } from '../lib/pricing.ts';
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);

test('margem de 30% em custo de R$70 resulta em R$100, não R$91',()=>{
  const r=calculatePricing({...blankPricing,materialPrice:70,packSize:1,materialUsed:1});
  assert.equal(r.unitPrice,100); close(r.profit,30); close(r.actualMargin,30);
});
test('lote 3D separa tempo de máquina e mão de obra e inclui custos sem duplicar',()=>{
  const r=calculatePricing({...blankPricing,quantity:2,materialPrice:120,materialUsed:59.74,wastePercent:10,machineMinutes:102,machineValue:2500,residualValue:500,usefulHours:4000,maintenanceHour:1,powerWatts:100,electricityKwh:1,laborMinutes:20,laborHour:30,fixedMonthly:1600,productiveHours:160,finishing:5,packaging:2,taxesPercent:6,feesPercent:4,marginPercent:30});
  // 7.1688 material + .71688 extra + .85 deprec. + 1.7 maint. + .17 energy +10 labor +17 overhead +5 finish +2 package
  close(r.totalCost,44.60568); close(r.unitCost,22.30284); assert.equal(r.unitPrice,37.18);
  close(r.profit,r.saleTotal*.9-r.totalCost); assert.ok(r.actualMargin>=30);
});
test('área em cm, frente e verso, quantidade e cobertura resultam em consumo de tinta',()=>{
  const r=calculatePricing({...blankPricing,category:'digital',quantity:100,widthCm:10,heightCm:20,sides:2,coveragePercent:50,inkMlM2:10,inkBottleMl:100,inkPrice:80,wastePercent:10});
  close(r.areaM2,4); close(r.inkMl,20); close(r.totalCost,17.6);
});
test('tinta fica fora do custo de impressão 3D mesmo depois de trocar categoria',()=>{
  const r=calculatePricing({...blankPricing,category:'3d',widthCm:100,heightCm:100,coveragePercent:100,inkMlM2:10,inkPrice:80});
  assert.equal(r.inkMl,0); assert.equal(r.totalCost,0);
});
test('energia solar pode ter tarifa zero sem apagar depreciação',()=>{
  const r=calculatePricing({...blankPricing,machineValue:2500,usefulHours:5000,machineMinutes:60,powerWatts:100,electricityKwh:0});
  assert.equal(r.totalCost,.5);
});
test('rejeita divisões por zero, percentuais impossíveis e quantidades inválidas',()=>{
  for(const invalid of [{packSize:0},{usefulHours:0},{productiveHours:0},{inkBottleMl:0},{marginPercent:100},{taxesPercent:60,marginPercent:40},{quantity:0},{quantity:1.5},{coveragePercent:101},{materialPrice:-1},{materialPrice:NaN},{materialPrice:Infinity},{residualValue:1,machineValue:0},{sides:3}])
    assert.throws(()=>calculatePricing({...blankPricing,...invalid}));
});
test('arredondamento para centavos preserva a margem desejada no lote',()=>{
  const r=calculatePricing({...blankPricing,quantity:3,materialPrice:1,packSize:1,materialUsed:1,marginPercent:30,taxesPercent:5,feesPercent:3});
  assert.equal(r.unitPrice,.54); assert.ok(r.actualMargin>=30);
});
