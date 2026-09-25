# YGPrint — novo ERP (precificação simplificada)

Frontend Next.js baseado na referência visual enviada. O painel antigo em produção não foi alterado. Esta versão substitui o protótipo anterior de orçamento na raiz do repositório; esse protótipo permanece no histórico Git.

## Rodar no VS Code / Windows

Instale Node.js 22.13 ou superior. Na pasta que contém `package.json`:

```powershell
npm ci
npm run dev
```

Abra http://localhost:3000. Para verificar a versão de produção: `npm run build` e depois `npm start`.

## Separação dos projetos

Este repositório contém somente o frontend Next.js da gráfica YGPrint. O WordPress instalado em `api.ygprint.com.br` é uma instalação separada: não envie o conteúdo deste repositório para a pasta do WordPress. O código do plugin ERP fica em `wordpress/ygprint-erp-api`; a conexão só passa a funcionar após sua instalação e configuração. O YG Indica é outro projeto e seus plugins, conteúdos e configurações não pertencem a este ERP.

## Ordens de serviço com WordPress

A rota `/ordens-servico` mantém o modelo fornecido e passa a usar a API do plugin exclusivo em `wordpress/ygprint-erp-api`. Inclui login, ordens, recebimentos, recibos vinculados e relatório/CSV. Esta parte exige instalar o plugin e configurar a conexão na Hostinger. Veja `docs/instalacao-ordens-servico.md`. Precificações e recibos manuais anteriores continuam locais.

## Orçamentos e pedidos

A rota `/orcamentos` reúne propostas e pedidos salvos no WordPress. Orçamentos têm validade e aprovação explícita; aprovar inicia a produção no mesmo registro. Inclui filtros, CSV e acesso aos recebimentos/recibos da O.S. Requer atualizar o plugin para **0.2.0**. Veja `docs/atualizacao-orcamentos-pedidos.md`.

## Implementado

- `/recibos`: gerador, impressão/PDF e histórico local; ver `docs/recibos.md`.
- Layout responsivo YGPrint: menu, visão geral, cartões e tabela de produtos.
- `/precificacao`: calculadora de lote para 3D, impressão digital e outros produtos.
- Custo de matéria-prima, tinta estimada, reserva de consumíveis, depreciação, manutenção, energia, mão de obra, rateio fixo, acabamento e embalagem.
- Impostos, taxas, margem sobre venda, markup, preço unitário e lucro estimado do lote.
- `/produtos`: salvar, listar, buscar, editar e exportar rascunhos locais. Atualiza imediatamente após salvar e sincroniza a lista entre abas do mesmo navegador.
- `/configuracoes`: custos da loja, materiais e impressoras reutilizáveis, com gravação local.
- Tela do produto reduzida a dados do serviço; ajustes e composição do custo recolhidos.
- Perfis de tinta por custo medido de uma face A4 (texto, colorida e foto). Valores desconhecidos geram aviso de preço parcial.
- Duplicação de precificações e preservação dos custos históricos de cada rascunho.

Os rascunhos usam localStorage, limitados a 200 registros. **Não são cadastros no WordPress**, não sincronizam entre dispositivos e podem desaparecer ao apagar os dados do navegador. Exportação JSON disponível; ainda não há importação. Custos devem ser revisados antes do uso comercial. Zeros iniciais significam valores ainda não preenchidos; não há custos reais presumidos. 5.000 horas de vida útil, 160 horas mensais e margem de 30% são exemplos editáveis, não recomendações.

## Regras do cálculo

Todos os consumos, tempos e custos extras são do **lote inteiro**. Somente a estimativa de tinta multiplica a área por quantidade e faces. Consumo de papel/filamento não é multiplicado novamente.

