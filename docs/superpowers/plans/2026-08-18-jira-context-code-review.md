# Contexto do Jira na Revisão de Código — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que a skill `requesting-code-review` receba uma chave de issue do Jira Cloud, entregue ao subagente revisor o contexto da demanda (issue principal + filhos) e recorte o diff aos commits daquela issue.

**Architecture:** Dois scripts independentes na pasta da skill — um busca o Jira e grava markdown, outro resolve o diff e grava `.diff`. Ambos imprimem apenas o caminho do arquivo gerado em stdout. A SKILL.md ganha um bloco aditivo que encadeia os dois e repassa os caminhos aos placeholders já existentes do template `code-reviewer.md`, que não muda.

**Tech Stack:** Node 22 (`fetch` global, sem dependências externas), Bash 5.3, Git 2.55, Jira Cloud REST API v2.

## Global Constraints

- Repositório de trabalho: o fork do `superpowers`. Nenhuma alteração no repo usado como cobaia de teste.
- Os passos abaixo referenciam dois repositórios por variável, para não amarrar o plano a um caminho de máquina. Exporte as duas antes de começar:
  - `SP` — raiz do fork do `superpowers` (onde este plano está).
  - `REPO_TESTE` — um repositório qualquer com histórico real citando chaves do Jira, usado só para validar o `resolve-diff.sh`.
  ```bash
  export SP="$(git -C /caminho/do/superpowers rev-parse --show-toplevel)"
  export REPO_TESTE=/caminho/do/repo/com/historico-jira
  ```
- **Nenhum commit.** Criar e alterar arquivos apenas; o commit é decisão do usuário.
- Comentários de código sempre em Português do Brasil (regra do CLAUDE.md do usuário).
- Prosa da `SKILL.md` em inglês, para casar com o restante do arquivo, que vem do upstream `obra/superpowers`.
- Zero dependências npm. Sem `jq` — não está instalado na máquina.
- API do Jira: `/rest/api/2/` (devolve descrição em texto plano; a v3 devolveria ADF em JSON).
- Artefatos gerados vão para `$HOME/.claude/reviews/`, fora de qualquer repositório.
- Limite de 30 filhos por issue; excedente é reportado no markdown, nunca truncado em silêncio.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `.gitignore` (raiz) | *Modificar* — impedir que `.env` seja rastreado |
| `skills/requesting-code-review/.env.example` | *Criar* — modelo versionado das credenciais, sem segredo |
| `skills/requesting-code-review/.env` | *Criado pelo usuário* — credenciais reais, não versionado |
| `skills/requesting-code-review/scripts/jira-context.mjs` | *Criar* — busca no Jira e geração do markdown |
| `skills/requesting-code-review/scripts/resolve-diff.sh` | *Criar* — resolução do diff em três modos |
| `skills/requesting-code-review/SKILL.md` | *Modificar* — bloco aditivo encadeando os dois scripts |

---

### Task 1: Blindagem do segredo

**Risk:** low — dois arquivos de texto, sem lógica e sem consumidores a jusante. Mas precisa vir **primeiro**: o repositório tem remote público (`github.com/ZaitBr-bit/superpowers`), e criar o `.env` antes do `.gitignore` abriria uma janela em que o token fica rastreável.

**Files:**
- Modify: `.gitignore`
- Create: `skills/requesting-code-review/.env.example`

- [ ] **Step 1: Adicionar `.env` ao `.gitignore` da raiz**

Acrescentar ao final do `.gitignore` na raiz do repo:

```
# Credenciais locais de skills (Jira, etc) — nunca versionar
.env
**/.env
```

O `.gitignore` atual ignora `.worktrees/`, `.private-journal/`, `.claude/`, `.superpowers/`, `.DS_Store`, `node_modules/`, `inspo`, `triage/` e `evals/`. Nenhuma dessas entradas cobre `.env`.

- [ ] **Step 2: Confirmar que o padrão pega o caminho certo**

