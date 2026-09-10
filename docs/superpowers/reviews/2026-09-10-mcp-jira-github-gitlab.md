# Code Review — Migração para MCP (Jira/GitHub/GitLab)

- **Data:** 2026-09-10
- **Diff revisado:** .superpowers/sdd/2026-09-10-mcp-jira-github-gitlab/review-working-tree-1789045277-5183.diff
- **Requisito:** plano em docs/superpowers/plans/2026-09-10-mcp-jira-github-gitlab.md
- **VERDICT: WITH FIXES**

## Escopo revisado

| Arquivo | O que mudou |
|---|---|
| `skills/using-superpowers/SKILL.md` | Seção "Jira Context" reescrita (MCP Atlassian primeiro, STOP-and-ask, script como fallback autorizado) e nova seção "GitLab Context" inserida antes de "Skill Priority". |
| `skills/requesting-code-review/SKILL.md` | Passo 1b reescrito: `jira-context.mjs` sai do bloco `bash` obrigatório, contexto do Jira passa a referenciar a seção "Jira Context" por link, `JIRA_FILE` passa a ser um caminho fixo em `~/.claude/reviews/`. |
| `skills/receiving-code-review/SKILL.md` | "GitHub Thread Replies" reescrita para `add_reply_to_pull_request_comment` com `gh api` como fallback sob autorização; nova seção "GitLab Thread Replies". |
| `skills/requesting-code-review/scripts/jira-context.mjs` | Três linhas de comentário no cabeçalho marcando o script como caminho de fallback. Nenhuma linha de lógica alterada. |
| `CONFIGURAR-COMO-SKILL.md` | Nota no início da seção 5 posicionando as credenciais REST como fallback manual e reforçando o STOP-and-ask; condição de execução da seção ajustada. |

## Achados

### Critical

**1. "GitLab Thread Replies" documenta um caminho MCP que não existe para merge requests** — `skills/receiving-code-review/SKILL.md:218-231`

A seção manda responder threads inline de **merge request** chamando
`create_workitem_note` com `work_item_iid` = "the merge request IID", e ler o
`discussion_id` via `get_workitem_notes` com `work_item_iid` = IID do MR.

Verificado contra o schema real do servidor `mcp__gitlab__*` desta sessão: ambas as
ferramentas operam sobre **work items** (issues, tasks, epics, objectives), domínio
que no GitLab não inclui merge requests — o próprio conjunto de ferramentas reforça
isso (`get_saved_view_work_items` para work items; para MR existem apenas
`get_merge_request`, `get_merge_request_commits`, `get_merge_request_conflicts`,
`get_merge_request_diffs`, `get_merge_request_pipelines`, `create_merge_request`).
Não há nenhuma ferramenta neste MCP que crie ou leia notas/discussões de merge
request.

Consequência técnica: o único propósito da seção (responder thread inline de MR)
não é executável pelo caminho documentado — o agente que seguir a instrução vai
chamar a ferramenta com um IID de MR e receber erro ou, pior, acertar um work item
homônimo de outro tipo com o mesmo IID e comentar no lugar errado. Isso também
colide diretamente com a restrição global do plano de "não documentar alternativa
não verificada" (a mesma regra que corretamente evitou inventar `glab`).

Correção sugerida: reescrever a seção para declarar que **não há suporte MCP** a
respostas de thread de MR neste servidor (simetricamente ao que o texto já faz para
a ausência de fallback de CLI), mantendo o STOP-and-ask e a orientação de responder
pela UI do GitLab — ou, se algum outro servidor GitLab passar a expor notas de MR,
citar a ferramenta real após confirmação de schema.

### Important

**2. Mesma afirmação não verificada na seção de leitura do GitLab** — `skills/using-superpowers/SKILL.md:85-86`

"Discussion/comments on either: call `get_workitem_notes` with `project_id` and
`work_item_iid` (the merge request or issue IID)". A parte "or issue" está correta;
a parte "merge request" tem o mesmo defeito do achado 1. As duas primeiras linhas da
seção (`get_merge_request` / `get_merge_request_diffs` / `get_issue` com `id`,
`merge_request_iid`, `issue_iid`) foram conferidas contra o schema e estão corretas.

