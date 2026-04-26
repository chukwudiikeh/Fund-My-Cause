"use client";

import React, { useEffect, useState } from "react";

interface Piece {
  id: number;
  x: number;       // vw
  delay: number;   // s
  duration: number; // s
  color: string;
  size: number;    // px
  rotation: number;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#f43f5e", "#14b8a6",
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function generatePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: randomBetween(0, 100),
    delay: randomBetween(0, 1.5),
    duration: randomBetween(2.5, 4),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: randomBetween(6, 12),
    rotation: randomBetween(0, 360),
  }));
}

interface ConfettiProps {
  /** Number of confetti pieces. Default 80. */
  count?: number;
  /** Auto-remove after this many ms. Default 4500. */
  ttl?: number;
}

export function Confetti({ count = 80, ttl = 4500 }: ConfettiProps) {
  const [pieces] = useState(() => generatePieces(count));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), ttl);
    return () => clearTimeout(t);
  }, [ttl]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-10vh) rotate(var(--rot)); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(calc(var(--rot) + 720deg)); opacity: 0; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
      >
        {pieces.map((p) => (
          <span
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}vw`,
              top: 0,
              width: p.size,
              height: p.size * 0.5,
              backgroundColor: p.color,
              borderRadius: 2,
              animationName: "confetti-fall",
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              animationTimingFunction: "linear",
              animationFillMode: "both",
              // @ts-expect-error CSS custom property
              "--rot": `${p.rotation}deg`,
            }}
          />
        ))}
      </div>
    </>
  );
}