Run:
```bash
cd "$SP"
touch skills/requesting-code-review/.env
git check-ignore -v skills/requesting-code-review/.env
rm skills/requesting-code-review/.env
```
Expected: a saída nomeia o `.gitignore` e a linha do padrão que casou, por exemplo `.gitignore:15:**/.env	skills/requesting-code-review/.env`. Exit code 0. Se nada for impresso e o código for 1, o padrão não está pegando — corrija antes de seguir.

- [ ] **Step 3: Criar `.env.example`**

Criar `skills/requesting-code-review/.env.example`:

```
# Credenciais do Jira Cloud usadas por scripts/jira-context.mjs
# Copie este arquivo para .env (mesma pasta) e preencha os valores reais.
# O .env e ignorado pelo git - nunca commite credenciais.

# URL do site Jira Cloud, sem barra no final
JIRA_BASE_URL=https://SEUDOMINIO.atlassian.net

# E-mail da conta Atlassian
JIRA_EMAIL=voce@empresa.com.br

# API token gerado em https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_API_TOKEN=ATATT3x...
```

- [ ] **Step 4: Verificar que só o exemplo aparece como novidade**

Run: `cd "$SP" && git status --porcelain`
Expected: lista `M .gitignore` e `?? skills/requesting-code-review/.env.example`. Não pode aparecer nenhum `.env` sem sufixo.

---

### Task 2: Script de contexto do Jira

**Risk:** medium — I/O de rede, autenticação, tratamento de erro HTTP e dois endpoints de busca com queda entre eles. Errar aqui produz contexto silenciosamente incompleto para o revisor.

**Files:**
- Create: `skills/requesting-code-review/scripts/jira-context.mjs`

**Interfaces:**
- Consumes: `skills/requesting-code-review/.env`, cujo formato a Task 1 documentou em `.env.example`.
- Produces: executável por `node scripts/jira-context.mjs <CHAVE>`. Imprime em stdout **uma única linha** com o caminho absoluto do markdown gerado (`$HOME/.claude/reviews/jira-<CHAVE>.md`). Erros vão para stderr com prefixo `ERRO:` e exit code 1. A Task 4 depende desse contrato de stdout.

- [ ] **Step 1: Criar o script completo**

Criar `skills/requesting-code-review/scripts/jira-context.mjs`:

