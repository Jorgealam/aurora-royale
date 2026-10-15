# Aurora Royale 2.0

Battle royale 3D em primeira pessoa que roda direto no navegador (Chrome, Edge ou Firefox) e também como aplicativo Windows. Partidas contra bots, campo de treino, benchmark e um **modo desenvolvedor** completo dentro do jogo. Todo o visual — texturas, modelos, céu, efeitos e sons — é gerado em código: não há arquivos de imagem, modelos ou áudio externos.

## Jogar

- **No navegador / GitHub Pages:** abra a página publicada (veja **PUBLICAR-NO-GITHUB.md**). Localmente, rode `tools\serve.cmd` e acesse `http://127.0.0.1:8080`.
- **No Windows:** abra **JOGAR.cmd** ou `Windows/AuroraRoyale.exe`.

Escolha qualidade, dificuldade e quantidade de bots e clique em **Entrar em combate**. Clique na tela para prender o mouse; **ESC** libera e pausa.

| Controle | Ação |
|---|---|
| WASD ou setas | Mover |
| Mouse / botão esquerdo | Olhar / atirar |
| Botão direito | Mirar (ADS); DMR e precisão têm luneta |
| Shift | Correr |
| Ctrl ou C | Agachar |
| Espaço | Pular |
| R | Recarregar |
| 1 / 2 / roda do mouse | Trocar arma |
| E / Q | Coletar / largar arma |
| G | Lançar granada |
| L / F | Ligar laser / lanterna |
| T | Inspecionar a arma |
| Shift (na luneta) | Segurar a respiração |
| H / J | Usar kit médico / aplicar placa |
| I / M | Inventário / mapa (pausam) |
| F1 ou ' | **Modo desenvolvedor** |
| F3 | Estatísticas rápidas |
| F11 | Tela cheia |

Seja o último sobrevivente. A zona fecha, muda de centro e causa dano direto à vida. Nos primeiros 15 segundos (fase de pouso) os bots não caçam você enquanto você não atirar. Itens no chão têm um feixe de luz colorido pela raridade: cinza (comum), verde (incomum), azul (rara), roxo (épica) e dourado (lendária).

## Mapas

Escolha o mapa no menu (campo **MAPA**). A página recarrega ao trocar. Também dá para abrir direto com `?map=island` no endereço.

- **Aurora:** continente de 9 setores (o mapa original).
- **Ilha do Medo:** ilha-presídio tropical cercada por mar raso turquesa (dá para andar na água, mais devagar). Partidas mais rápidas e intensas. Locais:
  - **Presídio** (centro, sobre um platô): muralha com arame farpado, portões norte e sul, brechas leste e oeste, quatro torres de vigia com escadas e holofotes, **Bloco A** de dois andares com celas gradeadas, galerias e pontes; refeitório, enfermaria, diretoria, quadra, ônibus e caixa d'água quadriculada.
  - **Bairro Residencial** (noroeste): casas coloridas mobiliadas, dois sobrados com escada e varanda, chafariz, parquinho e guarda-sóis na praia.
  - **Farol** (norte), **Centro de Controle** (nordeste, com radar girando, terraço e heliponto com helicóptero caído), **Zona de Processamento** (leste, fábrica de "energia misteriosa" com tanques roxos brilhando e mezanino), **Porto** (sudeste, píeres, guindastes, contêineres e um navio com convés acessível), **Casa das Caldeiras** (sul, três chaminés soltando fumaça), **Estação de Tratamento** (sudoeste, tanques circulares com pontes giratórias) e **Quartel-General** (oeste, alojamento de dois andares, bunker e bandeira).
  - **Tirolesas** amarelas ligando torres e locais: chegue perto de uma ponta e aperte **E**; **Espaço** solta no caminho.

Referência usada: o mapa "Shutter Island" (Ilha do Medo) do Blood Strike, que segue a ideia de ilha-presídio da Rebirth Island do Call of Duty (inspirada em Alcatraz). Layout, construções e modelos aqui são originais, só seguem o mesmo conceito e tipos de local.

## O que há de novo na 2.0

**Gráficos**
- Pipeline HDR com pós-processamento próprio: bloom físico, raios de sol (god rays), tone mapping ACES, gradação de cor com divisão de tons, vinheta, granulação de filme, aberração cromática, nitidez e antisserrilhado MSAA.
- Céu dinâmico com nuvens procedurais, sol, lua e estrelas; **ciclo dia/noite** completo (luz dourada no pôr do sol, noite enluarada com janelas e postes acesos, vaga-lumes).
- **Clima:** céu limpo, nublado, chuva, neblina e tempestade com relâmpagos e trovões. Sorteado a cada partida.
- Reflexos de ambiente (IBL) recalculados conforme a hora, sombras suaves, sombras de nuvens em movimento no terreno.
- Terreno com mistura de grama, terra, rocha e areia por inclinação e região; texturas geradas com mapas de relevo (normal maps).
- Até 110 mil tufos de grama animados pelo vento que se afastam quando você passa; flores, arbustos, pinheiros, carvalhos e bétulas balançando; milharal e juncos no lago.
- Água com ondas animadas, reflexo do céu e espuma na margem; barco boiando.

**Mundo**
- Casas detalhadas: telhado de duas águas com telhas, chaminé, janelas com molduras, venezianas e floreiras, porta aberta, interior mobiliado (mesa, cadeiras, cama, estante, tapete) e lâmpadas.
- Novos locais: posto de combustível com loja e letreiro, celeiro com fardos de feno, moinho de vento girando, caixa d'água, galpão industrial, cabana com fogueira no Bosque Norte, carros abandonados (alguns queimando), postes de luz, rede elétrica, barreiras de concreto, sacos de areia, barris e caixotes. Pássaros voando em bando.

