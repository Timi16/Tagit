// The design's falling confetti (claim success, payment sent): 26 pieces
// with fixed positions so server and client render the same thing.

const COLORS = ["#1F5EFF", "#12B76A", "#EC4899", "#7C5CFF", "#FF7A45", "#F5B000"];

const PIECES = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => ((i + 1) * n) % 97;
  const round = i % 3 === 0;
  return {
    left: `${(r(37) * 1.03) % 100}%`,
    w: round ? 8 + (i % 2) * 2 : 6 + (i % 3) * 2,
    h: round ? 6 : 10 + (i % 2) * 4,
    radius: round ? "50%" : 2,
    color: COLORS[i % COLORS.length],
    duration: 2.6 + (r(13) % 15) / 10,
    delay: (r(29) % 14) / 10,
  };
});

export function Confetti() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", overflow: "hidden" }}>
      {PIECES.map((p, i) => (
        <i
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: p.left,
            width: p.w,
            height: p.h,
            borderRadius: p.radius,
            background: p.color,
            animation: `fall ${p.duration}s cubic-bezier(.3,.6,.5,1) ${p.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}
