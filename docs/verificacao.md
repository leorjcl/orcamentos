# Verificação desta entrega

- 7 testes de cálculo passaram (`npm test`).
- ESLint passou (`npm run lint`).
- Build Next.js e TypeScript passaram (`npm run build`).
- O lockfile anterior estava inconsistente; foi atualizado mantendo as versões diretas. `npm ci --dry-run --ignore-scripts --no-audit --no-fund` passou.
- A conferência visual e os testes interativos no navegador ficaram pendentes: o navegador remoto bloqueou o endereço do servidor local. Não houve teste em uma instalação WordPress real.

## Conferência no seu navegador

1. Execute `npm ci` e `npm run dev`; abra `http://localhost:3000`.
2. Entre em Precificação, informe um nome, preço de embalagem de R$70, conteúdo 1 e consumo 1. Mantenha margem 30%, demais custos e taxas zerados. Deve sugerir R$100 por peça.
3. Salve o rascunho e use o link “Ver produtos”. Ele deve aparecer imediatamente. Recarregue, edite o nome/preço e confirme que atualiza a mesma linha.
4. Em impressão digital, use 100 peças, 10×20cm, duas faces, cobertura 50%, 10ml/m². Deve mostrar 4m² e 20ml antes da reserva.
5. Verifique o menu no celular e se o resumo e a confirmação de gravação continuam acessíveis.

As entradas deste roteiro são exemplos de teste, não custos reais da empresa.