**Personagens e efeitos**
- Soldados inimigos com esqueleto animado (caminhada, corrida, agachar, mira, recuo ao ser atingido, queda ao morrer), quatro uniformes camuflados e capacete com óculos; a arma do soldado muda quando ele pega outra.
- Partículas: fumaça de cano, cartuchos ejetados, faíscas, poeira e lascas de impacto, sangue, respingos na água, explosões com bola de fogo, fumaça, estilhaços e onda de luz; marcas de bala e de explosão nas superfícies; traçantes brilhantes.
- Arma em primeira pessoa com balanço, inércia do mouse, pose de corrida, animações de troca, recarga e arremesso; clarão de disparo que ilumina a cena; tremor de câmera; mira dinâmica que abre com o movimento e a rajada.
- HUD: números de dano (amarelo = cabeça), marcador de acerto e de abate, indicador da direção de onde vem o dano, anúncios de abate duplo/triplo, relógio e clima, contador de granadas, estatísticas finais (dano e precisão).

**Armas e miras (2.1)**
- As 12 armas foram remodeladas peça por peça: trilhos com dentes, guarda-mão com fendas, ferrolho, carregador curvo, quebra-chamas, bipé, cano estriado, coronha regulável, madeira na AK e no revólver, detalhes na cor da raridade (azul, roxo, dourado).
- Mira real em cada arma ao segurar o botão direito: red dot (AR5), holográfica (AK7, V9, M5), reflex verde (K45, AS12), prismática 1,8× com divisa (B5), mira aberta com pontos de trítio (P9, R44) e anel fantasma (S12). A retícula brilha dentro do vidro e as bordas da tela desfocam.
- Lunetas em tela cheia: ACOG com divisa iluminada e marcas de distância (D7) e luneta de precisão mil-dot com telêmetro (S338), com balanço de respiração (Shift segura o fôlego), franja cromática e tubo que se desloca.
- Laser (L): ponto vermelho onde você mira e disparo sem mira 40% mais preciso. Lanterna (F): ilumina à noite. Ambos deixam você mais visível para os bots.
- Tiro na cabeça: marcador dourado, número de dano dourado, capacete voando com faíscas e câmera lenta curta no abate. Atiradores inimigos mostram reflexo da luneta quando miram em você.
- Inspecionar arma (T), estilos e cores de mira configuráveis no modo desenvolvedor.

**IA e combate**
- Bots com cone de visão, percepção afetada por distância, postura, noite e neblina; reação e mira que converge com o tempo; rajadas controladas.
- Escutam tiros e explosões e vão investigar; lembram a última posição do alvo; flanqueiam; procuram cobertura quando feridos ou recarregando; curam-se; lançam granadas em quem se esconde; pulam obstáculos; coletam armas melhores, kits, placas e granadas; antecipam o fechamento da zona.
- Distância preferida conforme a arma (escopetas avançam, fuzis de precisão ficam longe e agachados).
- **Granadas** com física de quique, pavio de 2,8 s, dano por área bloqueado por paredes.
- Áudio sintetizado com reverberação, filtro por distância, sons de passagem de bala, explosões, chuva, vento, pássaros de dia e grilos à noite.

## Modo desenvolvedor (F1)

Painel lateral que funciona com o jogo rodando. Abas:
- **Jogador:** modo Deus, munição infinita, recarga instantânea, um tiro elimina, voar/atravessar paredes, velocidade e pulo, curar tudo, escolher qualquer arma, teletransporte para as 9 regiões ou para onde você mira.
- **Mundo:** hora do dia, ciclo automático e velocidade, clima, força do vento, câmera lenta, explosão na mira.
- **Gráficos:** qualidade, predefinições de visual (Cinemático, Competitivo, Noir, Verão, Inverno), cada ajuste do pós-processamento, MSAA, campo de visão, tremor, densidade da grama, escala de renderização, partículas, traçantes, números de dano e wireframe.
- **IA:** congelar bots, bots ignoram você, bots sem tiro, precisão e reação, dificuldade, criar bot na mira, eliminar ou reviver todos, mostrar estado/rota/alvo de cada bot.
- **Zona:** pausar, desativar dano, avançar fase, centralizar em você, fechar.
- **Debug:** gráfico de FPS, draw calls, triângulos, memória, posição, colisores visíveis, câmera livre, modo foto sem HUD e captura de tela PNG.

As opções ficam salvas no navegador. As trapaças são desligadas sempre que a página é recarregada.

## Desempenho

Comece em **Alta** num PC com placa dedicada; use **Média** em placas modestas e **Baixa** em notebooks com vídeo integrado (desliga pós-processamento, sombras e grama). O benchmark do menu mede 30 segundos com bots ativos. No teste desta entrega (Electron/Chromium, qualidade Alta, 1366 × 820) o benchmark ficou próximo de 90 FPS; veja **VALIDACAO.md**.

## Arquivos

`game/` é o jogo (é o que vai para o GitHub Pages); `index.html` na raiz redireciona para ele; `Windows/` contém o aplicativo portátil; `tests/` testes; `original/` a base preservada. Detalhes técnicos em **DESENVOLVIMENTO.md**; licenças em **TERCEIROS.md**.

Limitações conhecidas: sem multiplayer, veículos dirigíveis ou destruição de cenário; colisões por caixas; visual estilizado procedural (não fotorrealista).
