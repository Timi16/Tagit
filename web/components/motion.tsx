"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { formatBalance } from "@/lib/format";

/**
 * A balance that counts up to its value the first time it appears (and eases
 * between values after). Exact digits once it lands; reduced motion skips it.
 */
export function CountUp({ units, duration = 900 }: { units: bigint; duration?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<bigint>(0n);
  const from = useRef<bigint>(0n);

  useEffect(() => {
    if (reduce) {
      from.current = units;
      return;
    }
    const start = from.current;
    const delta = Number(units - start);
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = p >= 1 ? units : start + BigInt(Math.round(delta * eased));
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = units;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [units, duration, reduce]);

  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatBalance(reduce ? units : shown)}</span>;
}

/**
 * Leans toward the pointer in 3D, springing back when it leaves. Mouse only:
 * touch screens never see it, nor does reduced motion.
 */
export function Tilt({
  children,
  className,
  style,
  max = 7,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  max?: number;
  "aria-label"?: string;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 220, damping: 18 });
  const rotateX = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 220, damping: 18 });
  const glare = useTransform(x, (g) => `radial-gradient(420px circle at ${g * 100}% 0%, rgba(255,255,255,.18), transparent 60%)`);

  return (
    <motion.section
      {...rest}
      className={className}
      style={{ ...style, rotateX: reduce ? 0 : rotateX, rotateY: reduce ? 0 : rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        x.set(0.5);
        y.set(0.5);
      }}
    >
      {!reduce && (
        <motion.span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            background: glare,
          }}
        />
      )}
      {children}
    </motion.section>
  );
}
