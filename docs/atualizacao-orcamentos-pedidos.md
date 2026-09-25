# YGPrint — Orçamentos e pedidos

Pacote de 25/09/2026. Requer a atualização anterior de Ordens de serviço já aplicada. Não reaplique os patches anteriores. Esta atualização foi preparada e testada localmente; não foi enviada ao seu GitHub nem instalada na sua hospedagem.

## 1. Atualizar a aplicação

Extraia este ZIP. Coloque somente `ygprint-orcamentos-pedidos.patch` na pasta que contém o `package.json` da aplicação recuperada. No terminal PowerShell do VS Code, pare o servidor local com Ctrl+C e execute um comando de cada vez:

```powershell
git apply --check .\ygprint-orcamentos-pedidos.patch
git apply .\ygprint-orcamentos-pedidos.patch
npm test
npm run build
```

Só avance quando o comando anterior terminar sem erro. Se `git apply --check` indicar erro, pare e envie a mensagem; não use `--reject` e não copie arquivos por cima do projeto. Não é necessário reinstalar dependências se a etapa anterior já foi concluída: nenhuma dependência foi adicionada.

## 2. Atualizar o plugin no WordPress

Em **api.ygprint.com.br/wp-admin**, abra **Plugins → Adicionar plugin → Enviar plugin**. Envie o arquivo `ygprint-erp-api.zip` deste pacote. Se o WordPress identificar a versão existente, escolha substituir pela versão enviada (**0.2.0**). Confira que o plugin continua ativo.

É uma atualização do mesmo plugin, não outro plugin. Não exclua tabelas, dados ou a instalação atual. As mesmas tabelas de ordens, recebimentos e histórico continuam sendo usadas; nenhum registro é apagado ou renumerado. Validade e dados de aprovação ficam no documento JSON da ordem, sem alteração do esquema do banco.

Faça esta etapa antes de publicar o novo frontend. Sem o plugin atualizado, a nova tela informa que a atualização é necessária.

## 3. Publicar pelo GitHub

Depois dos testes locais e da atualização do plugin:

```powershell
git add README.md app components public/ordens-servico wordpress/ygprint-erp-api docs/atualizacao-orcamentos-pedidos.md tests/erp-proxy.test.mjs tests/quotes-client.test.mjs tests/quotes-screen.test.mjs tests/quotes-workflow.php package.json
git diff --cached --stat
git commit -m "Adiciona orcamentos e pedidos integrados ao WordPress"
git push origin main
```

Confira a lista apresentada por `git diff --cached --stat` antes de confirmar. Não inclua arquivos `.env`, senhas ou outros projetos. O arquivo `.patch` e o ZIP do plugin não precisam ser enviados ao Git.

Aguarde a implantação automática na Hostinger. As variáveis atuais permanecem:

- `YGPRINT_WP_API_URL`: `https://api.ygprint.com.br/wp-json/ygprint-erp/v1`
- `YGPRINT_APP_ORIGIN`: `https://novoerp.ygprint.com.br`

## 4. Uso

Abra **Orçamentos e pedidos** no menu (rota `/orcamentos`). Entre com a mesma conta administradora do WordPress usada nas ordens de serviço.

1. Clique em **Novo orçamento**. Preencha cliente, itens, quantidades, valores, desconto, validade e previsão de entrega. A validade inicial sugerida é de sete dias e pode ser alterada.
2. Salve: o número é gerado no WordPress. Use o botão **Imprimir / Gerar PDF** para abrir a impressão do navegador e escolher Salvar como PDF. O modelo visual original é reaproveitado com título e validade de orçamento.
3. Quando o cliente aprovar, reabra o orçamento, confira valores e prazo e clique em **Aprovar e iniciar pedido**. Alterações pendentes precisam ser salvas antes. Orçamentos vencidos ou sem validade precisam de revisão e salvamento antes da aprovação. Datas usam o calendário configurado no WordPress para validar a aprovação.
4. O registro sai de **Orçamentos** e aparece em **Pedidos**, como **Em Produção**, mantendo número, cliente e itens. Não existe uma segunda cópia da ordem. Uma cópia da proposta aprovada fica guardada no histórico do banco, junto com usuário/data da aprovação.
5. Abra o pedido para registrar recebimentos parciais e emitir recibos. Avance para **Pronto para Retirada** e depois **Entregue**, salvando em cada etapa. Ordens criadas diretamente na aba Ordens de serviço também aparecem em Pedidos.
6. Use **Recusado** quando o cliente não aprovar. É possível reabrir como Orçamento/Aguardando Aprovação, revisar e aprovar depois. Pedidos em produção ou prontos podem ser cancelados após estornar os recebimentos. Entregues e cancelados não voltam à produção nesta versão. O histórico é preservado.
7. Filtre por cliente/número, status e período de emissão; **Exportar CSV** inclui todas as páginas dos filtros aplicados. Os relatórios financeiros e recibos continuam em **Ordens de serviço → Relatórios** e dentro de cada pedido.

A aprovação é registrada pelo operador após a confirmação do cliente; esta versão não envia WhatsApp/e-mail nem oferece link público ou assinatura digital de aceite. Os clientes são informados em cada documento; um cadastro central de clientes e o vínculo com o catálogo de precificação ainda são etapas futuras. Precificações e recibos manuais continuam com o armazenamento anterior.

Orçamentos anteriores já registrados no WordPress são reconhecidos pelo status. Se estiverem sem validade, informe a data e salve antes de aprovar. Registros antigos cancelados continuam classificados como pedidos cancelados, pois a versão anterior não distinguia a origem. Numeração é única entre orçamentos e ordens, portanto a lista de orçamentos pode ter intervalos na sequência.

A lista consulta novamente o servidor após salvar. Não há cópia local usada como banco neste módulo. Aplicação e plugin mantêm respostas privadas sem cache. A exportação CSV reflete as consultas feitas durante a exportação, não um fechamento contábil.

## 5. Conferência após publicar

- Crie um orçamento com duas unidades de R$ 50 e desconto de R$ 10: total R$ 90.
- Reabra em outro navegador/dispositivo, entrando com sua conta. Confira número e valores.
- Imprima o orçamento em A4, escala 100%, fundos ativados e cabeçalhos/rodapés do navegador desativados. Confira validade e eventual quebra de página.
- Aprove e confira o mesmo número em Pedidos. Registre R$ 20: saldo R$ 70 e recibo de R$ 20.
- Salve como Pronto para Retirada e depois Entregue. Confira filtros e CSV.

## Validação de desenvolvimento

`npm test`: 22 testes passando, incluindo calculadora, formulários, tela React, login, separação das listas, falha de consulta sem dados antigos, aprovação com erro sem falso sucesso, preservação do modelo impresso de O.S., proteção de origem e cookie.

`npm run lint` e `npm run build`: executados. Testes PHP adicionais:

```sh
php tests/orders-domain.php
php tests/quotes-workflow.php
```

O fluxo PHP usa adaptador SQLite em memória: cobre transações, idempotência, versão concorrente, pagamentos, estornos, preservação de proposta/recibo, filtros, validade, aprovação e entrega. O ambiente real MySQL/InnoDB da Hostinger ainda exige a conferência acima. O HTML impresso original foi comparado, e as alterações de texto/validade do orçamento foram verificadas no DOM; não foi possível renderizar visualmente o PDF neste ambiente.
