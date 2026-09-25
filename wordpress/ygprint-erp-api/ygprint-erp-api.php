<?php
/**
 * Plugin Name: YGPrint ERP API
 * Description: Ordens de serviço, recebimentos, recibos e relatórios privados da gráfica YGPrint.
 * Version: 0.2.0
 * Requires PHP: 8.0
 */
namespace YGPrintERP;
defined('ABSPATH') || exit;
require_once __DIR__.'/domain.php';
const NS = 'ygprint-erp/v1';
function table($name) { global $wpdb; return $wpdb->prefix.'ygprint_'.$name; }
function install() {
    global $wpdb;
    require_once ABSPATH.'wp-admin/includes/upgrade.php';
    $collate=$wpdb->get_charset_collate();
    dbDelta('CREATE TABLE '.table('orders')." (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      request_key varchar(36) NOT NULL,
      version bigint unsigned NOT NULL DEFAULT 1,
      status varchar(40) NOT NULL,
      issued date NOT NULL,
      client_name varchar(250) NOT NULL,
      total_cents bigint NOT NULL,
      data longtext NOT NULL,
      created_by bigint unsigned NOT NULL,
      created_at datetime NOT NULL,
      updated_at datetime NOT NULL,
      PRIMARY KEY  (id),
      UNIQUE KEY request_key (request_key),
      KEY issued (issued),
      KEY status (status)
    ) ENGINE=InnoDB $collate;");
    dbDelta('CREATE TABLE '.table('payments')." (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      order_id bigint unsigned NOT NULL,
      request_key varchar(36) NOT NULL,
      amount_cents bigint NOT NULL,
      paid_date date NOT NULL,
      method varchar(40) NOT NULL,
      snapshot longtext NOT NULL,
      created_by bigint unsigned NOT NULL,
      created_at datetime NOT NULL,
      voided_at datetime NULL,
      voided_by bigint unsigned NULL,
      void_reason varchar(1000) NULL,
      PRIMARY KEY  (id),
      UNIQUE KEY request_key (request_key),
      KEY order_id (order_id),
      KEY paid_date (paid_date)
    ) ENGINE=InnoDB $collate;");
    dbDelta('CREATE TABLE '.table('audit')." (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      order_id bigint unsigned NOT NULL,
      actor bigint unsigned NOT NULL,
      action varchar(40) NOT NULL,
      data longtext NOT NULL,
      created_at datetime NOT NULL,
      PRIMARY KEY  (id),
      KEY order_id (order_id)
    ) ENGINE=InnoDB $collate;");
    foreach (['orders','payments','audit'] as $name) {
        $engine=$wpdb->get_row($wpdb->prepare('SHOW TABLE STATUS WHERE Name = %s',table($name)));
        if (!$engine || strtolower($engine->Engine)!=='innodb') wp_die('YGPrint: não foi possível preparar as tabelas InnoDB. Nenhum dado anterior foi apagado.');
    }
    update_option('ygprint_erp_schema','1',false);
}
register_activation_hook(__FILE__,__NAMESPACE__.'\\install');
function write_ok($result) { if ($result === false) throw new Problem('Não foi possível gravar no banco de dados.',500); return $result; }
function encode($value) { $v=wp_json_encode($value,JSON_UNESCAPED_UNICODE); if ($v===false) throw new Problem('Dados inválidos.'); return $v; }
function body($r) { $d=$r->get_json_params(); if (!is_array($d)) throw new Problem('Envie dados JSON válidos.'); return $d; }
function actor() { return get_current_user_id(); }
function guard($r) {
    $auth=$r->get_header('authorization');
    if (!preg_match('/^Bearer ([a-f0-9]{64})$/D',$auth,$m)) return new \WP_Error('unauthorized','Entre para acessar o ERP.',['status'=>401]);
    $key='ygp_s_'.hash('sha256',$m[1]); $session=get_transient($key);
    $user=$session ? get_user_by('id',$session['user']) : false;
    if (!$user || !hash_equals($session['stamp'],hash_hmac('sha256',$user->user_pass,wp_salt('auth')))) return new \WP_Error('unauthorized','Sua sessão expirou. Entre novamente.',['status'=>401]);
    if (!user_can($user,'manage_options')) return new \WP_Error('forbidden','Sua conta não tem permissão para o ERP.',['status'=>403]);
    wp_set_current_user($user->ID); return true;
}
function company_config() { return get_option('ygprint_erp_company',['name'=>'YGPrint','cnpj'=>'','address'=>'','contact'=>'','logo'=>'']); }
function row($id,$lock=false) {
    global $wpdb;
    $r=$wpdb->get_row($wpdb->prepare('SELECT * FROM '.table('orders').' WHERE id=%d'.($lock?' FOR UPDATE':''),$id));
    if (!$r) throw new Problem('Ordem não encontrada.',404); return $r;
}
function paid($id) { global $wpdb; return (int)$wpdb->get_var($wpdb->prepare('SELECT COALESCE(SUM(amount_cents),0) FROM '.table('payments').' WHERE order_id=%d AND voided_at IS NULL',$id)); }
function pack($r,$details=true) {
    $d=json_decode($r->data,true); $received=paid($r->id);
    $d['id']=(string)$r->id; $d['number']=str_pad($r->id,4,'0',STR_PAD_LEFT); $d['version']=(int)$r->version;
    $d['deposit']=$received/100; $d['balance']=($r->total_cents-$received)/100;
    if (!$details) unset($d['company'],$d['items'],$d['notes'],$d['approvedQuote']);
    return $d;
}
function audit($id,$action,$data) { global $wpdb; write_ok($wpdb->insert(table('audit'),['order_id'=>$id,'actor'=>actor(),'action'=>$action,'data'=>encode($data),'created_at'=>current_time('mysql',true)])); }
function add_payment($order,$amount,$date,$method,$key) {
    global $wpdb;
    $d=pack($order);
    if (is_quote($d['status'])) throw new Problem('Aprove o orçamento antes de registrar pagamentos.');
    if ($d['status']==='Cancelado') throw new Problem('Não é possível receber em uma ordem cancelada.');
    if ($amount<=0 || $amount>cents($d['balance'])) throw new Problem('Recebimento deve ser positivo e não superar o saldo.');
    if ($date<$d['date'] || $date>current_time('Y-m-d')) throw new Problem('Data de recebimento fora do período entre emissão e hoje.');
    $snapshot=['order'=>$d,'company'=>$d['company']??company_config(),'amount'=>$amount/100,'date'=>$date,'method'=>$method];
    write_ok($wpdb->insert(table('payments'),['order_id'=>$order->id,'request_key'=>$key,'amount_cents'=>$amount,'paid_date'=>$date,'method'=>$method,'snapshot'=>encode($snapshot),'created_by'=>actor(),'created_at'=>current_time('mysql',true)]));
    $id=$wpdb->insert_id; audit($order->id,'payment',['paymentId'=>$id,'amount'=>$amount/100]); return $id;
}
function transaction($fn) { global $wpdb; write_ok($wpdb->query('START TRANSACTION')); try { $v=$fn(); write_ok($wpdb->query('COMMIT')); return $v; } catch (\Throwable $e) { $wpdb->query('ROLLBACK'); throw $e; } }
function filters($r,$alias='') {
    global $wpdb; $clauses=['1=1']; $a=$alias;
    if ($r['scope']) {
        if (!in_array($r['scope'],['quotes','orders'],true)) throw new Problem('Filtro inválido.');
        $clauses[]="{$a}status ".($r['scope']==='orders'?'NOT ':'')."IN ('Orçamento','Aguardando Aprovação','Recusado')";
    }
    if ($r['from'] && $r['to'] && date_value($r['from'])>date_value($r['to'])) throw new Problem('Período inválido.');
    foreach (['from'=>'>=','to'=>'<='] as $k=>$op) if ($r[$k]) $clauses[]=$wpdb->prepare("{$a}issued $op %s",date_value($r[$k]));
    if ($r['status']) $clauses[]=$wpdb->prepare("{$a}status=%s",text($r['status'],40));
    if ($r['q']) { $q=text($r['q'],250); $clauses[]=$wpdb->prepare("({$a}client_name LIKE %s OR {$a}id=%d)",'%'.$wpdb->esc_like($q).'%',ctype_digit($q)?(int)$q:0); }
    return implode(' AND ',$clauses);
}
function dispatch($name,$r) {
    global $wpdb;
    if ($name==='login') {
        if (!is_ssl()) throw new Problem('HTTPS é obrigatório para entrar no ERP.',403);
        $b=body($r); $login=text($b['username']??'');
        $key='ygp_rate_'.hash('sha256',strtolower($login)); $ip='ygp_ip_'.hash('sha256',$_SERVER['REMOTE_ADDR']??'');
        if ((int)get_transient($key)>=10 || (int)get_transient($ip)>=80) throw new Problem('Muitas tentativas. Aguarde 15 minutos.',429);
        set_transient($key,(int)get_transient($key)+1,900); set_transient($ip,(int)get_transient($ip)+1,900);
        $pass=$b['password']??''; if (!is_string($pass) || strlen($pass)>4096) throw new Problem('Credenciais inválidas.',401);
        $u=wp_authenticate($login,$pass);
        if (is_wp_error($u) || !user_can($u,'manage_options')) throw new Problem('Usuário, senha ou permissão inválidos.',401);
        delete_transient($key);
        $token=bin2hex(random_bytes(32));
        set_transient('ygp_s_'.hash('sha256',$token),['user'=>$u->ID,'stamp'=>hash_hmac('sha256',$u->user_pass,wp_salt('auth'))],12*HOUR_IN_SECONDS);
        return ['token'=>$token,'name'=>$u->display_name];
    }
    if ($name==='logout') { delete_transient('ygp_s_'.hash('sha256',substr($r->get_header('authorization'),7))); return ['ok'=>true]; }
    if ($name==='me') return ['name'=>wp_get_current_user()->display_name,'features'=>['quotes-orders-v1']];
    if ($name==='company') {
        if ($r->get_method()==='PUT') { $c=company(body($r)); update_option('ygprint_erp_company',$c,false); if (get_option('ygprint_erp_company')!==$c) throw new Problem('Não foi possível salvar a empresa.',500); }
        return company_config();
    }
    if ($name==='orders' && $r->get_method()==='GET') {
        $page=max(1,(int)$r['page']); $where=filters($r);
        $total=(int)$wpdb->get_var('SELECT COUNT(*) FROM '.table('orders')." WHERE $where");
        $rows=$wpdb->get_results($wpdb->prepare('SELECT * FROM '.table('orders')." WHERE $where ORDER BY id DESC LIMIT 100 OFFSET %d",($page-1)*100));
        return ['items'=>array_map(fn($x)=>pack($x,false),$rows),'total'=>$total,'page'=>$page,'pages'=>(int)ceil($total/100)];
    }
    if ($name==='order' && $r->get_method()==='GET') return pack(row((int)$r['id']));
    if (($name==='orders' && $r->get_method()==='POST') || ($name==='order' && $r->get_method()==='PUT')) {
        $b=body($r); $d=order_data($b); $key=uuid($b['requestKey']??'');
        return transaction(function()use($r,$b,$d,$key,$name,$wpdb){
            if ($name==='orders') {
                // INSERT ... ON DUPLICATE makes create retries idempotent, even across concurrent requests.
                $d['company']=company_config(); $now=current_time('mysql',true);
                $sql=$wpdb->prepare('INSERT INTO '.table('orders').' (request_key,status,issued,client_name,total_cents,data,created_by,created_at,updated_at) VALUES (%s,%s,%s,%s,%d,%s,%d,%s,%s) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',$key,$d['status'],$d['date'],$d['clientName'],cents($d['total']),encode($d),actor(),$now,$now);
                $changed=write_ok($wpdb->query($sql)); $id=$wpdb->insert_id; $old=row($id,true);
                if ($changed!==1) return pack($old);
                $deposit=cents($b['deposit']??0);
                if ($deposit>0) add_payment($old,$deposit,$d['date'],$d['paymentMethod'],$key);
                audit($id,'create',$d);
            } else {
                $old=row((int)$r['id'],true); $id=$old->id;
                if ((int)($b['version']??0)!==(int)$old->version) throw new Problem('Esta ordem mudou em outra aba. Recarregue antes de editar.',409);
                $received=paid($id);
                if (cents($d['total'])<$received) throw new Problem('O total não pode ficar abaixo do recebido. Estorne o pagamento incorreto primeiro.');
                if (in_array($d['status'],['Cancelado','Recusado'],true) && $received>0) throw new Problem('Estorne os recebimentos antes de cancelar a ordem.');
                $oldData=json_decode($old->data,true);
                check_transition($oldData['status'],$d['status']);
                $d['company']=$oldData['company'];
                foreach (['approvedAt','approvedBy','approvedQuote'] as $field) if (isset($oldData[$field])) $d[$field]=$oldData[$field];
                $first=$wpdb->get_var($wpdb->prepare('SELECT MIN(paid_date) FROM '.table('payments').' WHERE order_id=%d AND voided_at IS NULL',$id));
                if ($first && $d['date']>$first) throw new Problem('A emissão não pode ficar depois de um recebimento.');
                write_ok($wpdb->update(table('orders'),['status'=>$d['status'],'issued'=>$d['date'],'client_name'=>$d['clientName'],'total_cents'=>cents($d['total']),'data'=>encode($d),'version'=>$old->version+1,'updated_at'=>current_time('mysql',true)],['id'=>$id]));
                audit($id,'update',['before'=>$oldData,'after'=>$d]);
            }
            return pack(row($id));
        });
    }
    if ($name==='approve') {
        $b=body($r);
        return transaction(function()use($r,$b,$wpdb){
            $old=row((int)$r['id'],true); $d=json_decode($old->data,true);
            // Same record + row lock make repeated/concurrent approval safe.
            if (!empty($d['approvedAt'])) return pack($old);
            if (!in_array($d['status'],['Orçamento','Aguardando Aprovação'],true)) throw new Problem('Somente um orçamento aberto pode ser aprovado.',409);
            if ((int)($b['version']??0)!==(int)$old->version) throw new Problem('O orçamento mudou. Reabra e confira os valores antes de aprovar.',409);
            if (empty($d['validUntil']) || $d['validUntil']<current_time('Y-m-d')) throw new Problem('Informe uma validade vigente e salve antes de aprovar.');
            if ($d['date']>current_time('Y-m-d')) throw new Problem('A emissão não pode estar no futuro ao aprovar.');
            $d['approvedQuote']=$d;
            $d['approvedAt']=current_time('mysql',true); $d['approvedBy']=actor(); $d['status']='Em Produção';
            write_ok($wpdb->update(table('orders'),['status'=>$d['status'],'data'=>encode($d),'version'=>$old->version+1,'updated_at'=>current_time('mysql',true)],['id'=>$old->id]));
            audit($old->id,'approve',['quote'=>$d['approvedQuote'],'approvedAt'=>$d['approvedAt']]);
            return pack(row($old->id));
        });
    }
    if ($name==='payments' && $r->get_method()==='GET') {
        $id=(int)$r['id']; row($id);
        return $wpdb->get_results($wpdb->prepare('SELECT id,order_id,amount_cents,paid_date,method,voided_at,void_reason FROM '.table('payments').' WHERE order_id=%d ORDER BY id DESC',$id),ARRAY_A);
    }
    if ($name==='payments' && $r->get_method()==='POST') {
        $b=body($r); $key=uuid($b['requestKey']??''); $id=(int)$r['id'];
        return transaction(function()use($b,$key,$id,$wpdb){
            $order=row($id,true);
            $existing=$wpdb->get_row($wpdb->prepare('SELECT id,order_id FROM '.table('payments').' WHERE request_key=%s',$key));
            if ($existing) { if ((int)$existing->order_id!==$id) throw new Problem('Identificador já utilizado.',409); return ['paymentId'=>(int)$existing->id,'order'=>pack($order)]; }
            $method=text($b['method']??'');
            if (!in_array($method,['Pix','Cartão de Crédito','Cartão de Débito','Dinheiro','Faturado / Boleto'],true)) throw new Problem('Forma de pagamento inválida.');
            $pid=add_payment($order,cents($b['amount']??0),date_value($b['date']??''),$method,$key);
            write_ok($wpdb->query($wpdb->prepare('UPDATE '.table('orders').' SET version=version+1 WHERE id=%d',$id)));
            return ['paymentId'=>$pid,'order'=>pack(row($id))];
        });
    }
    if ($name==='receipt' || $name==='void') {
        $p=$wpdb->get_row($wpdb->prepare('SELECT * FROM '.table('payments').' WHERE id=%d',(int)$r['id']));
        if (!$p) throw new Problem('Recebimento não encontrado.',404);
        if ($name==='void') return transaction(function()use($r,$p,$wpdb){
            row($p->order_id,true);
            $p=$wpdb->get_row($wpdb->prepare('SELECT * FROM '.table('payments').' WHERE id=%d FOR UPDATE',$p->id));
            $reason=text(body($r)['reason']??'',250);
            if (strlen($reason)<5) throw new Problem('Informe o motivo do estorno.');
            if (!$p->voided_at) {
                write_ok($wpdb->update(table('payments'),['voided_at'=>current_time('mysql',true),'voided_by'=>actor(),'void_reason'=>$reason],['id'=>$p->id,'voided_at'=>null]));
                write_ok($wpdb->query($wpdb->prepare('UPDATE '.table('orders').' SET version=version+1 WHERE id=%d',$p->order_id)));
                audit($p->order_id,'void',['paymentId'=>$p->id,'reason'=>$reason]);
            }
            return ['ok'=>true];
        });
        return ['id'=>(int)$p->id,'voidedAt'=>$p->voided_at,'voidReason'=>$p->void_reason,'snapshot'=>json_decode($p->snapshot,true)];
    }
    if ($name==='reports') {
        $from=date_value($r['from']??''); $to=date_value($r['to']??''); if ($from>$to) throw new Problem('Período inválido.');
        $orders=$wpdb->get_results($wpdb->prepare('SELECT status,COUNT(*) AS quantity,SUM(total_cents) AS cents FROM '.table('orders').' WHERE issued BETWEEN %s AND %s GROUP BY status',$from,$to),ARRAY_A);
        $receipts=(int)$wpdb->get_var($wpdb->prepare('SELECT COALESCE(SUM(amount_cents),0) FROM '.table('payments').' WHERE paid_date BETWEEN %s AND %s AND voided_at IS NULL',$from,$to));
        $voided=(int)$wpdb->get_var($wpdb->prepare('SELECT COALESCE(SUM(amount_cents),0) FROM '.table('payments').' WHERE DATE(voided_at) BETWEEN %s AND %s',$from,$to));
        $balance=(int)$wpdb->get_var($wpdb->prepare('SELECT COALESCE(SUM(o.total_cents-COALESCE(p.paid,0)),0) FROM '.table('orders')." o LEFT JOIN (SELECT order_id,SUM(amount_cents) paid FROM ".table('payments')." WHERE voided_at IS NULL GROUP BY order_id) p ON p.order_id=o.id WHERE o.issued BETWEEN %s AND %s AND o.status NOT IN ('Cancelado','Orçamento','Aguardando Aprovação','Recusado')",$from,$to));
        return ['from'=>$from,'to'=>$to,'byStatus'=>$orders,'received'=>$receipts/100,'voided'=>$voided/100,'outstanding'=>$balance/100];
    }
    throw new Problem('Rota inválida.',404);
}
add_action('rest_api_init',function(){
    $routes=[['login','/login','POST'],['logout','/logout','POST'],['me','/me','GET'],['company','/company','GET,PUT'],['orders','/orders','GET,POST'],['order','/orders/(?P<id>\d+)','GET,PUT'],['approve','/orders/(?P<id>\d+)/approve','POST'],['payments','/orders/(?P<id>\d+)/payments','GET,POST'],['receipt','/receipts/(?P<id>\d+)','GET'],['void','/payments/(?P<id>\d+)/void','POST'],['reports','/reports','GET']];
    foreach ($routes as [$name,$path,$methods]) register_rest_route(NS,$path,[
        'methods'=>$methods,'permission_callback'=>$name==='login'?'__return_true':__NAMESPACE__.'\\guard',
        'callback'=>function($r)use($name){ try { return new \WP_REST_Response(dispatch($name,$r)); } catch (Problem $e) { return new \WP_Error('ygprint_error',$e->getMessage(),['status'=>$e->status]); } catch (\Throwable $e) { return new \WP_Error('ygprint_error','Não foi possível concluir a operação.',['status'=>500]); } }
    ]);
});
add_filter('rest_post_dispatch',function($response,$server,$request){
    if (strpos($request->get_route(),'/'.NS.'/')===0) {
        $response->header('Cache-Control','private, no-store, max-age=0'); $response->header('Vary','Authorization');
        do_action('litespeed_control_set_nocache','YGPrint ERP privado');
    }
    return $response;
},10,3);
