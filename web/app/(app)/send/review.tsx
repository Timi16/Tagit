"use client";

import { Avatar, Dots, Icon, Ripple, Sheet } from "@/components/ui";
import { useMyTag } from "@/hooks/useMyTag";
import type { SendState } from "@/hooks/useSend";
import { useWallet } from "@/hooks/useWallet";
import { addressGroups, formatAmount, shortAddress } from "@/lib/format";
import { fromUnits } from "@/lib/stellar/assets";

type ReviewState = Extract<SendState, { step: "review" | "signing" | "changed" }>;

/** The full address in groups of four; first and last group in blue. */
function FullAddress({ address }: { address: string }) {
  const groups = addressGroups(address);
  return (
    <div className="mono" style={{ fontSize: 14, lineHeight: 1.7, fontWeight: 600, letterSpacing: ".02em", wordSpacing: 2 }} aria-label={address}>
      {groups.map((g, i) => (
        <span key={i}>
          {i === 0 || i === groups.length - 1 ? <b style={{ color: "#1F5EFF" }}>{g}</b> : g}
          {i < groups.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
}

/** SendReview.dc.html: review → approve in wallet, or stop when the tag moved. */
export function ReviewSheet({
  state,
  onConfirm,
  onClose,
  onReviewNew,
}: {
  state: ReviewState;
  onConfirm: () => void;
  onClose: () => void;
  onReviewNew: () => void;
}) {
  const { address } = useWallet();
  const myTag = useMyTag(address);
  const { quote } = state;
  const amount = `${formatAmount(quote.units)} ${quote.asset.code}`;
  const from = myTag.data ? `@${myTag.data.tag}` : address ? shortAddress(address) : "";

  return (
    <Sheet label="Check before you send" onClose={state.step === "review" ? onClose : undefined} style={{ paddingBottom: 26 }}>
      {state.step === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="rise d1">
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.02em" }}>Check before you send</div>
            <div className="sub" style={{ fontSize: 14 }}>
              Make sure this is the right person.
            </div>
          </div>
          <div className="rise d2" style={{ textAlign: "center", padding: "4px 0" }}>
            <div style={{ fontSize: amount.length > 14 ? 34 : 44, fontWeight: 800, letterSpacing: "-.05em", lineHeight: 1, wordBreak: "break-all" }}>{amount}</div>
            <div className="mute" style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>
              to @{quote.tag}
            </div>
          </div>
          <div
            className="rise d3"
            style={{
              padding: 14,
              borderRadius: 20,
              background: state.changed ? "#FFFAEB" : "#F5F8FF",
              border: `1px solid ${state.changed ? "#FEDF89" : "#DFE7FF"}`,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div className="row">
              <Avatar seed={quote.tag} label={quote.tag} size={42} />
              <div className="grow">
                <div style={{ fontSize: 16, fontWeight: 800 }}>@{quote.tag}</div>
                <div className="mute" style={{ fontSize: 12, fontWeight: 600 }}>
                  {state.changed ? "New wallet: check it before sending" : "Tag checked on-chain just now"}
                </div>
              </div>
              <span className="badge b-green">
                <Icon name="check" size={11} sw={3.4} /> Verified
              </span>
            </div>
            <div className="lbl">Their full wallet address</div>
            <FullAddress address={quote.wallet} />
          </div>
          <div className="rise d4" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, fontWeight: 700, padding: "0 2px" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mute">From</span>
              <span>{from}</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mute">Network fee</span>
              <span>{fromUnits(quote.feeStroops)} XLM</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mute">Network</span>
              <span>Stellar Testnet</span>
            </div>
          </div>
          {state.notice ? (
            <div className="err" role="alert">
              <Icon name="warn" size={17} /> {state.notice}
            </div>
          ) : (
            <div className="note rise d5">
              <Icon name="warn" size={17} /> Payments can&apos;t be undone.
            </div>
          )}
          <button type="button" className="btn press rise d6" onClick={onConfirm}>
            <Icon name="wallet" size={20} /> Confirm in wallet
          </button>
        </div>
      )}

      {state.step === "signing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "6px 0 4px" }}>
          <Ripple color="#1F5EFF">
            <span className="av" style={{ position: "relative", width: 64, height: 64, background: "#1F5EFF" }}>
              <Icon name="wallet" size={28} stroke="#fff" />
            </span>
          </Ripple>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Approve in your wallet</div>
            <div className="sub" style={{ fontSize: 14, marginTop: 4 }}>
              Your wallet opened a request. TagIt can&apos;t sign for you.
            </div>
          </div>
          <div className="pop d2" style={{ width: "100%", textAlign: "left", padding: 14, borderRadius: 20, border: "1px solid #E4E7EC", display: "flex", flexDirection: "column", gap: 9, fontSize: 14, fontWeight: 700 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mute">Request</span>
              <span>Pay through TagIt contract</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mute">To</span>
              <span>
                @{quote.tag} · <span className="mono">{shortAddress(quote.wallet)}</span>
              </span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mute">Amount</span>
              <span>{amount}</span>
            </div>
          </div>
          <div className="row" style={{ gap: 8, color: "#1F5EFF", fontSize: 14, fontWeight: 800 }}>
            <Dots /> Waiting for approval
          </div>
          <div className="mute" style={{ fontSize: 12, fontWeight: 600 }}>
            To cancel, reject the request in your wallet.
          </div>
        </div>
      )}

      {state.step === "changed" && (
        <div className="shake" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "6px 0 4px" }}>
          <span className="av" style={{ width: 64, height: 64, background: "#FEECEB", color: "#B42318" }}>
            <Icon name="warn" size={28} sw={2.4} />
          </span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>@{quote.tag} just changed wallets</div>
            <div className="sub" style={{ fontSize: 14, marginTop: 4 }}>
              The tag now points somewhere new, so we stopped the payment. Nothing was sent.
            </div>
          </div>
          <div style={{ width: "100%", textAlign: "left", padding: 14, borderRadius: 18, background: "#F7F8FA", fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="mute">New wallet</span>
            <span className="mono" style={{ wordBreak: "break-all" }}>
              {shortAddress(quote.wallet)}
            </span>
          </div>
          <button type="button" className="btn press" onClick={onReviewNew}>
            Review the new address
          </button>
        </div>
      )}
    </Sheet>
  );
}
