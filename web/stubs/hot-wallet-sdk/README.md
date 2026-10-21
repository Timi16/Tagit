# @hot-wallet/sdk stub

Stellar Wallets Kit lists HOT Wallet's SDK as a dependency. That SDK pulls in
the NEAR and Solana SDKs, which carry every advisory `npm audit` reports for
this app (19 of them, through `elliptic`, `jayson`, `stream-json` and `uuid`).

TagIt never loads HOT Wallet: it uses `defaultModules()`, which doesn't include
it, and none of that code is in the production bundle. So `package.json`
overrides the dependency with this stub. If anything ever imports it, it
throws instead of failing quietly.

To offer HOT Wallet later, remove the `overrides` entry and add
`HotWalletModule` to the modules in `lib/stellar/wallet.ts`.
