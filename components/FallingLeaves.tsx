"use client";

export default function FallingLeaves() {
  return (
    <>
      <style>{`
        @keyframes leaf-fall {
          0%   { transform: translateY(-60px) rotate(0deg) translateX(0); }
          100% { transform: translateY(110vh) rotate(360deg) translateX(40px); }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        {[
          { emoji: "🍃", left: "5%",  duration: "18s", delay: "0s"  },
          { emoji: "🌿", left: "15%", duration: "24s", delay: "3s"  },
          { emoji: "🍃", left: "30%", duration: "20s", delay: "6s"  },
          { emoji: "🌿", left: "55%", duration: "22s", delay: "1s"  },
          { emoji: "🍃", left: "70%", duration: "19s", delay: "9s"  },
          { emoji: "🌿", left: "85%", duration: "26s", delay: "4s"  },
          { emoji: "🍃", left: "95%", duration: "21s", delay: "12s" },
        ].map((h, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              top: "-60px",
              left: h.left,
              fontSize: "1.5rem",
              opacity: 0.04,
              animation: `leaf-fall ${h.duration} ${h.delay} linear infinite`,
            }}
          >
            {h.emoji}
          </span>
        ))}
      </div>
    </>
  );
}
