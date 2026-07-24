#!/usr/bin/env bash
# Regression check: Superpowers must not create branches or worktrees without
# explicit user authorization.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

USING_SKILL="$REPO_ROOT/skills/using-git-worktrees/SKILL.md"
FINISHING_SKILL="$REPO_ROOT/skills/finishing-a-development-branch/SKILL.md"

failures=0

assert_contains() {
    local file="$1"
    local pattern="$2"
    local label="$3"

    if grep -Fq "$pattern" "$file"; then
        echo "  [PASS] $label"
    else
        echo "  [FAIL] $label"
        echo "    Expected to find: $pattern"
        echo "    In file: $file"
        failures=$((failures + 1))
    fi
}

assert_not_contains() {
    local file="$1"
    local pattern="$2"
    local label="$3"

    if grep -Fq "$pattern" "$file"; then
        echo "  [FAIL] $label"
        echo "    Did not expect to find: $pattern"
        echo "    In file: $file"
        failures=$((failures + 1))
    else
        echo "  [PASS] $label"
    fi
}

echo "=== Git Authorization Policy Test ==="
echo ""

assert_contains "$USING_SKILL" "Use only when the user explicitly requests" "worktree skill requires an explicit request"
assert_contains "$USING_SKILL" "Never create or switch branches" "worktree skill forbids automatic branch changes"
assert_contains "$USING_SKILL" "create a branch or worktree as an automatic setup step" "worktree skill rejects automatic isolation"
assert_contains "$FINISHING_SKILL" "leave it uncommitted in the currently open branch" "finishing keeps the current branch uncommitted"
assert_contains "$FINISHING_SKILL" "unless the user explicitly requests that" "finishing requires explicit git authorization"

echo ""

if [ "$failures" -gt 0 ]; then
    echo "STATUS: FAILED ($failures failures)"
    exit 1
fi

echo "STATUS: PASSED"
