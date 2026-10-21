// Primitives from the TagIt App Design canvas: its icon set (paths copied
// from the artboards), logo, avatars and screen scaffolding.

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

// Icons

const ICONS = {
  back: { sw: 2.6, d: ["m15 18-6-6 6-6"] },
  menu: { sw: 2.2, d: ["M4 7h16M4 12h16M4 17h10"] },
  close: { sw: 2.6, d: ["M18 6 6 18M6 6l12 12"] },
  check: { sw: 3.2, d: ["M5 12.5l4.5 4.5L19 7.5"] },
  chevron: { sw: 2.4, d: ["m9 18 6-6-6-6"] },
  search: { sw: 2.4, d: ["m20 20-3.5-3.5"], circle: [11, 11, 7] },
  send: { sw: 2.4, d: ["M21.5 2.5 10.5 13.5", "M21.5 2.5 14.5 21.5l-4-8-8-4 19-7z"] },
  receive: { sw: 2.4, d: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"] },
  at: { sw: 2.4, d: ["M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"], circle: [12, 12, 4] },
  shield: { sw: 2.2, d: ["M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z", "m9 12 2 2 4-4"] },
  warn: { sw: 2.3, d: ["M12 3.5 2.5 20h19L12 3.5z", "M12 10v4", "M12 17h.01"] },
  copy: { sw: 2.3, d: ["M5 15V6a2 2 0 0 1 2-2h9"], rect: [9, 9, 12, 12, 3] },
  home: { sw: 2.3, d: ["M3 11 12 4l9 7", "M5 10v10h14V10"] },
  clock: { sw: 2.3, d: ["M12 7v5l3 2"], circle: [12, 12, 9] },
  logout: { sw: 2.3, d: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "m16 17 5-5-5-5", "M21 12H9"] },
  link: {
    sw: 2.4,
    d: ["M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1", "M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"],
  },
  share: { sw: 2.4, d: ["M12 3v13", "m7 8 5-5 5 5", "M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"] },
  swap: { sw: 2.3, d: ["M7 7h13l-3-3", "M17 17H4l3 3"] },
  trash: { sw: 2.3, d: ["M4 7h16", "M10 11v6M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"] },
  out: { sw: 3, d: ["M7 17 17 7", "M8 7h9v9"] },
  in: { sw: 3, d: ["M17 7 7 17", "M16 17H7V8"] },
  external: { sw: 2.6, d: ["M7 17 17 7", "M8 7h9v9"] },
  eye: { sw: 2.2, d: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"], circle: [12, 12, 3] },
  eyeOff: {
    sw: 2.2,
    d: [
      "M3 3l18 18",
      "M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6",
    ],
  },
  backspace: { sw: 2.2, d: ["M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z", "m16 9-5 6M11 9l5 6"] },
  lock: { sw: 2.2, d: ["M8 10.5V8a4 4 0 0 1 8 0v2.5"], rect: [4.5, 10.5, 15, 10.5, 3] },
  wallet: { sw: 2.2, d: ["M3 7a2 2 0 0 1 2-2h13v4", "M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"], dot: [16, 14.5, 1.2] },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  stroke = "currentColor",
  sw,
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: string;
  sw?: number;
  style?: CSSProperties;
}) {
  const icon = ICONS[name] as {
    sw: number;
    d: readonly string[];
    circle?: readonly number[];
    rect?: readonly number[];
    dot?: readonly number[];
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={sw ?? icon.sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {icon.circle && <circle cx={icon.circle[0]} cy={icon.circle[1]} r={icon.circle[2]} />}
      {icon.rect && (
        <rect x={icon.rect[0]} y={icon.rect[1]} width={icon.rect[2]} height={icon.rect[3]} rx={icon.rect[4]} />
      )}
      {icon.d.map((d) => (
        <path key={d} d={d} />
      ))}
      {icon.dot && <circle cx={icon.dot[0]} cy={icon.dot[1]} r={icon.dot[2]} fill="currentColor" stroke="none" />}
    </svg>
  );
}

/** The Stellar mark used for XLM in the design. */
export function XlmMark({ size = 36 }: { size?: number }) {
  const s = Math.round(size * 0.53);
  return (
    <span className="av" style={{ width: size, height: size, background: "#0D1321" }}>
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 15.5 20 7.5" />
        <path d="M5.5 12.2a7 7 0 0 1 12.6-4.5" />
        <path d="M18.5 11.8a7 7 0 0 1-12.6 4.5" />
      </svg>
    </span>
  );
}

export function UsdcMark({ size = 36 }: { size?: number }) {
  return (
    <span className="av" style={{ width: size, height: size, background: "#2775CA", fontSize: size * 0.44 }}>
      $
    </span>
  );
}

// Identity

/** The TagIt logo as a link (to the landing page, or Home inside the app). */
export function LogoLink({ href = "/", onClick }: { href?: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="logo-link" aria-label="TagIt home">
      <Logo />
    </Link>
  );
}

export function Logo({ style, mark }: { style?: CSSProperties; mark?: CSSProperties }) {
  return (
    <span className="logo" style={style}>
      <i style={mark}>@</i>tagit
    </span>
  );
}

/** The design's avatar colours, picked by a stable hash of the tag or address. */
export const AVATAR_COLORS = ["#7C5CFF", "#FF7A45", "#12B76A", "#F5B000", "#E5484D", "#0EA5E9", "#EC4899", "#1F5EFF"];

export function avatarColor(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return AVATAR_COLORS[(h >>> 0) % AVATAR_COLORS.length];
}

export function Avatar({
  seed,
  label,
  size = 42,
  style,
}: {
  seed: string;
  /** The tag (or address) whose first letter shows. */
  label?: string;
  size?: number;
  style?: CSSProperties;
}) {
  const letter = (label ?? seed).replace(/^@/, "").charAt(0).toUpperCase() || "?";
  return (
    <span
      className="av"
      style={{ width: size, height: size, background: avatarColor(seed), fontSize: Math.round(size * 0.38), ...style }}
    >
      {letter}
    </span>
  );
}

// Screen scaffolding

/** A screen's top bar. On desktop it becomes the page title; "back to Home" hides (the sidebar has it). */
export function TopBack({ title, href, onBack }: { title: string; href?: string; onBack?: () => void }) {
  return (
    <header className="top rise">
      {onBack ? (
        <button type="button" className="ib press" aria-label="Back" onClick={onBack}>
          <Icon name="back" />
        </button>
      ) : (
        <Link href={href ?? "/app"} className={`ib press${(href ?? "/app") === "/app" ? " back-home" : ""}`} aria-label="Back">
          <Icon name="back" />
        </Link>
      )}
      <span className="ttl">{title}</span>
      <span className="spacer" style={{ width: 44 }} />
    </header>
  );
}

/**
 * One app screen: header, a scrolling body, an optional bottom dock and
 * overlays. `side` is the right-hand column on desktop; on a phone it stacks
 * under the body (use `order` to interleave). On desktop the dock sits inline
 * at the end of the main column instead of floating.
 */
export function Screen({
  header,
  children,
  side,
  dock,
  overlay,
  variant,
  style,
  bodyStyle,
  dockStyle,
}: {
  header: ReactNode;
  children: ReactNode;
  side?: ReactNode;
  dock?: ReactNode;
  overlay?: ReactNode;
  variant?: "narrow" | "result";
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  dockStyle?: CSSProperties;
}) {
  return (
    <div className={`app${variant ? ` ${variant}` : ""}`} style={style}>
      {header}
      <div className={`body${dock ? "" : " nodock"}`}>
        <div className="pad cols" style={{ display: "flex", flexDirection: "column", gap: 14, ...bodyStyle }}>
          <div className="cmain">
            {children}
            {dock && (
              <div className="ddock" style={dockStyle}>
                {dock}
              </div>
            )}
          </div>
          {side && <div className="cside">{side}</div>}
        </div>
      </div>
      {dock && (
        <div className="dock" style={dockStyle}>
          {dock}
        </div>
      )}
      {overlay}
    </div>
  );
}

/** Bottom sheet over a scrim, as in the design's review and connect sheets. */
export function Sheet({
  label,
  onClose,
  children,
  style,
}: {
  label: string;
  onClose?: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} style={style}>
        <div className="handle" />
        {children}
      </div>
    </>
  );
}

