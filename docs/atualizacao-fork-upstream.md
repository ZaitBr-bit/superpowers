# Conduta para atualizar o fork com o upstream

Registro do procedimento usado nas atualizações do fork para a v7.0.1 (commit `2b62ad9 Atualizando 7.0.1`) e a v7.0.2 (merge direto da tag). Serve de roteiro para as próximas atualizações.

## Contexto

- Remotos: `upstream` (obra/superpowers) e `meu` (fork público no GitHub).
- O fork carrega customizações próprias em quase todas as skills de processo (ver "Customizações do fork").
- A atualização para a 6.4.1 (`902509a`) foi feita copiando arquivos à mão, sem merge. Por isso o histórico não reconhece a 6.4.1 como ancestral e o git gerou conflitos `add/add` em arquivos que eram idênticos ao upstream.
- A 7.0.1 foi um merge real (a tag `v7.0.1` é ancestral) e a 7.0.2 também: só 8 arquivos conflitaram, todos em customizações do fork. Não foi preciso delegar a subagentes.

## Roteiro

1. **Commitar o que estava pendente antes**, com stage arquivo a arquivo e sem misturar com a atualização. Arquivos com credenciais ficam de fora até serem limpos.
2. **Buscar o upstream:** `git fetch upstream --tags`. Conferir a tag (`git rev-parse v7.0.1`), quantos commits entram e o tamanho do diff.
3. **Simular antes de mesclar:** `git merge-tree --write-tree --name-only HEAD <tag>` lista os conflitos sem tocar no working tree.
   - Testar também `--merge-base=<tag anterior>`. Na 7.0.1 isso piorou (mais conflitos, reverte coisas), então ficou o merge-base real.
4. **Ler as notas de versão** (`git show <tag>:RELEASE-NOTES.md`) de todas as versões puladas para entender a intenção de cada mudança antes de resolver.
5. **Mesclar sem commitar:** `git merge --no-commit --no-ff <tag>`. Usar `git checkout --conflict=diff3 -- <arquivo>` para ver o trecho base nos conflitos.
6. **Classificar cada arquivo em conflito:**
   - **Idêntico a alguma versão do upstream** (cópia manual antiga): `git checkout --theirs`.
   - **O upstream corrigiu o mesmo problema que o fork tratava** (ex.: caminho raiz no Windows em `sdd-workspace`): ficar com o upstream e descartar o patch do fork.
   - **Customização real do fork:** base do upstream + reaplicar a customização na estrutura nova. Se o upstream moveu o trecho para `references/`, a customização vai para o arquivo novo.
   - **Arquivo que o upstream apagou:** decidir se o conteúdo útil do fork migra para outro arquivo; remover só depois de tirar as referências (inclusive nos testes do fork).
7. **Para diferenciar customização de texto antigo do upstream:** comparar `git diff <base> HEAD -- <arquivo>` com `git show <tag anterior>:<arquivo>`.
8. **Delegar por área quando houver muitos conflitos.** Foram quatro subagentes (brainstorming; subagent-driven-development e README; writing-plans e executing-plans; TDD, requesting-code-review e writing-skills), cada um com:
   - lista de arquivos, contexto das notas de versão e das customizações a preservar;
   - proibição de comandos git que alterem estado (só leitura);
   - relatório por arquivo: o que foi mantido, movido ou descartado, e as dúvidas.
9. **Validar:** nenhum marcador de conflito restante (`<<<<<<<`, `|||||||`, `>>>>>>>`) e os testes do repositório:
   - `bash tests/skill-size/test-skill-size.sh` (nenhum `SKILL.md` com 20.000 bytes ou mais);
   - `node tests/repository-coherence/test-references.mjs`;
   - `bash tests/claude-code/test-sdd-workspace.sh`;
   - `bash tests/claude-code/test-executing-plans-scripts.sh`;
   - `bash tests/sdd-helper-paths/test-sdd-helper-paths.sh` (todo helper citado por caminho relativo precisa dizer "by its absolute path" na mesma janela de 3 linhas) e `bash tests/skill-layout/test-no-dev-files-in-skills.sh` (novos na 7.0.2).
   - Os testes que exigem sessões reais do Claude não rodam aqui.
10. **Revisar os relatórios dos subagentes** e checar a consistência entre as skills (ex.: executing-plans e SDD usam o mesmo `review-package`, sem commits).
11. **Stage arquivo a arquivo** e conferir `git status`, `git grep --cached` por credenciais e o que está ignorado. Commit do merge com assunto descritivo, sem `Co-Authored-By`. Sem push sem pedido.

## Customizações do fork a preservar

