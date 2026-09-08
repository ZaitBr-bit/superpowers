# Contexto do Jira na revisão de código

Data: 2026-08-18
Repositório alvo: fork de `obra/superpowers`
Skill alterada: `skills/requesting-code-review/`

## Problema

A skill `requesting-code-review` entrega ao subagente revisor apenas o diff e uma
descrição escrita à mão. O revisor não sabe qual demanda originou a mudança, quais
eram os critérios de aceite, nem o que as subtarefas exigiam. Isso enfraquece a
verificação de "alinhamento com o plano", que é o primeiro item do checklist do
revisor.

Além disso, no repositório `cisspoder` o passo de diff padrão da skill (`git diff`
da árvore de trabalho) produz arquivo vazio no fluxo normal de trabalho, porque as
alterações já estão commitadas quando a revisão é pedida.

## Solução

Buscar a issue do Jira e seus filhos via API, gerar um markdown de contexto, e
passá-lo ao revisor pelo placeholder `[PLAN_OR_REQUIREMENTS]` que o template já
prevê. Em paralelo, recortar o diff pelos commits que citam a chave da issue.

## Superfície de uso

    /superpowers:requesting-code-review CISS-180745
    /superpowers:requesting-code-review CISS-180745 --branch 22.0.3.441
    /superpowers:requesting-code-review CISS-180745 --diff-file /caminho/alteracoes.diff

Sem chave de issue, a skill mantém o comportamento atual.

## Componentes

### 1. Credenciais — `skills/requesting-code-review/.env`

Jira Cloud, autenticação Basic com e-mail + API token:

    JIRA_BASE_URL=https://SEUDOMINIO.atlassian.net
    JIRA_EMAIL=jhonatan.zanetti@ciss.com.br
    JIRA_API_TOKEN=ATATT3x...

Arquivos que acompanham:

- `.env.example` — versionado, com placeholders, sem segredo.
- Entrada `.env` no `.gitignore` da raiz do repo superpowers.

**Ordem obrigatória:** a entrada no `.gitignore` é criada ANTES de o
`.env` real existir. Caso contrário há uma janela em que o token fica rastreável,
e o repositório tem remote público (`github.com/ZaitBr-bit/superpowers`).

O script lê o `.env` diretamente. O token não passa pelo contexto do Claude
controlador nem pelo do subagente revisor.

### 2. Script — `skills/requesting-code-review/scripts/jira-context.mjs`

Node puro, sem dependências externas (`jq` não está instalado na máquina; `node`
e `curl` estão).

**Entrada:** chave da issue como argumento (`node scripts/jira-context.mjs CISS-180745`).

**Saída:** grava um arquivo markdown e imprime somente o caminho absoluto em stdout.

**Chamadas à API** (Jira Cloud REST v2 — devolve descrição em texto plano, ao
contrário da v3, que devolve ADF em JSON):

1. Issue principal — `GET /rest/api/2/issue/{KEY}` com os campos: `summary`,
   `description`, `issuetype`, `status`, `priority`, `assignee`, `reporter`,
   `fixVersions`, `labels`, `resolution`, `subtasks`.
2. Subtarefas — `fields.subtasks` traz apenas chave, resumo e status. O script
   busca cada subtarefa individualmente para obter a descrição.
3. Filhas de Epic — `POST /rest/api/2/search/jql` com JQL `parent = "KEY"`,
   com queda para o endpoint antigo `/rest/api/2/search` se o novo responder
   404 ou 410.

Issues vinculadas (`issuelinks`) e comentários ficam **fora do escopo** por decisão
explícita: aumentam muito o arquivo sem melhorar a revisão do código.

**Limite:** no máximo 30 filhos buscados. Ultrapassado o limite, o markdown
registra quantos foram omitidos — truncamento silencioso faria o revisor concluir
que viu a demanda inteira.

### 3. Resolução do diff

Precedência:

1. `--diff-file <caminho>` — usa o arquivo como está, sem tocar no git. Caso de
   revisão pré-merge.
2. `--branch <nome>` — `git log --no-merges --grep=<CHAVE> <nome>`, mesma lógica
   do padrão apontada para outra branch. Serve para revisar o mesmo chamado em
   outra versão de release.
3. Padrão — `git log --no-merges --grep=<CHAVE> HEAD`, concatenando
   `git show --no-color` de cada commit encontrado.

`--no-merges` e o escopo de branch única são obrigatórios. Sem eles, a busca por
`CISS-180745` neste repositório traz também os commits de merge e as versões do
mesmo fix nas branches `26.2.6.012` e `26.4.3.001`, triplicando o diff.

**Falha explícita:** se nenhum commit casar com a chave, o processo para com erro.
Não se manda diff vazio ao revisor.

### 4. Artefatos

Gravados em `$HOME/.claude/reviews/`, fora do repositório de trabalho:

- `jira-<CHAVE>.md` — contexto da demanda
- `review-<CHAVE>.diff` — diff recortado

O `.gitignore` do `cisspoder` não ignora `.superpowers/`; gravar ali sujaria o
`git status` do repositório de trabalho ou exigiria alterar um arquivo versionado
do projeto.

### 5. Alteração na SKILL.md

Bloco aditivo de aproximadamente 15 linhas descrevendo o passo opcional de contexto
do Jira, posicionado entre os passos 1 e 2 atuais. O template `code-reviewer.md`
**não muda**: o markdown do Jira entra em `[PLAN_OR_REQUIREMENTS]` como caminho de
arquivo, uso que o placeholder já documenta ("plan file path, task text, or
requirements").

A alteração é mantida pequena e aditiva para reduzir conflito em `git pull` futuros
do upstream `obra/superpowers`.

## Tratamento de erro

| Situação | Comportamento |
|---|---|
| `.env` ausente ou incompleto | Erro nomeando a variável faltante e apontando `.env.example` |
| HTTP 401 / 403 | Erro indicando token inválido ou sem permissão na issue |
| HTTP 404 na issue principal | Erro informando que a chave não existe ou não é visível |
| Nenhum commit casa com a chave | Erro; nenhuma revisão é disparada |
| Falha ao buscar um filho | Registra o filho como indisponível no markdown e segue |

## Validação

1. `node scripts/jira-context.mjs CISS-180745` gera markdown com a issue e seus filhos.
2. `git check-ignore -v skills/requesting-code-review/.env` confirma que o arquivo
   está ignorado.
3. `git status --porcelain` no repo superpowers não lista o `.env`.
4. Fluxo completo com `CISS-180745` no `cisspoder` produz diff de 1 arquivo
   (`d_titulos_importados_dda.srd`), não a branch inteira.
5. Chave inexistente falha com mensagem clara, sem disparar revisor.

## Fora de escopo

- Jira Server/Data Center (autenticação Bearer com PAT)
- Issues vinculadas e comentários
- Escrita de volta no Jira (comentar o resultado da revisão)
- MCP da Atlassian