```javascript
#!/usr/bin/env node
// Busca uma issue do Jira Cloud, suas subtarefas e suas issues filhas de Epic,
// gerando um arquivo markdown de contexto para o subagente revisor de codigo.
//
// Uso:   node jira-context.mjs CISS-180745
// Saida: imprime em stdout apenas o caminho absoluto do markdown gerado.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const RAIZ_SKILL = dirname(dirname(fileURLToPath(import.meta.url)));
const CAMINHO_ENV = join(RAIZ_SKILL, '.env');
const DIR_SAIDA = join(homedir(), '.claude', 'reviews');
const MAX_FILHOS = 30;

// Campos pedidos ao Jira. Manter enxuto: cada campo extra engorda o arquivo
// que o revisor vai ler.
const CAMPOS = [
  'summary', 'description', 'issuetype', 'status', 'priority',
  'assignee', 'reporter', 'fixVersions', 'labels', 'resolution', 'subtasks',
];

// Encerra o processo com mensagem em stderr e codigo 1.
function erro(mensagem) {
  console.error(`ERRO: ${mensagem}`);
  process.exit(1);
}

// Le o .env da pasta da skill e devolve a base da URL e o header Basic ja
// montado. Falha nomeando a variavel ausente, para o usuario saber o que
// corrigir sem abrir o codigo.
function carregaCredenciais() {
  let bruto;
  try {
    bruto = readFileSync(CAMINHO_ENV, 'utf8');
  } catch {
    erro(
      `Arquivo de credenciais nao encontrado: ${CAMINHO_ENV}\n` +
      `Copie .env.example para .env na mesma pasta e preencha os valores.`
    );
  }

  const env = {};
  for (const linha of bruto.split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const pos = limpa.indexOf('=');
    if (pos === -1) continue;
    env[limpa.slice(0, pos).trim()] = limpa.slice(pos + 1).trim();
  }

  for (const nome of ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN']) {
    if (!env[nome]) erro(`Variavel ${nome} ausente ou vazia em ${CAMINHO_ENV}`);
  }

  return {
    base: env.JIRA_BASE_URL.replace(/\/+$/, ''),
    auth: Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64'),
  };
}

// Executa uma requisicao autenticada na API do Jira e devolve o JSON.
// Anexa o status HTTP ao erro para quem chama decidir a mensagem.
async function chamaJira(cred, caminho, corpo = null) {
  const resposta = await fetch(`${cred.base}${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: {
      Authorization: `Basic ${cred.auth}`,
      Accept: 'application/json',
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  if (!resposta.ok) {
    const falha = new Error(`HTTP ${resposta.status} em ${caminho}`);
    falha.status = resposta.status;
    throw falha;
  }
  return resposta.json();
}

// Busca uma issue completa pela chave, com os campos que interessam a revisao.
async function buscaIssue(cred, chave) {
  const params = new URLSearchParams({ fields: CAMPOS.join(',') });
  return chamaJira(cred, `/rest/api/2/issue/${encodeURIComponent(chave)}?${params}`);
}

// Busca as issues filhas via JQL. Tenta o endpoint novo do Cloud (/search/jql)
// e cai para o antigo (/search) caso o site ainda nao o exponha.
async function buscaFilhasPorJql(cred, chave) {
  const jql = `parent = "${chave}" ORDER BY key ASC`;
  try {
    const r = await chamaJira(cred, '/rest/api/2/search/jql', {
      jql,
      fields: ['summary'],
      maxResults: MAX_FILHOS,
    });
    return r.issues ?? [];
  } catch (falha) {
    if (falha.status !== 404 && falha.status !== 410) throw falha;
    const params = new URLSearchParams({
      jql,
      fields: 'summary',
      maxResults: String(MAX_FILHOS),
    });
    const r = await chamaJira(cred, `/rest/api/2/search?${params}`);
    return r.issues ?? [];
  }
}

// Reune os filhos da issue: subtarefas diretas mais o resultado da JQL
// `parent =`. Deduplica por chave, porque a JQL tambem devolve as subtarefas ja
// listadas em fields.subtasks. Cada filho e buscado por completo para termos
// sua descricao, que nao vem no resumo de fields.subtasks.
async function coletaFilhos(cred, principal) {
  const chaves = [];
  const vistas = new Set();

  for (const sub of principal.fields.subtasks ?? []) {
    if (!vistas.has(sub.key)) {
      vistas.add(sub.key);
      chaves.push(sub.key);
    }
  }

  let avisoJql = null;
  try {
    for (const filha of await buscaFilhasPorJql(cred, principal.key)) {
      if (!vistas.has(filha.key)) {
        vistas.add(filha.key);
        chaves.push(filha.key);
      }
    }
  } catch (falha) {
    avisoJql = `busca de issues filhas por JQL falhou (${falha.message}); apenas as subtarefas diretas estao listadas`;
  }

  const omitidos = Math.max(0, chaves.length - MAX_FILHOS);
  const filhos = [];
  for (const chave of chaves.slice(0, MAX_FILHOS)) {
    try {
      filhos.push(await buscaIssue(cred, chave));
    } catch (falha) {
      filhos.push({ key: chave, indisponivel: falha.message });
    }
  }

  return { filhos, omitidos, avisoJql };
}

// Formata uma issue como secao markdown. `nivel` define a profundidade do titulo.
function secaoIssue(issue, nivel) {
  const titulo = '#'.repeat(nivel);

  if (issue.indisponivel) {
    return `${titulo} ${issue.key}\n\nNao foi possivel buscar esta issue: ${issue.indisponivel}\n`;
  }

  const f = issue.fields;
  const nomes = (itens) => (itens ?? []).map((i) => i.name).join(', ') || '-';

  return [
    `${titulo} ${issue.key} - ${f.summary}`,
    '',
    `- Tipo: ${f.issuetype?.name ?? '-'}`,
    `- Status: ${f.status?.name ?? '-'}`,
    `- Prioridade: ${f.priority?.name ?? '-'}`,
    `- Resolucao: ${f.resolution?.name ?? 'Nao resolvida'}`,
    `- Responsavel: ${f.assignee?.displayName ?? '-'}`,
    `- Relator: ${f.reporter?.displayName ?? '-'}`,
    `- Versoes corrigidas: ${nomes(f.fixVersions)}`,
    `- Labels: ${(f.labels ?? []).join(', ') || '-'}`,
    '',
    `${'#'.repeat(nivel + 1)} Descricao`,
    '',
    (f.description ?? '').trim() || '(sem descricao)',
    '',
  ].join('\n');
}

// Ponto de entrada: valida o argumento, busca issue e filhos, grava o markdown.
async function main() {
  const chave = process.argv[2];
  if (!chave) {
    erro('Informe a chave da issue. Exemplo: node jira-context.mjs CISS-180745');
  }
  if (!/^[A-Z][A-Z0-9]*-\d+$/.test(chave)) {
    erro(`Chave invalida: "${chave}". Formato esperado: PROJETO-123`);
  }

  const cred = carregaCredenciais();

  let principal;
  try {
    principal = await buscaIssue(cred, chave);
  } catch (falha) {
    if (falha.status === 401) erro('Token ou e-mail invalidos (HTTP 401).');
    if (falha.status === 403) erro(`Sem permissao para ler ${chave} (HTTP 403).`);
    if (falha.status === 404) erro(`Issue ${chave} nao existe ou nao e visivel para este usuario (HTTP 404).`);
    erro(`Falha ao buscar ${chave}: ${falha.message}`);
  }

  const { filhos, omitidos, avisoJql } = await coletaFilhos(cred, principal);

  const partes = [
    `# Contexto Jira - ${chave}`,
    '',
    `Origem: ${cred.base}/browse/${chave}`,
    '',
  ];

  if (avisoJql) partes.push(`> Aviso: ${avisoJql}`, '');

  partes.push('## Issue principal', '', secaoIssue(principal, 3));

  if (filhos.length) {
    partes.push(`## Filhos (${filhos.length})`, '');
    for (const filho of filhos) partes.push(secaoIssue(filho, 3));
  } else {
    partes.push('## Filhos', '', 'Nenhuma subtarefa ou issue filha encontrada.', '');
  }

  if (omitidos > 0) {
    partes.push(`> ${omitidos} filho(s) omitido(s): o limite por issue e ${MAX_FILHOS}.`, '');
  }

  mkdirSync(DIR_SAIDA, { recursive: true });
  const destino = join(DIR_SAIDA, `jira-${chave}.md`);
  writeFileSync(destino, partes.join('\n'), 'utf8');
  console.log(destino);
}

main().catch((falha) => erro(falha.stack ?? String(falha)));
```

- [ ] **Step 2: Validar os caminhos de erro que não dependem de credenciais**

Estes três casos exercitam validação de argumento e ausência de `.env`, sem tocar a rede.

Run:
```bash
cd "$SP/skills/requesting-code-review"
node scripts/jira-context.mjs; echo "exit=$?"
node scripts/jira-context.mjs "chave errada"; echo "exit=$?"
node scripts/jira-context.mjs CISS-180745; echo "exit=$?"
```
Expected:
1. `ERRO: Informe a chave da issue. Exemplo: node jira-context.mjs CISS-180745` e `exit=1`
2. `ERRO: Chave invalida: "chave errada". Formato esperado: PROJETO-123` e `exit=1`
3. `ERRO: Arquivo de credenciais nao encontrado: ...\.env` seguido da instrução de copiar o `.env.example`, e `exit=1`

Se algum sair com código 0, ou imprimir stack trace crua em vez da mensagem, corrija antes de seguir.

- [ ] **Step 3: Validar a detecção de variável faltante**

Run:
```bash
cd "$SP/skills/requesting-code-review"
printf 'JIRA_BASE_URL=https://x.atlassian.net\n# comentario\nJIRA_EMAIL=\n' > .env
node scripts/jira-context.mjs CISS-180745; echo "exit=$?"
rm .env
```
Expected: `ERRO: Variavel JIRA_EMAIL ausente ou vazia em ...` e `exit=1`. Confirma que comentários e linhas em branco são ignorados e que valor vazio conta como ausente.

- [ ] **Step 4: Checar sintaxe**

Run: `cd "$SP/skills/requesting-code-review" && node --check scripts/jira-context.mjs; echo "exit=$?"`
Expected: sem saída, `exit=0`.

---

### Task 3: Script de resolução do diff

**Risk:** medium — a lógica de recorte por commit é o que impede o revisor de receber a branch de release inteira. Um filtro errado troca um diff de 1 arquivo por um de 2000.

**Files:**
- Create: `skills/requesting-code-review/scripts/resolve-diff.sh`

**Interfaces:**
- Consumes: nada das tarefas anteriores. Roda no repositório de trabalho corrente (`cisspoder`), não no do superpowers.
- Produces: executável por `bash scripts/resolve-diff.sh <CHAVE> [--branch <ref>] [--diff-file <caminho>]`. Imprime em stdout **uma única linha** com o caminho absoluto de `$HOME/.claude/reviews/review-<CHAVE>.diff`. Erros em stderr com prefixo `ERRO:` e exit code 1. A Task 4 depende desse contrato.

- [ ] **Step 1: Criar o script completo**

Criar `skills/requesting-code-review/scripts/resolve-diff.sh`:

```bash
#!/usr/bin/env bash
# Resolve o diff a ser revisado para uma chave de issue do Jira e grava em
# $HOME/.claude/reviews/review-<CHAVE>.diff.
#
# Uso:
#   resolve-diff.sh CISS-180745
#   resolve-diff.sh CISS-180745 --branch 22.0.3.441
#   resolve-diff.sh CISS-180745 --diff-file /caminho/alteracoes.diff
#
# Saida: imprime em stdout apenas o caminho absoluto do arquivo gerado.
set -euo pipefail

CHAVE="${1:-}"
if [ -z "$CHAVE" ]; then
  echo "ERRO: informe a chave da issue. Exemplo: resolve-diff.sh CISS-180745" >&2
  exit 1
fi
shift

REF="HEAD"
DIFF_EXTERNO=""

while [ $# -gt 0 ]; do
  case "$1" in
    --branch)
      REF="${2:-}"
      if [ -z "$REF" ]; then echo "ERRO: --branch exige um nome de ref." >&2; exit 1; fi
      shift 2
      ;;
    --diff-file)
      DIFF_EXTERNO="${2:-}"
      if [ -z "$DIFF_EXTERNO" ]; then echo "ERRO: --diff-file exige um caminho." >&2; exit 1; fi
      shift 2
      ;;
    *)
      echo "ERRO: opcao desconhecida: $1" >&2
      exit 1
      ;;
  esac
