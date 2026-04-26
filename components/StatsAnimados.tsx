"use client";

import { useEffect, useRef } from "react";

function AnimatedStat({
  target,
  prefix = "",
  className = "",
  style = {},
}: {
  target: number;
  prefix?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1400;
          const start = performance.now();
          const step = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + Math.round(ease * target);
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, prefix]);

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}0
    </span>
  );
}

const STATS = [
  { target: 41, label: "rutas urbanas", color: "var(--lima)", prefix: "" },
  { target: 6, label: "estaciones Teleférico", color: "var(--ink)", prefix: "" },
  { target: 11, label: "tarifa base 2026 MXN", color: "var(--ink)", prefix: "$" },
  { target: 0, label: "anuncios ni cuentas", color: "var(--ink)", prefix: "" },
] as const;

export default function StatsAnimados() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-4">
      <div
        className="grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-4"
        style={{
          border: "1px solid var(--ov-border)",
          background: "rgba(20,28,16,0.5)",
        }}
      >
        {STATS.map((s, i) => (
          <div
            key={i}
            className="px-6 py-7"
            style={{
              borderRight: i < 3 ? "1px solid var(--ov-border)" : "none",
            }}
          >
            <div className="font-serif text-4xl font-black leading-none tracking-tight">
              {s.prefix && (
                <span className="font-sans" style={{ color: s.color }}>{s.prefix}</span>
              )}
              <AnimatedStat
                target={s.target}
                prefix=""
                style={{ color: s.color }}
              />
            </div>
            <div
              className="mt-1.5 text-xs leading-snug"
              style={{ color: "var(--muted)" }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
