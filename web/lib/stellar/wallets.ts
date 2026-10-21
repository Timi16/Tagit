// The wallets TagIt offers, in the design's order. Logos are the wallets' own
// icons (as Stellar Wallets Kit ships them), served from /public/wallets.
// No kit import here, so server pages can list them too.

export const OFFERED_WALLETS = [
  { id: "freighter", name: "Freighter", logo: "/wallets/freighter.png", popular: true },
  { id: "xbull", name: "xBull", logo: "/wallets/xbull.png" },
  { id: "lobstr", name: "LOBSTR", logo: "/wallets/lobstr.png" },
  { id: "albedo", name: "Albedo", logo: "/wallets/albedo.png" },
  { id: "hana", name: "Hana", logo: "/wallets/hana.png" },
] as const;

export type OfferedWallet = (typeof OFFERED_WALLETS)[number];