done

DIR_SAIDA="$HOME/.claude/reviews"
mkdir -p "$DIR_SAIDA"
DESTINO="$DIR_SAIDA/review-$CHAVE.diff"

# Modo 1: diff fisico fornecido pelo usuario, para revisao antes do merge.
# Nao toca no git - o arquivo pode vir de outra maquina ou de um merge request.
if [ -n "$DIFF_EXTERNO" ]; then
  if [ ! -f "$DIFF_EXTERNO" ]; then
    echo "ERRO: arquivo de diff nao encontrado: $DIFF_EXTERNO" >&2
    exit 1
  fi
  if [ ! -s "$DIFF_EXTERNO" ]; then
    echo "ERRO: arquivo de diff esta vazio: $DIFF_EXTERNO" >&2
    exit 1
  fi
  cp "$DIFF_EXTERNO" "$DESTINO"
  echo "$DESTINO"
  exit 0
fi

# Modos 2 e 3: recorta os commits que citam a chave na ref escolhida.
# --no-merges e a ref unica sao obrigatorios. Sem eles, a busca traz tambem os
# commits de merge e as versoes do mesmo fix em outras branches de release,
# multiplicando o diff pelo numero de versoes em que o chamado foi corrigido.
if ! git rev-parse --verify --quiet "$REF" >/dev/null; then
  echo "ERRO: ref inexistente no repositorio atual: $REF" >&2
  exit 1