- Material = preço da embalagem × consumo / conteúdo.
- Tinta = largura(cm)/100 × altura(cm)/100 × faces × quantidade × cobertura/100 × ml/m² a 100%.
- Tinta usa preço médio por ml e cobertura média por face; calibrar na máquina/mídia/qualidade. Não analisa a arte nem separa CMYK. Limpezas precisam entrar na reserva de manutenção.
- Reserva de material = (material + tinta) × percentual. Não representa taxa de falha de impressão e não cobre reimpressão, energia ou trabalho perdido.
- Depreciação = (aquisição − residual) / vida útil em horas × horas do lote.
- Energia = watts/1000 × horas do lote × tarifa efetiva por kWh. Energia solar não implica custo automaticamente zero.
- Mão de obra = minutos de trabalho ativo/60 × valor/hora.
- Fixos = despesas mensais / horas produtivas mensais × horas de máquina do lote. Não incluir novamente custos já computados; a base de horas precisa ser consistente quando houver várias máquinas.
- Venda = custo / (1 − impostos − taxas − margem). Soma dos percentuais precisa ser menor que 100%.
- Preço por peça arredondado para cima em centavos. Lucro e margem exibidos refletem o preço arredondado e apenas os custos informados.

Este primeiro formulário trabalha com uma matéria-prima e uma máquina por simulação. Composição com múltiplos materiais, estoque e cadastro central de clientes ainda serão implementados. Ordens têm módulo próprio com autenticação e API WordPress; o catálogo de precificação ainda não está vinculado às ordens. Indicadores de faturamento/produção não são simulados.

## Testar

```powershell
npm test
npm run lint
npm run build
```

Os testes de cálculo cobrem margem versus markup, lote 3D, unidades e cobertura de tinta, energia, arredondamento e entradas inválidas. `dev`, `build` e `start` usam apenas Next.js. A infraestrutura antiga de Vinext/Cloudflare e os exemplos de banco D1 foram removidos; continuam recuperáveis pelo histórico Git. A implantação do painel é na Hostinger, em `novoerp.ygprint.com.br`.

## Integração planejada

- Painel novo: `https://novoerp.ygprint.com.br`.
- ERP antigo: `https://erp.ygprint.com.br` (migração pendente).
- WordPress/API: `https://api.ygprint.com.br`.
- MySQL da Hostinger acessado por plugin WordPress, nunca diretamente pelo navegador.

Ver `docs/integracao.md` para as decisões pendentes.


## Usar a tela simplificada

1. Em **Custos e cadastros → Minha loja**, salve despesas mensais, horas de produção e margem padrão. Energia, mão de obra adicional e taxas ficam recolhidas. Se retiradas já estiverem nos fixos, evite repeti-las em mão de obra.
2. Em **Materiais**, cadastre preço e conteúdo da embalagem. Para papel, o formato A4 preenche 21 × 29,7 cm. Para filamento, a unidade é grama.
3. Em **Impressoras**, informe nome e custos do equipamento. Os custos de tinta por perfil são estimativas medidas por face A4; não foram preenchidos automaticamente com valores do fabricante. Campos vazios indicam custo ainda não conhecido.
4. Na precificação, escolha material e impressora e informe quantidade e tempos totais. Em papel, o consumo padrão é uma folha por impresso, ajustável em **Ajustes deste produto**; a área também pode ser ajustada. O tempo continua sendo do lote inteiro e deve ser revisto quando mudar a quantidade.
5. Abra **Ver composição do custo** somente quando quiser conferir cada parcela. O rateio fixo continua com a mesma fórmula da primeira etapa.

Cada produto salva uma cópia dos valores utilizados. Editar um material ou uma impressora não muda silenciosamente um rascunho antigo. O botão **Aplicar custos atuais** atualiza explicitamente os valores da loja e dos cadastros vinculados, preservando consumo e área. Rascunhos anteriores sem vínculos continuam calculando com seus próprios valores; a seleção de um novo cadastro substitui somente a parte correspondente.

Em Configurações, **Reaproveitar valores de um rascunho** copia dados para revisão no formulário, sem salvar automaticamente. Tinta no modelo antigo em ml/m² continua funcionando nos rascunhos; os novos perfis por custo/A4 precisam ser preenchidos depois da medição. Não convertemos valores incertos em custos confirmados.

A gravação de rascunhos segue usando a mesma chave local anterior. Cadastros usam `ygprint:presets:v1`. Nenhum dado do WordPress é lido ou alterado. Use o mesmo navegador e domínio para manter os dados locais.