export function SheetTitle({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="row" style={{ marginBottom: 6 }}>
      <span className="grow" style={{ fontSize: 20, fontWeight: 800 }}>
        {children}
      </span>
      <button type="button" className="ib press" style={{ background: "#F2F4F7", boxShadow: "none" }} aria-label="Close" onClick={onClose}>
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

/**
 * A full wallet address as one unbroken string (wrapping at the card's edge),
 * with the first and last four characters in blue for a quick check.
 */
export function WalletAddress({ address, size = 14 }: { address: string; size?: number }) {
  return (
    <div className="mono" aria-label={address} style={{ fontSize: size, lineHeight: 1.6, fontWeight: 600, letterSpacing: ".01em", wordBreak: "break-all" }}>
      <b style={{ color: "#1F5EFF" }}>{address.slice(0, 4)}</b>
      {address.slice(4, -4)}
      <b style={{ color: "#1F5EFF" }}>{address.slice(-4)}</b>
    </div>
  );
}

/** A pulsing ring behind a round badge (claim success, sent, signing). */
export function Ripple({ color, children, duration = 1.6 }: { color: string; children: ReactNode; duration?: number }) {
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, animation: `ripple ${duration}s ease-out infinite` }}
      />
      {children}
    </span>
  );
}

/** A check mark that draws itself, as on the claim and sent screens. */
export function DrawnCheck({ size, color, delay = 0.35 }: { size: number; color: string; delay?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: `draw .5s ${delay}s ease-out forwards` }}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function Dots() {
  return (
    <span className="dots">
      <i />
      <i />
      <i />
    </span>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="toast" role="status">
      {text}
    </div>
  );
}
