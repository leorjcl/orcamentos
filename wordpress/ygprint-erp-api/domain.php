<?php
namespace YGPrintERP;

class Problem extends \RuntimeException {
    public $status;
    public function __construct($message, $status = 400) { parent::__construct($message); $this->status = $status; }
}
function text($value, $limit = 250) {
    if (!is_string($value) || strlen($value) > $limit * 4) throw new Problem('Texto inválido ou muito longo.');
    return trim(strip_tags($value));
}
function cents($value) {
    if (!is_numeric($value) || !is_finite((float)$value) || $value < 0 || $value > 9999999.99) throw new Problem('Valor monetário inválido.');
    $v = round((float)$value * 100);
    if (abs((float)$value * 100 - $v) > 0.00001) throw new Problem('Use no máximo duas casas decimais nos valores.');
    return (int)$v;
}
function date_value($value, $optional = false) {
    if ($optional && $value === '') return '';
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) throw new Problem('Data inválida.');
    [$y,$m,$d] = array_map('intval', explode('-', $value));
    if ($y < 2000 || $y > 2100 || !checkdate($m,$d,$y)) throw new Problem('Data inválida.');
    return $value;
}
function uuid($value) {
    if (!is_string($value) || !preg_match('/^[a-f0-9-]{36}$/D', $value)) throw new Problem('Identificador de operação inválido.');
    return $value;
}
function company($raw) {
    if (!is_array($raw)) throw new Problem('Dados da empresa inválidos.');
    $out=[];
    foreach (['name','cnpj','address','contact'] as $key) $out[$key]=text($raw[$key]??'',500);
    $logo=$raw['logo']??'';
    if (!is_string($logo) || strlen($logo)>1500000) throw new Problem('Logo muito grande (limite 1 MB).');
    if ($logo !== '') {
        if (!preg_match('#^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$#D',$logo,$m)) throw new Problem('Use uma logo PNG, JPEG ou WebP.');
        $bytes=base64_decode($m[2],true);
        $info=$bytes===false ? false : @getimagesizefromstring($bytes);
        if (!$info || $info['mime']!=='image/'.$m[1] || $info[0]>5000 || $info[1]>5000) throw new Problem('Imagem de logo inválida.');
    }
    $out['logo']=$logo;
    return $out;
}
function order_data($raw) {
    if (!is_array($raw)) throw new Problem('Ordem inválida.');
    $out=[];
    foreach (['clientName','clientPhone','clientDocument','paymentMethod','status'] as $key) $out[$key]=text($raw[$key]??'');
    if (!$out['clientName']) throw new Problem('Informe o nome do cliente.');
    if (!in_array($out['status'],['Orçamento','Aguardando Aprovação','Em Produção','Pronto para Retirada','Entregue','Cancelado','Recusado'],true)) throw new Problem('Status inválido.');
    if (!in_array($out['paymentMethod'],['Pix','Cartão de Crédito','Cartão de Débito','Dinheiro','Faturado / Boleto'],true)) throw new Problem('Forma de pagamento inválida.');
    $out['date']=date_value($raw['date']??'');
    $out['deliveryDate']=date_value($raw['deliveryDate']??'',true);
    if ($out['deliveryDate'] && $out['deliveryDate']<$out['date']) throw new Problem('A entrega não pode anteceder a emissão.');
    $out['validUntil']=date_value($raw['validUntil']??'',true);
    if ($out['validUntil'] && $out['validUntil']<$out['date']) throw new Problem('A validade não pode anteceder a emissão.');
    $out['notes']=text($raw['notes']??'',5000);
    $items=$raw['items']??null;
    if (!is_array($items) || count($items)<1 || count($items)>100) throw new Problem('Informe entre 1 e 100 itens.');
    $out['items']=[]; $subtotal=0;
    foreach ($items as $i=>$item) {
        $qty=$item['qty']??0;
        if (!is_numeric($qty) || $qty<=0 || $qty>1000000 || abs(round($qty*1000)-$qty*1000)>0.00001) throw new Problem('Quantidade inválida (até 3 casas decimais).');
        $price=cents($item['unitPrice']??0);
        $desc=text($item['description']??'',1000);
        if (!$desc) throw new Problem('Descreva todos os itens.');
        $subtotal+=(int)round($price*$qty);
        $out['items'][]=['id'=>$i+1,'description'=>$desc,'material'=>text($item['material']??'',500),'qty'=>(float)$qty,'unitPrice'=>$price/100];
    }
    if ($subtotal>999999999) throw new Problem('Total da ordem acima do limite.');
    $discount=cents($raw['discount']??0);
    if ($discount>$subtotal) throw new Problem('O desconto não pode superar o subtotal.');
    $out['subtotal']=$subtotal/100; $out['discount']=$discount/100; $out['total']=($subtotal-$discount)/100;
    return $out;
}

function is_quote($status) { return in_array($status,['Orçamento','Aguardando Aprovação','Recusado'],true); }
function check_transition($before,$after) {
    if (is_quote($before) && !is_quote($after)) throw new Problem('Use Aprovar orçamento para iniciar o pedido. Para encerrar sem aprovação, use Recusado.');
    if (!is_quote($before) && is_quote($after)) throw new Problem('Uma ordem já iniciada não pode voltar a ser orçamento.');
    $allowed=['Em Produção'=>['Em Produção','Pronto para Retirada','Cancelado'], 'Pronto para Retirada'=>['Em Produção','Pronto para Retirada','Entregue','Cancelado'], 'Entregue'=>['Entregue'], 'Cancelado'=>['Cancelado']];
    if (isset($allowed[$before]) && !in_array($after,$allowed[$before],true)) throw new Problem('Transição de produção inválida. Marque como pronto antes de entregar.');
}
