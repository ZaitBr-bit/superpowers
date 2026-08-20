#!/usr/bin/env bash
# Resolvedor portavel de timeout, compartilhado pelas suites de teste.
#
# O macOS nao traz timeout(1): ele e do GNU coreutils, e via Homebrew instala
# com o nome gtimeout. Chamar "timeout" direto num Mac devolve exit 127, o que
# as suites interpretam como falha do teste — o sintoma vira "a skill nao
# disparou" quando o problema real e binario ausente.
#
# Uso:
#   source "<repo>/tests/lib/timeout.sh"
#   run_with_timeout 300 claude -p "$PROMPT"
#
# Quem precisa abortar quando nao ha binario (porque rodar sem limite de tempo
# deixaria o teste pendurado) chama require_timeout_bin em vez de warn.

# Devolve o caminho do primeiro binario de timeout disponivel, ou string vazia.
# Ordem: timeout (GNU/Linux, Git Bash) antes de gtimeout (Homebrew no macOS).
resolve_timeout_bin() {
    command -v timeout 2>/dev/null || command -v gtimeout 2>/dev/null || true
}

# Respeita um TIMEOUT_BIN ja exportado pelo ambiente, para permitir override
# manual em maquinas com o binario fora do PATH.
TIMEOUT_BIN="${TIMEOUT_BIN:-$(resolve_timeout_bin)}"
export TIMEOUT_BIN

# Executa um comando com limite de tempo quando ha binario para isso.
# Sem binario, executa o comando cru: perder o limite e melhor do que
# transformar a ausencia da ferramenta em falha de teste.
# Uso: run_with_timeout <segundos> <comando> [args...]
run_with_timeout() {
    local seconds="$1"
    shift
    if [ -n "$TIMEOUT_BIN" ]; then
        "$TIMEOUT_BIN" "$seconds" "$@"
    else
        "$@"
    fi
}

# Avisa uma vez que os testes estao rodando sem limite de tempo, para que um
# resultado verde nao seja lido como se o limite tivesse sido respeitado.
warn_missing_timeout() {
    if [ -z "$TIMEOUT_BIN" ]; then
        echo "  [WARN] neither 'timeout' nor 'gtimeout' found; tests run without a time limit." >&2
        echo "         On macOS: brew install coreutils" >&2
    fi
}

# Aborta quando nao ha binario. Para suites em que rodar sem limite deixaria o
# processo pendurado indefinidamente em vez de falhar rapido.
require_timeout_bin() {
    if [ -z "$TIMEOUT_BIN" ]; then
        echo "ERROR: neither 'timeout' nor 'gtimeout' is available." >&2
        echo "       On macOS: brew install coreutils" >&2
        return 1
    fi
}