Consequência técnica: quem for buscar contexto de comentários de um MR segue uma
instrução que falha, e a assimetria com o achado 1 significa que corrigir apenas um
dos arquivos deixa as duas seções contando histórias diferentes.

**3. A chamada MCP documentada não retorna os campos que o passo 1b exige** — `skills/using-superpowers/SKILL.md:51-54` x `skills/requesting-code-review/SKILL.md:69-71`

O passo 1b exige que, no caminho MCP, o agente escreva
`~/.claude/reviews/jira-<CHAVE>.md` com "same fields as the script: summary,
description, issuetype, status, priority, assignee, reporter, **fixVersions**,
labels, resolution, **subtasks/children**".

O passo 2 da seção "Jira Context" instrui `getJiraIssue` com apenas `cloudId` e
`issueIdOrKey`. Com `fields` omitido, o schema da ferramenta devolve o conjunto
default — summary, description, status, issuetype, priority, labels, components,
assignee, reporter, created, updated, resolution, project — que **não inclui
`fixVersions` nem `subtasks`**.

Consequência técnica: seguindo as duas seções à risca, o arquivo produzido pelo
caminho MCP fica sem dois campos que o fallback produz, então o subagente revisor
recebe contexto de demanda mais pobre justamente na via preferida. Correção: mandar
passar `fields` explicitamente em `getJiraIssue` (incluindo `fixVersions` e
`subtasks`), ou reduzir a lista exigida no passo 1b para o que a chamada default
entrega.

### Minor

**4. Cobertura de filhos pode divergir do fallback.** A instrução MCP obtém filhos
apenas por `jql: 'parent = "<CHAVE>" ORDER BY key ASC'`. O script faz isso **e**
mescla `fields.subtasks` da issue principal, deduplicando por chave — o comentário
em `jira-context.mjs:150-152` registra que a JQL e `fields.subtasks` não coincidem
necessariamente. O caminho MCP, como escrito, pode devolver menos filhos que o
fallback.

**5. Chamada extra de `getAccessibleAtlassianResources`.** O passo 1 manda sempre
chamar essa ferramenta "once per session"; a própria descrição da ferramenta orienta
tentar primeiro o hostname do site como `cloudId` quando há um link, e só listar
recursos se falhar. Uma round-trip evitável por sessão.

**6. Sem formato definido para o arquivo escrito à mão no caminho MCP.** O passo 1b
lista os campos, mas não o layout; o fallback tem layout fixo. Arquivos de contexto
com estruturas diferentes conforme a via usada.

**7. Assimetria de leitura GitHub.** `using-superpowers/SKILL.md` ganhou "GitLab
Context" (leitura de MR/issue), mas não há seção equivalente para leitura de PR/issue
do GitHub — o GitHub só aparece no caminho de resposta de thread. Isso segue o plano
(que não previu essa seção), então é lacuna de escopo do plano, não desvio da
implementação.

## Verificado e correto (sem ação)

