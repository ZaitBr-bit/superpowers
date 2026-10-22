---
name: using-helper-tools
description: Use when a task needs a Python package or command-line tool that is not installed (Pillow, oxipng, imagequant, gifsicle, matplotlib and similar), or when the result is visual — images, before/after comparisons, charts, galleries — and the user needs to see it
---

# Ferramentas auxiliares e resultados visuais

## Visão geral

Ferramenta que falta vai para uma pasta **persistente e fora do versionamento dentro do próprio plugin**. Não vai para o Python global, para o repositório do produto nem para o scratchpad, que some a cada sessão. Resultado visual se mostra **abrindo a página no navegador do usuário**. Não basta informar um caminho de arquivo.

## Onde instalar

Raiz: `<raiz do plugin superpowers>/.superpowers/tools/`. A raiz do plugin é a pasta acima de `skills/`, e `.superpowers/` já está no `.gitignore` dele. **Instalar nessa pasta está autorizado pelo usuário e não precisa de pergunta.** Qualquer outro destino precisa.

| Tipo | Destino | Como |
|---|---|---|
| Pacote Python | `.superpowers/tools/python` | `python -m pip install --target "<raiz>/.superpowers/tools/python" <pacote>` |
| Binário | `.superpowers/tools/bin/<ferramenta>/` | Baixar do site oficial ou do release do projeto e descompactar ali |

- Antes de instalar, veja o que já existe: `python -m pip list --path "<raiz>/.superpowers/tools/python"`.
- No script: `sys.path.insert(0, r"<raiz>\.superpowers\tools\python")`. Binário: chame pelo caminho completo.
- Prefira pacote do PyPI que já traz o binário compilado (ex.: `pyoxipng`, `imagequant`) a baixar executável avulso.
- Confirme que o recurso veio mesmo antes de medir (ex.: `PIL.features.check("libimagequant")`). Recurso ausente vira fallback silencioso e o teste mede outra coisa.
- Depois de instalar, `git -C <raiz> status --short` tem que continuar vazio.

## Resultado visual

1. Gere um HTML no scratchpad, com os arquivos ao lado (referência relativa) e tema claro/escuro.
2. **Abra para o usuário:**
   - Windows, pela ferramenta PowerShell: `Start-Process "<caminho>.html"`. No Git Bash, `cmd /c start` não abre a página, só um prompt do cmd.
   - macOS: `open`. Linux: `xdg-open`.
3. Na resposta, diga que abriu e dê o caminho completo como alternativa.
4. **Asset do produto** (imagem, tela, dado de cliente) **fica local.** Não publique como Artifact nem suba para serviço externo sem pedido do usuário. Conteúdo que você gerou e que não tem dado sensível (ex.: gráfico de contagens) segue as regras da ferramenta de Artifact do harness.
5. **Antes/depois:** original e novo lado a lado, zoom sem suavização (`image-rendering: pixelated`) e mapa de diferença. O número (PSNR, bytes) acompanha a imagem, não substitui: quem decide é quem olha.

## Erros comuns

| Erro | Correção |
|---|---|
| Instalar em venv ou pasta do scratchpad | Some na próxima sessão; use `.superpowers/tools` |
| `pip install` global ou `--user` | Sempre `--target` |
| Responder só com o caminho do arquivo | Abra com `Start-Process` |
| Heredoc do Git Bash com `\` dentro de string Python | Some barra (`"\a"` vira caractere de controle). Grave o script em arquivo e execute |
| Comparar RGBA cru em imagem com transparência | A cor escondida sob alfa 0 infla o erro. Componha sobre fundo branco e preto antes |
| Mexer no repositório do produto durante o teste | Trabalhe em cópias; `git status` antes e depois |
