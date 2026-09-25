# Ordens de serviço YGPrint — instalação

Esta atualização mantém os campos e o HTML do documento de impressão do modelo enviado. O botão **Imprimir / Gerar PDF** abre a impressão do navegador, como no modelo; escolha **Salvar como PDF**. A numeração passa a ser gerada pelo banco para evitar duplicatas. O campo de sinal fica somente para leitura depois de salvar: novos valores são lançados em **Recebimentos e recibos**.

## 1. Atualizar o painel Next.js

Base: aplicação com recibos e o patch de limpeza já aplicados. Não reaplique os patches antigos.

Pare `npm run dev` com Ctrl+C antes de instalar dependências (no Windows isso evita o bloqueio do lightningcss).
Coloque `ygprint-ordens-servico.patch` ao lado de package.json e execute no PowerShell:

```powershell
git apply --check .\ygprint-ordens-servico.patch
git apply .\ygprint-ordens-servico.patch
npm ci
npm test
npm run build
```

Só avance se cada comando terminar sem erro. Para publicar, registre as alterações no Git e envie à branch conectada à Hostinger. A atualização não foi enviada automaticamente por este pacote.

## 2. Instalar o backend na instalação correta

No WordPress de **api.ygprint.com.br**, abra **Plugins → Adicionar plugin → Enviar plugin**. Selecione `ygprint-erp-api.zip`, instale e ative. Não é necessário extrair o ZIP. Não instale em cms.ygindica.com.br nem no WordPress antigo de erp.ygprint.com.br.

O plugin exige PHP 8.0+ e cria três tabelas InnoDB usando o prefixo do WordPress: `ygprint_orders`, `ygprint_payments` e `ygprint_audit`. Não apaga tabelas existentes nem usa dados do plugin YG Indica. Dados da empresa ficam na opção `ygprint_erp_company`. Desativar o plugin não exclui ordens e pagamentos. Faça backup de arquivos e banco pela hospedagem antes da instalação.

Não existe importação automática das ordens do HTML local nem das precificações/recibos manuais. Esses registros ficam onde já estavam. O novo módulo inicia sem ordens no banco.

## 3. Configurar a aplicação Node.js na Hostinger

No painel da aplicação **novoerp.ygprint.com.br**, configure as variáveis de ambiente abaixo e faça nova implantação:

| Nome | Valor |
| --- | --- |
| `YGPRINT_WP_API_URL` | `https://api.ygprint.com.br/wp-json/ygprint-erp/v1` |
| `YGPRINT_APP_ORIGIN` | `https://novoerp.ygprint.com.br` |

Não use prefixo NEXT_PUBLIC. Nenhuma dessas variáveis contém senha. Quando mudar o domínio do painel, atualize YGPRINT_APP_ORIGIN. Mantenha raiz do projeto, build `npm run build` e inicialização `npm start`; o projeto agora tem uma rota de servidor, portanto não hospede como exportação puramente estática.

Para teste no VS Code, crie um arquivo `.env.local` (não enviar ao Git):

```dotenv
YGPRINT_WP_API_URL=https://api.ygprint.com.br/wp-json/ygprint-erp/v1
YGPRINT_APP_ORIGIN=http://localhost:3000
```

Depois execute `npm run dev`. Configure localhost somente no ambiente local.

## 4. Cache

As rotas retornam `Cache-Control: private, no-store` e fazem atualização por nova consulta após salvar. O plugin informa ao LiteSpeed para não armazenar as respostas. Qualquer regra externa de cache/CDN deve excluir `/wp-json/ygprint-erp/` no WordPress e `/api/erp/` no painel; não use “cache de tudo” nessas rotas.

## 5. Uso

1. Abra **Ordens de serviço** e entre com uma conta administradora do WordPress da gráfica. Esta primeira versão permite somente administradores; funções de atendente e operador ainda não foram adicionadas.
2. Em **Empresa**, confira nome, CNPJ, contato, endereço e logo. As novas ordens guardam uma cópia desses dados; alterações posteriores não mudam os documentos antigos.
3. Preencha cliente, itens, valores, datas, status, desconto e eventual entrada. Salve e confira a mensagem de confirmação do banco e o número gerado.
4. Use **Gerenciar** para buscar por nome ou número, filtrar status e abrir ordens. A lista é paginada, com 100 ordens por página.
5. Use **Recebimentos e recibos** para pagamentos posteriores. A entrada inicial já cria um recebimento; não a registre novamente. Cada pagamento tem recibo próprio e pode ser reimpresso pelo link. O recibo tem o valor recebido naquela operação, mesmo quando o pedido foi pago em partes.
6. Para corrigir um recebimento errado, use **Estornar** com motivo. Isso registra a correção no banco; não faz uma devolução bancária automática. O recibo original continua disponível com a marca ESTORNADO.
7. A ação de cancelar preserva a ordem no histórico e exige estorno dos recebimentos anteriores. Não há exclusão definitiva na interface.
8. Em **Relatórios**, escolha o período. Ordens são agrupadas por emissão e status. Recebimentos válidos usam data de pagamento. Saldo é o saldo **atual**, das ordens aprovadas emitidas no período, e não um saldo histórico fechado. Estornos usam data de registro em UTC. CSV exporta as ordens emitidas no período, inclusive canceladas e orçamentos com suas identificações. Não há relatório de lucro, pois os custos ainda não são vinculados às ordens.

A aba **Recibos** mantém o gerador manual anterior, ainda local. Os recibos originados em O.S. são guardados no WordPress e abertos pela lista de recebimentos da ordem. Precificações e cadastros da loja continuam locais nesta etapa; não há baixa automática de estoque nem vínculo automático com o catálogo.

## 6. Teste após a implantação

- Entrar, salvar uma O.S. de teste, sair e reabrir em outro navegador/dispositivo. O mesmo número e os mesmos dados devem aparecer.
- Simular uma ordem de R$ 100,00, desconto de R$ 10,00 e entrada de R$ 20,00: total R$ 90,00, saldo R$ 70,00 e recibo de R$ 20,00. Receber R$ 30,00: saldo R$ 40,00.
- Conferir PDF/impressão A4 com cabeçalhos/rodapés do navegador desativados e escala 100%. Ative impressão de fundos para manter as cores do modelo.
- Abrir a mesma ordem em duas abas. Salvar na primeira e tentar salvar na segunda deve informar conflito em vez de sobrescrever.
- Conferir relatório, recibo e estorno. Usuários sem permissão e visitantes não devem acessar dados pela API.

## Verificação de desenvolvimento e limites

`npm test` cobre o fluxo do formulário com API simulada, preservação do markup impresso, escaping, erro sem falso salvamento e sessão HTTP com cookie protegido, rejeição de origem e ausência de sessão. Os testes anteriores de precificação continuam incluídos.

Com PHP CLI instalado, execute:

```sh
php tests/orders-domain.php
php tests/orders-workflow.php
```

Os testes PHP cobrem cálculo no servidor, validação, entrada/pagamento, repetição de operações, conflito de versão, estorno, recibo imutável, permissões e rollback. O fluxo de dados foi executado com adaptador SQLite em memória; os bloqueios/concorrrência de InnoDB e a instalação específica da Hostinger ainda precisam do teste real acima. Não houve teste visual de PDF/impresso neste ambiente; o documento HTML foi comparado ao modelo original. Não declare a implantação concluída antes de verificar o salvamento no WordPress em produção.
