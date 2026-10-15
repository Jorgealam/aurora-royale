# Aurora Royale

Battle royale 3D em primeira pessoa para navegador e Windows. Contém 12 armas, bots, inventário, zona e campo de treino.

## Jogar

O endereço definitivo será registrado após a publicação no GitHub Pages. Use teclado e mouse; esta versão não possui controles de toque.

## Offline

Abra o jogo online uma vez e aguarde **Disponível offline neste navegador**. Depois, o mesmo endereço pode abrir sem internet no mesmo navegador e perfil. Não é necessário instalar como PWA. Não há manifest de instalação nesta versão. Limpar os dados do site, usar navegação privada ou a limpeza automática do navegador pode remover o cache. O primeiro acesso em outro aparelho exige internet.

Atualizações são baixadas quando há conexão. Ao aparecer o aviso de atualização pronta, feche todas as abas do jogo e abra novamente; isso evita trocar arquivos no meio da partida. O cache é específico deste repositório e não apaga dados de outros sites.

## Executar e atualizar

- Testes: `node --test tests/core.test.cjs`.
- Servidor de desenvolvimento original: `node tools/server.cjs` (porta 8080; serve apenas game/ e não testa o cache da raiz).
- Após alterar arquivos, execute `node tools/build-offline.cjs` para atualizar o cache local.
- Envie mudanças para `main`. A automação do GitHub executa os testes, gera a versão do cache e publica apenas index.html, sw.js e game/.
- Para testar offline localmente, sirva a raiz do projeto por HTTP em localhost, nunca por file://.

Windows/, node_modules/, .claude/, evidências locais e arquivos temporários não são publicados. As licenças de terceiros estão em TERCEIROS.md e game/vendor/THREE-LICENSE.txt. A base histórica em original/ não é carregada pelo jogo.
