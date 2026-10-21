"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Signer } from "@/lib/stellar/registry";

type WalletState = {
  address: string | null;
  /** False while we check for an existing connection on load. */
  ready: boolean;
  /** Null until connected; pass it to registry writes. */
  signer: Signer | null;
  onTestnet: boolean;
  connect: () => Promise<void>;
  /** Connect one wallet from the design's sheet. */
  connectWith: (id: string) => Promise<void>;
  disconnect: () => Promise<void>;
};

const WalletContext = createContext<WalletState | null>(null);

// The kit touches `window`, so it's only ever loaded in the browser.
const loadWallet = () => import("@/lib/stellar/wallet");

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [onTestnet, setOnTestnet] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadWallet()
      .then(async (w) => {
        const current = await w.currentAddress();
        if (cancelled) return;
        setAddress(current);
        if (current) setOnTestnet(await w.isOnTestnet());
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    const w = await loadWallet();
    const next = await w.connectWallet();
    setAddress(next);
    setOnTestnet(await w.isOnTestnet());
  }, []);

  const connectWith = useCallback(async (id: string) => {
    const w = await loadWallet();
    const next = await w.connectWith(id);
    setAddress(next);
    setOnTestnet(await w.isOnTestnet());
  }, []);

  const disconnect = useCallback(async () => {
    await (await loadWallet()).disconnectWallet();
    setAddress(null);
  }, []);

  const signer = useMemo<Signer | null>(() => {
    if (!address) return null;
    return {
      address,
      signTransaction: async (xdr, opts) =>
        (await loadWallet()).signerFor(address).signTransaction(xdr, opts),
    };
  }, [address]);

  const value = useMemo(
    () => ({ address, ready, signer, onTestnet, connect, connectWith, disconnect }),
    [address, ready, signer, onTestnet, connect, connectWith, disconnect],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