fi

COMMITS="$(git log --no-merges --grep="$CHAVE" --reverse --format=%H "$REF")"
if [ -z "$COMMITS" ]; then
  echo "ERRO: nenhum commit em '$REF' cita $CHAVE. Nada a revisar." >&2
  exit 1
fi

: > "$DESTINO"
for SHA in $COMMITS; do
  git show --no-color "$SHA" >> "$DESTINO"
done

if [ ! -s "$DESTINO" ]; then
  echo "ERRO: o diff gerado ficou vazio para $CHAVE em '$REF'." >&2
  exit 1
fi

echo "$DESTINO"
```

- [ ] **Step 2: Checar sintaxe**

Run: `bash -n "$SP/skills/requesting-code-review/scripts/resolve-diff.sh"; echo "exit=$?"`
Expected: sem saída, `exit=0`.

- [ ] **Step 3: Validar o recorte real no repositório cisspoder**

Este é o teste que prova o valor do script: a mesma chave sem os filtros traz a branch inteira.

Run:
```bash
cd "$REPO_TESTE"
S="$SP/skills/requesting-code-review/scripts/resolve-diff.sh"
D=$(bash "$S" CISS-180745)
echo "arquivo: $D"
grep -c '^diff --git' "$D"
grep '^diff --git' "$D" | awk '{print $3}' | sed 's|^a/||'
```
Expected: `arquivo:` apontando para `.../.claude/reviews/review-CISS-180745.diff`, contagem `1`, e o caminho `ws_objects/Fontes/financeiro.pbl.src/d_titulos_importados_dda.srd`. Se a contagem vier na casa das centenas ou milhares, os filtros `--no-merges` / ref única não estão sendo aplicados.

- [ ] **Step 4: Validar os caminhos de erro**

Run:
```bash
cd "$REPO_TESTE"
S="$SP/skills/requesting-code-review/scripts/resolve-diff.sh"
bash "$S"; echo "exit=$?"
bash "$S" CISS-999999; echo "exit=$?"
bash "$S" CISS-180745 --branch nao-existe; echo "exit=$?"
bash "$S" CISS-180745 --diff-file /caminho/inexistente.diff; echo "exit=$?"
```
Expected, todos com `exit=1`:
1. `ERRO: informe a chave da issue. Exemplo: resolve-diff.sh CISS-180745`
2. `ERRO: nenhum commit em 'HEAD' cita CISS-999999. Nada a revisar.`
3. `ERRO: ref inexistente no repositorio atual: nao-existe`
4. `ERRO: arquivo de diff nao encontrado: /caminho/inexistente.diff`

- [ ] **Step 5: Validar o modo `--branch` numa ref válida**

Run:
```bash
cd "$REPO_TESTE"
S="$SP/skills/requesting-code-review/scripts/resolve-diff.sh"
D=$(bash "$S" CISS-180745 --branch HEAD)
grep -c '^diff --git' "$D"
```
Expected: `1`, idêntico ao Step 3. Confirma que passar a ref explicitamente produz o mesmo recorte do padrão.

---

### Task 4: Encadear os scripts na SKILL.md

**Risk:** low — texto instrucional aditivo, sem lógica executável própria; os dois contratos de stdout que ele consome já foram validados nas Tasks 2 e 3.

**Files:**
- Modify: `skills/requesting-code-review/SKILL.md` (seção "How to Request")

- [ ] **Step 1: Inserir o bloco do Jira**

Em `SKILL.md`, logo após o bloco de código do passo 1 e sua frase "Pass the path, not the diff text. The diff stays out of the controller context.", inserir o texto abaixo. A prosa fica em inglês para casar com o restante do arquivo, que vem do upstream.

Conteúdo a inserir (as cercas internas de código são de três crases no arquivo final):

> **1b. When a Jira issue key is supplied — gather demand context and scope the diff:**
>
> Both scripts live in this skill's directory and print a single path to stdout.
> Pass those paths onward, never their contents.
>
> ```bash
> SKILL=<this skill's base directory>
> JIRA_FILE=$(node "$SKILL/scripts/jira-context.mjs" CISS-180745)
> DIFF_FILE=$(bash "$SKILL/scripts/resolve-diff.sh" CISS-180745)
> ```
>
> `resolve-diff.sh` accepts two optional flags:
> - `--branch <ref>` — search the issue's commits on that ref instead of `HEAD`
> - `--diff-file <path>` — use a physical diff file as-is, for pre-merge review
>
> `jira-context.mjs` reads its credentials from `.env` in this skill's directory
> (see `.env.example`). Never pass the token through the conversation.
>
> Derive the changed-file list for the reviewer prompt from the diff itself:
>
> ```bash
> grep '^diff --git' "$DIFF_FILE" | awk '{print $3}' | sed 's|^a/||' | sort -u
> ```
>
> Then dispatch as in step 2, setting `{PLAN_OR_REQUIREMENTS}` to `$JIRA_FILE` —
> a path, exactly as the template's "plan file path" usage intends.
>
> Either script exiting non-zero aborts the review. Do not dispatch a reviewer
> with an empty diff, or without the demand context that was requested.

- [ ] **Step 2: Atualizar a lista de placeholders**

Na mesma seção, a linha atual é:

```
- `{PLAN_OR_REQUIREMENTS}` - What it should do
```

Substituir por:

```
- `{PLAN_OR_REQUIREMENTS}` - What it should do (a plan file path, or the Jira context file from step 1b)
```

- [ ] **Step 3: Conferir que o restante do arquivo não mudou**

Run: `cd "$SP" && git diff --stat skills/requesting-code-review/SKILL.md`
Expected: um único arquivo alterado, inserções na casa de ~30 linhas e no máximo 1 deleção — a linha do placeholder substituída no Step 2. Se houver mais deleções, algo do upstream foi removido por engano; reverta e refaça.

- [ ] **Step 4: Verificar o estado final do repositório**

Run: `cd "$SP" && git status --porcelain`
Expected, exatamente:
```
 M .gitignore
 M skills/requesting-code-review/SKILL.md
?? docs/superpowers/plans/2026-08-18-jira-context-code-review.md
?? docs/superpowers/specs/2026-08-18-jira-context-code-review-design.md
?? skills/requesting-code-review/.env.example
?? skills/requesting-code-review/scripts/
```
Nenhum `.env` sem sufixo pode aparecer. **Não commitar** — o commit é decisão do usuário.

---

## Validação final pelo usuário

Os passos acima cobrem tudo que é verificável sem credenciais reais. A validação ponta a ponta exige o `.env` preenchido, e por isso não é uma tarefa do plano:

1. Copiar `.env.example` para `.env` e preencher `JIRA_BASE_URL`, `JIRA_EMAIL` e `JIRA_API_TOKEN`.
2. Rodar `node scripts/jira-context.mjs CISS-180745`. Deve imprimir um caminho; abrir o markdown e conferir que a issue principal e os filhos estão lá.
3. Rodar `/superpowers:requesting-code-review CISS-180745` e conferir que o revisor recebeu os dois caminhos.

Até o passo 1 ser feito, o script falha com `ERRO: Arquivo de credenciais nao encontrado` — que é o comportamento correto, validado na Task 2 Step 2.
