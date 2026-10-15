# Preparação para GitHub Pages — 15/10/2026

## Estado

Arquivos preparados para publicar. O link de produção só será confirmado depois da criação do repositório, envio e conclusão do deploy no GitHub. A autenticação do GitHub CLI está pendente de autorização pelo proprietário no Microsoft Edge.

## Alterações

- game/offline.js registra o service worker e mostra o estado do cache no menu.
- game/index.html carrega esse script e permite conexões apenas à própria origem.
- sw.js pré-carrega os 12 arquivos locais necessários, incluindo o redirecionamento da raiz e o Three.js.
- tools/build-offline.cjs calcula a versão pelo conteúdo; alterações produzem outro cache.
- .github/workflows/pages.yml executa os testes, gera o cache e publica apenas os arquivos do site. Exige GitHub Pages configurado com origem GitHub Actions e permissão para enviar workflows.
- README.md explica offline, atualizações e limitações de entrada.
- tests/offline.test.cjs contém oito verificações do ciclo de vida do cache e caminhos de subdiretório.
- .gitignore exclui runtime Windows, dependências, evidências locais e arquivos de ambiente.

Não foi criado manifest de PWA nem instalação obrigatória. O jogo requer teclado e mouse; não foram adicionados controles de toque. Não houve alterações na lógica do combate, mapa, física ou bots. O executável Windows existente foi preservado.

## Validação

- 22 testes automatizados aprovados: 14 existentes de lógica e oito do service worker em ambiente simulado.
- Sintaxe de sw.js e game/offline.js conferida pelo Node.
- Nenhuma correspondência encontrada na busca dos formatos usuais de token GitHub, chave privada e chave AWS nos arquivos candidatos à publicação. Isso não equivale a uma auditoria completa de segredos.
- A tentativa de teste gráfico em perfil temporário falhou ao carregar localhost com ERR_FAILED, após falha do serviço de rede do runtime. Não foi possível confirmar abertura offline real nem atualização entre abas nesta sessão. Não há aprovação de teste gráfico.

## Teste posterior no endereço publicado

1. Abrir o endereço online e esperar Disponível offline neste navegador.
2. Iniciar campo de treino e verificar movimentação, disparo e bots.
3. Desconectar a rede e reabrir o mesmo endereço, no mesmo navegador e perfil.
4. Confirmar que menu e partida carregam.
5. Ao publicar atualização, abrir online; se houver aviso de atualização pronta, fechar todas as abas do jogo e abrir novamente.

O primeiro acesso em outro dispositivo exige internet. Limpeza de dados, modo privado e políticas de armazenamento podem remover o cache. Isso não é streaming nem acesso remoto ao PC.

Backup dos arquivos alterados: C:/Users/jorge/Documents/Codex/AuroraRoyale-backup-publicacao-20261015.
