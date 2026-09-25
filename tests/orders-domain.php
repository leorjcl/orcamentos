<?php
require __DIR__.'/../wordpress/ygprint-erp-api/domain.php';
use function YGPrintERP\order_data;
use function YGPrintERP\cents;
use function YGPrintERP\date_value;
use function YGPrintERP\company;
function check($test,$message) { if (!$test) throw new Exception($message); }
function fails($fn) {try {$fn();} catch (YGPrintERP\Problem $e) {return;} throw new Exception('Entrada inválida foi aceita');}
$base=['clientName'=>'Cliente','status'=>'Em Produção','paymentMethod'=>'Pix','date'=>'2026-09-24','deliveryDate'=>'2026-09-27','items'=>[['description'=>'A4','material'=>'Papel','qty'=>3,'unitPrice'=>0.1]],'discount'=>0.05];
$r=order_data($base);check(cents($r['total'])===25,'Centavos devem ser exatos');
$raw=$base;$raw['total']=0.01;$raw['subtotal']=999;$r=order_data($raw);check(cents($r['total'])===25,'Não confiar nos totais do cliente');
$raw=$base;$raw['discount']=1;fails(fn()=>order_data($raw));
$raw=$base;$raw['items'][0]['qty']=-1;fails(fn()=>order_data($raw));
$raw=$base;$raw['items'][0]['unitPrice']=0.101;fails(fn()=>order_data($raw));
$raw=$base;$raw['deliveryDate']='2026-09-01';fails(fn()=>order_data($raw));
fails(fn()=>date_value('2026-02-31'));
fails(fn()=>company(['logo'=>'data:image/svg+xml;base64,AAAA']));
fails(fn()=>company(['logo'=>'data:image/png;base64,AAAA']));
$raw=$base;$raw['items'][0]['description']='<script>alert(1)</script>Teste';$r=order_data($raw);check(!str_contains($r['items'][0]['description'],'<script>'),'Remover HTML');
echo "OK: totais calculados no servidor, centavos, datas, quantidades, desconto e validação de logo.\n";