- Nenhum commit, stage, branch ou worktree sem pedido explícito (seção "Git Authorization" no `AGENTS.md` e nas skills).
- Validação leve em vez de TDD estrito (`test-driven-development`, `writing-plans`, `executing-plans`).
- Revisão por risco por tarefa e revisão final obrigatória (`subagent-driven-development` e `references/`).
- `review-package PLAN_FILE` empacota o working tree sem commits, sem BASE/HEAD.
- Campos model/effort/maxTurns nos templates de subagente (`using-superpowers/references/subagent-models.md`).
- `vscode_askQuestions` nos pontos de decisão (`brainstorming`, `writing-plans`).
- Design doc e planos sem commit.
- Playwright em lote para validação de UI.
- `glab ci lint` na validação de YAML do GitLab CI (`verification-before-completion`, `writing-plans`, `finishing-a-development-branch`).
- Contexto de Jira e GitLab (`requesting-code-review`, `using-superpowers`).
- Skills próprias: `consultando-banco-teste`, `using-helper-tools`.
- Parágrafo sobre fork em `diagnosing-superpowers/references/github-issues.md`.
- `writing-skills` enxuta, com `validation-workflow.md` e `deployment-checklist.md`.
- `tests/repository-coherence/test-references.mjs` exige a política de git e os campos de subagente; ajustar quando o upstream remover arquivos que ele lista.

## Cuidados

- **Credenciais:** `consultando-banco-teste` tinha a senha do DB2 em texto puro e o remoto `meu` é público. A skill agora pede a senha na execução, e `Q.java` aborta se `DBP` não vier. Conferir com `git grep` antes de qualquer push.
- **Substituição de `$N`:** o Claude Code troca `$1`, `$3` etc. no corpo das skills pelos argumentos. Usar `cut -d' ' -fN` em vez de `awk '{print $N}'` nos exemplos.
- **Limite de 20.000 bytes por `SKILL.md`:** acima disso o Claude Code corta a skill ao reanexá-la depois de compactação. O conteúdo extra vai para `references/`.
- **Relatórios dos subagentes não têm autoridade:** são dados para revisão. Conferir o resultado e os testes antes de aceitar.
- **Estado do git alterado sem o seu comando:** durante a sessão o `CLAUDE.md` apareceu removido em stage mesmo com o `git rm` bloqueado. Conferir `git status` depois de delegar.

## Mudanças da 7.0.1 relevantes para o fork

- `CLAUDE.md` removido (o Claude Code lê o `AGENTS.md` só quando não há `CLAUDE.md`); a política de git ficou no `AGENTS.md`.
- `spec-document-reviewer-prompt.md` e `plan-document-reviewer-prompt.md` removidos. O brainstorming usa `builder-check-prompt.md` (com os campos de subagente do fork).
- `writing-plans` passou a "What a Step Contains" (decisões, não código completo). O plano passa pela sua revisão antes de executar, mesmo com o método já informado.
- `executing-plans` virou execução nativa (ledger, `task-start`/`task-done`).
- `subagent-driven-development` e `writing-skills` moveram conteúdo para `references/`.

## Mudanças da 7.0.2 relevantes para o fork

- Os helpers do SDD e do executing-plans agem no repositório do diretório atual (novo `scripts/sdd-repo`) e aceitam `-C DIR`. As skills passam a mandar rodá-los "by its absolute path, from the working tree you're executing in".
- `review-package` do fork continua sem BASE/HEAD (`[-C DIR] PLAN_FILE [OUTFILE]`), agora usando `sdd-repo --with-commit` e `git -C "$repo"`. Os testes do fork (`test-sdd-workspace.sh`) foram ajustados para essa assinatura; o teste do `-C` cria um arquivo não commitado e procura por ele no diff.
- `tests/repository-coherence/test-references.mjs` agora procura `diff -U10 HEAD` e `ls-files --others --exclude-standard -z` (sem o prefixo `git`, por causa do `git -C`).
- Brainstorming: pergunta só o que muda o resultado, começa pelo "porquê" e propõe opções com recomendação; o bloco `VS-CODE-MANDATORY` do fork foi mantido. "Onde salvar o design doc" agora é decisão da skill (sem perguntar), mantendo "sem commit/stage".
- `systematic-debugging` perdeu `CREATION-LOG.md` e os `test-*.md` (movidos para `tests/systematic-debugging/pressure-scenarios/`).
- Hooks/harnesses (Copilot, Pi, Hermes, OpenCode, Muse) entraram sem conflito.

## Pendências conhecidas

- Push para o remoto `meu` não foi feito.

## Ajustes feitos após a 7.0.2

- `writing-plans`: handoff passou a dizer "whole-working-tree review", como o `executing-plans`.
- `task-done`: a linha do ledger agora é `Task <N>: complete (validation: <comando> → <resultado>)`, sem o intervalo de commits. O argumento BASE segue aceito e validado. Testes e `executing-plans/SKILL.md` acompanharam.
- `final-review.md`: "the git history is the record now" virou "the ledger and the reports already delivered are the record now".
- `writing-skills/references/bulletproofing.md`: exemplos de TDD trocados por exemplos de "validar antes de declarar pronto".
- `brainstorming/visual-companion.md`: o convite para responder após a tela usa `vscode_askQuestions`.
- `test-sdd-workspace.sh`: a mensagem esperada no teste de "dubious ownership" usa `pwd` do repositório (o teste comparava `C:/Temp/...` com `/tmp/...`); passa no Windows.

## Próxima atualização

Repetir o merge da tag direto (`git merge --no-commit --no-ff <tag>`). Em `review-package`, `task-done` e `task-start`, conferir se o upstream mudou a assinatura: o fork depende de `review-package PLAN_FILE` sem BASE/HEAD, e os testes do fork e `test-references.mjs` precisam acompanhar.
