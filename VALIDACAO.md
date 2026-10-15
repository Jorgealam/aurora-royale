# Validação da entrega

## Versão 2.0 — 14 de outubro de 2026

- **14/14 testes de simulação** passaram (runtime Node do Electron empacotado, `ELECTRON_RUN_AS_NODE=1`).
- **25/25 testes de integração** passaram em `Windows/AuroraRoyale.exe --test --test-visible`, com a fonte 2.0 sincronizada em `Windows/resources/app`. Código de saída 0.
- Partida acelerada com 32 bots terminou pela zona em 366 s simulados, um sobrevivente, sem valores inválidos.
- Benchmark de 30 s na GPU **AMD Radeon RX 580 (ANGLE/D3D11)**, qualidade Alta, janela 1366 × 820: **≈102 FPS médios**, p95 16,6 ms, ≈257 draw calls, ≈1,5 milhão de triângulos.
- Executado também no navegador Chromium (servidor local `tools/serve.cmd`), sem erros no console. Relatórios e capturas em `evidencias/`.

## Versão 1.0

**Data local:** 12 de outubro de 2026, America/Sao_Paulo. Relatórios JSON usam UTC.

## Resultado

- **14/14 testes de simulação passaram**, usando Node.js 24.19.0.
- **25/25 testes de integração passaram**, tanto na fonte quanto em **Windows/AuroraRoyale.exe** já empacotado. O processo do executável encerrou com código **0**.
- O aplicativo efetivamente criou o contexto WebGL, renderizou o mundo, executou combate e mediu quadros reais. As capturas em `evidencias/gameplay.png` e `evidencias/menu.png` são imagens do aplicativo, não mockups.
- A cópia histórica tem o mesmo SHA-256 do HTML localizado nos Downloads: `e89a3c3faabc0e61618933f287b6f6234462198ebd814e4d357d02bef5db506d`.

## Cobertura de testes

Os testes de simulação verificaram as 12 configurações de armas, colisão de tiros com paredes finas, segmentos paralelos e tangentes, índice espacial, bloqueio e deslizamento do personagem, salto, aterrissagem, dano de queda, plataformas, degraus, tetos, conservação de munição, armadura, navegação A* e zona até raio zero.

No renderer real, os testes acionaram o botão de jogar, injetaram eventos de teclado, verificaram movimento e salto, pausa de inventário, mapa, recarga por duração, tratamento e interrupção por dano, placa, tiro em bot, linha de visão, coleta/substituição/troca/descarte de armas, todos os modelos, combate entre bots, dano de zona, vitória e derrota. Também reiniciaram o treino várias vezes, aplicaram os quatro presets e executaram o benchmark.

Uma partida acelerada com **32 bots** terminou após **310,1 segundos de simulação / 18.606 passos**, com um sobrevivente. Nesse teste específico, o jogador recebeu vida alta para observar os bots e o fechamento da zona. Isso **não** valida a dificuldade de uma partida humana normal, nem corresponde a cinco minutos jogados manualmente.

As contagens de geometrias antes e depois de quatro reinícios seguidos do treino permaneceram iguais no relatório, sem crescimento cumulativo nesse cenário. Não se fez uma análise completa de heap nem um teste de muitas horas. O áudio foi chamado pelo jogo durante a execução, mas não houve avaliação auditiva humana. A validação dos controles é automatizada; não se alegou uma sessão manual completa.

## Benchmark real do executável portátil

Fonte: `evidencias/integracao-windows.json`, campo `benchmark`.

| Medida | Resultado |
|---|---|
| Duração real | 30,0037 s |
| Área renderizada | 1350 × 781, escala 1,0 |
| Qualidade / bots | Média / 20 |
| FPS médio | **119,84** |
| Tempo de quadro mediano | 8,3 ms |
| P95 / P99 | 8,4 / 8,5 ms |
| Amostras após aquecimento | 3357 quadros |
| Draw calls / triângulos do último quadro | 272 / 154.962 |
| Tempo de simulação descartado por atrasos | 1,5502 s |
| Renderizador | ANGLE, AMD Radeon RX 580 **2048SP**, Direct3D11 |
| Electron / Chromium | 44.7.0 / 152.0.7977.130 |

Uma rodada anterior da fonte final mediu 119,49 FPS na mesma resolução e preset. A medição usa requestAnimationFrame e pode refletir o limite de atualização do monitor. Não é um benchmark independente de GPU, não representa o pior caso e não comprova 119 FPS em 1920 × 1080 ou em Ultra. O teste usa câmera automática e bots ativos, sem zona. Use o benchmark do próprio jogo na resolução em que você pretende jogar.

## Hardware identificado

- CPU consultada: **AMD Ryzen 5 5500**, 6 núcleos / 12 threads.
- GPU identificada pelo contexto WebGL: **RX 580 2048SP**. A quantidade de VRAM não foi comprovada pelo teste.
- Memória reportada pelo sistema consultado: **8.455.507.968 bytes**, aproximadamente 7,88 GiB. O pedido informou um perfil de 16 GB; essa capacidade não foi presumida como capacidade efetiva do ambiente de teste.
- Aceleração WebGL e composição por GPU constam como habilitadas no relatório.

Os arquivos `evidencias/cpu.json` e `evidencias/ram.json` preservam apenas os campos usados nessa identificação.

## Correções durante a validação

Foi corrigida a aterrissagem após subir um degrau e preservada a arma substituída quando o chão chega ao limite de objetos. O benchmark passou a medir 30 segundos de relógio real, com aquecimento por tempo, em vez de depender de 30 segundos de simulação e de uma quantidade fixa de quadros. Janelas ocultas limitaram requestAnimationFrame na primeira rodada; as medições definitivas usaram janela visível. Perda de foco pausa o jogo normal, e é ignorada somente no modo de testes automatizados para não interromper o benchmark do harness.

O único aviso de console registrado nas rodadas finais é a depreciação da build global do Three.js. Não foram registrados erros JavaScript ou falhas de shader nesses testes.

## Integridade e reprodução

O ZIP oficial do Electron teve seu SHA-256 comparado ao arquivo de checksums do release antes da extração. `SHA256SUMS.txt` permite conferir os arquivos entregues:

```powershell
pwsh -File tools/check-integrity.ps1
```

Esse manifesto serve para detectar alteração ou cópia incompleta; não é uma assinatura de publicador. Instruções para repetir os testes estão em `DESENVOLVIMENTO.md`.
