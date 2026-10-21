import Link from "next/link";

import { Avatar, Icon, Logo, LogoLink, UsdcMark, XlmMark } from "@/components/ui";
import { OFFERED_WALLETS } from "@/lib/stellar/wallets";
import { contractUrl } from "@/lib/stellar/config";

import { Faq } from "./faq";

const NAMES = ["david", "ada", "god", "zara", "tunde", "kemi", "timmy", "bola", "chidi", "ife", "seun", "amara"];

const SAFE = [
  { icon: "at", title: "One of a kind", body: "Every tag is unique. The contract refuses a second claim." },
  { icon: "lock", title: "Only you can change it", body: "Your wallet signs every edit. Anyone else gets rejected." },
  { icon: "shield", title: "See before you send", body: "The real address is always shown. If the tag changes mid-payment, it stops." },
  { icon: "wallet", title: "Your keys stay yours", body: "Payments go wallet to wallet. TagIt never holds your money." },
] as const;

function Check({ size = 10 }: { size?: number }) {
  return <Icon name="check" size={size} sw={3.6} />;
}

/** Main.dc.html (desktop) and LandingMobile.dc.html: one responsive page. */
export default function Landing() {
  return (
    <div className="lp">
      <span
        aria-hidden="true"
        className="float"
        style={{ position: "absolute", right: -180, top: -220, width: 720, height: 720, borderRadius: "50%", background: "#C9D8FF", filter: "blur(120px)", opacity: 0.75 }}
      />
      <div className="wrap" style={{ position: "relative" }}>
        <header className="nav rise">
          <Link className="logo-link" href="/" aria-label="TagIt">
            <Logo />
          </Link>
          <nav className="navl" aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#safe">Safety</a>
            <a href="#faq">FAQ</a>
          </nav>
          <Link href="/app" className="cta navcta" style={{ height: 46, fontSize: 15 }}>
            Open app
          </Link>
          <Link href="/app" className="ib burg press" aria-label="Open app">
            <Icon name="menu" size={22} />
          </Link>
        </header>

        <section className="heroL">
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <span className="badge b-green rise d1" style={{ alignSelf: "flex-start", height: 32, padding: "0 14px", fontSize: 13 }}>
              <span className="dot" />
              Live on Stellar Testnet
            </span>
            <h1 className="big rise d2">
              Send money
              <br />
              to{" "}
              <span className="rot">
                <span>@david</span>
                <span>@ada</span>
                <span>@god</span>
                <span>@zara</span>
                <span>@david</span>
              </span>
            </h1>
            <p className="lead rise d3">Claim your @tag. Get paid by name. Every payment shows the real wallet before you hit send.</p>
            <div className="row hb rise d4" style={{ gap: 12, flexWrap: "wrap" }}>
              <Link href="/claim" className="cta">
                Claim your @tag <Icon name="chevron" size={18} sw={2.6} />
              </Link>
              <a href="#how" className="cta g">
                How it works
              </a>
            </div>
            <div className="row rise d5" style={{ gap: 10, fontSize: 14, fontWeight: 700, color: "#667085" }}>
              <XlmMark size={26} />
              <UsdcMark size={26} />
              <span>XLM + USDC · works with Freighter, xBull, LOBSTR</span>
            </div>
            <div className="row rise d6" style={{ gap: 8 }} aria-label="Supported wallets">
              {OFFERED_WALLETS.map((w) => (
                <span key={w.id} className="hov" title={w.name} style={{ display: "inline-flex", borderRadius: 11, boxShadow: "0 6px 14px -8px rgba(13,19,33,.35)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand icons */}
                  <img src={w.logo} alt={w.name} width={34} height={34} style={{ width: 34, height: 34, borderRadius: 11, display: "block", background: "#fff" }} />
                </span>
              ))}
            </div>
          </div>

          <div className="stage rise d3" aria-hidden="true">
            <span style={{ position: "absolute", width: 460, height: 460, borderRadius: "50%", background: "#1F5EFF", opacity: 0.12 }} />
            <div className="phone">
              <div className="scr">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <Logo style={{ fontSize: 19 }} mark={{ width: 26, height: 26, fontSize: 15, borderRadius: 8 }} />
                  <span className="ib" style={{ width: 36, height: 36 }}>
                    <Icon name="menu" size={18} />
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.03em", marginTop: 8 }}>Pick your @tag</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#6B7280", marginTop: -6 }}>This is how people will pay you.</div>
                <div style={{ display: "flex", alignItems: "center", height: 60, padding: "0 14px", borderRadius: 18, background: "#fff", border: "2px solid #E4E7EC", fontSize: 22, fontWeight: 800, animation: "bdr 8s infinite" }}>
                  <b style={{ color: "#1F5EFF" }}>@</b>
                  <span className="lt1">g</span>
                  <span className="lt2">o</span>
                  <span className="lt3">d</span>
                  <span className="caret" />
                  <span style={{ marginLeft: "auto", position: "relative", width: 26, height: 26 }}>
                    <span className="spin" style={{ position: "absolute", inset: 0, width: 26, height: 26, animation: "spin .8s linear infinite,chk 8s infinite" }} />
                    <span className="av" style={{ position: "absolute", inset: 0, width: 26, height: 26, background: "#12B76A", animation: "okk 8s infinite" }}>
                      <Icon name="check" size={14} stroke="#fff" sw={3.4} />
                    </span>
                  </span>
                </div>
                <div style={{ position: "relative", height: 22 }}>
                  <span style={{ position: "absolute", fontSize: 13, fontWeight: 800, color: "#98A2B3", animation: "chk 8s infinite" }}>Checking…</span>
                  <span className="row" style={{ position: "absolute", gap: 7, fontSize: 13, fontWeight: 800, color: "#067647", animation: "okk 8s infinite", transformOrigin: "left" }}>
                    <span className="dot" />
                    @god is available
                  </span>
                </div>
                <div style={{ background: "#fff", borderRadius: 18, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 9, fontSize: 12, fontWeight: 700 }}>
                  {["3 to 20 characters", "Lowercase, numbers or _", "Nobody else has it"].map((r) => (
                    <div key={r} className="row" style={{ gap: 8 }}>
                      <span className="av" style={{ width: 18, height: 18, background: "#E7F8EF", color: "#067647" }}>
                        <Check />
                      </span>
                      {r}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "auto", height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, animation: "bt 8s infinite" }}>
                  Claim @god
                </div>
              </div>
            </div>
            <div className="float toast1" style={{ position: "absolute", zIndex: 3, left: -10, top: 500, ["--r" as string]: "-4deg" }}>
              <div className="row" style={{ gap: 10, padding: "10px 16px 10px 10px", borderRadius: 20, background: "#fff", boxShadow: "0 24px 40px -20px rgba(13,19,33,.4)" }}>
                <span className="av" style={{ width: 38, height: 38, background: "#FF7A45", fontSize: 15 }}>
                  A
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>+50 USDC</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>from @ada</div>
                </div>
              </div>
            </div>
            <div className="float toast2" style={{ position: "absolute", zIndex: 3, right: -14, top: 300, ["--r" as string]: "3deg", animationDelay: "-2.4s" }}>
              <div className="row" style={{ gap: 10, padding: "10px 16px 10px 10px", borderRadius: 20, background: "#0D1321", color: "#fff", boxShadow: "0 24px 40px -20px rgba(13,19,33,.6)" }}>
                <span className="av" style={{ width: 38, height: 38, background: "#12B76A" }}>
                  <Icon name="check" size={18} stroke="#fff" />
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Sent to @david</div>
                  <div className="mono" style={{ fontSize: 11, opacity: 0.6 }}>
                    GDQ7…K2LD
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mq" aria-hidden="true">
        <div>
          {[...NAMES, ...NAMES].map((n, i) => (
            <span key={i}>@{n}</span>
          ))}
        </div>
      </div>

      <section className="sec" id="how">
        <div className="wrap">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 44, maxWidth: 640 }}>
            <span className="kick">HOW IT WORKS</span>
            <h2 className="h2">
              Three taps.
              <br />
              No long addresses.
            </h2>
          </div>
          <div className="g3">
            <article className="lc">
              <div className="mini">
                <div style={{ display: "flex", alignItems: "center", height: 48, padding: "0 12px", borderRadius: 14, background: "#fff", border: "2px solid #12B76A", fontSize: 19, fontWeight: 800 }}>
                  <b style={{ color: "#1F5EFF" }}>@</b>god
                  <span className="badge b-green" style={{ marginLeft: "auto" }}>
                    <Check size={11} /> Free
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", height: 48, padding: "0 12px", borderRadius: 14, background: "#fff", border: "2px solid #F04438", fontSize: 19, fontWeight: 800, opacity: 0.7 }}>
                  <b style={{ color: "#1F5EFF" }}>@</b>david
                  <span className="badge b-red" style={{ marginLeft: "auto" }}>
                    Taken
                  </span>
                </div>
              </div>
              <div className="row" style={{ gap: 12, marginTop: 6 }}>
                <span className="num">1</span>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Claim your @tag</h3>
              </div>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, fontWeight: 500, color: "#475467" }}>Pick a name. If someone has it, you’ll know right away.</p>
            </article>
            <article className="lc">
              <div className="mini">
                <div className="row" style={{ padding: 12, borderRadius: 16, background: "#fff" }}>
                  <Avatar seed="david-demo" label="david" size={40} style={{ background: "#7C5CFF" }} />
                  <div className="grow">
                    <div style={{ fontSize: 15, fontWeight: 800 }}>@david</div>
                    <div className="mono mute" style={{ fontSize: 11 }}>
                      GDQ7…K2LD
                    </div>
                  </div>
                  <span className="badge b-green">Found</span>
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.04em", textAlign: "center" }}>
                  25 <span style={{ fontSize: 15, color: "#98A2B3" }}>XLM</span>
                </div>
              </div>
              <div className="row" style={{ gap: 12, marginTop: 6 }}>
                <span className="num">2</span>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Type their tag</h3>
              </div>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, fontWeight: 500, color: "#475467" }}>No more copying 56-character addresses. Just their name.</p>
            </article>
            <article className="lc">
              <div className="mini">
                <div className="mono" style={{ fontSize: 12, lineHeight: 1.6, fontWeight: 600, padding: "10px 12px", borderRadius: 14, background: "#fff", wordBreak: "break-all" }}>
                  <b style={{ color: "#1F5EFF" }}>GDQ7</b>PFT7V4SEH2KVJ72CEUVW75EFR6EDT4SYWB5WKH7DNSIPZZ7F<b style={{ color: "#1F5EFF" }}>K2LD</b>
                </div>
                <div style={{ height: 44, borderRadius: 14, background: "#1F5EFF", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 800 }}>
                  <Icon name="wallet" size={16} /> Confirm in wallet
                </div>
              </div>
              <div className="row" style={{ gap: 12, marginTop: 6 }}>
                <span className="num">3</span>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>Check, then send</h3>
              </div>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, fontWeight: 500, color: "#475467" }}>See the full wallet behind the tag. Approve in your own wallet.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="safe" style={{ padding: "0 0 20px" }}>
        <div className="wrap">
          <div className="dark">
            <span aria-hidden="true" style={{ position: "absolute", right: -160, top: -160, width: 480, height: 480, borderRadius: "50%", background: "#1F5EFF", filter: "blur(120px)", opacity: 0.45 }} />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12, marginBottom: 40, maxWidth: 640 }}>
              <span className="kick" style={{ color: "#8FB0FF" }}>
                BUILT SAFE
              </span>
              <h2 className="h2">
                Money lands where
                <br />
                you meant it to.
              </h2>
            </div>
            <div className="g4" style={{ position: "relative" }}>
              {SAFE.map((f) => (
                <div key={f.title} className="fc">
                  <span className="fi">
                    <Icon name={f.icon} size={22} stroke="#fff" />
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="faq">
        <div className="wrap">
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
            <span className="kick">FAQ</span>
            <h2 className="h2">Good questions.</h2>
          </div>
          <Faq />
        </div>
      </section>

      <section style={{ padding: "0 0 30px" }}>
        <div className="wrap">
          <div className="endc">
            <span aria-hidden="true" className="float" style={{ position: "absolute", left: "8%", top: "22%", width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, ["--r" as string]: "-10deg" }}>
              @
            </span>
            <span aria-hidden="true" className="float" style={{ position: "absolute", right: "9%", bottom: "20%", width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, ["--r" as string]: "12deg", animationDelay: "-2s" }}>
              @
            </span>
            <h2 className="h2" style={{ position: "relative" }}>
              Your @tag is waiting.
            </h2>
            <p style={{ position: "relative", margin: "14px auto 30px", maxWidth: 460, fontSize: 18, lineHeight: 1.5, fontWeight: 500, opacity: 0.85 }}>
              Grab it before someone else does. It’s free on Testnet.
            </p>
            <Link
              href="/claim"
              style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, maxWidth: 460, margin: "0 auto", padding: "8px 8px 8px 20px", borderRadius: 22, background: "#fff" }}
            >
              <b style={{ fontSize: 22, fontWeight: 800, color: "#1F5EFF" }}>@</b>
              <span style={{ flex: 1, textAlign: "left", fontSize: 20, fontWeight: 800, color: "#98A2B3" }}>
                yourname
                <span className="caret" />
              </span>
              <span className="cta" style={{ height: 50 }}>
                Claim it
              </span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="wrap foot">
        <div className="row" style={{ gap: 14 }}>
          <LogoLink />
          <span>Stellar Testnet only. No real funds.</span>
        </div>
        <nav aria-label="Footer">
          <Link href="/app">Open app</Link>
          <a href={contractUrl()} target="_blank" rel="noreferrer">
            Contract
          </a>
        </nav>
        <span>© 2026 TagIt</span>
      </footer>
    </div>
  );
}
