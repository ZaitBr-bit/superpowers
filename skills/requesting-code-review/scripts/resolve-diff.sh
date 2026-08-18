#!/usr/bin/env bash
# Resolve o diff a ser revisado para uma chave de issue do Jira e grava em
# $HOME/.claude/reviews/review-<CHAVE>.diff.
#
# Uso:
#   resolve-diff.sh CISS-180745
#   resolve-diff.sh CISS-180745 --branch 22.0.3.441
#   resolve-diff.sh CISS-180745 --commit 9003c5a9
#   resolve-diff.sh CISS-180745 --diff-file /caminho/alteracoes.diff
#
# As opções --branch, --commit e --diff-file são mutuamente exclusivas.
#
# Saída: imprime em stdout apenas o caminho absoluto do arquivo gerado.
set -euo pipefail

CHAVE="${1:-}"
if [ -z "$CHAVE" ]; then
  echo "ERRO: informe a chave da issue. Exemplo: resolve-diff.sh CISS-180745" >&2
  exit 1
fi
# Mesmo formato exigido por jira-context.mjs. Além de pegar erro de digitação,
# impede que a chave carregue ".." ou barras: ela é interpolada no caminho de
# DESTINO, que logo adiante é truncado por ": > $DESTINO".
if ! printf '%s' "$CHAVE" | grep -Eq '^[A-Z][A-Z0-9]*-[0-9]+$'; then
  echo "ERRO: chave inválida: \"$CHAVE\". Formato esperado: PROJETO-123" >&2
  exit 1
fi
shift

REF="HEAD"
BRANCH_INFORMADA=""
COMMIT=""
DIFF_EXTERNO=""

while [ $# -gt 0 ]; do
  case "$1" in
    --branch)
      BRANCH_INFORMADA="${2:-}"
      if [ -z "$BRANCH_INFORMADA" ]; then echo "ERRO: --branch exige um nome de ref." >&2; exit 1; fi
      REF="$BRANCH_INFORMADA"
      shift 2
      ;;
    --commit)
      COMMIT="${2:-}"
      if [ -z "$COMMIT" ]; then echo "ERRO: --commit exige um sha." >&2; exit 1; fi
      shift 2
      ;;
    --diff-file)
      DIFF_EXTERNO="${2:-}"
      if [ -z "$DIFF_EXTERNO" ]; then echo "ERRO: --diff-file exige um caminho." >&2; exit 1; fi
      shift 2
      ;;
    *)
      echo "ERRO: opção desconhecida: $1" >&2
      exit 1
      ;;
  esac
done

# Os três modos escolhem o diff de formas incompatíveis entre si. Combinar dois
# deles significa que o usuário espera algo que o script não faz; falhar é mais
# honesto do que aplicar uma precedência silenciosa e revisar o alvo errado.
if [ -n "$COMMIT" ] && [ -n "$DIFF_EXTERNO" ]; then
  echo "ERRO: --commit e --diff-file são mutuamente exclusivos." >&2
  exit 1
fi
if [ -n "$COMMIT" ] && [ -n "$BRANCH_INFORMADA" ]; then
  echo "ERRO: --commit e --branch são mutuamente exclusivos: o commit já identifica o alvo." >&2
  exit 1
fi
if [ -n "$DIFF_EXTERNO" ] && [ -n "$BRANCH_INFORMADA" ]; then
  echo "ERRO: --diff-file e --branch são mutuamente exclusivos." >&2
  exit 1
fi

DIR_SAIDA="$HOME/.claude/reviews"
mkdir -p "$DIR_SAIDA"
DESTINO="$DIR_SAIDA/review-$CHAVE.diff"

# Modo 1: diff físico fornecido pelo usuário, para revisão antes do merge.
# Não toca no git - o arquivo pode vir de outra máquina ou de um merge request.
if [ -n "$DIFF_EXTERNO" ]; then
  if [ ! -f "$DIFF_EXTERNO" ]; then
    echo "ERRO: arquivo de diff não encontrado: $DIFF_EXTERNO" >&2
    exit 1
  fi
  if [ ! -s "$DIFF_EXTERNO" ]; then
    echo "ERRO: arquivo de diff está vazio: $DIFF_EXTERNO" >&2
    exit 1
  fi
  # Realimentar a saída de uma execução anterior aponta origem e destino para o
  # mesmo arquivo: o cp abortaria com "are the same file" sem o prefixo ERRO:.
  # Como o conteúdo já está no lugar certo, isso é sucesso.
  if [ "$DIFF_EXTERNO" -ef "$DESTINO" ]; then
    echo "$DESTINO"
    exit 0
  fi
  cp "$DIFF_EXTERNO" "$DESTINO"
  echo "$DESTINO"
  exit 0
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERRO: o diretório atual não é um repositório git: $PWD" >&2
  exit 1