- **Requisito central (STOP-and-ask) presente e consistente nos 5 arquivos.** Nenhuma
  troca silenciosa de via sobrou: `using-superpowers/SKILL.md:56-63` (Jira, "Only run
  the fallback after the user says to") e `:88-92` (GitLab, sem fallback);
  `requesting-code-review/SKILL.md:61-66` ("STOP and ask the user whether to fall back
  ... before running it"); `receiving-code-review/SKILL.md:213-216` (GitHub, fallback
  `gh api` só após autorização) e `:229-231` (GitLab, sem fallback de CLI);
  `CONFIGURAR-COMO-SKILL.md:150-153` ("a skill para e avisa o usuário antes de usar
  este fallback — nunca troca de via sozinha"); `jira-context.mjs:5-7` (script marcado
  como fallback). O único bloco `bash` que executava o script incondicionalmente
  (antiga linha `JIRA_FILE=$(node .../jira-context.mjs ...)`) foi removido — não sobrou
  nenhum caminho onde o fallback rode sem decisão do usuário.
- **Nenhum comando de CLI inventado.** Grep em todo o repositório: nenhuma ocorrência
  de `glab`; a única menção a `gh api` fora de artefatos SDD/plano é a do bloco de
  fallback autorizado em `receiving-code-review/SKILL.md:215`. O texto do GitLab
  declara explicitamente a ausência de fallback de CLI, como o plano determinou.
- **Nomes e parâmetros MCP conferidos contra os schemas reais** (exceto os do achado
  1/2): `getAccessibleAtlassianResources` → `cloudId`; `getJiraIssue` →
  `cloudId`/`issueIdOrKey`; `searchJiraIssuesUsingJql` → `cloudId`/`jql`;
  `add_reply_to_pull_request_comment` → `owner`/`repo`/`pullNumber`/`commentId`/`body`,
  inclusive a ressalva correta de usar o id numérico do `#discussion_r<id>` e não o
  `PRRT_...` (a ressalva reproduz a descrição do próprio schema);
  `get_merge_request`/`get_merge_request_diffs` → `id`/`merge_request_iid`; `get_issue`
  → `id`/`issue_iid`.
- **Estrutura markdown íntegra.** `using-superpowers/SKILL.md` mantém a ordem prevista
  (The Rule → Git Authorization → Jira Context → GitLab Context → Skill Priority → Red
  Flags → Platform Adaptation → User Instructions), sem header duplicado ou quebrado;
  `receiving-code-review/SKILL.md` termina limpo na nova seção, com newline final e sem
  resíduo da linha antiga do `gh api`. Cercas de código fecham corretamente nos dois.
- **Link cruzado válido.** `../using-superpowers/SKILL.md#jira-context` resolve a partir
  de `skills/requesting-code-review/`, e a âncora corresponde ao header `## Jira
  Context` existente.
- **Interface preservada em `requesting-code-review`.** `JIRA_FILE` continua sendo um
  caminho (`~/.claude/reviews/jira-<CHAVE>.md`) consumido pelo passo 2 via
  `{PLAN_OR_REQUIREMENTS}`; `resolve-diff.sh`, suas três flags e o pipeline de
  `{FILES_CHANGED}` não foram tocados. Única ocorrência restante de `jira-context.mjs`
  no arquivo está no texto de fallback, como o plano previa.
- **Comentário PT-BR em `jira-context.mjs:5-7`** objetivo (fato + consequência técnica:
  "as skills preferem as ferramentas MCP ... este script só é chamado quando esse MCP
  não está configurado"), sem retórica nem autojustificação. Lógica intacta — o diff do
  arquivo é só comentário.
- **Nada staged.** `git status --short` mostra os 5 arquivos como ` M` (working tree) e
  `git diff --cached --stat` vazio. O plano em `docs/superpowers/plans/` segue como `??`.
- **Nenhuma credencial exposta.** `.env` não aparece no diff nem no status, e nenhum
  trecho novo imprime, lê ou ecoa `JIRA_API_TOKEN`; os textos novos reforçam "never pass
  the token through the conversation".
- **Cobertura das 5 tasks do plano.** Todos os blocos markdown do plano foram colados
  literalmente nos arquivos previstos (conferido linha a linha contra o diff); nenhuma
  task ficou pela metade e nenhuma edição fora do escopo previsto.

## Addendum — rodada de correção

Achados Critical (#1) e Important (#2, #3) corrigidos em rodada única e re-revisados
de forma escopada: **PASS** — os três confirmados como endereçados contra o schema
real das ferramentas `mcp__gitlab__*`/`mcp__claude_ai_Atlassian_Rovo__*`, sem nova
quebra Critical/Important introduzida pela correção. Achados Minor (#4-#7) ficaram
deferidos/registrados como decisão (ver `.superpowers/sdd/2026-09-10-mcp-jira-github-gitlab/progress.md`),
sem entrar nesta rodada de correção.

## Ordem sugerida de correção

1. Achado 1 — reescrever "GitLab Thread Replies" para declarar a ausência de suporte
   MCP a notas de merge request (é o texto que hoje leva o agente a uma chamada
   inválida).
2. Achado 2 — ajustar a linha de discussões em "GitLab Context" no mesmo movimento,
   para as duas seções voltarem a contar a mesma história.
3. Achado 3 — decidir entre passar `fields` explícito em `getJiraIssue` ou reduzir a
   lista exigida no passo 1b, e aplicar nos dois arquivos.
4. Achados 4 a 6 — refinamentos do caminho MCP do Jira (cobertura de filhos, chamada
   extra, layout do arquivo), se houver apetite.
5. Achado 7 — decisão de escopo (nova seção "GitHub Context") a levar de volta ao
   usuário, não correção deste diff.
