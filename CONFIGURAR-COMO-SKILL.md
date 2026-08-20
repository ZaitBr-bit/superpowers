# Configurar este repositório como plugin de skills do Claude Code

> **Para o agente:** este arquivo é o roteiro completo. O usuário chegou com algo
> como *"Configure esse repositorio como skill - C:\ControleVersaoGit\VSCode\superpowers"*.
> Execute as seções em ordem e pare onde o roteiro mandar parar.

Este repositório é um fork de [obra/superpowers](https://github.com/obra/superpowers).
Ele não é uma skill solta: é um **plugin** que carrega ~15 skills e um hook de
`SessionStart` que injeta o bootstrap `using-superpowers`. Sem esse hook as skills
existem em disco mas nunca disparam sozinhas.

---

## 0. Regras que valem para todo este roteiro

- **Nunca commitar, dar stage, criar branch, worktree, push, merge ou rebase.** Este
  roteiro só instala e valida. Se algo precisar de mudança versionada, reporte e pare.
- **Nunca pedir, ler, exibir ou ecoar o token do Jira.** Ver a seção 5.
- **Nunca instalar dependência que o roteiro não pede.** Em especial: não instale
  bash pelo Homebrew no macOS (ver seção 3).
- Se qualquer passo falhar, **pare e reporte o comando e a saída**. Não improvise
  contorno.

---

## 1. Resolver o caminho do repositório

O caminho vem no prompt do usuário. Se não veio, pergunte antes de continuar — não
adivinhe, não use o diretório atual.

Confirme que o caminho é mesmo este repositório:

```bash
REPO="<caminho informado pelo usuário>"
test -f "$REPO/.claude-plugin/plugin.json" || echo "ERRO: não é o repo do superpowers"
test -f "$REPO/hooks/session-start"        || echo "ERRO: hook não encontrado"
```

Os dois arquivos precisam existir. Se algum faltar, pare.

---

## 2. Detectar o sistema operacional

```bash
uname -s
```

- `Darwin` → macOS. Siga as notas marcadas **[macOS]**.
- `MINGW*`, `MSYS*`, `CYGWIN*` → Windows com Git Bash. Notas **[Windows]**.
- `Linux` → trate como macOS para efeito de caminhos POSIX.

**[Windows]** O caminho na configuração fica em formato Windows
(`C:\ControleVersaoGit\VSCode\superpowers`), mesmo você estando no Git Bash.

**[macOS]** Use caminho POSIX (`/Users/<voce>/…`). Não há letra de drive.

---

## 3. Conferir pré-requisitos

```bash
git --version
node --version
bash --version | head -1
```

Os três precisam responder. Sobre a versão do bash:

**[macOS] O bash 3.2.57 que vem de fábrica é suficiente. NÃO instale bash pelo
Homebrew.** Todo o código deste fork foi validado em container com bash 3.2.57 —
não há nenhuma construção de bash 4+ nos scripts. Instalar bash 5 é mudança
desnecessária na máquina do usuário.

**[macOS]** O `timeout` do GNU não existe no macOS, mas **isso não afeta o uso do
plugin** — só a suíte de testes para contribuidores. Se o usuário for rodar os
testes, aí sim: `brew install coreutils` (instala `gtimeout`, que
`tests/lib/timeout.sh` encontra sozinho). Não instale por antecipação.

---

## 4. Registrar o marketplace e instalar o plugin

O repositório traz o próprio marketplace em `.claude-plugin/marketplace.json`, com
nome **`superpowers-dev`** e `"source": "./"` — é isso que permite instalar a partir
de um diretório local em vez do marketplace público.

**Você, agente, executa isto por shell.** A CLI `claude plugin` faz tudo que os
slash commands fazem:

```bash
claude plugin marketplace add "$REPO"
claude plugin install superpowers@superpowers-dev
```

Notas sobre os comandos:

- `marketplace add` aceita caminho, URL ou repo do GitHub. Aqui é o caminho local.
  O nome do marketplace (`superpowers-dev`) vem do `marketplace.json`, não do
  caminho — não invente outro nome.
- `install` aceita `--scope user|project|local` (padrão `user`, que é o certo aqui).
- Se a saída não for um terminal, `install` pode exigir `-y` para não travar num
  prompt de confirmação. Acrescente `-y` só se ele reclamar.

O equivalente na interface, caso o usuário prefira fazer à mão, é
`/plugin marketplace add <caminho>` e `/plugin install superpowers@superpowers-dev`.

Confirme o resultado com dois comandos de leitura:

```bash
claude plugin marketplace list
claude plugin list --json
```

Esperado: `superpowers-dev` com `Source: Directory (<caminho>)`, e uma entrada
`superpowers@superpowers-dev` com `"enabled": true` e `"scope": "user"`.

Se `enabled` não for `true`, a instalação não concluiu. Pare e reporte — **não edite
`~/.claude/settings.json` à mão para "consertar"**: a instalação grava estado em
mais de um arquivo (`settings.json`, `installed_plugins.json`,
`known_marketplaces.json`), e mexer só num deles produz um estado que parece
instalado e não está.

### O plugin lê AO VIVO deste repositório

Marketplace de origem `directory` não copia os arquivos. Confirme:

```bash
node -e '
const fs=require("fs"), os=require("os"), p=require("path");
const d=JSON.parse(fs.readFileSync(p.join(os.homedir(),".claude","plugins","known_marketplaces.json"),"utf8"));
console.log("installLocation:", d["superpowers-dev"] && d["superpowers-dev"].installLocation);
'
```

O `installLocation` aponta para o próprio repositório. Duas consequências que você
deve comunicar ao usuário:

- **Editar uma skill neste repo tem efeito na próxima sessão, sem reinstalar.** É
  isso que torna o fork utilizável como ambiente de trabalho.
- **A versão registrada na instalação fica velha.** `claude plugin list --json`
  mostra o `version` e o `gitCommitSha` do momento da instalação, não o estado atual
  do repo. Divergência ali é cosmética, não defeito. Para atualizar o metadado:
  `claude plugin marketplace update superpowers-dev`.

---

## 5. Credenciais do Jira (opcional)

Só faça esta seção se o usuário for usar a skill `requesting-code-review` com chave
de issue do Jira. Se ele não pediu, **pule e mencione que existe**.

```bash
cd "$REPO/skills/requesting-code-review"
test -f .env || cp .env.example .env
echo "Arquivo pronto para preenchimento: $PWD/.env"
```

**Pare aqui.** Diga ao usuário para abrir esse `.env` e preencher `JIRA_BASE_URL`,
`JIRA_EMAIL` e `JIRA_API_TOKEN` **à mão**.

Como agente, você **não deve**:

- pedir o token no chat;
- ler o conteúdo do `.env` para "conferir";
- imprimir, ecoar ou repetir qualquer valor do arquivo;
- copiar o arquivo para outro lugar.

O `.env` é coberto pelo `.gitignore` (`.env` e `**/.env`), então não entra em commit.
Confirme isso sem abrir o arquivo:

```bash
cd "$REPO" && git check-ignore -v skills/requesting-code-review/.env
```

A saída deve nomear a linha do `.gitignore` que casou. Se **não** casar, avise o
usuário imediatamente — há risco de vazar credencial num commit futuro.

---

## 6. Validação essencial (nesta sessão)

Duas checagens. Elas provam que o plugin está registrado e que o hook produz o que o
Claude Code espera consumir.

**6.1 — O hook responde com JSON válido:**

```bash
cd "$REPO"
CLAUDE_PLUGIN_ROOT="$PWD" bash hooks/session-start | node -e '
let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
  const j=JSON.parse(s);
  const c=j.hookSpecificOutput.additionalContext;
  console.log("OK: hookEventName =", j.hookSpecificOutput.hookEventName);
  console.log("OK: contexto =", c.length, "chars");
  if (!/using-superpowers/.test(c)) throw new Error("bootstrap ausente no contexto");
});
'
```

Esperado: `hookEventName = SessionStart` e um contexto de alguns milhares de chars.
Se estourar exceção ou o JSON não parsear, o bootstrap está quebrado — pare e reporte.

**6.2 — O wrapper roda pelos dois caminhos:**

```bash
cd "$REPO"
CLAUDE_PLUGIN_ROOT="$PWD" bash hooks/run-hook.cmd session-start >/dev/null && echo "OK: via bash"
CLAUDE_PLUGIN_ROOT="$PWD" sh   hooks/run-hook.cmd session-start >/dev/null && echo "OK: via sh"
```

**[macOS]** Os dois precisam passar. O `run-hook.cmd` não tem shebang de propósito:
o sistema devolve ENOEXEC e o shell o reexecuta como script. É o mecanismo que faz
o mesmo arquivo servir Windows e macOS.

Não rode a suíte completa de testes aqui — ela não é pré-requisito de uso, e no
macOS precisa do `gtimeout` que a seção 3 diz para não instalar por antecipação.

---

## 7. PARE e entregue

A instalação termina aqui, e **você não consegue provar que funcionou nesta sessão**.

O hook de `SessionStart` roda no início de uma sessão. A sessão atual já começou
antes da instalação, então o bootstrap **não** foi injetado nela e as skills **não**
vão auto-disparar agora. Isso é esperado, não é defeito.

Reporte ao usuário, nestes termos:

1. o que foi instalado e o que a `settings.json` confirma;
2. se o `.env` do Jira foi criado e está aguardando preenchimento manual;
3. o resultado das duas checagens da seção 6;
4. **que ele precisa abrir uma sessão nova do Claude Code** para o plugin entrar em
   vigor.

Depois disso, o teste de aceitação é dele, não seu. Instrua:

> Abra uma sessão nova neste diretório e mande exatamente:
> **"Let's make a react todo list"**
>
> A skill `brainstorming` tem de disparar sozinha, **antes** de qualquer código —
> o agente deve começar classificando a tarefa (spike / bounded / architectural) e
> fazendo perguntas, nunca escrevendo arquivo. Se ele partir direto para o código,
> o bootstrap não carregou: volte à seção 4.

Esse é o critério que o próprio projeto define como prova de integração real.

---

## Apêndice: desinstalar ou reapontar

Para remover ou trocar o caminho, use a CLI — nunca edite os arquivos de estado à
mão:

```bash
claude plugin uninstall superpowers@superpowers-dev
claude plugin marketplace remove superpowers-dev
```

Depois registre de novo a partir do caminho correto (seção 4). Reinstalar exige,
outra vez, **sessão nova** para o hook voltar a valer.

Comandos de diagnóstico úteis, todos somente leitura:

```bash
claude plugin list --json                      # o que está instalado e habilitado
claude plugin marketplace list                 # marketplaces e suas origens
claude plugin details superpowers@superpowers-dev   # inventário e custo em tokens
claude plugin validate "$REPO"                 # valida plugin.json e marketplace.json
```

`claude plugin details` mostra o custo projetado em tokens do plugin — útil quando o
usuário quiser saber quanto do contexto as skills ocupam.
