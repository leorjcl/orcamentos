# Recibos

A rota `/recibos` usa a navegação do ERP e incorpora o gerador em um iframe da mesma origem. O isolamento preserva as classes, fontes e dimensões do modelo enviado, sem interferência do CSS global do Next.js. A opção de tela cheia abre `/recibos/index.html`.

Todos os campos do modelo foram mantidos. O HTML interno de `receiptContainer` é idêntico ao original: marca PAGO, logo, dados da empresa, número/data, faixa de total, cliente, tabela, extenso, observações e assinaturas. Na impressão, o formulário e os controles são ocultados; o grid externo passa a bloco para ocupar a folha A4. Para imprimir, use o botão Imprimir do gerador. Desative cabeçalhos/rodapés do navegador e mantenha escala 100%. O PDF usa o html2pdf do modelo original.

Os arquivos de Tailwind 3.4.17, Inter, Font Awesome 6.4.0 e html2pdf.js 0.10.1 ficam em `public/recibos/assets`, com licenças. Não é necessário um CDN para abrir ou imprimir. Tailwind é pré-compilado a partir das classes deste HTML e da configuração brand do modelo; alterações futuras nas classes exigem regenerar esse CSS.

## Persistência

Somente no navegador, com as chaves do modelo: `ygprint_receipts_history`, `ygprint_company_data`, `ygprint_last_receipt_num`. A integração WordPress não faz parte desta alteração. Arquivos HTML abertos fora do domínio têm outro armazenamento e não são importados automaticamente.

Salvar novamente um recibo carregado atualiza o mesmo registro. Novos registros recebem UUID. Dados da empresa são copiados para o recibo salvo para preservar documentos antigos. A sequência é local e editável; não é uma sequência compartilhada entre dispositivos. Erros de leitura/gravação são exibidos sem apagar o histórico existente.

## Verificação

- `npm run build`: inclui `/recibos`, sem erros TypeScript.
- `npm run lint` e 15 testes de precificação/cadastros: aprovados.
- Verificação em DOM simulado: exemplo de R$ 460,00, novo número, salvar/carregar/editar sem duplicação, caracteres especiais nos itens, rejeição de negativos, arredondamento, valor por extenso e falha de armazenamento preservando o histórico.
- Comparação textual: todos os campos com ID e todo o HTML do documento de impressão preservados.
- Impressão física e aparência do PDF ainda devem ser conferidas no navegador do usuário; não foram verificadas visualmente neste ambiente.
