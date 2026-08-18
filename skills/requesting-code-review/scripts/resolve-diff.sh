#!/usr/bin/env bash
# Resolve o diff a ser revisado para uma chave de issue do Jira e grava em
# $HOME/.claude/reviews/review-<CHAVE>.diff.
#
# Uso:
#   resolve-diff.sh CISS-180745
#   resolve-diff.sh CISS-180745 --branch 22.0.3.441
#   resolve-diff.sh CISS-180745 --diff-file /caminho/alteracoes.diff
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
      echo "ERRO: opção desconhecida: $1" >&2
      exit 1
      ;;
  esac
done

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

# Modos 2 e 3: recorta os commits que citam a chave na ref escolhida.
# --no-merges e a ref única são obrigatórios. Sem eles, a busca traz também os
# commits de merge e as versões do mesmo fix em outras branches de release,
# multiplicando o diff pelo número de versões em que o chamado foi corrigido.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERRO: o diretório atual não é um repositório git: $PWD" >&2
  exit 1
fi

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

if [ ! -s "$DESTINO" ]; then
  echo "ERRO: o diff gerado ficou vazio para $CHAVE em '$REF'." >&2
  exit 1
fi

echo "$DESTINO"
