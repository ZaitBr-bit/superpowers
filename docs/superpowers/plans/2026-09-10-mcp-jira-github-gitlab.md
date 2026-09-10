# Migração para MCP (Jira/GitHub/GitLab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer as skills que hoje buscam contexto do Jira via script REST (`jira-context.mjs`) e respondem threads de PR do GitHub via `gh api` passarem a preferir os MCPs já configurados nesta sessão (`mcp__claude_ai_Atlassian_Rovo__*`, `mcp__plugin_github_github__*`), e adicionar suporte equivalente ao MCP do GitLab (`mcp__gitlab__*`), sem quebrar o funcionamento em harnesses onde esses MCPs não estão configurados.

**Architecture:** Nenhum MCP é dependência obrigatória do plugin (ele roda em múltiplos harnesses — ver `skills/using-superpowers/references/`). Cada ponto de integração passa a ter duas vias documentadas na própria instrução da skill: **preferir o MCP quando a ferramenta estiver disponível na sessão**. Quando o MCP não estiver disponível ou uma chamada falhar, a skill **para e avisa o usuário** do que falhou (ferramenta ausente vs. qual chamada deu erro) — nunca troca de via sozinha. O usuário decide se autoriza o caminho antigo (script Node + `.env`, ou `gh api`) como fallback, ou se prefere resolver de outra forma. Isso é decidido pelo agente que lê a skill (checando se a ferramenta MCP aparece na sua lista de tools e observando o resultado das chamadas), não por código — as skills são markdown, não scripts.

**Tech Stack:** Markdown (skills do plugin superpowers), Node.js (`jira-context.mjs`, inalterado na lógica), MCP tools: Atlassian Rovo (Jira Cloud), GitHub MCP, GitLab MCP.

**Spec:** Não há spec prévio em `docs/superpowers/specs/` para esta mudança — o plano parte diretamente do pedido do usuário e do levantamento do estado atual do repositório (ver seção "Estado atual" abaixo), sem passar por brainstorming, por ser uma migração mecânica de meio de transporte (REST direto → MCP) sem decisão de produto em aberto.

**Estado atual (levantado antes deste plano):**
- Jira: único acesso é `skills/requesting-code-review/scripts/jira-context.mjs`, que lê `skills/requesting-code-review/.env` (`JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`), chama `GET /rest/api/2/issue/{chave}` e `POST/GET .../search` por JQL, e escreve markdown em `~/.claude/reviews/jira-{CHAVE}.md`, imprimindo só o caminho. É referenciado por `skills/using-superpowers/SKILL.md` (seção "Jira Context") e `skills/requesting-code-review/SKILL.md` (passo 1b).
- GitHub: único acesso é `gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies` em `skills/receiving-code-review/SKILL.md` (seção "GitHub Thread Replies"), para responder threads inline de PR.
- GitLab: nenhuma referência no repositório hoje.
- MCPs configurados nesta sessão: `mcp__claude_ai_Atlassian_Rovo__*` (Jira/Confluence), `mcp__plugin_github_github__*`, `mcp__gitlab__*`.

## Global Constraints

- Comentários em código (o único código tocado é `jira-context.mjs`) sempre em português do Brasil, objetivos — fato e consequência técnica, sem retórica.
- Nunca fazer stage ou commit destes arquivos — apenas editar o working tree.
- Nenhuma credencial (.env do Jira) pode ser lida, exibida ou ecoada durante a execução deste plano.
- Não inventar comandos de CLI (ex.: `glab`) sem confirmar que existem — se não houver fallback confiável, documentar a ausência de fallback em vez de uma alternativa não verificada.

---

### Task 1: Atualizar "Jira Context" em `using-superpowers` para preferir o MCP Atlassian

**Risk:** low - edição de prosa em um único arquivo markdown, sem lógica nova, reversível trivialmente.

**Files:**
- Modify: `skills/using-superpowers/SKILL.md:38-53`
- Validate: leitura manual do arquivo após a edição (não há linter de markdown no repo)

