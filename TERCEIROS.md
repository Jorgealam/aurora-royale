# Terceiros e origem dos arquivos

## Three.js 0.160.1

- Projeto: https://github.com/mrdoob/three.js
- Arquivo local: `game/vendor/three.min.js`
- Origem exata: https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js
- Licença MIT, preservada em `game/vendor/THREE-LICENSE.txt`.
- A build global emite uma advertência de depreciação. Ela foi escolhida para manter o formato da base e permitir execução local sem bundler; a advertência não é uma falha do renderer.

## Electron 44.7.0, Windows x64

- Projeto e release: https://github.com/electron/electron/releases/tag/v44.7.0
- ZIP: https://github.com/electron/electron/releases/download/v44.7.0/electron-v44.7.0-win32-x64.zip
- Checksums: https://github.com/electron/electron/releases/download/v44.7.0/SHASUMS256.txt
- SHA-256 do ZIP verificado nesta entrega: `eee30dc8fa1f5ea95490e59f44e46ea68dd24c6e93d22facf70fe5c2d4c2665c`.
- As licenças de Electron e Chromium estão preservadas em `Windows/LICENSE` e `Windows/LICENSES.chromium.html`, junto dos avisos do runtime.
- O executável oficial `electron.exe` foi copiado como `AuroraRoyale.exe`. Não se criou um instalador nem uma assinatura própria de publicador.

## Base do usuário

`original/battle-royale-base.html` é uma cópia do arquivo local `deepseek_html_20261009_6b9949.html`. A cópia preserva o conteúdo original, incluindo sua referência de CDN Three.js r128; esse HTML histórico não é carregado pelo jogo final. Sua titularidade/licença não foi alterada ou presumida.

## Conteúdo novo

Texturas, mapa, modelos, nomes de armas e efeitos de áudio foram criados em código. Não foram baixados modelos, imagens, sons ou marcas de jogos comerciais. `LICENCA-CODIGO-NOVO.txt` cobre os novos arquivos próprios, com exclusão explícita dos arquivos de terceiros e da base histórica.
