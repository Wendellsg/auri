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

if ! command -v npx >/dev/null 2>&1; then
  echo "npx não encontrado. Instale Node.js / npm." >&2
  exit 2
fi

HASH=$(node --env-file=.env scripts/hash-password.mjs "$NEW_PASSWORD")

if [[ -z "$HASH" ]]; then
  echo "Falha ao gerar hash." >&2
  exit 3
fi

SQL=$(cat <<EOF
UPDATE "User"
   SET "passwordHash" = '$HASH',
       "status" = 'active',
       "lastAccessAt" = CURRENT_TIMESTAMP
 WHERE lower("email") = lower('$EMAIL');
EOF
)

echo "$SQL" | npx prisma db execute --stdin --schema prisma/schema.prisma

echo "Senha atualizada com sucesso para $EMAIL."
