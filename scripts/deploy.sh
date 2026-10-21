#!/usr/bin/env bash
# Deploys tagit-registry to Testnet and prints the env vars for Vercel.
# Re-run after a Testnet reset.
set -euo pipefail

cd "$(dirname "$0")/.."

NETWORK=testnet
SOURCE=${SOURCE:-deployer}
USDC_ASSET="USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"

if ! stellar keys address "$SOURCE" >/dev/null 2>&1; then
  stellar keys generate "$SOURCE" --network "$NETWORK" --fund
fi
ADMIN=$(stellar keys address "$SOURCE")

XLM_SAC=$(stellar contract id asset --asset native --network "$NETWORK")
USDC_SAC=$(stellar contract id asset --asset "$USDC_ASSET" --network "$NETWORK")

stellar contract build

TAGIT_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/tagit_registry.wasm \
  --source "$SOURCE" --network "$NETWORK" \
  -- --admin "$ADMIN" --tokens "[\"$XLM_SAC\",\"$USDC_SAC\"]")

if [ -d web ]; then
  stellar contract bindings typescript --network "$NETWORK" \
    --contract-id "$TAGIT_ID" --output-dir web/contract --overwrite
fi

ENV=$(cat <<OUT
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_TAGIT_CONTRACT_ID=$TAGIT_ID
NEXT_PUBLIC_XLM_SAC_ID=$XLM_SAC
NEXT_PUBLIC_USDC_SAC_ID=$USDC_SAC
NEXT_PUBLIC_EXPLORER_URL=https://stellar.expert/explorer/testnet
OUT
)

# Same values locally and in the committed example; all of them are public.
if [ -d web ]; then
  printf '# All public: nothing secret lives in the web app.\n%s\n' "$ENV" > web/.env.example
  printf '%s\n' "$ENV" > web/.env.local
fi

printf '\nSet these on Vercel:\n\n%s\n\n' "$ENV"
echo "Contract: https://stellar.expert/explorer/testnet/contract/$TAGIT_ID"
