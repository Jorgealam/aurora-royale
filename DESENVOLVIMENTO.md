# Desenvolvimento e reconstrução

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| game/core.js | Armas, dano, munição, terreno, colisões, índice espacial, física, zona e A*; também exporta CommonJS para testes |
| game/world.js | Texturas procedurais com normal maps, terreno com mistura por shader, grama/árvores com vento, casas e demais construções, céu dinâmico e hora do dia, armas, soldados com esqueleto (SkinnedMesh, 1 draw call cada), itens com raridade |
| game/fx.js | Pós-processamento HDR (bloom, god rays, ACES, gradação, vinheta, granulação, aberração, MSAA), partículas, traçantes, marcas de impacto, chuva, poeira, vaga-lumes, pássaros, textos flutuantes |
| game/game.js | Loop, controles, combate, granadas, IA tática, áudio sintetizado, clima/dia-noite, inventário, partida, HUD, benchmark e API do modo desenvolvedor |
| game/dev.js | Painel do modo desenvolvedor (F1) |
| game/index.html / style.css | Interface em português |
| index.html (raiz) | Redireciona o GitHub Pages para `game/` |
| tools/serve.cmd | Servidor local sem instalar Node.js (usa o runtime do Electron empacotado) |
| main.cjs | Janela Electron com isolamento de contexto, sandbox e Node desativado no renderer |
| tests/core.test.cjs | Testes de simulação com node:test |
| tests/renderer.test.js | Testes executados no renderer real do Electron |
| tools/server.cjs | Servidor opcional de desenvolvimento em loopback |
| tools/build-windows.ps1 | Reconstrução portátil com runtime oficial e SHA-256 fixado |

Não há etapa de transpile, bundler ou download de assets no runtime. A versão local Three.js 0.160.1 mantém a interface global `THREE` da base. Electron 44.7.0 fornece Chromium 152 e o executável Windows x64. As versões foram fixadas e efetivamente executadas nesta entrega. Para distribuir atualizações futuras, revise o suporte e as versões dos runtimes.

## Executar a fonte

Com Node.js e Electron disponíveis, na pasta do projeto:

```powershell
node --test tests/core.test.cjs
npm install
npm start
```

`npm install` requer internet e só é necessário para trabalhar com uma instalação própria de Electron. O aplicativo portátil já contém o runtime. Outra opção é executar `Windows/AuroraRoyale.exe` diretamente; ele usa a cópia da fonte empacotada em `Windows/resources/app`.

## Reconstruir o Windows portátil

```powershell
pwsh -File tools/build-windows.ps1
```

O script baixa o ZIP oficial Electron 44.7.0, verifica o hash do release, extrai o runtime e copia o jogo para `Windows/resources/app`. Alternativa com o ZIP já disponível:

```powershell
pwsh -File tools/build-windows.ps1 -RuntimeZip C:\caminho\electron-win64.zip
```

Se editar `game/` e executar o aplicativo existente sem reconstruir, ele continuará usando a cópia anterior em `Windows/resources/app`. Rode o script novamente para sincronizar a fonte.

## Testes de integração

```powershell
.\Windows\AuroraRoyale.exe --test --test-visible --report=.\test-results
```

A janela abre temporariamente, executa controles e sistemas, simula uma partida com 32 bots e depois roda o benchmark real por 30 segundos. O processo encerra com código 0 quando os testes passam. O teste acelerado mantém o jogador com vida alta apenas para acompanhar a eliminação dos bots pela zona; o jogo normal não contém esse modo de invulnerabilidade. Os hooks de mutação de teste só são expostos quando a página é carregada com `?test=1` pelo modo de teste.

A opção `--test` sem `--test-visible` funciona para lógica, mas uma janela oculta pode limitar requestAnimationFrame. Não use o FPS de uma janela oculta como medição de gameplay. Os relatórios definitivos foram gerados com a janela visível.

## Decisões e limites técnicos

- Física em passos de 1/60 s, com no máximo seis passos por quadro. Atrasos maiores que 100 ms são descartados para evitar saltos físicos; o benchmark registra tempo de simulação descartado.
- Pool de 192 projéteis; loot limitado a 220 objetos. Objetos e geometrias temporárias são descartados ao reiniciar. Materiais e geometrias compartilhados persistem.
- Estruturas são agrupadas por material; árvores e grama usam InstancedMesh. Objetos de loot ficam invisíveis além de 95 m. A engine faz frustum culling; não há sistema completo de LOD em múltiplos níveis.
- Bots reconsideram objetivos aproximadamente a cada 0,4–0,55 s, com avaliação de rotas menos frequente. A* limita a busca a 2800 nós por consulta.
- O benchmark mede intervalos de requestAnimationFrame. Contadores de draw calls e triângulos são do último quadro, não picos históricos. O relógio usado no JSON é UTC.
- Som sintetizado: sem samples externos. Texturas e modelos gerados em código: sem licenças de assets externos adicionais.
- Não há WebGPU, SSAO, ray tracing, multiplayer ou servidor. Não há física de fluidos, personagens com esqueleto skinned ou colisões detalhadas por triângulo.
- A interface usa uma fonte do sistema, de modo que a aparência pode variar um pouco entre instalações Windows.
- O processo bloqueia navegação e novas janelas; o renderer tem CSP local e não tem acesso ao Node. Referências de implementação: [segurança Electron](https://www.electronjs.org/docs/latest/tutorial/security) e [WebGLRenderer Three.js](https://threejs.org/docs/pages/WebGLRenderer.html).

## Preservação

O HTML em `original/` não foi modificado. Sua existência local e os bytes preservados são verificáveis pelo manifesto SHA-256. Não se afirmou que ele é o anexo ausente da conversa. A versão final é um único aplicativo integrado, com vários arquivos de código por responsabilidade, não blocos de jogos independentes.