- [ ] **Step 1: Reescrever a seção "Jira Context"**

Substituir o bloco atual (linhas 38-53) por:

```markdown
## Jira Context

When a task supplies a Jira issue key (e.g. `CISS-183012`) as a parameter, or the user
asks for a ticket's information, fetch it before proceeding — don't ask the user to
paste the description and don't guess from memory. This applies to any skill, not only
`requesting-code-review`, which already has this wired for review context.

**Prefer the Atlassian MCP tools** (tool names starting with
`mcp__claude_ai_Atlassian_Rovo__`):

1. Call `getAccessibleAtlassianResources` once per session and keep the `cloudId` for
   the Jira site that owns the issue (match by hostname when a link names one; when
   only one resource comes back, use it).
2. Call `getJiraIssue` with that `cloudId` and `issueIdOrKey` set to the key (e.g.
   `CISS-183012`).
3. For child issues (subtasks or Epic children), call `searchJiraIssuesUsingJql` with
   the same `cloudId` and `jql: 'parent = "CISS-183012" ORDER BY key ASC'`.

**If the MCP tools are not available in this session, or any call above fails**
(resource not found, 401/403/404, tool errors out): STOP. Do not silently fall back
and do not fabricate ticket content. Tell the user exactly what failed — tool
unavailable, or which call errored and how — and ask whether to use the script
fallback below or handle it another way (e.g. they paste the description). Only run
the fallback after the user says to.

**Fallback (only after the user chooses it):**

    node <path-to>/skills/requesting-code-review/scripts/jira-context.mjs CISS-XXXXXX

Script: [jira-context.mjs](../requesting-code-review/scripts/jira-context.mjs). It reads
credentials from `skills/requesting-code-review/.env` and prints the absolute path to a
generated markdown file with the issue and its children. If it fails (missing `.env`,
401/403/404), report the exact error to the user — never fabricate ticket content or
silently skip the fetch.
```

- [ ] **Step 2: Inserir a nova seção "GitLab Context" logo após "Jira Context"**

Inserir, imediatamente depois do bloco do Step 1 (antes de `## Skill Priority`):

```markdown
## GitLab Context

When a task supplies a GitLab merge request or issue reference (a URL, or a
`<project>!<iid>` / `<project>#<iid>` shorthand), fetch it before proceeding — don't
ask the user to paste the description and don't guess from memory.

**Prefer the GitLab MCP tools** (tool names starting with `mcp__gitlab__`):

- Merge request: call `get_merge_request` with `id` (the project path, e.g.
  `group/project`) and `merge_request_iid`. For the code changes, call
  `get_merge_request_diffs` with the same `id`/`merge_request_iid`.
- Issue: call `get_issue` with `id` and `issue_iid`.
- Discussion/comments on either: call `get_workitem_notes` with `project_id` and
  `work_item_iid` (the merge request or issue IID).

**If the MCP tools are not available in this session, or any call above fails**
(project not found, insufficient scope, tool errors out): STOP. Do not fabricate
content. Tell the user exactly what failed and ask them how to proceed — there is no
script fallback for GitLab in this repo, so the choice is to authorize/fix the MCP or
paste the merge request/issue description themselves.
```

- [ ] **Step 3: Conferir a renderização do arquivo**

Run: leitura do arquivo completo (`skills/using-superpowers/SKILL.md`) para confirmar que os headers `##` ficaram na mesma hierarquia dos vizinhos e que a ordem das seções é: Git Authorization → Jira Context → GitLab Context → Skill Priority → Red Flags → Platform Adaptation → User Instructions.
Expected: nenhuma seção duplicada, nenhum header quebrado, blocos de código com ``` fechando corretamente.

**Interfaces:**
- Produces: a convenção "checar `mcp__claude_ai_Atlassian_Rovo__*` / `mcp__gitlab__*` na lista de tools da sessão antes de decidir a via" — Task 2 e Task 3 reusam essa mesma convenção por referência, sem reescrevê-la.

---

### Task 2: Atualizar o passo 1b de `requesting-code-review` para reusar a via MCP do Jira

**Risk:** low - edição de prosa que referencia a seção já reescrita na Task 1; não altera `resolve-diff.sh` nem a interface `{PLAN_OR_REQUIREMENTS}` usada no passo 2.

**Files:**
- Modify: `skills/requesting-code-review/SKILL.md:43-64`
- Validate: leitura manual do arquivo após a edição

- [ ] **Step 1: Reescrever o passo 1b**

Substituir o bloco atual (linhas 43-64) por:

```markdown
**1b. When a Jira issue key is supplied — gather demand context and scope the diff:**

