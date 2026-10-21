"use client";

import { useState } from "react";

const QA = [
  ["What is an @tag?", "A short, unique name like @david that points to a Stellar wallet. People send to your tag instead of copying your long address."],
  ["Does TagIt hold my money?", "Never. Payments go straight from the sender’s wallet to yours. We don’t have your keys and can’t move your funds."],
  ["What if I mistype a tag?", "If nobody owns it, we tell you and the payment can’t continue. If it exists, you still see the full wallet before you send."],
  ["Can someone take my tag?", "No. Only the wallet that claimed it can change or release it. The smart contract rejects anyone else."],
  ["What can I send?", "XLM and USDC on Stellar Testnet. Testnet coins are free and have no real value."],
  ["Which wallets work?", "Freighter, xBull, LOBSTR, Albedo, Hana and other Stellar wallets."],
] as const;

/** The FAQ accordion from Main.dc.html (first item open). */
export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {QA.map(([q, a], i) => {
        const o = open === i;
        return (
          <div key={q} className="fq">
            <button type="button" aria-expanded={o} onClick={() => setOpen(o ? -1 : i)}>
              {q}
              <span className="pm" style={{ background: o ? "#1F5EFF" : "#F2F4F7", color: o ? "#fff" : "#0D1321" }}>
                {o ? "−" : "+"}
              </span>
            </button>
            {o && <p>{a}</p>}
          </div>
        );
      })}
    </div>
  );
}
