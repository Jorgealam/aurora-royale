# Publicar o Aurora Royale no GitHub Pages

O jogo é um site estático: basta enviar os arquivos para um repositório e ligar o GitHub Pages. Não precisa de servidor, banco de dados nem instalar nada.

## O que enviar

Envie **tudo desta pasta, exceto a pasta `Windows/`** (o executável tem mais de 100 MB, acima do limite do GitHub). O arquivo `.gitignore` já exclui essa pasta se você usar Git ou GitHub Desktop.

O mínimo necessário para o jogo funcionar online é:

```
index.html
.nojekyll
game/  (com a subpasta vendor/)
```

## Passo a passo pelo site do GitHub (sem instalar nada)

1. Entre em <https://github.com> e crie uma conta (ou faça login).
2. Clique em **New repository**. Nome sugerido: `aurora-royale`. Marque **Public** e clique em **Create repository**.
3. Na página do repositório vazio, clique em **uploading an existing file**.
4. Arraste para a página: o arquivo `index.html`, o arquivo `.nojekyll` e a pasta `game` inteira. (Se o Windows esconder `.nojekyll`, ative "Itens ocultos" no Explorador; ele é opcional.)
5. Clique em **Commit changes** e aguarde o envio terminar.
6. Vá em **Settings → Pages**. Em **Branch**, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
7. Aguarde 1 a 2 minutos. O endereço aparece no topo da página de Pages, no formato:
   `https://SEU-USUARIO.github.io/aurora-royale/`

## Atualizar o jogo depois

Repita o envio (passos 3 a 5) com os arquivos alterados. O GitHub substitui os antigos. O site atualiza em um ou dois minutos; use Ctrl+F5 no navegador para forçar o recarregamento.

## Usando o GitHub Desktop (alternativa)

1. Instale o GitHub Desktop e faça login.
2. **File → Add local repository**, escolha esta pasta e aceite criar um repositório.
3. Escreva um resumo (ex.: "Aurora Royale 2.0") e clique em **Commit to main**, depois em **Publish repository** (desmarque "Keep this code private" para usar Pages gratuito).
4. Ligue o Pages como no passo 6 acima.

## Distribuir a versão Windows

Compacte a pasta `Windows/` em um ZIP e anexe-o em **Releases → Draft a new release** no repositório. Arquivos de Release aceitam até 2 GB.

## Dicas

- O modo desenvolvedor (F1) também funciona na versão online. Ele só altera a sua partida, no seu navegador.
- Se alguém vir tela preta, peça para atualizar o navegador e ativar a aceleração por hardware, ou escolher qualidade **Baixa**.
- O jogo possui controles de toque para celular e teclado/mouse para PC. Se necessário, escolha o modo no menu CONTROLES.
