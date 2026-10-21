// Public network settings. Each `process.env.NEXT_PUBLIC_*` is written out in
// full so Next.js can inline it into the browser bundle.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set. Copy web/.env.example to web/.env.local.`);
  }
  return value;
}

export const config = {
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org",
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  explorerUrl:
    process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://stellar.expert/explorer/testnet",
  contractId: required(
    "NEXT_PUBLIC_TAGIT_CONTRACT_ID",
    process.env.NEXT_PUBLIC_TAGIT_CONTRACT_ID,
  ),
  xlmSacId: required("NEXT_PUBLIC_XLM_SAC_ID", process.env.NEXT_PUBLIC_XLM_SAC_ID),
  usdcSacId: required("NEXT_PUBLIC_USDC_SAC_ID", process.env.NEXT_PUBLIC_USDC_SAC_ID),
} as const;

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export function txUrl(hash: string): string {
  return `${config.explorerUrl}/tx/${hash}`;
}

export function accountUrl(address: string): string {
  return `${config.explorerUrl}/account/${address}`;
}

export function contractUrl(id: string = config.contractId): string {
  return `${config.explorerUrl}/contract/${id}`;
}
