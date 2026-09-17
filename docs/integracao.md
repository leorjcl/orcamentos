# Integração — próxima etapa

A referência visual define linguagem e organização, não integrações prontas. Não há telemetria, câmeras ou leitura de CMYK.

1. Confirmar WordPress em api.ygprint.com.br, HTTPS e opção Node.js para hospedar o Next.js. Não alterar o domínio atual antes de validar o novo ambiente.
2. Implementar plugin exclusivo do ERP com tabelas próprias para materiais, máquinas, custos, produtos, composições e revisões de preços. O banco é o MySQL do WordPress; não reutilizar tabelas do plugin antigo sem mapear o esquema e planejar migração.
3. Definir autenticação de usuários e permissões. Separação de domínios exige desenho explícito de sessão; cookies/nonces do painel WordPress não autenticam automaticamente o frontend separado. Nenhuma senha administrativa deve entrar em código público ou em variáveis NEXT_PUBLIC_.
4. Expor REST com validação, permissões, mensagens de erro reais e resposta do registro persistido. O formulário só comunica sucesso após confirmação do servidor.
5. Dados privados de ERP: requisições sem cache e respostas privadas/no-store, exclusão das rotas no cache Hostinger/CDN, atualização da lista após gravação. Testar criar/editar/listar em duas abas e outro dispositivo; não depender de limpar cache.
6. Incluir cadastro de materiais e máquinas, composição com múltiplos insumos, estoque por movimentos, pedidos e produção. Custo histórico do orçamento deve ser preservado em vez de recalculado silenciosamente com preços atuais.
7. Só substituir o sistema atual após testar login, salvar/listar/editar, permissões e recuperação de backup. Os rascunhos locais precisam de uma importação validada, não de migração automática sem revisão.

Referências consultadas:
- https://nextjs.org/docs/app/getting-started/installation
- https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/