fi

# Modo 2: um commit apontado explicitamente.
if [ -n "$COMMIT" ]; then
  SHA="$(git rev-parse --verify --quiet "${COMMIT}^{commit}" || true)"
  if [ -z "$SHA" ]; then
    echo "ERRO: commit inexistente no repositório atual: $COMMIT" >&2
    exit 1
  fi

  # rev-list --parents devolve "<sha> <pai1> <pai2>...", então o número de pais
  # é a contagem de palavras menos um.
  NUM_PAIS=$(( $(git rev-list --parents -n 1 "$SHA" | wc -w) - 1 ))

  # O cabeçalho vem do próprio git em ambos os casos, para que a saída tenha o
  # mesmo formato e o revisor sempre enxergue a mensagem do commit.
  git show --no-color --no-patch "$SHA" > "$DESTINO"
  printf '\n' >> "$DESTINO"

  if [ "$NUM_PAIS" -gt 1 ]; then
    # Num merge commit, "git show" usa o diff combinado (--cc), que só mostra
    # trechos divergentes de TODOS os pais - quase sempre quase nada. Num merge
    # de merge request típico o resultado é um punhado de linhas, e a revisão
    # sairia vazia sem ninguém perceber. O que interessa é o que o merge trouxe
    # para a linha do primeiro pai.
    echo "AVISO: $SHA é um merge commit ($NUM_PAIS pais); usando o diff de ${SHA}^1 para ${SHA}." >&2
    git diff --no-color "${SHA}^1" "$SHA" >> "$DESTINO"
  else
    git show --no-color --format= "$SHA" >> "$DESTINO"
  fi

  # A chave não restringe qual commit é revisado, mas nomeia o arquivo e escolhe
  # o contexto do Jira. Divergência entre os dois costuma ser engano de digitação.
  if ! git log -1 --format='%B' "$SHA" | grep -Eq "(^|[^A-Za-z0-9])${CHAVE}([^0-9]|$)"; then
    echo "AVISO: a mensagem de $SHA não cita $CHAVE; confira se a chave e o commit correspondem." >&2
  fi

  if ! grep -q '^diff --git' "$DESTINO"; then
    # Sem isso sobra um .diff só com cabeçalho no nome do caminho de sucesso,
    # que uma execução posterior poderia tomar por válido.
    rm -f "$DESTINO"
    echo "ERRO: o commit $SHA não altera nenhum arquivo. Nada a revisar." >&2
    exit 1
  fi

  echo "$DESTINO"
  exit 0
fi

# Modo 3: recorta os commits que citam a chave na ref escolhida.
# --no-merges e a ref única são obrigatórios. Sem eles, a busca traz também os
# commits de merge e as versões do mesmo fix em outras branches de release,
# multiplicando o diff pelo número de versões em que o chamado foi corrigido.

if ! git rev-parse --verify --quiet "$REF" >/dev/null; then
  echo "ERRO: ref inexistente no repositório atual: $REF" >&2
  exit 1
fi

# A chave precisa casar como token inteiro. Sem as âncoras de borda, "-grep"
# é regex solta e CISS-18074 casaria também com CISS-180745, trazendo para a
# revisão o código de outro chamado - exatamente o que este script evita.
COMMITS="$(git log -E --no-merges --grep="(^|[^A-Za-z0-9])${CHAVE}([^0-9]|$)" --reverse --format=%H "$REF")"
if [ -z "$COMMITS" ]; then
  echo "ERRO: nenhum commit em '$REF' cita $CHAVE. Nada a revisar." >&2
  exit 1
fi

: > "$DESTINO"
for SHA in $COMMITS; do
  git show --no-color "$SHA" >> "$DESTINO"
done

# "git show" sempre emite o cabeçalho do commit, então testar apenas se o arquivo
# tem bytes deixaria passar um conjunto de commits que não altera arquivo nenhum.
if ! grep -q '^diff --git' "$DESTINO"; then
  rm -f "$DESTINO"
  echo "ERRO: os commits que citam $CHAVE em '$REF' não alteram nenhum arquivo. Nada a revisar." >&2
  exit 1
fi

echo "$DESTINO"
