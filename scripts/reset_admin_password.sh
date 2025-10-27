#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Uso: $0 <email> <nova_senha>" >&2
  exit 1
}

if [[ $# -ne 2 ]]; then
  usage
fi

EMAIL="$1"
NEW_PASSWORD="$2"

if [[ -z "$EMAIL" || -z "$NEW_PASSWORD" ]]; then
  usage
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale Node.js para executar o script." >&2
  exit 2
fi

node --env-file=.env scripts/reset-admin-password.mjs "$EMAIL" "$NEW_PASSWORD"
