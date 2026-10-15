# Aurora Royale — PC e celular

Atualização de 15/10/2026. Endereço: https://jorgealam.github.io/aurora-royale/

## Controles

O menu CONTROLES permite Automático, PC e Celular. Automático detecta tela de toque; a preferência fica apenas neste navegador. Teclado e mouse continuam funcionando no PC.

No celular:

- Analógico à esquerda: movimento com intensidade proporcional.
- Arraste na parte direita: câmera e mira.
- Segure TIRO: disparar. Também é possível arrastar nesse botão para mirar enquanto atira.
- MIRAR: alterna a mira da arma. CORRER e AGACHAR também alternam ligado/desligado.
- PULAR, RECARGA e TROCAR: ações da arma e do personagem.
- PEGAR / USAR aparece quando há equipamento ou tirolesa ao alcance.
- BOLSA e MAPA abrem as telas existentes e pausam a simulação; PAUSA abre o menu.
- MAIS contém granada, cura, placa de escudo, lanterna, laser, inspeção, largar arma, tela cheia e painel de desenvolvedor.

Preferir a horizontal. Retrato também tem layout próprio, inclusive em 320 pixels de largura. Menus e inventário podem ser rolados. A tela cheia depende do suporte do navegador; não é obrigatória.

## Desempenho e compatibilidade

No primeiro acesso em modo de toque, o padrão é qualidade Baixa e 12 bots. Opções já salvas são respeitadas. A resolução de renderização no toque é limitada a aproximadamente 900 mil pixels e fator máximo 1; o PC mantém seus presets anteriores. Não há promessa de FPS em aparelhos não testados. A versão Windows local foi sincronizada nos arquivos do jogo, com backup antes de substituir os arquivos existentes.

## Testes

- 34/34 testes Node: 14 anteriores de lógica, oito de cache e 12 de entrada mobile.
- 25/25 testes gráficos anteriores do PC aprovados, no Electron/Chromium existente.
- 14/14 verificações de integração gráfica aprovadas: inicialização, movimento e mira por ponteiros simultâneos, ADS, disparo com consumo de munição e liberação, pulo, pausa/inventário/retorno, limites de tela, retrato, rolagem e ausência de sobreposição em tela estreita.
- Capturas conferidas em 844×390 e 390×844; teste adicional em 320×640. Ponteiros de toque foram simulados no motor real do navegador; não se trata de teste em um telefone físico.
- Nenhum erro JavaScript no teste gráfico final.
- Uma falha inicial por representação -0 do analógico foi corrigida normalizando zero. Uma repetição de teste com preferência mobile já salva usava incorretamente a expectativa PC; o harness passou a criar perfil novo por execução.

Reproduzir: npm test. Para a integração gráfica, com a dependência Electron do projeto instalada: npm run test:graphics. O teste cria perfil isolado em test-results/mobile e não usa o perfil real do jogador. --mobile-only pula a suíte gráfica anterior, já executada. Relatórios e capturas desta entrega também estão em C:/Users/jorge/Documents/Codex/AuroraRoyale-mobile-validacao.

## Atualização no celular

Abra o endereço online. Se a versão antiga ainda aparecer, aguarde o aviso de atualização, feche todas as abas do Aurora Royale e abra novamente o mesmo link. O novo cache inclui os 15 arquivos do jogo. Depois de Disponível offline neste navegador, pode testar sem internet no mesmo navegador/perfil. Limpar os dados do site remove também preferências/cache.

## Arquivos

- game/input.js: seleção de modo, analógico, mira e limite de resolução.
- game/mobile.js: ponteiros, ações, HUD e liberação segura de entradas.
- game/mobile.css: layouts de toque, retrato, paisagem e áreas seguras.
- game/game.js e game/index.html: integração com os sistemas existentes.
- tests/input.test.cjs, tests/offline.test.cjs e tests/mobile-electron.cjs: validação automatizada.
- sw.js: cache atualizado; package.json, README.md e PUBLICAR-NO-GITHUB.md: comandos e instruções.

Backup: C:/Users/jorge/Documents/Codex/AuroraRoyale-backup-mobile-20261015. O executável e as bibliotecas de terceiros não foram substituídos.