`resolve-diff.sh` lives in this skill's `scripts/` directory and prints a single path
to stdout. Pass that path onward, never its contents.

```bash
SKILL=<this skill's base directory>
DIFF_FILE=$(bash "$SKILL/scripts/resolve-diff.sh" CISS-180745)
```

`resolve-diff.sh` accepts three optional flags, mutually exclusive:
- `--branch <ref>` — search the issue's commits on that ref instead of `HEAD`
- `--commit <sha>` — review exactly that commit. For a merge commit it takes the
  diff against the first parent, because `git show` on a merge yields the
  combined diff, which is usually near-empty and would silently produce an empty
  review
- `--diff-file <path>` — use a physical diff file as-is, for pre-merge review

Get the Jira context the same way described in
[Jira Context](../using-superpowers/SKILL.md#jira-context) — prefer the
`mcp__claude_ai_Atlassian_Rovo__*` tools; if they are unavailable in this session or a
call fails, STOP and ask the user whether to fall back to `scripts/jira-context.mjs`
(reads its credentials from `.env` in this skill's directory, see `.env.example`;
never pass the token through the conversation) before running it. Either way, the
issue's context ends up as markdown at
`~/.claude/reviews/jira-CISS-180745.md` — when using the MCP path, write it there
yourself (same fields as the script: summary, description, issuetype, status,
priority, assignee, reporter, fixVersions, labels, resolution, subtasks/children);
when using the script, it writes the file itself. Either way, set:

```bash
JIRA_FILE=~/.claude/reviews/jira-CISS-180745.md
```

Derive the changed-file list for the reviewer prompt from the diff itself — the
result fills `{FILES_CHANGED}`:

```bash
grep '^diff --git' "$DIFF_FILE" | awk '{print $3}' | sed 's|^a/||' | sort -u
```

Then dispatch as in step 2, setting `{PLAN_OR_REQUIREMENTS}` to `$JIRA_FILE` —
a path, exactly as the template's "plan file path" usage intends.

Failing to resolve the diff, or to gather the demand context when a Jira key was
supplied, aborts the review. Do not dispatch a reviewer with an empty diff, or
without the demand context that was requested.
```

- [ ] **Step 2: Conferir referências cruzadas nas demais seções do arquivo**

Run: grep por `jira-context.mjs` em `skills/requesting-code-review/SKILL.md`
Expected: a única ocorrência restante é dentro do texto que descreve o fallback (a que ficou no bloco reescrito); nenhuma outra parte do arquivo (passo 2 "Placeholders", exemplo da seção "Example") menciona o script diretamente, pois elas já só citam `{PLAN_OR_REQUIREMENTS}`/`JIRA_FILE` por nome — confirmar isso lendo as linhas 100-161 do arquivo.

**Interfaces:**
- Consumes: a convenção MCP-primeiro/fallback-depois definida em Task 1 (`Jira Context` em `using-superpowers/SKILL.md`), por referência de link, sem duplicar o texto.
- Produces: `JIRA_FILE` continua sendo um caminho de arquivo markdown em `~/.claude/reviews/jira-<CHAVE>.md`, mesma interface que o passo 2 do arquivo (dispatch do reviewer) já consome via `{PLAN_OR_REQUIREMENTS}`.

---

### Task 3: Atualizar `receiving-code-review` — MCP para respostas de thread no GitHub e nova seção GitLab

**Risk:** low - edição de prosa em um único arquivo, adiciona uma seção nova sem remover conteúdo existente além da linha do `gh api`.

**Files:**
- Modify: `skills/receiving-code-review/SKILL.md:203-205`
- Validate: leitura manual do arquivo após a edição

- [ ] **Step 1: Reescrever "GitHub Thread Replies" e adicionar "GitLab Thread Replies"**

Substituir o bloco final do arquivo (linhas 203-205) por:

```markdown
## GitHub Thread Replies

When replying to inline review comments on GitHub, reply in the comment thread, not
as a top-level PR comment.

**Prefer the GitHub MCP tools** (tool names starting with
`mcp__plugin_github_github__`): call `add_reply_to_pull_request_comment` with `owner`,
`repo`, `pullNumber`, the numeric `commentId` (the number from the `#discussion_r<id>`
anchor, not the GraphQL thread id `PRRT_...`), and `body`.

**If the tool is not available in this session, or the call fails**: STOP. Tell the
user what failed and ask whether to fall back to the CLI
(`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`) or handle it another
way. Only run the fallback after the user says to.

## GitLab Thread Replies

When replying to inline review comments on a GitLab merge request, reply inside the
existing discussion, not as a new top-level note.

**Prefer the GitLab MCP tools** (tool names starting with `mcp__gitlab__`): call
`create_workitem_note` with `project_id` (or `group_id`), `work_item_iid` (the merge
request IID), `discussion_id` (the `gid://gitlab/Discussion/<id>` of the thread being
answered — read it off the note you're replying to via `get_workitem_notes`), and
`body`.

**If the tool is not available in this session, or the call fails**: STOP. Tell the
user what failed. There is no CLI fallback documented for this repo — ask them to
post the reply manually in the GitLab UI, or authorize the GitLab MCP.
```

- [ ] **Step 2: Conferir que o arquivo termina limpo**

Run: leitura das últimas 30 linhas de `skills/receiving-code-review/SKILL.md`
Expected: o arquivo termina na nova seção "GitLab Thread Replies", sem headers duplicados e sem a linha antiga do `gh api` sobrando fora do bloco novo.

**Interfaces:**
- Consumes: nenhuma (seção independente).
- Produces: nenhuma interface nova consumida por outra task deste plano.

---

### Task 4: Anotar `jira-context.mjs` como caminho de fallback

**Risk:** low - apenas comentário adicionado no topo do arquivo, PT-BR, sem alterar nenhuma linha de lógica.

**Files:**
- Modify: `skills/requesting-code-review/scripts/jira-context.mjs:1-6`
- Validate: `node --check skills/requesting-code-review/scripts/jira-context.mjs`

- [ ] **Step 1: Adicionar a nota de fallback ao cabeçalho existente**

Trocar:

```javascript
#!/usr/bin/env node
// Busca uma issue do Jira Cloud, suas subtarefas e suas issues filhas de Epic,
// gerando um arquivo markdown de contexto para o subagente revisor de código.
//
// Uso:   node jira-context.mjs CISS-180745
// Saída: imprime em stdout apenas o caminho absoluto do markdown gerado.
```

Por:

```javascript
#!/usr/bin/env node
// Busca uma issue do Jira Cloud, suas subtarefas e suas issues filhas de Epic,
// gerando um arquivo markdown de contexto para o subagente revisor de código.
//
// Caminho de fallback: as skills preferem as ferramentas MCP do Atlassian
// (mcp__claude_ai_Atlassian_Rovo__*) quando disponíveis na sessão; este script
// só é chamado quando esse MCP não está configurado.
//
// Uso:   node jira-context.mjs CISS-180745
// Saída: imprime em stdout apenas o caminho absoluto do markdown gerado.
```

- [ ] **Step 2: Validar sintaxe do arquivo**

Run: `node --check skills/requesting-code-review/scripts/jira-context.mjs`
Expected: saída vazia e código de saída 0 (script continua sintaticamente válido).

**Interfaces:**
- Consumes: nenhuma.
- Produces: nenhuma interface nova; comportamento do script é idêntico ao anterior.

---

### Task 5: Atualizar `CONFIGURAR-COMO-SKILL.md` para citar o MCP como alternativa às credenciais do Jira

**Risk:** low - edição de prosa em um único arquivo de documentação de instalação, sem alterar nenhum comando executado.

**Files:**
- Modify: `CONFIGURAR-COMO-SKILL.md:148-151`
- Validate: leitura manual do arquivo após a edição

- [ ] **Step 1: Inserir a nota de MCP logo após o título da seção 5**

Substituir:

```markdown
## 5. Credenciais do Jira (opcional)

Só faça esta seção se o usuário for usar a skill `requesting-code-review` com chave
de issue do Jira. Se ele não pediu, **pule e mencione que existe**.
```

Por:

```markdown
## 5. Credenciais do Jira (opcional)

Esta seção configura o **fallback manual** de acesso ao Jira via API REST direta. As
skills preferem as ferramentas MCP do Atlassian (`mcp__claude_ai_Atlassian_Rovo__*`)
quando disponíveis; se o MCP não estiver configurado ou uma chamada falhar, a skill
para e avisa o usuário antes de usar este fallback — nunca troca de via sozinha.

Só faça esta seção se o usuário for usar a skill `requesting-code-review` com chave
de issue do Jira **e** quiser ter esse fallback pronto de antemão. Se ele não pediu,
**pule e mencione que existe**.
```

- [ ] **Step 2: Conferir que o restante da seção 5 não precisa de ajuste**

Run: leitura das linhas 148-178 do arquivo após a edição
Expected: o restante das instruções (criar `.env` a partir de `.env.example`, nunca ler/ecoar o token, checagem do `.gitignore`) continua igual — essas instruções seguem corretas como fallback, nenhuma outra mudança necessária nesta task.

**Interfaces:**
- Consumes: nenhuma.
- Produces: nenhuma interface nova.

---

## Self-Review

**1. Cobertura do pedido do usuário:**
- "Validar que no projeto atual foi configurado apis para buscar dados do jira" → confirmado no levantamento (estado atual): único acesso é `jira-context.mjs` via REST.
- "e também para tratar dados github" → confirmado: `gh api` em `receiving-code-review/SKILL.md`.
- "Quero alterar para utilizar os MCPs configurados atualmente para melhorar as respostas" → Tasks 1-3 fazem o MCP a via preferida, com fallback documentado.
- "agora também o gitlab configurado também pode ser usado" → Task 1 (GitLab Context) e Task 3 (GitLab Thread Replies) cobrem leitura e resposta via GitLab MCP, simetricamente ao Jira e ao GitHub.

**2. Varredura de placeholders:** nenhum "TBD"/"implementar depois" — cada bloco markdown é o texto final a ser colado no arquivo, cada nome de ferramenta MCP e cada parâmetro foi confirmado via `ToolSearch` contra o schema real antes de escrever o plano.

**3. Consistência de nomes:** `getAccessibleAtlassianResources` → `cloudId`; `getJiraIssue`/`searchJiraIssuesUsingJql` → mesmo `cloudId`; `get_merge_request`/`get_merge_request_diffs`/`get_issue`/`get_workitem_notes`/`create_workitem_note` → mesmos `id`/`project_id`/`work_item_iid` conforme o schema real do MCP do GitLab; `add_reply_to_pull_request_comment` → `owner`/`repo`/`pullNumber`/`commentId`/`body` conforme o schema real do MCP do GitHub. Usados de forma idêntica nas três tasks que os citam (Task 1 define, Task 2 e 3 reusam por referência).
