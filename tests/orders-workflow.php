<?php
// Domain integration test with SQLite adapter. Production InnoDB locking still requires deployment verification.
define('ABSPATH',__DIR__.'/');define('ARRAY_A','array');define('HOUR_IN_SECONDS',3600);
function register_activation_hook(...$x){} function add_action(...$x){} function add_filter(...$x){}
function wp_json_encode($v,$o=0){return json_encode($v,$o);} function get_current_user_id(){return 1;}
function current_time($format,$utc=false){return $format==='Y-m-d'?'2026-09-24':'2026-09-24 12:00:00';}
function get_option($key,$default=false){return $GLOBALS['options'][$key]??$default;} function update_option($key,$v,...$rest){$GLOBALS['options'][$key]=$v;return true;}
function get_transient($key){return $GLOBALS['transients'][$key]??false;}function set_transient($k,$v,$t){$GLOBALS['transients'][$k]=$v;return true;}function delete_transient($k){unset($GLOBALS['transients'][$k]);}
function get_user_by($type,$id){return (object)['ID'=>1,'user_pass'=>'hash','display_name'=>'Admin'];}function wp_salt($k){return 'test-salt';}function user_can($u,$cap){return $GLOBALS['allowed']??true;}function wp_set_current_user($id){}
class WP_Error {function __construct(public $code,public $message,public $data){}}
class Request extends ArrayObject {function __construct(public $method,public $json=[],array $params=[],public $auth=''){parent::__construct($params);}function get_method(){return $this->method;}function get_json_params(){return $this->json;}function get_header($name){return $this->auth;}}
class DB {
 public $prefix='test_',$insert_id=0; public $pdo;public $fail_payment=false;
 function __construct(){ $this->pdo=new PDO('sqlite::memory:');$this->pdo->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
 $this->pdo->exec('CREATE TABLE test_ygprint_orders(id INTEGER PRIMARY KEY AUTOINCREMENT,request_key TEXT UNIQUE,version INTEGER DEFAULT 1,status TEXT,issued TEXT,client_name TEXT,total_cents INTEGER,data TEXT,created_by INTEGER,created_at TEXT,updated_at TEXT)');
 $this->pdo->exec('CREATE TABLE test_ygprint_payments(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,request_key TEXT UNIQUE,amount_cents INTEGER,paid_date TEXT,method TEXT,snapshot TEXT,created_by INTEGER,created_at TEXT,voided_at TEXT,voided_by INTEGER,void_reason TEXT)');
 $this->pdo->exec('CREATE TABLE test_ygprint_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,actor INTEGER,action TEXT,data TEXT,created_at TEXT)'); }
 function prepare($q,...$values){$i=0;return preg_replace_callback('/%[ds]/',function($m)use(&$i,$values){$v=$values[$i++];return $m[0]==='%d'?(string)(int)$v:$this->pdo->quote($v);},$q);}
 function query($sql){
 if($sql==='START TRANSACTION'){$this->pdo->beginTransaction();return 0;}
 if($sql==='COMMIT'){$this->pdo->commit();return 0;}if($sql==='ROLLBACK'){$this->pdo->rollBack();return 0;}
 if(str_contains($sql,'ON DUPLICATE KEY')){
  $sql=explode(' ON DUPLICATE KEY',$sql)[0];
  try{$r=$this->pdo->exec($sql);$this->insert_id=(int)$this->pdo->lastInsertId();return $r;}catch(PDOException $e){
   if(!str_contains($e->getMessage(),'UNIQUE'))throw $e;
   preg_match("/VALUES \\('([^']+)'/",$sql,$m);$this->insert_id=(int)$this->get_var("SELECT id FROM test_ygprint_orders WHERE request_key=".$this->pdo->quote($m[1]));return 0;
  }
 }
 return $this->pdo->exec($sql);
 }
 function get_row($sql){$s=$this->pdo->query(str_replace(' FOR UPDATE','',$sql));return $s->fetch(PDO::FETCH_OBJ)?:null;}
 function get_var($sql){return $this->pdo->query($sql)->fetchColumn();}
 function get_results($sql,$mode=null){return $this->pdo->query($sql)->fetchAll($mode===ARRAY_A?PDO::FETCH_ASSOC:PDO::FETCH_OBJ);}
 function insert($table,$data){if($this->fail_payment&&str_ends_with($table,'payments'))return false;$s=$this->pdo->prepare('INSERT INTO '.$table.' ('.implode(',',array_keys($data)).') VALUES ('.implode(',',array_fill(0,count($data),'?')).')');$s->execute(array_values($data));$this->insert_id=(int)$this->pdo->lastInsertId();return 1;}
 function update($table,$data,$where){$vals=array_values($data);$sql='UPDATE '.$table.' SET '.implode(',',array_map(fn($k)=>$k.'=?',array_keys($data))).' WHERE ';$parts=[];foreach($where as $k=>$v){if($v===null)$parts[]=$k.' IS NULL';else{$parts[]=$k.'=?';$vals[]=$v;}}$s=$this->pdo->prepare($sql.implode(' AND ',$parts));$s->execute($vals);return $s->rowCount();}
}
$wpdb=new DB();require __DIR__.'/../wordpress/ygprint-erp-api/ygprint-erp-api.php';
function yes($t,$why){if(!$t)throw new Exception($why);}function rejected($fn){try{$fn();}catch(YGPrintERP\Problem $e){return;}throw new Exception('Operação deveria ter sido rejeitada');}
function call_api($name,$method,$json=[],$params=[]){return YGPrintERP\dispatch($name,new Request($method,$json,$params));}
$base=['requestKey'=>'00000000-0000-4000-8000-000000000001','clientName'=>'Cliente','status'=>'Em Produção','paymentMethod'=>'Pix','date'=>'2026-09-24','deliveryDate'=>'2026-09-27','deposit'=>20,'discount'=>10,'items'=>[['description'=>'Impressão','qty'=>2,'unitPrice'=>50]]];
$o=call_api('orders','POST',$base);yes($o['deposit']===20&&$o['balance']===70,'Sinal e saldo');
$again=call_api('orders','POST',$base);yes($again['id']===$o['id']&&count(call_api('payments','GET',[],['id'=>$o['id']]))===1,'Criação idempotente');
$receipt=call_api('receipt','GET',[],['id'=>1]);yes($receipt['snapshot']['amount']===20,'Recibo só do sinal');
$pay=['requestKey'=>'00000000-0000-4000-8000-000000000002','amount'=>30,'date'=>'2026-09-24','method'=>'Pix'];
$p=call_api('payments','POST',$pay,['id'=>$o['id']]);yes($p['order']['balance']===40,'Pagamento parcial');
yes(call_api('payments','POST',$pay,['id'=>$o['id']])['paymentId']===$p['paymentId'],'Pagamento idempotente');
$pay['requestKey']='00000000-0000-4000-8000-000000000003';$pay['amount']=50;rejected(fn()=>call_api('payments','POST',$pay,['id'=>$o['id']]));
$edit=array_merge($base,['version'=>1]);rejected(fn()=>call_api('order','PUT',$edit,['id'=>$o['id']]));
$edit['version']=2;$edit['clientName']='Nome editado';$updated=call_api('order','PUT',$edit,['id'=>$o['id']]);yes($updated['version']===3,'Versão da edição');
yes(call_api('receipt','GET',[],['id'=>1])['snapshot']['order']['clientName']==='Cliente','Recibo imutável');
$edit['version']=3;$edit['status']='Cancelado';rejected(fn()=>call_api('order','PUT',$edit,['id'=>$o['id']]));
call_api('void','POST',['reason'=>'Pagamento lançado errado'],['id'=>1]);yes(call_api('order','GET',[],['id'=>$o['id']])['balance']===60,'Estorno restaura saldo');
call_api('void','POST',['reason'=>'Repetição após perda de conexão'],['id'=>1]);yes((int)$wpdb->get_var("SELECT COUNT(*) FROM test_ygprint_audit WHERE action='void'")===1,'Estorno idempotente');
$report=call_api('reports','GET',[],['from'=>'2026-09-01','to'=>'2026-09-30']);yes($report['received']===30&&$report['outstanding']===60,'Relatório usa valores reais');
$wpdb->fail_payment=true;$base['requestKey']='00000000-0000-4000-8000-000000000099';rejected(fn()=>call_api('orders','POST',$base));yes((int)$wpdb->get_var('SELECT COUNT(*) FROM test_ygprint_orders')===1,'Falha no sinal reverte criação');
yes(YGPrintERP\guard(new Request('GET')) instanceof WP_Error,'Sem sessão rejeitado');
$token=str_repeat('a',64);$GLOBALS['transients']['ygp_s_'.hash('sha256',$token)]=['user'=>1,'stamp'=>hash_hmac('sha256','hash','test-salt')];
yes(YGPrintERP\guard(new Request('GET',[],[],'Bearer '.$token))===true,'Sessão válida');$GLOBALS['allowed']=false;yes(YGPrintERP\guard(new Request('GET',[],[],'Bearer '.$token)) instanceof WP_Error,'Sem permissão rejeitado');
echo "OK: sinal, transações/rollback, idempotência, saldo, conflito, recibos imutáveis, estorno, relatórios e permissões.\n";
